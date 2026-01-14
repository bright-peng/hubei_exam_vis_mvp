import axios from 'axios'

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
let positionsCache = {}  // Changed to object to cache by date
let trendCache = null

const loadStaticPositions = async (date = null) => {
    // If no date specified, use '' as key for default/latest
    const cacheKey = date || ''
    if (positionsCache[cacheKey]) return positionsCache[cacheKey]

    try {
        // Load date-specific file if date provided, else load default
        const filename = date ? `positions_${date}.json` : 'positions.json'
        const res = await axios.get(import.meta.env.BASE_URL + 'data/' + filename)
        positionsCache[cacheKey] = res.data.data
        return positionsCache[cacheKey]
    } catch (e) {
        console.error("Failed to load static positions", e)
        // Fallback to default if date-specific file doesn't exist
        if (date && !positionsCache['']) {
            const res = await axios.get(import.meta.env.BASE_URL + 'data/positions.json')
            positionsCache[''] = res.data.data
            return positionsCache['']
        }
        return positionsCache[''] || []
    }
}

const loadStaticTrends = async () => {
    if (trendCache) return trendCache
    try {
        const res = await axios.get(import.meta.env.BASE_URL + 'data/trends_granular.json')
        trendCache = res.data
        return trendCache
    } catch (e) {
        console.error("Failed to load static trends", e)
        return { dates: [], trends: {} }
    }
}

// 通用筛选函数
const filterPositions = (data, params) => {
    let result = [...data]

    if (params.city) {
        result = result.filter(p => p['城市'] === params.city)
    }
    if (params.district) {
        // District match might be fuzzy or exact. 
        // In DB we stored full name "江岸区". Frontend passes full name.
        result = result.filter(p => p['district'] === params.district || p['区县'] === params.district)
    }
    if (params.education) {
        result = result.filter(p => p['学历'] === params.education)
    }
    if (params.keyword) {
        const k = params.keyword.toLowerCase()
        result = result.filter(p =>
            (p['职位代码'] && String(p['职位代码']).includes(k)) ||
            (p['职位名称'] && p['职位名称'].includes(k)) ||
            (p['招录机关'] && p['招录机关'].includes(k)) ||
            (p['用人单位'] && p['用人单位'].includes(k)) ||
            (p['专业'] && p['专业'].includes(k)) || // Back compat
            (p['本科专业'] && p['本科专业'].includes(k)) ||
            (p['研究生专业'] && p['研究生专业'].includes(k)) ||
            (p['职位简介'] && p['职位简介'].includes(k)) ||
            (p['备注'] && p['备注'].includes(k))
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
        filtered.sort((a, b) => (b['报名人数'] || 0) - (a['报名人数'] || 0))

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
        const res = await axios.get(import.meta.env.BASE_URL + 'data/map_data.json')
        return {
            cities: res.data.province,
            date: res.data.date
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
        const sorted = [...all].sort((a, b) => (b['报名人数'] || 0) - (a['报名人数'] || 0))
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
            const diff = (a['报名人数'] || 0) - (b['报名人数'] || 0)
            if (diff !== 0) return diff
            return (b['招录人数'] || 0) - (a['招录人数'] || 0)
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
        const res = await axios.get(import.meta.env.BASE_URL + 'data/summary.json')
        return res.data
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
        const res = await axios.get(import.meta.env.BASE_URL + 'data/map_data.json')
        // 原 API 是返回 { data: [...], total_... }
        // getWuhanDistricts 前端调用: data.data || []
        // 需要计算总计
        const wuhanData = res.data.wuhan
        const totalPos = wuhanData.reduce((acc, cur) => acc + cur.positions, 0)
        const totalQuota = wuhanData.reduce((acc, cur) => acc + cur.quota, 0)
        const totalApp = wuhanData.reduce((acc, cur) => acc + cur.applicants, 0)

        return {
            data: wuhanData,
            total_positions: totalPos,
            total_quota: totalQuota,
            total_applicants: totalApp,
            date: res.data.date
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
        const filtered = all.filter(p => uniqueCodes.includes(String(p['职位代码'])))

        // Add trend/competiton info if needed, but getPositionsByCodes usually just returns detailed pos info
        // Main logic in backend: 
        // df = df.merge(daily_df[['职位代码', '报名人数']], on='职位代码', how='left')
        // static data already has latest applicants count in '报名人数'

        // Sort by applicants desc
        filtered.sort((a, b) => (b['报名人数'] || 0) - (a['报名人数'] || 0))

        // Check not found
        const found = new Set(filtered.map(p => String(p['职位代码'])))
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
            const pos = allPositions.find(p => String(p['职位代码']) === code)
            const name = pos ? (pos['职位名称'] || code) : code

            // Get data
            const data = trends[code] || new Array(dates.length).fill(0)

            result.append ? result.append({ code, name, data }) : result.push({ code, name, data })
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
