import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { extractSessionMemory, mergeMemory, createEmptyProfile, type UserMemoryProfile } from '@/engines/memory/extract-memory';
import { saveMemory, decayMemories, extractKeywordsForMemory } from '@/engines/human-like/memory-engine';
import { getIntimacyLevel } from '@/engines/human-like/user-model';
import { loadUserModel, learnFromSession, saveUserModel } from '@/engines/human-like/user-model';

/**
 * PATCH /api/sessions/[sessionId]/complete
 * 
 * 세션 종료 + AI 요약 생성
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;

  // 1. 세션 정보 로드
  const { data: session } = await supabase
    .from('counseling_sessions')
    .select('locked_scenario, emotion_baseline, current_phase_v2, turn_count, emotion_accumulator')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // 2. 마지막 5개 메시지 로드 (요약용)
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('sender_type, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 3. 감정 점수 (마지막 AI 메시지의 sentiment_score 또는 기본값)
  const { data: lastEmotionMsg } = await supabase
    .from('messages')
    .select('sentiment_score')
    .eq('session_id', sessionId)
    .eq('sender_type', 'ai')
    .not('sentiment_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const emotionEnd = lastEmotionMsg?.sentiment_score ?? session.emotion_baseline ?? 5;

  // 4. AI 요약 생성 (간단한 규칙 기반 — LLM 호출 없이 비용 절약)
  const scenarioLabel = getScenarioLabel(session.locked_scenario);
  const phaseLabel = getPhaseLabel(session.current_phase_v2);
  const msgSummary = recentMessages?.reverse().map(m => 
    `${m.sender_type === 'user' ? '나' : 'AI'}: ${(m.content as string).slice(0, 40)}`
  ).join(' → ') || '';

  const summary = generateSummary({
    scenario: scenarioLabel,
    phase: phaseLabel,
    turnCount: session.turn_count ?? 0,
    emotionStart: session.emotion_baseline,
    emotionEnd,
    lastMessages: msgSummary,
  });

  // 🆕 v20: 숙제 데이터 추출 (emotion_accumulator → 다음 세션에서 참조)
  const accumulatorData = session.emotion_accumulator as any;
  const homeworkData = accumulatorData?.deepEmotionHypothesis
    ? {
        deepEmotion: accumulatorData.deepEmotionHypothesis.primaryEmotion,
        scenario: session.locked_scenario,
        homeworks: [], // 실제 숙제는 HOMEWORK_CARD 이벤트에서 이미 표시됨
      }
    : null;

  // 5. DB 업데이트
  const { error } = await supabase
    .from('counseling_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      session_summary: summary,
      emotion_end: emotionEnd,
      homework_data: homeworkData,  // 🆕 v20: 다음 세션 연결용
    })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Complete] 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Complete] ✅ 세션 종료: ${sessionId} | 요약: ${summary}`);

  // 🆕 v25: 메모리 추출 (fire-and-forget — 세션 종료 응답을 블로킹하지 않음)
  (async () => {
    try {
      // 전체 메시지 로드 (메모리 추출용)
      const { data: allMessages } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(30);

      if (!allMessages || allMessages.length < 4) return;

      const sessionMsgs = allMessages.map((m) => ({
        role: m.sender_type as string,
        content: m.content as string,
      }));

      // 기존 메모리 프로필 로드
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('memory_profile')
        .eq('id', user.id)
        .single();

      const existingMemory: UserMemoryProfile = (profileData?.memory_profile as UserMemoryProfile) ?? createEmptyProfile();

      // 메모리 추출 (LLM 호출 1회 — Gemini haiku)
      const extraction = await extractSessionMemory(sessionMsgs, session.locked_scenario ?? undefined, existingMemory);
      if (!extraction) return;

      // 기존 메모리에 머지
      const merged = mergeMemory(existingMemory, extraction, new Date().toISOString());

      // DB 저장
      await supabase
        .from('user_profiles')
        .update({ memory_profile: merged })
        .eq('id', user.id);

      console.log(`[Memory] ✅ 메모리 추출 완료: ${extraction.newFacts.length}개 새 사실, hook="${extraction.nextSessionHook}"`);

      // 🆕 v29+v76: user_memories 테이블에도 저장 (루나 감정 결 포함)
      for (const fact of extraction.newFacts) {
        await saveMemory(supabase, user.id, {
          content: fact,
          memoryType: 'episodic',
          category: 'session_highlight',
          source: 'counseling',
          keywordTags: extractKeywordsForMemory(fact),
          emotionTag: session.locked_scenario === 'BREAKUP_CONTEMPLATION' ? 'sad' : undefined,
          emotionalWeight: 0.5,
          sessionId,
          // 🆕 v76: 루나 감정 결/인상 모든 fact 에 공통 적용
          lunaFeeling: extraction.lunaFeeling,
          lunaImpression: extraction.lunaImpression,
        });
      }
      // 핵심 감정 발견도 저장
      if (extraction.nextSessionHook) {
        await saveMemory(supabase, user.id, {
          content: extraction.nextSessionHook,
          summary: extraction.nextSessionHook.slice(0, 50),
          memoryType: 'semantic',
          category: 'core_emotion',
          source: 'counseling',
          keywordTags: extractKeywordsForMemory(extraction.nextSessionHook),
          emotionalWeight: 0.7,
          sessionId,
          // 🆕 v76
          lunaFeeling: extraction.lunaFeeling,
          lunaImpression: extraction.lunaImpression,
        });
      }
      console.log(`[Memory] ✅ user_memories 저장 완료: ${extraction.newFacts.length + 1}개`);
    } catch (e) {
      console.error('[Memory] 메모리 추출 실패 (무시):', e);
    }

    // 🆕 v29: 기억 감쇠 (에빙하우스 망각곡선)
    try {
      await decayMemories(supabase, user.id);
      console.log(`[Memory] ✅ 기억 감쇠 처리 완료`);
    } catch (e) {
      console.warn('[Memory] 감쇠 처리 실패 (무시):', e);
    }

    // 🆕 v29: 친밀도 업데이트
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('luna_session_count')
        .eq('id', user.id)
        .single();
      const newCount = (profile?.luna_session_count ?? 0) + 1;
      const newLevel = getIntimacyLevel(newCount);
      await supabase
        .from('user_profiles')
        .update({
          luna_session_count: newCount,
          luna_intimacy_level: newLevel,
        })
        .eq('id', user.id);
      console.log(`[Memory] ✅ 친밀도 업데이트: 세션 ${newCount}회, 레벨 ${newLevel}`);
    } catch (e) {
      console.warn('[Memory] 친밀도 업데이트 실패 (무시):', e);
    }

    // 🆕 v31: 유저 모델 학습 (대화 스타일/감정 패턴 업데이트)
    try {
      const { data: allMsgsForModel } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('session_id', sessionId)
        .eq('sender_type', 'user')
        .order('created_at', { ascending: true })
        .limit(20);
      const userMsgs = (allMsgsForModel ?? []).map((m: any) => m.content as string);
      if (userMsgs.length >= 2) {
        const currentModel = await loadUserModel(supabase, user.id);
        const { data: profileForCount } = await supabase
          .from('user_profiles')
          .select('luna_session_count')
          .eq('id', user.id)
          .single();
        const updatedModel = learnFromSession(currentModel, userMsgs, profileForCount?.luna_session_count ?? 1);
        await saveUserModel(supabase, user.id, updatedModel);
        console.log(`[Memory] ✅ 유저 모델 학습 완료: 직설=${updatedModel.communicationStyle.prefersDirect.toFixed(2)}, 친밀도=${updatedModel.lunaRelationship.intimacyScore}`);
      }
    } catch (e) {
      console.warn('[Memory] 유저 모델 학습 실패 (무시):', e);
    }
  })();

  return NextResponse.json({ ok: true, summary });
}

// ============================================
// 헬퍼 함수
// ============================================

function getScenarioLabel(scenario?: string | null): string {
  const map: Record<string, string> = {
    READ_AND_IGNORED: '읽씹 상황',
    GHOSTING: '잠수 상황',
    JEALOUSY_CONFLICT: '질투/갈등',
    BREAKUP_CONTEMPLATION: '이별 고민',
    COMMUNICATION_BREAKDOWN: '소통 단절',
    TRUST_ISSUES: '신뢰 문제',
    GENERAL: '연애 고민',
  };
  return map[scenario ?? ''] ?? '연애 상담';
}

function getPhaseLabel(phase?: string | null): string {
  const map: Record<string, string> = {
    HOOK: '상황 파악 중',
    MIRROR: '패턴 분석 중',
    BRIDGE: '원인 찾기 중',
    SOLVE: '해결책 제공',
    EMPOWER: '변화 리포트',
  };
  return map[phase ?? ''] ?? '';
}

function generateSummary(params: {
  scenario: string;
  phase: string;
  turnCount: number;
  emotionStart?: number | null;
  emotionEnd: number;
  lastMessages: string;
}): string {
  const { scenario, phase, turnCount, emotionStart, emotionEnd } = params;
  
  const emotionChange = emotionStart != null 
    ? `감정 ${emotionStart > emotionEnd ? '↓' : emotionStart < emotionEnd ? '↑' : '→'}${Math.abs(emotionEnd - (emotionStart ?? 5))}점`
    : '';

  if (phase === '변화 리포트' || phase === '해결책 제공') {
    return `${scenario}에 대해 ${turnCount}턴 동안 상담을 진행하고 구체적인 해결책을 찾았어요. ${emotionChange}`;
  }
  
  return `${scenario}에 대해 ${turnCount}턴 동안 이야기를 나눴어요. ${phase} 단계까지 진행했어요. ${emotionChange}`;
}
