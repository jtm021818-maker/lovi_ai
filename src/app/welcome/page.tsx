'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 장식용 애니메이션 신비로운 배경 요소 (오로라 느낌) */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3], rotate: [0, 90, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-mystic-purple rounded-full mix-blend-screen filter blur-[100px] opacity-40 pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2], rotate: [0, -90, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-mystic-pink rounded-full mix-blend-screen filter blur-[120px] opacity-30 pointer-events-none" 
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10 w-full max-w-sm"
      >
        {/* 마음이 아바타 (신비로운 타로 오라 느낌) */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="relative w-32 h-32 mx-auto mb-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-mystic-glow to-mystic-purple rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative w-full h-full rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(157,78,221,0.3)]">
            <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">🔮</span>
          </div>
        </motion.div>

        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-mystic-glow to-mystic-purple mb-4 tracking-tight drop-shadow-sm">
          Love AI 마음이
        </h1>
        <p className="text-gray-300 text-base mb-14 leading-relaxed whitespace-pre-line font-medium">
          {`마음 속 깊은 곳의 연애 고민,\n우주의 기운을 담아 들어줄게요.`}
        </p>

        <div className="space-y-4 w-full px-2">
          <Link href="/signup" className="block">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-mystic-purple to-mystic-pink text-white font-bold shadow-[0_0_20px_rgba(157,78,221,0.4)] hover:shadow-[0_0_30px_rgba(255,112,166,0.6)] transition-all border border-white/20 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-15deg] group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative z-10">새로운 여정 시작하기</span>
            </motion.button>
          </Link>
          
          <Link href="/login" className="block">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-mystic-glow font-semibold hover:border-white/30 transition-all shadow-lg"
            >
              이미 계정이 있어요
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
