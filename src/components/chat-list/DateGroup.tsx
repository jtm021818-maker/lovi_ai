import React from 'react';

interface DateGroupProps {
  label: string;
}

export function DateGroup({ label }: DateGroupProps) {
  return (
    <div className="flex items-center gap-4 mt-8 mb-4 px-2">
      <h3 className="text-sm font-bold text-gray-500">{label}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
  );
}
