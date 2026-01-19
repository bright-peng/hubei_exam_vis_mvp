import React from 'react'
import { Modal, Descriptions, Tag, Typography, Divider, Space, Button } from '@arco-design/web-react'
import { IconInfoCircle } from '@arco-design/web-react/icon'
import './PositionDetailModal.css'
import { DATA_KEYS } from '../constants'
import type { Position } from '../types'

const { Title, Text } = Typography

interface PositionDetailModalProps {
    position: Position | null
    onClose: () => void
}

const PositionDetailModal: React.FC<PositionDetailModalProps> = ({ position, onClose }) => {
    if (!position) return null

    const record = position as Record<string, unknown>

    const data = [
        { label: '职位代码', value: <Text copyable bold>{record[DATA_KEYS.CODE] as string}</Text> },
        { label: '职位名称', value: <Text bold color="arcoblue">{record[DATA_KEYS.NAME] as string}</Text> },
        { label: '招录机关', value: record[DATA_KEYS.ORG] as string },
        { label: '用人单位', value: record[DATA_KEYS.UNIT] as string },
        { label: '招录人数', value: <Tag color="blue">{record[DATA_KEYS.QUOTA] as number}</Tag> },
        { label: '招录对象', value: (record[DATA_KEYS.TARGET] as string) || '不限' },
        { label: '学历要求', value: (record[DATA_KEYS.EDUCATION] as string) || '不限' },
        { label: '学位要求', value: (record[DATA_KEYS.DEGREE] as string) || '不限' },
    ]

    const quota = (record[DATA_KEYS.QUOTA] as number) || 0
    const applicants = (record[DATA_KEYS.APPLICANTS] as number) || 0
    const competition = quota > 0
        ? (applicants / quota).toFixed(1)
        : '0'

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
            style={{ width: 1000, maxWidth: '95vw' }}
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
                    { label: '职位简介', value: (record[DATA_KEYS.INTRO] as string) || '暂无描述' },
                    { label: '研究生专业', value: (record[DATA_KEYS.MAJOR_PG] as string) || '不限' },
                    { label: '本科专业', value: (record[DATA_KEYS.MAJOR_UG] as string) || '不限' },
                    { label: '专科专业', value: (record[DATA_KEYS.MAJOR_OLD] as string) || '不限' },
                    { label: '备注', value: <Text type="secondary">{(record[DATA_KEYS.NOTES] as string) || '无'}</Text> },
                ]}
            />

            <Divider />

            <Title heading={6} style={{ marginBottom: 16 }}>实时报名动态</Title>
            <div className="stats-container-arco">
                <div className="stat-item-arco">
                    <div className="stat-label-arco">当前报名人数</div>
                    <div className="stat-value-arco highlight">{applicants}</div>
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
