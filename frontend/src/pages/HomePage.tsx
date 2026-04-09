import React from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
} from 'lucide-react'

const HomePage: React.FC = () => {
  return (
    <div className="animate-fade-in pb-10">
      <section className="container-responsive py-8 sm:py-10">
        <div className="space-y-5">
          <section className="section-shell overflow-hidden p-7 sm:p-10 lg:p-12">
            <div className="relative z-10">
              <span className="eyebrow mb-5">Ruian · Creative Writing Registration</span>
              <h1 className="editorial-title max-w-5xl">Write In, Sign Up, Step Forward</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-secondary-700 sm:text-lg">
                活动报名、批量导入与准考证下载，统一在这里完成。
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: '活动时间', value: '4 月 12 日（星期日）8:50 报到', icon: Calendar },
                  { label: '活动地点', value: '瑞安市毓蒙中学', icon: MapPin },
                  { label: '报名截止', value: '4 月 3 日前完成', icon: Clock },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/60 bg-white/75 p-5 text-center shadow-[0_16px_45px_rgba(15,23,40,0.08)]">
                    <item.icon className="mx-auto mb-3 h-5 w-5 text-primary-700" />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link to="/query-room" className="btn-primary px-8 py-4 text-base">
                  考场查询入口
                  <ChevronRight className="h-5 w-5" />
                </Link>
                <Link to="/registration" className="btn-secondary px-8 py-4 text-base">
                  进入报名中心
                </Link>
                <Link to="/download" className="btn-secondary px-8 py-4 text-base">
                  下载准考证 / 批量导出
                </Link>
              </div>
            </div>
          </section>

          <section className="section-shell p-7 sm:p-10">
            <div className="relative z-10 space-y-8">
              <div>
                <span className="eyebrow inline-flex">活动通知 Notice</span>
                <h2 className="mt-5 text-center font-serif text-4xl text-ink">关于举行瑞安市第三届初中学生英语创意写作评审活动的通知</h2>
              </div>

              <div className="space-y-4 text-[15px] leading-8 text-secondary-700 sm:text-base">
                <p className="indent-[2em]">
                  为激发初中学生的英语写作兴趣，提高学生的写作能力，根据瑞安市教研院工作计划，
                  决定举行瑞安市第三届初中学生英语创意写作评审活动。
                </p>
                <p className="indent-[2em]">
                  本次评审对象为瑞安市八年级学生，由各学区和直属学校在选拔基础上按名额推荐参与评审，
                  并于 <span className="font-semibold text-ink">4 月 3 日前</span> 完成在线报名。
                </p>
              </div>

              <div className="rounded-[26px] border border-[#e6dccd] bg-[#fffaf3] p-6">
                <div className="space-y-3 text-base leading-8 text-ink">
                  <p>活动时间：4 月 12 日（星期日）上午 8:50 前报到，9:00 正式开始，9:40 结束。</p>
                  <p>活动地点：瑞安市毓蒙中学。</p>
                  <p>活动内容：现场作文，现场评审。</p>
                  <p>本次活动由瑞安市毓蒙中学承办，全程免费，参赛学生和带队教师差旅费回原单位报销。</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default HomePage
