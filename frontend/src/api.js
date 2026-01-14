import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
})

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error('API错误:', error)
        return Promise.reject(error)
    }
)

export default api

// API接口
export const uploadPositions = (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/positions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const uploadDaily = (file, date) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/upload/daily?report_date=${date}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

export const getPositions = (params) => api.get('/positions', { params })

export const getStatsByRegion = (date) => api.get('/stats/by-region', { params: { date } })

export const getTrend = (params) => api.get('/stats/trend', { params })

export const getHotPositions = (limit = 20) => api.get('/stats/hot-positions', { params: { limit } })

export const getColdPositions = (limit = 20) => api.get('/stats/cold-positions', { params: { limit } })

export const getSummary = (date) => api.get('/stats/summary', { params: { date } })

export const getFilters = () => api.get('/filters')

export const getAvailableDates = () => api.get('/stats/dates')

// 武汉专项接口
export const getWuhanDistricts = (date) => api.get('/stats/wuhan-districts', { params: { date } })
export const getWuhanPositions = (params) => api.get('/positions/wuhan', { params })
