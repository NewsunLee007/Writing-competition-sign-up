import React, { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  Upload,
  FileSpreadsheet,
  Landmark,
  Building2,
  Sparkles,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiService, District, Registration } from '../services/api'
import { generateExamTicketPDF, generateBatchExamTicketsPDF } from '../utils/pdfGenerator'
import {
  CONTEST_UNITS,
  RegistrationUnitType,
  getContestUnitName,
  isDirectSchoolCode,
} from '../data/contestOptions'
import {
  ImportedStudent,
  getImportSummary,
  getTemplateOptionsPreview,
  parseBatchImportFile,
} from '../utils/batchImport'
import {
  CUSTOM_SCHOOL_OPTION,
  getSchoolCatalogByCode,
  getSchoolOptions,
} from '../data/schoolCatalog'

interface StudentDraft {
  id: string
  unitType: RegistrationUnitType
  unitCode: string
  studentName: string
  school: string
  schoolSelection?: string
  guideTeacher: string
  teamTeacherName: string
  teamTeacherPhone: string
}

type EntryMode = 'manual' | 'batch'

const createStudentDraft = (
  unitType: RegistrationUnitType = 'district',
  unitCode = ''
): StudentDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  unitType,
  unitCode,
  studentName: '',
  school: unitCode && isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : '',
  schoolSelection: unitCode && isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : '',
  guideTeacher: '',
  teamTeacherName: '',
  teamTeacherPhone: '',
})

