import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPositionsByCodes, getTrendByCodes } from '../../api';
import PositionDetailModal from '../../components/PositionDetailModal';
import './WatchList.css';
import { DATA_KEYS } from '../../constants';
import type { Position } from '../../types';

interface TrendPosition {
    code: string;
    name: string;
    data: number[];
}

interface TrendDataResponse {
    positions: TrendPosition[];
    dates: string[];
}

interface ChartDataPoint {
    date: string;
    [key: string]: string | number;
}

type SortBy = 'applicants' | 'ratio' | 'quota';

// 默认关注的职位代码列表
const DEFAULT_WATCH_CODES = [
    '14230202001005001',
    '14230202001002001',
    '14230202001003004',
    '14230202001002002',
    '14230202001003005',
    '14230202001003001',
    '14230202001001001',
    '14230202001004001',
    '14230202001002013',
];

// 颜色列表
const COLORS = [
    '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80',
    '#f97316', '#2dd4bf', '#818cf8', '#fb7185', '#34d399'
];

const WatchList: React.FC = () => {
    const [watchCodes, setWatchCodes] = useState<string[]>(() => {
        const saved = localStorage.getItem('watchlist_codes');
        return saved ? JSON.parse(saved) : DEFAULT_WATCH_CODES;
    });
    const [positions, setPositions] = useState<Position[]>([]);
    const [trendData, setTrendData] = useState<TrendDataResponse | null>(null);
    const [notFound, setNotFound] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [trendLoading, setTrendLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [latestDate, setLatestDate] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('applicants');
    const [showChart, setShowChart] = useState(true);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

    useEffect(() => {
        if (watchCodes.length > 0) {
            fetchPositions();
            fetchTrendData();
        } else {
            setPositions([]);
            setTrendData(null);
            setLoading(false);
        }
    }, [watchCodes]);

    useEffect(() => {
        localStorage.setItem('watchlist_codes', JSON.stringify(watchCodes));
    }, [watchCodes]);

    const fetchPositions = async (): Promise<void> => {
        setLoading(true);
        try {
            const data = await getPositionsByCodes(watchCodes);
            setPositions(data.data || []);
            setNotFound(data.not_found || []);
            setLatestDate(data.latest_date || '');
        } catch (err) {
            console.error('获取职位数据失败:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrendData = async (): Promise<void> => {
        setTrendLoading(true);
        try {
            const data = await getTrendByCodes(watchCodes);
            setTrendData(data);
        } catch (err) {
            console.error('获取趋势数据失败:', err);
        } finally {
            setTrendLoading(false);
        }
    };

    const chartData = useMemo((): ChartDataPoint[] => {
        if (!trendData || !trendData.dates || trendData.dates.length === 0) {
            return [];
        }

        return trendData.dates.map((date, index) => {
            const point: ChartDataPoint = { date: date.slice(5) };
            trendData.positions.forEach(pos => {
                point[pos.code] = pos.data[index] || 0;
            });
            return point;
        });
    }, [trendData]);

    const handleAddCodes = (): void => {
        if (!inputValue.trim()) return;
        const newCodes = inputValue
            .split(/[,，\n\s]+/)
            .map(c => c.trim())
            .filter(c => c && /^\d{17}$/.test(c));
        if (newCodes.length > 0) {
            const uniqueCodes = [...new Set([...watchCodes, ...newCodes])];
            setWatchCodes(uniqueCodes);
            setInputValue('');
        }
    };

    const handleRemoveCode = (code: string): void => {
        setWatchCodes(watchCodes.filter(c => c !== code));
    };

    const handleClearAll = (): void => {
        if (confirm('确定要清空所有关注的职位吗？')) {
            setWatchCodes([]);
        }
    };

    const handleResetDefault = (): void => {
        setWatchCodes(DEFAULT_WATCH_CODES);
    };

    const getRecordValue = (record: Position, key: string): unknown => {
        return (record as unknown as Record<string, unknown>)[key];
    };

    const sortedPositions = [...positions].sort((a, b) => {
        switch (sortBy) {
            case 'applicants': return ((getRecordValue(b, DATA_KEYS.APPLICANTS) as number) || 0) - ((getRecordValue(a, DATA_KEYS.APPLICANTS) as number) || 0);
            case 'ratio': return ((getRecordValue(b, DATA_KEYS.RATIO) as number) || 0) - ((getRecordValue(a, DATA_KEYS.RATIO) as number) || 0);
            case 'quota': return ((getRecordValue(b, DATA_KEYS.QUOTA) as number) || 0) - ((getRecordValue(a, DATA_KEYS.QUOTA) as number) || 0);
            default: return 0;
        }
    });

    const totalStats = positions.reduce((acc, pos) => ({
        quota: acc.quota + ((getRecordValue(pos, DATA_KEYS.QUOTA) as number) || 0),
        applicants: acc.applicants + ((getRecordValue(pos, DATA_KEYS.APPLICANTS) as number) || 0),
    }), { quota: 0, applicants: 0 });

    const avgRatio = totalStats.quota > 0
        ? (totalStats.applicants / totalStats.quota).toFixed(1)
        : '0.0';

    const hasMultipleDays = trendData && trendData.dates && trendData.dates.length > 1;

    const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
        setInputValue(e.target.value);
    };

    return (
        <div className="watchlist-page">
            <div className="watchlist-header">
                <div className="header-left">
                    <h1>⭐ 关注职位</h1>
                    <p className="subtitle">追踪您关注的特定职位的报名动态</p>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <span className="stat-value">{positions.length}</span>
                        <span className="stat-label">关注职位</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{totalStats.quota}</span>
                        <span className="stat-label">招录人数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{totalStats.applicants.toLocaleString()}</span>
                        <span className="stat-label">报名人数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{avgRatio}:1</span>
                        <span className="stat-label">平均竞争比</span>
                    </div>
                </div>
            </div>

            <div className="watchlist-content">
                <div className="add-panel">
                    <h3>📝 添加职位代码</h3>
                    <div className="add-form">
                        <textarea
                            value={inputValue}
                            onChange={handleTextareaChange}
                            placeholder="输入职位代码，支持多个（用逗号、空格或换行分隔）&#10;例如: 14230202001005001, 14230202001002001"
                            rows={3}
                        />
                        <div className="form-actions">
                            <button className="btn-add" onClick={handleAddCodes}>➕ 添加</button>
                            <button className="btn-reset" onClick={handleResetDefault}>🔄 重置默认</button>
                            <button className="btn-clear" onClick={handleClearAll}>🗑️ 清空</button>
                        </div>
                    </div>
                    <div className="code-tags">
                        {watchCodes.map(code => (
                            <span key={code} className="code-tag">
                                {code}
                                <button onClick={() => handleRemoveCode(code)}>×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="trend-panel">
                    <div className="panel-header">
                        <h3>📈 报名趋势</h3>
                        <div className="chart-controls">
                            <button className={`toggle-btn ${showChart ? 'active' : ''}`} onClick={() => setShowChart(!showChart)}>
                                {showChart ? '隐藏图表' : '显示图表'}
                            </button>
                        </div>
                    </div>
                    {showChart && (
                        <div className="chart-container" style={{ width: '100%', height: 340, minWidth: 0 }}>
                            {trendLoading ? (
                                <div className="loading small"><div className="spinner"></div><p>加载趋势数据...</p></div>
                            ) : !hasMultipleDays ? (
                                <div className="chart-placeholder">
                                    <p>📊 趋势图表需要多天数据</p>
                                    <p className="hint">当前只有 {trendData?.dates?.length || 0} 天的数据，导入更多天的数据后将显示趋势折线图</p>
                                </div>
                            ) : chartData.length > 0 && trendData?.positions ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
                                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px', color: '#f1f5f9' }} labelStyle={{ color: '#fbbf24' }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => trendData.positions.find(p => p.code === value)?.name || value} />
                                        {trendData.positions.map((pos, index) => (
                                            <Line key={pos.code} type="monotone" dataKey={pos.code} name={pos.code} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <div className="chart-placeholder"><p>暂无趋势数据</p></div>}
                        </div>
                    )}
                    {trendData?.dates && trendData.dates.length > 0 && (
                        <div className="dates-info">
                            <span>已有数据：</span>
                            {trendData.dates.map(d => <span key={d} className="date-badge">{d}</span>)}
                        </div>
                    )}
                </div>

                <div className="positions-panel">
                    <div className="panel-header">
                        <h3>📋 职位详情</h3>
                        {latestDate && <span className="date-tag">数据日期: {latestDate}</span>}
                        <div className="sort-controls">
                            <span>排序：</span>
                            <button className={sortBy === 'applicants' ? 'active' : ''} onClick={() => setSortBy('applicants')}>报名人数</button>
                            <button className={sortBy === 'ratio' ? 'active' : ''} onClick={() => setSortBy('ratio')}>竞争比</button>
                            <button className={sortBy === 'quota' ? 'active' : ''} onClick={() => setSortBy('quota')}>招录人数</button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div><p>加载中...</p></div>
                    ) : positions.length === 0 ? (
                        <div className="empty-state"><p>暂无关注的职位</p><p className="hint">在上方添加职位代码开始追踪</p></div>
                    ) : (
                        <div className="positions-table-wrapper">
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th className="col-index">#</th>
                                        <th className="col-code">职位代码</th>
                                        <th className="col-name">职位名称</th>
                                        <th className="col-unit">用人单位</th>
                                        <th className="col-quota">招录</th>
                                        <th className="col-applicants">报名</th>
                                        <th className="col-ratio">竞争比</th>
                                        <th className="col-major">研究生专业</th>
                                        <th className="col-major">本科专业</th>
                                        <th className="col-action">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPositions.map((pos, index) => (
                                        <tr key={getRecordValue(pos, DATA_KEYS.CODE) as string}>
                                            <td className="col-index">{index + 1}</td>
                                            <td className="col-code">{getRecordValue(pos, DATA_KEYS.CODE) as string}</td>
                                            <td className="col-name">{getRecordValue(pos, DATA_KEYS.NAME) as string}</td>
                                            <td className="col-unit">{getRecordValue(pos, DATA_KEYS.UNIT) as string}</td>
                                            <td className="col-quota">{getRecordValue(pos, DATA_KEYS.QUOTA) as number}</td>
                                            <td className="col-applicants highlight">{(getRecordValue(pos, DATA_KEYS.APPLICANTS) as number)?.toLocaleString()}</td>
                                            <td className="col-ratio">
                                                <span className={`ratio-badge ${(getRecordValue(pos, DATA_KEYS.RATIO) as number) > 50 ? 'hot' : (getRecordValue(pos, DATA_KEYS.RATIO) as number) > 20 ? 'warm' : ''}`}>
                                                    {getRecordValue(pos, DATA_KEYS.RATIO) as number}:1
                                                </span>
                                            </td>
                                            <td className="col-major" title={getRecordValue(pos, DATA_KEYS.MAJOR_PG) as string}>{(getRecordValue(pos, DATA_KEYS.MAJOR_PG) as string) || '不限'}</td>
                                            <td className="col-major" title={getRecordValue(pos, DATA_KEYS.MAJOR_UG) as string}>{(getRecordValue(pos, DATA_KEYS.MAJOR_UG) as string) || '不限'}</td>
                                            <td className="col-action">
                                                <button className="btn-detail-small" onClick={() => setSelectedPosition(pos)}>详情</button>
                                                <button className="btn-remove" onClick={() => handleRemoveCode(getRecordValue(pos, DATA_KEYS.CODE) as string)} title="取消关注">✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {notFound.length > 0 && (
                        <div className="not-found-section">
                            <h4>⚠️ 以下职位代码未找到：</h4>
                            <div className="not-found-codes">
                                {notFound.map(code => <span key={code} className="not-found-tag">{code}<button onClick={() => handleRemoveCode(code)}>×</button></span>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <PositionDetailModal position={selectedPosition} onClose={() => setSelectedPosition(null)} />
        </div>
    );
}

export default WatchList;
