import React from 'react';

interface EmptyStateProps {
  onStart: () => void;
}

export function EmptyState({ onStart }: EmptyStateProps) {
  return (
    <div className="text-center mt-10 py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">💭</span>
      </div>
      <p className="text-gray-500 font-medium leading-relaxed mb-6">
        아직 나눈 대화가 없어요.<br />
        아래 버튼을 눌러 시작해보세요!
      </p>
      <button
        onClick={onStart}
        className="bg-pink-50 text-pink-600 font-bold px-6 py-2.5 rounded-full hover:bg-pink-100 transition-colors"
      >
        마음이와 대화하기
      </button>
    </div>
  );
}
