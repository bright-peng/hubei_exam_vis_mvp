import React, { useState, useEffect } from 'react';
import { getWuhanDistricts, getWuhanPositions, getSurgePositions } from '../../api';
import DateSelector from '../../components/DateSelector';
import './WuhanView.css';
import type { Position } from '../../types';

interface DistrictConfig {
    name: string;
    x: number;
    y: number;
}

interface DistrictStats {
    name: string;
    positions: number;
    quota: number;
    applicants: number;
    competition_ratio: number;
}

interface SurgeItem {
    code: string;
    name?: string;
    unit?: string;
    district?: string;
    applicants_today?: number;
    delta?: number;
}

interface SummaryData {
    totalPositions: number;
    totalQuota: number;
    totalApplicants: number;
    date?: string;
}

type DisplayMode = 'applicants' | 'positions' | 'ratio';

// 武汉市各区配置
const WUHAN_DISTRICTS: DistrictConfig[] = [
    { name: '江岸区', x: 55, y: 35 },
    { name: '江汉区', x: 48, y: 40 },
    { name: '硚口区', x: 40, y: 42 },
    { name: '汉阳区', x: 38, y: 52 },
    { name: '武昌区', x: 55, y: 50 },
    { name: '青山区', x: 68, y: 45 },
    { name: '洪山区', x: 62, y: 58 },
    { name: '东西湖区', x: 30, y: 30 },
    { name: '汉南区', x: 25, y: 70 },
    { name: '蔡甸区', x: 22, y: 55 },
    { name: '江夏区', x: 55, y: 75 },
    { name: '黄陂区', x: 55, y: 15 },
    { name: '新洲区', x: 78, y: 25 },
    { name: '东湖高新区', x: 70, y: 60 },
    { name: '武汉经开区', x: 32, y: 65 },
    { name: '东湖风景区', x: 65, y: 52 },
    { name: '长江新区', x: 65, y: 20 },
    { name: '市直', x: 50, y: 48 },
];

