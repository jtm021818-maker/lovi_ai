import React from 'react';

interface EmptyStateProps {
  onStart: () => void;
}

export function EmptyState({ onStart }: EmptyStateProps) {
  return (
    <div className="text-center mt-10 py-12 px-6 bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-md rounded-[32px] border-2 border-white shadow-xl shadow-pink-200/40">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-200 to-rose-200 flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
        <span className="text-4xl drop-shadow-md">💭</span>
      </div>
      <p className="text-[#3E3852] font-black text-lg leading-relaxed mb-8">
        아직 나눈 대화가 없어요.<br />
        <span className="text-[#CBA2FF] font-extrabold text-sm mt-1 block">아래 버튼을 눌러 시작해보세요!</span>
      </p>
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-[#FF8CBD] to-[#B898FF] text-white font-extrabold text-lg px-8 py-3.5 rounded-full shadow-[0_4px_0_#9F71E8] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 mx-auto"
      >
        ✨ 마음이와 대화하기
      </button>
    </div>
  );
}
