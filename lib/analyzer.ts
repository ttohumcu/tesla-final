import Papa from 'papaparse';
import type { CsvRow, Trip, ChargingSession, AnalysisResult, Settings, CarInfo } from '../types';
import { REQUIRED_COLUMNS } from '../constants';

// Helper function to calculate distance between two lat/lon points (Haversine formula)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const parseCsv = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: header => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors.length) {
          reject(new Error(`CSV Parsing Error: ${results.errors[0].message}`));
        } else {
          // Validate required columns
          const headers = results.meta.fields || [];
          const missingCols = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
          if (missingCols.length > 0) {
              reject(new Error(`File "${file.name}" is missing required columns: ${missingCols.join(', ')}`));
              return;
          }
          resolve(results.data);
        }
      },
      error: (error) => reject(error),
    });
  });
};

const calculateSummaryAndMetrics = (
    trips: Trip[],
    chargingSessions: ChargingSession[]
) => {
    const totalDistanceKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);
    const totalDrivingTimeMinutes = trips.reduce((sum, t) => sum + t.durationMinutes, 0);
    const totalEnergyConsumedKwh = trips.reduce((sum, t) => sum + t.energyUsedKwh, 0);
    const weightedClimateOnRatio = trips.reduce((sum, t) => sum + (t.climateOnRatio * t.durationMinutes), 0) / (totalDrivingTimeMinutes || 1);
    const maxSpeedEverKph = trips.length > 0 ? Math.max(...trips.map(t => t.maxSpeedKph)) : 0;
    const avgTripDistanceKm = trips.length > 0 ? totalDistanceKm / trips.length : 0;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tripsByDay = trips.reduce((acc, trip) => {
        const dayIndex = new Date(trip.startTime).getUTCDay();
        const dayName = days[dayIndex];
        acc[dayName] = (acc[dayName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const tripsByHour = Array(24).fill(0);
    trips.forEach(trip => {
        const hour = new Date(trip.startTime).getHours();
        tripsByHour[hour]++;
    });

    const summary = {
        totalTrips: trips.length,
        totalDistanceKm,
        totalDrivingTimeMinutes,
        overallAvgSpeedKph: totalDistanceKm > 0 ? totalDistanceKm / (totalDrivingTimeMinutes / 60) : 0,
        totalEnergyConsumedKwh,
        overallEfficiencyKwhKm: totalDistanceKm > 0 ? totalEnergyConsumedKwh / totalDistanceKm : 0,
        totalChargingSessions: chargingSessions.length,
        totalEnergyAddedKwh: chargingSessions.reduce((sum, c) => sum + c.energyAddedKwh, 0),
        totalClimateOnRatio: weightedClimateOnRatio,
        maxSpeedEverKph,
        avgTripDistanceKm,
    };
    return { summary, tripsByDay, tripsByHour };
};

const DOWNSAMPLE_TRIP_PATH_MAX_POINTS = 200;

const downsamplePath = (path: [number, number][]): [number, number][] => {
  if (path.length <= DOWNSAMPLE_TRIP_PATH_MAX_POINTS) {
    return path;
  }
  const result: [number, number][] = [];
  const bucketSize = Math.ceil(path.length / DOWNSAMPLE_TRIP_PATH_MAX_POINTS);
  for (let i = 0; i < path.length; i += bucketSize) {
    result.push(path[i]);
  }
  return result;
};

export const performAnalysis = (data: CsvRow[], settings: Settings, fileInfo: AnalysisResult['fileInfo'], vehicleId: string): AnalysisResult => {
  const trips: Trip[] = [];
  const chargingSessions: ChargingSession[] = [];
  let currentTrip: Partial<Trip> & { dataPoints: CsvRow[] } | null = null;
  let currentChargingSession: Partial<ChargingSession> & { dataPoints: CsvRow[] } | null = null;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i-1];
    const curr = data[i];

    const timeDiffMinutes = (curr.timestamp - prev.timestamp) / (1000 * 60);

    // Trip detection
    const isDriving = curr.speed > 0 || curr.power < -settings.powerThresholdKw;
    
    if (isDriving && !currentTrip) {
      currentTrip = { id: trips.length + 1, dataPoints: [curr], path: [[curr.latitude, curr.longitude]] };
    } else if (currentTrip && (!isDriving || timeDiffMinutes > settings.tripMinBreakMinutes)) {
      // End of trip
      const tripData = currentTrip.dataPoints;
      if (tripData.length > 1) {
        const start = tripData[0];
        const end = tripData[tripData.length - 1];
        const distanceKm = end.odometer - start.odometer;

        if (distanceKm > 0.1) { // Filter out very short trips
          const durationMinutes = (end.timestamp - start.timestamp) / (1000 * 60);
          const energyDelta = start.battery_level - end.battery_level;
          const energyUsedKwh = (energyDelta / 100) * settings.usableBatteryCapacityKwh;
          
          const tempValues = tripData
            .map(p => p.outside_temp)
            .filter(t => typeof t === 'number' && isFinite(t)) as number[];
          const avgOutsideTempC = tempValues.length > 0 ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length : undefined;

          const maxSpeedKph = tripData.reduce((max, point) => Math.max(max, point.speed), 0);
          const fullPath = currentTrip.path || [];

          trips.push({
            id: currentTrip.id!,
            startTime: new Date(start.timestamp).toISOString(),
            endTime: new Date(end.timestamp).toISOString(),
            durationMinutes: parseFloat(durationMinutes.toFixed(1)),
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            startOdometer: start.odometer,
            endOdometer: end.odometer,
            avgSpeedKph: distanceKm > 0 ? parseFloat(((distanceKm / (durationMinutes / 60)).toFixed(1))) : 0,
            maxSpeedKph: maxSpeedKph,
            startBattery: start.battery_level,
            endBattery: end.battery_level,
            energyUsedKwh: parseFloat(energyUsedKwh.toFixed(3)),
            efficiencyKwhKm: distanceKm > 0 ? parseFloat((energyUsedKwh / distanceKm).toFixed(3)) : 0,
            climateOnRatio: tripData.filter(p => p.climate_on).length / tripData.length,
            path: downsamplePath(fullPath),
            avgOutsideTempC: avgOutsideTempC !== undefined ? parseFloat(avgOutsideTempC.toFixed(1)) : undefined,
          });
        }
      }
      currentTrip = null;
    } else if (isDriving && currentTrip) {
      currentTrip.dataPoints.push(curr);
      if (curr.latitude && curr.longitude) currentTrip.path?.push([curr.latitude, curr.longitude]);
    }

    // Charging detection
    const isCharging = curr.is_charging || curr.charger_power > 0;
    
    if (isCharging && !currentChargingSession) {
      currentChargingSession = { id: chargingSessions.length + 1, dataPoints: [curr] };
    } else if (currentChargingSession && (!isCharging || timeDiffMinutes > 15)) { // 15 min break ends charging
      const chargeData = currentChargingSession.dataPoints;
      if (chargeData.length > 1) {
          const start = chargeData[0];
          const end = chargeData[chargeData.length - 1];
          const energyAdded = end.battery_level - start.battery_level;
          if (energyAdded > 0) { // Must add some charge
              const durationMinutes = (end.timestamp - start.timestamp) / (1000 * 60);
              chargingSessions.push({
                  id: currentChargingSession.id!,
                  startTime: new Date(start.timestamp).toISOString(),
                  endTime: new Date(end.timestamp).toISOString(),
                  durationMinutes: parseFloat(durationMinutes.toFixed(1)),
                  startBattery: start.battery_level,
                  endBattery: end.battery_level,
                  energyAddedKwh: (energyAdded / 100) * settings.usableBatteryCapacityKwh,
                  avgChargePowerKw: chargeData.map(p => p.charger_power).reduce((a,b) => a+b, 0) / chargeData.length,
              });
          }
      }
      currentChargingSession = null;
    } else if (isCharging && currentChargingSession) {
      currentChargingSession.dataPoints.push(curr);
    }
  }

  const { summary, tripsByDay, tripsByHour } = calculateSummaryAndMetrics(trips, chargingSessions);
  
  // Car Info calculation
  const findFirstOrDefault = (data: any[], key: string): string | undefined => {
      const entry = data.find(r => r[key] != null && r[key] !== '');
      return entry ? String(entry[key]) : undefined;
  };

  const findFirstNumeric = (data: CsvRow[], key: keyof CsvRow): number | undefined => {
      const entry = data.find(r => typeof r[key] === 'number' && isFinite(r[key] as number));
      return entry ? (entry[key] as number) : undefined;
  };
  
  const findLastNumeric = (data: CsvRow[], key: keyof CsvRow): number | undefined => {
      const entry = [...data].reverse().find(r => typeof r[key] === 'number' && isFinite(r[key] as number));
      return entry ? (entry[key] as number) : undefined;
  };

  const calculateAverage = (data: CsvRow[], key: keyof CsvRow): number | undefined => {
      const values = data.map(r => r[key]).filter(v => typeof v === 'number' && isFinite(v)) as number[];
      if (values.length === 0) return undefined;
      return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const firstValidEntry = data.find(row => row.odometer > 0);
  const lastValidEntry = [...data].reverse().find(row => row.odometer > 0);

  const carInfo: CarInfo = {
    id: vehicleId,
    usableBatteryCapacityKwh: settings.usableBatteryCapacityKwh,
    startOdometer: firstValidEntry ? firstValidEntry.odometer : 0,
    endOdometer: lastValidEntry ? lastValidEntry.odometer : 0,
    logDurationDays: data.length > 1 ? Math.round((data[data.length - 1].timestamp - data[0].timestamp) / (1000 * 60 * 60 * 24)) : 0,
    vin: findFirstOrDefault(data, 'vin'),
    vehicleName: findFirstOrDefault(data, 'vehicle_name') || findFirstOrDefault(data, 'display_name'),
    softwareVersion: findFirstOrDefault(data, 'software_version') || findFirstOrDefault(data, 'car_version'),
    carType: findFirstOrDefault(data, 'car_type'),
    batteryType: findFirstOrDefault(data, 'battery_type'),
    avgOutsideTempC: calculateAverage(data, 'outside_temp'),
    avgInsideTempC: calculateAverage(data, 'inside_temp'),
    startRatedRangeKm: findFirstNumeric(data, 'rated_range_km'),
    endRatedRangeKm: findLastNumeric(data, 'rated_range_km'),
  };

  const uniqueMonths = Array.from(new Set(data.map(row => {
    const d = new Date(row.timestamp);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  })));

  return {
    summary,
    trips,
    chargingSessions,
    tripsByDay,
    tripsByHour,
    carInfo,
    dateRange: {
        start: new Date(data[0].timestamp).toISOString(),
        end: new Date(data[data.length-1].timestamp).toISOString(),
    },
    uniqueMonths,
    fileInfo,
  };
};

export const analyzeMultipleVehicles = (
  vehicleDataMap: Map<string, CsvRow[]>,
  settings: Settings,
  fileInfo: AnalysisResult['fileInfo']
): AnalysisResult[] => {
  const results: AnalysisResult[] = [];
  for (const [vehicleId, vehicleData] of vehicleDataMap.entries()) {
    if (vehicleData.length === 0) continue;
    
    const sortedVehicleData = vehicleData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Create a more specific fileInfo for this vehicle's analysis
    const vehicleFileInfo = {
        name: `${fileInfo.name} - ${vehicleId}`,
        sizeMb: 0, // Cannot be accurately determined per vehicle
        rows: sortedVehicleData.length
    };

    const analysisResult = performAnalysis(sortedVehicleData, settings, vehicleFileInfo, vehicleId);
    results.push(analysisResult);
  }

  return results;
};


export const filterAnalysisByDate = (
    fullAnalysis: AnalysisResult,
    dateRange: { start: Date, end: Date }
): AnalysisResult => {
    const { start, end } = dateRange;
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const filteredTrips = fullAnalysis.trips.filter(trip => {
        const tripTime = new Date(trip.startTime).getTime();
        return tripTime >= startTime && tripTime <= endTime;
    });

    const filteredChargingSessions = fullAnalysis.chargingSessions.filter(session => {
        const sessionTime = new Date(session.startTime).getTime();
        return sessionTime >= startTime && sessionTime <= endTime;
    });

    const { summary, tripsByDay, tripsByHour } = calculateSummaryAndMetrics(filteredTrips, filteredChargingSessions);

    const carInfoUpdate: Partial<CarInfo> = {};

    if (filteredTrips.length > 0) {
        // This is much more performant than filtering the entire raw data array.
        // It relies on the smaller, pre-filtered trips array.
        // Trips are generally chronological, but we sort to be safe.
        const sortedFilteredTrips = [...filteredTrips].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        const firstTrip = sortedFilteredTrips[0];
        const lastTrip = sortedFilteredTrips[sortedFilteredTrips.length - 1];

        carInfoUpdate.startOdometer = firstTrip.startOdometer;
        carInfoUpdate.endOdometer = lastTrip.endOdometer;
        
        // Calculate duration based on the filter range. Use Math.ceil to ensure a single day filter is counted as 1 day.
        carInfoUpdate.logDurationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } else {
        // No trips in this date range. Reset odometer and duration.
        carInfoUpdate.startOdometer = 0;
        carInfoUpdate.endOdometer = 0;
        carInfoUpdate.logDurationDays = 0;
    }

    return {
        ...fullAnalysis,
        summary,
        trips: filteredTrips,
        chargingSessions: filteredChargingSessions,
        tripsByDay,
        tripsByHour,
        carInfo: {
            ...fullAnalysis.carInfo,
            ...carInfoUpdate,
        }
    };
};
