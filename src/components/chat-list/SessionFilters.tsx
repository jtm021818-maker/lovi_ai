import React from 'react';

export type FilterType = 'ALL' | 'ACTIVE' | 'COMPLETED';

interface SessionFiltersProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

export function SessionFilters({ currentFilter, onFilterChange, counts }: SessionFiltersProps) {
  const tabs: { value: FilterType; label: string }[] = [
    { value: 'ALL', label: '전체' },
    { value: 'ACTIVE', label: '진행 중' },
    { value: 'COMPLETED', label: '완료됨' },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide px-2">
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              isActive
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
              {tab.label}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-gray-600 text-gray-100' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {counts[tab.value] || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
