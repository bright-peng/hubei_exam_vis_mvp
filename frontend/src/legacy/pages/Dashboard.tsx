import React, { useState, useEffect } from 'react'
import * as echarts from 'echarts'
import { getSummary, getHotPositions, getColdPositions, getTrend, getSurgePositions } from '../../api'
import DateSelector from '../../components/DateSelector'
import './Dashboard.css'
import type { Position } from '../../types'

interface SummaryData {
    total_positions: number
    total_quota: number
    total_applicants: number
    daily_files?: string[]
    latest_date?: string
}

interface SurgePosition {
    code: string
    name?: string
    unit?: string
    delta?: number
    applicants_today?: number
}

const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [hotPositions, setHotPositions] = useState<Position[]>([])
    const [coldPositions, setColdPositions] = useState<Position[]>([])
    const [surgePositions, setSurgePositions] = useState<SurgePosition[]>([])
    const [selectedDate, setSelectedDate] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [selectedDate])

    const loadData = async (): Promise<void> => {
        try {
            setLoading(true)
            const promises: Promise<unknown>[] = [
                getSummary(selectedDate),
                getHotPositions(10, selectedDate),
                getColdPositions(10, selectedDate),
            ]

            if (!selectedDate) {
                promises.push(getSurgePositions())
            }

            const results = await Promise.all(promises)
            const summaryData = results[0] as SummaryData
            const hotData = results[1] as { data: Position[] }
            const coldData = results[2] as { data: Position[] }
            const surgeData = !selectedDate ? (results[3] as { data: SurgePosition[] }) : { data: [] }

            setSummary(summaryData)
            setHotPositions(hotData.data || [])
            setColdPositions(coldData.data || [])
            setSurgePositions(surgeData.data?.slice(0, 10) || [])
        } catch (error) {
            console.error('加载数据失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRecordValue = (record: Position, key: string): unknown => {
        return (record as unknown as Record<string, unknown>)[key]
    }

    useEffect(() => {
        if (!summary?.daily_files?.length) return

        getTrend().then((trendData) => {
            const chartDom = document.getElementById('mini-trend-chart')
            if (!chartDom) return

            const chart = echarts.init(chartDom)
            const data = Array.isArray(trendData?.data) ? trendData.data : []

            chart.setOption({
                backgroundColor: 'transparent',
                grid: {
                    left: 40,
                    right: 20,
                    top: 20,
                    bottom: 30,
                },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(26, 26, 46, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    textStyle: { color: '#fff' },
                },
                xAxis: {
                    type: 'category',
                    data: data.map((d: { date: string }) => d.date),
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                    axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
                },
                yAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
                },
                series: [
                    {
                        type: 'line',
                        data: data.map((d: { applicants: number }) => d.applicants),
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
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
                                { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                                { offset: 1, color: 'rgba(102, 126, 234, 0)' },
                            ]),
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
        })
    }, [summary])

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (!summary?.total_positions) {
        return (
            <div className="dashboard">
                <div className="empty-state glass-card">
                    <div className="empty-icon">📁</div>
                    <h2>暂无数据</h2>
                    <p>请先上传职位表和报名数据</p>
                    <a href="/upload" className="btn btn-primary">
                        去上传数据
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h2 className="section-title">📊 招录概况</h2>
                <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
            <div className="stats-grid">
                <div className="glass-card stat-card">
                    <div className="stat-value">{summary.total_positions?.toLocaleString()}</div>
                    <div className="stat-label">招录职位数</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{summary.total_quota?.toLocaleString()}</div>
                    <div className="stat-label">计划招录人数</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{summary.total_applicants?.toLocaleString()}</div>
                    <div className="stat-label">报名人数</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">
                        {summary.total_quota > 0
                            ? (summary.total_applicants / summary.total_quota).toFixed(1)
                            : '0'}
                        <span className="stat-unit">:1</span>
                    </div>
                    <div className="stat-label">平均竞争比</div>
                </div>
            </div>

            {summary.daily_files && summary.daily_files.length > 0 && (
                <div className="glass-card trend-section">
                    <h3 className="section-title">报名趋势</h3>
                    <div id="mini-trend-chart" className="mini-chart"></div>
                </div>
            )}

            <div className="positions-grid">
                {!selectedDate && (
                    <div className="glass-card">
                        <h3 className="section-title">
                            <span className="surge-icon">🚀</span>
                            报名激增 Top 10
                        </h3>
                        <div className="position-list">
                            {surgePositions.length === 0 ? (
                                <div className="empty-list">暂无数据</div>
                            ) : (
                                surgePositions.map((pos, idx) => (
                                    <div key={pos.code || idx} className="position-item">
                                        <div className="position-rank surge">{idx + 1}</div>
                                        <div className="position-info">
                                            <div className="position-name" title={pos.name || pos.unit}>{pos.name || pos.unit}</div>
                                            <div className="position-unit" title={pos.unit || ''}>{pos.unit || ''}</div>
                                            <div className="position-code">{pos.code}</div>
                                        </div>
                                        <div className="position-stats">
                                            <div className="applicants surge-text">+{pos.delta?.toLocaleString() || 0}</div>
                                            <div className="competition">
                                                总{pos.applicants_today?.toLocaleString() || 0}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="glass-card">
                    <h3 className="section-title">
                        <span className="hot-icon">🔥</span>
                        热门岗位 Top 10
                    </h3>
                    <div className="position-list">
                        {hotPositions.length === 0 ? (
                            <div className="empty-list">暂无数据</div>
                        ) : (
                            hotPositions.map((pos, idx) => (
                                <div key={(getRecordValue(pos, '职位代码') as string) || idx} className="position-item">
                                    <div className="position-rank hot">{idx + 1}</div>
                                    <div className="position-info">
                                        <div className="position-name" title={(getRecordValue(pos, '职位名称') as string) || (getRecordValue(pos, '招录机关') as string)}>{(getRecordValue(pos, '职位名称') as string) || (getRecordValue(pos, '招录机关') as string)}</div>
                                        <div className="position-unit" title={(getRecordValue(pos, '用人单位') as string) || ''}>{(getRecordValue(pos, '用人单位') as string) || ''}</div>
                                        <div className="position-code">{getRecordValue(pos, '职位代码') as string}</div>
                                    </div>
                                    <div className="position-stats">
                                        <div className="applicants">{(getRecordValue(pos, '报名人数') as number)?.toLocaleString() || 0}</div>
                                        <div className="competition">
                                            {(getRecordValue(pos, '竞争比') as number)?.toFixed(1) || 0}:1
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <h3 className="section-title">
                        <span className="cold-icon">❄️</span>
                        冷门岗位 Top 10
                    </h3>
                    <div className="position-list">
                        {coldPositions.length === 0 ? (
                            <div className="empty-list">暂无数据</div>
                        ) : (
                            coldPositions.map((pos, idx) => (
                                <div key={(getRecordValue(pos, '职位代码') as string) || idx} className="position-item">
                                    <div className="position-rank cold">{idx + 1}</div>
                                    <div className="position-info">
                                        <div className="position-name" title={(getRecordValue(pos, '职位名称') as string) || (getRecordValue(pos, '招录机关') as string)}>{(getRecordValue(pos, '职位名称') as string) || (getRecordValue(pos, '招录机关') as string)}</div>
                                        <div className="position-unit" title={(getRecordValue(pos, '用人单位') as string) || ''}>{(getRecordValue(pos, '用人单位') as string) || ''}</div>
                                        <div className="position-code">{getRecordValue(pos, '职位代码') as string}</div>
                                    </div>
                                    <div className="position-stats">
                                        <div className="applicants">{(getRecordValue(pos, '报名人数') as number)?.toLocaleString() || 0}</div>
                                        <div className="competition cold-text">
                                            {(getRecordValue(pos, '招录人数') as number) || 1}人
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {summary.latest_date && (
                <div className="update-info">
                    数据更新时间: {summary.latest_date}
                </div>
            )}
        </div>
    )
}

export default Dashboard
