import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { DATA_KEYS } from './constants'
import type { Position, FilterParams, PaginatedResult, RegionStats, Summary, FilterOptions, DistrictStats } from './types'

// --- 配置区域 ---
// 如果部署到 GitHub Pages (build 模式)，则为 true；本地开发 (dev 模式) 为 false
// 注意：如果后端未运行，可以临时设为 true 使用静态数据
const USE_STATIC_DATA = import.meta.env.PROD

const API_BASE_URL = 'http://localhost:8000'

const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
})

// 响应拦截器
api.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    (error) => {
        console.error('API错误:', error)
        return Promise.reject(error)
    }
)

export default api

// --- 类型定义 ---

interface PositionsResponse {
    data: Position[]
    total?: number
    page?: number
    page_size?: number
    latest_date?: string
    date?: string
}

interface RegionStatsResponse {
    cities: RegionStats[]
    date: string
}

interface TrendResponse {
    data: Array<{
        date: string
        applicants: number
    }>
}

interface SummaryResponse extends Summary {
    daily_files?: string[]
    date?: string
}

interface WuhanDistrictsResponse {
    data: DistrictStats[]
    total_positions: number
    total_quota: number
    total_applicants: number
    date: string
}

interface SurgeResponse {
    data: Position[]
    wuhan: Position[]
}

interface PositionsByCodesResponse {
    data: Position[]
    total: number
    not_found: string[]
    latest_date: string
}

interface TrendByCodesResponse {
    positions: Array<{
        code: string
        name: string
        data: number[]
    }>
    dates: string[]
}

interface TrendsGranularData {
    dates: string[]
    trends: Record<string, number[]>
}

interface CodeListCache {
    key: string | null
    data: Position[] | null
    latestDate: string | null
}

// --- 静态模式辅助函数 ---
const positionsPromiseCache: Record<string, Promise<Position[]> | undefined> = {}
let trendPromise: Promise<TrendsGranularData> | null = null

export const loadStaticPositions = (date: string | null = null): Promise<Position[]> => {
    // If no date specified, use '' as key for default/latest
    const cacheKey = date || ''

    // Return existing promise if request is already in flight or completed
    if (positionsPromiseCache[cacheKey]) return positionsPromiseCache[cacheKey]!

    const promise = (async (): Promise<Position[]> => {
        try {
            // Load date-specific file if date provided, else load default
            const filename = date ? `positions_${date}.json` : 'positions.json'
            const res = await axios.get<PositionsResponse>(`${import.meta.env.BASE_URL}data/${filename}?t=${new Date().getTime()}`)
            return res.data.data
        } catch (e) {
            console.error("Failed to load static positions", e)
            // Fallback to default if date-specific file doesn't exist
            if (date && cacheKey !== '') {
                // Check if default is already loading/loaded
                if (!positionsPromiseCache['']) {
                    // Initiate default load if not available
                    positionsPromiseCache[''] = (async () => {
                        const res = await axios.get<PositionsResponse>(`${import.meta.env.BASE_URL}data/positions.json?t=${new Date().getTime()}`)
                        return res.data.data
                    })()
                }
                return positionsPromiseCache['']
            }
            return []
        }
    })()

    positionsPromiseCache[cacheKey] = promise
    return promise
}

const loadStaticTrends = (): Promise<TrendsGranularData> => {
    if (trendPromise) return trendPromise

    trendPromise = (async (): Promise<TrendsGranularData> => {
        try {
            const res = await axios.get<TrendsGranularData>(`${import.meta.env.BASE_URL}data/trends_granular.json?t=${new Date().getTime()}`)
            return res.data
        } catch (e) {
            console.error("Failed to load static trends", e)
            return { dates: [], trends: {} }
        }
    })()

    return trendPromise
}

// Helper for safe string comparison
const safeStr = (val: unknown): string => String(val || '').toLowerCase()

