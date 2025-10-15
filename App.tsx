
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sun, Moon, Settings, Loader2, Files, LogOut, UserCircle } from 'lucide-react';
import { Upload } from './components/Upload';
import { Dashboard } from './components/Dashboard';
import { AllTimeDashboard } from './components/AllTimeDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { analyzeMultipleVehicles, parseCsv, filterAnalysisByDate } from './lib/analyzer';
import type { AnalysisResult, CsvRow, Settings as AppSettings, Account, Trip, ChargingSession } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { UnitsProvider, useUnits } from './hooks/useUnits';
import { AccountScreen } from './components/AccountScreen';
import { hashPassword } from './lib/crypto';
import { Instructions } from './components/Instructions';

// --- Google Drive Image Links ---
const HEADER_FOOTER_IMAGE_FILE_ID = '10mm6hi96RYm052iU3705SiFzfvJ-XApB'; // Image for header/footer
const LOGO_IMAGE_FILE_ID = '1ek_NYPI5w-6Bss5Ick9kLy_xhMxUPgyl'; // A different, distinct image for the logo

const HEADER_IMAGE_URL = `https://lh3.googleusercontent.com/d/${HEADER_FOOTER_IMAGE_FILE_ID}`;
const FOOTER_IMAGE_URL = `https://lh3.googleusercontent.com/d/${HEADER_FOOTER_IMAGE_FILE_ID}`;
const LOGO_URL = `https://lh3.googleusercontent.com/d/${LOGO_IMAGE_FILE_ID}`;

// --- IndexedDB Persistence ---
const DB_NAME = 'TeslaAnalyzerDB';
const DB_VERSION = 4; // Incremented DB version
const ACCOUNTS_STORE_NAME = 'accounts';
const DATA_STORE_NAME = 'accountData';

interface AccountData {
  name: string;
  data: {
    files: File[];
    settings: AppSettings;
    backgroundImage: string | null;
    instructionsDismissed?: boolean;
    analyses?: AnalysisResult[] | null;
    // vehicleData has been removed to prevent memory issues on save
    processedFiles?: string[]; // Persists completed files during batch analysis
  };
}

export const getFileId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

const getVehicleIdentifier = (row: CsvRow): string => {
    const vin = row.vin || 'unknown_vin';
    // Use vehicle_name first, then display_name, then a fallback.
    const name = row.vehicle_name || row.display_name || 'Unknown Vehicle';
    // A vehicle is uniquely identified by its VIN and its given name.
    return `${vin}-${name}`;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('IndexedDB error: ' + request.error));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains('csvFiles')) db.deleteObjectStore('csvFiles');
      if (db.objectStoreNames.contains('appConfig')) db.deleteObjectStore('appConfig');
      if (!db.objectStoreNames.contains(ACCOUNTS_STORE_NAME)) {
        db.createObjectStore(ACCOUNTS_STORE_NAME, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME, { keyPath: 'name' });
      }
    };
  });
};

const getAccountsFromDB = async (): Promise<Account[]> => {
    const db = await openDB();
    const transaction = db.transaction(ACCOUNTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ACCOUNTS_STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
};

const saveAccountToDB = async (account: Account): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(ACCOUNTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(ACCOUNTS_STORE_NAME);
    store.put(account);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const getAccountData = async (accountName: string): Promise<AccountData['data'] | null> => {
    const db = await openDB();
    const transaction = db.transaction(DATA_STORE_NAME, 'readonly');
    const store = transaction.objectStore(DATA_STORE_NAME);
    const request: IDBRequest<AccountData> = store.get(accountName);
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
    });
};

