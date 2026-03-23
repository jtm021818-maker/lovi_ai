'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar,
} from 'recharts';

interface AnalysisData {
  emotionTrend: { date: string; score: number }[];
  distortions: { name: string; value: number; color: string }[];
  attachment: { axis: string; value: number }[];
  emotionalBank: { deposits: number; withdrawals: number; balance: number; ratio: number };
  strategyFrequency: { name: string; count: number; color: string }[];
}

const STRATEGY_LABELS: Record<string, string> = {
  SUPPORT: '공감/지지',
  CBT: '인지 재구성',
  ACT: '가치 탐색',
  CALMING: '진정',
  MI: '동기 부여',
};

function cardAnim(i: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut' as const, delay: i * 0.1 },
  };
}

function EmotionGauge({ ratio }: { ratio: number }) {
  const max = 8;
  const pct = Math.min(ratio / max, 1);
  const angle = pct * 180 - 90; // -90 to 90 deg arc
  const r = 52;
  const cx = 70;
  const cy = 66;

  function polarToCartesian(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad - Math.PI / 2),
      y: cy + r * Math.sin(rad - Math.PI / 2),
    };
  }

  const start = polarToCartesian(-90);
  const end = polarToCartesian(90);
  const needleEnd = polarToCartesian(angle);

  const safeAngle = (5 / max) * 180 - 90;
  const safePoint = polarToCartesian(safeAngle);

  return (
    <svg viewBox="0 0 140 80" className="w-full max-w-[180px] mx-auto">
      {/* background arc */}
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none" stroke="#fce7f3" strokeWidth="10" strokeLinecap="round"
      />
      {/* fill arc */}
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${needleEnd.x} ${needleEnd.y}`}
        fill="none"
        stroke={ratio >= 5 ? '#86efac' : ratio >= 3 ? '#fbbf24' : '#f472b6'}
        strokeWidth="10" strokeLinecap="round"
      />
      {/* 5:1 marker */}
      <circle cx={safePoint.x} cy={safePoint.y} r="4" fill="#22c55e" opacity="0.8" />
      {/* needle */}
      <line
        x1={cx} y1={cy}
        x2={needleEnd.x} y2={needleEnd.y}
        stroke="#374151" strokeWidth="2" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="4" fill="#374151" />
      {/* label */}
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
        {ratio.toFixed(1)}:1
      </text>
    </svg>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analysis')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">인사이트</h1>
        <p className="text-sm text-gray-400 mt-1">나의 감정 패턴과 성장 기록</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-pink-300 border-t-transparent"
            />
          </div>
        )}

        {!loading && data && (
          <>
            {/* 감정 추이 */}
            <motion.div
              {...cardAnim(0)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💝</span>
                <h2 className="text-base font-semibold text-gray-700">감정 추이</h2>
                <span className="ml-auto text-xs text-gray-400">최근 30일</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.emotionTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f472b6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#d1d5db' }} interval={6} axisLine={false} tickLine={false} />
                  <YAxis domain={[-3, 3]} tick={{ fontSize: 10, fill: '#d1d5db' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area
                    type="monotone" dataKey="score" stroke="#f472b6" strokeWidth={2}
                    fill="url(#emotionGrad)" dot={false} activeDot={{ r: 4, fill: '#f472b6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* 인지 왜곡 + 애착 유형 */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                {...cardAnim(1)}
                className="bg-white rounded-3xl p-4 shadow-sm border border-purple-100"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-base">🧠</span>
                  <h2 className="text-sm font-semibold text-gray-700">사고 패턴</h2>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={data.distortions} cx="50%" cy="50%"
                      innerRadius={34} outerRadius={52}
                      paddingAngle={3} dataKey="value"
                    >
                      {data.distortions.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #f3e8ff', borderRadius: 10, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-1">
                  {data.distortions.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                {...cardAnim(2)}
                className="bg-white rounded-3xl p-4 shadow-sm border border-blue-100"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🤝</span>
                  <h2 className="text-sm font-semibold text-gray-700">애착 프로필</h2>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <RadarChart data={data.attachment} cx="50%" cy="52%">
                    <PolarGrid stroke="#e9d5ff" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="나" dataKey="value"
                      stroke="#c084fc" fill="#c084fc" fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* 정서적 통장 */}
            <motion.div
              {...cardAnim(3)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-green-100"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏦</span>
                <h2 className="text-base font-semibold text-gray-700">정서적 통장</h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <EmotionGauge ratio={data.emotionalBank.ratio} />
                  <p className="text-center text-[11px] text-gray-400 mt-1">5:1 기준선 <span className="text-green-400">●</span></p>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1">긍정 상호작용</p>
                    <div className="h-2 rounded-full bg-pink-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.emotionalBank.deposits / 90) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400"
                      />
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">{data.emotionalBank.deposits}회</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1">부정 상호작용</p>
                    <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.emotionalBank.withdrawals / 90) * 100}%` }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"
                      />
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">{data.emotionalBank.withdrawals}회</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 전략 사용 빈도 */}
            <motion.div
              {...cardAnim(4)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-pink-100"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🎯</span>
                <h2 className="text-base font-semibold text-gray-700">상담 전략</h2>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={data.strategyFrequency.map((s) => ({ ...s, name: STRATEGY_LABELS[s.name] ?? s.name }))}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#d1d5db' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={64} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.strategyFrequency.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {!loading && !data && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-500 mb-2">상담을 더 진행하면</p>
            <p className="text-gray-500">감정 변화와 패턴을 분석해 드릴게요</p>
          </div>
        )}
      </div>

    </div>
  );
}
