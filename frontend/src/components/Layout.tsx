import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, X, Home, ClipboardList, Download } from 'lucide-react'

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const mainNavItems = [
    { path: '/', label: '活动概览', icon: <Home className="h-4 w-4" /> },
    { path: '/registration', label: '报名中心', icon: <ClipboardList className="h-4 w-4" /> },
    { path: '/download', label: '准考证与下载', icon: <Download className="h-4 w-4" /> },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen text-ink">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/50 bg-[#f6efe3]/85 backdrop-blur-xl">
        <nav className="container-responsive">
          <div className="flex min-h-[84px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/75 text-ink shadow-[0_10px_35px_rgba(15,23,40,0.08)] lg:hidden"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary-900 shadow-[0_14px_40px_rgba(22,38,79,0.28)]">
                  <img
                    src="/contest-logo.png"
                    alt="瑞安市英语写作大赛"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary-500">
                    Ruian Writing Contest
                  </div>
                  <div className="max-w-[16rem] font-serif text-[1.45rem] leading-none text-ink sm:max-w-none">
                    瑞安市第三届初中学生英语创意写作评审活动
                  </div>
                </div>
              </Link>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link flex items-center gap-2 ${isActive(item.path) ? 'nav-link-active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {isMenuOpen && (
            <div className="animate-slide-up rounded-[28px] border border-white/60 bg-white/85 p-3 shadow-[0_18px_70px_rgba(15,23,40,0.1)] backdrop-blur lg:hidden">
              <div className="flex flex-col gap-2">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link flex items-center justify-between ${isActive(item.path) ? 'nav-link-active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.24em] text-secondary-400">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      <main className="min-h-screen pt-[100px]">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-white/40 bg-[#10203c] text-white">
        <div className="container-responsive py-10">
          <div className="flex flex-col gap-3 text-sm leading-7 text-white/72 sm:flex-row sm:items-center sm:justify-between">
            <p>承办单位：瑞安市毓蒙中学</p>
            <p>联系邮箱：26392666@qq.com</p>
            <p>© {new Date().getFullYear()} 瑞安市教育发展研究院</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
