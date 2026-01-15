import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Grid, 
  Typography, 
  Upload, 
  DatePicker, 
  Button, 
  Space, 
  Alert, 
  Message, 
  Tag, 
  Timeline, 
  Divider,
  Empty
} from '@arco-design/web-react'
import { 
  IconUpload, 
  IconFile, 
  IconCalendar, 
  IconBulb, 
  IconCheckCircle, 
  IconCloseCircle
} from '@arco-design/web-react/icon'
import { uploadPositions, uploadDaily, getSummary } from '../api'
import './DataUpload.css'

const { Row, Col } = Grid
const { Title, Text, Paragraph } = Typography

export default function DataUpload() {
  const [positionFile, setPositionFile] = useState(null)
  const [dailyFile, setDailyFile] = useState(null)
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const data = await getSummary()
      setSummary(data)
    } catch (error) {
      console.error('加载摘要失败:', error)
    }
  }

  const handlePositionUpload = async () => {
    if (!positionFile) {
      Message.warning('请选择职位表文件')
      return
    }

    try {
      setUploading(true)
      const result = await uploadPositions(positionFile)
      Message.success({
        content: `职位表上传成功！共 ${result.stats.total_positions} 个职位`,
        duration: 5000
      })
      setPositionFile(null)
      loadSummary()
    } catch (error) {
      Message.error(`上传失败: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDailyUpload = async () => {
    if (!dailyFile) {
      Message.warning('请选择每日报名数据文件')
      return
    }

    try {
      setUploading(true)
      const result = await uploadDaily(dailyFile, dailyDate)
      Message.success({
        content: `${dailyDate} 报名数据上传成功！`,
        duration: 5000
      })
      setDailyFile(null)
      loadSummary()
    } catch (error) {
      Message.error(`上传失败: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="data-upload-arco fade-in">
      <div style={{ marginBottom: 32 }}>
        <Title heading={3}>📤 数据上传中心</Title>
        <Text type="secondary">上传职位表和每日报名数据，系统将自动进行分析可视化</Text>
      </div>

      <Row gutter={24}>
        {/* 职位表上传 */}
        <Col span={12}>
          <Card 
            bordered={false} 
            className="glass-card-arco upload-card-arco"
            title={<Space><IconFile /> 职位库维护</Space>}
          >
            <Paragraph type="secondary">
              上传招考职位表（Excel格式），包含职位代码、名称、地点、学历要求等。
            </Paragraph>
            
            <Upload
              drag
              accept=".xlsx,.xls"
              multiple={false}
              autoUpload={false}
              onRemove={() => setPositionFile(null)}
              onChange={(_, file) => setPositionFile(file.originFile)}
              limit={1}
            >
              <div className="upload-drag-area">
                <IconUpload style={{ fontSize: 32, color: 'var(--primary-color)' }} />
                <Text style={{ marginTop: 12 }}>点击或拖拽文件到这里上传职位表</Text>
              </div>
            </Upload>

            <Alert
              type="info"
              showIcon
              icon={<IconBulb />}
              style={{ marginTop: 16 }}
              content="支持字段：代码、机关、地点、人数、学历、专业等"
            />

            <Button 
              type="primary" 
              long 
              loading={uploading} 
              disabled={!positionFile}
              onClick={handlePositionUpload}
              style={{ marginTop: 24 }}
            >
              执行上传
            </Button>

            {summary?.has_positions && (
              <div className="status-badge success">
                <IconCheckCircle /> 已同步 {summary.total_positions} 个职位
              </div>
            )}
          </Card>
        </Col>

        {/* 报名数据上传 */}
        <Col span={12}>
          <Card 
            bordered={false} 
            className="glass-card-arco upload-card-arco"
            title={<Space><IconUpload /> 每日数据更新</Space>}
          >
            <Paragraph type="secondary">
              选择对应的日期，上传官方每日发布的报名统计Excel文件。
            </Paragraph>

            <div style={{ marginBottom: 16 }}>
              <Text style={{ display: 'block', marginBottom: 8 }}>数据所属日期：</Text>
              <DatePicker 
                style={{ width: '100%' }}
                value={dailyDate} 
                onChange={(val) => setDailyDate(val)} 
              />
            </div>
            
            <Upload
              drag
              accept=".xlsx,.xls"
              multiple={false}
              autoUpload={false}
              onRemove={() => setDailyFile(null)}
              onChange={(_, file) => setDailyFile(file.originFile)}
              limit={1}
            >
              <div className="upload-drag-area">
                <IconUpload style={{ fontSize: 32, color: '#00d0b1' }} />
                <Text style={{ marginTop: 12 }}>点击或拖拽文件到这里上传报名数据</Text>
              </div>
            </Upload>

            <Button 
              type="primary" 
              long 
              status="success"
              loading={uploading} 
              disabled={!dailyFile}
              onClick={handleDailyUpload}
              style={{ marginTop: 24 }}
            >
              同步报名进度
            </Button>

            {summary?.daily_files?.length > 0 && (
              <div className="status-badge info">
                <IconCalendar /> 已积累 {summary.daily_files.length} 天的历史数据
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={16}>
          <Card title="引导说明" bordered={false} className="glass-card-arco">
            <Timeline>
              <Timeline.Item label="第一步" dot={<IconFile style={{color: '#165dff'}} />}>
                <Title heading={6}>职位库初始化</Title>
                <Paragraph>将官方职位表 Excel 上传，建立基础职位索引。仅需上传一次。</Paragraph>
              </Timeline.Item>
              <Timeline.Item label="第二步" dot={<IconCalendar style={{color: '#ff7d00'}} />}>
                <Title heading={6}>报名数据轮询</Title>
                <Paragraph>每日下载官方汇总表，选择日期并上传。系统会自动计算竞争比并生成趋势图。</Paragraph>
              </Timeline.Item>
              <Timeline.Item label="第三步" dot={<IconCheckCircle style={{color: '#00b42a'}} />}>
                <Title heading={6}>多维深度可视化</Title>
                <Paragraph>在「总览」、「职位列表」等模块查看全省实时的报考冷热趋势。</Paragraph>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="已录入日期" bordered={false} className="glass-card-arco">
            {summary?.daily_files?.length > 0 ? (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {summary.daily_files.sort().reverse().map((date) => (
                  <div key={date} style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <Text>{date}</Text>
                    <Tag size="small" color="arcoblue">已同步</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无历史数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
