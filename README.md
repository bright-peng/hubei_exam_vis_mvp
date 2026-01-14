# 湖北省公务员考试报名数据可视化平台

## 🌟 功能特点

- 📊 **数据总览**: 显示职位数、招录人数、报名人数、竞争比等关键指标
- 🗺️ **地图可视化**: 湖北省地图展示各地区报名分布，支持多种视图模式
- 📈 **趋势分析**: 每日报名趋势图、日增长分析、数据明细表格
- 📋 **职位筛选**: 按地区、学历、关键词筛选职位，分页浏览
- 📤 **数据上传**: 支持上传职位表和每日报名数据（Excel格式）
- 🔥 **热门/冷门**: 自动识别热门和冷门岗位，帮助报考决策

## 🛠️ 技术栈

### 后端
- **FastAPI**: 高性能 Python Web 框架
- **SQLite**: 轻量级关系型数据库
- **Pandas**: 数据处理和分析
- **OpenPyXL**: Excel 文件读写

### 前端
- **React 18**: 现代化 UI 框架
- **Vite 5**: 极速开发服务器
- **ECharts 5**: 强大的可视化图表库
- **React Router 6**: 路由管理

## 🚀 快速开始

### 1. 安装后端依赖

```bash
cd backend
pip3 install -r requirements.txt
```

### 2. 启动后端服务

```bash
cd backend
# 激活虚拟环境 (可选)
source venv/bin/activate
# 启动服务
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端 API 将运行在 http://localhost:8000

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端将运行在 http://localhost:5173

## 📁 项目结构

```
hubei_exam_vis_mvp/
├── backend/
│   ├── main.py          # FastAPI 主程序
│   ├── database.py      # 数据库操作接口
│   ├── migrate.py       # Excel 到 SQLite 迁移脚本
│   ├── requirements.txt # Python 依赖
│   └── data/            # 数据存储目录
│       └── exam.db      # SQLite 数据库文件 (由程序自动生成)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # 主应用组件
│   │   ├── api.js           # API 接口封装
│   │   ├── index.css        # 全局样式
│   │   ├── data/
│   │   │   └── hubei.json   # 湖北省地图数据
│   │   └── pages/
│   │       ├── Dashboard.jsx    # 总览页
│   │       ├── MapView.jsx      # 地图页
│   │       ├── TrendView.jsx    # 趋势页
│   │       ├── PositionList.jsx # 职位表页
│   │       └── DataUpload.jsx   # 数据上传页
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 📊 数据格式要求

### 职位表 (positions.xlsx)

| 字段 | 说明 | 必填 |
|------|------|------|
| 职位代码 | 唯一标识 | ✅ |
| 招录机关 | 招录单位名称 | ✅ |
| 用人单位 | 具体工作单位 | |
| 职位名称 | 岗位名称 | |
| 工作地点 | 如"武汉市武昌区" | ✅ |
| 招录人数 | 计划招录人数 | ✅ |
| 学历 | 学历要求 | |
| 学位 | 学位要求 | |
| 专业 | 专业要求 | |
| 备注 | 其他说明 | |

### 每日报名数据 (daily/YYYY-MM-DD.xlsx)

| 字段 | 说明 | 必填 |
|------|------|------|
| 职位代码 | 与职位表对应 | ✅ |
| 报名人数 | 累计报名人数 | ✅ |
| 审核通过人数 | 审核通过的人数 | |
| 缴费人数 | 已缴费人数 | |

## 🤖 自动化与静态部署

本项目已升级为**全静态化架构**，无需购买服务器，直接托管在 GitHub Pages 上即可拥有完整体验。

### ✅ 工作原理
1.  **数据采集**: GitHub Actions 每天定时运行 Python 爬虫，自动抓取官方发布的最新报名数据。
2.  **数据处理**: 爬虫自动将数据存入 SQLite 数据库，并计算出所有分析所需的 JSON 静态文件（包括趋势、地图、榜单等）。
3.  **自动部署**: 数据更新后，自动构建 React 前端并发布到 GitHub Pages。

### ⏰ 自动更新时间
- 每天 **18:00** (北京时间)
- 每天 **22:00** (北京时间)
- 你也可以在 GitHub Actions 页面手动触发更新。

## 🔄 手动/自动更新流程

### 方式一：全自动 (推荐)
无需任何操作。系统会自动抓取、处理、部署。你只需要每天访问网页即可看到最新数据。

### 方式二：手动上传 (备用)
如果官方数据格式变更导致爬虫失败，你依然可以使用手动模式：
1. 下载官方 Excel 数据
2. 访问 `/upload` 页面 (需在本地运行后端)
3. 上传数据并提交代码

## 🌐 部署指南

本项目开箱即用，Fork 后只需启用 GitHub Actions 即可。

1. **Fork 本仓库**
2. **启用 Actions**: 在仓库 Settings -> Actions -> General 中确保 Read and write permissions 被选中。
3. **等待更新**: 到了预定时间，系统会自动运行。

---

⚠️ **免责声明**: 本工具仅供个人学习和参考使用，所有数据均来自湖北省人事考试网公开信息，准确性以官方发布为准。
