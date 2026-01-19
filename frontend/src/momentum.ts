// Helper function to calculate momentum

import axios from 'axios'
import { DATA_KEYS } from './constants'
import type { Position } from './types'

const USE_STATIC_DATA = import.meta.env.PROD
const API_BASE_URL = 'http://localhost:8000'

/** 动量项结构 */
export interface MomentumItem {
    count: number
    ids: string[]
}

/** 动量计算结果 */
export interface DailyMomentumResult {
    surge: MomentumItem
    accelerating: MomentumItem
    cooling: MomentumItem
}

/** 空动量数据 */
const EMPTY_MOMENTUM: DailyMomentumResult = {
    surge: { count: 0, ids: [] },
    accelerating: { count: 0, ids: [] },
    cooling: { count: 0, ids: [] }
}

export const getDailyMomentum = async (
    todayDate?: string | null, 
    yesterdayDate?: string | null
): Promise<DailyMomentumResult> => {
    // In DEV mode (with backend), use the backend API
    if (!USE_STATIC_DATA) {
        try {
            const res = await axios.get<DailyMomentumResult>(`${API_BASE_URL}/stats/momentum`)
            return res.data
        } catch (e) {
            console.warn("Backend momentum API failed", e)
            return { ...EMPTY_MOMENTUM }
        }
    }

    // In STATIC/PROD mode, calculate from JSON files
    const runCalculation = async (): Promise<DailyMomentumResult> => {
        try {
            let currentTodayDate = todayDate
            let actualYesterday = yesterdayDate

            if (!yesterdayDate) {
                // Try to get available dates from summary.json
                try {
                    const summaryRes = await axios.get<{ daily_files?: string[] }>(
                        `${import.meta.env.BASE_URL}data/summary.json?t=${new Date().getTime()}`
                    )
                    const dailyFiles = summaryRes.data?.daily_files || []
                    if (dailyFiles.length >= 2) {
                        // daily_files is usually [oldest, ..., latest], so reverse for [latest, ..., oldest]
                        const sortedDates = [...dailyFiles].sort().reverse()
                        actualYesterday = sortedDates[1] // Second latest
                        if (!currentTodayDate) {
                            currentTodayDate = sortedDates[0] // Latest
                        }
                    }
                } catch (e) {
                    console.warn("Could not get dates from summary", e)
                }
            }

            if (!actualYesterday) {
                console.warn("No yesterday date available for momentum calculation")
                return { ...EMPTY_MOMENTUM }
            }

            let todayUrl = import.meta.env.BASE_URL + 
                (currentTodayDate ? `data/positions_${currentTodayDate}.json` : 'data/positions.json')
            let yesterdayUrl = import.meta.env.BASE_URL + `data/positions_${actualYesterday}.json`

            // Add cache buster
            todayUrl += `?t=${new Date().getTime()}`
            yesterdayUrl += `?t=${new Date().getTime()}`

            interface PositionsResponse {
                data: Position[]
            }

            const [todayRes, yesterdayRes] = await Promise.all([
                axios.get<PositionsResponse>(todayUrl),
                axios.get<PositionsResponse>(yesterdayUrl)
            ])

            const todayPositions = todayRes.data.data
            const yesterdayPositions = yesterdayRes.data.data

            const yesterdayMap = new Map<string, number>()
            yesterdayPositions.forEach(p => {
                const code = p[DATA_KEYS.CODE as keyof Position] as string
                const applicants = (p[DATA_KEYS.APPLICANTS as keyof Position] as number) || 0
                yesterdayMap.set(code, applicants)
            })

            const surgeIds: string[] = []
            const acceleratingIds: string[] = []
            const coolingIds: string[] = []

            const SURGE_THRESHOLD = 50

            todayPositions.forEach(p => {
                const code = p[DATA_KEYS.CODE as keyof Position] as string
                const todayApp = (p[DATA_KEYS.APPLICANTS as keyof Position] as number) || 0
                const yesterdayApp = yesterdayMap.get(code) || 0
                const growth = todayApp - yesterdayApp

                if (growth >= SURGE_THRESHOLD) {
                    surgeIds.push(code)
                }

                if (yesterdayApp < 20 && growth > 5) {
                    acceleratingIds.push(code)
                }

                if (yesterdayApp > 100 && growth < 2) {
                    coolingIds.push(code)
                }
            })

            return {
                surge: { count: surgeIds.length, ids: surgeIds },
                accelerating: { count: acceleratingIds.length, ids: acceleratingIds },
                cooling: { count: coolingIds.length, ids: coolingIds }
            }
        } catch (e) {
            console.warn("Static momentum calc failed, returning empty data", e)
            return { ...EMPTY_MOMENTUM }
        }
    }

    return runCalculation()
}

/**
 * 安全获取动量值，兼容旧版缓存（number）和新版结构（MomentumItem）
 */
export const getMomentumValue = (data: MomentumItem | number | null | undefined): number => {
    if (typeof data === 'number') return data
    if (data && typeof data === 'object' && 'count' in data) return data.count
    return 0
}
