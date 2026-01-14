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
pip install -r requirements.txt
```

### 2. 启动后端服务

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
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
│   ├── requirements.txt # Python 依赖
│   └── data/            # 数据存储目录
│       ├── positions.xlsx    # 职位表
│       └── daily/            # 每日报名数据
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

## 🔄 每日更新流程

1. 从官方渠道下载最新报名统计数据
2. 打开可视化平台，进入「数据上传」页面
3. 选择日期，上传当日 Excel 数据
4. 刷新页面，查看更新后的趋势图和统计信息

## 🌐 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/upload/positions` | POST | 上传职位表 |
| `/upload/daily` | POST | 上传每日报名数据 |
| `/positions` | GET | 获取职位列表（支持筛选分页） |
| `/stats/by-region` | GET | 按地区统计数据 |
| `/stats/trend` | GET | 获取报名趋势 |
| `/stats/hot-positions` | GET | 获取热门岗位 |
| `/stats/cold-positions` | GET | 获取冷门岗位 |
| `/stats/summary` | GET | 获取统计摘要 |
| `/filters` | GET | 获取可用筛选条件 |

## 📝 注意事项

- 确保职位表中的「职位代码」字段与每日报名数据一致
- 每日数据建议在当天下午或晚上官方更新后获取
- 地图可视化需要工作地点字段包含正确的市/区信息

## 🎨 界面预览

平台采用现代深色主题设计，包含：
- 玻璃态卡片效果
- 渐变色主题
- 流畅的动画过渡
- 响应式布局

---

⚠️ **免责声明**: 本工具仅供个人参考使用，数据准确性以官方发布为准。
