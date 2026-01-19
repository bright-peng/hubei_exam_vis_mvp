import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import * as echarts from 'echarts'
import { getTrend, getFilters, getSummary } from '../api'
import './TrendView.css'

interface TrendDataPoint {
    date: string
    applicants: number
    passed?: number
}

interface FiltersData {
    cities: string[]
}

interface SummaryData {
    daily_files?: string[]
}

const TrendView: React.FC = () => {
    const chartRef = useRef<HTMLDivElement>(null)
    const [filters, setFilters] = useState<FiltersData>({ cities: [] })
    const [selectedCity, setSelectedCity] = useState('')
    const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadInitialData()
    }, [])

    const loadInitialData = async (): Promise<void> => {
        try {
            setLoading(true)
            const [filtersData, summaryData] = await Promise.all([
                getFilters(),
                getSummary(),
            ])
            setFilters(filtersData as FiltersData)
            setSummary(summaryData as SummaryData)
            await loadTrend()
        } catch (error) {
            console.error('加载数据失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadTrend = async (city = ''): Promise<void> => {
        try {
            const params = city ? { city } : {}
            const data = await getTrend(params)
            setTrendData(data.data || [])
        } catch (error) {
            console.error('加载趋势数据失败:', error)
        }
    }

    const handleCityChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        const city = e.target.value
        setSelectedCity(city)
        loadTrend(city)
    }

    // 渲染趋势图表
    useEffect(() => {
        if (!chartRef.current || trendData.length === 0) return

        const chart = echarts.init(chartRef.current)

        const dates = trendData.map((d) => d.date)
        const applicants = trendData.map((d) => d.applicants)
        const passed = trendData.map((d) => d.passed || 0)

        // 计算每日增量
        const dailyIncrease = applicants.map((val, idx) => {
            if (idx === 0) return 0
            return val - applicants[idx - 1]
        })

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: selectedCity ? `${selectedCity}报名趋势` : '全省报名趋势',
                left: 'center',
                top: 10,
                textStyle: {
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 600,
                },
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                textStyle: { color: '#fff' },
                axisPointer: {
                    type: 'cross',
                    crossStyle: { color: '#999' },
                },
            },
            legend: {
                data: ['累计报名人数', '审核通过人数', '每日新增'],
                top: 40,
                textStyle: { color: 'rgba(255,255,255,0.7)' },
            },
            grid: {
                left: 60,
                right: 60,
                top: 80,
                bottom: 60,
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
                axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
            },
            yAxis: [
                {
                    type: 'value',
                    name: '人数',
                    nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: { color: 'rgba(255,255,255,0.6)' },
                },
                {
                    type: 'value',
                    name: '每日新增',
                    nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
                    axisLine: { show: false },
                    splitLine: { show: false },
                    axisLabel: { color: 'rgba(255,255,255,0.6)' },
                },
            ],
            series: [
                {
                    name: '累计报名人数',
                    type: 'line',
                    data: applicants,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#667eea' },
                            { offset: 1, color: '#764ba2' },
                        ]),
                        width: 3,
                    },
                    itemStyle: {
                        color: '#667eea',
                        borderColor: '#fff',
                        borderWidth: 2,
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(102, 126, 234, 0.4)' },
                            { offset: 1, color: 'rgba(102, 126, 234, 0)' },
                        ]),
                    },
                },
                {
                    name: '审核通过人数',
                    type: 'line',
                    data: passed,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        color: '#10b981',
                        width: 2,
                    },
                    itemStyle: {
                        color: '#10b981',
                        borderColor: '#fff',
                        borderWidth: 2,
                    },
                },
                {
                    name: '每日新增',
                    type: 'bar',
                    yAxisIndex: 1,
                    data: dailyIncrease,
                    barWidth: '40%',
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(240, 147, 251, 0.8)' },
                            { offset: 1, color: 'rgba(240, 147, 251, 0.2)' },
                        ]),
                        borderRadius: [4, 4, 0, 0],
                    },
                },
            ],
        })

        const handleResize = (): void => { chart.resize() }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.dispose()
        }
    }, [trendData, selectedCity])

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (!summary?.daily_files?.length) {
        return (
            <div className="trend-view">
                <div className="empty-state glass-card">
                    <div className="empty-icon">📈</div>
                    <h2>暂无趋势数据</h2>
                    <p>请先上传每日报名数据</p>
                    <a href="/upload" className="btn btn-primary">
                        去上传数据
                    </a>
                </div>
            </div>
        )
    }

    const latestData = trendData[trendData.length - 1]
    const prevData = trendData[trendData.length - 2]
    const todayIncrease = prevData ? (latestData?.applicants || 0) - (prevData?.applicants || 0) : 0
    const avgDailyGrowth = trendData.length > 1
        ? Math.round(
            trendData.reduce((sum, d, i) => {
                if (i === 0) return 0
                return sum + (d.applicants - trendData[i - 1].applicants)
            }, 0) / (trendData.length - 1)
        )
        : 0

    return (
        <div className="trend-view fade-in">
            {/* 筛选器 */}
            <div className="filter-bar glass-card">
                <div className="filter-item">
                    <label>选择地区</label>
                    <select
                        className="select"
                        value={selectedCity}
                        onChange={handleCityChange}
                    >
                        <option value="">全省</option>
                        {filters.cities?.map((city) => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-info">
                    <span>📅 数据日期范围: </span>
                    <strong>
                        {summary.daily_files?.[0]} ~ {summary.daily_files?.[summary.daily_files.length - 1]}
                    </strong>
                    <span> ({summary.daily_files?.length}天)</span>
                </div>
            </div>

            {/* 趋势统计卡片 */}
            <div className="trend-stats">
                <div className="glass-card stat-mini">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">{latestData?.applicants?.toLocaleString() || 0}</div>
                        <div className="stat-label">最新报名总数</div>
                    </div>
                </div>
                <div className="glass-card stat-mini">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <div className="stat-value">{todayIncrease.toLocaleString()}</div>
                        <div className="stat-label">今日新增</div>
                    </div>
                </div>
                <div className="glass-card stat-mini">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{latestData?.passed?.toLocaleString() || 0}</div>
                        <div className="stat-label">审核通过</div>
                    </div>
                </div>
                <div className="glass-card stat-mini">
                    <div className="stat-icon">📉</div>
                    <div className="stat-content">
                        <div className="stat-value">{avgDailyGrowth.toLocaleString()}</div>
                        <div className="stat-label">日均增长</div>
                    </div>
                </div>
            </div>

            {/* 趋势图表 */}
            <div className="glass-card chart-container">
                <div ref={chartRef} className="trend-chart"></div>
            </div>

            {/* 数据表格 */}
            <div className="glass-card">
                <h3 className="section-title">每日数据明细</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>累计报名</th>
                                <th>审核通过</th>
                                <th>通过率</th>
                                <th>日增长</th>
                                <th>增长率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...trendData].reverse().map((row, idx) => {
                                const prevRow = trendData[trendData.length - idx - 2]
                                const increase = prevRow ? row.applicants - prevRow.applicants : 0
                                const growthRate = prevRow && prevRow.applicants > 0
                                    ? ((increase / prevRow.applicants) * 100).toFixed(2)
                                    : '0'
                                const passRate = row.applicants > 0
                                    ? (((row.passed || 0) / row.applicants) * 100).toFixed(1)
                                    : '0'

                                return (
                                    <tr key={row.date}>
                                        <td>{row.date}</td>
                                        <td>{row.applicants?.toLocaleString()}</td>
                                        <td>{(row.passed || 0)?.toLocaleString()}</td>
                                        <td>{passRate}%</td>
                                        <td className={increase > 0 ? 'positive' : ''}>
                                            {increase > 0 ? '+' : ''}{increase?.toLocaleString()}
                                        </td>
                                        <td className={increase > 0 ? 'positive' : ''}>
                                            {Number(growthRate) > 0 ? '+' : ''}{growthRate}%
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default TrendView
