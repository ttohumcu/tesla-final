import React from 'react';
import type { AnalysisResult } from '../types';

interface VehicleSelectorProps {
  analyses: AnalysisResult[];
  selectedId: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ analyses, selectedId, onVehicleChange }) => {
  return (
    <div>
      <label htmlFor="vehicle-select" className="block text-sm font-medium text-tesla-gray-400 mb-1">
        Select Vehicle
      </label>
      <select
        id="vehicle-select"
        value={selectedId}
        onChange={(e) => onVehicleChange(e.target.value)}
        className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500/50 border border-tesla-gray-300 dark:border-tesla-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
      >
        {analyses.map(analysis => {
          const { carInfo } = analysis;
          const name = carInfo.vehicleName || carInfo.carType || 'Unknown Vehicle';
          const id = carInfo.id;
          return (
            <option key={id} value={id}>
              {name} ({id.substring(0, 10)}...)
            </option>
          );
        })}
      </select>
    </div>
  );
};
