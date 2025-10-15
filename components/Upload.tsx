import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud, File as FileIcon, Trash2, Play, LayoutDashboard } from 'lucide-react';
import { getFileId } from '../App';

interface UploadProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: File) => void;
  onClearAll: () => void;
  onAnalyze: () => void;
  analysisExists: boolean;
  onBackToDashboard: () => void;
}

export const Upload: React.FC<UploadProps> = ({ files, onAddFiles, onRemoveFile, onClearAll, onAnalyze, analysisExists, onBackToDashboard }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateAndAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArray = Array.from(newFiles);

    const validFiles = fileArray.filter(file => 
        file.type === 'text/csv' && file.size <= 200 * 1024 * 1024
    );
    
    if (validFiles.length !== fileArray.length) {
        alert('Please select valid .csv files under 200MB.');
    }

    if (validFiles.length > 0) {
        onAddFiles(validFiles);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  }, [onAddFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    e.target.value = ''; // Reset input to allow re-selecting the same file
  };
  
  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };

  if (files.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center mt-10">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`p-10 border-2 border-dashed rounded-xl transition-colors duration-300 ${
            isDragging ? 'border-tesla-blue bg-blue-500/10' : 'border-tesla-gray-300 dark:border-tesla-gray-500 hover:border-tesla-blue'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
            multiple
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <UploadCloud className="w-16 h-16 text-tesla-gray-400 mb-4" />
            <p className="text-xl font-semibold text-tesla-dark dark:text-white">
              Drop your Tesla log files here or <span className="text-tesla-blue">browse</span>
            </p>
            <p className="text-sm text-tesla-gray-400 mt-1">
              .CSV files only, up to 200MB each. Your files are saved in your browser for next time.
            </p>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto text-center mt-4">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} multiple />
      <div className="p-6 bg-white dark:bg-tesla-gray-600 rounded-xl shadow-lg">
         <h2 className="font-bold mb-3 text-2xl text-gray-900 dark:text-white">File Manager</h2>
         <p className="text-sm text-tesla-gray-400 mb-4">Add or remove files below, then click "Analyze" when you're ready.</p>
        
        <ul className="space-y-2 w-full text-left mb-6">
          {files.map(file => (
              <li key={getFileId(file)} className="flex items-center bg-tesla-gray-100 dark:bg-tesla-gray-500/50 p-2 rounded-md transition-all">
                  <FileIcon className="w-5 h-5 text-tesla-blue mr-3 flex-shrink-0" />
                  <div className="flex-grow truncate">
                      <p className="font-semibold truncate text-sm">{file.name}</p>
                      <p className="text-xs text-tesla-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => onRemoveFile(file)} className="p-2 rounded-full hover:bg-red-500/20 text-tesla-red ml-2" aria-label={`Remove ${file.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
              </li>
          ))}
        </ul>

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleAddFilesClick}
          className={`p-4 border-2 border-dashed rounded-lg transition-colors duration-300 cursor-pointer mb-6 ${
            isDragging ? 'border-tesla-blue bg-blue-500/10' : 'border-tesla-gray-300 dark:border-tesla-gray-500 hover:border-tesla-blue'
          }`}
        >
          <div className="flex items-center justify-center">
            <UploadCloud className="w-6 h-6 text-tesla-gray-400 mr-2" />
            <p className="font-semibold text-tesla-dark dark:text-white">Add More Files...</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          {analysisExists && (
            <button onClick={onBackToDashboard} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-tesla-gray-500 text-white font-semibold rounded-md hover:bg-opacity-80 transition-colors order-first sm:order-none">
              <LayoutDashboard className="w-5 h-5" /> View Dashboard
            </button>
          )}
          <button onClick={onAnalyze} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-tesla-blue text-white font-semibold rounded-md hover:bg-opacity-80 transition-colors">
            <Play className="w-5 h-5" /> Analyze {files.length} File(s)
          </button>
          <button onClick={onClearAll} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-tesla-red text-white rounded-md hover:bg-opacity-80 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
};
