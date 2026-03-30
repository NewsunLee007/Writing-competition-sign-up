import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiService, District, Registration } from '../services/api'
import { generateExamTicketPDF, generateBatchExamTicketsPDF } from '../utils/pdfGenerator'

interface Student {
  id: string
  schoolArea: string
  studentName: string
  school: string
  guideTeacher: string
  teamTeacherName: string
  teamTeacherPhone: string
  ticketNumber?: string
}

const RegistrationPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      schoolArea: '',
      studentName: '',
      school: '',
      guideTeacher: '',
      teamTeacherName: '',
      teamTeacherPhone: '',
    },
  ])

  const [districts, setDistricts] = useState<District[]>([])
  const [generatedTickets, setGeneratedTickets] = useState<Registration[]>([])
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 加载学区信息
  useEffect(() => {
    loadDistricts()
  }, [])

  const loadDistricts = async () => {
    const response = await apiService.getDistricts()
    if (response.success && response.data) {
      setDistricts(response.data)
    } else {
      toast.error('加载学区信息失败')
    }
  }

  const addStudent = () => {
    const newStudent: Student = {
      id: Date.now().toString(),
      schoolArea: '',
      studentName: '',
      school: '',
      guideTeacher: '',
      teamTeacherName: '',
      teamTeacherPhone: '',
    }
    setStudents([...students, newStudent])
  }

  const removeStudent = (id: string) => {
    if (students.length > 1) {
      setStudents(students.filter((s) => s.id !== id))
    }
  }

  const updateStudent = (id: string, field: keyof Student, value: string) => {
    setStudents(
      students.map((s) =>
        s.id === id
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  const handleSubmit = async () => {
    // 验证表单
    const invalidStudents = students.filter(
      (s) => !s.schoolArea || !s.studentName || !s.school || !s.teamTeacherName || !s.teamTeacherPhone
    )

    if (invalidStudents.length > 0) {
      toast.error('请填写所有必填项')
      return
    }

    setIsLoading(true)

    try {
      // 准备数据
      const requestData = students.map((student) => ({
        district_code: student.schoolArea,
        student_name: student.studentName,
        school: student.school,
        teacher_name: student.guideTeacher || undefined,
        leader_name: student.teamTeacherName,
        leader_phone: student.teamTeacherPhone,
      }))

      // 调用API
      const response = await apiService.batchRegister(requestData)

      if (response.success && response.data) {
        const result = response.data
        
        // 显示结果
        toast.success(result.success > 0 ? `成功报名 ${result.success} 人` : '报名失败')
        
        if (result.failed > 0) {
          toast.error(`${result.failed} 人报名失败`)
        }

        // 获取成功报名的学生信息
        const successTickets = result.results
          .filter((r) => r.success)
          .map((r) => ({
            id: 0,
            ticket_number: r.ticket_number!,
            district_code: students.find((s) => s.studentName === r.student_name)?.schoolArea || '',
            student_name: r.student_name,
            school: students.find((s) => s.studentName === r.student_name)?.school || '',
            leader_name: students.find((s) => s.studentName === r.student_name)?.teamTeacherName || '',
            leader_phone: students.find((s) => s.studentName === r.student_name)?.teamTeacherPhone || '',
            registration_time: new Date().toISOString(),
          }))

        setGeneratedTickets(successTickets as Registration[])
        setIsSuccess(true)
      } else {
        toast.error(response.message || '报名失败')
      }
    } catch (error) {
      toast.error('提交失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSingleTicket = (registration: Registration) => {
    try {
      generateExamTicketPDF(registration)
      toast.success('准考证下载成功')
    } catch (error) {
      toast.error('生成准考证失败，请重试')
    }
  }

  const downloadAllTickets = () => {
    try {
      generateBatchExamTicketsPDF(generatedTickets)
      toast.success(`已生成 ${generatedTickets.length} 份准考证`)
    } catch (error) {
      toast.error('批量生成准考证失败，请重试')
    }
  }

  const resetForm = () => {
    setStudents([
      {
        id: '1',
        schoolArea: '',
        studentName: '',
        school: '',
        guideTeacher: '',
        teamTeacherName: '',
        teamTeacherPhone: '',
      },
    ])
    setGeneratedTickets([])
    setIsSuccess(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">报名登记</h1>
            <p className="text-gray-600">
              由带队老师、指导老师或学校老师直接填报学生信息
            </p>
          </div>

          {/* 重要提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">重要提示</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 报名截止日期：4月3日</li>
                  <li>• 活动时间：4月12日（星期日）8:50报到</li>
                  <li>• 活动地点：瑞安市毓蒙中学</li>
                  <li>• 请确保所有信息准确无误</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 报名表单 */}
          {!isSuccess ? (
            <>
              {/* 表头 */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">学生信息录入</h2>
                    <button
                      onClick={addStudent}
                      className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>添加学生</span>
                    </button>
                  </div>
                </div>

                {/* 学生列表 */}
                <div className="divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <div key={student.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          学生 #{index + 1}
                        </h3>
                        {students.length > 1 && (
                          <button
                            onClick={() => removeStudent(student.id)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span>删除</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 学区/直属学校 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            学区/直属学校 <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={student.schoolArea}
                            onChange={(e) => updateStudent(student.id, 'schoolArea', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">请选择</option>
                            {districts.map((district) => (
                              <option key={district.code} value={district.code}>
                                {district.name} (剩余名额: {district.quota})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 学生姓名 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            学生姓名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.studentName}
                            onChange={(e) => updateStudent(student.id, 'studentName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入学生姓名"
                          />
                        </div>

                        {/* 学校 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            学校 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.school}
                            onChange={(e) => updateStudent(student.id, 'school', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入学校名称"
                          />
                        </div>

                        {/* 指导教师 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            指导教师
                          </label>
                          <input
                            type="text"
                            value={student.guideTeacher}
                            onChange={(e) => updateStudent(student.id, 'guideTeacher', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入指导教师姓名（选填）"
                          />
                        </div>

                        {/* 带队教师姓名 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            带队教师姓名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.teamTeacherName}
                            onChange={(e) => updateStudent(student.id, 'teamTeacherName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入带队教师姓名"
                          />
                        </div>

                        {/* 带队教师联系号码 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            带队教师联系号码 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={student.teamTeacherPhone}
                            onChange={(e) => updateStudent(student.id, 'teamTeacherPhone', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入带队教师联系电话"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>提交中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>提交报名</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* 成功页面 */
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-8 text-center border-b border-gray-200">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">报名成功！</h2>
                <p className="text-gray-600">
                  已成功为 {generatedTickets.length} 位学生生成准考证
                </p>
              </div>

              {/* 准考证列表 */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">准考证列表</h3>
                  <button
                    onClick={downloadAllTickets}
                    className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span>下载全部准考证</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          准考证号
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          学生姓名
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          学校
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {generatedTickets.map((ticket) => (
                        <tr key={ticket.ticket_number}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {ticket.ticket_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {ticket.student_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {ticket.school}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => downloadSingleTicket(ticket)}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              下载准考证
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 继续报名按钮 */}
                <div className="mt-6 text-center">
                  <button
                    onClick={resetForm}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    继续报名其他学生
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RegistrationPage