// 通用筛选函数
const filterPositions = (data: Position[], params: FilterParams): Position[] => {
    let result = [...data]

    if (params.city) {
        result = result.filter(p => (p as Record<string, unknown>)[DATA_KEYS.CITY] === params.city)
    }
    if (params.district) {
        // District match might be fuzzy or exact. 
        // In DB we stored full name "江岸区". Frontend passes full name.
        result = result.filter(p => 
            (p as Record<string, unknown>)[DATA_KEYS.DISTRICT_MAP] === params.district || 
            (p as Record<string, unknown>)[DATA_KEYS.DISTRICT] === params.district
        )
    }
    if (params.education) {
        result = result.filter(p => (p as Record<string, unknown>)[DATA_KEYS.EDUCATION] === params.education)
    }
    if ((params as Record<string, unknown>).target) {
        result = result.filter(p => (p as Record<string, unknown>)[DATA_KEYS.TARGET] === (params as Record<string, unknown>).target)
    }
    if (params.keyword) {
        const k = params.keyword.toLowerCase()
        result = result.filter(p => {
            const record = p as Record<string, unknown>
            return safeStr(record[DATA_KEYS.CODE]).includes(k) ||
                safeStr(record[DATA_KEYS.NAME]).includes(k) ||
                safeStr(record[DATA_KEYS.ORG]).includes(k) ||
                safeStr(record[DATA_KEYS.UNIT]).includes(k) ||
                safeStr(record[DATA_KEYS.CITY]).includes(k) ||
                safeStr(record[DATA_KEYS.DISTRICT]).includes(k) ||
                safeStr(record[DATA_KEYS.EDUCATION]).includes(k) ||
                safeStr(record[DATA_KEYS.DEGREE]).includes(k) ||
                safeStr(record[DATA_KEYS.MAJOR_OLD]).includes(k) ||
                safeStr(record[DATA_KEYS.MAJOR_UG]).includes(k) ||
                safeStr(record[DATA_KEYS.MAJOR_PG]).includes(k) ||
                safeStr(record[DATA_KEYS.TARGET]).includes(k) ||
                safeStr(record[DATA_KEYS.INTRO]).includes(k) ||
                safeStr(record[DATA_KEYS.NOTES]).includes(k)
        })
    }
    if (params.codeList && params.codeList.length > 0) {
        const codeSet = new Set(params.codeList.map(String))
        result = result.filter(p => codeSet.has(String((p as Record<string, unknown>)[DATA_KEYS.CODE])))
    }
    return result
}

// --- API 接口实现 ---

