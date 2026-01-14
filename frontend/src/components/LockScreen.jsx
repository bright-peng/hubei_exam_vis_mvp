import React, { useState } from 'react';
import './LockScreen.css';

// 简单的密码配置（注意：这是前端硬编码，不够安全，仅防普通用户）
// 也可以配置为环境变量 import.meta.env.VITE_APP_PASSWORD
const CORRECT_PASSWORD = '888'; 

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-card glass-card">
        <div className="lock-icon">🔒</div>
        <h2>访问受限</h2>
        <p>请输入访问密码以查看数据</p>
        
        <form onSubmit={handleSubmit} className="lock-form">
          <input
            type="password"
            className={`input password-input ${error ? 'input-error' : ''}`}
            placeholder="请输入密码"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            autoFocus
          />
          {error && <div className="error-msg">密码错误，请重试</div>}
          
          <button type="submit" className="btn btn-primary unlock-btn">
            解锁进入
          </button>
        </form>
      </div>
    </div>
  );
}
