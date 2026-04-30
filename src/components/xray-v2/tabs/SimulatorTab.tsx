'use client';

import { motion } from 'framer-motion';
import { XV2 } from '@/styles/xray-v2-tokens';
import GlassCard from '../parts/GlassCard';

interface Props {
  onLaunch: () => void;
  isPremium: boolean;
}

/**
 * 시뮬레이터 탭 — 기존 /xray/simulate 진입 wrapper.
 * Plan: docs/xray-v2-pro-plan.md §5.4 Tab 5
 */
export default function SimulatorTab({ onLaunch, isPremium }: Props) {
  return (
    <div className="space-y-4">
      <GlassCard
        glow="cyan"
        pad="lg"
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
        }}
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center mb-4 rounded-full"
            style={{
              width: 72,
              height: 72,
              background: `${XV2.cyan}22`,
              border: `1px solid ${XV2.cyan}66`,
              boxShadow: XV2.glow,
              fontSize: 32,
            }}
          >
            🎭
          </div>
          <h2
            className="text-[18px] font-extrabold mb-2"
            style={{ color: XV2.text }}
          >
            연습 시뮬레이터
          </h2>
          <p
            className="text-[13px] leading-relaxed mb-5"
            style={{ color: XV2.textDim }}
          >
            루나가 상대방 역할로 응답해줘.
            <br />
            추천한 답장을 직접 보내보고
            <br />
            상대 반응을 미리 체험해보자.
          </p>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onLaunch}
            disabled={!isPremium}
            className="w-full py-3.5 rounded-2xl text-[14px] font-extrabold transition-all"
            style={{
              background: isPremium
                ? `linear-gradient(135deg, ${XV2.cyan}, ${XV2.purple})`
                : XV2.surface2,
              color: isPremium ? XV2.bg : XV2.textMute,
              boxShadow: isPremium ? XV2.glow : 'none',
              cursor: isPremium ? 'pointer' : 'not-allowed',
              opacity: isPremium ? 1 : 0.6,
            }}
          >
            {isPremium ? '시뮬레이터 시작하기' : '프리미엄 전용 기능'}
          </motion.button>

          {!isPremium && (
            <a
              href="/subscription"
              className="inline-block mt-3 text-[12px] underline"
              style={{ color: XV2.cyan }}
            >
              프리미엄 알아보기 →
            </a>
          )}
        </div>
      </GlassCard>

      {/* 가이드 */}
      <GlassCard
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.2, duration: 0.5 },
        }}
      >
        <h3
          className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono }}
        >
          작동 방식
        </h3>
        <ol className="space-y-3 text-[12.5px]" style={{ color: XV2.textDim }}>
          <Step n={1} text="추천 답장 4가지 중 하나를 골라 보내거나, 직접 적어 보내" />
          <Step n={2} text="루나가 상대방의 톤·맥락을 이어받아 자연스럽게 답해" />
          <Step n={3} text="대화가 진행될수록 화해 가능성이 실시간으로 변해" />
          <Step n={4} text="언제든 멈추고 본 분석으로 돌아올 수 있어" />
        </ol>
      </GlassCard>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="shrink-0 inline-flex items-center justify-center rounded-full"
        style={{
          width: 20,
          height: 20,
          background: `${XV2.cyan}22`,
          border: `1px solid ${XV2.cyan}55`,
          color: XV2.cyan,
          fontFamily: XV2.fontMono,
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <span style={{ color: XV2.text }}>{text}</span>
    </li>
  );
}
