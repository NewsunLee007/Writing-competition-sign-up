import React, { useState, useEffect } from 'react'
import { Search, User, Key, MapPin, Calendar, Building, Info, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiService } from '../services/api'
import { District } from '../services/api'

interface ExamRoomData {
  student_name: string
  ticket_number: string
  school: string
  exam_room: string
  district_name?: string
}

const ExamRoomQueryPage: React.FC = () => {
  const [queryType, setQueryType] = useState<'student' | 'school'>('student')
  const [ticketNumber, setTicketNumber] = useState('')
  const [studentName, setStudentName] = useState('')
  
  const [schoolName, setSchoolName] = useState('')
  const [districtCode, setDistrictCode] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ExamRoomData[]>([])
  const [hasQueried, setHasQueried] = useState(false)

  const [districts, setDistricts] = useState<District[]>([])
  
  useEffect(() => {
    // 获取学区列表
    const fetchDistricts = async () => {
      try {
        const response = await apiService.getDistricts()
        if (response.success && response.data) {
          setDistricts(response.data)
        }
      } catch (error) {
        console.error('获取学区失败', error)
      }
    }
    fetchDistricts()
  }, [])

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let queryParams: any = {}

    if (queryType === 'student') {
      if (!studentName.trim()) {
        toast.error('请输入学生姓名')
        return
      }
      queryParams.student_name = studentName.trim()
      if (ticketNumber.trim()) queryParams.ticket_number = ticketNumber.trim()
    } else {
      if (!schoolName.trim() && !districtCode) {
        toast.error('请输入学校名称或选择学区')
        return
      }
      if (schoolName.trim()) queryParams.school = schoolName.trim()
      if (districtCode) queryParams.district_code = districtCode
    }

    setIsLoading(true)
    setResults([])
    setHasQueried(true)
    
    try {
      const response = await apiService.queryExamRoom(queryParams)
      
      if (response.success && response.data) {
        setResults(Array.isArray(response.data) ? response.data : [response.data])
        if (response.data.length === 0) {
          toast.error('未找到符合条件的考场信息')
        } else {
          toast.success(`查询到 ${response.data.length} 条记录`)
        }
      } else {
        toast.error(response.message || '未找到考场信息')
      }
    } catch (error: any) {
      toast.error(error.message || '查询失败，请检查输入或稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResults([])
    setTicketNumber('')
    setStudentName('')
    setSchoolName('')
    setDistrictCode('')
  }

  return (
    <div className="animate-fade-in pb-10">
      <section className="container-responsive py-8 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="section-shell overflow-hidden p-7 sm:p-10">
            <div className="mb-8 text-center">
              <span className="eyebrow mb-4">Exam Room Query</span>
              <h1 className="editorial-title text-3xl sm:text-4xl">考场信息查询</h1>
              <p className="mt-3 text-secondary-600">
                支持按学生姓名、学校或学区查询具体的考场安排
              </p>
            </div>

            {!hasQueried ? (
              <div className="mx-auto max-w-md space-y-6">
                <div className="flex justify-center space-x-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setQueryType('student')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      queryType === 'student' 
                        ? 'bg-primary-600 text-white shadow-sm' 
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    按学生查询
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueryType('school')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      queryType === 'school' 
                        ? 'bg-primary-600 text-white shadow-sm' 
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    按学校/学区批量查询
                  </button>
                </div>

                <form onSubmit={handleQuery} className="space-y-6">
                  <div className="space-y-4">
                    {queryType === 'student' ? (
                      <>
                        <div className="form-group">
                          <label htmlFor="studentName" className="form-label">
                            学生姓名 <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <User className="h-5 w-5 text-secondary-400" />
                            </div>
                            <input
                              type="text"
                              id="studentName"
                              className="form-input pl-10"
                              placeholder="请输入学生真实姓名"
                              value={studentName}
                              onChange={(e) => setStudentName(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="ticketNumber" className="form-label">
                            准考证号 (可选)
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <Key className="h-5 w-5 text-secondary-400" />
                            </div>
                            <input
                              type="text"
                              id="ticketNumber"
                              className="form-input pl-10"
                              placeholder="请输入准考证号精确匹配"
                              value={ticketNumber}
                              onChange={(e) => setTicketNumber(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="form-group">
                          <label htmlFor="districtCode" className="form-label">
                            选择学区 (可选)
                          </label>
                          <div className="relative">
                            <select
                              id="districtCode"
                              className="form-input"
                              value={districtCode}
                              onChange={(e) => setDistrictCode(e.target.value)}
                            >
                              <option value="">-- 请选择学区 --</option>
                              {districts.map(d => (
                                <option key={d.code} value={d.code}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="schoolName" className="form-label">
                            学校名称 (可选)
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <Building className="h-5 w-5 text-secondary-400" />
                            </div>
                            <input
                              type="text"
                              id="schoolName"
                              className="form-input pl-10"
                              placeholder="请输入学校名称（支持模糊搜索）"
                              value={schoolName}
                              onChange={(e) => setSchoolName(e.target.value)}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-secondary-500 mt-1">注：学区和学校名称可任填其一或组合查询。</p>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        查询中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Search className="h-5 w-5" />
                        查询考场
                      </span>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="mx-auto animate-fade-in space-y-6">
                <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-xl">
                  <h3 className="font-serif text-xl text-ink">查询结果 ({results.length}条)</h3>
                  <button 
                    onClick={() => {
                      setHasQueried(false);
                      setResults([]);
                    }}
                    className="btn-secondary py-2 px-4 text-sm"
                  >
                    返回重新查询
                  </button>
                </div>
                
                {results.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((result, index) => (
                      <div key={index} className="overflow-hidden rounded-2xl border border-secondary-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-primary-50 px-6 py-4 text-center border-b border-primary-100 flex justify-between items-center">
                          <h3 className="font-bold text-lg text-primary-900">{result.student_name}</h3>
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                            {result.district_name || '学区未知'}
                          </span>
                        </div>
                        
                        <div className="p-6 space-y-4">
                          <div className="flex justify-center mb-4">
                            <div className="rounded-xl bg-secondary-50 px-6 py-3 text-center w-full">
                              <p className="text-xs font-medium text-secondary-500 uppercase tracking-widest mb-1">考场号</p>
                              <p className="text-3xl font-bold text-ink font-serif">{result.exam_room || '尚未安排'}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between border-b border-secondary-100 pb-2">
                              <div className="flex items-center gap-2 text-secondary-500">
                                <Key className="h-4 w-4" />
                                <span>准考证号</span>
                              </div>
                              <span className="font-medium text-ink font-mono">{result.ticket_number}</span>
                            </div>
                            
                            <div className="flex items-center justify-between border-b border-secondary-100 pb-2">
                              <div className="flex items-center gap-2 text-secondary-500">
                                <Building className="h-4 w-4" />
                                <span>所在学校</span>
                              </div>
                              <span className="font-medium text-ink truncate max-w-[140px]" title={result.school}>{result.school}</span>
                            </div>

                            <div className="flex items-center justify-between border-b border-secondary-100 pb-2">
                              <div className="flex items-center gap-2 text-secondary-500">
                                <MapPin className="h-4 w-4" />
                                <span>考试地点</span>
                              </div>
                              <span className="font-medium text-ink">瑞安市毓蒙中学</span>
                            </div>

                            <div className="flex items-center justify-between pb-1">
                              <div className="flex items-center gap-2 text-secondary-500">
                                <Calendar className="h-4 w-4" />
                                <span>报到时间</span>
                              </div>
                              <span className="font-medium text-ink">4月12日 8:50前</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-secondary-200">
                    <Info className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
                    <h3 className="text-lg font-medium text-ink">未找到考场信息</h3>
                    <p className="text-secondary-500 mt-2">请核对您输入的查询条件是否正确</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

export default ExamRoomQueryPage
