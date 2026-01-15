// Helper function to calculate momentum

import axios from 'axios'
import { DATA_KEYS } from './constants'

const USE_STATIC_DATA = import.meta.env.PROD
const API_BASE_URL = 'http://localhost:8000'

export const getDailyMomentum = async (todayDate, yesterdayDate) => {
    // In DEV mode (with backend), use the backend API
    if (!USE_STATIC_DATA) {
        try {
            const res = await axios.get(`${API_BASE_URL}/stats/momentum`)
            return res.data
        } catch (e) {
            console.warn("Backend momentum API failed", e)
            // Return empty data structure
            return {
                surge: { count: 0, ids: [] },
                accelerating: { count: 0, ids: [] },
                cooling: { count: 0, ids: [] }
            }
        }
    }

    // In STATIC/PROD mode, calculate from JSON files
    const runCalculation = async () => {
        try {
            // If no yesterdayDate, try to get dates from summary
            let todayUrl, yesterdayUrl, actualYesterday = yesterdayDate;

            if (!yesterdayDate) {
                // Try to get available dates from summary.json
                try {
                    const summaryRes = await axios.get(import.meta.env.BASE_URL + 'data/summary.json');
                    const dailyFiles = summaryRes.data?.daily_files || [];
                    if (dailyFiles.length >= 2) {
                        // daily_files is usually [oldest, ..., latest], so reverse for [latest, ..., oldest]
                        const sortedDates = [...dailyFiles].sort().reverse();
                        actualYesterday = sortedDates[1]; // Second latest
                        if (!todayDate) {
                            todayDate = sortedDates[0]; // Latest
                        }
                    }
                } catch (e) {
                    console.warn("Could not get dates from summary", e);
                }
            }

            if (!actualYesterday) {
                console.warn("No yesterday date available for momentum calculation");
                return {
                    surge: { count: 0, ids: [] },
                    accelerating: { count: 0, ids: [] },
                    cooling: { count: 0, ids: [] }
                };
            }

            todayUrl = import.meta.env.BASE_URL + (todayDate ? `data/positions_${todayDate}.json` : 'data/positions.json');
            yesterdayUrl = import.meta.env.BASE_URL + `data/positions_${actualYesterday}.json`;

            const [todayRes, yesterdayRes] = await Promise.all([
                axios.get(todayUrl),
                axios.get(yesterdayUrl)
            ]);

            const todayPositions = todayRes.data.data;
            const yesterdayPositions = yesterdayRes.data.data;

            const yesterdayMap = new Map();
            yesterdayPositions.forEach(p => yesterdayMap.set(p[DATA_KEYS.CODE], p[DATA_KEYS.APPLICANTS] || 0));

            const surgeIds = [];
            const acceleratingIds = [];
            const coolingIds = [];

            const SURGE_THRESHOLD = 50;

            todayPositions.forEach(p => {
                const code = p[DATA_KEYS.CODE];
                const todayApp = p[DATA_KEYS.APPLICANTS] || 0;
                const yesterdayApp = yesterdayMap.get(code) || 0;
                const growth = todayApp - yesterdayApp;

                if (growth >= SURGE_THRESHOLD) {
                    surgeIds.push(code);
                }

                if (yesterdayApp < 20 && growth > 5) {
                    acceleratingIds.push(code);
                }

                if (yesterdayApp > 100 && growth < 2) {
                    coolingIds.push(code);
                }
            });

            return {
                surge: { count: surgeIds.length, ids: surgeIds },
                accelerating: { count: acceleratingIds.length, ids: acceleratingIds },
                cooling: { count: coolingIds.length, ids: coolingIds }
            };
        } catch (e) {
            console.warn("Static momentum calc failed, returning empty data", e);
            return {
                surge: { count: 0, ids: [] },
                accelerating: { count: 0, ids: [] },
                cooling: { count: 0, ids: [] }
            };
        }
    }

    return runCalculation();
}

