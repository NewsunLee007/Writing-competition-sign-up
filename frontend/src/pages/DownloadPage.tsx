import React, { useEffect, useMemo, useState } from 'react'
import { Search, Download, AlertCircle, Loader, Users, Building2, Landmark } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiService, Registration } from '../services/api'
import { generateBatchExamTicketsPDF, generateExamTicketPDF } from '../utils/pdfGenerator'
import { CONTEST_UNITS, RegistrationUnitType, getContestUnitName } from '../data/contestOptions'

const DownloadPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Registration[]>([])
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [downloadMode, setDownloadMode] = useState<'single' | 'batch'>('single')
  const [batchUnitType, setBatchUnitType] = useState<RegistrationUnitType>('district')
  const [batchUnitCode, setBatchUnitCode] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')

  useEffect(() => {
    const loadAllRegistrations = async () => {
      setIsLoadingAll(true)
      const response = await apiService.getAllRegistrations()
      if (response.success && response.data) {
        setAllRegistrations(response.data)
      }
      setIsLoadingAll(false)
    }

    void loadAllRegistrations()
  }, [])

  const batchOptions = useMemo(
    () => CONTEST_UNITS.filter((unit) => unit.type === batchUnitType),
    [batchUnitType]
  )

  const filteredBatchResults = useMemo(() => {
    return allRegistrations.filter((registration) => {
      const matchesUnit = batchUnitCode ? registration.district_code === batchUnitCode : true
      const matchesSchool = schoolFilter.trim()
        ? registration.school.toLowerCase().includes(schoolFilter.trim().toLowerCase())
        : true
      return matchesUnit && matchesSchool
    })
  }, [allRegistrations, batchUnitCode, schoolFilter])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('请输入搜索关键词')
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const isTicketNumber = /^\d{6}$/.test(searchTerm.trim())

      let response
      if (isTicketNumber) {
        response = await apiService.searchRegistrations({ ticket_number: searchTerm.trim() })
      } else {
        response = await apiService.searchRegistrations({ student_name: searchTerm.trim() })
        if (!response.success || !response.data || response.data.length === 0) {
          response = await apiService.searchRegistrations({ school: searchTerm.trim() })
        }
      }

      if (response.success && response.data) {
        setSearchResults(response.data)
        toast.success(response.data.length > 0 ? `找到 ${response.data.length} 条记录` : '未找到匹配结果')
      } else {
        setSearchResults([])
        toast.error(response.message || '搜索失败')
      }
    } catch (_error) {
      toast.error('搜索失败，请重试')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const downloadTicket = async (registration: Registration) => {
    try {
      await generateExamTicketPDF(registration)
      toast.success('准考证已下载')
    } catch (_error) {
      toast.error('生成准考证失败，请重试')
    }
  }

  const handleBatchDownload = async () => {
    if (!filteredBatchResults.length) {
      toast.error('当前筛选结果为空')
      return
    }

    try {
      const label = batchUnitCode
        ? `${getContestUnitName(batchUnitCode)}准考证`
        : schoolFilter
        ? `${schoolFilter}-学校筛选准考证`
        : '全部准考证'

      await generateBatchExamTicketsPDF(filteredBatchResults, label)
      toast.success(`已生成 ${filteredBatchResults.length} 份准考证`)
    } catch (_error) {
      toast.error('批量下载失败，请重试')
    }
  }

  return (
    <div className="container-responsive py-8">
      <div className="space-y-6">
        <section className="section-shell p-7 sm:p-10">
          <div className="relative z-10 panel-grid items-start">
            <div>
              <span className="eyebrow">Ticket Center</span>
              <h1 className="mt-5 font-serif text-4xl text-ink sm:text-5xl">准考证与下载中心</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-secondary-700">
                既支持按准考证号、姓名、学校检索单个学生，也支持按学区或学校批量打包下载。
              </p>
            </div>

            <div className="rounded-[24px] border border-white/60 bg-[#10203c] p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                Download Scope
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/8 p-4">
                  <div className="text-sm text-white/60">已加载报名记录</div>
                  <div className="mt-2 text-3xl font-semibold">{allRegistrations.length}</div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/8 p-4">
                  <div className="text-sm text-white/60">当前批量结果</div>
                  <div className="mt-2 text-3xl font-semibold">{filteredBatchResults.length}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell p-6 sm:p-8">
          <div className="relative z-10">
            <div className="inline-flex rounded-full border border-white/70 bg-white/78 p-1 shadow-[0_10px_35px_rgba(15,23,40,0.08)]">
              <button
                onClick={() => setDownloadMode('single')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${downloadMode === 'single' ? 'bg-primary-900 text-white' : 'text-secondary-600'}`}
              >
                单条查询
              </button>
              <button
                onClick={() => setDownloadMode('batch')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${downloadMode === 'batch' ? 'bg-primary-900 text-white' : 'text-secondary-600'}`}
              >
                批量下载
              </button>
            </div>

            {downloadMode === 'single' ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && void handleSearch()}
                        placeholder="请输入准考证号、学生姓名或学校名称"
                        className="form-input pl-12"
                      />
                    </div>
                    <button onClick={() => void handleSearch()} disabled={isSearching} className="btn-primary min-w-[140px]">
                      {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      开始搜索
                    </button>
                  </div>
                </div>

                {hasSearched && (
                  <div className="space-y-4">
                    {searchResults.length > 0 ? (
                      searchResults.map((registration) => (
                        <div key={registration.ticket_number} className="rounded-[24px] border border-white/60 bg-white/78 p-6">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="grid gap-3">
                              <h3 className="text-2xl font-semibold text-ink">{registration.student_name}</h3>
                              <div className="grid gap-2 text-sm leading-7 text-secondary-700">
                                <p><span className="font-semibold text-ink">准考证号：</span>{registration.ticket_number}</p>
                                <p><span className="font-semibold text-ink">学校：</span>{registration.school}</p>
                                <p><span className="font-semibold text-ink">报名归属：</span>{registration.district_name || getContestUnitName(registration.district_code)}</p>
                                {registration.teacher_name && <p><span className="font-semibold text-ink">指导教师：</span>{registration.teacher_name}</p>}
                                <p><span className="font-semibold text-ink">带队教师：</span>{registration.leader_name}（{registration.leader_phone}）</p>
                              </div>
                            </div>
                            <button onClick={() => void downloadTicket(registration)} className="btn-primary">
                              <Download className="h-4 w-4" />
                              下载准考证
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-white/60 bg-white/78 p-8 text-center text-secondary-500">
                        未找到匹配的准考证信息
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                    <div className="flex items-center gap-2 text-ink">
                      {batchUnitType === 'district' ? <Landmark className="h-5 w-5 text-primary-700" /> : <Building2 className="h-5 w-5 text-primary-700" />}
                      <h3 className="text-xl font-semibold">下载范围</h3>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setBatchUnitType('district')
                          setBatchUnitCode('')
                        }}
                        className={`rounded-[22px] border p-4 text-left ${batchUnitType === 'district' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                      >
                        <div className="font-semibold text-ink">按学区下载</div>
                        <div className="mt-2 text-sm text-secondary-600">适用于学区统一导出整组准考证</div>
                      </button>
                      <button
                        onClick={() => {
                          setBatchUnitType('direct_school')
                          setBatchUnitCode('')
                        }}
                        className={`rounded-[22px] border p-4 text-left ${batchUnitType === 'direct_school' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                      >
                        <div className="font-semibold text-ink">按直属学校下载</div>
                        <div className="mt-2 text-sm text-secondary-600">适用于单所直属学校整体导出</div>
                      </button>
                    </div>

                    <select value={batchUnitCode} onChange={(event) => setBatchUnitCode(event.target.value)} className="form-input mt-5">
                      <option value="">全部{batchUnitType === 'district' ? '学区' : '直属学校'}</option>
                      {batchOptions.map((unit) => (
                        <option key={unit.code} value={unit.code}>
                          {unit.schoolName || unit.name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={schoolFilter}
                      onChange={(event) => setSchoolFilter(event.target.value)}
                      className="form-input mt-4"
                      placeholder="按学校名称进一步筛选"
                    />

                    <button onClick={() => void handleBatchDownload()} className="btn-primary mt-5 w-full justify-center">
                      <Users className="h-4 w-4" />
                      下载当前筛选结果
                    </button>
                  </div>

                  <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">Preview</p>
                        <h3 className="mt-2 text-xl font-semibold text-ink">批量下载预览</h3>
                      </div>
                      {isLoadingAll && <Loader className="h-5 w-5 animate-spin text-primary-700" />}
                    </div>

                    <div className="mt-5 table-container">
                      <table className="table">
                        <thead className="table-head">
                          <tr>
                            <th className="table-header">学生姓名</th>
                            <th className="table-header">学校</th>
                            <th className="table-header">归属</th>
                            <th className="table-header">准考证号</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ece4d7]">
                          {filteredBatchResults.slice(0, 10).map((registration) => (
                            <tr key={registration.ticket_number}>
                              <td className="table-cell">{registration.student_name}</td>
                              <td className="table-cell">{registration.school}</td>
                              <td className="table-cell">{registration.district_name || getContestUnitName(registration.district_code)}</td>
                              <td className="table-cell">{registration.ticket_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredBatchResults.length > 10 && (
                      <p className="mt-3 text-sm text-secondary-500">
                        当前仅展示前 10 条，实际将下载全部 {filteredBatchResults.length} 份准考证。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-primary-100 bg-primary-50/55 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 text-primary-700" />
            <div className="text-sm leading-8 text-primary-900">
              <p>• 准考证号格式：年份后两位 + 考场号两位 + 座位号两位（例：260101）</p>
              <p>• 批量下载会生成一个多页中文 PDF，适合学校或学区统一打印。</p>
              <p>• 如需按学校再次筛选，可在“批量下载”模式中输入学校名称后导出。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DownloadPage
