import React from 'react'
import { Modal, Descriptions, Tag, Typography, Divider, Space, Button } from '@arco-design/web-react'
import { IconInfoCircle } from '@arco-design/web-react/icon'
import './PositionDetailModal.css'
import { DATA_KEYS } from '../constants'

const { Title, Text } = Typography

const PositionDetailModal = ({ position, onClose }) => {
  if (!position) return null

  const data = [
    { label: '职位代码', value: <Text copyable bold>{position[DATA_KEYS.CODE]}</Text> },
    { label: '职位名称', value: <Text bold color="arcoblue">{position[DATA_KEYS.NAME]}</Text> },
    { label: '招录机关', value: position[DATA_KEYS.ORG] },
    { label: '用人单位', value: position[DATA_KEYS.UNIT] },
    { label: '招录人数', value: <Tag color="blue">{position[DATA_KEYS.QUOTA]}</Tag> },
    { label: '招录对象', value: position[DATA_KEYS.TARGET] || '不限' },
    { label: '学历要求', value: position[DATA_KEYS.EDUCATION] || '不限' },
    { label: '学位要求', value: position[DATA_KEYS.DEGREE] || '不限' },
  ]

  const competition = position[DATA_KEYS.QUOTA] > 0
    ? (position[DATA_KEYS.APPLICANTS] / position[DATA_KEYS.QUOTA]).toFixed(1)
    : 0

  return (
    <Modal
      title={
        <Space>
          <IconInfoCircle style={{ color: 'var(--primary-color)' }} />
          <span>职位详情</span>
        </Space>
      }
      visible={!!position}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ maxWidth: '95vw' }}
      className="position-detail-modal-arco"
    >
      <Descriptions
        column={{ xs: 1, sm: 2, md: 2 }}
        data={data}
        labelStyle={{ color: 'var(--text-secondary)', width: 100 }}
        valueStyle={{ color: 'var(--text-primary)' }}
      />
      
      <Divider />
      
      <Title heading={6} style={{ marginBottom: 12 }}>职位描述与专业要求</Title>
      <Descriptions
        column={1}
        layout="horizontal"
        labelStyle={{ color: 'var(--text-secondary)', width: 100 }}
        data={[
          { label: '职位简介', value: position[DATA_KEYS.INTRO] || '暂无描述' },
          { label: '研究生专业', value: position[DATA_KEYS.MAJOR_PG] || '不限' },
          { label: '本科专业', value: position[DATA_KEYS.MAJOR_UG] || '不限' },
          { label: '专科专业', value: position[DATA_KEYS.MAJOR_OLD] || '不限' },
          { label: '备注', value: <Text type="secondary">{position[DATA_KEYS.NOTES] || '无'}</Text> },
        ]}
      />

      <Divider />
      
      <Title heading={6} style={{ marginBottom: 16 }}>实时报名动态</Title>
      <div className="stats-container-arco">
        <div className="stat-item-arco">
          <div className="stat-label-arco">当前报名人数</div>
          <div className="stat-value-arco highlight">{position[DATA_KEYS.APPLICANTS] || 0}</div>
        </div>
        <div className="stat-item-arco">
          <div className="stat-label-arco">竞争比</div>
          <div className="stat-value-arco warning">{competition}:1</div>
        </div>
      </div>

      <div className="modal-footer-arco">
        <Button 
          type="secondary" 
          onClick={onClose}
          style={{ width: '100%', height: 40, marginTop: 24, borderRadius: 8 }}
        >
          关闭窗口
        </Button>
      </div>
    </Modal>
  )
}

export default PositionDetailModal
