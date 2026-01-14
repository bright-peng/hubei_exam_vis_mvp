import React, { useState, useEffect } from 'react'
import * as echarts from 'echarts'
import { getSummary, getHotPositions, getColdPositions, getTrend } from '../api'
import DateSelector from '../components/DateSelector'
import './Dashboard.css'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [hotPositions, setHotPositions] = useState([])
  const [coldPositions, setColdPositions] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryData, hotData, coldData] = await Promise.all([
        getSummary(selectedDate),
        getHotPositions(10, selectedDate),
        getColdPositions(10, selectedDate),
      ])
      setSummary(summaryData)
      setHotPositions(hotData.data || [])
      setColdPositions(coldData.data || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 渲染迷你趋势图
  useEffect(() => {
    if (!summary?.daily_files?.length) return

    getTrend().then((trendData) => {
      const chartDom = document.getElementById('mini-trend-chart')
      if (!chartDom) return

      const chart = echarts.init(chartDom)
      const data = trendData.data || []

      chart.setOption({
        backgroundColor: 'transparent',
        grid: {
          left: 40,
          right: 20,
          top: 20,
          bottom: 30,
        },
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
            itemStyle: {
              color: '#667eea',
              borderColor: '#fff',
              borderWidth: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0)' },
              ]),
            },
          },
        ],
      })

      const handleResize = () => chart.resize()
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize)
        chart.dispose()
      }
    })
  }, [summary])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!summary?.has_positions) {
    return (
      <div className="dashboard">
        <div className="empty-state glass-card">
          <div className="empty-icon">📁</div>
          <h2>暂无数据</h2>
          <p>请先上传职位表和报名数据</p>
          <a href="/upload" className="btn btn-primary">
            去上传数据
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <h2 className="section-title">📊 招录概况</h2>
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-value">{summary.total_positions?.toLocaleString()}</div>
          <div className="stat-label">招录职位数</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-value">{summary.total_quota?.toLocaleString()}</div>
          <div className="stat-label">计划招录人数</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-value">{summary.total_applicants?.toLocaleString()}</div>
          <div className="stat-label">报名人数</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-value">
            {summary.total_quota > 0
              ? (summary.total_applicants / summary.total_quota).toFixed(1)
              : '0'}
            <span className="stat-unit">:1</span>
          </div>
          <div className="stat-label">平均竞争比</div>
        </div>
      </div>

      {/* 趋势图 */}
      {summary.daily_files?.length > 0 && (
        <div className="glass-card trend-section">
          <h3 className="section-title">报名趋势</h3>
          <div id="mini-trend-chart" className="mini-chart"></div>
        </div>
      )}

      {/* 热门/冷门岗位 */}
      <div className="positions-grid">
        <div className="glass-card">
          <h3 className="section-title">
            <span className="hot-icon">🔥</span>
            热门岗位 Top 10
          </h3>
          <div className="position-list">
            {hotPositions.length === 0 ? (
              <div className="empty-list">暂无数据</div>
            ) : (
              hotPositions.map((pos, idx) => (
                <div key={pos.职位代码 || idx} className="position-item">
                  <div className="position-rank hot">{idx + 1}</div>
                  <div className="position-info">
                    <div className="position-name">{pos.职位名称 || pos.招录机关}</div>
                    <div className="position-meta">
                      {pos.用人单位 || ''} · {pos.工作地点 || ''}
                    </div>
                  </div>
                  <div className="position-stats">
                    <div className="applicants">{pos.报名人数?.toLocaleString() || 0}</div>
                    <div className="competition">
                      {pos.竞争比?.toFixed(1) || 0}:1
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="section-title">
            <span className="cold-icon">❄️</span>
            冷门岗位 Top 10
          </h3>
          <div className="position-list">
            {coldPositions.length === 0 ? (
              <div className="empty-list">暂无数据</div>
            ) : (
              coldPositions.map((pos, idx) => (
                <div key={pos.职位代码 || idx} className="position-item">
                  <div className="position-rank cold">{idx + 1}</div>
                  <div className="position-info">
                    <div className="position-name">{pos.职位名称 || pos.招录机关}</div>
                    <div className="position-meta">
                      {pos.用人单位 || ''} · {pos.工作地点 || ''}
                    </div>
                  </div>
                  <div className="position-stats">
                    <div className="applicants">{pos.报名人数?.toLocaleString() || 0}</div>
                    <div className="competition cold-text">
                      {pos.招录人数 || 1}人
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 更新时间 */}
      {summary.latest_date && (
        <div className="update-info">
          数据更新时间: {summary.latest_date}
        </div>
      )}
    </div>
  )
}
