import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Tag, 
  Badge, 
  Grid,
  Pagination,
  Typography,
  Tooltip
} from '@arco-design/web-react'
import { IconSearch, IconRefresh, IconEye } from '@arco-design/web-react/icon'
import { getPositions, getFilters, getAvailableDates, clearCodeListCache } from '../api'
import { getDailyMomentum } from '../momentum'
import PositionDetailModal from '../components/PositionDetailModal'
import DateSelector from '../components/DateSelector'
import './PositionList.css'
import { DATA_KEYS } from '../constants'
import { useSearchParams } from 'react-router-dom'

const { Row, Col } = Grid
const { Title, Text } = Typography

export default function PositionList() {
  const [positions, setPositions] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ cities: [], education: [] })
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState(null)
  
  // 筛选条件
  const [selectedCity, setSelectedCity] = useState('武汉市')
  const [selectedEducation, setSelectedEducation] = useState(undefined)
  const [selectedTarget, setSelectedTarget] = useState(undefined)
  const [selectedDate, setSelectedDate] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [availableDates, setAvailableDates] = useState([]) // Cache dates to avoid repeated fetching
  
  const [searchParams] = useSearchParams()
  
  // Validate momentumType against whitelist to prevent invalid values
  const VALID_MOMENTUM_TYPES = ['surge', 'accelerating', 'cooling']
  const rawMomentum = searchParams.get('momentum')
  const momentumType = VALID_MOMENTUM_TYPES.includes(rawMomentum) ? rawMomentum : null

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
  }, [momentumType, form]) // Fixed: added form to dependency array

  useEffect(() => {
    loadPositions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCity, selectedEducation, selectedTarget, selectedDate, momentumType])

  const loadAvailableDates = async () => {
    try {
      const dates = await getAvailableDates()
      setAvailableDates(dates || [])
    } catch (error) {
      console.error('加载日期失败:', error)
    }
  }

  const loadFilters = async () => {
    try {
      const data = await getFilters()
      setFilters(data)
    } catch (error) {
      console.error('加载筛选条件失败:', error)
    }
  }

  const loadPositions = async () => {
    try {
      setLoading(true)
      const params = {
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
                 const baseIndex = allDates.indexOf(baseDate);
                 // Need previous date. If baseIndex is last one (oldest), no prev date.
                 // allDates is now [latest, ..., oldest]
                 const prevDate = baseIndex >= 0 && baseIndex + 1 < allDates.length ? allDates[baseIndex + 1] : null;
                 
                 // If we have both dates (or handle logic inside getDailyMomentum to fallback)
                 const momentumData = await getDailyMomentum(baseDate, prevDate);
                 
                 if (momentumData && momentumData[momentumType]) {
                     params.codeList = momentumData[momentumType].ids || [];
                     if (params.codeList.length === 0) {
                         // No matches found for this momentum type
                         setPositions([]);
                         setTotal(0);
                         return; // Return early
                     }
                 }
             }
          } catch (e) {
              console.warn("Failed to apply momentum filter", e)
          }
      }

      const data = await getPositions(params)
      setPositions(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('加载职位列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadPositions()
  }

  const handleReset = () => {
    form.resetFields()
    setSelectedCity('武汉市')
    setSelectedEducation(undefined)
    setSelectedTarget(undefined)
    setSelectedDate('')
    setKeyword('')
    setPage(1)
  }

  const columns = [
    {
      title: '职位代码',
      dataIndex: DATA_KEYS.CODE,
      width: 120,
      render: (val) => <Text copyable className="code-text">{val}</Text>
    },
    {
      title: '用人单位',
      dataIndex: DATA_KEYS.UNIT,
      width: 180,
      ellipsis: true,
      render: (val) => (
        <Tooltip 
          position="tl" 
          content={<div style={{ maxWidth: 350, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val}</div>} 
          getPopupContainer={(node) => node.parentNode}
        >
          <span style={{ cursor: 'help' }}>{val}</span>
        </Tooltip>
      )
    },
    {
      title: '职位名称',
      dataIndex: DATA_KEYS.NAME,
      ellipsis: true,
      render: (val) => (
        <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val}</div>} getPopupContainer={(node) => node.parentNode}>
          {val}
        </Tooltip>
      )
    },
    {
      title: '招录',
      dataIndex: DATA_KEYS.QUOTA,
      width: 80,
      align: 'center'
    },
    {
      title: '报名',
      dataIndex: DATA_KEYS.APPLICANTS,
      width: 100,
      align: 'center',
      render: (val, record) => {
        const quota = record[DATA_KEYS.QUOTA]
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
      align: 'center',
      render: (_, record) => {
        const quota = record[DATA_KEYS.QUOTA]
        const applicants = record[DATA_KEYS.APPLICANTS]
        const competition = quota > 0
          ? (applicants / quota).toFixed(1)
          : 0
        const isHot = competition > 50
        const isCold = applicants === 0
        let status = 'success'
        if (isHot) status = 'error'
        if (isCold) status = 'default'
        
        return <Badge status={status} text={`${competition}:1`} />
      }
    },
    {
      title: '研究生专业',
      dataIndex: DATA_KEYS.MAJOR_PG,
      ellipsis: true,
      render: (val) => (
        <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode}>
          {val || '不限'}
        </Tooltip>
      )
    },
    {
      title: '本科专业',
      dataIndex: DATA_KEYS.MAJOR_UG,
      ellipsis: true,
      render: (val) => (
        <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode}>
          {val || '不限'}
        </Tooltip>
      )
    },
    {
      title: '招录对象',
      dataIndex: DATA_KEYS.TARGET,
      width: 120,
      ellipsis: true,
      render: (val) => (
        <Tooltip position="tl" content={<div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{val || '不限'}</div>} getPopupContainer={(node) => node.parentNode}>
          {val || '不限'}
        </Tooltip>
      )
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
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
                {momentumType ? <span style={{color: '#ff7d00'}}>态势筛选: {
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
          onValuesChange={(changed) => {
            if (changed.city !== undefined) setSelectedCity(changed.city)
            if (changed.education !== undefined) setSelectedEducation(changed.education)
            if (changed.target !== undefined) setSelectedTarget(changed.target)
            if (changed.keyword !== undefined) setKeyword(changed.keyword)
          }}
          initialValues={{ city: '武汉市', education: '', target: '', keyword: '' }}
        >
          <Row gutter={[24, 0]} align="end">
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="工作地点" field="city" htmlFor="city_input">
                <Select id="city_input" placeholder="选择地区" allowClear>
                  <Select.Option key="all" value="">全部</Select.Option>
                  {filters.cities?.map((city) => (
                    <Select.Option key={city} value={city}>{city}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="学历要求" field="education" htmlFor="education_input">
                <Select id="education_input" placeholder="选择学历" allowClear>
                  <Select.Option key="all" value="">全部</Select.Option>
                  {filters.education?.map((edu) => (
                    <Select.Option key={edu} value={edu}>{edu}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="招录对象" field="target" htmlFor="target_input">
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
            size="medium"
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
