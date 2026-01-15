import axios from 'axios'
import { DATA_KEYS } from './constants'

// --- 配置区域 ---
// 如果部署到 GitHub Pages (build 模式)，则为 true；本地开发 (dev 模式) 为 false
const USE_STATIC_DATA = import.meta.env.PROD

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
})

// 响应拦截器
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error('API错误:', error)
        return Promise.reject(error)
    }
)

export default api

// --- 静态模式辅助函数 ---
let positionsPromiseCache = {}  // Optimized: Cache promises to handle concurrent requests
let trendPromise = null         // Optimized: Cache promise for trend data

const loadStaticPositions = (date = null) => {
    // If no date specified, use '' as key for default/latest
    const cacheKey = date || ''

    // Return existing promise if request is already in flight or completed
    if (positionsPromiseCache[cacheKey]) return positionsPromiseCache[cacheKey]

    const promise = (async () => {
        try {
            // Load date-specific file if date provided, else load default
            const filename = date ? `positions_${date}.json` : 'positions.json'
            const res = await axios.get(import.meta.env.BASE_URL + 'data/' + filename)
            return res.data.data
        } catch (e) {
            console.error("Failed to load static positions", e)
            // Fallback to default if date-specific file doesn't exist
            if (date && cacheKey !== '') {
                // Check if default is already loading/loaded
                if (!positionsPromiseCache['']) {
                    // Initiate default load if not available
                    positionsPromiseCache[''] = (async () => {
                        const res = await axios.get(import.meta.env.BASE_URL + 'data/positions.json')
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

const loadStaticTrends = () => {
    if (trendPromise) return trendPromise

    trendPromise = (async () => {
        try {
            const res = await axios.get(import.meta.env.BASE_URL + 'data/trends_granular.json')
            return res.data
        } catch (e) {
            console.error("Failed to load static trends", e)
            return { dates: [], trends: {} }
        }
    })()

    return trendPromise
}

// Helper for safe string comparison
const safeStr = (val) => String(val || '').toLowerCase()

// 通用筛选函数
const filterPositions = (data, params) => {
    let result = [...data]

    if (params.city) {
        result = result.filter(p => p[DATA_KEYS.CITY] === params.city)
    }
    if (params.district) {
        // District match might be fuzzy or exact. 
        // In DB we stored full name "江岸区". Frontend passes full name.
        result = result.filter(p => p[DATA_KEYS.DISTRICT_MAP] === params.district || p[DATA_KEYS.DISTRICT] === params.district)
    }
    if (params.education) {
        result = result.filter(p => p[DATA_KEYS.EDUCATION] === params.education)
    }
    if (params.target) {
        result = result.filter(p => p[DATA_KEYS.TARGET] === params.target)
    }
    if (params.keyword) {
        const k = params.keyword.toLowerCase()
        result = result.filter(p =>
            safeStr(p[DATA_KEYS.CODE]).includes(k) ||
            safeStr(p[DATA_KEYS.NAME]).includes(k) ||
            safeStr(p[DATA_KEYS.ORG]).includes(k) ||
            safeStr(p[DATA_KEYS.UNIT]).includes(k) ||
            safeStr(p[DATA_KEYS.CITY]).includes(k) ||
            safeStr(p[DATA_KEYS.DISTRICT]).includes(k) ||
            safeStr(p[DATA_KEYS.EDUCATION]).includes(k) ||
            safeStr(p[DATA_KEYS.DEGREE]).includes(k) ||
            safeStr(p[DATA_KEYS.MAJOR_OLD]).includes(k) || // Back compat
            safeStr(p[DATA_KEYS.MAJOR_UG]).includes(k) ||
            safeStr(p[DATA_KEYS.MAJOR_PG]).includes(k) ||
            safeStr(p[DATA_KEYS.TARGET]).includes(k) ||
            safeStr(p[DATA_KEYS.INTRO]).includes(k) ||
            safeStr(p[DATA_KEYS.NOTES]).includes(k)
        )
    }
    return result
}

// --- API 接口实现 ---

export const uploadPositions = (file) => {
    if (USE_STATIC_DATA) return Promise.reject("静态模式下不支持上传")
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/positions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const uploadDaily = (file, date) => {
    if (USE_STATIC_DATA) return Promise.reject("静态模式下不支持上传")
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/upload/daily?report_date=${date}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const getPositions = async (params) => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(params.date)
        const filtered = filterPositions(all, params)

        // 排序：默认按报名人数降序
        filtered.sort((a, b) => (b[DATA_KEYS.APPLICANTS] || 0) - (a[DATA_KEYS.APPLICANTS] || 0))

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
            page_size: pageSize,
            date: params.date || "最新数据"
        }
    }
    return api.get('/positions', { params })
}

export const getStatsByRegion = async (date) => {
    if (USE_STATIC_DATA) {
        // Compute from positions data for the specified date
        const positions = await loadStaticPositions(date)

        // Group by city
        const cityMap = {}
        positions.forEach(p => {
            const city = p[DATA_KEYS.CITY] || '未知'
            if (!cityMap[city]) {
                cityMap[city] = { name: city, positions: 0, quota: 0, applicants: 0 }
            }
            cityMap[city].positions += 1
            cityMap[city].quota += parseInt(p[DATA_KEYS.QUOTA]) || 0
            cityMap[city].applicants += parseInt(p[DATA_KEYS.APPLICANTS]) || 0
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
    return api.get('/stats/by-region', { params: { date } })
}

export const getTrend = async (params) => {
    if (USE_STATIC_DATA) {
        let url = 'data/trend.json'
        if (params && params.city) {
            url = `data/trend_${params.city}.json`
        }
        const res = await axios.get(import.meta.env.BASE_URL + url)
        return { data: res.data.data }
    }
    return api.get('/stats/trend', { params })
}

export const getHotPositions = async (limit = 20, date = null) => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(date)
        // 按报名人数降序
        const sorted = [...all].sort((a, b) => (b[DATA_KEYS.APPLICANTS] || 0) - (a[DATA_KEYS.APPLICANTS] || 0))
        return {
            data: sorted.slice(0, limit),
            date: date || "最新数据"
        }
    }
    return api.get('/stats/hot-positions', { params: { limit, date } })
}

export const getColdPositions = async (limit = 20, date = null) => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions(date)
        // 按报名人数升序，然后招录人数降序
        const sorted = [...all].sort((a, b) => {
            const diff = (a[DATA_KEYS.APPLICANTS] || 0) - (b[DATA_KEYS.APPLICANTS] || 0)
            if (diff !== 0) return diff
            return (b[DATA_KEYS.QUOTA] || 0) - (a[DATA_KEYS.QUOTA] || 0)
        })
        return {
            data: sorted.slice(0, limit),
            date: date || "最新数据"
        }
    }
    return api.get('/stats/cold-positions', { params: { limit, date } })
}

export const getSummary = async (date) => {
    if (USE_STATIC_DATA) {
        // Always load base summary for daily_files list
        const summaryRes = await axios.get(import.meta.env.BASE_URL + 'data/summary.json')
        const baseSummary = summaryRes.data

        // If a specific date is requested, compute stats from that date's position data
        if (date) {
            const positions = await loadStaticPositions(date)
            const total_positions = positions.length
            const total_quota = positions.reduce((sum, p) => sum + (parseInt(p[DATA_KEYS.QUOTA]) || 0), 0)
            const total_applicants = positions.reduce((sum, p) => sum + (parseInt(p[DATA_KEYS.APPLICANTS]) || 0), 0)

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
    return api.get('/stats/summary', { params: { date } })
}

export const getFilters = async () => {
    if (USE_STATIC_DATA) {
        const res = await axios.get(import.meta.env.BASE_URL + 'data/filters.json')
        return res.data
    }
    return api.get('/filters')
}

export const getAvailableDates = async () => {
    if (USE_STATIC_DATA) {
        const res = await axios.get(import.meta.env.BASE_URL + 'data/summary.json')
        return res.data.daily_files || []
    }
    return api.get('/stats/dates')
}

// 武汉专项接口
export const getWuhanDistricts = async (date) => {
    if (USE_STATIC_DATA) {
        // Compute from positions data for the specified date
        const positions = await loadStaticPositions(date)
        const wuhanPositions = positions.filter(p => p[DATA_KEYS.CITY] === '武汉市')

        // Group by district
        const districtMap = {}
        wuhanPositions.forEach(p => {
            const district = p[DATA_KEYS.DISTRICT_MAP] || '其他'
            if (!districtMap[district]) {
                districtMap[district] = { name: district, positions: 0, quota: 0, applicants: 0 }
            }
            districtMap[district].positions += 1
            districtMap[district].quota += parseInt(p[DATA_KEYS.QUOTA]) || 0
            districtMap[district].applicants += parseInt(p[DATA_KEYS.APPLICANTS]) || 0
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
    return api.get('/stats/wuhan-districts', { params: { date } })
}

export const getWuhanPositions = async (params) => {
    if (USE_STATIC_DATA) {
        // 复用 getPositions 逻辑，但强制城市为武汉
        const newParams = { ...params, city: '武汉市' }
        return getPositions(newParams)
    }
    return api.get('/positions/wuhan', { params })
}

export const getSurgePositions = async () => {
    // In both static and dynamic modes (if crawler ran locally), we rely on the generated JSON file
    // because calculating surge requires heavy SQL comparisons which we put in export_static.py
    try {
        const res = await axios.get(import.meta.env.BASE_URL + 'data/surge.json')
        return res.data
    } catch (e) {
        console.warn("Surge data not found (maybe crawler hasn't run yet)", e)
        return { data: [], wuhan: [] }
    }
}

export const getPositionsByCodes = async (codes) => {
    if (USE_STATIC_DATA) {
        const all = await loadStaticPositions()
        const uniqueCodes = [...new Set(codes)]

        // Find positions
        const filtered = all.filter(p => uniqueCodes.includes(String(p[DATA_KEYS.CODE])))

        // Add trend/competiton info if needed, but getPositionsByCodes usually just returns detailed pos info
        // Main logic in backend: 
        // df = df.merge(daily_df[['职位代码', '报名人数']], on='职位代码', how='left')
        // static data already has latest applicants count in '报名人数'

        // Sort by applicants desc
        filtered.sort((a, b) => (b[DATA_KEYS.APPLICANTS] || 0) - (a[DATA_KEYS.APPLICANTS] || 0))

        // Check not found
        const found = new Set(filtered.map(p => String(p[DATA_KEYS.CODE])))
        const notFound = uniqueCodes.filter(c => !found.has(c))

        return {
            data: filtered,
            total: filtered.length,
            not_found: notFound,
            latest_date: "静态数据"
        }
    }
    return api.post('/positions/by-codes', codes)
}

export const getTrendByCodes = async (codes) => {
    if (USE_STATIC_DATA) {
        const uniqueCodes = [...new Set(codes)]
        const trendData = await loadStaticTrends()
        const allPositions = await loadStaticPositions()

        const dates = trendData.dates || []
        const trends = trendData.trends || {}

        const result = []
        for (const code of uniqueCodes) {
            // Find name
            const pos = allPositions.find(p => String(p[DATA_KEYS.CODE]) === code)
            const name = pos ? (pos[DATA_KEYS.NAME] || code) : code

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
    return api.post('/positions/trend-by-codes', codes)
}
