
import React from 'react';
import type { LucideProps } from 'lucide-react';

interface SummaryCardProps {
  icon: React.ElementType<LucideProps>;
  title: string;
  value: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, title, value }) => {
  return (
    <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg flex items-center">
      <div className="p-2 bg-tesla-blue/20 rounded-full mr-4">
        <Icon className="w-6 h-6 text-tesla-blue" />
      </div>
      <div>
        <p className="text-sm text-tesla-gray-400">{title}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};
