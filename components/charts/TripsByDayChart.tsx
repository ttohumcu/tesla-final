
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

interface TripsByDayChartProps {
  data: Record<string, number>;
}

export const TripsByDayChart: React.FC<TripsByDayChartProps> = ({ data }) => {
  const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const chartData = daysOrder.map(day => ({
    name: day,
    trips: data[day] || 0,
  }));
  
  if (chartData.every(d => d.trips === 0)) {
      return <p className="text-center p-4 h-full flex items-center justify-center">No trip data to display by day.</p>;
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-tesla-gray-600 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md shadow-lg">
          <p className="font-bold">{label}</p>
          <p className="text-blue-500">{`Trips: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis dataKey="name" stroke="currentColor" />
          <YAxis allowDecimals={false} label={{ value: 'Number of Trips', angle: -90, position: 'insideLeft' }} stroke="currentColor" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="trips" fill="#8B5CF6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};