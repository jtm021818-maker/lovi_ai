import React from 'react';

export type FilterType = 'ALL' | 'ACTIVE' | 'COMPLETED';

interface SessionFiltersProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

export function SessionFilters({ currentFilter, onFilterChange, counts }: SessionFiltersProps) {
  const tabs = [
    { 
      value: 'ALL', label: '전체', 
      bg: 'bg-gradient-to-b from-[#E6D8FF] to-[#D1C4FA]', 
      shadow: 'shadow-[0_3px_0_#BDB2E8]', 
      text: 'text-[#3E3852]',
      countBg: 'bg-white/70'
    },
    { 
      value: 'ACTIVE', label: '진행 중', 
      bg: 'bg-gradient-to-b from-[#C9EAFB] to-[#AEE0F8]', 
      shadow: 'shadow-[0_3px_0_#9DCBE6]', 
      text: 'text-[#3A4E5C]',
      countBg: 'bg-white/60'
    },
    { 
      value: 'COMPLETED', label: '완료됨', 
      bg: 'bg-gradient-to-b from-[#FFF2B2] to-[#FFE599]', 
      shadow: 'shadow-[0_3px_0_#E8C678]', 
      text: 'text-[#5C4D2E]',
      countBg: 'bg-white/80'
    },
  ] as const;

  return (
    <div className="relative mb-6">
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-between px-2">
        {tabs.map((tab) => {
          const isActive = currentFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl whitespace-nowrap transition-transform active:translate-y-1 active:shadow-none ${tab.bg} ${isActive ? tab.shadow + ' border-2 border-white/50' : tab.shadow + ' opacity-90'}`}
            >
              <span className={`text-[15px] font-extrabold ${tab.text}`}>
                {tab.label}
              </span>
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded-full ${tab.countBg} ${tab.text}`}
              >
                {counts[tab.value] || 0}
              </span>
            </button>
          );
        })}
      </div>
      {/* Pink divider bar under tabs */}
      <div className="mx-2 h-1.5 bg-[#FFB5C5]/30 rounded-full overflow-hidden mt-1">
        <div className="h-full bg-gradient-to-r from-[#FF9EBC] to-[#FF80A6] w-4/5 rounded-full" />
      </div>
    </div>
  );
}
