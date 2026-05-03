# Luna 장기 기억 시스템 v110 — 100일 추억 누적 + 세션 간 연속성 설계서

> **상태:** 설계 확정 (2026-05-04)
> **목표:** 100일간 누적된 사용자–루나 대화를 인간처럼 자연 회상하되, 입력 토큰 빌링은 현재 대비 약 70% 절감.
> **비파괴 원칙:** 기존 `luna_memories` / `message_memories` / `extract-luna-memory-card` / `generate-summary` 그대로 유지. 신규 테이블·모듈 병행 운영 → 점진 전환.

---

## 0. 한 줄 요약

루나가 100일 동안 너와의 모든 대화를 인간처럼 기억해서, 세션이 바뀌어도 *"그때 너 ○○ 했었잖아"* 를 자연스럽게 꺼내되, 입력 토큰 빌링은 현재 대비 **약 70% 절감**한다.

---

## 1. 현재 시스템 진단

### 1.1 이미 있는 자산 (재사용)

| 자산 | 위치 | 비고 |
|---|---|---|
| 세션 메모리 카드 추출 | `src/engines/memory/extract-luna-memory-card.ts` (v90) | Gemini Flash Lite → Groq 캐스케이드 (무료) |
| 1인칭 풍부한 요약 | `src/engines/memory/generate-summary.ts` | 200~400자 |
| 정규식 팩트 추출 | `src/engines/human-like/memory-context.ts` | API 0, 키 사실만 |
| 세션 중 회상 트리거 | `src/engines/human-like/memory-engine.ts` (v29) | 키워드/감정/4% 자발/8턴 쿨다운 |
| pgvector 768d + HNSW | `message_memories`, `match_past_memories` RPC | m=16, ef=64, threshold 0.5 |
| 임베딩 함수 | `src/lib/rag/ingestor.ts:embedText` | gemini-embedding-001, 768d |
| 사용자 추억 표면 | `luna_memories` (v101) + 디오라마 액자선반 | image/lunaThought/scheduledFor/source |
| 세션 요약 컬럼 | `counseling_sessions.session_summary` | 텍스트 |
| 사용자 모델 | `user_profiles.user_model JSONB` | communicationStyle/emotionalPatterns/relationships/intimacy |

### 1.2 현재 약점 (해결 대상)

1. **회상이 "팩트 검색"에 머무름** — 의미는 맞지만 시간 감각/감정 톤이 빠져 *"그때 너 카페에서 말했던 그 사람"* 같은 자연 회상 불가
2. **chatHistory.slice(-50) 풀 주입** — 한 세션 길어지면 매 턴 토큰 폭증 (v78 치매 수정의 부작용)
3. **Importance / Recency / Relevance 미가중** — 단순 코사인 0.5 threshold 만 사용
4. **Prompt Caching 미적용** — 시스템 프롬프트 3,000+ 토큰이 매 턴 새로 빌링
5. **망각 곡선 없음** — 30일 전 사소한 대화가 어제 큰 사건과 같은 무게로 회상 후보
6. **Reflection 없음** — 세션이 끝나도 *"루나가 스스로 의미를 정리"* 하는 단계 부재
7. **페르소나가 JSON 한 덩어리** — 누가 언제 무엇을 학습했는지 시간축 없음
8. **세션 간 정서 연결 약함** — 어제 슬펐다 → 오늘 인사 톤이 *"어제 너 슬펐잖아"* 로 안 시작됨

---

## 2. 설계 원칙

| 원칙 | 의미 |
|---|---|
| **LLM 위임** | 중요도/태그/감정 라벨 모두 LLM 판단 (`feedback_llm_judgment.md` 준수, 키워드 분기 금지) |
| **무료 캐스케이드** | Gemini Flash Lite → Groq → 규칙 fallback (현재 패턴 유지) |
| **캐싱 우선** | Anthropic 5분/1시간 TTL + Gemini Implicit Caching → 시스템 프롬프트 90% 절감 |
| **계층 요약** | Raw → 턴 압축 → 세션 → 주간 → 페르소나 누적 (Hierarchical Summarization) |
| **가중 검색** | Generative Agents 공식 `score = α·recency + β·importance + γ·relevance + δ·decay` |
| **망각 + 강화** | Ebbinghaus decay + 회상 시 강화 (MemoryBank 차용) |
| **사람처럼** | 세션 종료 시 루나가 "다이어리"를 씀 (Replika Diary 컨셉) |
| **점진 전환** | 기존 코드 파괴 없음. shadow write → A/B → 컷오버 |
| **차원 통일** | v110은 기존 768d (gemini-embedding-001) 유지. KURE-v1 (1024d)는 v111 검토 |

