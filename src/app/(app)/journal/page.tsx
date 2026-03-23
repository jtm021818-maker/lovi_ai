'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const EMOTION_OPTIONS = [
  { emoji: '😊', label: '행복' },
  { emoji: '😌', label: '평온' },
  { emoji: '🥰', label: '설렘' },
  { emoji: '😢', label: '슬픔' },
  { emoji: '😰', label: '불안' },
  { emoji: '😤', label: '분노' },
  { emoji: '😔', label: '서운' },
  { emoji: '🤔', label: '혼란' },
  { emoji: '😴', label: '지침' },
];

export default function JournalPage() {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleEmotion = (label: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emotionWords: selectedEmotions,
        content,
        gratitude,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">감정 일기</h1>
        <p className="text-sm text-gray-400 mt-1">오늘의 마음을 기록해 보세요</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-6">
        {/* 감정 선택 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">지금 느끼는 감정은?</p>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map((e) => (
              <motion.button
                key={e.label}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleEmotion(e.label)}
                className={`px-3 py-2 rounded-full text-sm border transition-all ${
                  selectedEmotions.includes(e.label)
                    ? 'bg-pink-100 border-pink-300 text-pink-600'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {e.emoji} {e.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 자유 기록 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">오늘의 이야기</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무슨 일이 있었나요? 어떤 생각이 들었나요?"
            rows={4}
            className="w-full p-4 rounded-2xl bg-white border border-pink-100 text-sm focus:outline-none focus:border-pink-300 resize-none"
          />
        </div>

        {/* 감사 일기 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">🙏 오늘 감사한 것</p>
          <textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            placeholder="아무리 작은 것이라도 괜찮아요"
            rows={2}
            className="w-full p-4 rounded-2xl bg-white border border-green-100 text-sm focus:outline-none focus:border-green-300 resize-none"
          />
        </div>

        {/* 저장 */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={selectedEmotions.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold shadow-lg disabled:opacity-40"
        >
          {saved ? '✓ 저장되었어요!' : '기록 저장하기'}
        </motion.button>
      </div>

    </div>
  );
}
