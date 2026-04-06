'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import PremiumBadge from '@/components/common/PremiumBadge';

// ============================================================
// Types
// ============================================================

interface Summary {
  totalSessions: number;
  totalMessages: number;
  avgEmotionScore: number;
  prevAvgEmotionScore: number;
  emotionDirection: 'up' | 'down' | 'stable';
  topDistortion: string | null;
  topDistortionCount: number;
  dominantAttachment: string;
  streakDays: number;
  lastSessionDate: string;
}

interface LunaMessages {
  greeting: string;
  emotionInsight: string;
  patternInsight: string;
  growthInsight: string;
  weeklyTip: string;
}

interface AnalysisData {
  emotionTrend: { date: string; score: number }[];
  distortions: { name: string; value: number; color: string }[];
  attachment: { axis: string; value: number }[];
  emotionalBank: { deposits: number; withdrawals: number; balance: number; ratio: number };
  strategyFrequency: { name: string; count: number; color: string }[];
  summary: Summary;
  lunaMessages: LunaMessages;
  isPremium: boolean;
}

// ============================================================
// Helpers
// ============================================================

const STRATEGY_LABELS: Record<string, string> = {
  SUPPORT: '공감/지지',
  CBT: '인지 재구성',
  ACT: '가치 탐색',
  CALMING: '진정',
  MI: '동기 부여',
};

function getEmotionEmoji(score: number): string {
  if (score >= 2) return '😊';
  if (score >= 1) return '🙂';
  if (score >= 0) return '😐';
  if (score >= -1) return '😕';
  return '😢';
}

function getDirectionText(dir: 'up' | 'down' | 'stable', diff: number): string {
  const abs = Math.abs(diff).toFixed(1);
  if (dir === 'up') return `지난달 대비 +${abs} 올랐어!`;
  if (dir === 'down') return `지난달 대비 ${abs} 내려갔어`;
  return '지난달과 비슷한 수준이야';
}

function cardAnim(i: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: 'easeOut' as const, delay: i * 0.08 },
  };
}

// ============================================================
// Gauge Component
// ============================================================

function EmotionGauge({ ratio }: { ratio: number }) {
  const max = 8;
  const pct = Math.min(ratio / max, 1);
  const angle = pct * 180 - 90;
  const r = 56;
  const cx = 75;
  const cy = 70;

  function polar(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad - Math.PI / 2), y: cy + r * Math.sin(rad - Math.PI / 2) };
  }

  const start = polar(-90);
  const end = polar(90);
  const needle = polar(angle);
  const safe = polar((5 / max) * 180 - 90);

  return (
    <svg viewBox="0 0 150 90" className="w-full max-w-[200px] mx-auto">
      <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none" stroke="#f3e8ff" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${needle.x} ${needle.y}`}
        fill="none"
        stroke={ratio >= 5 ? '#86efac' : ratio >= 3 ? '#fbbf24' : '#f9a8d4'}
        strokeWidth="12" strokeLinecap="round" />
      <circle cx={safe.x} cy={safe.y} r="5" fill="#22c55e" opacity="0.7" />
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#6b7280" />
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="13" fontWeight="600" fill="#374151">
        {ratio.toFixed(1)}:1
      </text>
    </svg>
  );
}

// ============================================================
// Page
// ============================================================

