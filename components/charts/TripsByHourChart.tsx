
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

interface TripsByHourChartProps {
  data: number[];
}

export const TripsByHourChart: React.FC<TripsByHourChartProps> = ({ data }) => {
  const chartData = data.map((count, index) => {
    const hour = index % 12 === 0 ? 12 : index % 12;
    const ampm = index < 12 ? 'AM' : 'PM';
    return {
      name: `${hour} ${ampm}`,
      trips: count,
    };
  });
  
  if (chartData.every(d => d.trips === 0)) {
    return <p className="text-center p-4 h-full flex items-center justify-center">No trip data to display by hour.</p>;
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
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} interval={1} stroke="currentColor"/>
          <YAxis allowDecimals={false} label={{ value: 'Number of Trips', angle: -90, position: 'insideLeft' }} stroke="currentColor" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="trips" fill="#F97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};