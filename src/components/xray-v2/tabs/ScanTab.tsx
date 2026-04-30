'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XV2, riskColor } from '@/styles/xray-v2-tokens';
import { bboxToPercent, isValidBbox } from '@/lib/xray/normalize-bbox';
import Crosshair from '../parts/Crosshair';
import type { XRayMessageV2 } from '@/lib/xray/types-v2';
/* eslint-disable @next/next/no-img-element */

interface Props {
  imageBase64: string | null;
  messages: XRayMessageV2[];
}

type Mode = 'overlay' | 'plain' | 'both';

export default function ScanTab({ imageBase64, messages }: Props) {
  const [mode, setMode] = useState<Mode>('overlay');
  const [hovered, setHovered] = useState<XRayMessageV2 | null>(null);
  const [selected, setSelected] = useState<XRayMessageV2 | null>(null);

  const validMsgs = messages.filter((m) => isValidBbox(m.bbox));
  const showOverlay = mode !== 'plain';
  const dimImage = mode === 'overlay';

  return (
    <div className="space-y-3">
      {/* 모드 토글 */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-full"
        style={{
          background: XV2.glassBg,
          border: `1px solid ${XV2.borderSoft}`,
          fontFamily: XV2.fontMono,
          fontSize: 10,
        }}
      >
        {(['overlay', 'plain', 'both'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1.5 rounded-full transition-all"
            style={{
              background: mode === m ? XV2.cyan : 'transparent',
              color: mode === m ? XV2.bg : XV2.textDim,
              fontWeight: 700,
              boxShadow: mode === m ? `0 0 12px ${XV2.cyan}` : 'none',
            }}
          >
            {m === 'overlay' ? 'OVERLAY' : m === 'plain' ? 'PLAIN' : 'BOTH'}
          </button>
        ))}
      </div>

      {/* 캡처 + 오버레이 */}
      <Crosshair>
        <div
          className="relative w-full overflow-hidden"
          style={{
            borderRadius: 16,
            border: `1px solid ${XV2.border}`,
            boxShadow: XV2.glowSoft,
            background: XV2.surface,
          }}
        >
          {imageBase64 ? (
            <img
              src={imageBase64}
              alt="카톡 캡처"
              className="w-full h-auto block"
              draggable={false}
              style={{ opacity: dimImage ? 0.7 : 1, transition: 'opacity 0.3s' }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center"
              style={{ aspectRatio: '3/4', color: XV2.textMute, fontFamily: XV2.fontMono, fontSize: 11 }}
            >
              IMAGE NOT AVAILABLE
            </div>
          )}

          {/* 노이즈 그레인 */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
            style={{
              opacity: 0.04,
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          {/* bbox 오버레이 */}
          {showOverlay &&
            validMsgs.map((m, i) => {
              const pos = bboxToPercent(m.bbox);
              const c = riskColor(m.riskLevel);
              const isHover = hovered === m;
              const isSel = selected === m;
              return (
                <motion.button
                  key={i}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: 'easeOut' }}
                  onMouseEnter={() => setHovered(m)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : m)}
                  className="absolute cursor-pointer"
                  style={{
                    ...pos,
                    border: `1.5px solid ${c}`,
                    borderRadius: 8,
                    background: isHover || isSel ? `${c}33` : `${c}18`,
                    boxShadow: isHover || isSel ? `0 0 16px ${c}, inset 0 0 12px ${c}55` : `0 0 8px ${c}66`,
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                  aria-label={`${m.sender}: ${m.text}`}
                />
              );
            })}
        </div>
      </Crosshair>

      {/* hover 메타 표시 */}
      {hovered && !selected && (
        <div
          className="text-[11px] font-mono px-3 py-2 rounded-lg"
          style={{
            background: XV2.surface,
            color: XV2.textDim,
            fontFamily: XV2.fontMono,
            border: `1px solid ${XV2.borderSoft}`,
          }}
        >
          <span style={{ color: hovered.sender === 'me' ? XV2.cyan : XV2.magenta }}>
            {hovered.sender === 'me' ? '나' : '상대'}
          </span>
          {' · '}
          <span style={{ color: XV2.text }}>{hovered.surfaceEmotion}</span>
          {' / '}
          <span style={{ color: XV2.purple }}>{hovered.deepEmotion}</span>
        </div>
      )}

      {/* 선택된 메시지 상세 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl p-4"
            style={{
              background: XV2.glassBg,
              backdropFilter: XV2.glassBlur,
              WebkitBackdropFilter: XV2.glassBlur,
              border: `1px solid ${riskColor(selected.riskLevel)}55`,
              boxShadow: `0 0 24px ${riskColor(selected.riskLevel)}22`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-bold"
                style={{
                  color: selected.sender === 'me' ? XV2.cyan : XV2.magenta,
                  fontFamily: XV2.fontMono,
                }}
              >
                {selected.sender === 'me' ? 'ME' : 'PARTNER'}
                {selected.timestamp && ` · ${selected.timestamp}`}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-[12px]"
                style={{ color: XV2.textMute }}
              >
                ✕
              </button>
            </div>
            <p
              className="text-[14px] mb-3"
              style={{ color: XV2.text }}
            >
              &ldquo;{selected.text}&rdquo;
            </p>
            <div className="space-y-1.5 text-[12px]">
              <Row label="겉감정" value={selected.surfaceEmotion} color={XV2.textDim} />
              <Row label="속마음" value={selected.deepEmotion} color={XV2.purple} />
              <Row label="의도"  value={selected.intent} color={XV2.cyan} />
              <div className="flex gap-3 pt-2 mt-1" style={{ borderTop: `1px solid ${XV2.borderSoft}` }}>
                <Mini label="강도" value={`${selected.intensity}`} />
                <Mini label="온도" value={`${selected.temperature > 0 ? '+' : ''}${selected.temperature}`} />
                <Mini label="위험" value={selected.riskLevel} color={riskColor(selected.riskLevel)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 범례 */}
      <div
        className="flex items-center gap-3 text-[10px] py-2 px-3 rounded-lg"
        style={{
          background: XV2.surface,
          border: `1px solid ${XV2.borderSoft}`,
          fontFamily: XV2.fontMono,
        }}
      >
        <Legend color={XV2.riskGreen} label="SAFE" />
        <Legend color={XV2.riskAmber} label="CAUTION" />
        <Legend color={XV2.riskRed}   label="CONFLICT" />
        <Legend color={XV2.riskBlue}  label="COLD" />
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex gap-2">
      <span
        className="shrink-0"
        style={{ color: XV2.textMute, fontFamily: XV2.fontMono, fontSize: 10, minWidth: 40 }}
      >
        {label}
      </span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span
        style={{ color: XV2.textMute, fontFamily: XV2.fontMono, fontSize: 9, letterSpacing: '0.08em' }}
      >
        {label.toUpperCase()}
      </span>
      <span style={{ color: color ?? XV2.text, fontFamily: XV2.fontMono, fontSize: 12, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <span style={{ color: XV2.textDim }}>{label}</span>
    </div>
  );
}
