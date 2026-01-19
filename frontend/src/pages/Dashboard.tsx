import React, { useState, useEffect, useMemo } from 'react'
import { Card, Grid, Statistic, Space, Typography, Empty, Button, Spin, Tag } from '@arco-design/web-react'
import { IconFire, IconThunderbolt, IconMoon, IconHome, IconCalendar, IconArrowRise, IconArrowFall } from '@arco-design/web-react/icon'
import { getSummary, getHotPositions, getColdPositions, getTrend, getSurgePositions, getAvailableDates } from '../api'
import { getDailyMomentum, getMomentumValue, DailyMomentumResult } from '../momentum'
import { analyzeTrend } from '../utils/trendAnalysis'
import { DATA_KEYS } from '../constants'
import DateSelector from '../components/DateSelector'
import TrendChart from '../components/TrendChart'
import './Dashboard.css'
import { useNavigate } from 'react-router-dom'
import type { Position, TrendDataPoint } from '../types'

const { Row, Col } = Grid
const { Title, Text } = Typography

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

    const getPositionName = (pos: Position): string => (pos[DATA_KEYS.NAME] as string) || (pos[DATA_KEYS.ORG] as string) || ''
    const getPositionUnit = (pos: Position): string => (pos[DATA_KEYS.UNIT] as string) || ''
    const getPositionCode = (pos: Position): string => (pos[DATA_KEYS.CODE] as string) || ''
    const getPositionApplicants = (pos: Position): number => (pos[DATA_KEYS.APPLICANTS] as number) || 0
    const getPositionQuota = (pos: Position): number => (pos[DATA_KEYS.QUOTA] as number) || 0
    const getPositionRatio = (pos: Position): number => (pos[DATA_KEYS.RATIO] as number) || 0

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

            {/* 📈 报名趋势图 - 提取为组件 */}
            <TrendChart
                data={filteredTrendData}
                loading={loading}
                hasDailyFiles={!!(summary.daily_files && summary.daily_files.length > 0)}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                analysis={trendAnalysis}
            />

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
