import React, { useState } from 'react'
import { Plus, Trash2, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface Student {
  id: string
  schoolArea: string
  studentName: string
  school: string
  guideTeacher: string
  teamTeacherName: string
  teamTeacherPhone: string
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

  const [generatedTickets, setGeneratedTickets] = useState<Student[]>([])
  const [isSuccess, setIsSuccess] = useState(false)

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

  const generateExamTickets = () => {
    // 生成准考证号格式: 20260412 + 学区代码 + 序号
    const schoolAreaCode: Record<string, string> = {
      '塘下学区': 'TX',
      '安阳学区': 'AY',
      '飞云学区': 'FY',
      '莘塍学区': 'XC',
      '马屿学区': 'MY',
      '高楼学区': 'GL',
      '湖岭学区': 'HL',
      '陶山学区': 'TS',
      '瑞安市实验中学': 'SY',
      '安阳新纪元': 'XY',
      '安高': 'AG',
      '瑞祥实验学校': 'RX',
      '集云实验学校': 'JY',
      '毓蒙中学': 'YM',
      '广场中学': 'GC',
      '瑞中附初': 'RZ',
      '紫荆书院': 'ZJ',
    }

    const updatedStudents = students.map((student, index) => {
      const areaCode = schoolAreaCode[student.schoolArea] || 'XX'
      const ticketNumber = `20260412${areaCode}${String(index + 1).padStart(3, '0')}`
      return { ...student, id: ticketNumber }
    })

    setGeneratedTickets(updatedStudents)
    setIsSuccess(true)
  }

  const downloadSingleTicket = (student: Student) => {
    // TODO: 生成单个PDF准考证
    alert(`正在生成准考证：${student.studentName}（准考证号：${student.id}）`)
  }

  const downloadAllTickets = () => {
    // TODO: 生成所有PDF准考证
    alert(`正在生成 ${generatedTickets.length} 份准考证`)
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            学区/直属学校 <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={student.schoolArea}
                            onChange={(e) => updateStudent(student.id, 'schoolArea', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          >
                            <option value="">请选择</option>
                            <optgroup label="学区">
                              <option value="塘下学区">塘下学区（25人）</option>
                              <option value="安阳学区">安阳学区（20人）</option>
                              <option value="飞云学区">飞云学区（18人）</option>
                              <option value="莘塍学区">莘塍学区（12人）</option>
                              <option value="马屿学区">马屿学区（10人）</option>
                              <option value="高楼学区">高楼学区（5人）</option>
                              <option value="湖岭学区">湖岭学区（5人）</option>
                              <option value="陶山学区">陶山学区（5人）</option>
                            </optgroup>
                            <optgroup label="直属学校">
                              <option value="瑞安市实验中学">瑞安市实验中学（15人）</option>
                              <option value="安阳新纪元">安阳新纪元（10人）</option>
                              <option value="安高">安高（8人）</option>
                              <option value="瑞祥实验学校">瑞祥实验学校（8人）</option>
                              <option value="集云实验学校">集云实验学校（6人）</option>
                              <option value="毓蒙中学">毓蒙中学（6人）</option>
                              <option value="广场中学">广场中学（4人）</option>
                              <option value="瑞中附初">瑞中附初（4人）</option>
                              <option value="紫荆书院">紫荆书院（1人）</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* 学生姓名 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            学生姓名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.studentName}
                            onChange={(e) => updateStudent(student.id, 'studentName', e.target.value)}
                            placeholder="请输入学生姓名"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                        </div>

                        {/* 学校 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            学校 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.school}
                            onChange={(e) => updateStudent(student.id, 'school', e.target.value)}
                            placeholder="请输入学校全称"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                        </div>

                        {/* 指导教师 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            指导教师 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.guideTeacher}
                            onChange={(e) => updateStudent(student.id, 'guideTeacher', e.target.value)}
                            placeholder="请输入指导教师姓名"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                        </div>

                        {/* 带队教师姓名 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            带队教师姓名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={student.teamTeacherName}
                            onChange={(e) => updateStudent(student.id, 'teamTeacherName', e.target.value)}
                            placeholder="请输入带队教师姓名"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                        </div>

                        {/* 带队教师联系号码 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            带队教师联系号码 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={student.teamTeacherPhone}
                            onChange={(e) => updateStudent(student.id, 'teamTeacherPhone', e.target.value)}
                            placeholder="请输入手机号码"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
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
                  onClick={generateExamTickets}
                  className="btn-primary flex items-center space-x-2 text-lg px-12 py-4"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span>生成准考证</span>
                </button>
              </div>
            </>
          ) : (
            /* 准考证生成成功 */
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-6 h-6" />
                  <h2 className="text-lg font-semibold">准考证生成成功！</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    已成功生成 <span className="font-semibold text-primary-600">{generatedTickets.length}</span> 份准考证
                  </p>
                  <button
                    onClick={downloadAllTickets}
                    className="btn-primary flex items-center space-x-2 w-full md:w-auto px-6 py-3"
                  >
                    <Download className="w-5 h-5" />
                    <span>下载全部准考证</span>
                  </button>
                </div>

                {/* 准考证列表 */}
                <div className="space-y-3">
                  {generatedTickets.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{student.studentName}</p>
                        <p className="text-sm text-gray-600">准考证号：{student.id}</p>
                        <p className="text-sm text-gray-600">
                          {student.school} - {student.schoolArea}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadSingleTicket(student)}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50"
                      >
                        <Download className="w-5 h-5" />
                        <span className="text-sm">下载</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsSuccess(false)
                      setGeneratedTickets([])
                      setStudents([
                        {
                          id: Date.now().toString(),
                          schoolArea: '',
                          studentName: '',
                          school: '',
                          guideTeacher: '',
                          teamTeacherName: '',
                          teamTeacherPhone: '',
                        },
                      ])
                    }}
                    className="w-full md:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    继续填报其他学生
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