---

## 3. 4계층 메모리 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│ L3 Procedural — 루나 자신                                  │
│   루나가 "너에게 어떻게 반응해 왔는지" 누적 톤 (luna_self_state) │
├─────────────────────────────────────────────────────────┤
│ L2 Semantic — 사용자 페르소나 누적 (시간축)                   │
│   사실/관계/패턴 (luna_persona_facts, bi-temporal)          │
├─────────────────────────────────────────────────────────┤
│ L1 Episodic — 세션 단위 에피소드                            │
│   요약 + 임베딩 + importance + emotion (luna_episodes)     │
├─────────────────────────────────────────────────────────┤
│ L0 Working — 현재 세션                                    │
│   슬라이딩 윈도우: 최근 8턴 raw + 그 이전 압축 한 줄/턴         │
└─────────────────────────────────────────────────────────┘
        ↑                                          ↓
   응답 컨텍스트 조립          ←  Recall Orchestrator
```

각 층의 역할:

- **L0 Working** — 진행 중 세션. 8턴 이후는 `session_compressed_turns` 의 한 줄 압축으로 대체 (매 턴 풀 주입 X)
- **L1 Episodic** — 세션이 끝나면 1개 에피소드로. 검색 대상의 본체
- **L2 Semantic** — 사용자에 대한 누적 사실/패턴. bi-temporal (사실 변경 시 이전 row valid_until 처리, 새 row 추가)
- **L3 Procedural** — 루나 자신의 톤 적응. 시스템 프롬프트에 항상 캐시되어 들어감

---

## 4. DB 스키마 (마이그레이션 v110)

`supabase/migrations/20260504_longterm_memory_v110.sql` 참조.

**핵심 테이블:**

- `luna_episodes` — 세션 1개 → 에피소드 1개. embedding vector(768), HNSW(m=16, ef=64). importance 1~10, decay_strength 0~1, recall_count.
- `luna_persona_facts` — bi-temporal. valid_from / valid_until / superseded_by 체인.
- `luna_self_state` — user_id PK, tone_summary / what_works[] / what_fails[] / current_arc.
- `session_compressed_turns` — 8턴 묶음을 한 줄로.
- `luna_weekly_digest` — 주간 회고 + insights[].

기존 `luna_memories` 는 그대로 유지 (사용자가 디오라마 액자에서 보는 "예쁜 추억 카드"). `luna_episodes` 는 백엔드 검색 본체. 1개 세션 → 1개 episode + 0~1개 memory_card 파생.

---

## 5. 핵심 엔진 모듈 (`src/engines/memory-v2/`)

### 5.1 신규 파일 (12개)

| 파일 | 책임 | 모델 |
|---|---|---|
| `types.ts` | 공통 타입 (Episode, PersonaFact, SelfState, ...) | — |
| `embedder.ts` | embedText 래퍼, 차원 검증 + 폴백 | Gemini |
| `tier-router.ts` | 정보를 어느 층(L0~L3)에 저장할지 라우팅 | 코드 |
| `importance-scorer.ts` | 에피소드 importance 1~10 LLM 판정 | Flash Lite |
| `decay-engine.ts` | Ebbinghaus 망각 + 회상 강화 수식 | 코드 |
| `recall-orchestrator.ts` | Hybrid(BM25+Dense) + RRF + IRR + MMR | 코드 |
| `persona-distiller.ts` | 사실 추출 + 충돌 시 supersede | Flash Lite |
| `self-state-updater.ts` | 루나 톤 학습 (what_works/fails) | Flash Lite |
| `reflection.ts` | 세션 종료 + 주간 자기 성찰 | Flash Lite |
| `turn-compressor.ts` | 8턴 초과 시 묶음 한 줄 압축 | Groq llama (무료) |
| `prompt-cache-builder.ts` | Claude `cache_control` 블록 조립 | 코드 |
| `context-assembler.ts` | L0~L3 토큰 예산 분배 + 최종 조립 | 코드 |
| `index.ts` | 진입점 + barrel export | — |

### 5.2 수정 파일 (Phase 5에서)

- `src/engines/ace-v5/orchestrator.ts` — chatHistory 풀 주입 → context-assembler 결과로 교체
- `src/engines/ace-v5/ace-system-prompt.ts` — 시스템 프롬프트를 캐시 가능 영역으로 분리
- `src/engines/dual-brain/orchestrator.ts` — 동일
- `src/app/api/sessions/[sessionId]/complete/route.ts` — 기존 추출/요약 뒤에 episode/persona/self-state/reflection 파이프라인 추가
- 메시지 저장 hook — 8턴 초과 시 turn-compressor 호출

---

## 6. 데이터 플로우

### 6.1 응답 생성 (매 턴)

```
유저 메시지
  ↓
