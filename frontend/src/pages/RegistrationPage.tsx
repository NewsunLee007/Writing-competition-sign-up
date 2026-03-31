import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  Download,
  CheckCircle,
  Loader,
  Upload,
  FileSpreadsheet,
  Landmark,
  Building2,
  Users,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  X,
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
const PHONE_REGEX = /^1[3-9]\d{9}$/
const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 11)
const GUIDE_STORAGE_PREFIX = 'contest_registration_guide_seen_'

type GuideTargetKey =
  | 'entry-mode'
  | 'manual-type'
  | 'manual-unit'
  | 'manual-students'
  | 'manual-submit'
  | 'batch-template'
  | 'batch-upload'
  | 'batch-submit'

type GuideStep = {
  title: string
  description: string
  mode: EntryMode
  target: GuideTargetKey
}

const createStudentDraft = (
  unitType: RegistrationUnitType = 'district',
  unitCode = ''
): StudentDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  unitType,
  unitCode,
  studentName: '',
  school: unitCode && isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : '',
  schoolSelection: unitCode && isDirectSchoolCode(unitCode) ? getContestUnitName(unitCode) : CUSTOM_SCHOOL_OPTION,
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
  const [guideActive, setGuideActive] = useState(false)
  const [guideStepIndex, setGuideStepIndex] = useState(0)
  const [guideFloatingStyle, setGuideFloatingStyle] = useState<React.CSSProperties>({})
  const guideTargetsRef = useRef<Partial<Record<GuideTargetKey, HTMLDivElement | null>>>({})

  const guideSteps: GuideStep[] = [
    {
      title: '先选择录入方式',
      description: '老师既可以逐个手工录入，也可以直接切换到 Excel 批量导入。',
      mode: 'manual',
      target: 'entry-mode',
    },
    {
      title: '手工录入先选报名类别',
      description: '先确定是学区推荐还是直属学校报名，系统会按对应规则限制名额。',
      mode: 'manual',
      target: 'manual-type',
    },
    {
      title: '再选择具体归属',
      description: '这里选择具体学区或直属学校，系统会同步显示剩余名额。',
      mode: 'manual',
      target: 'manual-unit',
    },
    {
      title: '在这里填写学生信息',
      description: '录完一位学生后可以继续添加下一位，不需要返回顶部重复操作。',
      mode: 'manual',
      target: 'manual-students',
    },
    {
      title: '最后提交本组报名',
      description: '确认这一组学生信息无误后，点击这里完成本组报名提交；报名结束后记得下载准考证。',
      mode: 'manual',
      target: 'manual-submit',
    },
    {
      title: '批量导入先下载模板',
      description: '如果老师手上已有学生名单，可以下载模板后统一整理，再进行批量导入。',
      mode: 'batch',
      target: 'batch-template',
    },
    {
      title: '上传 Excel 批量导入',
      description: '按模板整理完成后，在这里选择 Excel 文件，系统会先预览再统一提交。',
      mode: 'batch',
      target: 'batch-upload',
    },
    {
      title: '确认后提交批量报名',
      description: '预览无误后，点击这里一次性提交整批学生数据；报名结束后记得下载准考证。',
      mode: 'batch',
      target: 'batch-submit',
    },
  ]

  const currentGuideStep = guideSteps[guideStepIndex]

  const registerGuideTarget = (key: GuideTargetKey) => (element: HTMLDivElement | null) => {
    guideTargetsRef.current[key] = element
  }

  const isGuideTargetActive = (key: GuideTargetKey) =>
    guideActive && currentGuideStep?.target === key

  const getGuideTargetClassName = (key: GuideTargetKey) =>
    isGuideTargetActive(key)
      ? 'ring-2 ring-primary-300 ring-offset-4 ring-offset-[#f7f3ec] shadow-[0_18px_45px_rgba(70,111,221,0.16)] transition-all'
      : ''

  const scrollGuideTargetIntoView = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined' || !currentGuideStep) return
    const target = guideTargetsRef.current[currentGuideStep.target]
    if (!target) return

    target.scrollIntoView({
      behavior,
      block: 'center',
      inline: 'nearest',
    })
  }, [currentGuideStep])

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

  useEffect(() => {
    const setupGuideVisibility = async () => {
      const contextResponse = await apiService.getClientContext()
      const clientIp = contextResponse.success && contextResponse.data?.client_ip
        ? contextResponse.data.client_ip
        : 'unknown'
      const guideStorageKey = `${GUIDE_STORAGE_PREFIX}${clientIp}`
      const hasSeenGuide = window.localStorage.getItem(guideStorageKey)

      if (!hasSeenGuide) {
        window.localStorage.setItem(guideStorageKey, '1')
        setGuideStepIndex(0)
        setGuideActive(true)
      }
    }

    void setupGuideVisibility()
  }, [])

  useLayoutEffect(() => {
    if (!guideActive || !currentGuideStep) return
    if (entryMode !== currentGuideStep.mode) {
      setEntryMode(currentGuideStep.mode)
      return
    }

    const timers = [
      window.setTimeout(() => scrollGuideTargetIntoView('auto'), 30),
      window.setTimeout(() => scrollGuideTargetIntoView('smooth'), 180),
      window.setTimeout(() => scrollGuideTargetIntoView('auto'), 420),
    ]

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [currentGuideStep, entryMode, guideActive, scrollGuideTargetIntoView])

  useEffect(() => {
    if (!guideActive || !currentGuideStep || typeof window === 'undefined') return

    const updateGuidePosition = () => {
      const target = guideTargetsRef.current[currentGuideStep.target]
      if (!target) return

      const rect = target.getBoundingClientRect()
      const panelWidth = Math.min(360, window.innerWidth - 32)
      const defaultLeft = rect.right - panelWidth
      const left = Math.min(
        Math.max(16, defaultLeft),
        Math.max(16, window.innerWidth - panelWidth - 16)
      )
      const preferredTop = rect.top - 150
      const fallbackTop = rect.bottom + 12
      const top = preferredTop >= 16 ? preferredTop : Math.min(fallbackTop, window.innerHeight - 150)

      setGuideFloatingStyle({
        position: 'fixed',
        top: `${Math.max(16, top)}px`,
        left: `${left}px`,
        width: `${panelWidth}px`,
        zIndex: 60,
      })
    }

    updateGuidePosition()
    window.addEventListener('scroll', updateGuidePosition, true)
    window.addEventListener('resize', updateGuidePosition)

    return () => {
      window.removeEventListener('scroll', updateGuidePosition, true)
      window.removeEventListener('resize', updateGuidePosition)
    }
  }, [currentGuideStep, entryMode, guideActive])

  const units = useMemo(
    () =>
      CONTEST_UNITS.map((unit) => {
        const live = districts.find((item) => item.code === unit.code)
        return {
          ...unit,
          quota: live?.quota ?? 0,
          remainingQuota: live?.remaining_quota ?? live?.quota ?? 0,
          registeredCount: live?.registered_count ?? 0,
          displayName: unit.name,
        }
      }),
    [districts]
  )

  const manualOptions = useMemo(
    () => units.filter((unit) => unit.type === manualUnitType),
    [manualUnitType, units]
  )
  const selectedManualUnit = manualOptions.find((unit) => unit.code === manualUnitCode)
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
        if (field === 'teamTeacherPhone') {
          return { ...student, teamTeacherPhone: normalizePhone(value) }
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

      if (!PHONE_REGEX.test(draft.teamTeacherPhone)) {
        toast.error('带队教师联系电话必须为 11 位中国大陆手机号')
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

  const loadRecentSuccessfulTickets = async (drafts: StudentDraft[], fallbackTickets: Registration[]) => {
    const firstDraft = drafts[0]
    if (!firstDraft) {
      setGeneratedTickets(fallbackTickets)
      return
    }

    const recentResponse = await apiService.getRecentRegistrations({
      district_code: firstDraft.unitCode,
      school: firstDraft.school,
    })

    if (recentResponse.success && recentResponse.data && recentResponse.data.length > 0) {
      setGeneratedTickets(recentResponse.data)
      return
    }

    setGeneratedTickets(fallbackTickets)
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

      await loadRecentSuccessfulTickets(drafts, tickets)
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

  const handleCloseGuide = () => {
    setGuideActive(false)
  }

  const handleNextGuideStep = () => {
    if (guideStepIndex >= guideSteps.length - 1) {
      handleCloseGuide()
      return
    }
    setGuideStepIndex((current) => current + 1)
  }

  const handlePrevGuideStep = () => {
    setGuideStepIndex((current) => Math.max(0, current - 1))
  }

  if (isSuccess) {
    return (
      <div className="container-responsive py-8">
        <div className="mx-auto max-w-6xl section-shell p-6 sm:p-10">
          <div className="relative z-10">
            <div className="flex flex-col gap-4 border-b border-[#ded5c6] pb-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="mt-5 font-serif text-4xl text-ink sm:text-5xl">报名提交完成</h1>
                <p className="mt-4 max-w-2xl text-secondary-700">
                  当前列表会保留同一网络下、同一报名归属或同一学校的近期报名记录，方便连续录入后统一下载。
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
                      <td className="table-cell">{getContestUnitName(ticket.district_code)}</td>
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
        <section className="section-shell p-6 sm:p-8">
          <div className="relative z-10">
            <div className="relative z-10">
              <div className="flex flex-col gap-4 border-b border-[#ded5c6] pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-serif text-3xl text-ink">开始录入</h2>
                  <p className="mt-2 text-sm leading-7 text-secondary-600">
                    按步骤完成：选择报名类别 → 选择归属 → 填写学生 → 提交本组报名；如已整理名单，也可直接切换到 Excel 批量导入。
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  <div
                    ref={registerGuideTarget('entry-mode')}
                    className={`inline-flex rounded-full border border-white/70 bg-white/78 p-1 shadow-[0_10px_35px_rgba(15,23,40,0.08)] ${getGuideTargetClassName('entry-mode')}`}
                  >
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
                  <button
                    onClick={() => {
                      setGuideStepIndex(0)
                      setGuideActive(true)
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-primary-800 shadow-[0_10px_28px_rgba(70,111,221,0.10)] transition hover:bg-primary-100"
                    aria-label="显示新手引导"
                    title="新手引导"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {entryMode === 'manual' ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div
                      ref={registerGuideTarget('manual-type')}
                      className={`rounded-[24px] border border-white/60 bg-white/78 p-5 ${getGuideTargetClassName('manual-type')}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">步骤 1</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">选择报名类别</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            type: 'district' as const,
                            title: '学区推荐',
                            desc: '学区统一推荐，学校名称可选或手动填写',
                            icon: Landmark,
                          },
                          {
                            type: 'direct_school' as const,
                            title: '直属学校',
                            desc: '按学校固定名额报名，学校名称自动带出',
                            icon: Building2,
                          },
                        ].map((item) => (
                          <button
                            key={item.type}
                            onClick={() => handleManualTypeChange(item.type)}
                            className={`rounded-[24px] border p-5 text-left transition-all ${
                              manualUnitType === item.type
                                ? 'border-primary-400 bg-primary-50 shadow-[0_14px_40px_rgba(70,111,221,0.12)]'
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

                    <div
                      ref={registerGuideTarget('manual-unit')}
                      className={`rounded-[24px] border border-white/60 bg-white/78 p-5 ${getGuideTargetClassName('manual-unit')}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">步骤 2</p>
                          <h3 className="mt-2 text-xl font-semibold text-ink">选择归属</h3>
                        </div>
                        {selectedManualUnit && (
                          <div className="stat-chip">剩余 {selectedManualUnit.remainingQuota} / 总名额 {selectedManualUnit.quota}</div>
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
                        <div className="mt-5 rounded-[20px] border border-[#e0d6c8] bg-[#fffaf2] p-4 text-sm leading-7 text-secondary-700">
                          当前录入归属为 <span className="font-semibold text-ink">{selectedManualUnit.displayName}</span>，
                          已报名 {selectedManualUnit.registeredCount} 人，剩余 {selectedManualUnit.remainingQuota} 人。
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    ref={registerGuideTarget('manual-students')}
                    className={`rounded-[28px] border border-white/60 bg-white/78 p-5 ${getGuideTargetClassName('manual-students')}`}
                  >
                    <div className="border-b border-[#ece4d7] pb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">步骤 3</p>
                        <h3 className="mt-2 text-2xl font-semibold text-ink">学生信息录入</h3>
                        <p className="mt-2 text-sm leading-7 text-secondary-600">
                          录完当前学生后，可直接在下方继续添加下一位学生。
                        </p>
                      </div>
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
                                placeholder="请输入 11 位中国大陆手机号"
                                inputMode="numeric"
                                maxLength={11}
                              />
                              <p className="mt-2 text-xs leading-6 text-secondary-500">
                                仅支持数字输入，长度需为 11 位手机号码。
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <button onClick={addManualStudent} className="btn-secondary">
                        <Plus className="h-4 w-4" />
                        添加学生
                      </button>
                    </div>
                  </div>

                  <div ref={registerGuideTarget('manual-submit')} className={getGuideTargetClassName('manual-submit')}>
                    <button
                      onClick={() => void handleManualSubmit()}
                      disabled={isLoading}
                      className="btn-primary w-full justify-center px-8 py-4 text-base disabled:opacity-60"
                    >
                      {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      提交本组报名
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div
                      ref={registerGuideTarget('batch-template')}
                      className={`rounded-[24px] border border-white/60 bg-white/78 p-5 ${getGuideTargetClassName('batch-template')}`}
                    >
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
                      </div>
                    </div>

                    <div
                      ref={registerGuideTarget('batch-upload')}
                      className={`rounded-[24px] border border-white/60 bg-white/78 p-5 ${getGuideTargetClassName('batch-upload')}`}
                    >
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

                      <div ref={registerGuideTarget('batch-submit')} className={getGuideTargetClassName('batch-submit')}>
                        <button
                          onClick={() => void handleBatchSubmit()}
                          disabled={isLoading}
                          className="btn-primary w-full justify-center px-8 py-4 text-base disabled:opacity-60"
                        >
                          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                          提交批量报名
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {guideActive && currentGuideStep && (
          <div style={guideFloatingStyle} className="pointer-events-none">
            <div className="pointer-events-auto rounded-[22px] border border-primary-200 bg-primary-50/95 p-4 shadow-[0_18px_45px_rgba(70,111,221,0.14)] backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-700">
                        引导 {guideStepIndex + 1} / {guideSteps.length}
                      </div>
                  <h3 className="mt-2 text-base font-semibold text-ink">{currentGuideStep.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary-700">{currentGuideStep.description}</p>
                </div>
                <button
                  onClick={handleCloseGuide}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-secondary-500 transition hover:bg-white/70"
                  aria-label="关闭引导"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={handlePrevGuideStep}
                  disabled={guideStepIndex === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-secondary-700 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="上一步"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextGuideStep}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-900 text-white"
                  aria-label={guideStepIndex === guideSteps.length - 1 ? '完成引导' : '下一步'}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegistrationPage
