'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LoungeDialogue } from '@/engines/lounge/dialogue-engine';

interface CharacterDialogueProps {
  dialogue: LoungeDialogue;
  onTap: () => void;
}

export default function CharacterDialogue({ dialogue, onTap }: CharacterDialogueProps) {
  const [tapped, setTapped] = useState(false);

  function handleTap() {
    setTapped(true);
    onTap();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/40 cursor-pointer"
      onClick={handleTap}
    >
      <AnimatePresence mode="wait">
        {!tapped ? (
          <motion.div
            key="dialogue"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {/* 대화 말풍선 미리보기 */}
            <p className="text-[10px] text-gray-400 text-center mb-2">루나와 타로냥이 이야기 중...</p>
            {dialogue.lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: line.speaker === 'luna' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 * i }}
                className={`flex ${line.speaker === 'luna' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[75%] ${
                    line.speaker === 'luna'
                      ? 'bg-orange-50 rounded-tl-sm'
                      : 'bg-purple-50 rounded-tr-sm'
                  }`}
                >
                  <span className="text-[10px] font-bold block mb-0.5" style={{ color: line.speaker === 'luna' ? '#ea580c' : '#7c3aed' }}>
                    {line.speaker === 'luna' ? '루나' : '타로냥'}
                  </span>
                  <span className="text-[12px] text-gray-700">{line.text}</span>
                </div>
              </motion.div>
            ))}
            <p className="text-[10px] text-center text-purple-400 mt-2 animate-pulse">탭해서 인사하기</p>
          </motion.div>
        ) : (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-[13px] text-gray-700 text-center leading-relaxed">
              {dialogue.onTapMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
