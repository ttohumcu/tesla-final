import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Label,
} from 'recharts';
import type { Trip } from '../../types';
import { useUnits } from '../../hooks/useUnits';

interface EfficiencyVsTempChartProps {
  trips: Trip[];
}

export const EfficiencyVsTempChart: React.FC<EfficiencyVsTempChartProps> = ({ trips }) => {
  const { convertKwhKm, convertTemp, labels } = useUnits();

  const chartData = trips
    .filter(t => t.efficiencyKwhKm > 0 && isFinite(t.efficiencyKwhKm) && t.avgOutsideTempC !== undefined)
    .map(t => ({
      temp: convertTemp(t.avgOutsideTempC!),
      efficiency: convertKwhKm(t.efficiencyKwhKm),
      tripId: t.id,
    }));

  if (chartData.length === 0) {
    return <p className="text-center p-4 h-full flex items-center justify-center">Not enough data for temperature vs. efficiency analysis.</p>;
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 bg-white dark:bg-tesla-gray-600 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md shadow-lg">
          <p className="font-bold">Trip #{data.tripId}</p>
          <p className="text-blue-500">{`Efficiency: ${data.efficiency.toFixed(3)} ${labels.efficiency}`}</p>
          <p className="text-red-500">{`Temp: ${data.temp.toFixed(1)} ${labels.temperature}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 30, left: 25, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis 
            type="number" 
            dataKey="temp" 
            name="Temperature" 
            unit={labels.temperature} 
            stroke="currentColor"
          >
             <Label value={`Outside Temperature (${labels.temperature})`} offset={-15} position="insideBottom" />
          </XAxis>
          <YAxis 
            type="number" 
            dataKey="efficiency" 
            name="Efficiency" 
            unit={labels.efficiency} 
            stroke="currentColor" 
            domain={[0, 'dataMax + 0.05']}
            tickFormatter={(tick) => tick.toFixed(3)}
            width={80}
          >
             <Label value={`Efficiency (${labels.efficiency})`} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Scatter name="Trips" data={chartData} fill="#3E6AE1" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
