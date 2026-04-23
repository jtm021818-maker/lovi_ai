'use client';

import './settings.css';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useLunaVoice } from '@/hooks/useLunaVoice';
import { isFxEnabled } from '@/lib/fx/effect-bus';
import type { PersonaMode } from '@/types/persona.types';
// 🆕 v41: 친밀도 카드
import IntimacyCard from '@/components/intimacy/IntimacyCard';
import type { IntimacyDerivedInfo } from '@/engines/intimacy';
// 🆕 v82.20: Luna 설정 페이지 스프라이트 (7×7 49프레임)
import LunaSprite from '@/components/common/LunaSprite';
// 🆕 v85.5: 필드 편집 bottom-sheet (인라인 편집 UI 깨짐 해결)
import EditNicknameSheet from '@/components/settings/EditNicknameSheet';
import EditGenderSheet from '@/components/settings/EditGenderSheet';

// ============================================================
// Types & Constants
// ============================================================

interface UserProfile {
  nickname: string;
  onboarding_situation: string | null;
  persona_mode: PersonaMode;
  is_premium: boolean;
  created_at: string;
}

const SITUATION_OPTIONS = [
  { value: 'breakup', label: '이별/이별 후', icon: '💔' },
  { value: 'crush', label: '썸/짝사랑', icon: '💕' },
  { value: 'relationship', label: '연애 중', icon: '💑' },
  { value: 'confused', label: '헷갈리는 관계', icon: '🤔' },
  { value: 'free', label: '자유롭게', icon: '💬' },
];

const PERSONA_OPTIONS: { value: PersonaMode; label: string; icon: string; image: string; desc: string; bg: string }[] = [
  { value: 'luna', label: '루나', icon: '🦊', image: '/ui/sangdam_luna.webp', desc: '편한 친구처럼', bg: '#e8daf5' },
  // { value: 'counselor', label: '상담사', icon: '👩‍⚕️', image: '/personas/counselor_cushion.webp', desc: '전문적으로', bg: '#c5ddf5' },
  { value: 'tarot', label: '타로냥', icon: '🔮', image: '/ui/sangdam_taromiao.webp', desc: '카드로 읽는 마음', bg: '#1a1a3e' },
];

// ============================================================
// Sub Components
// ============================================================