const RegistrationPage: React.FC = () => {
  const [entryMode, setEntryMode] = useState<EntryMode>('manual')
  const [manualUnitType, setManualUnitType] = useState<RegistrationUnitType>('district')
  const [manualUnitCode, setManualUnitCode] = useState('')
  const [manualStudents, setManualStudents] = useState<StudentDraft[]>([createStudentDraft()])
  const [uploadedStudents, setUploadedStudents] = useState<ImportedStudent[]>([])
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [districts, setDistricts] = useState<District[]>([])
  const [generatedTickets, setGeneratedTickets] = useState<Registration[]>([])
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadDistricts = async () => {
      const response = await apiService.getDistricts()
      if (response.success && response.data) {
        setDistricts(response.data)
      } else {
        toast.error(response.message || '加载学区信息失败')
      }
    }

    loadDistricts()
  }, [])

  const units = useMemo(
    () =>
      CONTEST_UNITS.map((unit) => {
        const live = districts.find((item) => item.code === unit.code)
        return {
          ...unit,
          quota: live?.quota ?? 0,
          remainingQuota: live?.remaining_quota ?? live?.quota ?? 0,
          registeredCount: live?.registered_count ?? 0,
          displayName: unit.type === 'direct_school' ? unit.schoolName || unit.name : unit.name,
        }
      }),
    [districts]
  )

  const manualOptions = useMemo(
    () => units.filter((unit) => unit.type === manualUnitType),
    [manualUnitType, units]
  )
  const selectedManualUnit = manualOptions.find((unit) => unit.code === manualUnitCode)
  const templatePreview = getTemplateOptionsPreview()
  const importSummary = getImportSummary(uploadedStudents)

  const handleManualTypeChange = (nextType: RegistrationUnitType) => {
    setManualUnitType(nextType)
    setManualUnitCode('')
    setManualStudents([createStudentDraft(nextType)])
  }

  const handleManualUnitChange = (unitCode: string) => {
    setManualUnitCode(unitCode)
    setManualStudents((current) =>
      current.map((student) => ({
        ...student,
        unitType: manualUnitType,
        unitCode,
        school: isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : '',
        schoolSelection: isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : CUSTOM_SCHOOL_OPTION,
      }))
    )
  }

  const addManualStudent = () => {
    if (!manualUnitCode) {
      toast.error('请先选择报名归属')
      return
    }

    if (selectedManualUnit && manualStudents.length >= selectedManualUnit.remainingQuota) {
      toast.error(`当前单位剩余名额为 ${selectedManualUnit.remainingQuota}，无法继续添加`)
      return
    }

    setManualStudents((current) => [...current, createStudentDraft(manualUnitType, manualUnitCode)])
  }

  const updateManualStudent = (id: string, field: keyof StudentDraft, value: string) => {
    setManualStudents((current) =>
      current.map((student) => {
        if (student.id !== id) return student
        if (field === 'school' && isDirectSchoolCode(student.unitCode)) {
          return student
        }
        if (field === 'schoolSelection') {
          if (value === CUSTOM_SCHOOL_OPTION) {
            return { ...student, schoolSelection: value, school: '' }
          }
          return { ...student, schoolSelection: value, school: value }
        }
        return { ...student, [field]: value }
      })
    )
  }

  const removeManualStudent = (id: string) => {
    if (manualStudents.length === 1) return
    setManualStudents((current) => current.filter((student) => student.id !== id))
  }

  const validateDrafts = (drafts: StudentDraft[]) => {
    if (!drafts.length) {
      toast.error('当前没有可提交的数据')
      return false
    }

    const grouped = new Map<string, number>()

    for (const draft of drafts) {
      if (
        !draft.unitCode ||
        !draft.studentName ||
        !draft.school ||
        !draft.guideTeacher ||
        !draft.teamTeacherName ||
        !draft.teamTeacherPhone
      ) {
        toast.error('请完整填写所有必填信息')
        return false
      }

      grouped.set(draft.unitCode, (grouped.get(draft.unitCode) || 0) + 1)
    }

    for (const [unitCode, count] of grouped.entries()) {
      const unit = units.find((item) => item.code === unitCode)
      if (unit && count > unit.remainingQuota) {
        toast.error(`${unit.displayName} 剩余名额仅 ${unit.remainingQuota}，当前提交 ${count} 人`)
        return false
      }
    }

    return true
  }

  const submitStudents = async (drafts: StudentDraft[]) => {
    if (!validateDrafts(drafts)) return

    setIsLoading(true)

    try {
      const response = await apiService.batchRegister(
        drafts.map((draft) => ({
          client_id: draft.id,
          district_code: draft.unitCode,
          student_name: draft.studentName,
          school: draft.school,
          teacher_name: draft.guideTeacher,
          leader_name: draft.teamTeacherName,
          leader_phone: draft.teamTeacherPhone,
        }))
      )

      if (!response.success || !response.data) {
        toast.error(response.message || '报名失败')
        return
      }

      const tickets = response.data.results
        .filter((item) => item.success && item.ticket_number)
        .map((item) => {
          const source = drafts.find((draft) => draft.id === item.client_id)
          return {
            id: 0,
            ticket_number: item.ticket_number as string,
            district_code: source?.unitCode || '',
            district_name: source?.unitCode ? getContestUnitName(source.unitCode) : '',
            student_name: item.student_name,
            school: source?.school || '',
            teacher_name: source?.guideTeacher || '',
            leader_name: source?.teamTeacherName || '',
            leader_phone: source?.teamTeacherPhone || '',
            registration_time: new Date().toISOString(),
          }
        })

      setGeneratedTickets(tickets)
      setIsSuccess(true)

      toast.success(`成功报名 ${response.data.success} 人`)

      const failed = response.data.results.filter((item) => !item.success)
      if (failed.length > 0) {
        toast.error(failed.map((item) => `${item.student_name}：${item.reason || '失败'}`).slice(0, 3).join('；'))
      }
    } catch (_error) {
      toast.error('提交失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    await submitStudents(manualStudents)
  }

  const handleBatchFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const parsed = await parseBatchImportFile(file)
      setUploadedStudents(parsed)
      setUploadedFileName(file.name)
      setEntryMode('batch')
      toast.success(`已读取 ${parsed.length} 条报名数据`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Excel 解析失败')
    } finally {
      event.target.value = ''
    }
  }

  const handleBatchSubmit = async () => {
    await submitStudents(uploadedStudents)
  }

  const downloadSingleTicket = async (registration: Registration) => {
    try {
      await generateExamTicketPDF(registration)
      toast.success('准考证已下载')
    } catch (_error) {
      toast.error('生成准考证失败，请重试')
    }
  }

  const downloadAllTickets = async () => {
    try {
      await generateBatchExamTicketsPDF(generatedTickets, '报名成功批量准考证')
      toast.success(`已生成 ${generatedTickets.length} 份准考证`)
    } catch (_error) {
      toast.error('批量生成准考证失败，请重试')
    }
  }

  const resetForm = () => {
    setManualUnitType('district')
    setManualUnitCode('')
    setManualStudents([createStudentDraft()])
    setUploadedStudents([])
    setUploadedFileName('')
    setGeneratedTickets([])
    setIsSuccess(false)
    setEntryMode('manual')
  }

  const overviewStats = [
    { label: '学区名额总量', value: units.filter((item) => item.type === 'district').reduce((sum, item) => sum + item.quota, 0) },
    { label: '直属学校总量', value: units.filter((item) => item.type === 'direct_school').reduce((sum, item) => sum + item.quota, 0) },
    { label: '当前导入预览', value: uploadedStudents.length },
  ]

  if (isSuccess) {
    return (
      <div className="container-responsive py-8">
        <div className="mx-auto max-w-6xl section-shell p-6 sm:p-10">
          <div className="relative z-10">
            <div className="flex flex-col gap-4 border-b border-[#ded5c6] pb-8 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="eyebrow">Submission Completed</span>
                <h1 className="mt-5 font-serif text-4xl text-ink sm:text-5xl">报名提交完成</h1>
                <p className="mt-4 max-w-2xl text-secondary-700">
                  已成功生成 {generatedTickets.length} 份准考证，你可以现在整组下载，或逐个核对后再下载。
                </p>
              </div>
              <CheckCircle className="h-14 w-14 text-green-600" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={downloadAllTickets} className="btn-primary">
                <Download className="h-4 w-4" />
                下载全部准考证
              </button>
              <button onClick={resetForm} className="btn-secondary">
                返回继续报名
              </button>
            </div>

            <div className="mt-8 table-container">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header">准考证号</th>
                    <th className="table-header">学生姓名</th>
                    <th className="table-header">学校</th>
                    <th className="table-header">归属</th>
                    <th className="table-header">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece4d7]">
                  {generatedTickets.map((ticket) => (
                    <tr key={ticket.ticket_number}>
                      <td className="table-cell">{ticket.ticket_number}</td>
                      <td className="table-cell">{ticket.student_name}</td>
                      <td className="table-cell">{ticket.school}</td>
                      <td className="table-cell">{ticket.district_name || getContestUnitName(ticket.district_code)}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => void downloadSingleTicket(ticket)}
                          className="text-sm font-semibold text-primary-700"
                        >
                          下载
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="space-y-6">
        <div className="panel-grid items-start">
          <section className="section-shell p-7 sm:p-10">
            <div className="relative z-10">
              <span className="eyebrow">Registration Studio</span>
              <h1 className="mt-5 font-serif text-4xl text-ink sm:text-5xl">报名中心</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-secondary-700">
                采用更清晰的内部操作逻辑：将学区推荐与直属学校拆分为两条流程；支持手工录入、Excel
                批量导入，以及后续准考证整组下载。
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {overviewStats.map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/60 bg-white/76 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-ink">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="section-shell bg-[#10203c] p-7 text-white sm:p-8">
            <div className="relative z-10 space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
                  Key Workflow
                </span>
                <h2 className="mt-3 font-serif text-4xl text-white">内部操作规范</h2>
              </div>

              <div className="space-y-3 text-sm leading-7 text-white/72">
                <p>1. 学区推荐与直属学校分流录入。</p>
                <p>2. 每位学生必须单独填写指导教师。</p>
                <p>3. 下载端支持个人、学校、学区三个层级导出。</p>
                <p>4. 批量模板内置下拉项，统一导入口径。</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                <div className="flex items-center gap-2 text-[#f0c58a]">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">模板选项预览</span>
                </div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">学区</p>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      {templatePreview.districtOptions.join(' · ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">直属学校</p>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      {templatePreview.directSchoolOptions.join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="panel-grid items-start">
          <section className="section-shell p-6 sm:p-8">
            <div className="relative z-10">
              <div className="flex flex-col gap-4 border-b border-[#ded5c6] pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary-500">
                    Input Modes
                  </div>
                  <h2 className="mt-2 font-serif text-3xl text-ink">录入方式</h2>
                </div>

                <div className="inline-flex rounded-full border border-white/70 bg-white/78 p-1 shadow-[0_10px_35px_rgba(15,23,40,0.08)]">
                  <button
                    onClick={() => setEntryMode('manual')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      entryMode === 'manual' ? 'bg-primary-900 text-white' : 'text-secondary-600'
                    }`}
                  >
                    手工录入
                  </button>
                  <button
                    onClick={() => setEntryMode('batch')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      entryMode === 'batch' ? 'bg-primary-900 text-white' : 'text-secondary-600'
                    }`}
                  >
                    Excel 批量导入
                  </button>
                </div>
              </div>

              {entryMode === 'manual' ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                        报名类别
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            type: 'district' as const,
                            title: '学区推荐',
                            desc: '由各学区统一推荐，学校名称手动填写',
                            icon: Landmark,
                          },
                          {
                            type: 'direct_school' as const,
                            title: '直属学校',
                            desc: '直接按学校名额报名，学校名称自动锁定',
                            icon: Building2,
                          },
                        ].map((item) => (
                          <button
                            key={item.type}
                            onClick={() => handleManualTypeChange(item.type)}
                            className={`rounded-[24px] border p-5 text-left transition-all ${
                              manualUnitType === item.type
                                ? 'border-primary-400 bg-primary-50 shadow-[0_18px_50px_rgba(70,111,221,0.12)]'
                                : 'border-[#ddd4c7] bg-[#fffaf3]'
                            }`}
                          >
                            <item.icon className="h-5 w-5 text-primary-700" />
                            <div className="mt-4 text-lg font-semibold text-ink">{item.title}</div>
                            <p className="mt-2 text-sm leading-7 text-secondary-600">{item.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                            归属选择
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-ink">
                            请选择 {manualUnitType === 'district' ? '学区' : '直属学校'}
                          </h3>
                        </div>
                        {selectedManualUnit && (
                          <div className="stat-chip">
                            剩余 {selectedManualUnit.remainingQuota} / 总名额 {selectedManualUnit.quota}
                          </div>
                        )}
                      </div>

                      <select
                        value={manualUnitCode}
                        onChange={(event) => handleManualUnitChange(event.target.value)}
                        className="form-input mt-5"
                      >
                        <option value="">请选择</option>
                        {manualOptions.map((unit) => (
                          <option key={unit.code} value={unit.code}>
                            {unit.displayName}（剩余 {unit.remainingQuota} / 总名额 {unit.quota}）
                          </option>
                        ))}
                      </select>

                      {selectedManualUnit && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[20px] border border-[#e0d6c8] bg-[#fffaf2] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-secondary-500">归属</p>
                            <p className="mt-2 font-semibold text-ink">{selectedManualUnit.displayName}</p>
                          </div>
                          <div className="rounded-[20px] border border-[#e0d6c8] bg-[#fffaf2] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-secondary-500">已报名</p>
                            <p className="mt-2 font-semibold text-ink">{selectedManualUnit.registeredCount}</p>
                          </div>
                          <div className="rounded-[20px] border border-[#e0d6c8] bg-[#fffaf2] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-secondary-500">名额上限</p>
                            <p className="mt-2 font-semibold text-ink">{selectedManualUnit.quota}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/60 bg-white/78 p-5">
                    <div className="flex flex-col gap-4 border-b border-[#ece4d7] pb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                          Student Entries
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-ink">学生信息录入</h3>
                      </div>
                      <button onClick={addManualStudent} className="btn-primary">
                        <Plus className="h-4 w-4" />
                        添加学生
                      </button>
                    </div>

                    <div className="mt-6 space-y-5">
                      {manualStudents.map((student, index) => (
                        <div key={student.id} className="rounded-[24px] border border-[#ece4d7] bg-[#fffaf2] p-5">
                          <div className="flex flex-col gap-3 border-b border-[#ece4d7] pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-ink">学生 #{index + 1}</h4>
                                <p className="text-sm text-secondary-600">
                                  {student.unitCode ? getContestUnitName(student.unitCode) : '未选择归属'}
                                </p>
                              </div>
                            </div>
                            {manualStudents.length > 1 && (
                              <button
                                onClick={() => removeManualStudent(student.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                删除
                              </button>
                            )}
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="form-label">学生姓名</label>
                              <input
                                className="form-input"
                                value={student.studentName}
                                onChange={(event) => updateManualStudent(student.id, 'studentName', event.target.value)}
                                placeholder="请输入学生姓名"
                              />
                            </div>
                            <div>
                              <label className="form-label">指导教师</label>
                              <input
                                className="form-input"
                                value={student.guideTeacher}
                                onChange={(event) => updateManualStudent(student.id, 'guideTeacher', event.target.value)}
                                placeholder="请输入指导教师姓名"
                              />
                            </div>
                            <div>
                              <label className="form-label">学校</label>
                              {isDirectSchoolCode(student.unitCode) ? (
                                <input
                                  className="form-input"
                                  value={student.school}
                                  onChange={(event) => updateManualStudent(student.id, 'school', event.target.value)}
                                  placeholder="直属学校自动带出"
                                  disabled
                                />
                              ) : (
                                <div className="space-y-3">
                                  <select
                                    className="form-input"
                                    value={student.schoolSelection || CUSTOM_SCHOOL_OPTION}
                                    onChange={(event) =>
                                      updateManualStudent(student.id, 'schoolSelection', event.target.value)
                                    }
                                  >
                                    {getSchoolOptions(student.unitCode).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                  {(student.schoolSelection || CUSTOM_SCHOOL_OPTION) === CUSTOM_SCHOOL_OPTION && (
                                    <input
                                      className="form-input"
                                      value={student.school}
                                      onChange={(event) => updateManualStudent(student.id, 'school', event.target.value)}
                                      placeholder="请输入具体学校名称"
                                    />
                                  )}
                                </div>
                              )}
                              {!isDirectSchoolCode(student.unitCode) && student.unitCode && (
                                <p className="mt-2 text-xs leading-6 text-secondary-500">
                                  {getSchoolCatalogByCode(student.unitCode)?.sourceNote || '当前可手动填写学校名称'}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="form-label">带队教师</label>
                              <input
                                className="form-input"
                                value={student.teamTeacherName}
                                onChange={(event) => updateManualStudent(student.id, 'teamTeacherName', event.target.value)}
                                placeholder="请输入带队教师姓名"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">带队教师联系电话</label>
                              <input
                                className="form-input"
                                value={student.teamTeacherPhone}
                                onChange={(event) => updateManualStudent(student.id, 'teamTeacherPhone', event.target.value)}
                                placeholder="请输入手机号或办公电话"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => void handleManualSubmit()}
                    disabled={isLoading}
                    className="btn-primary w-full justify-center px-8 py-4 text-base disabled:opacity-60"
                  >
                    {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    提交本组报名
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary-700" />
                        <div>
                          <h3 className="text-xl font-semibold text-ink">下载导入模板</h3>
                          <p className="text-sm leading-7 text-secondary-600">
                            模板内含报名类别与归属下拉选择，适用于批量汇总后导入。
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <a href="/batch-registration-template.xlsx" className="btn-primary">
                          <Download className="h-4 w-4" />
                          下载 Excel 模板
                        </a>
                        <a href="/batch-registration-template.xlsx" download className="btn-secondary">
                          另存为本地文件
                        </a>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                      <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5 text-primary-700" />
                        <div>
                          <h3 className="text-xl font-semibold text-ink">上传报名文件</h3>
                          <p className="text-sm leading-7 text-secondary-600">
                            支持 .xlsx / .xls，解析后会先展示预览，再进行统一提交。
                          </p>
                        </div>
                      </div>
                      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-primary-300 bg-primary-50/45 px-6 py-10 text-center">
                        <Upload className="h-8 w-8 text-primary-700" />
                        <p className="mt-4 text-base font-semibold text-ink">点击选择 Excel 文件</p>
                        <p className="mt-2 text-sm text-secondary-600">{uploadedFileName || '尚未选择文件'}</p>
                        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBatchFileChange} />
                      </label>
                    </div>
                  </div>

                  {uploadedStudents.length > 0 && (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        {importSummary.map((item) => (
                          <div key={item.name} className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary-500">
                              归属
                            </div>
                            <div className="mt-2 text-lg font-semibold text-ink">{item.name}</div>
                            <div className="mt-1 text-sm text-secondary-600">{item.count} 位学生</div>
                          </div>
                        ))}
                      </div>

                      <div className="table-container">
                        <table className="table">
                          <thead className="table-head">
                            <tr>
                              <th className="table-header">报名类别</th>
                              <th className="table-header">学区 / 直属学校</th>
                              <th className="table-header">学校</th>
                              <th className="table-header">学生姓名</th>
                              <th className="table-header">指导教师</th>
                              <th className="table-header">带队教师</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece4d7]">
                            {uploadedStudents.slice(0, 12).map((student) => (
                              <tr key={student.id}>
                                <td className="table-cell">{student.unitType === 'district' ? '学区推荐' : '直属学校'}</td>
                                <td className="table-cell">{student.unitName}</td>
                                <td className="table-cell">{student.school}</td>
                                <td className="table-cell">{student.studentName}</td>
                                <td className="table-cell">{student.guideTeacher}</td>
                                <td className="table-cell">{student.teamTeacherName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {uploadedStudents.length > 12 && (
                        <p className="text-sm text-secondary-500">已预览前 12 条，实际将提交全部 {uploadedStudents.length} 条数据。</p>
                      )}

                      <button
                        onClick={() => void handleBatchSubmit()}
                        disabled={isLoading}
                        className="btn-primary w-full justify-center px-8 py-4 text-base disabled:opacity-60"
                      >
                        {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        提交批量报名
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="section-shell p-6 sm:p-8">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                    操作说明
                  </p>
                  <h3 className="text-2xl font-semibold text-ink">报名注意事项</h3>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e5dccf] bg-[#fffaf2] p-5 text-sm leading-8 text-secondary-700">
                <p>• 报名截止日期：4 月 3 日</p>
                <p>• 活动时间：4 月 12 日（星期日）8:50 报到，9:00 开始</p>
                <p>• 活动地点：瑞安市毓蒙中学</p>
                <p>• 指导教师需逐位学生对应填写，不可遗漏</p>
                <p>• 直属学校报名时，“学校”字段自动带出学校名称</p>
              </div>

              <div className="rounded-[24px] border border-[#e5dccf] bg-white/82 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-bronze" />
                  <p className="text-sm font-semibold text-ink">当前名额概览</p>
                </div>
                <div className="mt-4 grid gap-3">
                  {units.slice(0, 6).map((unit) => (
                    <div key={unit.code} className="flex items-center justify-between rounded-2xl border border-[#eee4d7] bg-[#fffaf3] px-4 py-3">
                      <div>
                        <p className="font-semibold text-ink">{unit.displayName}</p>
                        <p className="text-xs uppercase tracking-[0.22em] text-secondary-500">
                          {unit.type === 'district' ? '学区推荐' : '直属学校'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{unit.remainingQuota} / {unit.quota}</p>
                        <p className="text-xs text-secondary-500">剩余 / 总额</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default RegistrationPage
