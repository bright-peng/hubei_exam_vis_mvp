import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import MapView from './pages/MapView'
import TrendView from './pages/TrendView'
import PositionList from './pages/PositionList'
import DataUpload from './pages/DataUpload'
import WuhanView from './pages/WuhanView'
import WatchList from './pages/WatchList'
import LockScreen from './components/LockScreen'
import './App.css'

export default function App() {
  const [isLocked, setIsLocked] = useState(true)

  useEffect(() => {
    // 检查会话存储中是否有解锁标记
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
    <div className="app">
      {/* 头部导航 */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📊</span>
            <div className="logo-text">
              <h1>湖北省公务员考试</h1>
              <span className="logo-subtitle">报名数据可视化平台</span>
            </div>
          </div>
          
          <nav className="nav">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
              <span className="nav-icon">🏠</span>
              总览
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">🗺️</span>
              地图
            </NavLink>
            <NavLink to="/wuhan" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">🏙️</span>
              武汉
            </NavLink>
            <NavLink to="/watchlist" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">⭐</span>
              关注
            </NavLink>
            <NavLink to="/trend" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📈</span>
              趋势
            </NavLink>
            <NavLink to="/positions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📋</span>
              职位表
            </NavLink>
            {/* 静态部署模式下隐藏上传入口
            <NavLink to="/upload" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📤</span>
              数据上传
            </NavLink>
            */}
          </nav>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/wuhan" element={<WuhanView />} />
          <Route path="/watchlist" element={<WatchList />} />
          <Route path="/trend" element={<TrendView />} />
          <Route path="/positions" element={<PositionList />} />
          <Route path="/upload" element={<DataUpload />} />
        </Routes>
      </main>
      
      {/* 底部 */}
      <footer className="footer">
        <p>湖北省2026年度公务员考试报名数据可视化 · 仅供参考</p>
      </footer>
    </div>
  )
}
