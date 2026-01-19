import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import AppLegacy from './AppLegacy'
import '@arco-design/web-react/dist/css/arco.css'
import './index.css'

// 检查 UI 版本
const uiVersion = localStorage.getItem('ui_version') || 'arco'

// 始终开启 Arco Design 深色模式，因为新旧版都是深色基调
document.body.setAttribute('arco-theme', 'dark')

const CurrentApp = uiVersion === 'arco' ? App : AppLegacy

const rootElement = document.getElementById('root')
if (!rootElement) {
    throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter
            basename={import.meta.env.BASE_URL}
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <CurrentApp />
        </BrowserRouter>
    </React.StrictMode>
)
