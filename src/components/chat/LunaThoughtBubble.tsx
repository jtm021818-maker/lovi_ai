'use client';

import { motion } from 'framer-motion';

interface LunaThoughtBubbleProps {
  thought: string;
}

export default function LunaThoughtBubble({ thought }: LunaThoughtBubbleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '4px' }}>
      {/* Luna avatar */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0,
          alignSelf: 'flex-end',
          marginBottom: '12px',
        }}
      >
        🌙
      </div>

      {/* Bubble + trail column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}>
        {/* Thought bubble */}
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          exit={{ opacity: 0, y: 4, scale: 0.92, transition: { duration: 0.2, ease: 'easeIn' } }}
          style={{ maxWidth: '220px' }}
        >
          {/* Gentle pulse wrapper */}
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'rgba(192,132,252,0.08)',
              border: '1.5px dashed rgba(192,132,252,0.5)',
              borderRadius: '14px 14px 14px 4px',
              padding: '8px 12px 10px 12px',
              maxWidth: '220px',
            }}
          >
            {/* Label */}
            <div
              style={{
                fontSize: '9px',
                color: 'rgba(167,107,220,0.65)',
                letterSpacing: '0.04em',
                marginBottom: '4px',
                fontWeight: 500,
              }}
            >
              루나의 생각...
            </div>

            {/* Thought text */}
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                fontStyle: 'italic',
                color: 'rgba(167,107,220,0.9)',
                lineHeight: '1.5',
                wordBreak: 'keep-all',
              }}
            >
              {thought}
            </p>
          </motion.div>
        </motion.div>

        {/* Thought trail dots — ascending left to right, below bubble */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', marginTop: '3px', paddingLeft: '10px' }}>
          {[
            { size: 4, delay: 0 },
            { size: 5.5, delay: 0.15 },
            { size: 7, delay: 0.3 },
          ].map(({ size, delay }, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay }}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: 'rgba(192,132,252,0.4)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
