export interface CsvRow {
  date: string;
  battery_level: number;
  speed: number;
  power: number;
  odometer: number;
  latitude: number;
  longitude: number;
  climate_on?: boolean;
  charger_power: number;
  is_charging?: boolean;
  timestamp: number;
  vin?: string;
  vehicle_name?: string;
  display_name?: string;
  software_version?: string;
  car_version?: string; // Added as an alternative
  car_type?: string;
  battery_type?: string;
  outside_temp?: number;
  inside_temp?: number;
  rated_range_km?: number;
  ideal_range_km?: number;
  est_range_km?: number;
}

export interface Trip {
  id: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  startOdometer: number;
  endOdometer: number;
  avgSpeedKph: number;
  maxSpeedKph: number;
  startBattery: number;
  endBattery: number;
  energyUsedKwh: number;
  efficiencyKwhKm: number;
  climateOnRatio: number;
  path: [number, number][]; // [lat, lon][]
  avgOutsideTempC?: number;
}

export interface ChargingSession {
  id: number;
  startTime: string;
  endTime:string;
  durationMinutes: number;
  startBattery: number;
  endBattery: number;
  energyAddedKwh: number;
  avgChargePowerKw: number;
}

export interface CarInfo {
  id: string;
  usableBatteryCapacityKwh: number;
  startOdometer: number;
  endOdometer: number;
  logDurationDays: number;
  vin?: string;
  vehicleName?: string;
  softwareVersion?: string;
  carType?: string;
  batteryType?: string;
  avgOutsideTempC?: number;
  avgInsideTempC?: number;
  startRatedRangeKm?: number;
  endRatedRangeKm?: number;
}

export interface AnalysisResult {
  summary: {
    totalTrips: number;
    totalDistanceKm: number;
    totalDrivingTimeMinutes: number;
    overallAvgSpeedKph: number;
    totalEnergyConsumedKwh: number;
    overallEfficiencyKwhKm: number;
    totalChargingSessions: number;
    totalEnergyAddedKwh: number;
    totalClimateOnRatio: number;
    maxSpeedEverKph: number;
    avgTripDistanceKm: number;
  };
  trips: Trip[];
  chargingSessions: ChargingSession[];
  tripsByDay: Record<string, number>;
  tripsByHour: number[];
  carInfo: CarInfo;
  dateRange: {
    start: string;
    end: string;
  };
  uniqueMonths: string[];
  fileInfo: {
    name: string;
    sizeMb: number;
    rows: number;
  };
}

export interface Settings {
  usableBatteryCapacityKwh: number;
  tripMinBreakMinutes: number;
  powerThresholdKw: number;
}

export type UnitSystem = 'imperial' | 'metric';

// New types for account system
export interface Account {
  name: string;
  salt: Uint8Array;
  hash: string;
}
