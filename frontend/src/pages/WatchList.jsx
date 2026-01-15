import { useState, useEffect, useMemo } from 'react'
import { 
  Card, 
  Grid, 
  Statistic, 
  Input, 
  Button, 
  Space, 
  Tag, 
  Table, 
  Typography, 
  Empty, 
  Badge, 
  Alert,
  Tooltip as ArcoTooltip,
  Divider,
  Modal,
  Message,
  Spin
} from '@arco-design/web-react'
import { 
  IconStar, 
  IconPlus, 
  IconRefresh, 
  IconDelete, 
  IconInteraction,
  IconEye,
  IconClose,
  IconDashboard
} from '@arco-design/web-react/icon'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import PositionDetailModal from '../components/PositionDetailModal'
import { getPositionsByCodes, getTrendByCodes } from '../api'
import './WatchList.css'

const { Row, Col } = Grid
const { Title, Text } = Typography

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
]

const COLORS = [
  '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80',
  '#f97316', '#2dd4bf', '#818cf8', '#fb7185', '#34d399'
]

function WatchList() {
  const [watchCodes, setWatchCodes] = useState(() => {
    const saved = localStorage.getItem('watchlist_codes')
    return saved ? JSON.parse(saved) : DEFAULT_WATCH_CODES
  })
  const [positions, setPositions] = useState([])
  const [trendData, setTrendData] = useState(null)
  const [notFound, setNotFound] = useState([])
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [latestDate, setLatestDate] = useState('')
  const [showChart, setShowChart] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState(null)

  useEffect(() => {
    if (watchCodes.length > 0) {
      fetchPositions()
      fetchTrendData()
    } else {
      setPositions([])
      setTrendData(null)
      setLoading(false)
    }
  }, [watchCodes])

  useEffect(() => {
    localStorage.setItem('watchlist_codes', JSON.stringify(watchCodes))
  }, [watchCodes])

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const data = await getPositionsByCodes(watchCodes)
      setPositions(data.data || [])
      setNotFound(data.not_found || [])
      setLatestDate(data.latest_date || '')
    } catch (err) {
      console.error('获取职位数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrendData = async () => {
    setTrendLoading(true)
    try {
      const data = await getTrendByCodes(watchCodes)
      setTrendData(data)
    } catch (err) {
      console.error('获取趋势数据失败:', err)
    } finally {
      setTrendLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!trendData || !trendData.dates || trendData.dates.length === 0) {
      return []
    }

    return trendData.dates.map((date, index) => {
      const point = { date: date.slice(5) }
      trendData.positions.forEach(pos => {
        point[pos.code] = pos.data[index] || 0
      })
      return point
    })
  }, [trendData])

  const handleAddCodes = () => {
    if (!inputValue.trim()) return
    const newCodes = inputValue
      .split(/[,，\n\s]+/)
      .map(c => c.trim())
      .filter(c => c && /^\d{17}$/.test(c))
    if (newCodes.length > 0) {
      const uniqueCodes = [...new Set([...watchCodes, ...newCodes])]
      setWatchCodes(uniqueCodes)
      setInputValue('')
      Message.success(`成功添加 ${newCodes.length} 个职位代码`)
    } else {
      Message.warning('请输入有效的17位职位代码')
    }
  }

  const handleRemoveCode = (code) => {
    setWatchCodes(watchCodes.filter(c => c !== code))
  }

  const handleClearAll = () => {
    Modal.confirm({
      title: '清空关注',
      content: '确定要清空所有关注的职位吗？',
      onOk: () => setWatchCodes([]),
    })
  }

  const handleResetDefault = () => {
    setWatchCodes(DEFAULT_WATCH_CODES)
  }

  const totalStats = positions.reduce((acc, pos) => ({
    quota: acc.quota + (pos.招录人数 || 0),
    applicants: acc.applicants + (pos.报名人数 || 0),
  }), { quota: 0, applicants: 0 })

  const avgRatio = totalStats.quota > 0
    ? (totalStats.applicants / totalStats.quota).toFixed(1)
    : '0.0'

  const hasMultipleDays = trendData && trendData.dates && trendData.dates.length > 1

  const columns = [
    {
      title: '职位代码',
      dataIndex: '职位代码',
      width: 140,
      render: (val) => <Text copyable className="code-text" size="small">{val}</Text>
    },
    {
      title: '职位名称',
      dataIndex: '职位名称',
      ellipsis: true,
      render: (val) => <ArcoTooltip content={val}>{val}</ArcoTooltip>
    },
    {
      title: '用人单位',
      dataIndex: '用人单位',
      ellipsis: true,
      render: (val) => <ArcoTooltip content={val}>{val}</ArcoTooltip>
    },
    {
      title: '招录',
      dataIndex: '招录人数',
      width: 70,
      align: 'center'
    },
    {
      title: '报名',
      dataIndex: '报名人数',
      width: 90,
      align: 'center',
      sorter: (a, b) => a.报名人数 - b.报名人数,
      render: (val) => <Text bold color="arcoblue">{val?.toLocaleString()}</Text>
    },
    {
      title: '竞争比',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.竞争比 - b.竞争比,
      render: (_, record) => {
        const isHot = record.竞争比 > 50
        return <Badge status={isHot ? 'error' : 'success'} text={`${record.竞争比}:1`} />
      }
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" size="mini" icon={<IconEye />} onClick={() => setSelectedPosition(record)} />
          <Button type="text" status="danger" size="mini" icon={<IconDelete />} onClick={() => handleRemoveCode(record.职位代码)} />
        </Space>
      )
    }
  ]

  return (
    <div className="watchlist-arco fade-in">
      {/* 头部概览 */}
      <Row justify="space-between" align="center" style={{ marginBottom: 24 }} gutter={[0, 16]}>
        <Col xs={24} sm={12}>
          <Title heading={3} style={{ margin: 0 }}>⭐ 关注职位</Title>
          <Text type="secondary">追踪您关注的特定职位的报名动态</Text>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="glass-card-arco stat-card-arco">
            <Statistic title="关注职位" value={positions.length} groupSeparator />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="glass-card-arco stat-card-arco">
            <Statistic title="计划招录" value={totalStats.quota} groupSeparator />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="glass-card-arco stat-card-arco">
            <Statistic title="累计报名" value={totalStats.applicants} groupSeparator />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} className="glass-card-arco stat-card-arco">
            <Statistic title="平均竞争比" value={avgRatio} suffix=":1" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* 左侧：添加面板 */}
        <Col xs={24} md={8}>
          <Card 
            title={<Space><IconPlus /> 代码关注</Space>} 
            bordered={false} 
            className="glass-card-arco"
            extra={
              <Space>
                <Button size="mini" type="text" onClick={handleResetDefault}>默认</Button>
                <Button size="mini" type="text" status="danger" onClick={handleClearAll}>清空</Button>
              </Space>
            }
          >
            <Input.TextArea
              value={inputValue}
              onChange={setInputValue}
              placeholder="输入17位代码，支持逗号/换行分隔"
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" long icon={<IconPlus />} onClick={handleAddCodes}>添加职位</Button>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <Text type="secondary" size="small">已关注 ({watchCodes.length}):</Text>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {watchCodes.map(code => (
                <Tag key={code} closable onClose={() => handleRemoveCode(code)} size="small">
                  {code}
                </Tag>
              ))}
            </div>
            
            {notFound.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Alert type="warning" showIcon={false} title="未找到">
                  {notFound.map(code => (
                    <Tag key={code} closable onClose={() => handleRemoveCode(code)} size="small" color="red" style={{ margin: 4 }}>
                      {code}
                    </Tag>
                  ))}
                </Alert>
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：趋势图 */}
        <Col xs={24} md={16}>
          <Card 
            title={<Space><IconInteraction /> 趋势追踪</Space>} 
            bordered={false} 
            className="glass-card-arco"
            extra={
              <Button size="mini" type="text" onClick={() => setShowChart(!showChart)}>
                {showChart ? '隐藏' : '显示'}
              </Button>
            }
          >
            {showChart && (
              <div style={{ height: 350 }}>
                {trendLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin /></div>
                ) : !hasMultipleDays ? (
                  <Empty description="趋势图表需要多天数据，导入更多天的数据后显示" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ bottom: -20 }} />
                      {trendData.positions.map((pos, index) => (
                        <Line key={pos.code} type="monotone" dataKey={pos.code} name={pos.name || pos.code} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
            {!showChart && <Empty description="图表已隐藏" />}
          </Card>
        </Col>
      </Row>

      {/* 职位详情表格 */}
      <Card 
        title={<Space><IconDashboard /> 职位实时数据</Space>} 
        bordered={false} 
        className="glass-card-arco" 
        style={{ marginTop: 24 }}
        extra={latestDate && <Tag color="arcoblue">最新数据日期: {latestDate}</Tag>}
      >
        <Table
          loading={loading}
          columns={columns}
          data={positions}
          pagination={false}
          rowKey="职位代码"
          size="middle"
          scroll={{ x: 1000 }}
          noDataElement={<Empty description="暂无关注职位的数据" />}
        />
      </Card>

      <PositionDetailModal position={selectedPosition} onClose={() => setSelectedPosition(null)} />
    </div>
  )
}

export default WatchList
