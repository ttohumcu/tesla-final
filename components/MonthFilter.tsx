import React, { useMemo } from 'react';
import type { AnalysisResult } from '../types';

interface MonthFilterProps {
  selectedMonth: string | null;
  onMonthChange: (month: string | null) => void;
  availableMonths: string[];
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  fullAnalysis: AnalysisResult | null;
}

export const MonthFilter: React.FC<MonthFilterProps> = ({ 
  selectedMonth, 
  onMonthChange, 
  availableMonths,
  selectedDate,
  onDateChange,
  fullAnalysis
}) => {
  const sortedMonths = useMemo(() => {
    // Sort months reverse chronologically
    return [...availableMonths].sort().reverse();
  }, [availableMonths]);

  const daysWithData = useMemo(() => {
    if (!selectedMonth || !fullAnalysis) return [];

    const daysInMonth = new Set<string>();
    fullAnalysis.trips.forEach(trip => {
      const tripDate = new Date(trip.startTime);
      const tripMonthStr = `${tripDate.getUTCFullYear()}-${String(tripDate.getUTCMonth() + 1).padStart(2, '0')}`;
      if (tripMonthStr === selectedMonth) {
        const tripDayStr = `${tripMonthStr}-${String(tripDate.getUTCDate()).padStart(2, '0')}`;
        daysInMonth.add(tripDayStr);
      }
    });

    return Array.from(daysInMonth).sort();
  }, [selectedMonth, fullAnalysis]);

  return (
    <div>
      <label htmlFor="month-select" className="block text-sm font-medium text-tesla-gray-400 mb-1">
        Filter by Month
      </label>
      <select
        id="month-select"
        value={selectedMonth || ''}
        onChange={(e) => onMonthChange(e.target.value || null)}
        className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
      >
        <option value="">All Time</option>
        {sortedMonths.map(monthStr => {
          const [year, month] = monthStr.split('-');
          const date = new Date(Number(year), Number(month) - 1, 1);
          const displayLabel = date.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
          return <option key={monthStr} value={monthStr}>{displayLabel}</option>;
        })}
      </select>

      {selectedMonth && daysWithData.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-tesla-gray-400 mb-2">
            Filter by Day
          </label>
          <div className="flex flex-wrap gap-2">
             <button
                onClick={() => onDateChange(null)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  !selectedDate
                    ? 'bg-tesla-blue text-white'
                    : 'bg-tesla-gray-200 dark:bg-tesla-gray-500 hover:bg-tesla-gray-300 dark:hover:bg-tesla-gray-400'
                }`}
              >
                Full Month
              </button>
            {daysWithData.map(dayStr => {
              const day = dayStr.split('-')[2];
              const isActive = selectedDate === dayStr;
              return (
                <button
                  key={dayStr}
                  onClick={() => onDateChange(dayStr)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-full transition-colors ${
                    isActive
                      ? 'bg-tesla-blue text-white'
                      : 'bg-tesla-gray-200 dark:bg-tesla-gray-500 hover:bg-tesla-gray-300 dark:hover:bg-tesla-gray-400'
                  }`}
                  aria-pressed={isActive}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