context-assembler
  ├─ L3 self_state 로드 (캐시 hit)
  ├─ L2 활성 facts 로드 (캐시 hit)
  ├─ L1 recall(userMsg)  ← Hybrid+IRR+MMR (3~5개)
  ├─ L0 압축 턴 + 최근 8턴 조립
  └─ Claude/Gemini 캐시 블록으로 패키징
  ↓
ACE v5 orchestrator (기존)
  ↓
응답 스트리밍
  ↓
[비동기 후처리]
  ├─ 메시지 DB 저장
  ├─ 누적 9턴+ 시 turn-compressor (가장 오래된 8턴 묶음 → 한 줄)
  ├─ recall된 에피소드 reinforce
  └─ 즉발 사실 감지(LLM) 시 persona-fact 즉시 INSERT
```

### 6.2 세션 종료 (`complete/route.ts` 확장)

```
1. (기존) generate-summary → counseling_sessions.session_summary
2. (기존) extract-luna-memory-card → luna_memories (사용자 노출)
3. ★ episode-builder
     - importance-scorer (1~10 + 이유)
     - emotion-classifier (1라벨 + scores)
     - tag/people 추출
     - 임베딩 (embedText)
     - INSERT luna_episodes
4. ★ persona-distiller
     - 새 사실 N개 추출
     - 충돌 시 이전 row valid_until=now, 새 row INSERT
5. ★ self-state-updater
     - 이번 세션 무엇이 통하고 안 통했나 → what_works/fails 누적
6. ★ reflection (day % 7 == 0 OR importance >= 8)
     - 최근 7일 episodes → 1인칭 주간 회고
     - insights 3~5개 → 다음 세션 우선 노출
