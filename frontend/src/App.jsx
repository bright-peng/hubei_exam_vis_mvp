import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Typography, Space } from '@arco-design/web-react'
import { 
  IconDashboard, 
  IconCommon, 
  IconApps, 
  IconStar, 
  IconBook, 
  IconHistory, 
  IconUpload,
  IconMenu
} from '@arco-design/web-react/icon'
import { Drawer, Button } from '@arco-design/web-react'
import Dashboard from './pages/Dashboard'
import MapView from './pages/MapView'
import TrendView from './pages/TrendView'
import PositionList from './pages/PositionList'
import DataUpload from './pages/DataUpload'
import WuhanView from './pages/WuhanView'
import WatchList from './pages/WatchList'
import LockScreen from './components/LockScreen'
import './App.css'

const { Header, Content, Footer } = Layout
const { Title } = Typography

export default function App() {
  const [isLocked, setIsLocked] = useState(true)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unlocked = sessionStorage.getItem('app_unlocked') === 'true'
    setIsLocked(!unlocked)
  }, [])

  const handleUnlock = () => {
    sessionStorage.setItem('app_unlocked', 'true')
    setIsLocked(false)
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return (
    <Layout className="app-layout" style={{ minHeight: '100vh' }}>
      <Header className="header-arco">
        <div className="header-content-arco">
          <div className="logo-arco">
            <Space size={12}>
              <div className="logo-icon-arco">📊</div>
              <div className="logo-text-arco">
                <Title heading={5} style={{ margin: 0, color: '#fff' }}>湖北省公务员考试</Title>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>报名数据可视化平台</div>
              </div>
            </Space>
          </div>
          
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            onClickMenuItem={(key) => {
              if (key === 'switch-ui') {
                localStorage.setItem('ui_version', 'legacy');
                window.location.reload();
              } else {
                navigate(key);
              }
            }}
            className="header-menu-arco"
          >
            <Menu.Item key="/">
              <IconDashboard /> 总览
            </Menu.Item>
            <Menu.Item key="/map">
              <IconCommon /> 地图
            </Menu.Item>
            <Menu.Item key="/wuhan">
              <IconApps /> 武汉
            </Menu.Item>
            <Menu.Item key="/watchlist">
              <IconStar /> 关注
            </Menu.Item>
            <Menu.Item key="/trend">
              <IconHistory /> 趋势
            </Menu.Item>
            <Menu.Item key="/positions">
              <IconBook /> 职位表
            </Menu.Item>
            <Menu.Item key="switch-ui">
              <span style={{ color: '#ff9800' }}>🏛️ 切换至旧版</span>
            </Menu.Item>
          </Menu>

          <Button 
            className="mobile-menu-trigger" 
            icon={<IconMenu />} 
            onClick={() => setDrawerVisible(true)} 
            type="text"
            style={{ color: '#fff' }}
          />

          <Drawer
            width={240}
            title="导航菜单"
            visible={drawerVisible}
            onOk={() => setDrawerVisible(false)}
            onCancel={() => setDrawerVisible(false)}
            footer={null}
            className="mobile-drawer-arco"
          >
            <Menu
              selectedKeys={[location.pathname]}
              onClickMenuItem={(key) => {
                setDrawerVisible(false);
                if (key === 'switch-ui') {
                  localStorage.setItem('ui_version', 'legacy');
                  window.location.reload();
                } else {
                  navigate(key);
                }
              }}
            >
              <Menu.Item key="/">
                <IconDashboard /> 总览
              </Menu.Item>
              <Menu.Item key="/map">
                <IconCommon /> 地图
              </Menu.Item>
              <Menu.Item key="/wuhan">
                <IconApps /> 武汉
              </Menu.Item>
              <Menu.Item key="/watchlist">
                <IconStar /> 关注
              </Menu.Item>
              <Menu.Item key="/trend">
                <IconHistory /> 趋势
              </Menu.Item>
              <Menu.Item key="/positions">
                <IconBook /> 职位表
              </Menu.Item>
              <Menu.Item key="switch-ui">
                <span style={{ color: '#ff9800' }}>🏛️ 切换至旧版</span>
              </Menu.Item>
            </Menu>
          </Drawer>
        </div>
      </Header>
      
      <Content className="main-content-arco">
        <div className="container-arco">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/wuhan" element={<WuhanView />} />
            <Route path="/watchlist" element={<WatchList />} />
            <Route path="/trend" element={<TrendView />} />
            <Route path="/positions" element={<PositionList />} />
            <Route path="/upload" element={<DataUpload />} />
          </Routes>
        </div>
      </Content>
      
      <Footer className="footer-arco">
        湖北省2026年度公务员考试报名数据可视化 · 仅供参考
      </Footer>
    </Layout>
  )
}
