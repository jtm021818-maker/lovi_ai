'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface CharacterSceneProps {
  persona: 'luna' | 'tarot';
  greeting: string;
  onTap?: () => void;
}

export default function CharacterScene({ persona, greeting, onTap }: CharacterSceneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-col items-center"
      onClick={onTap}
    >
      {/* 캐릭터 2명 배치 */}
      <div className="flex items-end gap-4 mb-3">
        {/* 루나 */}
        <motion.div
          className="relative"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={`relative ${persona === 'luna' ? 'w-24 h-24' : 'w-16 h-16 opacity-70'}`}>
            <Image
              src="/luna_fox_transparent.png"
              fill
              sizes={persona === 'luna' ? '96px' : '64px'}
              alt="루나"
              className="object-contain drop-shadow-md"
            />
          </div>
          {persona === 'luna' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/90 rounded-full px-2 py-0.5">
              <span className="text-[9px] font-bold text-orange-600">루나</span>
            </div>
          )}
        </motion.div>

        {/* 타로냥 */}
        <motion.div
          className="relative"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <div className={`relative ${persona === 'tarot' ? 'w-24 h-24' : 'w-16 h-16 opacity-70'}`}>
            <Image
              src="/char_img/taronaang_xray.png"
              fill
              sizes={persona === 'tarot' ? '96px' : '64px'}
              alt="타로냥"
              className="object-contain drop-shadow-md"
            />
          </div>
          {persona === 'tarot' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/90 rounded-full px-2 py-0.5">
              <span className="text-[9px] font-bold text-purple-600">타로냥</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* 인사 말풍선 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm max-w-[280px]"
        style={{ border: '1px solid rgba(255,255,255,0.6)' }}
      >
        <p className="text-[13px] text-gray-700 text-center leading-relaxed">
          {greeting}
        </p>
      </motion.div>
    </motion.div>
  );
}
