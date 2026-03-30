import React, { useState } from 'react'
import { Search, Download, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiService, Registration } from '../services/api'
import { generateExamTicketPDF } from '../utils/pdfGenerator'

const DownloadPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Registration[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('请输入搜索关键词')
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      // 判断搜索类型
      const isTicketNumber = /^20260412[A-Z]{2}\d{3}$/.test(searchTerm.trim())
      
      let response
      if (isTicketNumber) {
        // 准考证号搜索
        response = await apiService.searchRegistrations({
          ticket_number: searchTerm.trim(),
        })
      } else {
        // 姓名或学校搜索（优先尝试姓名）
        response = await apiService.searchRegistrations({
          student_name: searchTerm.trim(),
        })

        // 如果姓名搜索无结果，尝试学校搜索
        if (!response.success || !response.data || response.data.length === 0) {
          response = await apiService.searchRegistrations({
            school: searchTerm.trim(),
          })
        }
      }

      if (response.success && response.data) {
        setSearchResults(response.data)
        if (response.data.length === 0) {
          toast.error('未找到匹配的准考证信息')
        } else {
          toast.success(`找到 ${response.data.length} 条记录`)
        }
      } else {
        setSearchResults([])
        toast.error(response.message || '搜索失败')
      }
    } catch (error) {
      toast.error('搜索失败，请重试')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const downloadTicket = (registration: Registration) => {
    try {
      generateExamTicketPDF(registration)
      toast.success('准考证下载成功')
    } catch (error) {
      toast.error('生成准考证失败，请重试')
    }
  }

  const getDistrictName = (code: string): string => {
    const districtNames: Record<string, string> = {
      TX: '塘下学区',
      AY: '安阳学区',
      FY: '飞云学区',
      XC: '莘塍学区',
      MY: '马屿学区',
      GL: '高楼学区',
      HL: '湖岭学区',
      TS: '陶山学区',
      SY: '瑞安市实验中学',
      XY: '安阳新纪元',
      AG: '安高',
      RX: '瑞祥实验学校',
      JY: '集云实验学校',
      YM: '毓蒙中学',
      GC: '广场中学',
      RZ: '瑞中附初',
      ZJ: '紫荆书院',
    }
    return districtNames[code] || code
  }

  return (
    <div className="animate-fade-in">
      <div className="container-responsive py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">准考证下载</h1>
            <p className="text-gray-600">
              输入准考证号、学生姓名或学校名称搜索准考证
            </p>
          </div>

          {/* 搜索框 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="请输入准考证号、学生姓名或学校名称"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>搜索中...</span>
                  </>
                ) : (
                  <span>搜索</span>
                )}
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">温馨提示</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 准考证号格式：20260412 + 学区代码 + 序号（如：20260412TX001）</li>
                  <li>• 如有疑问，请联系带队老师或指导老师</li>
                  <li>• 活动时间：4月12日（星期日）8:50报到</li>
                  <li>• 活动地点：瑞安市毓蒙中学</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 搜索结果 */}
          {hasSearched && (
            <div className="space-y-4">
              {searchResults.length > 0 ? (
                searchResults.map((registration) => (
                  <div
                    key={registration.ticket_number}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {registration.student_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">准考证号：</span>
                            {registration.ticket_number}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">学校：</span>
                            {registration.school}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">学区：</span>
                            {registration.district_name || getDistrictName(registration.district_code)}
                          </p>
                          {registration.teacher_name && (
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">指导教师：</span>
                              {registration.teacher_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">带队教师：</span>
                            {registration.leader_name}（{registration.leader_phone}）
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">报名时间：</span>
                            {new Date(registration.registration_time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadTicket(registration)}
                          className="flex items-center space-x-2 btn-primary px-6 py-3"
                        >
                          <Download className="w-5 h-5" />
                          <span>下载准考证</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">未找到匹配的准考证信息</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DownloadPage
