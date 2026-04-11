'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🆕 v41: 친밀도 레벨업 축하 팝업
 *
 * 레벨 전환 시 전체 화면 오버레이로 등장.
 * - 카드 등장 spring 애니메이션
 * - 파티클 이모지 burst
 * - 자동 닫힘 (5초 후) + 수동 닫기 버튼
 */

interface IntimacyLevelUpProps {
  oldLevel: number;
  newLevel: number;
  newLevelName: string;
  onDismiss: () => void;
}

// 레벨별 이모지/메시지 매핑
const LEVEL_INFO: Record<number, { emoji: string; label: string; message: string; gradient: string }> = {
  2: {
    emoji: '🌸',
    label: '꽃봉오리',
    message: '이제 속감정도 같이 나눌 수 있는 사이가 됐어',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fdf4ff 100%)',
  },
  3: {
    emoji: '🌺',
    label: '개화',
    message: '같이 고민 나누는 사이! 이제 좀 더 솔직해질게 ☺️',
    gradient: 'linear-gradient(135deg, #ffe4e6 0%, #ede9fe 100%)',
  },
  4: {
    emoji: '🌹',
    label: '만개',
    message: '진심으로 걱정하는 사이야. 나도 마음 열게 💜',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fef3c7 100%)',
  },
  5: {
    emoji: '💎',
    label: '영원',
    message: '완전히 아는 사이가 됐어. 서로 거짓 없이 진심으로',
    gradient: 'linear-gradient(135deg, #e0e7ff 0%, #fdf4ff 100%)',
  },
};

export default function IntimacyLevelUp({
  newLevel,
  newLevelName,
  onDismiss,
}: IntimacyLevelUpProps) {
  // 5초 후 자동 닫힘
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const info = LEVEL_INFO[newLevel] ?? {
    emoji: '✨',
    label: newLevelName,
    message: '더 가까워졌어',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fdf4ff 100%)',
  };

  // 파티클 이모지
  const particles = ['✨', '🌸', '💜', '🦊', '⭐', '💫'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          cursor: 'pointer',
        }}
      >
        {/* 파티클 burst */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {particles.map((emoji, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.2, 0.8],
                x: Math.cos((i / particles.length) * Math.PI * 2) * 160,
                y: Math.sin((i / particles.length) * Math.PI * 2) * 160,
              }}
              transition={{ duration: 1.6, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                fontSize: 26,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>

        {/* 메인 카드 */}
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.6, y: 30, opacity: 0 }}
          animate={{ scale: [0.6, 1.05, 1], y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          style={{
            background: info.gradient,
            borderRadius: 28,
            padding: '32px 26px',
            maxWidth: 320,
            width: '85%',
            textAlign: 'center',
            border: '2px solid rgba(168, 85, 247, 0.25)',
            boxShadow: '0 20px 60px rgba(168, 85, 247, 0.35)',
            cursor: 'default',
          }}
        >
          {/* 반짝이 라인 */}
          <div style={{ fontSize: 22, color: '#a855f7', marginBottom: 8 }}>✨✨✨</div>

          {/* 타이틀 */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#9333ea',
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            친밀도 레벨 UP!
          </div>

          {/* 레벨 전환 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 12 }}
            style={{
              fontSize: 38,
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <span style={{ opacity: 0.5, fontSize: 24 }}>Lv.{newLevel - 1}</span>
            <span style={{ color: '#a855f7', fontSize: 20 }}>→</span>
            <span>{info.emoji}</span>
            <span style={{ color: '#9333ea', fontSize: 24, fontWeight: 700 }}>Lv.{newLevel}</span>
          </motion.div>

          {/* 레벨 이름 */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#6b21a8',
              marginBottom: 12,
            }}
          >
            {info.label}
          </div>

          {/* 메시지 */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: 13,
              color: '#6b21a8',
              lineHeight: 1.6,
              padding: '12px 8px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 14,
              marginBottom: 18,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{info.message}&rdquo;
          </motion.div>

          {/* 닫기 버튼 */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '10px 22px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)',
              width: '100%',
            }}
          >
            고마워 루나! 💜
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
