import React from 'react'
import { Modal, Descriptions, Tag, Typography, Divider, Space, Button } from '@arco-design/web-react'
import { IconInfoCircle } from '@arco-design/web-react/icon'
import './PositionDetailModal.css'

const { Title, Text } = Typography

const PositionDetailModal = ({ position, onClose }) => {
  if (!position) return null

  const data = [
    { label: '职位代码', value: <Text copyable bold>{position.职位代码}</Text> },
    { label: '职位名称', value: <Text bold color="arcoblue">{position.职位名称}</Text> },
    { label: '招录机关', value: position.招录机关 },
    { label: '用人单位', value: position.用人单位 },
    { label: '招录人数', value: <Tag color="blue">{position.招录人数}</Tag> },
    { label: '招录对象', value: position.招录对象 || '不限' },
    { label: '学历要求', value: position.学历 || '不限' },
    { label: '学位要求', value: position.学位 || '不限' },
  ]

  const competition = position.招录人数 > 0
    ? (position.报名人数 / position.招录人数).toFixed(1)
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
      width="90%"
      style={{ maxWidth: '720px' }}
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
          { label: '职位简介', value: position.职位简介 || '暂无描述' },
          { label: '研究生专业', value: position.研究生专业 || '不限' },
          { label: '本科专业', value: position.本科专业 || '不限' },
          { label: '专科专业', value: position.专科专业 || '不限' },
          { label: '备注', value: <Text type="secondary">{position.备注 || '无'}</Text> },
        ]}
      />

      <Divider />
      
      <Title heading={6} style={{ marginBottom: 16 }}>实时报名动态</Title>
      <div className="stats-container-arco">
        <div className="stat-item-arco">
          <div className="stat-label-arco">当前报名人数</div>
          <div className="stat-value-arco highlight">{position.报名人数 || 0}</div>
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
