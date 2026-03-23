'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTLINES = [
  { name: '자살예방상담전화', number: '1393', desc: '24시간 운영', color: 'bg-red-500' },
  { name: '정신건강위기상담전화', number: '1577-0199', desc: '24시간 운영', color: 'bg-blue-500' },
  { name: '생명의전화', number: '1588-9191', desc: '24시간 운영', color: 'bg-green-500' },
];

export default function CrisisModal({ isOpen, onClose }: CrisisModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💙</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                혼자가 아니에요
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                지금 많이 힘드시죠.<br />
                전문 상담사와 이야기하면 도움이 될 수 있어요.
              </p>
            </div>

            <div className="space-y-3">
              {HOTLINES.map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full ${h.color} flex items-center justify-center`}>
                    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{h.name}</p>
                    <p className="text-xs text-gray-400">{h.desc}</p>
                  </div>
                  <span className="text-pink-500 font-bold text-sm">{h.number}</span>
                </a>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              괜찮아요, 대화 계속할래요
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
