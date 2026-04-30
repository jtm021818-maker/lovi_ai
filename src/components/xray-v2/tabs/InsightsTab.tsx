'use client';

import { motion } from 'framer-motion';
import { XV2, RELATIONSHIP_STAGE_LABELS } from '@/styles/xray-v2-tokens';
import GlassCard from '../parts/GlassCard';
import ReplyToneCard from '../parts/ReplyToneCard';
import type { XRayResultV2, FlagItem } from '@/lib/xray/types-v2';

interface Props {
  result: XRayResultV2;
  onSimulate?: () => void;
  isPremium?: boolean;
}

export default function InsightsTab({ result, onSimulate, isPremium }: Props) {
  const stageMeta = RELATIONSHIP_STAGE_LABELS[result.relationshipStage.stage];
  const stageColor = (XV2 as unknown as Record<string, string>)[stageMeta.tone] ?? XV2.cyan;

  return (
    <div className="space-y-4">
      {/* 1. 관계 단계 배지 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          background: XV2.glassBg,
          backdropFilter: XV2.glassBlur,
          WebkitBackdropFilter: XV2.glassBlur,
          border: `1px solid ${stageColor}55`,
          boxShadow: `0 0 24px ${stageColor}22`,
        }}
      >
        <div
          className="shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            background: `${stageColor}22`,
            border: `1px solid ${stageColor}88`,
            color: stageColor,
            fontFamily: XV2.fontMono,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {result.relationshipStage.confidence}%
        </div>
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.12em]"
            style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
          >
            RELATIONSHIP STAGE
          </div>
          <div className="text-[20px] font-extrabold" style={{ color: stageColor }}>
            {stageMeta.ko}
          </div>
        </div>
      </motion.div>

      {/* 2. 진단 */}
      <GlassCard
        glow="purple"
        pad="lg"
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.1, duration: 0.5 },
        }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.12em] mb-2"
          style={{ color: XV2.purple, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.purple}55` }}
        >
          🩺 루나의 진단
        </div>
        <p
          className="text-[14.5px] leading-[1.7]"
          style={{ color: XV2.text }}
        >
          {result.diagnosis}
        </p>
      </GlassCard>

      {/* 3. 핵심 발견 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative rounded-2xl p-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${XV2.magenta}22, ${XV2.surface})`,
          border: `1px solid ${XV2.magenta}55`,
          boxShadow: XV2.glowMagenta,
        }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
          style={{ color: XV2.magenta, fontFamily: XV2.fontMono }}
        >
          ⚡ KEY INSIGHT
        </div>
        <p className="text-[15px] font-bold leading-snug" style={{ color: XV2.text }}>
          {result.keyInsight}
        </p>
      </motion.div>

      {/* 4. 레드/그린 플래그 */}
      {(result.redFlags.length > 0 || result.greenFlags.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <FlagColumn
            title="🚩 RED FLAGS"
            flags={result.redFlags}
            color={XV2.magenta}
            empty="없음"
          />
          <FlagColumn
            title="🌱 GREEN FLAGS"
            flags={result.greenFlags}
            color={XV2.green}
            empty="없음"
          />
        </div>
      )}

      {/* 5. 다음 한 걸음 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="rounded-2xl p-4"
        style={{
          background: XV2.glassBg,
          backdropFilter: XV2.glassBlur,
          WebkitBackdropFilter: XV2.glassBlur,
          border: `1.5px solid ${XV2.cyan}66`,
          boxShadow: XV2.glow,
        }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono }}
        >
          ➜ NEXT STEP
        </div>
        <p className="text-[14.5px] font-bold leading-snug" style={{ color: XV2.text }}>
          {result.nextStep}
        </p>
        <p
          className="text-[11px] mt-2"
          style={{ color: XV2.textDim }}
        >
          화해 가능성: <span style={{ color: XV2.cyan, fontFamily: XV2.fontMono, fontWeight: 700 }}>
            {result.reconciliationScore}%
          </span> · {result.reconciliationReasoning}
        </p>
      </motion.div>

      {/* 6. 답장 4톤 */}
      <div>
        <h3
          className="text-[12px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}55` }}
        >
          답장 톤 4선택
        </h3>
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {result.recommendedReplies.map((r, i) => (
            <ReplyToneCard key={r.tone} reply={r} delay={0.5 + i * 0.07} />
          ))}
        </div>
      </div>

      {/* 7. 시뮬레이터 진입 */}
      {onSimulate && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSimulate}
          disabled={!isPremium}
          className="w-full py-4 rounded-2xl text-[14px] font-extrabold transition-all"
          style={{
            background: isPremium
              ? `linear-gradient(135deg, ${XV2.cyan} 0%, ${XV2.purple} 100%)`
              : `${XV2.surface2}`,
            color: isPremium ? XV2.bg : XV2.textMute,
            boxShadow: isPremium ? XV2.glow : 'none',
            opacity: isPremium ? 1 : 0.6,
            cursor: isPremium ? 'pointer' : 'not-allowed',
          }}
        >
          🎭 {isPremium ? '연습해보기 — 내가 상대방 해줄게' : '시뮬레이터는 프리미엄 전용'}
        </motion.button>
      )}
    </div>
  );
}

function FlagColumn({
  title, flags, color, empty,
}: {
  title: string;
  flags: FlagItem[];
  color: string;
  empty: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl p-3"
      style={{
        background: XV2.glassBg,
        backdropFilter: XV2.glassBlur,
        WebkitBackdropFilter: XV2.glassBlur,
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color, fontFamily: XV2.fontMono }}
      >
        {title}
      </div>
      {flags.length === 0 ? (
        <div className="text-[11px]" style={{ color: XV2.textMute }}>
          {empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {flags.map((f, i) => (
            <li key={i} className="text-[12px]">
              <div className="flex items-start gap-1.5">
                {f.severity && (
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: 1,
                      background:
                        f.severity === 'high' ? color :
                        f.severity === 'med'  ? `${color}aa` :
                                                 `${color}55`,
                      marginTop: 6, flexShrink: 0,
                      boxShadow: `0 0 4px ${color}`,
                    }}
                  />
                )}
                <div>
                  <div className="font-bold" style={{ color: XV2.text }}>{f.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: XV2.textDim }}>{f.why}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
