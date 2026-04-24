'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type ParticleType = 'firefly' | 'petal' | 'leaf' | 'snow' | 'star' | 'none';

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

function usePts(count: number): Particle[] {
  const [pts, setPts] = useState<Particle[]>([]);
  useEffect(() => {
    setPts(Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 40,
    })));
  }, [count]);
  return pts;
}

function FireflyParticles() {
  const pts = usePts(8);
  return (
    <>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, bottom: '10%', width: p.size, height: p.size, background: '#C4B5FD', boxShadow: '0 0 8px #A78BFA' }}
          animate={{ y: [0, -60, -20, -80, 0], x: [0, p.drift, -p.drift / 2, p.drift / 3, 0], opacity: [0, 0.8, 0.4, 0.9, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

function PetalParticles() {
  const pts = usePts(10);
  return (
    <>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-70"
          style={{ left: `${p.x}%`, top: '-5%', width: p.size, height: p.size * 0.7, background: 'linear-gradient(135deg, #FCA5A5, #FBCFE8)' }}
          animate={{ y: ['0vh', '110vh'], x: [0, p.drift, -p.drift / 2, p.drift / 2], rotate: [0, 360] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function LeafParticles() {
  const pts = usePts(8);
  return (
    <>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm opacity-75"
          style={{ left: `${p.x}%`, top: '-5%', width: p.size * 1.4, height: p.size, background: 'linear-gradient(135deg, #FED7AA, #FB923C)' }}
          animate={{ y: ['0vh', '110vh'], x: [0, p.drift * 1.5, -p.drift, p.drift], rotate: [0, 180, -90, 270] }}
          transition={{ duration: p.duration * 1.3, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function SnowParticles() {
  const pts = usePts(14);
  return (
    <>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white opacity-80"
          style={{ left: `${p.x}%`, top: '-3%', width: p.size * 0.6, height: p.size * 0.6 }}
          animate={{ y: ['0vh', '110vh'], x: [0, p.drift * 0.5, -p.drift * 0.3, p.drift * 0.4] }}
          transition={{ duration: p.duration * 1.5, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function StarParticles() {
  const pts = usePts(16);
  return (
    <>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${10 + Math.random() * 70}%`,
            width: p.size * 0.5, height: p.size * 0.5,
            background: '#E879F9',
            boxShadow: '0 0 6px #E879F9, 0 0 12px #A21CAF',
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2 + Math.random() * 3, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

export default function LunaParticles({ type }: { type: ParticleType }) {
  if (type === 'none') return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {type === 'firefly' && <FireflyParticles />}
      {type === 'petal'   && <PetalParticles />}
      {type === 'leaf'    && <LeafParticles />}
      {type === 'snow'    && <SnowParticles />}
      {type === 'star'    && <StarParticles />}
    </div>
  );
}
