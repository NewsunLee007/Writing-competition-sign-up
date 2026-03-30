import React from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  LayoutPanelLeft,
  FileSpreadsheet,
} from 'lucide-react'

const HomePage: React.FC = () => {
  return (
    <div className="animate-fade-in pb-10">
      <section className="container-responsive py-8 sm:py-10">
        <div className="panel-grid items-stretch">
          <div className="section-shell p-7 sm:p-10 lg:p-12">
            <div className="relative z-10 flex h-full flex-col">
              <span className="eyebrow mb-6">Editorial · Contest Administration</span>
              <h1 className="editorial-title max-w-4xl">
                用更专业的流程，承接这场
                <span className="block text-primary-700">英语创意写作评审活动</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-secondary-700 sm:text-lg">
                报名、学区名额控制、直属学校归类、批量导入、准考证生成与整组下载，
                全部在一个更稳、更优雅、横竖屏都舒适的界面里完成。
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: '活动时间', value: '4 月 12 日 8:50 报到', icon: Calendar },
                  { label: '活动地点', value: '瑞安市毓蒙中学', icon: MapPin },
                  { label: '报名截止', value: '4 月 3 日前完成', icon: Clock },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/60 bg-white/75 p-4 shadow-[0_16px_45px_rgba(15,23,40,0.08)]">
                    <item.icon className="mb-3 h-5 w-5 text-primary-700" />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/registration" className="btn-primary px-8 py-4 text-base">
                  进入报名中心
                  <ChevronRight className="h-5 w-5" />
                </Link>
                <Link to="/download" className="btn-secondary px-8 py-4 text-base">
                  下载准考证 / 批量导出
                </Link>
              </div>
            </div>
          </div>

          <div className="section-shell bg-[#10203c] p-7 text-white sm:p-10">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-white/12 p-3">
                    <img
                      src="https://p.ipic.vip/c9knc6.png"
                      alt="瑞安市英语写作大赛 logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                      Featured Flow
                    </p>
                    <h2 className="font-serif text-4xl text-white">三段式工作流</h2>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      title: '分组报名',
                      desc: '学区推荐与直属学校分轨处理，手工录入与批量导入共用同一套校验规则。',
                      icon: LayoutPanelLeft,
                    },
                    {
                      title: '名额安全',
                      desc: '学区与直属学校名额实时展示，提交前后双重控制，避免超额。',
                      icon: ShieldCheck,
                    },
                    {
                      title: '批量协作',
                      desc: 'Excel 模板带下拉项，支持整组导入、整组下载与后续归档。',
                      icon: FileSpreadsheet,
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                      <item.icon className="mb-3 h-5 w-5 text-[#f0c58a]" />
                      <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/68">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm leading-7 text-white/65">
                评审对象：瑞安市八年级学生，由各学区和直属学校选拔推荐。全程免费，现场作文，现场评审。
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
