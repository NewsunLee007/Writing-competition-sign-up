import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 检查环境
console.log('环境:', import.meta.env.MODE)
console.log('API 地址:', import.meta.env.VITE_API_URL || 'http://localhost:8000')

// 挂载应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 服务 Worker 注册（PWA 支持）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      registration => {
        console.log('ServiceWorker 注册成功:', registration.scope)
      },
      err => {
        console.log('ServiceWorker 注册失败:', err)
      }
    )
  })
}