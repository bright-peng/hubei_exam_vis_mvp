import type { TrendDataPoint } from '../types'

export interface TrendAnalysisResult {
    text: string
    type: 'error' | 'warning' | 'success' | 'primary' | 'secondary'
    icon: string | null
}

// 智能分析趋势数据，生成语义描述
export const analyzeTrend = (data: TrendDataPoint[], timeRange: string): TrendAnalysisResult => {
    if (!data || data.length < 2) {
        return { text: '数据不足，无法分析', type: 'secondary', icon: null }
    }

    // 计算整体增长率
    const first = data[0]?.applicants || 0
    const last = data[data.length - 1]?.applicants || 0
    const totalGrowth = last - first
    const growthRate = first > 0 ? ((last - first) / first * 100).toFixed(1) : '0'

    // 计算斜率（平均每日增长）
    const avgDailyGrowth = Math.round(totalGrowth / Math.max(data.length - 1, 1))

    // 计算近期斜率 vs 早期斜率
    const midPoint = Math.floor(data.length / 2)
    const earlyData = data.slice(0, midPoint)
    const lateData = data.slice(midPoint)

    const earlyGrowth = earlyData.length > 1
        ? ((earlyData[earlyData.length - 1]?.applicants || 0) - (earlyData[0]?.applicants || 0)) / earlyData.length
        : 0
    const lateGrowth = lateData.length > 1
        ? ((lateData[lateData.length - 1]?.applicants || 0) - (lateData[0]?.applicants || 0)) / lateData.length
        : 0

    // 计算最后一天的增长
    const lastDayGrowth = data.length >= 2
        ? (data[data.length - 1]?.applicants || 0) - (data[data.length - 2]?.applicants || 0)
        : 0
    const prevDayGrowth = data.length >= 3
        ? (data[data.length - 2]?.applicants || 0) - (data[data.length - 3]?.applicants || 0)
        : 0

    // 根据时间范围生成不同的分析
    if (timeRange === 'all') {
        if (Number(growthRate) > 50) {
            return { text: `报名人数整体呈快速增长趋势，累计增长 ${growthRate}%`, type: 'warning', icon: '📈' }
        } else if (Number(growthRate) > 10) {
            return { text: `报名人数整体呈稳定增长趋势，累计增长 ${growthRate}%`, type: 'primary', icon: '📊' }
        } else {
            return { text: '报名人数整体保持平稳，暂无明显增长趋势', type: 'secondary', icon: '📉' }
        }
    }

    if (timeRange === '7d') {
        if (lateGrowth > earlyGrowth * 1.5) {
            return { text: `近7日报名增速明显加快，日均新增 ${avgDailyGrowth} 人 ↑`, type: 'error', icon: '🔥' }
        } else if (lateGrowth < earlyGrowth * 0.5 && earlyGrowth > 0) {
            return { text: `近7日增速有所放缓，竞争压力趋于稳定`, type: 'success', icon: '✅' }
        } else {
            return { text: `近7日保持稳定增长，日均新增约 ${avgDailyGrowth} 人`, type: 'primary', icon: '📊' }
        }
    }

    if (timeRange === '72h') {
        if (lateGrowth > earlyGrowth * 1.3) {
            return { text: '近72小时报名增速较前期明显加快（斜率 ↑）', type: 'error', icon: '⚡' }
        } else if (avgDailyGrowth > 1000) {
            return { text: `近72小时持续高速增长，日均 ${avgDailyGrowth} 人`, type: 'warning', icon: '🚀' }
        } else {
            return { text: '近72小时增速平稳，无异常波动', type: 'primary', icon: '📊' }
        }
    }

    if (timeRange === '24h') {
        if (lastDayGrowth > prevDayGrowth * 1.5 && prevDayGrowth > 0) {
            const percentChange = prevDayGrowth > 0 ? Math.round((lastDayGrowth / prevDayGrowth - 1) * 100) : 0
            return { text: `今日出现明显报名集中现象，新增 ${lastDayGrowth} 人（+${percentChange}%）`, type: 'error', icon: '🔺' }
        } else if (lastDayGrowth > avgDailyGrowth * 1.2) {
            return { text: `今日报名热度高于平均，新增 ${lastDayGrowth} 人`, type: 'warning', icon: '📈' }
        } else if (lastDayGrowth < avgDailyGrowth * 0.5) {
            return { text: '今日报名热度较低，可能进入观望期', type: 'success', icon: '💤' }
        } else {
            return { text: `今日报名正常，新增约 ${lastDayGrowth} 人`, type: 'primary', icon: '📊' }
        }
    }

    return { text: '趋势分析中...', type: 'secondary', icon: null }
}
