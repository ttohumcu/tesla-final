
import React from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { AnalysisResult } from '../types';
import { exportToCsv, exportToTxt } from '../lib/exportUtils';
import { useUnits } from '../hooks/useUnits';

interface ExportControlsProps {
    analysis: AnalysisResult;
    fileName: string;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ analysis, fileName }) => {
    const baseFileName = fileName.replace('.csv', '');
    const { unitSystem, convertKm, convertKph, convertKwhKm, labels } = useUnits();

    const handleExportImage = async () => {
        const container = document.getElementById('export-container');
        if (container) {
            try {
                const dataUrl = await toPng(container);
                const link = document.createElement('a');
                link.download = `${baseFileName}_dashboard.png`;
                link.href = dataUrl;
                link.click();
            } catch (error) {
                console.error('Failed to export image:', error);
                alert('Could not export image. Please try again.');
            }
        }
    };

    const handleExportTrips = () => {
        const convertedTrips = analysis.trips.map(t => ({
            'Trip #': t.id,
            'Start Time': t.startTime,
            'End Time': t.endTime,
            'Duration (min)': t.durationMinutes,
            [`Distance (${labels.distance})`]: convertKm(t.distanceKm).toFixed(2),
            [`Avg Speed (${labels.speed})`]: convertKph(t.avgSpeedKph).toFixed(1),
            [`Max Speed (${labels.speed})`]: convertKph(t.maxSpeedKph).toFixed(1),
            'Start SoC (%)': t.startBattery,
            'End SoC (%)': t.endBattery,
            'Energy Used (kWh)': t.energyUsedKwh.toFixed(2),
            [`Efficiency (${labels.efficiency})`]: convertKwhKm(t.efficiencyKwhKm).toFixed(3),
            '% Climate On': (t.climateOnRatio * 100).toFixed(1),
        }));
        exportToCsv(convertedTrips, `${baseFileName}_trips.csv`);
    };

    const handleExportCharging = () => {
        exportToCsv(analysis.chargingSessions, `${baseFileName}_charging.csv`);
    };

    return (
        <div className="flex flex-wrap gap-4">
            <button onClick={handleExportTrips} className="flex items-center gap-2 px-4 py-2 bg-tesla-gray-500 text-white rounded-md hover:bg-opacity-80 transition-colors">
                <Download size={16} /> Export Trips (CSV)
            </button>
            <button onClick={handleExportCharging} className="flex items-center gap-2 px-4 py-2 bg-tesla-gray-500 text-white rounded-md hover:bg-opacity-80 transition-colors">
                <Download size={16} /> Export Charging (CSV)
            </button>
            <button onClick={() => exportToTxt(analysis, `${baseFileName}_summary.txt`, unitSystem)} className="flex items-center gap-2 px-4 py-2 bg-tesla-gray-500 text-white rounded-md hover:bg-opacity-80 transition-colors">
                <Download size={16} /> Export Summary (TXT)
            </button>
            <button onClick={handleExportImage} className="flex items-center gap-2 px-4 py-2 bg-tesla-blue text-white rounded-md hover:bg-opacity-80 transition-colors">
                <Download size={16} /> Download Dashboard (PNG)
            </button>
        </div>
    );
};