export const uploadPositions = (file: File): Promise<unknown> => {
    if (USE_STATIC_DATA) return Promise.reject("静态模式下不支持上传")
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/positions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const uploadDaily = (file: File, date: string): Promise<unknown> => {
    if (USE_STATIC_DATA) return Promise.reject("静态模式下不支持上传")
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/upload/daily?report_date=${date}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

// Cache for codeList requests to avoid re-fetching on pagination
let codeListCache: CodeListCache = {
    key: null,
    data: null,
    latestDate: null
}

interface GetPositionsParams extends FilterParams {
    date?: string
    page?: number
    page_size?: number
}

export const getPositions = async (params: GetPositionsParams): Promise<PaginatedResult<Position>> => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(params.date || null)
        const filtered = filterPositions(all, params)

        // 排序：默认按报名人数降序
        filtered.sort((a, b) => {
            const aVal = ((a as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            const bVal = ((b as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            return bVal - aVal
        })

        // 分页
        const page = params.page || 1
        const pageSize = params.page_size || 50
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const pageData = filtered.slice(start, end)

        return {
            data: pageData,
            total: filtered.length,
            page: page,
            pageSize: pageSize,
            latestDate: params.date || "最新数据"
        }
    }

    // Dynamic mode fix: If requesting specific codes, use the POST endpoint
    // Cache result to avoid re-fetching on pagination
    if (params.codeList && params.codeList.length > 0) {
        // Generate cache key from sorted codeList
        const cacheKey = [...params.codeList].sort().join(',')

        let allData: Position[]
        let latestDate: string | null

        // Check cache
        if (codeListCache.key === cacheKey && codeListCache.data) {
            allData = codeListCache.data
            latestDate = codeListCache.latestDate
        } else {
            // Fetch from backend and cache
            const result = await api.post<PositionsByCodesResponse>('/positions/by-codes', params.codeList)
            const typedResult = result as unknown as PositionsByCodesResponse
            allData = typedResult.data || []
            latestDate = typedResult.latest_date

            // Store in cache
            codeListCache = {
                key: cacheKey,
                data: allData,
                latestDate: latestDate
            }
        }

        // Client-side pagination
        const page = params.page || 1
        const pageSize = params.page_size || 20
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const pageData = allData.slice(start, end)

        return {
            data: pageData,
            total: allData.length,
            page: page,
            pageSize: pageSize,
            latestDate: latestDate || "最新数据"
        }
    }

    return api.get('/positions', { params }) as unknown as PaginatedResult<Position>
}

// Clear codeList cache (call this when navigating away from momentum filter)
export const clearCodeListCache = (): void => {
    codeListCache = { key: null, data: null, latestDate: null }
}

export const getStatsByRegion = async (date?: string | null): Promise<RegionStatsResponse> => {
    if (USE_STATIC_DATA) {
        // Compute from positions data for the specified date
        const positions = await loadStaticPositions(date || null)

        // Group by city
        const cityMap: Record<string, RegionStats> = {}
        positions.forEach(p => {
            const record = p as Record<string, unknown>
            const city = (record[DATA_KEYS.CITY] as string) || '未知'
            if (!cityMap[city]) {
                cityMap[city] = { name: city, positions: 0, quota: 0, applicants: 0, competition_ratio: 0 }
            }
            cityMap[city].positions += 1
            cityMap[city].quota += parseInt(String(record[DATA_KEYS.QUOTA])) || 0
            cityMap[city].applicants += parseInt(String(record[DATA_KEYS.APPLICANTS])) || 0
        })

        const cities = Object.values(cityMap)
        cities.forEach(c => {
            c.competition_ratio = c.quota > 0 ? Math.round((c.applicants / c.quota) * 10) / 10 : 0
        })

        return {
            cities: cities,
            date: date || '最新数据'
        }
    }
    return api.get('/stats/by-region', { params: { date } }) as unknown as RegionStatsResponse
}

export const getTrend = async (params?: { city?: string }): Promise<TrendResponse> => {
    if (USE_STATIC_DATA) {
        let url = 'data/trend.json'
        if (params && params.city) {
            url = `data/trend_${params.city}.json`
        }
        const res = await axios.get<{ data: TrendResponse['data'] }>(`${import.meta.env.BASE_URL}${url}?t=${new Date().getTime()}`)
        return { data: res.data.data }
    }
    return api.get('/stats/trend', { params }) as unknown as TrendResponse
}

export const getHotPositions = async (limit = 20, date: string | null = null): Promise<PositionsResponse> => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(date)
        // 按报名人数降序
        const sorted = [...all].sort((a, b) => {
            const aVal = ((a as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            const bVal = ((b as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            return bVal - aVal
        })
        return {
            data: sorted.slice(0, limit),
            date: date || "最新数据"
        }
    }
    return api.get('/stats/hot-positions', { params: { limit, date } }) as unknown as PositionsResponse
}

export const getColdPositions = async (limit = 20, date: string | null = null): Promise<PositionsResponse> => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(date)
        // 按报名人数升序，然后招录人数降序
        const sorted = [...all].sort((a, b) => {
            const aApp = ((a as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            const bApp = ((b as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            const diff = aApp - bApp
            if (diff !== 0) return diff
            const aQuota = ((a as Record<string, unknown>)[DATA_KEYS.QUOTA] as number) || 0
            const bQuota = ((b as Record<string, unknown>)[DATA_KEYS.QUOTA] as number) || 0
            return bQuota - aQuota
        })
        return {
            data: sorted.slice(0, limit),
            date: date || "最新数据"
        }
    }
    return api.get('/stats/cold-positions', { params: { limit, date } }) as unknown as PositionsResponse
}

export const getSummary = async (date?: string | null): Promise<SummaryResponse> => {
    if (USE_STATIC_DATA) {
        // Always load base summary for daily_files list
        const summaryRes = await axios.get<SummaryResponse>(`${import.meta.env.BASE_URL}data/summary.json?t=${new Date().getTime()}`)
        const baseSummary = summaryRes.data

        // If a specific date is requested, compute stats from that date's position data
        if (date) {
            const positions = await loadStaticPositions(date)
            const total_positions = positions.length
            const total_quota = positions.reduce((sum, p) => {
                return sum + (parseInt(String((p as Record<string, unknown>)[DATA_KEYS.QUOTA])) || 0)
            }, 0)
            const total_applicants = positions.reduce((sum, p) => {
                return sum + (parseInt(String((p as Record<string, unknown>)[DATA_KEYS.APPLICANTS])) || 0)
            }, 0)

            return {
                ...baseSummary,
                total_positions,
                total_quota,
                total_applicants,
                date: date
            }
        }

        return baseSummary
    }
    return api.get('/stats/summary', { params: { date } }) as unknown as SummaryResponse
}

export const getFilters = async (): Promise<FilterOptions> => {
    if (USE_STATIC_DATA) {
        const res = await axios.get<FilterOptions>(`${import.meta.env.BASE_URL}data/filters.json?t=${new Date().getTime()}`)
        return res.data
    }
    return api.get('/filters') as unknown as FilterOptions
}

export const getAvailableDates = async (): Promise<string[]> => {
    if (USE_STATIC_DATA) {
        const res = await axios.get<SummaryResponse>(`${import.meta.env.BASE_URL}data/summary.json?t=${new Date().getTime()}`)
        return res.data.daily_files || []
    }
    return api.get('/stats/dates') as unknown as string[]
}

// 武汉专项接口
export const getWuhanDistricts = async (date?: string | null): Promise<WuhanDistrictsResponse> => {
    if (USE_STATIC_DATA) {
        // Compute from positions data for the specified date
        const positions = await loadStaticPositions(date || null)
        const wuhanPositions = positions.filter(p => (p as Record<string, unknown>)[DATA_KEYS.CITY] === '武汉市')

        // Group by district
        const districtMap: Record<string, DistrictStats> = {}
        wuhanPositions.forEach(p => {
            const record = p as Record<string, unknown>
            const district = (record[DATA_KEYS.DISTRICT_MAP] as string) || '其他'
            if (!districtMap[district]) {
                districtMap[district] = { name: district, positions: 0, quota: 0, applicants: 0, competition_ratio: 0 }
            }
            districtMap[district].positions += 1
            districtMap[district].quota += parseInt(String(record[DATA_KEYS.QUOTA])) || 0
            districtMap[district].applicants += parseInt(String(record[DATA_KEYS.APPLICANTS])) || 0
        })

        const wuhanData = Object.values(districtMap)
        wuhanData.forEach(d => {
            d.competition_ratio = d.quota > 0 ? Math.round((d.applicants / d.quota) * 10) / 10 : 0
        })

        const totalPos = wuhanData.reduce((acc, cur) => acc + cur.positions, 0)
        const totalQuota = wuhanData.reduce((acc, cur) => acc + cur.quota, 0)
        const totalApp = wuhanData.reduce((acc, cur) => acc + cur.applicants, 0)

        return {
            data: wuhanData,
            total_positions: totalPos,
            total_quota: totalQuota,
            total_applicants: totalApp,
            date: date || '最新数据'
        }
    }
    return api.get('/stats/wuhan-districts', { params: { date } }) as unknown as WuhanDistrictsResponse
}

export const getWuhanPositions = async (params: GetPositionsParams): Promise<PaginatedResult<Position>> => {
    if (USE_STATIC_DATA) {
        // 复用 getPositions 逻辑，但强制城市为武汉
        const newParams = { ...params, city: '武汉市' }
        return getPositions(newParams)
    }
    return api.get('/positions/wuhan', { params }) as unknown as PaginatedResult<Position>
}

export const getSurgePositions = async (): Promise<SurgeResponse> => {
    // In both static and dynamic modes (if crawler ran locally), we rely on the generated JSON file
    // because calculating surge requires heavy SQL comparisons which we put in export_static.py
    try {
        const res = await axios.get<SurgeResponse>(`${import.meta.env.BASE_URL}data/surge.json?t=${new Date().getTime()}`)
        return res.data
    } catch (e) {
        console.warn("Surge data not found (maybe crawler hasn't run yet)", e)
        return { data: [], wuhan: [] }
    }
}

export const getPositionsByCodes = async (codes: string[]): Promise<PositionsByCodesResponse> => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions()
        const uniqueCodes = [...new Set(codes)]

        // Find positions
        const filtered = all.filter(p => uniqueCodes.includes(String((p as Record<string, unknown>)[DATA_KEYS.CODE])))

        // Sort by applicants desc
        filtered.sort((a, b) => {
            const aVal = ((a as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            const bVal = ((b as Record<string, unknown>)[DATA_KEYS.APPLICANTS] as number) || 0
            return bVal - aVal
        })

        // Check not found
        const found = new Set(filtered.map(p => String((p as Record<string, unknown>)[DATA_KEYS.CODE])))
        const notFound = uniqueCodes.filter(c => !found.has(c))

        return {
            data: filtered,
            total: filtered.length,
            not_found: notFound,
            latest_date: "静态数据"
        }
    }
    return api.post('/positions/by-codes', codes) as unknown as PositionsByCodesResponse
}

export const getTrendByCodes = async (codes: string[]): Promise<TrendByCodesResponse> => {
    if (USE_STATIC_DATA) {
        const uniqueCodes = [...new Set(codes)]
        const trendData = await loadStaticTrends()
        const allPositions = await loadStaticPositions()

        const dates = trendData.dates || []
        const trends = trendData.trends || {}

        const result: Array<{ code: string; name: string; data: number[] }> = []
        for (const code of uniqueCodes) {
            // Find name
            const pos = allPositions.find(p => String((p as Record<string, unknown>)[DATA_KEYS.CODE]) === code)
            const name = pos ? ((pos as Record<string, unknown>)[DATA_KEYS.NAME] as string || code) : code

            // Get data
            const data = trends[code] || new Array(dates.length).fill(0)

            result.push({ code, name, data })
        }

        // Sort by latest value
        result.sort((a, b) => {
            const valA = a.data.length ? a.data[a.data.length - 1] : 0
            const valB = b.data.length ? b.data[b.data.length - 1] : 0
            return valB - valA
        })

        return {
            positions: result,
            dates: dates
        }
    }
    return api.post('/positions/trend-by-codes', codes) as unknown as TrendByCodesResponse
}
