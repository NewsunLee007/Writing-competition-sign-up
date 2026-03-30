import React, { useState } from 'react'
import { Search, Download, AlertCircle } from 'lucide-react'

interface ExamTicket {
  ticketNumber: string
  studentName: string
  school: string
  schoolArea: string
  guideTeacher: string
  teamTeacherName: string
  teamTeacherPhone: string
}

const DownloadPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ExamTicket[]>([])

  // 模拟数据 - 实际应用中应该从后端API获取
  const mockTickets: ExamTicket[] = [
    {
      ticketNumber: '20260412TX001',
      studentName: '张三',
      school: '瑞安市实验中学',
      schoolArea: '塘下学区',
      guideTeacher: '李老师',
      teamTeacherName: '王老师',
      teamTeacherPhone: '13800138000',
    },
  ]

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    // 搜索匹配：准考证号、学生姓名、学校名称
    const results = mockTickets.filter(
      (ticket) =>
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.studentName.includes(searchTerm) ||
        ticket.school.includes(searchTerm)
    )
    setSearchResults(results)
  }

  const downloadTicket = (ticket: ExamTicket) => {
    // TODO: 生成PDF准考证
    alert(`正在下载准考证：${ticket.studentName}（${ticket.ticketNumber}）`)
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
                className="btn-primary px-8 py-3"
              >
                搜索
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
          {searchTerm && (
            <div className="space-y-4">
              {searchResults.length > 0 ? (
                searchResults.map((ticket) => (
                  <div
                    key={ticket.ticketNumber}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {ticket.studentName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">准考证号：</span>
                            {ticket.ticketNumber}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">学校：</span>
                            {ticket.school}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">学区：</span>
                            {ticket.schoolArea}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">指导教师：</span>
                            {ticket.guideTeacher}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">带队教师：</span>
                            {ticket.teamTeacherName}（{ticket.teamTeacherPhone}）
                          </p>
                        </div>
                        <button
                          onClick={() => downloadTicket(ticket)}
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
