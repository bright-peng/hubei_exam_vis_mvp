import React, { useState, useEffect } from 'react'
import {
    Table,
    Card,
    Form,
    Input,
    Select,
    Button,
    Space,
    Badge,
    Grid,
    Pagination,
    Typography,
    Tooltip
} from '@arco-design/web-react'
import { IconSearch, IconRefresh, IconEye } from '@arco-design/web-react/icon'
import { getPositions, getFilters, getAvailableDates, clearCodeListCache } from '../api'
import { getDailyMomentum, DailyMomentumResult } from '../momentum'
import PositionDetailModal from '../components/PositionDetailModal'
import DateSelector from '../components/DateSelector'
import './PositionList.css'
import { DATA_KEYS } from '../constants'
import { useSearchParams } from 'react-router-dom'
import type { Position } from '../types'

const { Row, Col } = Grid
const { Title, Text } = Typography

interface FiltersData {
    cities?: string[]
    education?: string[]
    targets?: string[]
}

type MomentumType = 'surge' | 'accelerating' | 'cooling'

const PositionList: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([])
    const [total, setTotal] = useState(0)
    const [filters, setFilters] = useState<FiltersData>({ cities: [], education: [] })
    const [loading, setLoading] = useState(true)
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

    // 筛选条件
    const [selectedCity, setSelectedCity] = useState('武汉市')
    const [selectedEducation, setSelectedEducation] = useState<string | undefined>(undefined)
    const [selectedTarget, setSelectedTarget] = useState<string | undefined>(undefined)
    const [selectedDate, setSelectedDate] = useState('')
    const [keyword, setKeyword] = useState('')
    const [page, setPage] = useState(1)
    const pageSize = 20
    const [availableDates, setAvailableDates] = useState<string[]>([])

    const [searchParams] = useSearchParams()

    // Validate momentumType against whitelist to prevent invalid values
    const VALID_MOMENTUM_TYPES: MomentumType[] = ['surge', 'accelerating', 'cooling']
    const rawMomentum = searchParams.get('momentum')
    const momentumType: MomentumType | null = VALID_MOMENTUM_TYPES.includes(rawMomentum as MomentumType)
        ? (rawMomentum as MomentumType)
        : null

    const [form] = Form.useForm()

    // Load filters and available dates once on mount
    useEffect(() => {
        loadFilters()
        loadAvailableDates()
    }, [])

    // Handle momentum type changes
    useEffect(() => {
        // Clear cache when momentum type changes to ensure fresh data
        clearCodeListCache()
        if (momentumType) {
            setSelectedCity('')
            form.setFieldValue('city', '')
        }
    }, [momentumType, form])

    useEffect(() => {
        loadPositions()
    }, [page, selectedCity, selectedEducation, selectedTarget, selectedDate, momentumType])

    const loadAvailableDates = async (): Promise<void> => {
        try {
            const dates = await getAvailableDates()
            setAvailableDates(dates || [])
        } catch (error) {
            console.error('加载日期失败:', error)
        }
    }

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

            // Handle Momentum Filter
            if (momentumType) {
                try {
                    // Use cached availableDates instead of re-fetching
                    let allDates = availableDates.length > 0 ? availableDates : await getAvailableDates()

                    // Ensure dates are sorted descending (latest first) to correct momentum calculation
                    allDates = [...allDates].sort().reverse()

                    // Use selectedDate if present, else latest date
                    const baseDate = selectedDate || (allDates && allDates.length > 0 ? allDates[0] : null)

                    if (baseDate) {
                        const baseIndex = allDates.indexOf(baseDate)
                        // Need previous date. If baseIndex is last one (oldest), no prev date.
                        // allDates is now [latest, ..., oldest]
                        const prevDate = baseIndex >= 0 && baseIndex + 1 < allDates.length ? allDates[baseIndex + 1] : null

                        // If we have both dates (or handle logic inside getDailyMomentum to fallback)
                        const momentumData: DailyMomentumResult = await getDailyMomentum(baseDate, prevDate)

                        if (momentumData && momentumData[momentumType]) {
                            params.codeList = momentumData[momentumType].ids || []
                            if ((params.codeList as string[]).length === 0) {
                                // No matches found for this momentum type
                                setPositions([])
                                setTotal(0)
                                return // Return early
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Failed to apply momentum filter", e)
                }
            }

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
        form.resetFields()
        setSelectedCity('武汉市')
        setSelectedEducation(undefined)
        setSelectedTarget(undefined)
        setSelectedDate('')
        setKeyword('')
        setPage(1)
    }

    const getRecordValue = (record: Position, key: string): unknown => {
        return (record as unknown as Record<string, unknown>)[key]
    }

    const columns = [
        {
            title: '职位代码',
            dataIndex: DATA_KEYS.CODE,
            width: 120,
            render: (val: string) => <Text copyable className="code-text">{val}</Text>
        },
        {
            title: '用人单位',
            dataIndex: DATA_KEYS.UNIT,
            width: 180,
            ellipsis: true,
            render: (val: string) => (
                <Tooltip
                    position="tl"
                    content={<div style={{ maxWidth: 350, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val}</div>}
                    getPopupContainer={(node) => node.parentNode as HTMLElement}
                >
                    <span style={{ cursor: 'help' }}>{val}</span>
                </Tooltip>
            )
        },
        {
            title: '职位名称',
            dataIndex: DATA_KEYS.NAME,
            ellipsis: true,
            render: (val: string) => (
                <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val}</div>} getPopupContainer={(node) => node.parentNode as HTMLElement}>
                    {val}
                </Tooltip>
            )
        },
        {
            title: '招录',
            dataIndex: DATA_KEYS.QUOTA,
            width: 80,
            align: 'center' as const
        },
        {
            title: '报名',
            dataIndex: DATA_KEYS.APPLICANTS,
            width: 100,
            align: 'center' as const,
            render: (val: number, record: Position) => {
                const quota = getRecordValue(record, DATA_KEYS.QUOTA) as number
                const isHot = quota > 0 && (val / quota) > 50
                const isCold = val === 0
                return (
                    <Text bold style={{ color: isHot ? '#ff4d4f' : isCold ? '#999' : 'inherit' }}>
                        {val || 0}
                    </Text>
                )
            }
        },
        {
            title: '竞争比',
            width: 100,
            align: 'center' as const,
            render: (_: unknown, record: Position) => {
                const quota = getRecordValue(record, DATA_KEYS.QUOTA) as number
                const applicants = getRecordValue(record, DATA_KEYS.APPLICANTS) as number
                const competition = quota > 0
                    ? (applicants / quota).toFixed(1)
                    : '0'
                const isHot = Number(competition) > 50
                const isCold = applicants === 0
                let status: 'success' | 'error' | 'default' = 'success'
                if (isHot) status = 'error'
                if (isCold) status = 'default'

                return <Badge status={status} text={`${competition}:1`} />
            }
        },
        {
            title: '研究生专业',
            dataIndex: DATA_KEYS.MAJOR_PG,
            ellipsis: true,
            render: (val: string) => (
                <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode as HTMLElement}>
                    {val || '不限'}
                </Tooltip>
            )
        },
        {
            title: '本科专业',
            dataIndex: DATA_KEYS.MAJOR_UG,
            ellipsis: true,
            render: (val: string) => (
                <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode as HTMLElement}>
                    {val || '不限'}
                </Tooltip>
            )
        },
        {
            title: '招录对象',
            dataIndex: DATA_KEYS.TARGET,
            width: 120,
            ellipsis: true,
            render: (val: string) => (
                <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode as HTMLElement}>
                    {val || '不限'}
                </Tooltip>
            )
        },
        {
            title: '操作',
            width: 100,
            render: (_: unknown, record: Position) => (
                <Button
                    type="text"
                    size="mini"
                    icon={<IconEye />}
                    onClick={() => setSelectedPosition(record)}
                >
                    详情
                </Button>
            )
        }
    ]

    return (
        <div className="position-list-arco fade-in">
            {/* 筛选区域 */}
            <Card className="glass-card-arco filter-card-arco" bordered={false}>
                <Row justify="space-between" align="center" style={{ marginBottom: 24 }} gutter={[0, 16]}>
                    <Col xs={24} sm={12}>
                        <Title heading={5} style={{ margin: 0 }}>
                            <Space><IconSearch />
                                {momentumType ? <span style={{ color: '#ff7d00' }}>态势筛选: {
                                    momentumType === 'surge' ? '🔥 今日激增' :
                                        momentumType === 'accelerating' ? '📈 竞争加速' : '📉 增速放缓'
                                }</span> : '职位筛选'}
                            </Space>
                        </Title>
                    </Col>
                    <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                    </Col>
                </Row>

                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={(changed: Record<string, unknown>) => {
                        if (changed.city !== undefined) setSelectedCity(changed.city as string)
                        if (changed.education !== undefined) setSelectedEducation(changed.education as string)
                        if (changed.target !== undefined) setSelectedTarget(changed.target as string)
                        if (changed.keyword !== undefined) setKeyword(changed.keyword as string)
                    }}
                    initialValues={{ city: '武汉市', education: '', target: '', keyword: '' }}
                >
                    <Row gutter={[24, 0]} align="end">
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item label="工作地点" field="city">
                                <Select id="city_input" placeholder="选择地区" allowClear>
                                    <Select.Option key="all" value="">全部</Select.Option>
                                    {filters.cities?.map((city) => (
                                        <Select.Option key={city} value={city}>{city}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item label="学历要求" field="education">
                                <Select id="education_input" placeholder="选择学历" allowClear>
                                    <Select.Option key="all" value="">全部</Select.Option>
                                    {filters.education?.map((edu) => (
                                        <Select.Option key={edu} value={edu}>{edu}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                            <Form.Item label="招录对象" field="target">
                                <Select id="target_input" placeholder="选择对象" allowClear>
                                    <Select.Option key="all" value="">全部</Select.Option>
                                    {filters.targets?.map((target) => (
                                        <Select.Option key={target} value={target}>{target}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={16} md={8}>
                            <Form.Item label="关键词搜索" field="keyword">
                                <Input
                                    placeholder="搜索职位、机关、简介、专业..."
                                    allowClear
                                    onPressEnter={handleSearch}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8} md={4}>
                            <Form.Item>
                                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                    <Button type="primary" icon={<IconSearch />} onClick={handleSearch} style={{ flex: 1 }}>搜索</Button>
                                    <Button icon={<IconRefresh />} onClick={handleReset}>重置</Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* 数据内容 */}
            <Card className="glass-card-arco content-card-arco" bordered={false} style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 16 }}>
                    <Text>共找到 <Text bold color="arcoblue">{total.toLocaleString()}</Text> 个职位</Text>
                </div>

                <Table
                    loading={loading}
                    columns={columns}
                    data={positions}
                    pagination={false}
                    rowKey={DATA_KEYS.CODE}
                    scroll={{ x: 1200 }}
                    noDataElement={
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Text type="secondary">没有找到符合条件的职位</Text>
                        </div>
                    }
                />

                <div className="pagination-wrapper-arco">
                    <Pagination
                        current={page}
                        pageSize={pageSize}
                        total={total}
                        onChange={(p) => setPage(p)}
                        showTotal
                        size="small"
                    />
                </div>
            </Card>

            <PositionDetailModal
                position={selectedPosition}
                onClose={() => setSelectedPosition(null)}
            />
        </div>
    )
}

export default PositionList
