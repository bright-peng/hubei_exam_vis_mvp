import React, { useState } from 'react'
import { Card, Input, Button, Typography, Space, Message, Alert } from '@arco-design/web-react'
import { IconLock } from '@arco-design/web-react/icon'
import './LockScreen.css'

const { Title, Text } = Typography

const VALID_PASSWORDS = ['whu', '888', '666']

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = () => {
    if (VALID_PASSWORDS.includes(password)) {
      onUnlock()
      Message.success('欢迎回来')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="lock-screen-arco">
      <Card bordered={false} className="glass-card-arco lock-card-arco">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="lock-icon-arco">
            <IconLock style={{ fontSize: 40, color: 'var(--primary-color)' }} />
          </div>
          <Title heading={4} style={{ marginTop: 16, marginBottom: 8 }}>访问受限</Title>
          <Text type="secondary">请输入访问密码以进入系统</Text>
        </div>
        
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Input.Password
            placeholder="请输入访问密码"
            value={password}
            onChange={(val) => {
              setPassword(val)
              setError(false)
            }}
            onPressEnter={handleSubmit}
            size="large"
            autoFocus
          />
          
          {error && <Alert type="error" content="密码错误，请重试" showIcon={false} />}
          
          <Button type="primary" size="large" long onClick={handleSubmit}>
            解锁进入
          </Button>
        </Space>
      </Card>
    </div>
  )
}
