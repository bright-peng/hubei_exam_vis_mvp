import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { getPositions, getFilters } from '../../api'
import PositionDetailModal from '../../components/PositionDetailModal'
import DateSelector from '../../components/DateSelector'
import './PositionList.css'
import type { Position } from '../../types'

interface FiltersData {
    cities?: string[]
    education?: string[]
    targets?: string[]
}

const PositionList: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([])
    const [total, setTotal] = useState(0)
    const [filters, setFilters] = useState<FiltersData>({ cities: [], education: [] })
    const [loading, setLoading] = useState(true)
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

    // 筛选条件
    const [selectedCity, setSelectedCity] = useState('武汉市')
    const [selectedEducation, setSelectedEducation] = useState('')
    const [selectedTarget, setSelectedTarget] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [keyword, setKeyword] = useState('')
    const [page, setPage] = useState(1)
    const pageSize = 20

    useEffect(() => {
        loadFilters()
    }, [])

    useEffect(() => {
        loadPositions()
    }, [page, selectedCity, selectedEducation, selectedTarget, selectedDate])

    const loadFilters = async (): Promise<void> => {
        try {
            const data = await getFilters()
            setFilters(data as FiltersData)
        } catch (error) {
            console.error('加载筛选条件失败:', error)
        }
    }

    const loadPositions = async (): Promise<void> => {
        try {
            setLoading(true)
            const params: Record<string, unknown> = {
                page,
                page_size: pageSize,
                date: selectedDate
            }
            if (selectedCity) params.city = selectedCity
            if (selectedEducation) params.education = selectedEducation
            if (selectedTarget) params.target = selectedTarget
            if (keyword) params.keyword = keyword

            const data = await getPositions(params as Parameters<typeof getPositions>[0])
            setPositions(data.data || [])
            setTotal(data.total || 0)
        } catch (error) {
            console.error('加载职位列表失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (): void => {
        setPage(1)
        loadPositions()
    }

    const handleReset = (): void => {
        setSelectedCity('武汉市')
        setSelectedEducation('')
        setSelectedTarget('')
        setSelectedDate('')
        setKeyword('')
        setPage(1)
    }

    const handleShowDetail = (pos: Position): void => {
        setSelectedPosition(pos)
    }

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    const getRecordValue = (record: Position, key: string): unknown => {
        return (record as unknown as Record<string, unknown>)[key]
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="position-list fade-in">
            {/* 筛选区域 */}
            <div className="glass-card filter-section">
                <div className="filter-header">
                    <h3 className="section-title">职位筛选</h3>
                    <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </div>
                <div className="filter-grid">
                    <div className="filter-item">
                        <label htmlFor="filter-city">工作地点</label>
                        <select
                            id="filter-city"
                            className="select"
                            value={selectedCity}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCity(e.target.value)}
                        >
                            <option value="">全部地区</option>
                            {filters.cities?.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="filter-education">学历要求</label>
                        <select
                            id="filter-education"
                            className="select"
                            value={selectedEducation}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedEducation(e.target.value)}
                        >
                            <option value="">全部学历</option>
                            {filters.education?.map((edu) => (
                                <option key={edu} value={edu}>
                                    {edu}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="filter-target">招录对象</label>
                        <select
                            id="filter-target"
                            className="select"
                            value={selectedTarget}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTarget(e.target.value)}
                        >
                            <option value="">全部对象</option>
                            {filters.targets?.map((target) => (
                                <option key={target} value={target}>
                                    {target}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item keyword-filter">
                        <label htmlFor="filter-keyword">关键词搜索</label>
                        <input
                            id="filter-keyword"
                            type="text"
                            className="input"
                            placeholder="搜索职位、机关、简介、专业..."
                            value={keyword}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                    </div>

                    <div className="filter-actions">
                        <button className="btn btn-primary" onClick={handleSearch}>
                            🔍 搜索
                        </button>
                        <button className="btn btn-secondary" onClick={handleReset}>
                            重置
                        </button>
                    </div>
                </div>
            </div>

            {/* 结果统计 */}
            <div className="result-info">
                <span>
                    共找到 <strong>{total.toLocaleString()}</strong> 个职位
                </span>
                {(selectedCity || selectedEducation || selectedTarget || keyword) && (
                    <span className="filter-tags">
                        {selectedCity && <span className="tag">{selectedCity}</span>}
                        {selectedEducation && <span className="tag">{selectedEducation}</span>}
                        {selectedTarget && <span className="tag">{selectedTarget}</span>}
                        {keyword && <span className="tag">"{keyword}"</span>}
                    </span>
                )}
            </div>

            {/* 职位表格 */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                    </div>
                ) : positions.length === 0 ? (
                    <div className="empty-list">
                        <p>没有找到符合条件的职位</p>
                        {!total && <p className="hint">请先上传职位表</p>}
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>职位代码</th>
                                        <th>用人单位</th>
                                        <th>职位名称</th>
                                        <th>招录人数</th>
                                        <th>报名人数</th>
                                        <th>竞争比</th>
                                        <th>研究生专业</th>
                                        <th>本科专业</th>
                                        <th>招录对象</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(Array.isArray(positions) ? positions : []).map((pos) => {
                                        const quota = (getRecordValue(pos, '招录人数') as number) || 0
                                        const applicants = (getRecordValue(pos, '报名人数') as number) || 0
                                        const competition = quota > 0
                                            ? (applicants / quota).toFixed(1)
                                            : '0'
                                        const isHot = Number(competition) > 50
                                        const isCold = applicants === 0

                                        return (
                                            <tr key={getRecordValue(pos, '职位代码') as string}>
                                                <td className="code">{getRecordValue(pos, '职位代码') as string}</td>
                                                <td className="org" title={getRecordValue(pos, '用人单位') as string}>{getRecordValue(pos, '用人单位') as string}</td>
                                                <td className="name" title={getRecordValue(pos, '职位名称') as string}>{getRecordValue(pos, '职位名称') as string}</td>
                                                <td className="center">{quota}</td>
                                                <td className="center">
                                                    <span className={isHot ? 'hot-value' : isCold ? 'cold-value' : ''}>
                                                        {applicants}
                                                    </span>
                                                </td>
                                                <td className="center">
                                                    <span className={`badge ${isHot ? 'badge-hot' : isCold ? 'badge-cold' : 'badge-normal'}`}>
                                                        {competition}:1
                                                    </span>
                                                </td>
                                                <td className="major" title={getRecordValue(pos, '研究生专业') as string}>{(getRecordValue(pos, '研究生专业') as string) || '不限'}</td>
                                                <td className="major" title={getRecordValue(pos, '本科专业') as string}>{(getRecordValue(pos, '本科专业') as string) || '不限'}</td>
                                                <td className="tags" title={(getRecordValue(pos, '招录对象') as string) || '不限'}>{(getRecordValue(pos, '招录对象') as string) || '不限'}</td>
                                                <td className="actions">
                                                    <button className="btn-detail" onClick={() => handleShowDetail(pos)}>
                                                        详情
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* 分页 */}
                        <div className="pagination">
                            <button
                                className="btn btn-secondary"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                上一页
                            </button>
                            <span className="page-info">
                                第 {page} 页 / 共 {totalPages} 页
                            </span>
                            <button
                                className="btn btn-secondary"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                下一页
                            </button>
                        </div>
                    </>
                )}
            </div>

            <PositionDetailModal
                position={selectedPosition}
                onClose={() => setSelectedPosition(null)}
            />
        </div>
    )
}

export default PositionList
