
import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { generateDrivingSummary } from '../services/geminiService';
import { useUnits } from '../hooks/useUnits';

interface AiSummaryProps {
    analysis: AnalysisResult;
}

export const AiSummary: React.FC<AiSummaryProps> = ({ analysis }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { unitSystem } = useUnits();

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateDrivingSummary(analysis, unitSystem);
            setSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate summary.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 bg-gradient-to-br from-blue-50 dark:from-tesla-blue/20 to-transparent rounded-lg border border-tesla-blue/30">
            <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-tesla-blue" />
                AI Driving Summary
            </h4>
            
            {!summary && !isLoading && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <p className="text-tesla-gray-400 flex-grow">
                        Get a quick, natural language summary of your driving habits and efficiency.
                    </p>
                    <button 
                        onClick={handleGenerateSummary} 
                        className="px-4 py-2 bg-tesla-blue text-white rounded-md hover:bg-opacity-80 transition-colors w-full sm:w-auto flex-shrink-0"
                    >
                        Generate with AI
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-tesla-blue mr-2" />
                    <p>Generating summary...</p>
                </div>
            )}
            
            {error && <p className="text-tesla-red">{error}</p>}

            {summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-tesla-gray-500 dark:text-tesla-gray-300 whitespace-pre-wrap">
                  {summary}
                </div>
            )}
        </div>
    );
};
