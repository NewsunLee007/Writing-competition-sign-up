import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Home,
  ClipboardList,
  Download,
} from 'lucide-react'

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const mainNavItems = [
    { path: '/', label: '首页', icon: <Home className="w-5 h-5" /> },
    { path: '/registration', label: '报名登记', icon: <ClipboardList className="w-5 h-5" /> },
    { path: '/download', label: '准考证下载', icon: <Download className="w-5 h-5" /> },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16">
            {/* Logo 和品牌 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 lg:hidden hover:text-primary-600 hover:bg-gray-100"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <Link to="/" className="flex items-center space-x-3">
                <img
                  src="https://p.ipic.vip/c9knc6.png"
                  alt="瑞安市英语写作大赛"
                  className="h-10 w-auto"
                />
                <div className="hidden md:flex flex-col">
                  <span className="font-bold text-lg text-gray-900 leading-tight">
                    瑞安市第三届初中学生英语创意写作评审活动
                  </span>
                </div>
              </Link>
            </div>

            {/* 桌面端导航 */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link flex items-center space-x-2 px-4 ${
                    isActive(item.path) ? 'nav-link-active' : ''
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 移动端菜单 */}
          {isMenuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-200 animate-slide-up">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* 页脚 - 简化版 */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="container-responsive py-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">
              瑞安市第三届初中学生英语创意写作评审活动
            </p>
            <p className="text-gray-500 text-xs">
              承办单位: 瑞安市毓蒙中学 | 联系邮箱: 26392666@qq.com
            </p>
            <p className="text-gray-600 text-xs mt-2">
              © {new Date().getFullYear()} 瑞安市教育发展研究院
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout