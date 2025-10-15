
import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';
import type { UnitSystem } from '../types';

const KM_TO_MI = 0.621371;

interface UnitsContextType {
  unitSystem: UnitSystem;
  toggleUnitSystem: () => void;
  convertKm: (km: number) => number;
  convertKph: (kph: number) => number;
  convertKwhKm: (kwhkm: number) => number;
  convertTemp: (celsius: number) => number;
  labels: {
    distance: string;
    distanceLong: string;
    speed: string;
    efficiency: string;
    odometer: string;
    temperature: string;
  };
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export const UnitsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  const toggleUnitSystem = () => {
    setUnitSystem(prev => (prev === 'imperial' ? 'metric' : 'imperial'));
  };

  const value = useMemo(() => {
    const isImperial = unitSystem === 'imperial';
    
    return {
      unitSystem,
      toggleUnitSystem,
      convertKm: (km: number) => isImperial ? km * KM_TO_MI : km,
      convertKph: (kph: number) => isImperial ? kph * KM_TO_MI : kph,
      convertKwhKm: (kwhkm: number) => isImperial ? kwhkm / KM_TO_MI : kwhkm,
      convertTemp: (celsius: number) => isImperial ? (celsius * 9/5) + 32 : celsius,
      labels: {
        distance: isImperial ? 'mi' : 'km',
        distanceLong: isImperial ? 'miles' : 'kilometers',
        speed: isImperial ? 'mph' : 'kph',
        efficiency: isImperial ? 'kWh/mi' : 'kWh/km',
        odometer: isImperial ? 'mi' : 'km',
        temperature: isImperial ? '°F' : '°C',
      }
    };
  }, [unitSystem]);

  return (
    <UnitsContext.Provider value={value}>
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = (): UnitsContextType => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
};