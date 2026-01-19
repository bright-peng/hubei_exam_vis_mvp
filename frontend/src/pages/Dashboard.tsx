import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, Grid, Statistic, Space, Typography, Empty, Button, Spin, Tag, Radio } from '@arco-design/web-react'
import { IconFire, IconThunderbolt, IconMoon, IconHome, IconCalendar, IconArrowRise, IconArrowFall } from '@arco-design/web-react/icon'
import * as echarts from 'echarts'
import { getSummary, getHotPositions, getColdPositions, getTrend, getSurgePositions, getAvailableDates } from '../api'
import { getDailyMomentum, DailyMomentumResult, MomentumItem } from '../momentum'
import DateSelector from '../components/DateSelector'
import './Dashboard.css'
import { useNavigate } from 'react-router-dom'
import type { Position } from '../types'

const { Row, Col } = Grid
const { Title, Text } = Typography

interface TrendDataPoint {
    date: string
    applicants: number
}

interface SummaryData {
    total_positions: number
    total_quota: number
    total_applicants: number
    daily_files?: string[]
    latest_date?: string
    date?: string
}

interface SurgePosition {
    name?: string
    unit?: string
    code: string
    delta: number
    applicants_today: number
}

interface TrendAnalysisResult {
    text: string
    type: 'error' | 'warning' | 'success' | 'primary' | 'secondary'
    icon: string | null
}

// Safe accessor for momentum data which might be a number (old cache) or object (new {count, ids})
const getMomentumValue = (data: MomentumItem | number | null | undefined): number => {
    if (typeof data === 'number') return data
    if (data && typeof data === 'object' && 'count' in data) return data.count
    return 0
}

// 时间范围选项
const TIME_RANGES = [
    { value: 'all', label: '全周期' },
    { value: '7d', label: '近7天' },
    { value: '72h', label: '近72小时' },
    { value: '24h', label: '近24小时' },
]

