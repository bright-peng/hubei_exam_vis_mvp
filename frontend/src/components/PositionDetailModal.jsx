import React from 'react';
import './PositionDetailModal.css';

const PositionDetailModal = ({ position, onClose }) => {
  if (!position) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>职位详情</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item full-width">
              <label>职位代码</label>
              <div className="value code">{position.职位代码}</div>
            </div>
            <div className="detail-item">
              <label>职位名称</label>
              <div className="value highlight">{position.职位名称}</div>
            </div>
            <div className="detail-item">
              <label>招录机关</label>
              <div className="value">{position.招录机关}</div>
            </div>
            <div className="detail-item">
              <label>用人单位</label>
              <div className="value">{position.用人单位}</div>
            </div>
            <div className="detail-item">
              <label>招录人数</label>
              <div className="value">{position.招录人数}</div>
            </div>
            
            <div className="detail-section full-width">
              <h3 className="section-subtitle">职位描述与要求</h3>
              <div className="detail-item full-width">
                <label>职位简介</label>
                <div className="value text-block">{position.职位简介 || '暂无描述'}</div>
              </div>
              <div className="detail-item">
                <label>招录对象</label>
                <div className="value">{position.招录对象 || '不限'}</div>
              </div>
              <div className="detail-item">
                <label>学历要求</label>
                <div className="value">{position.学历 || '不限'}</div>
              </div>
              <div className="detail-item">
                <label>研究生专业</label>
                <div className="value text-block">{position.研究生专业 || '不限'}</div>
              </div>
              <div className="detail-item">
                <label>本科专业</label>
                <div className="value text-block">{position.本科专业 || '不限'}</div>
              </div>
              <div className="detail-item full-width">
                <label>其他要求/备注</label>
                <div className="value text-block">{position.备注 || '无'}</div>
              </div>
            </div>

            <div className="detail-section full-width">
              <h3 className="section-subtitle">报名数据</h3>
              <div className="stats-row">
                <div className="stat-box">
                  <label>当前报名人数</label>
                  <div className="value num">{position.报名人数 || 0}</div>
                </div>
                <div className="stat-box">
                  <label>竞争比</label>
                  <div className="value num">{position.竞争比 || (position.报名人数 / position.招录人数).toFixed(1)}:1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default PositionDetailModal;