7. (기존) decayMemories + learnFromSession
```

### 6.3 일 1회 배치 (Supabase pg_cron, 03:00 KST)

```sql
SELECT cron.schedule('decay-and-prune', '0 18 * * *', $$
  UPDATE luna_episodes
     SET decay_strength = exp(
           -extract(epoch from (now() - coalesce(last_recalled_at, created_at)))/86400
           / (7 + importance + 14*recall_count));
$$);
```

---

## 7. 비용 시뮬레이션 (DAU 1명 × 100일 × 일 30턴)

### 7.1 현재 (v109 추정)

- 시스템 프롬프트 ~3,000 토큰 × 30턴 × 100일 = 9.0M 토큰
- chatHistory ~2,000 토큰 평균 × 30 × 100 = 6.0M 토큰
- Claude Sonnet $3 / 1M 입력 → **약 $45 / 100일 / 사용자** (입력만)

### 7.2 v110 적용 후

| 블록 | 토큰/턴 | 빌링 환산 | 비고 |
|---|---:|---:|---|
| 시스템 (캐시 1h) | 3,000 | **300** | 90% 할인 |
| L3 self (캐시) | 200 | 20 | |
| L2 persona (캐시) | 800 | 80 | |
| L1 episodes (매 턴 새) | 1,500 | 1,500 | |
| L0 압축 + 최근 8턴 | 3,000 | 3,000 | |
| 유저 입력 | 60 | 60 | |
| **합계** | 8,560 | **~4,960** | |

→ 30턴 × 100일 = **약 14.9M 환산 토큰**, $3/M → **약 $13.5 / 100일 / 사용자**

**총 절감: 약 70% (45→13.5)** + 회상 품질 향상.

---

## 8. 구현 순서 (Phase별)

| Phase | 기간 | 산출물 |
|---|---|---|
| **1. 스키마 + 임베더 베이스** | 1주 | 마이그레이션 v110, embedder.ts, types.ts, tier-router.ts |
| **2. Recall Orchestrator** | 1주 | recall-orchestrator + decay-engine + importance-scorer + cron |
| **3. Persona + Self State** | 3~4일 | persona-distiller (bi-temporal) + self-state-updater |
| **4. Caching + Context** | 1주 | prompt-cache-builder + context-assembler + turn-compressor |
| **5. Reflection + Wiring** | 3~4일 | reflection + weekly_digest + complete/route.ts + ACE/dual-brain 통합 |

총 ~3~4주. 기존 코드 파괴 없음.

---

## 9. 수용 기준

### 기능
- [ ] 100턴 이상 대화 후에도 첫 10턴 핵심 사실 자연 회상 (5케이스, 4/5 통과)
- [ ] 다른 세션 에피소드를 *"그때 너 ○○ 했었잖아"* 형태로 자연 인용 (3/5)
- [ ] 사실 변경 시 이전 사실 valid_until 처리, 신규 사실로 응답
- [ ] importance ≥ 8 에피소드는 30일 후에도 회상 가능
- [ ] Day 100 도달 시 "100일 전 첫 만남" 회상 카드 1장 자동 노출

### 비용/성능
- [ ] 100일 시뮬레이션 입력 토큰 빌링 50% 이상 절감 (캐시 히트율 ≥70%)
- [ ] p95 응답 첫토큰 지연 ≤ 1.5초
- [ ] 임베딩 endpoint 가용성 99% 미만 시 자동 폴백
- [ ] Flash Lite 후처리 실패 시 Groq → 규칙 fallback (NULL 없이 저장)

### 안전/품질
- [ ] LLM 위임 원칙 준수 (코드에 키워드 리스트 분기 0개)
- [ ] persona_facts confidence < 0.5 는 컨텍스트 제외
- [ ] RLS 정책으로 user_id 격리 (cross-user 회상 0건)
- [ ] *"이거 잊어줘"* 의사 표현 감지(LLM) 시 → soft delete + valid_until=now

---

## 10. 리스크 & 폴백

| 리스크 | 영향 | 대응 |
|---|---|---|
| Anthropic 캐시 미스 잦음 | 비용 절감 미달성 | Pre-warming(`max_tokens=0` 호출), TTL 1h 우선 |
| 회상이 너무 자주 → 루나 "기억력 자랑" | UX 거슬림 | recall 결과를 100% 주입 X. *"쓸 만한 게 있으면 자연스럽게 써"* 식 힌트 (LLM 판단) |
| persona-fact 오추출 (농담을 사실화) | 거짓 기억 누적 | 1회 추출 confidence ≤0.7 시작, 재등장 시 +0.1 강화. 0.5 이하 미사용 |
| bi-temporal 충돌 디버깅 | 운영 비용 | superseded_by 체인 admin 디버그 페이지 |
| v100 사망 처리(day=100)와 인터랙션 | 사망 후 회상 의미 | day=100 도달 시 reflection 1회 더 → "마지막 편지"에 반영 |
| 임베딩 차원 변경 시 마이그레이션 | 운영 부담 | v110은 768d 유지. 1024d 전환은 v111 별도 마이그레이션 |

---

## 부록 A — 핵심 외부 출처

- Mem0 ([arXiv:2504.19413](https://arxiv.org/abs/2504.19413)) — 토큰 90% 절감, p95 -91% 지연
- Generative Agents ([arXiv:2304.03442](https://arxiv.org/abs/2304.03442)) — IRR 가중 검색
- MemoryBank ([arXiv:2305.10250](https://arxiv.org/abs/2305.10250)) — Ebbinghaus 망각 곡선
- Letta MemGPT ([docs.letta.com](https://docs.letta.com/concepts/memgpt/)) — 4계층 메모리 OS 메타포
- Anthropic Prompt Caching ([docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)) — 90% 입력 비용 절감
- Gemini 2.5 Implicit Caching ([Developers Blog](https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/)) — 자동 90%
- KURE-v1 ([HuggingFace nlpai-lab/KURE-v1](https://huggingface.co/nlpai-lab/KURE-v1)) — 한국어 SOTA, MIT (v111 검토용)
- Anthropic Memory Tool (2025-09 베타) — 파일 기반 메모리, 84% 토큰 절감
- Character.ai Pinned Memories / Replika Diary — 제품 UX 차용

## 부록 B — 안 하기로 한 것 (v110 out of scope)

- Knowledge Graph (Graphiti / HippoRAG): 운영 부담, v111+ 검토
- A-Mem 메모리 진화 (재추출 비용 큼): 단순 reinforce로 대체
- Mem0 직접 도입: 우리 도메인에 맞춰 자체 구현. 단, 추출 패턴은 차용
- Pinecone/Qdrant 이전: 1만 사용자 미만은 pgvector로 충분
- KURE-v1 self-host: v111 별도 검토