/** 핑크 슬라이더 */
function PinkSlider({ value, onChange, min = 0, max = 100 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="settings-slider-track">
      <div className="settings-slider-fill" style={{ width: `${pct}%` }} />
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="settings-slider-input"
      />
      <div className="settings-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}

/** 토글 */
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`settings-toggle ${value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ duration: 0.2 }}
        className="settings-toggle-knob"
      />
    </button>
  );
}

// ============================================================
// Page
// ============================================================

export default function SettingsPage() {
  const router = useRouter();
  const { settings: voiceSettings, updateSettings: updateVoice } = useLunaVoice();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  // 🆕 v41.1: 페르소나별 친밀도 상태 (루나 + 타로냥 독립)
  const [intimacyLuna, setIntimacyLuna] = useState<IntimacyDerivedInfo | null>(null);
  const [intimacyTarot, setIntimacyTarot] = useState<IntimacyDerivedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [editingGender, setEditingGender] = useState(false);
  const [genderInput, setGenderInput] = useState('other');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'reset' | 'delete' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPersonaDetail, setShowPersonaDetail] = useState<string | null>(null);
  const [intimacyTab, setIntimacyTab] = useState<'luna' | 'tarot'>('luna');
  const [fxEnabled, setFxEnabled] = useState(true);

  useEffect(() => {
    setFxEnabled(isFxEnabled());
  }, []);

  const toggleFx = (next: boolean) => {
    setFxEnabled(next);
    localStorage.setItem('fx_enabled', next ? 'true' : 'false');
  };

  // 속도/음높이를 0~100 슬라이더로 매핑
  const rateMap: Record<string, number> = { '-20%': 20, '-10%': 40, '+0%': 60, '+10%': 80 };
  const pitchMap: Record<string, number> = { '-2Hz': 20, '+0Hz': 50, '+2Hz': 70, '+5Hz': 90 };
  const rateReverse: Record<number, string> = { 20: '-20%', 40: '-10%', 60: '+0%', 80: '+10%' };
  const pitchReverse: Record<number, string> = { 20: '-2Hz', 50: '+0Hz', 70: '+2Hz', 90: '+5Hz' };

  const rateValue = rateMap[voiceSettings.rate] ?? 60;
  const pitchValue = pitchMap[voiceSettings.pitch] ?? 50;

  const snapRate = (v: number) => {
    const snaps = [20, 40, 60, 80];
    const closest = snaps.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
    if (rateReverse[closest]) updateVoice({ rate: rateReverse[closest] });
  };
  const snapPitch = (v: number) => {
    const snaps = [20, 50, 70, 90];
    const closest = snaps.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
    if (pitchReverse[closest]) updateVoice({ pitch: pitchReverse[closest] });
  };

  const [latestScenario, setLatestScenario] = useState<string | null>(null);

  // 🆕 v33 (M1): 프로필 + 최근 시나리오 병렬 로드 (~100-200ms 절감)
  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      // ① 프로필 API
      fetch('/api/user/profile').then(r => r.json()).catch(() => null),
      // ② 최근 시나리오 (Supabase 직접)
      supabase.auth.getUser().then(({ data }: { data: any }) => {
        if (!data?.user) return null;
        return supabase
          .from('counseling_sessions')
          .select('locked_scenario')
          .eq('user_id', data.user.id)
          .not('locked_scenario', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
          .then((r: any) => r.data?.locked_scenario ?? null);
      }),
      // ③ 🆕 v41: 친밀도 상태
      fetch('/api/user/intimacy').then(r => r.json()).catch(() => null),
    ]).then(([profileData, scenario, intimacyData]) => {
      if (profileData) {
        setProfile(profileData);
        setNickInput(profileData.nickname || '');
        setGenderInput(profileData.onboarding_situation || 'other');
      }
      if (scenario) setLatestScenario(scenario);
      // 🆕 v41.1: 둘 다 반환 응답 처리 ({ luna: {raw, derived}, tarot: {raw, derived} })
      if (intimacyData?.luna?.derived) {
        setIntimacyLuna(intimacyData.luna.derived as IntimacyDerivedInfo);
      }
      if (intimacyData?.tarot?.derived) {
        setIntimacyTarot(intimacyData.tarot.derived as IntimacyDerivedInfo);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<{ nickname: string; onboarding_situation: string }>) => {
    setSaving(true);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
    setSaving(false);
    showToast('저장됨');
  }, [showToast]);

  const updatePersona = useCallback(async (mode: PersonaMode) => {
    await fetch('/api/user/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_mode: mode }),
    });
    setProfile(prev => prev ? { ...prev, persona_mode: mode } : prev);
    showToast('상담 모드 변경됨');
  }, [showToast]);

  const handleDataAction = useCallback(async (action: 'reset' | 'delete-account') => {
    setConfirmModal(null);
    setSaving(true);
    const res = await fetch(`/api/user/data?action=${action}`, { method: 'DELETE' });
    setSaving(false);
    if (res.ok) {
      if (action === 'delete-account') {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/welcome');
      } else {
        showToast('상담 기록이 초기화되었습니다');
      }
    }
  }, [router, showToast]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/welcome');
  };

  const testTTS = useCallback(async () => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '안녕, 나는 루나야! 오늘 기분은 어때?',
          pitch: voiceSettings.pitch,
          rate: voiceSettings.rate,
          volume: voiceSettings.volume,
        }),
      });
      if (res.status === 403) { showToast('프리미엄 전용 기능이에요'); return; }
      if (!res.ok) { showToast('음성 생성에 실패했어요'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      showToast('음성 테스트 실패');
    }
  }, [voiceSettings, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(180deg, #fce4ec 0%, #fff5f0 50%, #fdf0e8 100%)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-transparent" />
      </div>
    );
  }

  const isPremium = profile?.is_premium ?? false;

  return (
    <>
    {/* 설정 페이지에서만 setting 스프라이트 프리로드 (16MB — 전역 layout에서 제외됨) */}
    <link rel="preload" as="image" href="/splite/luna_sprite_setting_1.webp" fetchPriority="high" />
    <div className="settings-page">
      {/* 벚꽃 장식 */}
      <div className="settings-sakura settings-sakura-1">🌸</div>
      <div className="settings-sakura settings-sakura-2">🌸</div>
      <div className="settings-sakura settings-sakura-3">✿</div>
      <div className="settings-sakura settings-sakura-4">🌸</div>

      <div className="settings-scroll">

        {/* ① 프리미엄 배너 */}
        <Link href="/subscription" className="settings-premium-banner">
          <span className="settings-premium-crown">👑</span>
          <div className="settings-premium-text">
            <p className="settings-premium-title">
              {isPremium ? 'Premium 구독 중' : 'Premium Upgrade'}
            </p>
            <p className="settings-premium-desc">
              {isPremium ? '모든 기능 이용 중' : '프리미엄으로 업그레이드 (무제한 상담, AI 음성, XRay 등)'}
            </p>
          </div>
          <span className="settings-premium-arrow">›</span>
        </Link>

        {/* ② 마스코트 카드 — 선택된 페르소나에 따라 변경 */}
        <motion.div
          className="settings-mascot-card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={profile?.persona_mode === 'tarot' ? { background: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%)' } : undefined}
        >
          <div className="settings-mascot-bg" style={profile?.persona_mode === 'tarot' ? { opacity: 0 } : undefined} />
          <AnimatePresence mode="wait">
            <motion.div
              key={profile?.persona_mode || 'luna'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
            >
              {profile?.persona_mode === 'tarot' ? (
                <Image
                  src="/ui/sangdam_taromiao.webp"
                  alt="TarotNyang"
                  width={260}
                  height={260}
                  className="settings-mascot-img"
                  priority
                />
              ) : (
                /* 🆕 v82.20: Luna 7×7 49프레임 애니 스프라이트 */
                <LunaSprite
                  preset="setting"
                  size={260}
                  circle={false}
                  speed="normal"
                  className="settings-mascot-img"
                />
              )}
            </motion.div>
          </AnimatePresence>
          {/* 별/꽃 장식 */}
          {profile?.persona_mode === 'tarot' ? (
            <>
              <span className="settings-mascot-star s1">🔮</span>
              <span className="settings-mascot-star s2">✨</span>
              <span className="settings-mascot-star s3">🌙</span>
              <span className="settings-mascot-star s4">🃏</span>
            </>
          ) : (
            <>
              <span className="settings-mascot-star s1">⭐</span>
              <span className="settings-mascot-star s2">✨</span>
              <span className="settings-mascot-star s3">🌸</span>
              <span className="settings-mascot-star s4">⭐</span>
            </>
          )}
          {/* 현재 상담사 뱃지 */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            background: profile?.persona_mode === 'tarot'
              ? 'linear-gradient(135deg, rgba(45,27,105,0.9), rgba(26,26,62,0.9))'
              : 'rgba(156,39,176,0.85)',
            color: profile?.persona_mode === 'tarot' ? '#ffd54f' : '#fff',
            padding: '5px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap' as const,
            backdropFilter: 'blur(8px)',
            boxShadow: profile?.persona_mode === 'tarot'
              ? '0 2px 12px rgba(45,27,105,0.4)'
              : '0 2px 12px rgba(156,39,176,0.3)',
            border: profile?.persona_mode === 'tarot'
              ? '1px solid rgba(255,213,79,0.3)'
              : '1px solid rgba(255,255,255,0.2)',
          }}>
            {profile?.persona_mode === 'tarot' ? '🔮 타로냥과 상담 중' : '🦊 루나와 상담 중'}
          </div>
        </motion.div>

        {/* ③ 이름 / 성별 / 가입일 — 3열
            🆕 v85.5: 인라인 편집 제거 → pill 탭 시 bottom-sheet 모달로 편집 */}
        <div className="settings-profile-row">
          <div className="settings-profile-col">
            <p className="settings-profile-label">이름</p>
            <button onClick={() => setEditingNick(true)} className="settings-profile-pill">
              {profile?.nickname || '익명'} <span>›</span>
            </button>
          </div>
          <div className="settings-profile-col">
            <p className="settings-profile-label">성별</p>
            <button onClick={() => setEditingGender(true)} className="settings-profile-pill">
              {profile?.onboarding_situation === 'male' ? '남성' :
               profile?.onboarding_situation === 'female' ? '여성' :
               profile?.onboarding_situation === 'other' ? '선택 안 함' :
               '미설정'} <span>›</span>
            </button>
          </div>
          <div className="settings-profile-col">
            <p className="settings-profile-label">가입일</p>
            <div className="settings-profile-pill no-action">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}
            </div>
          </div>
        </div>

        {/* ④ 상담 모드 — 이미지 + 설명 */}
        <div className="settings-section">
          <h2 className="settings-section-title">상담 모드</h2>
          <div className="settings-persona-grid">
            {PERSONA_OPTIONS.map(p => {
              const isActive = profile?.persona_mode === p.value;
              const isDetailOpen = showPersonaDetail === p.value;
              return (
                <div key={p.value} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <motion.button
                    onClick={() => updatePersona(p.value)}
                    className={`settings-persona-card ${isActive ? 'active' : ''}`}
                    whileTap={{ scale: 0.93 }}
                    style={{ background: 'transparent' }}
                  >
                    <Image src={p.image} alt={p.label} width={200} height={155} className="settings-persona-cushion-img" style={{ objectFit: 'contain', width: '100%', height: 'auto' }} />
                  </motion.button>
                  <button
                    onClick={() => setShowPersonaDetail(isDetailOpen ? null : p.value)}
                    style={{
                      background: isDetailOpen ? (p.value === 'tarot' ? '#2d1b69' : '#9c27b0') : 'rgba(156,39,176,0.08)',
                      color: isDetailOpen ? '#fff' : '#9c27b0',
                      border: 'none',
                      borderRadius: 12,
                      padding: '6px 0',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isDetailOpen ? '닫기 ✕' : `${p.label} 소개 ›`}
                  </button>
                  <AnimatePresence>
                    {isDetailOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          background: p.value === 'tarot'
                            ? 'linear-gradient(135deg, #1a1a3e, #2d1b69)'
                            : 'linear-gradient(135deg, #fce4ec, #f3e5f5)',
                          borderRadius: 16,
                          padding: '14px 12px',
                          color: p.value === 'tarot' ? '#e8d5f5' : '#4a148c',
                          fontSize: 12,
                          lineHeight: 1.7,
                        }}>
                          {p.value === 'luna' && (
                            <>
                              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#9c27b0' }}>
                                🦊 루나 — 편한 친구 같은 상담사
                              </p>
                              <p>• 29살 연애 심리 전문가</p>
                              <p>• 따뜻하고 현실적인 <b>친구 같은 포지션</b></p>
                              <p>• 심리학 기반 공감 + 쉬운 말로 설명</p>
                              <p>• 판단 없이 네 편에서 들어줘</p>
                              <p style={{ marginTop: 8, fontStyle: 'italic', opacity: 0.85 }}>
                                &ldquo;그거 진짜 마음 아팠겠다... 💜&rdquo;
                              </p>
                            </>
                          )}
                          {p.value === 'tarot' && (
                            <>
                              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#ffd54f' }}>
                                🔮 타로냥 — 신비로운 고양이 타로 리더
                              </p>
                              <p>• 도도하지만 속마음은 따뜻한 고양이</p>
                              <p>• <b>타로카드</b>를 통해 감정과 상황을 읽어냄</p>
                              <p>• 매 상담마다 카드를 뽑아 해석해줘</p>
                              <p>• 심리학 지식을 타로 메타포로 전달</p>
                              <p style={{ marginTop: 8, fontStyle: 'italic', opacity: 0.85 }}>
                                &ldquo;카드가 네 마음을 비추고 있어... 🃏&rdquo;
                              </p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🆕 v41.2: 친밀도 카드 — 탭 전환 방식 (모바일 화면 짤림 방지) */}
        {(intimacyLuna || intimacyTarot) && (
          <div className="settings-section">
            <h2 className="settings-section-title">관계 상태</h2>

            {/* 탭 전환 버튼 — 루나 & 타로냥 둘 다 있을 때만 */}
            {intimacyLuna && intimacyTarot && (
              <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                background: 'rgba(168, 85, 247, 0.06)',
                borderRadius: 16,
                padding: 4,
              }}>
                <motion.button
                  onClick={() => setIntimacyTab('luna')}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 13,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: intimacyTab === 'luna'
                      ? 'linear-gradient(135deg, #a855f7, #c084fc)'
                      : 'transparent',
                    color: intimacyTab === 'luna' ? '#fff' : '#9ca3af',
                    boxShadow: intimacyTab === 'luna'
                      ? '0 2px 8px rgba(168, 85, 247, 0.35)'
                      : 'none',
                  }}
                >
                  <img
                    src="/luna_fox_transparent.webp"
                    alt="루나"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: intimacyTab === 'luna' ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(168,85,247,0.2)',
                    }}
                  />
                  루나
                </motion.button>
                <motion.button
                  onClick={() => setIntimacyTab('tarot')}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 13,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: intimacyTab === 'tarot'
                      ? 'linear-gradient(135deg, #2d1b69, #1a1a3e)'
                      : 'transparent',
                    color: intimacyTab === 'tarot' ? '#ffd54f' : '#9ca3af',
                    boxShadow: intimacyTab === 'tarot'
                      ? '0 2px 8px rgba(45, 27, 105, 0.4)'
                      : 'none',
                  }}
                >
                  <img
                    src="/taronaong_kakao.webp"
                    alt="타로냥"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: intimacyTab === 'tarot' ? '2px solid rgba(255,213,79,0.6)' : '2px solid rgba(45,27,105,0.2)',
                    }}
                  />
                  타로냥
                </motion.button>
              </div>
            )}

            {/* 카드 영역 — AnimatePresence로 전환 애니메이션 */}
            <AnimatePresence mode="wait">
              {intimacyTab === 'luna' && intimacyLuna && (
                <motion.div
                  key="intimacy-luna"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <IntimacyCard
                    level={intimacyLuna.level}
                    levelEmoji={intimacyLuna.levelEmoji}
                    levelName={intimacyLuna.levelName}
                    levelLabel={intimacyLuna.levelLabel}
                    trust={intimacyLuna.dimensions.trust}
                    openness={intimacyLuna.dimensions.openness}
                    bond={intimacyLuna.dimensions.bond}
                    respect={intimacyLuna.dimensions.respect}
                    avgScore={intimacyLuna.avgScore}
                    progressPercent={intimacyLuna.progressPercent}
                    daysSinceFirst={intimacyLuna.daysSinceFirst}
                    totalSessions={intimacyLuna.totalSessions}
                    consecutiveDays={intimacyLuna.consecutiveDays}
                    persona="luna"
                  />
                  <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 6, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 }}>
                    💭 {intimacyLuna.depthHint}
                  </p>
                </motion.div>
              )}
              {intimacyTab === 'tarot' && intimacyTarot && (
                <motion.div
                  key="intimacy-tarot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <IntimacyCard
                    level={intimacyTarot.level}
                    levelEmoji={intimacyTarot.levelEmoji}
                    levelName={intimacyTarot.levelName}
                    levelLabel={intimacyTarot.levelLabel}
                    trust={intimacyTarot.dimensions.trust}
                    openness={intimacyTarot.dimensions.openness}
                    bond={intimacyTarot.dimensions.bond}
                    respect={intimacyTarot.dimensions.respect}
                    avgScore={intimacyTarot.avgScore}
                    progressPercent={intimacyTarot.progressPercent}
                    daysSinceFirst={intimacyTarot.daysSinceFirst}
                    totalSessions={intimacyTarot.totalSessions}
                    consecutiveDays={intimacyTarot.consecutiveDays}
                    persona="tarot"
                  />
                  <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 6, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 }}>
                    💭 {intimacyTarot.depthHint}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <p style={{ fontSize: 10, color: '#a855f7', marginTop: 12, textAlign: 'center', fontWeight: 600 }}>
              💜 루나와 타로냥은 각자 독립된 관계로 발전해
            </p>
          </div>
        )}

        {/* ⑤ 화면 연출 */}
        <div className="settings-toggles-row">
          <div className="settings-toggle-item" style={{ width: '100%' }}>
            <div>
              <span className="settings-toggle-label">화면 연출 (FX)</span>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>흔들림 / 파티클 / 말풍선 효과</p>
            </div>
            <Toggle value={fxEnabled} onChange={toggleFx} />
          </div>
        </div>

        {/* ⑥ 자동 음성 읽기 + 음성 활성화 */}
        <div className="settings-toggles-row">
          <div className="settings-toggle-item">
            <span className="settings-toggle-label">자동 음성 읽기</span>
            <Toggle value={voiceSettings.autoSpeak} onChange={v => updateVoice({ autoSpeak: v })} disabled={!isPremium} />
          </div>
          <div className="settings-toggle-item">
            <span className="settings-toggle-label">음성 활성화</span>
            <Toggle value={voiceSettings.enabled} onChange={v => updateVoice({ enabled: v })} disabled={!isPremium} />
          </div>
        </div>

        {/* ⑥ 말하기 속도 */}
        <div className="settings-slider-row">
          <span className="settings-slider-label">말하기 속도</span>
          <PinkSlider value={rateValue} onChange={snapRate} />
        </div>

        {/* ⑦ 음높이 */}
        <div className="settings-slider-row">
          <span className="settings-slider-label">음높이</span>
          <PinkSlider value={pitchValue} onChange={snapPitch} />
        </div>

        {/* 🔊 음성 테스트 */}
        {isPremium && (
          <motion.button
            onClick={testTTS}
            className="settings-tts-test"
            whileTap={{ scale: 0.95 }}
          >
            🔊 음성 테스트
          </motion.button>
        )}

        {/* ⑧ 상담 기록 초기화 / 계정 탈퇴 */}
        <div className="settings-danger-row">
          <button onClick={() => setConfirmModal('reset')} className="settings-danger-btn">
            상담 기록 초기화
          </button>
          <button onClick={() => setConfirmModal('delete')} className="settings-danger-btn delete">
            계정 탈퇴
          </button>
        </div>

        {/* ⑨ 로그아웃 */}
        <motion.button
          onClick={handleLogout}
          className="settings-logout-btn"
          whileTap={{ scale: 0.97 }}
        >
          로그아웃
        </motion.button>

        {/* 앱 정보 */}
        <div className="settings-footer">
          <p>Luna v3.0</p>
          <p className="sub">루나와 함께하는 관계 상담 🦊</p>
        </div>

      </div>

      {/* 확인 모달 */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="settings-modal-overlay"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="settings-modal"
            >
              <h3>{confirmModal === 'reset' ? '상담 기록 초기화' : '계정 탈퇴'}</h3>
              <p>
                {confirmModal === 'reset'
                  ? '모든 상담 기록, 감정 로그, 세션이 삭제됩니다. 이 작업은 되돌릴 수 없어요.'
                  : '계정과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없어요.'}
              </p>
              <div className="settings-modal-btns">
                <button onClick={() => setConfirmModal(null)} className="cancel">취소</button>
                <button
                  onClick={() => handleDataAction(confirmModal === 'reset' ? 'reset' : 'delete-account')}
                  disabled={saving}
                  className={confirmModal === 'delete' ? 'danger' : 'warning'}
                >
                  {saving ? '처리 중...' : confirmModal === 'reset' ? '초기화' : '탈퇴'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="settings-toast"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🆕 v85.5: 필드 편집 bottom-sheet */}
      <EditNicknameSheet
        open={editingNick}
        current={profile?.nickname || ''}
        saving={saving}
        onClose={() => setEditingNick(false)}
        onSave={async (nickname) => {
          setNickInput(nickname);
          await updateProfile({ nickname });
        }}
      />
      <EditGenderSheet
        open={editingGender}
        current={profile?.onboarding_situation || 'other'}
        saving={saving}
        onClose={() => setEditingGender(false)}
        onSave={async (gender) => {
          setGenderInput(gender);
          await updateProfile({ onboarding_situation: gender });
        }}
      />
    </div>
    </>
  );
}
