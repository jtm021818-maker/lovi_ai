'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { XRayMessage } from '@/app/api/xray/analyze/route';

interface XRayHeatmapProps {
  imageBase64: string;
  messages: XRayMessage[];
}

const COLOR_MAP: Record<string, string> = {
  red: 'rgba(239,68,68,0.35)',
  blue: 'rgba(59,130,246,0.35)',
  yellow: 'rgba(234,179,8,0.30)',
  green: 'rgba(34,197,94,0.25)',
};

const POSITION_MAP: Record<string, string> = {
  top: '5%',
  middle: '38%',
  bottom: '68%',
};

const COLOR_LABELS: Record<string, string> = {
  red: '갈등/분노',
  blue: '소원함/무관심',
  yellow: '경계/방어',
  green: '긍정/애정',
};

export default function XRayHeatmap({ imageBase64, messages }: XRayHeatmapProps) {
  const [selected, setSelected] = useState<XRayMessage | null>(null);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
      {/* 원본 캡처 이미지 */}
      <img
        src={imageBase64}
        alt="카톡 캡처"
        className="w-full h-auto"
        draggable={false}
      />

      {/* 히트맵 오버레이 */}
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
          onClick={() => setSelected(selected?.text === msg.text ? null : msg)}
          className="absolute cursor-pointer transition-all hover:brightness-110"
          style={{
            top: POSITION_MAP[msg.position] || '38%',
            left: msg.sender === 'other' ? '5%' : '40%',
            right: msg.sender === 'other' ? '40%' : '5%',
            height: '28%',
            backgroundColor: COLOR_MAP[msg.color] || COLOR_MAP.yellow,
            borderRadius: '12px',
            border: `2px solid ${COLOR_MAP[msg.color]?.replace('0.35', '0.6').replace('0.30', '0.6').replace('0.25', '0.6') || 'rgba(234,179,8,0.6)'}`,
          }}
        />
      ))}

      {/* 범례 */}
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 flex gap-3 text-[10px]">
        {Object.entries(COLOR_LABELS).map(([color, label]) => (
          <div key={color} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_MAP[color] }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* 선택된 메시지 상세 팝업 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg rounded-t-2xl p-4 shadow-2xl border-t border-pink-100"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-pink-500">
                {selected.sender === 'me' ? '내 메시지' : '상대 메시지'}
              </span>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">✕</button>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-2">"{selected.text}"</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>😶 겉감정: <span className="font-medium text-gray-800">{selected.surfaceEmotion}</span></p>
              <p>💜 속마음: <span className="font-medium text-purple-700">{selected.deepEmotion}</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