export default function InsightsPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    fetch('/api/analysis')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-transparent"
        />
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-5">
          <span className="text-3xl">🦊</span>
        </div>
        <p className="text-gray-600 font-medium mb-2">아직 데이터가 부족해</p>
        <p className="text-gray-400 text-sm">상담을 3회 이상 진행하면<br/>나의 감정 패턴을 분석해줄게!</p>
      </div>
    );
  }

  const { summary: s, lunaMessages: luna, emotionTrend, distortions, emotionalBank, strategyFrequency, isPremium } = data;
  const scoreDiff = s.avgEmotionScore - s.prevAvgEmotionScore;

  // 가장 많이 쓴 전략 상위 2개
  const topStrategies = strategyFrequency
    .slice(0, 2)
    .map(sf => STRATEGY_LABELS[sf.name] ?? sf.name);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── Section 1: 루나 인사 카드 ── */}
        <motion.div
          {...cardAnim(0)}
          className="mx-4 mt-6 rounded-3xl bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400 p-6 text-white shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🦊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold leading-snug">{luna.greeting}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                  상담 {s.totalSessions}회
                </span>
                {s.streakDays > 0 && (
                  <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                    {s.streakDays}일 연속
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                  메시지 {s.totalMessages}개
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section 2: 감정 온도계 ── */}
        <motion.div
          {...cardAnim(1)}
          className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm border border-pink-100"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💝</span>
            <h2 className="text-base font-semibold text-gray-700">감정 온도</h2>
            <span className="ml-auto text-xs text-gray-400">최근 30일</span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="text-center">
              <div className="text-4xl">{getEmotionEmoji(s.avgEmotionScore)}</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {s.avgEmotionScore > 0 ? '+' : ''}{s.avgEmotionScore.toFixed(1)}
              </div>
              <div className={`text-xs font-medium mt-0.5 ${
                s.emotionDirection === 'up' ? 'text-green-500' :
                s.emotionDirection === 'down' ? 'text-pink-500' : 'text-gray-400'
              }`}>
                {s.emotionDirection === 'up' ? '↑' : s.emotionDirection === 'down' ? '↓' : '→'}
                {' '}{getDirectionText(s.emotionDirection, scoreDiff)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={50}>
                <AreaChart data={emotionTrend} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={1.5}
                    fill="url(#sparkGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 px-3 py-2.5 rounded-2xl bg-purple-50">
            <p className="text-sm text-purple-700">🦊 {luna.emotionInsight}</p>
          </div>
        </motion.div>

        {/* ── Section 3: 사고 패턴 (프리미엄) ── */}
        {distortions.length > 0 && (isPremium ? (
          <motion.div
            {...cardAnim(2)}
            className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm border border-purple-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧠</span>
              <h2 className="text-base font-semibold text-gray-700">나의 사고 패턴</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distortions} cx="50%" cy="50%"
                      innerRadius={28} outerRadius={44}
                      paddingAngle={3} dataKey="value"
                    >
                      {distortions.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 min-w-0">
                {s.topDistortion && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-400">가장 많이 나타난 패턴</span>
                    <p className="text-lg font-bold text-gray-800">{s.topDistortion}</p>
                    <p className="text-xs text-gray-400">{s.topDistortionCount}회 감지</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {distortions.map((d, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-[10px] text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 px-3 py-2.5 rounded-2xl bg-purple-50">
              <p className="text-sm text-purple-700">🦊 {luna.patternInsight}</p>
            </div>
          </motion.div>
        ) : (
          <div className="mx-4 mt-4">
            <PremiumBadge overlay label="사고 패턴">
              <div className="rounded-3xl bg-white p-5 border border-purple-100 h-[200px]" />
            </PremiumBadge>
          </div>
        ))}

        {/* ── Section 4: 관계 건강도 (프리미엄) ── */}
        {isPremium ? (
        <motion.div
          {...cardAnim(3)}
          className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-sm border border-green-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏦</span>
            <h2 className="text-base font-semibold text-gray-700">관계 건강도</h2>
          </div>

          <EmotionGauge ratio={emotionalBank.ratio} />

          <div className="flex justify-center gap-8 mt-2">
            <div className="text-center">
              <p className="text-2xl">💝</p>
              <p className="text-lg font-bold text-gray-800">{emotionalBank.deposits}</p>
              <p className="text-[10px] text-gray-400">긍정</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">💔</p>
              <p className="text-lg font-bold text-gray-800">{emotionalBank.withdrawals}</p>
              <p className="text-[10px] text-gray-400">부정</p>
            </div>
          </div>

          <div className="mt-3 px-3 py-2.5 rounded-2xl bg-green-50">
            <p className="text-sm text-green-700">🦊 {luna.growthInsight}</p>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-2">
            가트맨 박사 5:1 기준선 <span className="text-green-400">●</span>
          </p>
        </motion.div>
        ) : (
          <div className="mx-4 mt-4">
            <PremiumBadge overlay label="관계 건강도">
              <div className="rounded-3xl bg-white p-5 border border-green-100 h-[240px]" />
            </PremiumBadge>
          </div>
        )}

        {/* ── Section 5: 이번 주 미션 (프리미엄) ── */}
        {isPremium ? (
        <motion.div
          {...cardAnim(4)}
          className="mx-4 mt-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm border border-amber-200 cursor-pointer"
          onClick={() => setTipOpen(!tipOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-base font-semibold text-amber-800">이번 주 미션</h2>
            <motion.span
              animate={{ rotate: tipOpen ? 180 : 0 }}
              className="ml-auto text-amber-400 text-sm"
            >
              ▼
            </motion.span>
          </div>
          <p className="text-sm text-amber-700 mt-2 font-medium">{luna.weeklyTip}</p>
          <AnimatePresence>
            {tipOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs text-amber-600">
                    🦊 작은 행동 하나가 큰 변화를 만들어. 오늘 한 번만 시도해봐!
                    완벽하지 않아도 괜찮아, 시도하는 것 자체가 성장이야.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        ) : (
          <div className="mx-4 mt-4">
            <PremiumBadge overlay label="이번 주 미션">
              <div className="rounded-3xl bg-amber-50 p-5 border border-amber-200 h-[100px]" />
            </PremiumBadge>
          </div>
        )}

        {/* ── Section 6: 나의 성장 기록 (프리미엄) ── */}
        {isPremium ? (
        <motion.div
          {...cardAnim(5)}
          className="mx-4 mt-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-lg">📈</span>
            <h2 className="text-base font-semibold text-gray-700">나의 성장 기록</h2>
          </div>

          {/* 스탯 미니카드 3개 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm border border-pink-100 text-center">
              <p className="text-2xl font-bold text-pink-500">{s.totalSessions}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">총 상담</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm border border-purple-100 text-center">
              <p className="text-2xl font-bold text-purple-500">{s.streakDays}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">연속 일수</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm border border-blue-100 text-center">
              <p className="text-2xl font-bold text-blue-500">{s.totalMessages}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">총 메시지</p>
            </div>
          </div>

          {/* 애착 유형 + 전략 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🤝</span>
              <span className="text-sm text-gray-600">
                애착 유형: <span className="font-semibold text-gray-800">{s.dominantAttachment}</span>
              </span>
            </div>
            {topStrategies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <span className="text-sm text-gray-600">
                  주요 상담 전략: <span className="font-semibold text-gray-800">{topStrategies.join(', ')}</span>
                </span>
              </div>
            )}
          </div>
        </motion.div>
        ) : (
          <div className="mx-4 mt-4 mb-4">
            <PremiumBadge overlay label="성장 기록">
              <div className="rounded-2xl bg-white p-5 border border-gray-100 h-[160px]" />
            </PremiumBadge>
          </div>
        )}

      </div>
    </div>
  );
}
