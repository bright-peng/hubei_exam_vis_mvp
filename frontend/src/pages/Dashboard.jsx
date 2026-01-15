import React, { useState, useEffect, useRef } from 'react'
import { Card, Grid, Statistic, Space, Typography, Empty, Button, Spin, Tag, Badge } from '@arco-design/web-react'
import { IconFire, IconThunderbolt, IconMoon, IconHome, IconCalendar } from '@arco-design/web-react/icon'
import * as echarts from 'echarts'
import { getSummary, getHotPositions, getColdPositions, getTrend, getSurgePositions } from '../api'
import DateSelector from '../components/DateSelector'
import './Dashboard.css'

const { Row, Col } = Grid
const { Title, Text } = Typography

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [hotPositions, setHotPositions] = useState([])
  const [coldPositions, setColdPositions] = useState([])
  const [surgePositions, setSurgePositions] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const chartRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const promises = [
        getSummary(selectedDate),
        getHotPositions(10, selectedDate),
        getColdPositions(10, selectedDate),
      ]
      
      if (!selectedDate) {
        promises.push(getSurgePositions())
      }

      const results = await Promise.all(promises)
      const summaryData = results[0]
      const hotData = results[1]
      const coldData = results[2]
      const surgeData = !selectedDate ? results[3] : { data: [] }

      setSummary(summaryData)
      setHotPositions(hotData.data || [])
      setColdPositions(coldData.data || [])
      setSurgePositions(surgeData.data?.slice(0, 10) || []) 
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!summary?.daily_files?.length || loading) return

    let chart = null

    const initChart = async () => {
      const trendData = await getTrend()
      if (!chartRef.current) return
      
      // Dispose old instance if exists
      const existingInstance = echarts.getInstanceByDom(chartRef.current)
      if (existingInstance) {
        existingInstance.dispose()
      }

      chart = echarts.init(chartRef.current)
      const data = Array.isArray(trendData?.data) ? trendData.data : []

      chart.setOption({
        backgroundColor: 'transparent',
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          textStyle: { color: '#fff' },
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
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        },
        series: [
          {
            type: 'line',
            data: data.map((d) => d.applicants),
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
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

      window.addEventListener('resize', () => chart && chart.resize())
    }

    initChart()

    return () => {
      if (chart) {
        window.removeEventListener('resize', () => chart && chart.resize())
        chart.dispose()
      }
    }
  }, [summary, loading])

  if (loading && !summary) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spin size={40} /></div>
  }

  if (!summary?.total_positions) {
    return (
      <div className="dashboard-empty-container">
        <Card bordered={false} className="glass-card-arco" style={{ textAlign: 'center', padding: '60px 0' }}>
          <Empty icon={<IconHome style={{ fontSize: 60, color: 'var(--primary-color)' }} />} description="暂无数据，请先上传数据" />
          <Button type="primary" style={{ marginTop: 24 }} onClick={() => window.location.href='/upload'}>去上传</Button>
        </Card>
      </div>
    )
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

      {summary.daily_files?.length > 0 && (
        <Card title="报名趋势" bordered={false} className="glass-card-arco" style={{ marginTop: 24 }}>
          <div ref={chartRef} style={{ height: 260 }}></div>
        </Card>
      )}

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {!selectedDate && (
          <Col xs={24} md={8}>
            <Card title={<Space><IconThunderbolt style={{ color: '#f77234' }} />报名激增 Top 10</Space>} bordered={false} className="glass-card-arco list-card-arco">
              {surgePositions.map((pos, idx) => (
                <div key={idx} className="rank-item-arco">
                  <div className={`rank-number-arco rank-${idx + 1}`}>{idx + 1}</div>
                  <div className="rank-main-arco">
                    <Text bold ellipsis style={{ width: '100%' }}>{pos.name || pos.unit}</Text>
                    <Space size={4} style={{ display: 'flex' }}>
                       <Text className="dashboard-code-arco">{pos.code}</Text>
                       <span style={{ color: 'var(--text-muted)' }}>·</span>
                       <Text type="secondary" size="small" ellipsis>{pos.unit}</Text>
                    </Space>
                  </div>
                  <div className="rank-extra-arco">
                    <Text bold style={{ color: '#f77234' }}>+{pos.delta}</Text>
                    <Text size="tiny" type="secondary">总 {pos.applicants_today}</Text>
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
                  <Text bold ellipsis style={{ width: '100%' }}>{pos.职位名称 || pos.招录机关}</Text>
                  <Space size={4} style={{ display: 'flex' }}>
                    <Text style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>{pos.职位代码}</Text>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>·</span>
                    <Text type="secondary" size="small" ellipsis>{pos.用人单位}</Text>
                  </Space>
                </div>
                <div className="rank-extra-arco">
                  <Text bold>{pos.报名人数}</Text>
                  <Tag color="red" size="small">{pos.竞争比?.toFixed(1)}:1</Tag>
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
                  <Text bold ellipsis style={{ width: '100%' }}>{pos.职位名称 || pos.招录机关}</Text>
                  <Space size={4} style={{ display: 'flex' }}>
                    <Text style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>{pos.职位代码}</Text>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>·</span>
                    <Text type="secondary" size="small" ellipsis>{pos.用人单位}</Text>
                  </Space>
                </div>
                <div className="rank-extra-arco">
                  <Text bold>{pos.报名人数}</Text>
                  <Text type="secondary" size="small">招{pos.招录人数}</Text>
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
