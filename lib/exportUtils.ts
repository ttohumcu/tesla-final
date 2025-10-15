
import type { AnalysisResult, UnitSystem } from '../types';

const KM_TO_MI = 0.621371;

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const exportToCsv = <T extends object>(data: T[], fileName: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header as keyof T];
        // Handle cases where value might be a string with commas
        const stringValue = String(value === null || value === undefined ? '' : value);
        if (stringValue.includes(',')) {
          return `"${stringValue}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];
  
  downloadFile(csvRows.join('\n'), fileName, 'text/csv;charset=utf-8;');
};

export const exportToTxt = (analysis: AnalysisResult, fileName: string, unitSystem: UnitSystem) => {
    const { summary, trips, chargingSessions, dateRange, fileInfo, carInfo } = analysis;
    const isImperial = unitSystem === 'imperial';

    const dist = (km: number) => isImperial ? km * KM_TO_MI : km;
    const speed = (kph: number) => isImperial ? kph * KM_TO_MI : kph;
    const eff = (kwhkm: number) => isImperial ? kwhkm / KM_TO_MI : kwhkm;
    const labels = {
        distance: isImperial ? 'mi' : 'km',
        speed: isImperial ? 'mph' : 'kph',
        efficiency: isImperial ? 'kWh/mi' : 'kWh/km',
    };

    let content = `Tesla Driving Analysis Report\n`;
    content += `================================\n\n`;
    content += `File: ${fileInfo.name}\n`;
    content += `Date Range: ${dateRange.start} to ${dateRange.end}\n`;
    if (carInfo.vehicleName) content += `Vehicle: ${carInfo.vehicleName}\n`;
    if (carInfo.vin) content += `VIN: ${carInfo.vin}\n`;
    content += `\n`;

    content += `OVERALL SUMMARY\n`;
    content += `-----------------\n`;
    content += `Total Trips: ${summary.totalTrips}\n`;
    content += `Total Distance: ${dist(summary.totalDistanceKm).toFixed(1)} ${labels.distance}\n`;
    content += `Total Driving Time: ${summary.totalDrivingTimeMinutes.toFixed(0)} minutes\n`;
    content += `Overall Avg. Speed: ${speed(summary.overallAvgSpeedKph).toFixed(1)} ${labels.speed}\n`;
    content += `Total Energy Consumed: ${summary.totalEnergyConsumedKwh.toFixed(2)} kWh\n`;
    content += `Overall Efficiency: ${eff(summary.overallEfficiencyKwhKm).toFixed(3)} ${labels.efficiency}\n`;
    content += `Total Charging Sessions: ${summary.totalChargingSessions}\n`;
    content += `Total Energy Added: ${summary.totalEnergyAddedKwh.toFixed(2)} kWh\n`;
    content += `Overall Climate Usage: ${(summary.totalClimateOnRatio * 100).toFixed(1)}%\n\n`;

    content += `TRIP DETAILS\n`;
    content += `-----------------\n`;
    if (trips.length > 0) {
        trips.forEach(t => {
            content += `Trip #${t.id} on ${new Date(t.startTime).toLocaleDateString()}:\n`;
            content += `  - Duration: ${t.durationMinutes} min, Distance: ${dist(t.distanceKm).toFixed(1)} ${labels.distance}\n`;
            content += `  - Efficiency: ${eff(t.efficiencyKwhKm).toFixed(3)} ${labels.efficiency}, Avg Speed: ${speed(t.avgSpeedKph).toFixed(1)} ${labels.speed}\n`;
            content += `  - Energy Used: ${t.energyUsedKwh.toFixed(2)} kWh (${t.startBattery}% -> ${t.endBattery}%)\n\n`;
        });
    } else {
        content += `No trips detected.\n\n`;
    }

    content += `CHARGING SESSIONS\n`;
    content += `-----------------\n`;
    if (chargingSessions.length > 0) {
        chargingSessions.forEach(c => {
            content += `Session #${c.id} on ${new Date(c.startTime).toLocaleDateString()}:\n`;
            content += `  - Duration: ${c.durationMinutes} min\n`;
            content += `  - Energy Added: ${c.energyAddedKwh.toFixed(2)} kWh (${c.startBattery}% -> ${c.endBattery}%)\n\n`;
        });
    } else {
        content += `No charging sessions detected.\n\n`;
    }

    downloadFile(content, fileName, 'text/plain;charset=utf-8;');
};
