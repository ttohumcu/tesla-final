
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

interface ClimateEfficiencyChartProps {
  trips: Trip[];
}

export const ClimateEfficiencyChart: React.FC<ClimateEfficiencyChartProps> = ({ trips }) => {
  const { convertKwhKm, labels } = useUnits();

  const validTrips = trips.filter(trip => trip.efficiencyKwhKm > 0 && isFinite(trip.efficiencyKwhKm));

  const climateOnTrips = validTrips.filter(t => t.climateOnRatio > 0.1); // Using 10% as a threshold
  const climateOffTrips = validTrips.filter(t => t.climateOnRatio <= 0.1);

  const avgEfficiency = (tripSet: Trip[]) => {
    if (tripSet.length === 0) return 0;
    const totalEfficiency = tripSet.reduce((sum, trip) => sum + trip.efficiencyKwhKm, 0);
    return totalEfficiency / tripSet.length;
  };
  
  const data = [
    {
      name: 'Climate On (>10%)',
      avgEfficiency: convertKwhKm(avgEfficiency(climateOnTrips)),
      count: climateOnTrips.length,
    },
    {
      name: 'Climate Off (<=10%)',
      avgEfficiency: convertKwhKm(avgEfficiency(climateOffTrips)),
      count: climateOffTrips.length,
    }
  ].filter(d => d.count > 0);
  
  if (data.length === 0) {
      return <p className="text-center p-4 h-full flex items-center justify-center">Not enough data to compare climate efficiency.</p>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-tesla-gray-600 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md shadow-lg">
          <p className="font-bold">{label}</p>
          <p className="text-red-500">{`Avg. Efficiency: ${payload[0].value.toFixed(3)} ${labels.efficiency}`}</p>
          <p className="text-gray-400">{`Based on ${payload[0].payload.count} trips`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis dataKey="name" stroke="currentColor" />
          <YAxis
            label={{ value: `Avg. Efficiency (${labels.efficiency})`, angle: -90, position: 'insideLeft', offset: -15 }}
            stroke="currentColor"
            domain={[0, (dataMax: number) => dataMax * 1.1]}
            tickFormatter={(tick) => tick.toFixed(3)}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avgEfficiency" fill="#CC0000" name="Average Efficiency" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
