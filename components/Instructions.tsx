import React from 'react';
import { LogIn, Settings, FileText, Download, UploadCloud, X } from 'lucide-react';

interface InstructionsProps {
  onDismiss: () => void;
}

const steps = [
  {
    icon: LogIn,
    title: "Log In to TeslaFi",
    description: "Visit https://www.teslafi.com and sign in with your email and password.",
  },
  {
    icon: Settings,
    title: "Access Data Export Options",
    description: "From the left-hand menu, select 'Settings', then click on 'Account & Data' or 'Data Export'.",
  },
  {
    icon: FileText,
    title: "Choose the Data Type",
    description: "TeslaFi allows you to export different types of data, such as Drive Data or Raw Data. You can choose the date range and data type from a dropdown menu.",
  },
  {
    icon: Download,
    title: "Export the Data",
    description: "Select the data and time period you want, then click the 'Download CSV' button. The file will be downloaded in .csv format.",
  },
  {
    icon: UploadCloud,
    title: "Import to Tesla Log Analyzer",
    description: "Once downloaded, come back here and upload the .csv file to begin your analysis.",
  },
];

export const Instructions: React.FC<InstructionsProps> = ({ onDismiss }) => {
  return (
    <div className="max-w-3xl mx-auto mb-8 p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg relative">
      <button 
        onClick={onDismiss} 
        className="absolute top-3 right-3 p-1.5 rounded-full text-tesla-gray-400 hover:bg-tesla-gray-200 dark:hover:bg-tesla-gray-500 transition-colors"
        aria-label="Dismiss instructions"
      >
        <X size={18} />
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          How to Export Your Data from TeslaFi
        </h2>
        <p className="text-tesla-gray-400 mb-6">
          Follow these steps to download your driving data to use with the analyzer.
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start">
            <div className="flex-shrink-0 flex flex-col items-center mr-4">
                <div className="bg-tesla-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    <step.icon size={16} />
                </div>
                {index < steps.length - 1 && <div className="w-px h-8 bg-tesla-gray-300 dark:bg-tesla-gray-500 mt-2"></div>}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-tesla-dark dark:text-tesla-gray-100">
                Step {index + 1}: {step.title}
              </h3>
              <p className="text-tesla-gray-500 dark:text-tesla-gray-300">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
      
      <div className="mt-6 text-center">
        <button 
          onClick={onDismiss} 
          className="px-6 py-2 bg-tesla-blue text-white font-semibold rounded-md hover:bg-opacity-80 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
