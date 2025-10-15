
import React, { useRef } from 'react';
import type { Settings } from '../types';
import { X, Upload, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange,
  backgroundImage,
  onBackgroundImageChange,
}) => {
  if (!isOpen) return null;

  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      [e.target.name]: parseFloat(e.target.value),
    });
  };

  const handleImageUploadClick = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (result: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('Please select a valid image file.');
    }
    // Reset file input to allow re-uploading the same file
    if(e.target) {
        e.target.value = '';
    }
  };
  
  const handleRemoveImage = (callback: (result: string | null) => void) => {
    callback(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] transition-opacity"
      onClick={onClose}
    >
      <div
        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-tesla-gray-600 shadow-2xl p-6 transform transition-transform flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-tesla-gray-200 dark:hover:bg-tesla-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 flex-grow overflow-y-auto pr-2">
          {/* Analysis Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-tesla-gray-200 dark:border-tesla-gray-500 pb-2">Analysis</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="usableBatteryCapacityKwh" className="block text-sm font-medium mb-1">
                  Usable Battery Capacity (kWh)
                </label>
                <input
                  type="number"
                  id="usableBatteryCapacityKwh"
                  name="usableBatteryCapacityKwh"
                  value={settings.usableBatteryCapacityKwh}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                />
              </div>
              <div>
                <label htmlFor="tripMinBreakMinutes" className="block text-sm font-medium mb-1">
                  Trip Break Threshold (minutes)
                </label>
                <input
                  type="number"
                  id="tripMinBreakMinutes"
                  name="tripMinBreakMinutes"
                  value={settings.tripMinBreakMinutes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                />
              </div>
               <div>
                <label htmlFor="powerThresholdKw" className="block text-sm font-medium mb-1">
                  Driving Power Threshold (kW)
                </label>
                <input
                  type="number"
                  id="powerThresholdKw"
                  name="powerThresholdKw"
                  step="0.1"
                  value={settings.powerThresholdKw}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-tesla-gray-100 dark:bg-tesla-gray-500 border border-tesla-gray-300 dark:border-tesla-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tesla-blue"
                />
              </div>
            </div>
            <p className="text-xs text-tesla-gray-400 mt-4">
                Note: Analysis will re-run automatically when settings are changed after the next analysis.
            </p>
          </div>
          
          {/* Appearance Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-tesla-gray-200 dark:border-tesla-gray-500 pb-2">Appearance</h3>
            <div className="space-y-4">
              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Background Image
                </label>
                <input
                  type="file"
                  ref={bgInputRef}
                  onChange={(e) => handleFileChange(e, onBackgroundImageChange)}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleImageUploadClick(bgInputRef)}
                    className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-tesla-blue text-white rounded-md hover:bg-opacity-80 transition-colors"
                  >
                    <Upload size={16} /> Upload Background
                  </button>
                  {backgroundImage && (
                    <button
                      onClick={() => handleRemoveImage(onBackgroundImageChange)}
                      className="p-2 bg-tesla-red text-white rounded-md hover:bg-opacity-80 transition-colors"
                      aria-label="Remove background image"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              {backgroundImage && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Background
                  </label>
                  <div 
                    className="w-full h-24 rounded-md bg-cover bg-center border border-tesla-gray-300 dark:border-tesla-gray-500"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
