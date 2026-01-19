import React, { useEffect, useRef } from 'react'
import { Card, Radio, Typography } from '@arco-design/web-react'
import * as echarts from 'echarts'
import type { TrendDataPoint } from '../types'
import { TrendAnalysisResult } from '../utils/trendAnalysis'

const { Text } = Typography

export const TIME_RANGES = [
    { value: 'all', label: '全周期' },
    { value: '7d', label: '近7天' },
    { value: '72h', label: '近72小时' },
    { value: '24h', label: '近24小时' },
]

interface TrendChartProps {
    data: TrendDataPoint[]
    loading: boolean
    hasDailyFiles: boolean
    timeRange: string
    onTimeRangeChange: (value: string) => void
    analysis: TrendAnalysisResult
}

const TrendChart: React.FC<TrendChartProps> = ({
    data,
    loading,
    hasDailyFiles,
    timeRange,
    onTimeRangeChange,
    analysis
}) => {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)

    useEffect(() => {
        if (!hasDailyFiles || loading || !chartRef.current || !data.length) return

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
                        const prevVal = data[prevIndex]?.applicants || 0
                        const diff = val - prevVal
                        const sign = diff > 0 ? '+' : ''
                        growText = `<br/><span style="color:${diff > 0 ? '#ff4d4f' : '#fff'}">较前日: ${sign}${diff.toLocaleString()}</span>`
                    }
                    return `${date}<br/>报名人数: <b>${val.toLocaleString()}</b>${growText}`
                }
            },
            xAxis: {
                type: 'category',
                data: data.map((d) => d.date),
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
                    data: data.map((d) => d.applicants),
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: data.length <= 7 ? 8 : 6,
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

        let resizeTimer: ReturnType<typeof setTimeout> | null = null
        const handleResize = (): void => {
            if (resizeTimer) clearTimeout(resizeTimer)
            resizeTimer = setTimeout(() => chart?.resize(), 200)
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (resizeTimer) clearTimeout(resizeTimer)
            if (chartInstance.current) {
                chartInstance.current.dispose()
                chartInstance.current = null
            }
        }
    }, [loading, hasDailyFiles, data])

    if (hasDailyFiles && data.length > 0) {
        return (
            <Card
                bordered={false}
                className="glass-card-arco trend-card"
                style={{ marginTop: 24 }}
                title="报名趋势"
            >
                <div className="trend-time-switcher">
                    <Radio.Group
                        type="button"
                        size="small"
                        value={timeRange}
                        onChange={onTimeRangeChange}
                    >
                        {TIME_RANGES.map(r => (
                            <Radio key={r.value} value={r.value}>{r.label}</Radio>
                        ))}
                    </Radio.Group>
                </div>

                <div className="trend-analysis-bar" style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: analysis.type === 'error' ? 'rgba(255, 77, 79, 0.1)'
                        : analysis.type === 'warning' ? 'rgba(255, 122, 69, 0.1)'
                            : analysis.type === 'success' ? 'rgba(82, 196, 26, 0.1)'
                                : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${analysis.type === 'error' ? 'rgba(255, 77, 79, 0.2)'
                        : analysis.type === 'warning' ? 'rgba(255, 122, 69, 0.2)'
                            : analysis.type === 'success' ? 'rgba(82, 196, 26, 0.2)'
                                : 'rgba(255, 255, 255, 0.1)'
                        }`
                }}>
                    <Text style={{
                        color: analysis.type === 'error' ? '#ff4d4f'
                            : analysis.type === 'warning' ? '#ff7a45'
                                : analysis.type === 'success' ? '#52c41a'
                                    : 'rgba(255,255,255,0.65)'
                    }}>
                        {analysis.icon && <span style={{ marginRight: 8 }}>{analysis.icon}</span>}
                        {analysis.text}
                    </Text>
                </div>
                <div ref={chartRef} style={{ height: 260 }}></div>
            </Card>
        )
    }

    return null
}

export default TrendChart
