'use client';

/**
 * 🆕 v42: 카톡 배너 스타일 인앱 알림 토스트
 *
 * 다른 페이지에서도 상단에 슬라이드다운 → 4초 후 사라짐
 * 탭하면 라운지로 이동
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLoungeStore } from '@/lib/stores/lounge-store';

export default function LoungeToast() {
  const router = useRouter();
  const toast = useLoungeStore(s => s.pendingToast);
  const dismiss = useLoungeStore(s => s.dismissToast);
  const clearUnread = useLoungeStore(s => s.clearUnread);

  const handleTap = () => {
    dismiss();
    clearUnread();
    router.push('/lounge');
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          onClick={handleTap}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 8px) + 8px)',
            left: '12px',
            right: '12px',
            zIndex: 9999,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid rgba(255,255,255,0.8)',
            }}
          >
            {/* 아바타 */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: toast.speaker === 'luna'
                  ? 'linear-gradient(135deg, #fce7f3, #f9a8d4)'
                  : 'linear-gradient(135deg, #e0e7ff, #a5b4fc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              {toast.speaker === 'luna' ? '🦊' : '🐱'}
            </div>

            {/* 텍스트 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: toast.speaker === 'luna' ? '#be185d' : '#4338ca',
                  }}
                >
                  {toast.speaker === 'luna' ? '루나' : '타로냥'}
                </span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                  라운지
                </span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#374151',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {toast.text}
              </p>
            </div>

            {/* 시간 */}
            <span
              style={{
                fontSize: '10px',
                color: '#9ca3af',
                flexShrink: 0,
                alignSelf: 'flex-start',
                marginTop: '2px',
              }}
            >
              {toast.timestamp}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
