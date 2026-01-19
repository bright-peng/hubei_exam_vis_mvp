import React, { useState, useRef, useEffect, ChangeEvent } from 'react'
import { uploadPositions, uploadDaily, getSummary } from '../../api'
import './DataUpload.css'

interface MessageState {
    type: 'success' | 'error'
    text: string
}

interface SummaryData {
    has_positions?: boolean
    total_positions?: number
    daily_files?: string[]
    latest_date?: string
}

interface UploadResult {
    stats: {
        total_positions?: number
        total_quota?: number
        total_applicants?: number
    }
}

const DataUpload: React.FC = () => {
    const [positionFile, setPositionFile] = useState<File | null>(null)
    const [dailyFile, setDailyFile] = useState<File | null>(null)
    const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<MessageState | null>(null)
    const [summary, setSummary] = useState<SummaryData | null>(null)

    const positionInputRef = useRef<HTMLInputElement>(null)
    const dailyInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadSummary()
    }, [])

    const loadSummary = async (): Promise<void> => {
        try {
            const data = await getSummary()
            setSummary(data as SummaryData)
        } catch (error) {
            console.error('加载摘要失败:', error)
        }
    }

    const handlePositionUpload = async (): Promise<void> => {
        if (!positionFile) {
            setMessage({ type: 'error', text: '请选择职位表文件' })
            return
        }

        try {
            setUploading(true)
            setMessage(null)
            const result = await uploadPositions(positionFile) as UploadResult
            setMessage({
                type: 'success',
                text: `✅ 职位表上传成功！共 ${result.stats.total_positions} 个职位，计划招录 ${result.stats.total_quota} 人`,
            })
            setPositionFile(null)
            if (positionInputRef.current) positionInputRef.current.value = ''
            loadSummary()
        } catch (error) {
            const err = error as { response?: { data?: { detail?: string } }; message?: string }
            setMessage({
                type: 'error',
                text: `❌ 上传失败: ${err.response?.data?.detail || err.message}`,
            })
        } finally {
            setUploading(false)
        }
    }

    const handleDailyUpload = async (): Promise<void> => {
        if (!dailyFile) {
            setMessage({ type: 'error', text: '请选择每日报名数据文件' })
            return
        }

        try {
            setUploading(true)
            setMessage(null)
            const result = await uploadDaily(dailyFile, dailyDate) as UploadResult
            setMessage({
                type: 'success',
                text: `✅ ${dailyDate} 报名数据上传成功！共 ${result.stats.total_applicants?.toLocaleString()} 人报名`,
            })
            setDailyFile(null)
            if (dailyInputRef.current) dailyInputRef.current.value = ''
            loadSummary()
        } catch (error) {
            const err = error as { response?: { data?: { detail?: string } }; message?: string }
            setMessage({
                type: 'error',
                text: `❌ 上传失败: ${err.response?.data?.detail || err.message}`,
            })
        } finally {
            setUploading(false)
        }
    }

    const handlePositionFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0] || null
        setPositionFile(file)
    }

    const handleDailyFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0] || null
        setDailyFile(file)
    }

    return (
        <div className="data-upload fade-in">
            <div className="upload-header">
                <h2>📤 数据上传中心</h2>
                <p>上传职位表和每日报名数据，系统将自动进行分析可视化</p>
            </div>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="upload-grid">
                <div className="glass-card upload-card">
                    <div className="upload-icon">📋</div>
                    <h3>上传职位表</h3>
                    <p className="upload-desc">
                        上传招考职位表（Excel格式），包含职位代码、招录机关、工作地点、学历要求等信息
                    </p>

                    <div className="upload-area">
                        <input
                            ref={positionInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handlePositionFileChange}
                            id="position-file"
                        />
                        <label htmlFor="position-file" className="upload-label">
                            <span className="upload-btn-icon">📁</span>
                            <span>{positionFile ? positionFile.name : '点击选择文件'}</span>
                        </label>
                    </div>

                    <div className="expected-fields">
                        <strong>预期字段：</strong>
                        <span>职位代码、招录机关、用人单位、职位名称、工作地点、招录人数、学历、学位、专业、备注</span>
                    </div>

                    <button
                        className="btn btn-primary upload-btn"
                        onClick={handlePositionUpload}
                        disabled={uploading || !positionFile}
                    >
                        {uploading ? '上传中...' : '上传职位表'}
                    </button>

                    {summary?.has_positions && (
                        <div className="upload-status success">
                            ✅ 已上传职位表 ({summary.total_positions} 个职位)
                        </div>
                    )}
                </div>

                <div className="glass-card upload-card">
                    <div className="upload-icon">📊</div>
                    <h3>上传每日报名数据</h3>
                    <p className="upload-desc">
                        上传每日报名统计数据（Excel格式），包含职位代码、报名人数、审核通过人数等
                    </p>

                    <div className="date-picker">
                        <label>选择日期</label>
                        <input
                            type="date"
                            className="input"
                            value={dailyDate}
                            onChange={(e) => setDailyDate(e.target.value)}
                        />
                    </div>

                    <div className="upload-area">
                        <input
                            ref={dailyInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleDailyFileChange}
                            id="daily-file"
                        />
                        <label htmlFor="daily-file" className="upload-label">
                            <span className="upload-btn-icon">📁</span>
                            <span>{dailyFile ? dailyFile.name : '点击选择文件'}</span>
                        </label>
                    </div>

                    <div className="expected-fields">
                        <strong>预期字段：</strong>
                        <span>职位代码、报名人数、审核通过人数、缴费人数（可选）</span>
                    </div>

                    <button
                        className="btn btn-success upload-btn"
                        onClick={handleDailyUpload}
                        disabled={uploading || !dailyFile}
                    >
                        {uploading ? '上传中...' : '上传报名数据'}
                    </button>

                    {summary?.daily_files && summary.daily_files.length > 0 && (
                        <div className="upload-status success">
                            ✅ 已上传 {summary.daily_files.length} 天数据
                            <br />
                            <small>最新: {summary.latest_date}</small>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card instructions">
                <h3 className="section-title">📖 使用说明</h3>
                <div className="instruction-content">
                    <div className="instruction-block">
                        <h4>1. 上传职位表（首次使用）</h4>
                        <p>
                            将官方发布的招考职位表（Excel格式）上传至系统。系统会自动解析职位信息，
                            提取工作地点进行地区分组统计。
                        </p>
                    </div>

                    <div className="instruction-block">
                        <h4>2. 每日更新报名数据</h4>
                        <p>
                            每天下载最新的报名统计数据，选择对应日期后上传。系统会自动关联职位表，
                            计算竞争比、生成趋势图表。
                        </p>
                    </div>

                    <div className="instruction-block">
                        <h4>3. 查看可视化报告</h4>
                        <p>
                            数据上传后，可以在「总览」页面查看统计摘要，在「地图」页面查看各地区报名分布，
                            在「趋势」页面查看每日变化趋势。
                        </p>
                    </div>

                    <div className="instruction-block tip">
                        <h4>💡 提示</h4>
                        <p>
                            Excel文件的第一行应为表头，系统会自动识别字段。确保职位代码字段一致，
                            以便正确关联报名数据和职位信息。
                        </p>
                    </div>
                </div>
            </div>

            {summary?.daily_files && summary.daily_files.length > 0 && (
                <div className="glass-card">
                    <h3 className="section-title">📅 已上传的每日数据</h3>
                    <div className="daily-files-list">
                        {summary.daily_files.map((date) => (
                            <div key={date} className="daily-file-item">
                                <span className="file-icon">📄</span>
                                <span className="file-date">{date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default DataUpload
