
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Trip } from '../../types';
import { useUnits } from '../../hooks/useUnits';

interface EfficiencyHistogramProps {
  data: Trip[];
}

export const EfficiencyHistogram: React.FC<EfficiencyHistogramProps> = ({ data }) => {
  const { convertKwhKm, labels } = useUnits();

  const validTrips = data.map(trip => ({
    ...trip,
    efficiency: convertKwhKm(trip.efficiencyKwhKm)
  })).filter(trip => trip.efficiency > 0 && isFinite(trip.efficiency));

  if (validTrips.length === 0) return <p>No efficiency data available.</p>;

  const maxEfficiency = validTrips.reduce((max, t) => Math.max(max, t.efficiency), 0);
  const binCount = 10;
  const binWidth = Math.ceil((maxEfficiency * 1000) / binCount) / 1000;

  const bins = Array.from({ length: binCount }, (_, i) => {
    const min = i * binWidth;
    const max = (i + 1) * binWidth;
    return {
      name: `${min.toFixed(3)}-${max.toFixed(3)}`,
      count: validTrips.filter(t => t.efficiency >= min && t.efficiency < max).length,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-tesla-gray-600 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md shadow-lg">
          <p className="font-bold">{`Range: ${label} ${labels.efficiency}`}</p>
          <p className="text-blue-500">{`Number of Trips: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" height={50} stroke="currentColor" />
          <YAxis label={{ value: 'Number of Trips', angle: -90, position: 'insideLeft' }} stroke="currentColor" allowDecimals={false}/>
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
