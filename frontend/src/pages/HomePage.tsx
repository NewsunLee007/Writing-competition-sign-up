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
    <div className="animate-fade-in">
      {/* 英雄区域 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-gray-50 pt-12 pb-20">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="container-responsive relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                瑞安市第三届初中学生
                <span className="text-primary-600 block">英语创意写作评审活动</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 max-w-2xl">
                为激发初中学生的英语写作兴趣，提高学生的写作能力，特举办本次创意写作评审活动。
                现场作文，实时评审，为学生提供展示才华的舞台。
              </p>

              {/* 活动信息 */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-md">
                  <Calendar className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-semibold text-gray-900">活动时间</p>
                    <p className="text-gray-600">4月12日（星期日）8:50报到，9:00开始，9:40结束</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-md">
                  <MapPin className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-semibold text-gray-900">活动地点</p>
                    <p className="text-gray-600">瑞安市毓蒙中学</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">报名截止</p>
                    <p className="text-yellow-700">4月3日前完成报名</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/registration"
                  className="btn-primary inline-flex items-center justify-center text-lg px-8 py-4"
                >
                  立即报名
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>

            {/* 右侧图例 */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-8">
                {/* 品牌logo显示区域 */}
                <div className="flex items-center justify-center mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary-400 to-blue-400 rounded-2xl flex items-center justify-center p-6">
                    <img
                      src="https://p.ipic.vip/c9knc6.png"
                      alt="瑞安市英语写作大赛logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const container = e.currentTarget.parentElement
                        if (container) {
                          container.innerHTML = `
                            <div class="text-white text-center">
                              <span class="text-3xl font-bold block">瑞安</span>
                              <span class="text-sm tracking-wide opacity-90">英语写作大赛</span>
                            </div>
                          `
                        }
                      }}
                    />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-center mb-6">活动说明</h3>

                <div className="space-y-4">
                  {[
                    { title: '评审对象', desc: '瑞安市八年级学生，由各学区和直属学校选拔推荐' },
                    { title: '活动内容', desc: '现场作文，现场评审' },
                    { title: '活动性质', desc: '全程免费，差旅费回原单位报销' },
                    { title: '承办单位', desc: '瑞安市毓蒙中学' },
                  ].map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage