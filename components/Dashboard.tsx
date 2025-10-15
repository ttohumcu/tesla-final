import React, { useMemo } from 'react';
import type { AnalysisResult, CsvRow } from '../types';
import { SummaryCard } from './SummaryCard';
import { BatteryChart } from './charts/BatteryChart';
import { EfficiencyHistogram } from './charts/EfficiencyHistogram';
import { TripMap } from './maps/TripMap';
import { DataTable } from './DataTable';
import { ExportControls } from './ExportControls';
import { AiSummary } from './AiSummary';
import { ClimateEfficiencyChart } from './charts/ClimateEfficiencyChart';
import { TripsByDayChart } from './charts/TripsByDayChart';
import { useUnits } from '../hooks/useUnits';
import { BarChart, Map, Zap, Thermometer, TrendingUp, Clock, BatteryCharging, CloudDrizzle, FileText, GaugeCircle, Route, SunSnow, CalendarDays, Battery, Milestone, Car, Fingerprint, GitBranch, Activity, Hourglass, Loader2, ArrowLeft } from 'lucide-react';
import { MonthFilter } from './MonthFilter';
import { VehicleSelector } from './VehicleSelector';
import { EfficiencyVsTempChart } from './charts/EfficiencyVsTempChart';
import { TripsByHourChart } from './charts/TripsByHourChart';

interface DashboardProps {
  analysis: AnalysisResult;
  fullAnalysis: AnalysisResult;
  allAnalyses: AnalysisResult[];
  selectedVehicleId: string;
  onVehicleChange: (vehicleId: string) => void;
  chartData: CsvRow[];
  selectedMonth: string | null;
  onMonthChange: (month: string | null) => void;
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  onBackToAllTime: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  analysis, 
  fullAnalysis,
  allAnalyses,
  selectedVehicleId,
  onVehicleChange,
  chartData, 
  selectedMonth,
  onMonthChange,
  selectedDate,
  onDateChange,
  onBackToAllTime,
}) => {
  const { summary, trips, chargingSessions, carInfo } = analysis;
  const { convertKm, convertKph, convertKwhKm, labels, convertTemp } = useUnits();

  const tripColumns = useMemo(() => [
    { accessor: 'id', header: 'Trip #' },
    { accessor: 'startTime', header: 'Start Time' },
    { accessor: 'durationMinutes', header: 'Duration (min)' },
    { accessor: 'distance', header: `Distance (${labels.distance})` },
    { accessor: 'avgSpeed', header: `Avg. Speed (${labels.speed})` },
    { accessor: 'efficiency', header: `Efficiency (${labels.efficiency})` },
    { accessor: 'climateOnRatio', header: '% Climate On' },
  ] as const, [labels]);
  
  const tripData = useMemo(() => trips.map(t => ({
      ...t, 
      startTime: new Date(t.startTime).toLocaleString(),
      distance: convertKm(t.distanceKm).toFixed(1), 
      avgSpeed: convertKph(t.avgSpeedKph).toFixed(1), 
      efficiency: convertKwhKm(t.efficiencyKwhKm).toFixed(3), 
      climateOnRatio: (t.climateOnRatio * 100).toFixed(1)
  })), [trips, convertKm, convertKph, convertKwhKm]);


  const chargeColumns = useMemo(() => [
    { accessor: 'id', header: 'Session #' },
    { accessor: 'startTime', header: 'Start Time' },
    { accessor: 'durationMinutes', header: 'Duration (min)' },
    { accessor: 'startBattery', header: 'Start SoC (%)' },
    { accessor: 'endBattery', header: 'End SoC (%)' },
    { accessor: 'energyAddedKwh', header: 'Energy Added (kWh)' },
    { accessor: 'avgChargePowerKw', header: 'Avg. Power (kW)' },
  ] as const, []);
  
  const chargeData = useMemo(() => chargingSessions.map(c => ({
      ...c, 
      startTime: new Date(c.startTime).toLocaleString(),
      energyAddedKwh: c.energyAddedKwh.toFixed(2), 
      avgChargePowerKw: c.avgChargePowerKw.toFixed(1)
  })), [chargingSessions]);
  
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };
  
  const getDashboardSubtitle = () => {
    if (selectedDate) return `Displaying results for ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}`;
    if (selectedMonth) return `Displaying results for ${formatMonth(selectedMonth)}. Select "All Time" to see full history.`;
    return `Displaying all-time results for this vehicle.`;
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {carInfo.vehicleName || carInfo.id}
           </h2>
           <p className="text-tesla-gray-400">{getDashboardSubtitle()}</p>
        </div>
        <button 
          onClick={onBackToAllTime}
          className="flex items-center gap-2 px-4 py-2 bg-tesla-gray-500 text-white rounded-md hover:bg-opacity-80 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to All-Time Summary
        </button>
      </div>
      
      <div id="export-container" className="p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <SummaryCard icon={Car} title="Vehicle Name" value={carInfo.vehicleName || 'Not Available'} />
                {carInfo.carType && <SummaryCard icon={Car} title="Car Type" value={carInfo.carType} />}
                {carInfo.vin && <SummaryCard icon={Fingerprint} title="VIN" value={carInfo.vin} />}
                {carInfo.softwareVersion && <SummaryCard icon={GitBranch} title="Software" value={carInfo.softwareVersion} />}
                {carInfo.batteryType && <SummaryCard icon={Battery} title="Battery" value={carInfo.batteryType} />}
                <SummaryCard icon={Battery} title="Usable Capacity" value={`${carInfo.usableBatteryCapacityKwh} kWh`} />
                {carInfo.avgOutsideTempC !== undefined && <SummaryCard icon={Thermometer} title="Avg Outside" value={`${convertTemp(carInfo.avgOutsideTempC).toFixed(1)} ${labels.temperature}`} />}
                {carInfo.avgInsideTempC !== undefined && <SummaryCard icon={Thermometer} title="Avg Inside" value={`${convertTemp(carInfo.avgInsideTempC).toFixed(1)} ${labels.temperature}`} />}
                <SummaryCard icon={Milestone} title="Odometer Start" value={`${convertKm(carInfo.startOdometer).toFixed(0)} ${labels.distance}`} />
                <SummaryCard icon={Milestone} title="Odometer End" value={`${convertKm(carInfo.endOdometer).toFixed(0)} ${labels.distance}`} />
                {carInfo.startRatedRangeKm !== undefined && <SummaryCard icon={TrendingUp} title="Rated Range Start" value={`${convertKm(carInfo.startRatedRangeKm).toFixed(1)} ${labels.distance}`} />}
                {carInfo.endRatedRangeKm !== undefined && <SummaryCard icon={TrendingUp} title="Rated Range End" value={`${convertKm(carInfo.endRatedRangeKm).toFixed(1)} ${labels.distance}`} />}
                <SummaryCard icon={CalendarDays} title="Log Duration" value={`${carInfo.logDurationDays} days`} />
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            {allAnalyses.length > 1 && (
              <VehicleSelector
                analyses={allAnalyses}
                selectedId={selectedVehicleId}
                onVehicleChange={onVehicleChange}
              />
            )}
            <MonthFilter 
                selectedMonth={selectedMonth}
                onMonthChange={onMonthChange}
                availableMonths={fullAnalysis.uniqueMonths}
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                fullAnalysis={fullAnalysis}
            />
          </div>
        </div>
        
        <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Overall Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <SummaryCard icon={Map} title="Total Trips" value={summary.totalTrips.toString()} />
              <SummaryCard icon={BarChart} title="Total Distance" value={`${convertKm(summary.totalDistanceKm).toFixed(1)} ${labels.distance}`} />
              <SummaryCard icon={Route} title="Avg. Trip Distance" value={`${convertKm(summary.avgTripDistanceKm).toFixed(1)} ${labels.distance}`} />
              <SummaryCard icon={GaugeCircle} title="Max Speed" value={`${convertKph(summary.maxSpeedEverKph).toFixed(0)} ${labels.speed}`} />
              <SummaryCard icon={TrendingUp} title="Avg. Efficiency" value={`${convertKwhKm(summary.overallEfficiencyKwhKm).toFixed(3)} ${labels.efficiency}`} />
              <SummaryCard icon={Zap} title="Charge Sessions" value={summary.totalChargingSessions.toString()} />
              <SummaryCard icon={Thermometer} title="Climate Usage" value={`${(summary.totalClimateOnRatio * 100).toFixed(1)}%`} />
            </div>
        </div>

        <div className="mt-8"><AiSummary analysis={analysis} /></div>
        
        <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Visualizations</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg lg:col-span-2">
                     <h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><Map className="w-5 h-5 mr-2 text-tesla-blue" />
                        {selectedDate ? `Trips on ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric' })}` : selectedMonth ? `Trips in ${formatMonth(selectedMonth)}` : `All Trips`}
                     </h4>
                    <TripMap trips={analysis.trips} />
                </div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><BatteryCharging className="w-5 h-5 mr-2 text-tesla-blue" />Battery State Over Time</h4><BatteryChart data={chartData} chargingSessions={chargingSessions} trips={trips} /></div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><CloudDrizzle className="w-5 h-5 mr-2 text-tesla-blue" />Trip Efficiency</h4><EfficiencyHistogram data={trips} /></div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><SunSnow className="w-5 h-5 mr-2 text-tesla-blue" />Climate Control Impact on Efficiency</h4><ClimateEfficiencyChart trips={trips} /></div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-tesla-blue" />Trips by Day of Week</h4><TripsByDayChart data={analysis.tripsByDay} /></div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><Activity className="w-5 h-5 mr-2 text-tesla-blue" />Efficiency vs. Outside Temp</h4><EfficiencyVsTempChart trips={trips} /></div>
                <div className="p-4 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 rounded-lg"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><Hourglass className="w-5 h-5 mr-2 text-tesla-blue" />Trips by Time of Day</h4><TripsByHourChart data={analysis.tripsByHour} /></div>
            </div>
        </div>
        
        <div className="mt-6"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><Clock className="w-5 h-5 mr-2 text-tesla-blue" />Trip Details</h4><DataTable columns={tripColumns} data={tripData} /></div>
        <div className="mt-6"><h4 className="font-semibold mb-2 text-gray-900 dark:text-white flex items-center"><Zap className="w-5 h-5 mr-2 text-tesla-blue" />Charging Session Details</h4><DataTable columns={chargeColumns} data={chargeData} /></div>
      </div>
      
      <div className="p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center"><FileText className="w-5 h-5 mr-2 text-tesla-blue" />Export Report</h3>
        <ExportControls analysis={analysis} fileName={analysis.fileInfo.name || 'Analysis'} />
      </div>

    </div>
  );
};