// 智能分析趋势数据，生成语义描述
const analyzeTrend = (data: TrendDataPoint[], timeRange: string): TrendAnalysisResult => {
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
            return { text: '近7日增速有所放缓，竞争压力趋于稳定', type: 'success', icon: '✅' }
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

const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [hotPositions, setHotPositions] = useState<Position[]>([])
    const [coldPositions, setColdPositions] = useState<Position[]>([])
    const [surgePositions, setSurgePositions] = useState<SurgePosition[]>([])
    const [momentum, setMomentum] = useState<DailyMomentumResult | null>(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
    const [timeRange, setTimeRange] = useState('all')
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)
    const navigate = useNavigate()

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

            // Calculate Momentum
            let momentumData: DailyMomentumResult | null = null
            if (summaryData && summaryData.date) {
                try {
                    const allDates = await getAvailableDates()
                    const todayIndex = allDates.indexOf(summaryData.date)
                    if (todayIndex > 0) {
                        const prevDate = allDates[todayIndex - 1]
                        momentumData = await getDailyMomentum(summaryData.date, prevDate)
                    } else {
                        momentumData = await getDailyMomentum(null, null)
                    }
                } catch (e) {
                    console.warn("Momentum calc failed", e)
                    momentumData = await getDailyMomentum(null, null)
                }
            } else {
                momentumData = await getDailyMomentum(null, null)
            }

            setSummary(summaryData)
            setHotPositions(hotData.data || [])
            setColdPositions(coldData.data || [])
            setSurgePositions(surgeData.data?.slice(0, 10) || [])
            setMomentum(momentumData)

            // Load trend data
            const trend = await getTrend()
            setTrendData(Array.isArray(trend?.data) ? trend.data : [])
        } catch (error) {
            console.error('加载数据失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 根据时间范围过滤趋势数据
    const filteredTrendData = useMemo(() => {
        if (!trendData.length) return []

        // 根据日期数量来过滤（因为数据是按天的）
        const daysToKeep = timeRange === '24h' ? 1 : timeRange === '72h' ? 3 : timeRange === '7d' ? 7 : trendData.length
        return trendData.slice(-daysToKeep)
    }, [trendData, timeRange])

    // 趋势分析
    const trendAnalysis = useMemo(() => {
        return analyzeTrend(filteredTrendData, timeRange)
    }, [filteredTrendData, timeRange])

    // 更新图表
    useEffect(() => {
        if (!summary?.daily_files?.length || loading || !chartRef.current || !filteredTrendData.length) return

        // Dispose old instance if exists
        if (chartInstance.current) {
            chartInstance.current.dispose()
        }

        const chart = echarts.init(chartRef.current)
        chartInstance.current = chart

        chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 50, right: 20, top: 20, bottom: 30 },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(26, 26, 46, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                textStyle: { color: '#fff' },
                formatter: (params: echarts.TooltipComponentFormatterCallbackParams) => {
                    const param = Array.isArray(params) ? params[0] : params
                    const date = param.name
                    const val = param.value as number
                    const prevIndex = param.dataIndex - 1
                    let growText = ''
                    if (prevIndex >= 0) {
                        const prevVal = filteredTrendData[prevIndex]?.applicants || 0
                        const diff = val - prevVal
                        const sign = diff > 0 ? '+' : ''
                        growText = `<br/><span style="color:${diff > 0 ? '#ff4d4f' : '#fff'}">较前日: ${sign}${diff.toLocaleString()}</span>`
                    }
                    return `${date}<br/>报名人数: <b>${val.toLocaleString()}</b>${growText}`
                }
            },
            xAxis: {
                type: 'category',
                data: filteredTrendData.map((d) => d.date),
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: {
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 10,
                    formatter: (val: number) => val >= 10000 ? (val / 10000).toFixed(1) + '万' : String(val)
                },
            },
            series: [
                {
                    type: 'line',
                    data: filteredTrendData.map((d) => d.applicants),
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: filteredTrendData.length <= 7 ? 8 : 6,
                    lineStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#667eea' },
                            { offset: 1, color: '#764ba2' },
                        ]),
                        width: 3,
                    },
                    itemStyle: { color: '#667eea', borderColor: '#fff', borderWidth: 2 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                            { offset: 1, color: 'rgba(102, 126, 234, 0)' },
                        ]),
                    },
                },
            ],
        })

        // Debounced resize handler for performance
        let resizeTimer: ReturnType<typeof setTimeout> | null = null
        const handleResize = (): void => {
            if (resizeTimer) clearTimeout(resizeTimer)
            resizeTimer = setTimeout(() => chart?.resize(), 200)
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (resizeTimer) clearTimeout(resizeTimer)
            // Properly dispose chart instance to prevent memory leak
            if (chartInstance.current) {
                chartInstance.current.dispose()
                chartInstance.current = null
            }
        }
    }, [summary, loading, filteredTrendData])

    if (loading && !summary) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spin size={40} /></div>
    }

    if (!summary?.total_positions) {
        return (
            <div className="dashboard-empty-container">
                <Card bordered={false} className="glass-card-arco" style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Empty icon={<IconHome style={{ fontSize: 60, color: 'var(--primary-color)' }} />} description="暂无数据，请先上传数据" />
                    <Button type="primary" style={{ marginTop: 24 }} onClick={() => window.location.href = '/upload'}>去上传</Button>
                </Card>
            </div>
        )
    }

    const getPositionName = (pos: Position): string => {
        return (pos['职位名称'] as string) || (pos['招录机关'] as string) || ''
    }

    const getPositionUnit = (pos: Position): string => {
        return (pos['用人单位'] as string) || ''
    }

    const getPositionCode = (pos: Position): string => {
        return (pos['职位代码'] as string) || ''
    }

    const getPositionApplicants = (pos: Position): number => {
        return (pos['报名人数'] as number) || 0
    }

    const getPositionQuota = (pos: Position): number => {
        return (pos['招录人数'] as number) || 0
    }

    const getPositionRatio = (pos: Position): number => {
        return (pos['竞争比'] as number) || 0
    }

    return (
        <div className="dashboard-arco fade-in">
            <Row justify="space-between" align="center" style={{ marginBottom: 24 }} gutter={[0, 16]}>
                <Col xs={24} sm={12}>
                    <Title heading={4} style={{ margin: 0 }}>📊 招录概况</Title>
                </Col>
                <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                    <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} className="glass-card-arco stat-card-arco">
                        <Statistic title="招录职位" value={summary.total_positions} groupSeparator />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} className="glass-card-arco stat-card-arco">
                        <Statistic title="计划招录" value={summary.total_quota} groupSeparator />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} className="glass-card-arco stat-card-arco">
                        <Statistic title="当前报名" value={summary.total_applicants} groupSeparator />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} className="glass-card-arco stat-card-arco">
                        <Statistic
                            title="平均竞争比"
                            value={summary.total_quota > 0 ? (summary.total_applicants / summary.total_quota).toFixed(1) : '0'}
                            suffix=":1"
                        />
                    </Card>
                </Col>
            </Row>

            {/* 🚀 态势感知模块 (Momentum) */}
            <Title heading={5} style={{ marginTop: 28, marginBottom: 16 }}>
                <Space><IconThunderbolt /> 今日态势</Space>
            </Title>

            {momentum ? (
                <div className="momentum-section">
                    <div className="momentum-card fire" onClick={() => navigate('/list?momentum=surge')}>
                        <div className="m-header">
                            <div className="m-icon"><IconFire /></div>
                            <div className="m-title">今日异常激增</div>
                        </div>
                        <div className="m-value">+{getMomentumValue(momentum.surge)}</div>
                        <div className="m-desc">单日增长超50人</div>
                    </div>
                    <div className="momentum-card warning" onClick={() => navigate('/list?momentum=accelerating')}>
                        <div className="m-header">
                            <div className="m-icon"><IconArrowRise /></div>
                            <div className="m-title">竞争加速</div>
                        </div>
                        <div className="m-value">{getMomentumValue(momentum.accelerating)}</div>
                        <div className="m-desc">热度低位快速抬头</div>
                    </div>
                    <div className="momentum-card safe" onClick={() => navigate('/list?momentum=cooling')}>
                        <div className="m-header">
                            <div className="m-icon"><IconArrowFall /></div>
                            <div className="m-title">增速放缓</div>
                        </div>
                        <div className="m-value">{getMomentumValue(momentum.cooling)}</div>
                        <div className="m-desc">高热度岗位转冷</div>
                    </div>
                </div>
            ) : (
                <div className="momentum-section">
                    <Card className="glass-card-arco" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '10px 0' }}>
                        <Text type="secondary">正在计算今日态势数据... (需至少两天数据)</Text>
                    </Card>
                </div>
            )}

            {/* 📈 报名趋势图 - 带时间切换和语义分析 */}
            {summary.daily_files && summary.daily_files.length > 0 && (
                <Card
                    bordered={false}
                    className="glass-card-arco trend-card"
                    style={{ marginTop: 24 }}
                    title="报名趋势"
                >
                    {/* 时间范围切换器 - 放在卡片内部 */}
                    <div className="trend-time-switcher">
                        <Radio.Group
                            type="button"
                            size="small"
                            value={timeRange}
                            onChange={setTimeRange}
                        >
                            {TIME_RANGES.map(r => (
                                <Radio key={r.value} value={r.value}>{r.label}</Radio>
                            ))}
                        </Radio.Group>
                    </div>
                    {/* 智能分析提示 */}
                    <div className="trend-analysis-bar" style={{
                        marginBottom: 12,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: trendAnalysis.type === 'error' ? 'rgba(255, 77, 79, 0.1)'
                            : trendAnalysis.type === 'warning' ? 'rgba(255, 122, 69, 0.1)'
                                : trendAnalysis.type === 'success' ? 'rgba(82, 196, 26, 0.1)'
                                    : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${trendAnalysis.type === 'error' ? 'rgba(255, 77, 79, 0.2)'
                            : trendAnalysis.type === 'warning' ? 'rgba(255, 122, 69, 0.2)'
                                : trendAnalysis.type === 'success' ? 'rgba(82, 196, 26, 0.2)'
                                    : 'rgba(255, 255, 255, 0.1)'
                            }`
                    }}>
                        <Text style={{
                            color: trendAnalysis.type === 'error' ? '#ff4d4f'
                                : trendAnalysis.type === 'warning' ? '#ff7a45'
                                    : trendAnalysis.type === 'success' ? '#52c41a'
                                        : 'rgba(255,255,255,0.65)'
                        }}>
                            {trendAnalysis.icon && <span style={{ marginRight: 8 }}>{trendAnalysis.icon}</span>}
                            {trendAnalysis.text}
                        </Text>
                    </div>
                    <div ref={chartRef} style={{ height: 260 }}></div>
                </Card>
            )}

            {/* 📊 排行榜区域 */}
            <Title heading={5} style={{ marginTop: 36, marginBottom: 16 }}>
                <Space><IconFire /> 实时排行</Space>
            </Title>

            <Row gutter={[24, 24]}>
                {!selectedDate && (
                    <Col xs={24} md={8}>
                        <Card title={<Space><IconThunderbolt style={{ color: '#f77234' }} />报名激增 Top 10</Space>} bordered={false} className="glass-card-arco list-card-arco">
                            {surgePositions.map((pos, idx) => (
                                <div key={idx} className="rank-item-arco">
                                    <div className={`rank-number-arco rank-${idx + 1}`}>{idx + 1}</div>
                                    <div className="rank-main-arco">
                                        <Text bold ellipsis style={{ width: '100%' }}>{pos.name || pos.unit}</Text>
                                        <Text type="secondary" ellipsis style={{ maxWidth: '100%', fontSize: '12px' }}>{pos.unit}</Text>
                                        <Text style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>{pos.code}</Text>
                                    </div>
                                    <div className="rank-extra-arco">
                                        <Text bold style={{ color: '#f77234' }}>+{pos.delta}</Text>
                                        <Text type="secondary" style={{ fontSize: '10px' }}>总 {pos.applicants_today}</Text>
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </Col>
                )}
                <Col xs={24} md={selectedDate ? 12 : 8}>
                    <Card title={<Space><IconFire style={{ color: '#f53f3f' }} />热门岗位 Top 10</Space>} bordered={false} className="glass-card-arco list-card-arco">
                        {hotPositions.map((pos, idx) => (
                            <div key={idx} className="rank-item-arco">
                                <div className={`rank-number-arco rank-${idx + 1}`}>{idx + 1}</div>
                                <div className="rank-main-arco">
                                    <Text bold ellipsis style={{ width: '100%' }}>{getPositionName(pos)}</Text>
                                    <Text type="secondary" ellipsis style={{ maxWidth: '100%', fontSize: '12px' }}>{getPositionUnit(pos)}</Text>
                                    <Text style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>{getPositionCode(pos)}</Text>
                                </div>
                                <div className="rank-extra-arco">
                                    <Text bold>{getPositionApplicants(pos)}</Text>
                                    <Tag color="red" size="small">{getPositionRatio(pos).toFixed(1)}:1</Tag>
                                </div>
                            </div>
                        ))}
                    </Card>
                </Col>
                <Col xs={24} md={selectedDate ? 12 : 8}>
                    <Card title={<Space><IconMoon style={{ color: '#165dff' }} />冷门岗位 Top 10</Space>} bordered={false} className="glass-card-arco list-card-arco">
                        {coldPositions.map((pos, idx) => (
                            <div key={idx} className="rank-item-arco">
                                <div className={`rank-number-arco rank-${idx + 1}`}>{idx + 1}</div>
                                <div className="rank-main-arco">
                                    <Text bold ellipsis style={{ width: '100%' }}>{getPositionName(pos)}</Text>
                                    <Text type="secondary" ellipsis style={{ maxWidth: '100%', fontSize: '12px' }}>{getPositionUnit(pos)}</Text>
                                    <Text style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>{getPositionCode(pos)}</Text>
                                </div>
                                <div className="rank-extra-arco">
                                    <Text bold>{getPositionApplicants(pos)}</Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>招{getPositionQuota(pos)}</Text>
                                </div>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            {summary.latest_date && (
                <div className="update-time-arco">
                    <IconCalendar /> 数据更新时间: {summary.latest_date}
                </div>
            )}
        </div>
    )
}

export default Dashboard
