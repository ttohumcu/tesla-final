import { GoogleGenAI } from "@google/genai";
import type { AnalysisResult, UnitSystem } from "../types";

const KM_TO_MI = 0.621371;

export const generateDrivingSummary = async (analysis: AnalysisResult, unitSystem: UnitSystem): Promise<string> => {
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const { summary, trips } = analysis;
  const isImperial = unitSystem === 'imperial';

  const dist = (km: number) => isImperial ? km * KM_TO_MI : km;
  const eff = (kwhkm: number) => isImperial ? kwhkm / KM_TO_MI : kwhkm;
  const labels = {
      distance: isImperial ? 'miles' : 'km',
      efficiency: isImperial ? 'kWh/mi' : 'kWh/km',
  };

  const prompt = `
    You are an expert automotive data analyst specializing in electric vehicles.
    Based on the following Tesla driving data summary, provide a concise, insightful, and easy-to-understand analysis of the user's driving habits.
    Focus on efficiency, trip patterns, and provide one or two actionable tips for improvement.
    The user is viewing data in ${unitSystem} units. All data provided is in their preferred unit system.
    Keep the tone friendly and encouraging. Structure the output with markdown for readability (headings, bullet points).

    **Data Summary:**
    - Overall Efficiency: ${eff(summary.overallEfficiencyKwhKm).toFixed(3)} ${labels.efficiency}
    - Total Distance Driven: ${dist(summary.totalDistanceKm).toFixed(1)} ${labels.distance} over ${summary.totalTrips} trips.
    - Average Trip Distance: ${dist(summary.avgTripDistanceKm).toFixed(1)} ${labels.distance}.
    - Total Charging Sessions: ${summary.totalChargingSessions}.
    - Climate Control Usage: Climate system was on for ${(summary.totalClimateOnRatio * 100).toFixed(1)}% of driving time.

    **Top 3 Longest Trips for Context:**
    ${trips
      .sort((a, b) => b.distanceKm - a.distanceKm)
      .slice(0, 3)
      .map(t => `- Trip: ${dist(t.distanceKm).toFixed(1)} ${labels.distance}, Efficiency: ${eff(t.efficiencyKwhKm).toFixed(3)} ${labels.efficiency}`)
      .join('\n')}

    Generate the analysis now.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to communicate with the AI. Please check your API key and network connection.");
  }
};