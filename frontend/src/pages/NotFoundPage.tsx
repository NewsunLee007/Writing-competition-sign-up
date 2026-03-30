import React from 'react'
import { Link } from 'react-router-dom'
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-lg w-full text-center">
        {/* 错误图标 */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-20 h-20 text-red-500" />
          </div>
          <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-yellow-600">404</span>
          </div>
        </div>

        {/* 错误信息 */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          页面未找到
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          抱歉，您请求的页面不存在或已被移除。
          请检查URL是否正确，或返回首页继续浏览。
        </p>

        {/* 可能的原因 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            可能的原因：
          </h3>
          <ul className="space-y-2 text-yellow-700">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
              页面地址拼写错误
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
              页面已被删除或移动
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
              暂时无法访问该页面
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="btn-primary inline-flex items-center justify-center text-lg px-8 py-4"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="btn-outline inline-flex items-center justify-center text-lg px-8 py-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回上一页
          </button>
        </div>

        {/* 帮助信息 */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm mb-2">需要帮助？</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="tel:0577-8888-9999" className="text-primary-600 hover:text-primary-700">
              电话：0577-8888-9999
            </a>
            <a href="mailto:contact@ruian-writing-contest.com" className="text-primary-600 hover:text-primary-700">
              邮箱：contact@ruian-writing-contest.com
            </a>
            <Link to="/faq" className="text-primary-600 hover:text-primary-700">
              常见问题解答
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage