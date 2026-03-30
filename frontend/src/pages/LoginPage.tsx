import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  LogIn,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Phone,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

// 登录表单验证模式
const loginSchema = z.object({
  email: z.string()
    .email('请输入有效的邮箱地址')
    .min(1, '邮箱不能为空'),
  password: z.string()
    .min(1, '密码不能为空')
    .min(8, '密码至少需要8个字符'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (_data: LoginFormData) => {
    setIsLoading(true)

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500))

      // TODO: 替换为实际的API调用
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(_data),
      // })

      // if (response.ok) {
      toast.success('登录成功！欢迎回来')
      navigate('/dashboard')
      // } else {
      //   throw new Error('登录失败，请检查邮箱和密码')
      // }
    } catch (error) {
      console.error('登录错误:', error)
      toast.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    toast.success('重置密码链接已发送到您的邮箱（模拟）')
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12">
      <div className="w-full max-w-md mx-4">
        {/* Logo/标题区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <img 
                src="序列头图.png" 
                alt="瑞安市英语写作大赛" 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const container = e.currentTarget.parentElement
                  if (container) {
                    container.innerHTML = `
                      <div class="text-white text-center">
                        <span class="text-2xl font-bold block">R/WC</span>
                        <span class="text-xs tracking-wide opacity-90">写作大赛</span>
                      </div>
                    `
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h1>
          <p className="text-gray-600">登录以继续使用报名系统</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 邮箱输入 */}
            <div>
              <label className="form-label">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>邮箱地址</span>
                </div>
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入注册时使用的邮箱"
                {...register('email')}
              />
              {errors.email && (
                <p className="form-error flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label className="form-label">
                <div className="flex items-center space-x-2 mb-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span>密码</span>
                </div>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="请输入密码"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-gray-700">记住我</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                忘记密码？
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  登录
                </>
              )}
            </button>

            {/* 分隔线 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">其他登录方式</span>
              </div>
            </div>

            {/* 快速登录按钮 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-5 h-5 text-green-600" />
                <span>手机验证码登录</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <User className="w-5 h-5 text-blue-600" />
                <span>身份证号登录</span>
              </button>
            </div>

            {/* 注册链接 */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                还没有账户？
                <Link
                  to="/register"
                  className="text-primary-600 hover:text-primary-800 font-medium ml-2"
                >
                  立即注册
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* 安全提示 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">安全提示</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 请使用注册时使用的邮箱和密码登录</li>
                <li>• 建议在私人设备上登录，不要使用公共电脑</li>
                <li>• 如遇到登录问题，请联系客服：0577-8888 9999</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 管理登录 */}
        <div className="mt-4 text-center">
          <Link
            to="/admin-login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            管理员登录入口
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage