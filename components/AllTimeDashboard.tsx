
import React, { useMemo } from 'react';
import { AnalysisResult } from '../types';
import { useUnits } from '../hooks/useUnits';
import { SummaryCard } from './SummaryCard';
import { Map, BarChart, Zap, GaugeCircle, TrendingUp, Loader2, Clock, Battery, BatteryCharging, Milestone, CalendarDays, Car } from 'lucide-react';

interface AllTimeDashboardProps {
  analyses: AnalysisResult[];
  onSelectVehicle: (vehicleId: string) => void;
}

export const AllTimeDashboard: React.FC<AllTimeDashboardProps> = ({ 
    analyses, 
    onSelectVehicle,
}) => {
  const { convertKm, convertKph, convertKwhKm, labels } = useUnits();

  const aggregateStats = useMemo(() => {
    if (!analyses || analyses.length === 0) return null;
    
    const totalTrips = analyses.reduce((sum, a) => sum + a.summary.totalTrips, 0);
    const totalDistanceKm = analyses.reduce((sum, a) => sum + a.summary.totalDistanceKm, 0);
    const totalDrivingTimeMinutes = analyses.reduce((sum, a) => sum + a.summary.totalDrivingTimeMinutes, 0);
    const totalEnergyConsumedKwh = analyses.reduce((sum, a) => sum + a.summary.totalEnergyConsumedKwh, 0);
    const totalChargingSessions = analyses.reduce((sum, a) => sum + a.summary.totalChargingSessions, 0);
    const totalEnergyAddedKwh = analyses.reduce((sum, a) => sum + a.summary.totalEnergyAddedKwh, 0);
    
    const allOdometerStarts = analyses.map(a => a.carInfo.startOdometer).filter(o => o > 0);
    const allOdometerEnds = analyses.map(a => a.carInfo.endOdometer).filter(o => o > 0);

    const summary = {
      totalTrips,
      totalDistanceKm,
      totalDrivingTimeMinutes,
      totalEnergyConsumedKwh,
      overallEfficiencyKwhKm: totalDistanceKm > 0 ? totalEnergyConsumedKwh / totalDistanceKm : 0,
      totalChargingSessions,
      totalEnergyAddedKwh,
      maxSpeedEverKph: Math.max(...analyses.map(a => a.summary.maxSpeedEverKph)),
    };

    const carInfo = {
        startOdometer: allOdometerStarts.length > 0 ? Math.min(...allOdometerStarts) : 0,
        endOdometer: allOdometerEnds.length > 0 ? Math.max(...allOdometerEnds) : 0,
        logDurationDays: Math.max(...analyses.map(a => a.carInfo.logDurationDays)),
    };

    return { summary, carInfo };
  }, [analyses]);

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(analysis => {
      // A vehicle is considered "Unknown" if its name part of the ID is "Unknown Vehicle"
      // and it has no trips. This is more robust than checking the full ID string.
      const isEffectivelyUnknown = analysis.carInfo.id.endsWith('-Unknown Vehicle');
      return !(isEffectivelyUnknown && analysis.summary.totalTrips === 0);
    });
  }, [analyses]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes.toFixed(0)} min`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    const days = hours / 24;
    return `${days.toFixed(1)} days`;
  };

  const getDashboardSubtitle = () => {
    const vehicleCount = filteredAnalyses.length;
    return `Displaying an overview for ${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''}.`;
  };

  if (!aggregateStats) return null;
  const { summary, carInfo } = aggregateStats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            All-Time Summary
           </h2>
           <p className="text-tesla-gray-400">{getDashboardSubtitle()}</p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Lifetime Stats (All Vehicles)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard icon={Map} title="Total Trips" value={summary.totalTrips.toString()} />
            <SummaryCard icon={BarChart} title="Total Trip Distance" value={`${convertKm(summary.totalDistanceKm).toFixed(1)} ${labels.distance}`} />
            <SummaryCard icon={Milestone} title="Distance Covered" value={`${convertKm(carInfo.endOdometer - carInfo.startOdometer).toFixed(1)} ${labels.distance}`} />
            <SummaryCard icon={GaugeCircle} title="Max Speed" value={`${convertKph(summary.maxSpeedEverKph).toFixed(0)} ${labels.speed}`} />
            <SummaryCard icon={TrendingUp} title="Avg. Efficiency" value={`${convertKwhKm(summary.overallEfficiencyKwhKm).toFixed(3)} ${labels.efficiency}`} />
            <SummaryCard icon={Zap} title="Charge Sessions" value={summary.totalChargingSessions.toString()} />
            <SummaryCard icon={Clock} title="Driving Time" value={formatDuration(summary.totalDrivingTimeMinutes)} />
            <SummaryCard icon={Battery} title="Energy Used" value={`${summary.totalEnergyConsumedKwh.toFixed(1)} kWh`} />
            <SummaryCard icon={BatteryCharging} title="Energy Added" value={`${summary.totalEnergyAddedKwh.toFixed(1)} kWh`} />
            <SummaryCard icon={CalendarDays} title="Max Log Duration" value={`${carInfo.logDurationDays} days`} />
          </div>
      </div>
      
      <div className="p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Vehicle Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnalyses.map(analysis => (
            <div key={analysis.carInfo.id} className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Car className="w-5 h-5 text-tesla-blue" />
                    {analysis.carInfo.vehicleName || analysis.carInfo.id}
                </h4>
                <p className="text-xs text-tesla-gray-400 truncate mb-3">{analysis.carInfo.vin ? `VIN: ${analysis.carInfo.vin}` : `ID: ${analysis.carInfo.id}`}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p><strong className="font-semibold text-tesla-gray-500 dark:text-tesla-gray-300">Distance:</strong> {convertKm(analysis.summary.totalDistanceKm).toFixed(1)} {labels.distance}</p>
                  <p><strong className="font-semibold text-tesla-gray-500 dark:text-tesla-gray-300">Trips:</strong> {analysis.summary.totalTrips}</p>
                  <p><strong className="font-semibold text-tesla-gray-500 dark:text-tesla-gray-300">Avg. Efficiency:</strong> {convertKwhKm(analysis.summary.overallEfficiencyKwhKm).toFixed(3)} {labels.efficiency}</p>
                  <p><strong className="font-semibold text-tesla-gray-500 dark:text-tesla-gray-300">Charging:</strong> {analysis.summary.totalChargingSessions} sessions</p>
                </div>
              </div>
              <button 
                onClick={() => onSelectVehicle(analysis.carInfo.id)}
                className="mt-4 w-full px-4 py-2 bg-tesla-blue text-white text-sm font-semibold rounded-md hover:bg-opacity-80 transition-colors"
              >
                View Detailed Dashboard
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
