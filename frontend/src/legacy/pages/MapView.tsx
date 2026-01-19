import React, { useState, useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { getStatsByRegion } from '../../api'
import hubeiGeoJson from '../../data/hubei.json'
import DateSelector from '../../components/DateSelector'
import { normalizeCityName } from '../../utils/mapHelper'
import type { RegionStats, MapDataItem } from '../../types'
import './MapView.css'

type ViewMode = 'applicants' | 'positions' | 'competition'

interface RegionData {
    cities: RegionStats[]
}

const MapView: React.FC = () => {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)
    const [regionData, setRegionData] = useState<RegionData | null>(null)
    const [selectedCity, setSelectedCity] = useState<RegionStats | null>(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('applicants')

    useEffect(() => {
        loadData()
    }, [selectedDate])

    const loadData = async (): Promise<void> => {
        try {
            setLoading(true)
            const data = await getStatsByRegion(selectedDate)
            setRegionData(data)
        } catch (error) {
            console.error('加载地区数据失败:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!chartRef.current || !regionData) return

        echarts.registerMap('hubei', hubeiGeoJson as unknown as Parameters<typeof echarts.registerMap>[1])

        const chart = echarts.init(chartRef.current)
        chartInstance.current = chart

        renderMap(chart)

        const handleResize = (): void => { chart.resize() }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.dispose()
        }
    }, [regionData, viewMode])

    const renderMap = (chart: echarts.ECharts): void => {
        if (!regionData?.cities) return

        const mapData: MapDataItem[] = regionData.cities.map((city) => {
            let value: number
            switch (viewMode) {
                case 'positions':
                    value = city.positions || 0
                    break
                case 'competition':
                    value = city.quota > 0 ? parseFloat((city.applicants / city.quota).toFixed(1)) : 0
                    break
                default:
                    value = city.applicants || 0
            }
            return {
                ...city,
                name: normalizeCityName(city.name),
                value: value,
            }
        })

        const maxValue = Math.max(...mapData.map((d) => d.value), 1)

        chart.setOption({
            backgroundColor: 'transparent',
            title: {
                text: '湖北省公务员考试报名分布',
                subtext: viewMode === 'applicants' ? '按报名人数' : viewMode === 'positions' ? '按职位数' : '按竞争比',
                left: 'center',
                top: 20,
                textStyle: {
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 600,
                },
                subtextStyle: {
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                },
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                textStyle: { color: '#fff' },
                formatter: (params: { name?: string; data?: MapDataItem }) => {
                    const data = params.data || {} as MapDataItem
                    return `
            <div style="padding: 8px;">
              <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${params.name || '未知'}</div>
              <div style="display: grid; gap: 4px;">
                <div>📋 职位数: <span style="color: #667eea; font-weight: 600;">${data.positions || 0}</span></div>
                <div>👥 招录人数: <span style="color: #10b981; font-weight: 600;">${data.quota || 0}</span></div>
                <div>✍️ 报名人数: <span style="color: #f59e0b; font-weight: 600;">${data.applicants || 0}</span></div>
                <div>🏆 竞争比: <span style="color: #ef4444; font-weight: 600;">${data.quota > 0 ? (data.applicants / data.quota).toFixed(1) : 0}:1</span></div>
              </div>
            </div>
          `
                },
            },
            visualMap: {
                min: 0,
                max: maxValue,
                left: 20,
                bottom: 20,
                text: ['高', '低'],
                textStyle: { color: 'rgba(255,255,255,0.7)' },
                inRange: {
                    color: ['#1a1a2e', '#2d3561', '#4a5899', '#667eea', '#8b5cf6', '#a855f7'],
                },
                calculable: true,
            },
            series: [
                {
                    type: 'map',
                    map: 'hubei',
                    roam: true,
                    zoom: 1.2,
                    center: [112.3, 31],
                    label: {
                        show: true,
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: 10,
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                        },
                        itemStyle: {
                            areaColor: '#667eea',
                            shadowBlur: 20,
                            shadowColor: 'rgba(102, 126, 234, 0.5)',
                        },
                    },
                    itemStyle: {
                        borderColor: 'rgba(255,255,255,0.2)',
                        borderWidth: 1,
                    },
                    data: mapData,
                },
            ],
        })

        chart.on('click', (params: echarts.ECElementEvent) => {
            if (params.data) {
                setSelectedCity(params.data as RegionStats)
            }
        })
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="map-view fade-in">
            <div className="map-container glass-card">
                <div className="map-header">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'applicants' ? 'active' : ''}`}
                            onClick={() => setViewMode('applicants')}
                        >
                            报名人数
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'positions' ? 'active' : ''}`}
                            onClick={() => setViewMode('positions')}
                        >
                            职位数量
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'competition' ? 'active' : ''}`}
                            onClick={() => setViewMode('competition')}
                        >
                            竞争比
                        </button>
                    </div>
                    <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </div>

                <div ref={chartRef} className="map-chart"></div>
            </div>

            <div className="sidebar">
                {selectedCity ? (
                    <div className="glass-card city-detail">
                        <h3 className="city-name">{selectedCity.name}</h3>
                        <div className="city-stats">
                            <div className="city-stat">
                                <span className="stat-icon">📋</span>
                                <div>
                                    <div className="stat-value">{selectedCity.positions}</div>
                                    <div className="stat-label">职位数</div>
                                </div>
                            </div>
                            <div className="city-stat">
                                <span className="stat-icon">👥</span>
                                <div>
                                    <div className="stat-value">{selectedCity.quota}</div>
                                    <div className="stat-label">招录人数</div>
                                </div>
                            </div>
                            <div className="city-stat">
                                <span className="stat-icon">✍️</span>
                                <div>
                                    <div className="stat-value">{selectedCity.applicants}</div>
                                    <div className="stat-label">报名人数</div>
                                </div>
                            </div>
                            <div className="city-stat">
                                <span className="stat-icon">🏆</span>
                                <div>
                                    <div className="stat-value">
                                        {selectedCity.quota > 0
                                            ? (selectedCity.applicants / selectedCity.quota).toFixed(1)
                                            : 0}
                                        :1
                                    </div>
                                    <div className="stat-label">竞争比</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card hint-card">
                        <p>👆 点击地图上的城市查看详情</p>
                    </div>
                )}

                <div className="glass-card city-list">
                    <h4 className="section-title">各市报名情况</h4>
                    <div className="city-items">
                        {regionData?.cities
                            ?.sort((a, b) => b.applicants - a.applicants)
                            .map((city, idx) => (
                                <div
                                    key={city.name}
                                    className={`city-item ${selectedCity?.name === city.name ? 'selected' : ''}`}
                                    onClick={() => setSelectedCity(city)}
                                >
                                    <span className="city-rank">{idx + 1}</span>
                                    <span className="city-item-name">{city.name}</span>
                                    <span className="city-item-value">{city.applicants}</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MapView
