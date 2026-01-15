import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './legacy/pages/Dashboard'
import MapView from './legacy/pages/MapView'
import TrendView from './legacy/pages/TrendView'
import PositionList from './legacy/pages/PositionList'
import DataUpload from './legacy/pages/DataUpload'
import WuhanView from './legacy/pages/WuhanView'
import WatchList from './legacy/pages/WatchList'
import LockScreen from './components/LockScreen'
import './AppLegacy.css'

export default function AppLegacy() {
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

  const switchToArco = () => {
    localStorage.setItem('ui_version', 'arco')
    window.location.reload()
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return (
    <div className="app legacy-ui">
      {/* 头部导航 */}
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => window.location.href = '/'}>
            <span className="logo-icon">📊</span>
            <div className="logo-text">
              <h1>湖北省公务员考试 (旧版)</h1>
              <span className="logo-subtitle">报名数据可视化平台</span>
            </div>
          </div>
          
          <nav className="nav">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
              总览
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              地图
            </NavLink>
            <NavLink to="/wuhan" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              武汉
            </NavLink>
            <NavLink to="/watchlist" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              关注
            </NavLink>
            <NavLink to="/trend" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              趋势
            </NavLink>
            <NavLink to="/positions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              职位表
            </NavLink>
            
            <button className="ui-switch-btn" onClick={switchToArco}>
              ✨ 切换至新版
            </button>
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
        <p>湖北省2026年度公务员考试报名数据可视化 (旧版UI) · 仅供参考</p>
      </footer>
    </div>
  )
}