const saveAccountData = async (accountName: string, data: Omit<AccountData['data'], 'logoImage'>): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(DATA_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(DATA_STORE_NAME);
    // The data object no longer contains the massive vehicleData property
    store.put({ name: accountName, data });
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Analysis Merging Logic ---
const mergeAnalyses = (currentAnalyses: AnalysisResult[] | null, batchAnalyses: AnalysisResult[]): AnalysisResult[] => {
    if (!currentAnalyses || currentAnalyses.length === 0) return batchAnalyses;

    // FIX: Explicitly type `analysisMap` to ensure type safety after `JSON.parse`.
    const analysisMap = new Map<string, AnalysisResult>(currentAnalyses.map(a => [a.carInfo.id, JSON.parse(JSON.stringify(a))]));

    batchAnalyses.forEach(batchAnalysis => {
        const current = analysisMap.get(batchAnalysis.carInfo.id);
        if (!current) {
            analysisMap.set(batchAnalysis.carInfo.id, batchAnalysis);
        } else {
            // Merge Summary
            const totalMinutes = current.summary.totalDrivingTimeMinutes + batchAnalysis.summary.totalDrivingTimeMinutes;
            current.summary.totalTrips += batchAnalysis.summary.totalTrips;
            current.summary.totalDistanceKm += batchAnalysis.summary.totalDistanceKm;
            current.summary.totalDrivingTimeMinutes = totalMinutes;
            current.summary.totalEnergyConsumedKwh += batchAnalysis.summary.totalEnergyConsumedKwh;
            current.summary.totalChargingSessions += batchAnalysis.summary.totalChargingSessions;
            current.summary.totalEnergyAddedKwh += batchAnalysis.summary.totalEnergyAddedKwh;
            current.summary.maxSpeedEverKph = Math.max(current.summary.maxSpeedEverKph, batchAnalysis.summary.maxSpeedEverKph);
            current.summary.overallEfficiencyKwhKm = current.summary.totalDistanceKm > 0 ? current.summary.totalEnergyConsumedKwh / current.summary.totalDistanceKm : 0;
            current.summary.avgTripDistanceKm = current.summary.totalTrips > 0 ? current.summary.totalDistanceKm / current.summary.totalTrips : 0;
            current.summary.totalClimateOnRatio = (
                (current.summary.totalClimateOnRatio * (totalMinutes - batchAnalysis.summary.totalDrivingTimeMinutes)) +
                (batchAnalysis.summary.totalClimateOnRatio * batchAnalysis.summary.totalDrivingTimeMinutes)
            ) / (totalMinutes || 1);

            // Merge Trips and Charging (with unique IDs)
            const tripIdOffset = current.trips.length;
            const newTrips: Trip[] = batchAnalysis.trips.map(t => ({...t, id: t.id + tripIdOffset }));
            current.trips.push(...newTrips);

            const chargeIdOffset = current.chargingSessions.length;
            const newCharges: ChargingSession[] = batchAnalysis.chargingSessions.map(c => ({...c, id: c.id + chargeIdOffset }));
            current.chargingSessions.push(...newCharges);

            // Merge trips by day/hour
            Object.keys(batchAnalysis.tripsByDay).forEach(day => {
                current.tripsByDay[day] = (current.tripsByDay[day] || 0) + batchAnalysis.tripsByDay[day];
            });
            batchAnalysis.tripsByHour.forEach((count, hour) => {
                current.tripsByHour[hour] = (current.tripsByHour[hour] || 0) + count;
            });
            
            // Merge Car Info
            current.carInfo.startOdometer = Math.min(current.carInfo.startOdometer, batchAnalysis.carInfo.startOdometer);
            current.carInfo.endOdometer = Math.max(current.carInfo.endOdometer, batchAnalysis.carInfo.endOdometer);
            
            // Merge Date Range & Months
            const newStartDate = Math.min(new Date(current.dateRange.start).getTime(), new Date(batchAnalysis.dateRange.start).getTime());
            const newEndDate = Math.max(new Date(current.dateRange.end).getTime(), new Date(batchAnalysis.dateRange.end).getTime());
            current.dateRange.start = new Date(newStartDate).toISOString();
            current.dateRange.end = new Date(newEndDate).toISOString();
            current.carInfo.logDurationDays = Math.round((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
            
            const monthSet = new Set([...current.uniqueMonths, ...batchAnalysis.uniqueMonths]);
            current.uniqueMonths = Array.from(monthSet).sort();
        }
    });

    return Array.from(analysisMap.values());
};

const BATCH_SIZE = 10;
const DOWNSAMPLE_MAX_POINTS = 1500;

const downsampleData = (data: CsvRow[]): CsvRow[] => {
  if (data.length <= DOWNSAMPLE_MAX_POINTS) {
    return data;
  }
  const result: CsvRow[] = [];
  const bucketSize = Math.ceil(data.length / DOWNSAMPLE_MAX_POINTS);
  for (let i = 0; i < data.length; i += bucketSize) {
    result.push(data[i]);
  }
  return result;
};

const AppContent: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [files, setFiles] = useState<File[]>([]);
  const [vehicleData, setVehicleData] = useState<Map<string, CsvRow[]>>(new Map());
  const [monthlyVehicleData, setMonthlyVehicleData] = useState<Map<string, Map<string, CsvRow[]>>>(new Map());
  const [dailyVehicleData, setDailyVehicleData] = useState<Map<string, Map<string, CsvRow[]>>>(new Map());
  const [downsampledVehicleData, setDownsampledVehicleData] = useState<Map<string, CsvRow[]>>(new Map());
  const [downsampledMonthlyVehicleData, setDownsampledMonthlyVehicleData] = useState<Map<string, Map<string, CsvRow[]>>>(new Map());
  const [downsampledDailyVehicleData, setDownsampledDailyVehicleData] = useState<Map<string, Map<string, CsvRow[]>>>(new Map());
  const [analyses, setAnalyses] = useState<AnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'allTime' | 'detailed' | 'fileManager'>('fileManager');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loggedInAccount, setLoggedInAccount] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [instructionsDismissed, setInstructionsDismissed] = useState<boolean>(false);
  
  // Background analysis state
  const [isAnalyzingInBackground, setIsAnalyzingInBackground] = useState<boolean>(false);
  const [filesToAnalyzeQueue, setFilesToAnalyzeQueue] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());
  const [totalFileCount, setTotalFileCount] = useState<number>(0);
  const analysisRunId = useRef<number>(0);
  const [isReconstituting, setIsReconstituting] = useState<boolean>(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const processCsvRows = (rows: any[]): CsvRow[] => {
    return rows
      .map((row: any) => {
        if (!row.date) return null;
        const timestamp = new Date(row.date).getTime();
        if (isNaN(timestamp)) return null;
        return { ...row, timestamp, climate_on: !!row.climate_on };
      })
      .filter((row): row is CsvRow => row !== null);
  };

  const reconstituteVehicleData = useCallback(async (filesToParse: File[]) => {
    if (filesToParse.length === 0) return;
    setIsReconstituting(true);
    
    const newVehicleData = new Map<string, CsvRow[]>();
    const newMonthlyData = new Map<string, Map<string, CsvRow[]>>();
    const newDailyData = new Map<string, Map<string, CsvRow[]>>();
    const chunkSize = 10;

    for (let i = 0; i < filesToParse.length; i += chunkSize) {
        const chunk = filesToParse.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (file) => {
            try {
                const parsed = await parseCsv(file);
                const processedRows = processCsvRows(parsed);
                processedRows.forEach(row => {
                    const vehicleId = getVehicleIdentifier(row);
                    if (!newVehicleData.has(vehicleId)) newVehicleData.set(vehicleId, []);
                    newVehicleData.get(vehicleId)!.push(row);
                    
                    const d = new Date(row.timestamp);
                    const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                    const dayStr = `${monthStr}-${String(d.getUTCDate()).padStart(2, '0')}`;

                    if (!newMonthlyData.has(vehicleId)) newMonthlyData.set(vehicleId, new Map());
                    const vehicleMonthMap = newMonthlyData.get(vehicleId)!;
                    if (!vehicleMonthMap.has(monthStr)) vehicleMonthMap.set(monthStr, []);
                    vehicleMonthMap.get(monthStr)!.push(row);

                    if (!newDailyData.has(vehicleId)) newDailyData.set(vehicleId, new Map());
                    const vehicleDayMap = newDailyData.get(vehicleId)!;
                    if (!vehicleDayMap.has(dayStr)) vehicleDayMap.set(dayStr, []);
                    vehicleDayMap.get(dayStr)!.push(row);
                });
            } catch (err) {
                console.error(`Failed to re-parse file ${file.name} on load`, err);
            }
        }));
        await new Promise(resolve => setTimeout(resolve, 20)); // Yield to main thread
    }
    
    const newDownsampledVehicleData = new Map<string, CsvRow[]>();
    const newDownsampledMonthlyData = new Map<string, Map<string, CsvRow[]>>();
    const newDownsampledDailyData = new Map<string, Map<string, CsvRow[]>>();

    newVehicleData.forEach((rows, vehicleId) => {
        const sortedRows = rows.sort((a,b) => a.timestamp - b.timestamp);
        newVehicleData.set(vehicleId, sortedRows);
        newDownsampledVehicleData.set(vehicleId, downsampleData(sortedRows));
    });

    newMonthlyData.forEach((monthMap, vehicleId) => {
        const downsampledMonthMap = new Map<string, CsvRow[]>();
        monthMap.forEach((rows, monthStr) => {
            const sortedRows = rows.sort((a,b) => a.timestamp - b.timestamp);
            monthMap.set(monthStr, sortedRows);
            downsampledMonthMap.set(monthStr, downsampleData(sortedRows));
        });
        newDownsampledMonthlyData.set(vehicleId, downsampledMonthMap);
    });

    newDailyData.forEach((dayMap, vehicleId) => {
        const downsampledDayMap = new Map<string, CsvRow[]>();
        dayMap.forEach((rows, dayStr) => {
            const sortedRows = rows.sort((a,b) => a.timestamp - b.timestamp);
            dayMap.set(dayStr, sortedRows);
            downsampledDayMap.set(dayStr, downsampleData(sortedRows));
        });
        newDownsampledDailyData.set(vehicleId, downsampledDayMap);
    });

    setVehicleData(newVehicleData);
    setMonthlyVehicleData(newMonthlyData);
    setDailyVehicleData(newDailyData);
    setDownsampledVehicleData(newDownsampledVehicleData);
    setDownsampledMonthlyVehicleData(newDownsampledMonthlyData);
    setDownsampledDailyVehicleData(newDownsampledDailyData);
    setIsReconstituting(false);
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
        setIsLoading(true);
        try {
            const storedAccounts = await getAccountsFromDB();
            setAccounts(storedAccounts);
        } catch (err) {
            console.error("Failed to load accounts from DB", err);
            setError("Could not load account data from your browser's storage.");
        } finally {
            setIsLoading(false);
        }
    };
    loadAccounts();
  }, []);
  
  useEffect(() => {
    if (!loggedInAccount) {
      setIsDataLoaded(false);
      return;
    }

    const loadDataForAccount = async () => {
        setIsLoading(true);
        try {
            const accountData = await getAccountData(loggedInAccount);
            if (accountData) {
                const loadedFiles = accountData.files || [];
                setFiles(loadedFiles);
                setSettings(accountData.settings || DEFAULT_SETTINGS);
                setBackgroundImage(accountData.backgroundImage || null);
                setInstructionsDismissed(accountData.instructionsDismissed || false);
                
                const loadedProcessedFiles = new Set(accountData.processedFiles || []);
                setProcessedFiles(loadedProcessedFiles);
                const filesToProcess = loadedFiles.filter(f => !loadedProcessedFiles.has(getFileId(f)));

                if (accountData.analyses && accountData.analyses.length > 0) {
                    setAnalyses(accountData.analyses);
                    
                    const processedFileObjects = loadedFiles.filter(f => loadedProcessedFiles.has(getFileId(f)));
                    reconstituteVehicleData(processedFileObjects);

                    if (filesToProcess.length > 0) {
                        setFilesToAnalyzeQueue(filesToProcess);
                        setTotalFileCount(loadedFiles.length);
                        setIsAnalyzingInBackground(true);
                        setCurrentView('allTime');
                    } else {
                      setCurrentView('allTime');
                      setSelectedVehicleId(accountData.analyses[0].carInfo.id);
                    }
                } else {
                    resetAnalysisState(false);
                    setCurrentView('fileManager');
                }
            } else {
                resetAnalysisState(false);
                setCurrentView('fileManager');
            }
        } catch (error) {
            console.error("Failed to load account data", error);
            setError("Could not load your data. Please try logging out and in again.");
        } finally {
            setIsLoading(false);
            setIsDataLoaded(true);
        }
    };
    
    loadDataForAccount();
  }, [loggedInAccount, reconstituteVehicleData]);

  // General purpose save
  useEffect(() => {
    if (!loggedInAccount || !isDataLoaded || isAnalyzingInBackground || isProcessing) return;
    
    // FIX: Explicitly type `processedFilesToSave` as `string[]` to resolve a type inference issue.
    const processedFilesToSave: string[] = Array.from(processedFiles);
    const dataToSave = { 
        files, settings, backgroundImage, instructionsDismissed, 
        analyses, processedFiles: processedFilesToSave
    };

    saveAccountData(loggedInAccount, dataToSave).catch(err => {
        console.error("Failed to save account data", err);
    });
  }, [files, settings, backgroundImage, instructionsDismissed, analyses, loggedInAccount, isDataLoaded, isAnalyzingInBackground, isProcessing, processedFiles]);

  const handleCreateAccount = async (email: string, password: string): Promise<boolean> => {
      if (accounts.some(acc => acc.name.toLowerCase() === email.toLowerCase())) {
          return false;
      }
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const hash = await hashPassword(password, salt);
      const newAccount: Account = { name: email, salt, hash };
      
      await saveAccountToDB(newAccount);
      setAccounts(prev => [...prev, newAccount]);
      setLoggedInAccount(email);
      return true;
  };
  
  const resetAnalysisState = (shouldSave: boolean = true) => {
      analysisRunId.current += 1;
      setIsAnalyzingInBackground(false);
      setFilesToAnalyzeQueue([]);
      setProcessedFiles(new Set<string>());
      setTotalFileCount(0);
      setAnalyses(null);
      setVehicleData(new Map<string, CsvRow[]>());
      setMonthlyVehicleData(new Map());
      setDailyVehicleData(new Map());
      setDownsampledVehicleData(new Map());
      setDownsampledMonthlyVehicleData(new Map());
      setDownsampledDailyVehicleData(new Map());
      setError(null);
      setCurrentView('fileManager');
      if (loggedInAccount && shouldSave) {
          const processedFilesToSave = Array.from(new Set<string>());
          const dataToSave = { files, settings, backgroundImage, instructionsDismissed, analyses: null, processedFiles: processedFilesToSave };
          saveAccountData(loggedInAccount, dataToSave);
      }
  };

  const handleLogout = () => {
      setLoggedInAccount(null);
      setFiles([]);
      resetAnalysisState(false);
      setSelectedVehicleId(null);
  };

  const handleDismissInstructions = () => {
    setInstructionsDismissed(true);
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleFilesAdded = (newFiles: File[]) => {
    const existingFileIds = new Set(files.map(getFileId));
    const uniqueNewFiles = newFiles.filter(file => !existingFileIds.has(getFileId(file)));
    if (uniqueNewFiles.length < newFiles.length) alert('Some duplicate files were ignored.');
    if (uniqueNewFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...uniqueNewFiles]);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(f => getFileId(f) !== getFileId(fileToRemove)));
    resetAnalysisState();
  };

  const handleClearAllFiles = async () => {
    setFiles([]);
    resetAnalysisState();
  };
  
  const processBatchAndAnalyze = useCallback(async (
    batch: File[],
    runId: number
  ): Promise<{ batchAnalyses: AnalysisResult[], newVehicleData: Map<string, CsvRow[]> }> => {
    
    const vehicleDataMap = new Map<string, CsvRow[]>();
    
    for (const file of batch) {
        if (runId !== analysisRunId.current) throw new Error('Analysis cancelled');

        const parsed = await parseCsv(file);
        const processedRows = processCsvRows(parsed);
        
        processedRows.forEach(row => {
            const vehicleId = getVehicleIdentifier(row);
            if (!vehicleDataMap.has(vehicleId)) {
                vehicleDataMap.set(vehicleId, []);
            }
            vehicleDataMap.get(vehicleId)!.push(row);
        });
    }

    if (Array.from(vehicleDataMap.values()).every(arr => arr.length === 0)) {
        return { batchAnalyses: [], newVehicleData: vehicleDataMap };
    }

    const totalRows = Array.from(vehicleDataMap.values()).reduce((sum, rows) => sum + rows.length, 0);
    const fileInfo = { name: `${batch.length} files`, sizeMb: batch.reduce((s,f) => s + f.size, 0) / (1024*1024), rows: totalRows };
    const batchAnalyses = analyzeMultipleVehicles(vehicleDataMap, settings, fileInfo);

    if (batchAnalyses.length === 0) {
        console.warn('Analysis of batch resulted in no valid vehicle data.');
    }

    return { batchAnalyses, newVehicleData: vehicleDataMap };
  }, [settings]);
  
  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to analyze.");
      return;
    }
    
    const filesToProcess = files.filter(f => !processedFiles.has(getFileId(f)));
    if (filesToProcess.length === 0) {
        alert("All available files have already been analyzed.");
        setCurrentView('allTime');
        return;
    }

    setIsProcessing(true);
    analysisRunId.current += 1;

    setTotalFileCount(files.length);
    setFilesToAnalyzeQueue(filesToProcess);
    setIsAnalyzingInBackground(true);
    setIsProcessing(false);
  };
  
  useEffect(() => {
    if (!isAnalyzingInBackground || filesToAnalyzeQueue.length === 0 || !loggedInAccount) {
        if (filesToAnalyzeQueue.length === 0 && isAnalyzingInBackground) {
            setIsAnalyzingInBackground(false);
        }
        return;
    }

    const currentRunId = analysisRunId.current;
    let isCancelled = false;
    
    const processNextBatch = async () => {
        const nextBatch = filesToAnalyzeQueue.slice(0, BATCH_SIZE);
        const remainingFiles = filesToAnalyzeQueue.slice(BATCH_SIZE);

        try {
            const { batchAnalyses, newVehicleData } = await processBatchAndAnalyze(nextBatch, currentRunId);
            if (isCancelled) return;

            const updatedAnalyses = mergeAnalyses(analyses, batchAnalyses);
            
            const updatedVehicleData = new Map(vehicleData);
            const updatedMonthlyData = new Map(monthlyVehicleData);
            const updatedDailyData = new Map(dailyVehicleData);
            const updatedDownsampledVehicleData = new Map(downsampledVehicleData);
            const updatedDownsampledMonthlyData = new Map(downsampledMonthlyVehicleData);
            const updatedDownsampledDailyData = new Map(downsampledDailyVehicleData);

            const newRowsByVehicle = new Map<string, CsvRow[]>();
            newVehicleData.forEach((rows, vehicleId) => {
                newRowsByVehicle.set(vehicleId, rows);
            });

            newRowsByVehicle.forEach((newRows, vehicleId) => {
                const existingAllRows = updatedVehicleData.get(vehicleId) || [];
                const updatedAllRows = [...existingAllRows, ...newRows].sort((a, b) => a.timestamp - b.timestamp);
                updatedVehicleData.set(vehicleId, updatedAllRows);
                updatedDownsampledVehicleData.set(vehicleId, downsampleData(updatedAllRows));

                if (!updatedMonthlyData.has(vehicleId)) updatedMonthlyData.set(vehicleId, new Map());
                if (!updatedDownsampledMonthlyData.has(vehicleId)) updatedDownsampledMonthlyData.set(vehicleId, new Map());
                const vehicleMonthMap = updatedMonthlyData.get(vehicleId)!;
                const vehicleDownsampledMonthMap = updatedDownsampledMonthlyData.get(vehicleId)!;

                if (!updatedDailyData.has(vehicleId)) updatedDailyData.set(vehicleId, new Map());
                if (!updatedDownsampledDailyData.has(vehicleId)) updatedDownsampledDailyData.set(vehicleId, new Map());
                const vehicleDayMap = updatedDailyData.get(vehicleId)!;
                const vehicleDownsampledDayMap = updatedDownsampledDailyData.get(vehicleId)!;

                const newRowsByMonth = new Map<string, CsvRow[]>();
                const newRowsByDay = new Map<string, CsvRow[]>();
                newRows.forEach(row => {
                    const d = new Date(row.timestamp);
                    const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                    const dayStr = `${monthStr}-${String(d.getUTCDate()).padStart(2, '0')}`;
                    
                    if (!newRowsByMonth.has(monthStr)) newRowsByMonth.set(monthStr, []);
                    newRowsByMonth.get(monthStr)!.push(row);
                    
                    if (!newRowsByDay.has(dayStr)) newRowsByDay.set(dayStr, []);
                    newRowsByDay.get(dayStr)!.push(row);
                });

                newRowsByMonth.forEach((batchMonthRows, monthStr) => {
                    const existingMonthRows = vehicleMonthMap.get(monthStr) || [];
                    const updatedMonthRows = [...existingMonthRows, ...batchMonthRows].sort((a, b) => a.timestamp - b.timestamp);
                    vehicleMonthMap.set(monthStr, updatedMonthRows);
                    vehicleDownsampledMonthMap.set(monthStr, downsampleData(updatedMonthRows));
                });
                
                newRowsByDay.forEach((batchDayRows, dayStr) => {
                    const existingDayRows = vehicleDayMap.get(dayStr) || [];
                    const updatedDayRows = [...existingDayRows, ...batchDayRows].sort((a, b) => a.timestamp - b.timestamp);
                    vehicleDayMap.set(dayStr, updatedDayRows);
                    vehicleDownsampledDayMap.set(dayStr, downsampleData(updatedDayRows));
                });
            });

            const newlyProcessedIds = nextBatch.map(getFileId);
            const updatedProcessedFiles = new Set(Array.from(processedFiles).concat(newlyProcessedIds));
            
            setAnalyses(updatedAnalyses);
            setVehicleData(updatedVehicleData);
            setMonthlyVehicleData(updatedMonthlyData);
            setDailyVehicleData(updatedDailyData);
            setDownsampledVehicleData(updatedDownsampledVehicleData);
            setDownsampledMonthlyVehicleData(updatedDownsampledMonthlyData);
            setDownsampledDailyVehicleData(updatedDownsampledDailyData);
            setProcessedFiles(updatedProcessedFiles);
            setFilesToAnalyzeQueue(remainingFiles);
            
            if (!selectedVehicleId && updatedAnalyses.length > 0) {
                setSelectedVehicleId(updatedAnalyses[0].carInfo.id);
            }
            if (currentView !== 'allTime' && analyses === null) {
                setCurrentView('allTime');
            }

            const processedFilesToSave: string[] = Array.from(updatedProcessedFiles);
            const dataToSave = { 
                files, settings, backgroundImage, instructionsDismissed, 
                analyses: updatedAnalyses, processedFiles: processedFilesToSave
            };
            await saveAccountData(loggedInAccount, dataToSave);

        } catch (err) {
            if (!isCancelled) {
              console.error("Error in background analysis", err);
              setError(err instanceof Error ? `Analysis failed: ${err.message}` : 'Background analysis failed.');
              setIsAnalyzingInBackground(false);
              setFilesToAnalyzeQueue([]);
            }
        }
    };

    const timeoutId = setTimeout(processNextBatch, 100);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };

  }, [isAnalyzingInBackground, filesToAnalyzeQueue, vehicleData, monthlyVehicleData, dailyVehicleData, downsampledVehicleData, downsampledMonthlyVehicleData, downsampledDailyVehicleData, analyses, processedFiles, processBatchAndAnalyze, loggedInAccount]);
  
  const handleReturnToManager = () => {
    setCurrentView('fileManager');
  };
  
  const { unitSystem, toggleUnitSystem } = useUnits();

  const handleMonthChange = (month: string | null) => {
    setSelectedMonth(month);
    setSelectedDate(null);
    // This ensures that selecting a month (or "All Time") from the dropdown
    // keeps the user on the detailed vehicle view, only changing the filter.
    setCurrentView('detailed');
  };

  const handleReturnToAllTimeDashboard = () => {
    setCurrentView('allTime');
  };

  const handleSelectVehicleForDetail = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    
    const vehicleAnalysis = analyses?.find(a => a.carInfo.id === vehicleId);

    // Default to the most recent month for a better user experience.
    // The filtering performance has been optimized, so this should be fast.
    if (vehicleAnalysis && vehicleAnalysis.uniqueMonths.length > 0) {
      // uniqueMonths is sorted chronologically, so the last one is the most recent.
      const latestMonth = vehicleAnalysis.uniqueMonths[vehicleAnalysis.uniqueMonths.length - 1];
      setSelectedMonth(latestMonth);
    } else {
      // Fallback to "All Time" view if there are no specific months.
      setSelectedMonth(null);
    }

    setSelectedDate(null); // Ensure day filter is reset
    setCurrentView('detailed');
  };
  
  const selectedVehicleAnalysis = useMemo(() => {
    if (!analyses || !selectedVehicleId) return null;
    return analyses.find(a => a.carInfo.id === selectedVehicleId) || null;
  }, [analyses, selectedVehicleId]);
  
  const filteredAnalysis = useMemo(() => {
    if (!selectedVehicleAnalysis || currentView === 'allTime') return selectedVehicleAnalysis;

    if (selectedDate) {
        const date = new Date(selectedDate + 'T00:00:00Z');
        const startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
        return filterAnalysisByDate(selectedVehicleAnalysis, { start: startDate, end: endDate });
    }

    if (selectedMonth) {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        return filterAnalysisByDate(selectedVehicleAnalysis, { start: startDate, end: endDate });
    }
    
    return selectedVehicleAnalysis;
  }, [selectedVehicleAnalysis, selectedMonth, selectedDate, currentView]);

  const downsampledChartData = useMemo(() => {
    if (!selectedVehicleId) return [];

    if (selectedDate) {
        return downsampledDailyVehicleData.get(selectedVehicleId)?.get(selectedDate) || [];
    }

    if (!selectedMonth) {
      return downsampledVehicleData.get(selectedVehicleId) || [];
    }
    
    return downsampledMonthlyVehicleData.get(selectedVehicleId)?.get(selectedMonth) || [];
  }, [selectedVehicleId, selectedMonth, selectedDate, downsampledVehicleData, downsampledMonthlyVehicleData, downsampledDailyVehicleData]);


  const renderContent = () => {
    if (isLoading || isProcessing) return <div className="flex flex-col items-center justify-center h-96 text-center"><Loader2 className="h-12 w-12 animate-spin text-tesla-blue mb-4" /><p className="text-xl font-semibold">{'Loading your data...'}</p><p className="text-tesla-gray-400">Please wait.</p></div>;
    
    if (!loggedInAccount) {
        return <AccountScreen 
                    accounts={accounts} 
                    onLogin={setLoggedInAccount}
                    onCreateAccount={handleCreateAccount}
                />;
    }

    if (error) return <div className="max-w-2xl mx-auto my-8 p-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg text-center"><h3 className="text-lg font-bold text-red-800 dark:text-tesla-red mb-2">An Error Occurred</h3><p className="text-red-600 dark:text-red-300">{error}</p><button onClick={handleClearAllFiles} className="mt-4 px-4 py-2 bg-tesla-blue text-white rounded-md hover:bg-opacity-80 transition-colors">Back to File Manager</button></div>;
    
    if (currentView === 'fileManager') return (
      <>
        {!instructionsDismissed && <Instructions onDismiss={handleDismissInstructions} />}
        <Upload 
            onAddFiles={handleFilesAdded} 
            files={files} 
            onRemoveFile={handleRemoveFile} 
            onClearAll={handleClearAllFiles} 
            onAnalyze={handleStartAnalysis} 
            analysisExists={!!analyses}
            onBackToDashboard={() => setCurrentView('allTime')}
        />
      </>
    );

    if (isAnalyzingInBackground && !analyses) return <div className="flex flex-col items-center justify-center h-96 text-center"><Loader2 className="h-12 w-12 animate-spin text-tesla-blue mb-4" /><p className="text-xl font-semibold">Analyzing your files...</p><p className="text-tesla-gray-400">This may take a moment.</p></div>;
    
    if (isReconstituting && !analyses) return <div className="flex flex-col items-center justify-center h-96 text-center"><Loader2 className="h-12 w-12 animate-spin text-tesla-blue mb-4" /><p className="text-xl font-semibold">Loading dashboard...</p></div>;

    if (analyses && currentView === 'allTime') {
      return <AllTimeDashboard analyses={analyses} onSelectVehicle={handleSelectVehicleForDetail} />;
    }

    if (analyses && currentView === 'detailed' && filteredAnalysis && selectedVehicleAnalysis) {
      if (isReconstituting) {
          // Show dashboard but with an indicator that raw data is loading
          return <>
            <div className="fixed top-20 right-8 bg-yellow-500/90 text-black p-2 text-center text-xs z-[101] flex items-center justify-center gap-2 shadow-lg rounded-md">
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Loading detailed charts...</span>
            </div>
            <Dashboard
              analysis={filteredAnalysis}
              fullAnalysis={selectedVehicleAnalysis}
              allAnalyses={analyses}
              selectedVehicleId={selectedVehicleId!}
              onVehicleChange={setSelectedVehicleId}
              chartData={[]} // Pass empty chart data while reconstituting
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onBackToAllTime={handleReturnToAllTimeDashboard}
            />
          </>
      }
      return (
        <Dashboard
          analysis={filteredAnalysis}
          fullAnalysis={selectedVehicleAnalysis}
          allAnalyses={analyses}
          selectedVehicleId={selectedVehicleId!}
          onVehicleChange={setSelectedVehicleId}
          chartData={downsampledChartData}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onBackToAllTime={handleReturnToAllTimeDashboard}
        />
      );
    }
    
     return <div className="flex flex-col items-center justify-center h-96 text-center"><Loader2 className="h-12 w-12 animate-spin text-tesla-blue mb-4" /><p className="text-xl font-semibold">Loading dashboard...</p></div>;
  };

  const appStyle = backgroundImage ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } : {};

  const headerStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${HEADER_IMAGE_URL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div style={appStyle} className="font-sans">
      <div className="min-h-screen bg-tesla-gray-100/90 dark:bg-tesla-dark/95 text-tesla-gray-500 dark:text-tesla-gray-200 transition-colors duration-300 flex flex-col">
        <header style={headerStyle} className="relative h-[300px] px-6 flex justify-between items-start pt-6 border-b border-tesla-gray-200/50 dark:border-tesla-gray-600/50 sticky top-0 bg-white/80 dark:bg-tesla-dark/80 backdrop-blur-sm z-50">
          <div className="absolute inset-0 flex justify-center pt-16 pointer-events-none">
            <h1 className="text-5xl md:text-6xl font-tesla font-extrabold text-white tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
              Log Analyzer
            </h1>
          </div>
          <div className="flex items-center gap-3 z-10">
            <img src={LOGO_URL} alt="Custom company logo" className="h-36 w-auto object-contain" />
          </div>
          <div className="flex items-center space-x-4">
             {loggedInAccount && (
              <div className="flex items-center gap-2 text-white p-2 rounded-lg bg-black/30">
                <UserCircle className="w-5 h-5"/>
                <span className="font-semibold text-sm truncate max-w-48">{loggedInAccount}</span>
              </div>
             )}
             <div className="flex items-center p-1 rounded-full bg-tesla-gray-200/80 dark:bg-tesla-gray-600/80">
              <button onClick={() => unitSystem !== 'imperial' && toggleUnitSystem()} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${unitSystem === 'imperial' ? 'bg-white dark:bg-tesla-gray-500 text-tesla-dark dark:text-white' : 'text-tesla-gray-400 hover:bg-white/50 dark:hover:bg-tesla-gray-500/50'}`}>mi</button>
              <button onClick={() => unitSystem !== 'metric' && toggleUnitSystem()} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${unitSystem === 'metric' ? 'bg-white dark:bg-tesla-gray-500 text-tesla-dark dark:text-white' : 'text-tesla-gray-400 hover:bg-white/50 dark:hover:bg-tesla-gray-500/50'}`}>km</button>
            </div>
            {analyses && <button onClick={handleReturnToManager} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="Manage Files"><Files className="h-5 w-5" /></button>}
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="Settings"><Settings className="h-5 w-5" /></button>
            <button onClick={toggleTheme} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="Toggle theme">{theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</button>
            {loggedInAccount && <button onClick={handleLogout} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="Logout"><LogOut className="h-5 w-5" /></button>}
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 flex-grow">{renderContent()}</main>
        <footer className="h-[300px] px-6 flex items-center justify-center border-t border-tesla-gray-200 dark:border-tesla-gray-600 bg-white/80 dark:bg-tesla-dark/80 backdrop-blur-sm">
            <img src={FOOTER_IMAGE_URL} alt="Custom footer" className="max-h-[280px] w-auto object-contain" />
        </footer>
        {loggedInAccount && <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          settings={settings} 
          onSettingsChange={setSettings}
          backgroundImage={backgroundImage}
          onBackgroundImageChange={(img) => setBackgroundImage(img)}
        />}
        {isAnalyzingInBackground && (
          <div className="fixed bottom-0 left-0 right-0 bg-tesla-blue text-white p-2 text-center text-sm z-[101] flex items-center justify-center gap-2 shadow-lg">
            <Loader2 className="animate-spin w-4 h-4" />
            <span>Analyzing... ({processedFiles.size} / {totalFileCount} files processed)</span>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <UnitsProvider><AppContent /></UnitsProvider>
);

export default App;
