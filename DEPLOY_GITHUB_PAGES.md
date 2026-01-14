# 如何部署到 GitHub Pages (纯静态模式)

本项目已改造为支持“纯静态模式”，这意味着你不需要购买服务器，可以直接免费托管在 GitHub Pages 上。

## 1. 准备工作

确保你已经安装了：
- Python 3.8+
- Node.js 16+

## 2. 更新数据 (本地操作)

由于是静态网页，每次有新的报名数据（Excel文件），你需要**在本地**执行以下步骤来更新网页数据：

1.  **放入数据文件**:
    - 将最新的职位表放至 `backend/data/positions.xlsx`
    - 将最新的每日报名统计表放至 `backend/data/daily/YYYY-MM-DD.xlsx`

2.  **更新数据库**:
    ```bash
    cd backend
    # 如果有虚拟环境，先激活
    # source venv/bin/activate  (Mac/Linux)
    # venv\Scripts\activate     (Windows)
    
    python migrate.py
    ```

3.  **生成静态 JSON 数据**:
    ```bash
    python export_static.py
    ```
    *运行成功后，你会看到 `Done!` 提示，且 `frontend/public/data/` 目录下会生成最新的 .json 文件。*

## 3. 本地预览

在发布前，你可以在本地查看效果：

```bash
cd frontend
npm run dev
```

打开浏览器访问显示的地址 (通常是 http://localhost:5173)，确认所有数据和图表都显示正常，且已经是最新数据。

## 4. 部署到 GitHub

### 方法 A: 使用 GitHub Actions 自动构建 (推荐)

1.  将整个项目代码提交并推送到 GitHub 仓库。
2.  在 GitHub 仓库页面，点击 **Settings** -> **Pages**。
3.  在 **Build and deployment** 下，选择 **Source** 为 **GitHub Actions**。
4.  选择 **Static HTML** 这一项（如果没有自动出现，需要创建一个 `.github/workflows/static.yml`，或者直接手动构建上传，见方法 B）。
    *   *简单起见，推荐方法 B，如果你熟悉 CI/CD 可以用方法 A。*

### 方法 B: 手动构建并推送到 gh-pages 分支 (最简单)

1.  **构建项目**:
    ```bash
    cd frontend
    npm run build
    ```
    *这会在 `frontend/dist` 目录下生成最终的网页文件。*

2.  **将 dist 目录推送**
    
    你可以使用 `gh-pages` 工具来简化这个过程：
    
    ```bash
    # 在 frontend 目录下安装 gh-pages
    npm install gh-pages --save-dev
    ```
    
    在 `frontend/package.json` 的 `scripts` 中添加一行：
    ```json
    "deploy": "gh-pages -d dist"
    ```
    
    然后运行：
    ```bash
    npm run deploy
    ```

3.  **GitHub 设置**:
    - 去 GitHub 仓库 -> **Settings** -> **Pages**。
    - 确保 **Source** 选择 **Deploy from a branch**。
    - 选择 **Branch** 为 `gh-pages`，文件夹 `/ (root)`。
    - 点击 Save。

稍等几分钟，你的网站就会在 `https://<你的用户名>.github.io/<仓库名>/` 上线了！

---

### 注意事项

- **前端模式**: `frontend/src/api.js` 文件中已设置 `const USE_STATIC_DATA = true`。如果你以后要改回使用 Python 后端服务器模式，请将此变量改为 `false`。
- **上传功能**: 静态模式下，“数据上传”功能不可用，已在菜单中隐藏。请务必按照上述“更新数据”步骤在本地处理数据。
