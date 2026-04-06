'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-end px-6 pb-14 overflow-hidden bg-[#fadcd6]">
      {/* 
        [전체 화면 통이미지 영역]
        대표님이 쓰실 통이미지 1장(캐릭터 포함)을 여기에 넣으시면 됩니다.
      */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Image
          src="/stitch_luna_landing.png" // 👈 쓰실 통이미지 경로
          alt="Luna AI Coach"
          fill
          className="object-cover object-center"
          quality={100}
          unoptimized={true}
          priority
        />
        {/* 하단 UI 버튼 가독성 확보 및 원본 그림과의 이질감을 줄이기 위한 가장 자연스러운 부드러운 그라데이션 */}
        <div className="absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-[#fadcd6] via-[#fadcd6]/60 to-transparent pointer-events-none" />
      </div>

      {/* 
        [인터랙션 CTA 버튼 영역] 
        이미지 위 같은 위치에 오버레이 됩니다.
      */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] z-10 space-y-4 mb-2 relative"
      >
        <Link href="/login" className="block">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-[18px] rounded-full bg-[#fffcf8] text-[#d17a7a] font-bold text-[17px] shadow-[0_8px_20px_rgba(209,122,122,0.15)] hover:shadow-[0_12px_25px_rgba(209,122,122,0.2)] transition-all border border-white/80"
          >
            기존 계정으로 로그인
          </motion.button>
        </Link>

        <Link href="/signup" className="block">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-[18px] rounded-full bg-gradient-to-r from-[#f99b82] to-[#ef8670] text-white font-bold text-[17px] shadow-[0_10px_25px_rgba(244,138,117,0.4)] hover:shadow-[0_14px_30px_rgba(244,138,117,0.5)] transition-all overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/25 translate-x-[-150%] skew-x-[-15deg] transition-all duration-700 ease-out group-hover:translate-x-[150%]" />
            <span className="relative z-10 tracking-wide">새로 시작하기 (회원가입)</span>
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
