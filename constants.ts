
import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  usableBatteryCapacityKwh: 100,
  tripMinBreakMinutes: 3,
  powerThresholdKw: 0.1,
};

export const REQUIRED_COLUMNS: string[] = [
  'date', 'battery_level', 'speed', 'power', 'odometer',
  'latitude', 'longitude', 'charger_power'
];
