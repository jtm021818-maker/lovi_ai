import React from 'react';

interface DateGroupProps {
  label: string;
}

export function DateGroup({ label }: DateGroupProps) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4 px-2">
      <h3 className="text-[16px] font-extrabold text-[#3E3852]">{label}</h3>
      <div className="flex-1 h-[2px] bg-gradient-to-r from-[#FFB5C5]/60 to-transparent" />
    </div>
  );
}