const WuhanView: React.FC = () => {
    const [districtData, setDistrictData] = useState<DistrictStats[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [wuhanSurge, setWuhanSurge] = useState<SurgeItem[]>([]);
    const [summary, setSummary] = useState<SummaryData>({ totalPositions: 0, totalQuota: 0, totalApplicants: 0 });
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('applicants');
    const [loading, setLoading] = useState(true);
    const [positionsLoading, setPositionsLoading] = useState(false);

    useEffect(() => {
        fetchDistrictStats();
    }, [selectedDate]);

    useEffect(() => {
        if (selectedDistrict) {
            fetchDistrictPositions(selectedDistrict);
        }
    }, [selectedDistrict, selectedDate]);

    const fetchDistrictStats = async (): Promise<void> => {
        setLoading(true);
        try {
            const promises: Promise<unknown>[] = [getWuhanDistricts(selectedDate)];

            if (!selectedDate) {
                promises.push(getSurgePositions());
            }

            const results = await Promise.all(promises);
            const data = results[0] as { data: DistrictStats[]; total_positions: number; total_quota: number; total_applicants: number; date?: string };
            const surgeData = !selectedDate ? (results[1] as { wuhan: SurgeItem[] }) : { wuhan: [] };

            setDistrictData(data.data || []);
            setSummary({
                totalPositions: data.total_positions,
                totalQuota: data.total_quota,
                totalApplicants: data.total_applicants,
                date: data.date
            });
            setWuhanSurge(surgeData.wuhan || []);
        } catch (err) {
            console.error('获取武汉区县数据失败:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDistrictPositions = async (district: string): Promise<void> => {
        setPositionsLoading(true);
        try {
            const params = {
                district,
                date: selectedDate,
                page_size: 100
            };
            const data = await getWuhanPositions(params);
            setPositions(data.data || []);
        } catch (err) {
            console.error('获取职位列表失败:', err);
        } finally {
            setPositionsLoading(false);
        }
    };

    const getDistrictValue = (name: string): number => {
        const district = districtData.find(d => d.name === name);
        if (!district) return 0;
        switch (displayMode) {
            case 'applicants': return district.applicants;
            case 'positions': return district.positions;
            case 'ratio': return district.competition_ratio;
            default: return district.applicants;
        }
    };

    const getMaxValue = (): number => {
        if (districtData.length === 0) return 1;
        const values = districtData.map(d => {
            switch (displayMode) {
                case 'applicants': return d.applicants;
                case 'positions': return d.positions;
                case 'ratio': return d.competition_ratio;
                default: return d.applicants;
            }
        });
        return Math.max(...values) || 1;
    };

    const getDistrictColor = (name: string): string => {
        const value = getDistrictValue(name);
        const maxValue = getMaxValue();
        const ratio = value / maxValue;

        const hue = 260 - ratio * 60;
        const saturation = 40 + ratio * 40;
        const lightness = 65 - ratio * 30;

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const getDistrictSize = (name: string): number => {
        const value = getDistrictValue(name);
        const maxValue = getMaxValue();
        const ratio = value / maxValue;
        return 40 + ratio * 40;
    };

    const formatValue = (value: number): string => {
        if (displayMode === 'ratio') {
            return `${value}:1`;
        }
        return value?.toLocaleString() || '0';
    };

    const getRecordValue = (record: Position, key: string): unknown => {
        return (record as unknown as Record<string, unknown>)[key];
    };

    if (loading) {
        return (
            <div className="wuhan-view">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>加载武汉市数据中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wuhan-view">
            <div className="wuhan-header">
                <div className="header-left">
                    <h1>🏙️ 武汉市公务员岗位分析</h1>
                    <p className="subtitle">各区职位分布与报名情况详解</p>
                </div>
                <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                <div className="header-stats">
                    <div className="stat-item">
                        <span className="stat-value">{summary.totalPositions?.toLocaleString()}</span>
                        <span className="stat-label">职位数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{summary.totalQuota?.toLocaleString()}</span>
                        <span className="stat-label">招录人数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{summary.totalApplicants?.toLocaleString()}</span>
                        <span className="stat-label">报名人数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{(summary.totalApplicants / (summary.totalQuota || 1)).toFixed(1)}:1</span>
                        <span className="stat-label">竞争比</span>
                    </div>
                </div>
            </div>

            <div className="wuhan-content">
                <div className="district-map-container">
                    <div className="map-controls">
                        <span className="control-label">显示指标：</span>
                        <button
                            className={`control-btn ${displayMode === 'applicants' ? 'active' : ''}`}
                            onClick={() => setDisplayMode('applicants')}
                        >
                            报名人数
                        </button>
                        <button
                            className={`control-btn ${displayMode === 'positions' ? 'active' : ''}`}
                            onClick={() => setDisplayMode('positions')}
                        >
                            职位数量
                        </button>
                        <button
                            className={`control-btn ${displayMode === 'ratio' ? 'active' : ''}`}
                            onClick={() => setDisplayMode('ratio')}
                        >
                            竞争比
                        </button>
                    </div>

                    <div className="district-map">
                        <svg viewBox="0 0 100 100" className="wuhan-svg">
                            <defs>
                                <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.1)" />
                                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
                                </radialGradient>
                            </defs>
                            <ellipse cx="50" cy="50" rx="48" ry="45" fill="url(#bgGradient)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="0.5" />

                            {WUHAN_DISTRICTS.map((district) => {
                                const size = getDistrictSize(district.name) / 10;
                                const value = getDistrictValue(district.name);
                                const isSelected = selectedDistrict === district.name;

                                return (
                                    <g key={district.name}
                                        className={`district-bubble ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedDistrict(district.name)}>
                                        <circle
                                            cx={district.x}
                                            cy={district.y}
                                            r={size}
                                            fill={getDistrictColor(district.name)}
                                            stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                                            strokeWidth={isSelected ? 0.5 : 0.2}
                                            className="bubble-circle"
                                        />
                                        <text
                                            x={district.x}
                                            y={district.y - 0.5}
                                            textAnchor="middle"
                                            className="bubble-name"
                                        >
                                            {district.name.replace('区', '')}
                                        </text>
                                        <text
                                            x={district.x}
                                            y={district.y + 2}
                                            textAnchor="middle"
                                            className="bubble-value"
                                        >
                                            {formatValue(value)}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    <div className="map-legend">
                        <div className="legend-gradient">
                            <div className="gradient-bar"></div>
                            <div className="gradient-labels">
                                <span>低</span>
                                <span>{displayMode === 'applicants' ? '报名人数' : displayMode === 'positions' ? '职位数量' : '竞争比'}</span>
                                <span>高</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="district-list">
                    <h3>📊 各区排名</h3>
                    <div className="list-header">
                        <span>区域</span>
                        <span>职位</span>
                        <span>招录</span>
                        <span>报名</span>
                        <span>竞争比</span>
                    </div>
                    <div className="list-body">
                        {districtData.map((district, index) => (
                            <div
                                key={district.name}
                                className={`list-item ${selectedDistrict === district.name ? 'selected' : ''}`}
                                onClick={() => setSelectedDistrict(district.name)}
                            >
                                <span className="rank">
                                    {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                                </span>
                                <span className="name">{district.name}</span>
                                <span className="positions">{district.positions}</span>
                                <span className="quota">{district.quota}</span>
                                <span className="applicants">{district.applicants?.toLocaleString()}</span>
                                <span className="ratio">{district.competition_ratio}:1</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {!selectedDate && wuhanSurge.length > 0 && (
                <div className="district-detail surge-section">
                    <div className="detail-header">
                        <h3>🚀 今日报名飙升 Top 20 (全武汉)</h3>
                    </div>
                    <div className="positions-table-wrapper">
                        <table className="positions-table">
                            <thead>
                                <tr>
                                    <th>排名</th>
                                    <th>职位代码</th>
                                    <th>职位名称</th>
                                    <th>用人单位</th>
                                    <th>所在区</th>
                                    <th>报名总数</th>
                                    <th>今日新增</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wuhanSurge.map((pos, index) => (
                                    <tr key={pos.code || index}>
                                        <td className="rank-cell">
                                            <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>{index + 1}</span>
                                        </td>
                                        <td className="code">{pos.code}</td>
                                        <td>{pos.name}</td>
                                        <td>{pos.unit}</td>
                                        <td>{pos.district}</td>
                                        <td className="num">{pos.applicants_today?.toLocaleString()}</td>
                                        <td className="surge-value">+{pos.delta?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedDistrict && (
                <div className="district-detail">
                    <div className="detail-header">
                        <h3>📋 {selectedDistrict} 职位列表</h3>
                        <button className="close-btn" onClick={() => setSelectedDistrict(null)}>✕</button>
                    </div>

                    {positionsLoading ? (
                        <div className="loading-spinner small">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="positions-table-wrapper">
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th>职位代码</th>
                                        <th>职位名称</th>
                                        <th>招录机关</th>
                                        <th>用人单位</th>
                                        <th>招录</th>
                                        <th>报名</th>
                                        <th>竞争比</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((pos, index) => (
                                        <tr key={index}>
                                            <td className="code">{getRecordValue(pos, '职位代码') as string}</td>
                                            <td>{getRecordValue(pos, '职位名称') as string}</td>
                                            <td>{getRecordValue(pos, '招录机关') as string}</td>
                                            <td>{getRecordValue(pos, '用人单位') as string}</td>
                                            <td className="num">{getRecordValue(pos, '招录人数') as number}</td>
                                            <td className="num">{getRecordValue(pos, '报名人数') as number}</td>
                                            <td className="ratio">{getRecordValue(pos, '竞争比') as number}:1</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {positions.length === 0 && (
                                <div className="empty-state">暂无该区职位数据</div>
                            )}
                        </div>
                    )}
                    <div className="detail-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setSelectedDistrict(null)}
                            style={{ padding: '8px 40px', fontSize: '14px' }}
                        >
                            关闭详情
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WuhanView;
