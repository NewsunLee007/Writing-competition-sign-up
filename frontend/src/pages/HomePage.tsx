import React from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Mail,
} from 'lucide-react'

const HomePage: React.FC = () => {
  const quotaRows = [
    {
      title: '学区推荐名额',
      items: [
        ['塘下学区', '25'],
        ['安阳学区', '20'],
        ['飞云学区', '18'],
        ['莘塍学区', '12'],
        ['马屿学区', '10'],
        ['高楼学区', '5'],
        ['湖岭学区', '5'],
        ['陶山学区', '5'],
      ],
    },
    {
      title: '直属学校名额',
      items: [
        ['安阳实验', '15'],
        ['新纪元', '10'],
        ['安高初中', '8'],
        ['瑞祥实验', '8'],
        ['集云学校', '6'],
        ['毓蒙中学', '6'],
        ['广场中学', '4'],
        ['瑞中附初', '6'],
        ['紫荆书院', '1'],
      ],
    },
  ]

  return (
    <div className="animate-fade-in pb-10">
      <section className="container-responsive py-8 sm:py-10">
        <div className="space-y-6">
          <section className="section-shell overflow-hidden p-7 sm:p-10 lg:p-12">
            <div className="relative z-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-4xl">
                  <span className="eyebrow mb-5">Ruian · Creative Writing Registration</span>
                  <h1 className="editorial-title max-w-5xl">
                    Write In, Sign Up, Step Forward —
                    <span className="mt-2 block text-primary-700">让报名流程本身，也有清晰的秩序与美感</span>
                  </h1>
                  <p className="mt-6 max-w-3xl text-base leading-8 text-secondary-700 sm:text-lg">
                    这是瑞安市第三届初中学生英语创意写作评审活动报名系统。
                    在这里，学校、学区与直属学校可以完成报名登记、批量导入、准考证生成与统一下载。
                  </p>
                </div>

                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-primary-900 p-4 shadow-[0_22px_60px_rgba(16,32,60,0.24)]">
                  <img src="/contest-logo.png" alt="活动标识" className="h-full w-full object-contain" />
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: '活动时间', value: '4 月 12 日（星期日）8:50 报到', icon: Calendar },
                  { label: '活动地点', value: '瑞安市毓蒙中学', icon: MapPin },
                  { label: '报名截止', value: '4 月 3 日前完成', icon: Clock },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/60 bg-white/75 p-5 shadow-[0_16px_45px_rgba(15,23,40,0.08)]">
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
          </section>

          <section className="section-shell p-7 sm:p-10">
            <div className="relative z-10 space-y-8">
              <div>
                <span className="eyebrow">活动通知 Notice</span>
                <h2 className="mt-5 font-serif text-4xl text-ink">关于举行瑞安市第三届初中学生英语创意写作评审活动的通知</h2>
              </div>

              <div className="space-y-4 text-[15px] leading-8 text-secondary-700 sm:text-base">
                <p>
                  为激发初中学生的英语写作兴趣，提高学生的写作能力，根据瑞安市教研院工作计划，
                  决定举行瑞安市第三届初中学生英语创意写作评审活动。
                </p>
                <p>
                  本次评审对象为瑞安市八年级学生，由各学区和直属学校在选拔基础上按名额推荐参与评审，
                  并于 <span className="font-semibold text-ink">4 月 3 日前</span> 将参赛名单发送至指定邮箱。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[#e6dccd] bg-[#fffaf3] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">时间与地点</p>
                  <div className="mt-4 space-y-3 text-base leading-8 text-ink">
                    <p>4 月 12 日（星期日）上午 8:50 前报到</p>
                    <p>9:00 正式开始，9:40 结束</p>
                    <p>活动地点：瑞安市毓蒙中学</p>
                    <p>活动内容：现场作文</p>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[#e6dccd] bg-[#fffaf3] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">其他事项</p>
                  <div className="mt-4 space-y-3 text-base leading-8 text-ink">
                    <p>本次活动由瑞安市毓蒙中学承办。</p>
                    <p>本次活动全程免费。</p>
                    <p>参赛学生和带队教师差旅费回原单位报销。</p>
                    <p className="flex items-center gap-2 text-secondary-700">
                      <Mail className="h-4 w-4 text-primary-700" />
                      报名邮箱：26392666@qq.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section-shell p-7 sm:p-10">
            <div className="relative z-10">
              <span className="eyebrow">名额分配 Quota</span>
              <h2 className="mt-5 font-serif text-4xl text-ink">推荐名额一览</h2>
              <div className="mt-8 space-y-5">
                {quotaRows.map((group) => (
                  <div key={group.title} className="rounded-[28px] border border-[#e5dbcc] bg-white/82 p-6">
                    <h3 className="text-xl font-semibold text-ink">{group.title}</h3>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.items.map(([name, quota]) => (
                        <div key={name} className="rounded-[20px] border border-[#efe5d8] bg-[#fffaf3] px-4 py-4">
                          <p className="text-sm leading-7 text-secondary-600">{name}</p>
                          <p className="mt-2 text-2xl font-semibold text-ink">{quota}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default HomePage
