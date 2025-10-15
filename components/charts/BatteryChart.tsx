
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { CsvRow, ChargingSession, Trip } from '../../types';

interface BatteryChartProps {
  data: CsvRow[];
  chargingSessions: ChargingSession[];
  trips: Trip[];
}

export const BatteryChart: React.FC<BatteryChartProps> = ({ data, chargingSessions, trips }) => {
    
  const formatXAxis = (tickItem: number) => {
    return new Date(tickItem).toLocaleDateString();
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white dark:bg-tesla-gray-600 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md shadow-lg">
          <p className="font-bold">{new Date(label).toLocaleString()}</p>
          <p className="text-blue-500">{`Battery: ${payload[0].value.toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBattery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3E6AE1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3E6AE1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis}
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke="currentColor"
          />
          <YAxis domain={[0, 100]} unit="%" stroke="currentColor" />
          <Tooltip content={<CustomTooltip />} />

          {trips.map(trip => (
              <ReferenceArea
                  key={`trip-${trip.id}`}
                  x1={new Date(trip.startTime).getTime()}
                  x2={new Date(trip.endTime).getTime()}
                  y1={0} y2={100}
                  fill="#CC0000"
                  fillOpacity={0.1}
                  strokeOpacity={0}
              />
          ))}

          {chargingSessions.map(session => (
              <ReferenceArea
                  key={`charge-${session.id}`}
                  x1={new Date(session.startTime).getTime()}
                  x2={new Date(session.endTime).getTime()}
                  y1={0} y2={100}
                  fill="#00CC00"
                  fillOpacity={0.15}
                  strokeOpacity={0}
              />
          ))}
          
          <Area
            type="monotone"
            dataKey="battery_level"
            stroke="#3E6AE1"
            fillOpacity={1}
            fill="url(#colorBattery)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs mt-2">
         <div className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400"><span className="w-3 h-3 bg-red-500/20 rounded-sm"></span> Driving</div>
         <div className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400"><span className="w-3 h-3 bg-green-500/20 rounded-sm"></span> Charging</div>
      </div>
    </div>
  );
};