import React, { useEffect, useMemo, useState } from 'react'
import { Search, Download, AlertCircle, Loader, Users, Building2, Landmark, ShieldCheck, LogOut, FileSpreadsheet, BarChart3, Trash2, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { apiService, AdminProgress, Registration } from '../services/api'
import { generateBatchExamTicketsPDF, generateExamTicketPDF } from '../utils/pdfGenerator'
import { CONTEST_UNITS, RegistrationUnitType, getContestUnitName } from '../data/contestOptions'

const ADMIN_TOKEN_KEY = 'contest_admin_token'
const ADMIN_RESET_CONFIRM_TEXT = '确认清空报名数据'
const ADMIN_DELETE_CONFIRM_TEXT = '确认删除选中报名'
const PHONE_REGEX = /^1[3-9]\d{9}$/

const DownloadPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Registration[]>([])
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoadingPublicBatch, setIsLoadingPublicBatch] = useState(false)
  const [downloadMode, setDownloadMode] = useState<'single' | 'edit' | 'batch' | 'admin'>('single')
  const [editTicketNumber, setEditTicketNumber] = useState('')
  const [editLeaderPhoneInput, setEditLeaderPhoneInput] = useState('')
  const [isEditSearching, setIsEditSearching] = useState(false)
  const [publicBatchUnitType, setPublicBatchUnitType] = useState<RegistrationUnitType>('district')
  const [publicBatchUnitCode, setPublicBatchUnitCode] = useState('')
  const [publicSchoolFilter, setPublicSchoolFilter] = useState('')
  const [adminAccount, setAdminAccount] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [adminProgress, setAdminProgress] = useState<AdminProgress | null>(null)
  const [adminRegistrations, setAdminRegistrations] = useState<Registration[]>([])
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [adminUnitType, setAdminUnitType] = useState<RegistrationUnitType>('district')
  const [adminUnitCode, setAdminUnitCode] = useState('')
  const [adminSchoolFilter, setAdminSchoolFilter] = useState('')
  const [showResetPanel, setShowResetPanel] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [selectedAdminIds, setSelectedAdminIds] = useState<number[]>([])
  const [isDeletingAdminRows, setIsDeletingAdminRows] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null)
  const [isEditingAsAdmin, setIsEditingAsAdmin] = useState(false)
  const [editVerifyPhone, setEditVerifyPhone] = useState('')
  const [editForm, setEditForm] = useState({
    student_name: '',
    school: '',
    teacher_name: '',
    leader_name: '',
    leader_phone: '',
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, string>>({})
  const [updatingQuotaCode, setUpdatingQuotaCode] = useState('')

  useEffect(() => {
    const loadPublicRegistrations = async () => {
      setIsLoadingPublicBatch(true)
      try {
        const response = await apiService.getAllRegistrations()
        if (response.success && response.data) {
          setAllRegistrations(response.data)
        }
      } finally {
        setIsLoadingPublicBatch(false)
      }
    }

    void loadPublicRegistrations()

    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!savedToken) return

    const restoreAdminSession = async () => {
      const success = await loadAdminCenter(savedToken)
      if (!success) {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY)
      }
    }

    void restoreAdminSession()
  }, [])

  const publicBatchOptions = useMemo(
    () => CONTEST_UNITS.filter((unit) => unit.type === publicBatchUnitType),
    [publicBatchUnitType]
  )

  const filteredPublicBatchRegistrations = useMemo(() => {
    const allowedCodes = new Set(publicBatchOptions.map((unit) => unit.code))
    return allRegistrations.filter((registration) => {
      if (!allowedCodes.has(registration.district_code)) return false
      const matchesUnit = publicBatchUnitCode ? registration.district_code === publicBatchUnitCode : true
      const matchesSchool = publicSchoolFilter.trim()
        ? registration.school.toLowerCase().includes(publicSchoolFilter.trim().toLowerCase())
        : true
      return matchesUnit && matchesSchool
    })
  }, [allRegistrations, publicBatchOptions, publicBatchUnitCode, publicSchoolFilter])

  const adminOptions = useMemo(
    () => CONTEST_UNITS.filter((unit) => unit.type === adminUnitType),
    [adminUnitType]
  )

  const filteredAdminRegistrations = useMemo(() => {
    const allowedCodes = new Set(adminOptions.map((unit) => unit.code))
    return adminRegistrations.filter((registration) => {
      if (!allowedCodes.has(registration.district_code)) return false
      const matchesUnit = adminUnitCode ? registration.district_code === adminUnitCode : true
      const matchesSchool = adminSchoolFilter.trim()
        ? registration.school.toLowerCase().includes(adminSchoolFilter.trim().toLowerCase())
        : true
      return matchesUnit && matchesSchool
    })
  }, [adminOptions, adminRegistrations, adminSchoolFilter, adminUnitCode])

  const filteredSchoolProgress = useMemo(() => {
    const allowedCodes = new Set(adminOptions.map((unit) => unit.code))
    return (adminProgress?.schools || []).filter((item) => {
      if (!allowedCodes.has(item.district_code)) return false
      const matchesUnit = adminUnitCode ? item.district_code === adminUnitCode : true
      const matchesSchool = adminSchoolFilter.trim()
        ? item.school.toLowerCase().includes(adminSchoolFilter.trim().toLowerCase())
        : true
      return matchesUnit && matchesSchool
    })
  }, [adminOptions, adminProgress?.schools, adminSchoolFilter, adminUnitCode])

  const filteredUnitProgress = useMemo(() => {
    const allowedCodes = new Set(CONTEST_UNITS.filter((unit) => unit.type === adminUnitType).map((unit) => unit.code))
    return (adminProgress?.units || []).filter((item) => {
      if (!allowedCodes.has(item.code)) return false
      if (!adminUnitCode) return true
      return item.code === adminUnitCode
    })
  }, [adminProgress?.units, adminUnitCode, adminUnitType])

  useEffect(() => {
    setSelectedAdminIds((current) => {
      const validIds = new Set(adminRegistrations.map((item) => item.id))
      return current.filter((id) => validIds.has(id))
    })
  }, [adminRegistrations])

  useEffect(() => {
    const units = adminProgress?.units
    if (!units) return
    setQuotaDrafts((current) => {
      const next: Record<string, string> = { ...current }
      units.forEach((unit) => {
        if (next[unit.code] == null) {
          next[unit.code] = String(unit.quota)
        }
      })
      return next
    })
  }, [adminProgress?.units])

  const loadAdminCenter = async (token: string) => {
    setIsAdminLoading(true)
    try {
      const [progressResponse, registrationsResponse] = await Promise.all([
        apiService.getAdminProgress(token),
        apiService.getAdminRegistrations(token),
      ])

      if (!progressResponse.success || !progressResponse.data) {
        toast.error(progressResponse.message || '管理员身份已失效，请重新登录')
        setAdminToken('')
        setAdminProgress(null)
        setAdminRegistrations([])
        return false
      }

      if (!registrationsResponse.success || !registrationsResponse.data) {
        toast.error(registrationsResponse.message || '报名数据加载失败')
        return false
      }

      setAdminToken(token)
      setAdminProgress(progressResponse.data)
      setAdminRegistrations(registrationsResponse.data)
      return true
    } finally {
      setIsAdminLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    if (!adminAccount.trim() || !adminPassword.trim()) {
      toast.error('请输入管理员账号和密码')
      return
    }

    setIsAdminLoading(true)
    try {
      const response = await apiService.adminLogin(adminAccount.trim(), adminPassword)
      if (!response.success || !response.data) {
        toast.error(response.message || '管理员登录失败')
        return
      }

      window.localStorage.setItem(ADMIN_TOKEN_KEY, response.data.token)
      const loaded = await loadAdminCenter(response.data.token)
      if (loaded) {
        toast.success('管理员中心已打开')
      }
    } finally {
      setIsAdminLoading(false)
    }
  }

  const handleAdminLogout = () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    setAdminProgress(null)
    setAdminRegistrations([])
    setAdminUnitType('district')
    setAdminUnitCode('')
    setAdminSchoolFilter('')
    setShowResetPanel(false)
    setResetConfirmText('')
    setSelectedAdminIds([])
    closeEditModal()
    toast.success('已退出管理员中心')
  }

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

  const handlePublicBatchDownload = async () => {
    if (!filteredPublicBatchRegistrations.length) {
      toast.error('当前筛选结果为空')
      return
    }

    try {
      const label = publicBatchUnitCode
        ? `${getContestUnitName(publicBatchUnitCode)}准考证`
        : publicSchoolFilter
        ? `${publicSchoolFilter}-学校筛选准考证`
        : '批量准考证'

      await generateBatchExamTicketsPDF(filteredPublicBatchRegistrations, label)
      toast.success(`已生成 ${filteredPublicBatchRegistrations.length} 份准考证`)
    } catch (_error) {
      toast.error('批量下载失败，请重试')
    }
  }

  const handleAdminTicketDownload = async () => {
    if (!filteredAdminRegistrations.length) {
      toast.error('当前筛选结果为空')
      return
    }

    try {
      const label = adminUnitCode
        ? `${getContestUnitName(adminUnitCode)}准考证`
        : adminSchoolFilter
        ? `${adminSchoolFilter}-学校筛选准考证`
        : '管理员批量准考证'

      await generateBatchExamTicketsPDF(filteredAdminRegistrations, label)
      toast.success(`已生成 ${filteredAdminRegistrations.length} 份准考证`)
    } catch (_error) {
      toast.error('批量下载失败，请重试')
    }
  }

  const exportAdminExcel = (rows: Registration[], fileName: string) => {
    if (!rows.length) {
      toast.error('当前没有可导出的报名数据')
      return
    }

    const sheetData = rows.map((item) => ({
      准考证号: item.ticket_number,
      学生姓名: item.student_name,
      学校: item.school,
      报名归属: getContestUnitName(item.district_code),
      指导教师: item.teacher_name || '',
      带队教师: item.leader_name,
      带队教师电话: item.leader_phone,
      报名时间: item.registration_time,
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    const columnWidths = [
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 22 },
    ]
    worksheet['!cols'] = columnWidths
    XLSX.utils.book_append_sheet(workbook, worksheet, '报名信息')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
    toast.success(`已导出 ${rows.length} 条报名记录`)
  }

  const handleAdminReset = async () => {
    if (!adminToken) {
      toast.error('请先登录管理员账户')
      return
    }

    if (resetConfirmText.trim() !== ADMIN_RESET_CONFIRM_TEXT) {
      toast.error(`请输入“${ADMIN_RESET_CONFIRM_TEXT}”后再执行`)
      return
    }

    setIsResetting(true)
    try {
      const response = await apiService.resetAdminRegistrations(adminToken, resetConfirmText.trim())
      if (!response.success) {
        toast.error(response.message || '清空报名数据失败')
        return
      }

      await loadAdminCenter(adminToken)
      setShowResetPanel(false)
      setResetConfirmText('')
      setAdminUnitCode('')
      setAdminSchoolFilter('')
      toast.success(response.message || '报名数据已清空')
    } finally {
      setIsResetting(false)
    }
  }

  const openEditModal = (registration: Registration, asAdmin: boolean, verifyPhone?: string) => {
    setEditingRegistration(registration)
    setIsEditingAsAdmin(asAdmin)
    setEditVerifyPhone(verifyPhone ? String(verifyPhone).trim() : '')
    setEditForm({
      student_name: registration.student_name || '',
      school: registration.school || '',
      teacher_name: registration.teacher_name || '',
      leader_name: registration.leader_name || '',
      leader_phone: registration.leader_phone || '',
    })
  }

  const closeEditModal = () => {
    setEditingRegistration(null)
    setIsEditingAsAdmin(false)
    setEditVerifyPhone('')
    setEditForm({
      student_name: '',
      school: '',
      teacher_name: '',
      leader_name: '',
      leader_phone: '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRegistration) return

    const payload = {
      student_name: editForm.student_name.trim(),
      school: editForm.school.trim(),
      teacher_name: editForm.teacher_name.trim(),
      leader_name: editForm.leader_name.trim(),
      leader_phone: editForm.leader_phone.trim(),
    }

    if (!payload.student_name || !payload.school || !payload.leader_name || !payload.leader_phone) {
      toast.error('学生姓名、学校、带队教师、带队教师电话不能为空')
      return
    }
    if (!PHONE_REGEX.test(payload.leader_phone)) {
      toast.error('带队教师电话必须为 11 位手机号')
      return
    }

    setIsSavingEdit(true)
    try {
      if (isEditingAsAdmin) {
        if (!adminToken) {
          toast.error('请先登录管理员账户')
          return
        }

        const response = await apiService.adminUpdateRegistration(adminToken, editingRegistration.id, payload)
        if (!response.success || !response.data) {
          toast.error(response.message || '更新报名信息失败')
          return
        }

        await loadAdminCenter(adminToken)
        toast.success(response.message || '报名信息已更新')
        closeEditModal()
        return
      }

      const verifyPhone = editVerifyPhone.trim()
      if (!PHONE_REGEX.test(verifyPhone)) {
        toast.error('请输入正确的带队教师电话用于校验')
        return
      }

      const response = await apiService.updateRegistrationByTicket(
        editingRegistration.ticket_number,
        verifyPhone,
        payload
      )
      if (!response.success || !response.data) {
        toast.error(response.message || '更新报名信息失败')
        return
      }

      setSearchResults((current) =>
        current.map((item) => (item.ticket_number === response.data?.ticket_number ? response.data : item))
      )
      toast.success(response.message || '报名信息已更新')
      closeEditModal()
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleOpenEditEntry = async () => {
    const ticket = editTicketNumber.trim()
    const phone = editLeaderPhoneInput.trim()

    if (!ticket) {
      toast.error('请输入准考证号')
      return
    }
    if (!/^\d{6}$/.test(ticket)) {
      toast.error('准考证号格式应为 6 位数字')
      return
    }
    if (!PHONE_REGEX.test(phone)) {
      toast.error('请输入正确的带队教师电话（11 位手机号）')
      return
    }

    setIsEditSearching(true)
    try {
      const response = await apiService.searchRegistrations({ ticket_number: ticket })
      if (!response.success || !response.data || response.data.length === 0) {
        toast.error(response.message || '未找到对应的报名记录')
        return
      }

      const exact = response.data.find((item) => String(item.ticket_number) === ticket)
      openEditModal(exact || response.data[0], false, phone)
    } finally {
      setIsEditSearching(false)
    }
  }

  const toggleAdminSelection = (id: number) => {
    setSelectedAdminIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const toggleSelectAllFilteredAdminRows = () => {
    const filteredIds = filteredAdminRegistrations.map((item) => item.id)
    if (!filteredIds.length) return

    setSelectedAdminIds((current) => {
      const allSelected = filteredIds.every((id) => current.includes(id))
      if (allSelected) {
        return current.filter((id) => !filteredIds.includes(id))
      }
      return Array.from(new Set([...current, ...filteredIds]))
    })
  }

  const handleDeleteSingleAdminRegistration = async (registration: Registration) => {
    if (!adminToken) {
      toast.error('请先登录管理员账户')
      return
    }

    const confirmed = window.confirm(
      `确认删除 ${registration.student_name}（${registration.school}）的报名记录吗？此操作不可撤销。`
    )
    if (!confirmed) return

    setIsDeletingAdminRows(true)
    try {
      const response = await apiService.deleteAdminRegistration(adminToken, registration.id)
      if (!response.success) {
        toast.error(response.message || '删除报名记录失败')
        return
      }

      setSelectedAdminIds((current) => current.filter((id) => id !== registration.id))
      await loadAdminCenter(adminToken)
      toast.success(response.message || '报名记录已删除')
    } finally {
      setIsDeletingAdminRows(false)
    }
  }

  const handleDeleteSelectedAdminRegistrations = async () => {
    if (!adminToken) {
      toast.error('请先登录管理员账户')
      return
    }

    if (!selectedAdminIds.length) {
      toast.error('请先勾选要删除的报名记录')
      return
    }

    const confirmed = window.prompt(
      `将删除 ${selectedAdminIds.length} 条报名记录。请输入“${ADMIN_DELETE_CONFIRM_TEXT}”继续：`
    )
    if (confirmed !== ADMIN_DELETE_CONFIRM_TEXT) {
      if (confirmed !== null) {
        toast.error('确认口令不正确，已取消删除')
      }
      return
    }

    setIsDeletingAdminRows(true)
    try {
      const response = await apiService.deleteAdminRegistrations(
        adminToken,
        selectedAdminIds,
        ADMIN_DELETE_CONFIRM_TEXT
      )
      if (!response.success) {
        toast.error(response.message || '批量删除失败')
        return
      }

      setSelectedAdminIds([])
      await loadAdminCenter(adminToken)
      toast.success(response.message || '已删除选中报名记录')
    } finally {
      setIsDeletingAdminRows(false)
    }
  }

  const handleUpdateQuota = async (code: string) => {
    if (!adminToken) {
      toast.error('请先登录管理员账户')
      return
    }

    const raw = quotaDrafts[code]
    const quota = Number(raw)

    if (!Number.isFinite(quota) || !Number.isInteger(quota) || quota < 0 || quota > 999) {
      toast.error('名额必须为 0-999 的整数')
      return
    }

    setUpdatingQuotaCode(code)
    try {
      const response = await apiService.adminUpdateDistrictQuota(adminToken, code, quota)
      if (!response.success) {
        toast.error(response.message || '更新名额失败')
        return
      }

      await loadAdminCenter(adminToken)
      toast.success(response.message || '名额已更新')
    } finally {
      setUpdatingQuotaCode('')
    }
  }

  return (
    <>
      <div className="container-responsive py-8">
        <div className="space-y-6">
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
                onClick={() => setDownloadMode('edit')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${downloadMode === 'edit' ? 'bg-primary-900 text-white' : 'text-secondary-600'}`}
              >
                报名修改
              </button>
              <button
                onClick={() => setDownloadMode('batch')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${downloadMode === 'batch' ? 'bg-primary-900 text-white' : 'text-secondary-600'}`}
              >
                批量下载
              </button>
              <button
                onClick={() => setDownloadMode('admin')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${downloadMode === 'admin' ? 'bg-primary-900 text-white' : 'text-secondary-600'}`}
              >
                管理登录
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
                                <p><span className="font-semibold text-ink">报名归属：</span>{getContestUnitName(registration.district_code)}</p>
                                {registration.teacher_name && <p><span className="font-semibold text-ink">指导教师：</span>{registration.teacher_name}</p>}
                                <p><span className="font-semibold text-ink">带队教师：</span>{registration.leader_name}（{registration.leader_phone}）</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <button onClick={() => openEditModal(registration, false)} className="btn-secondary">
                                <Pencil className="h-4 w-4" />
                                修改信息
                              </button>
                              <button onClick={() => void downloadTicket(registration)} className="btn-primary">
                                <Download className="h-4 w-4" />
                                下载准考证
                              </button>
                            </div>
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
            ) : downloadMode === 'edit' ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-[24px] border border-white/60 bg-white/78 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-ink">报名信息修改</h3>
                      <p className="mt-2 text-sm leading-7 text-secondary-600">
                        输入准考证号与带队教师电话进行校验后，可对报名信息进行二次修改。
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label className="form-label">准考证号</label>
                      <input
                        value={editTicketNumber}
                        onChange={(event) => setEditTicketNumber(event.target.value.trim())}
                        onKeyDown={(event) => event.key === 'Enter' && void handleOpenEditEntry()}
                        className="form-input"
                        placeholder="例如：260101"
                      />
                    </div>
                    <div>
                      <label className="form-label">带队教师电话（校验用）</label>
                      <input
                        value={editLeaderPhoneInput}
                        onChange={(event) => setEditLeaderPhoneInput(event.target.value.trim())}
                        onKeyDown={(event) => event.key === 'Enter' && void handleOpenEditEntry()}
                        className="form-input"
                        placeholder="11 位手机号"
                      />
                    </div>
                    <div className="md:pt-[30px]">
                      <button onClick={() => void handleOpenEditEntry()} disabled={isEditSearching} className="btn-primary min-w-[160px]">
                        {isEditSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        查找并修改
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : downloadMode === 'batch' ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
                  <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                    <div className="flex items-center gap-2 text-ink">
                      {publicBatchUnitType === 'district' ? <Landmark className="h-5 w-5 text-primary-700" /> : <Building2 className="h-5 w-5 text-primary-700" />}
                      <h3 className="text-xl font-semibold">批量下载范围</h3>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setPublicBatchUnitType('district')
                          setPublicBatchUnitCode('')
                        }}
                        className={`rounded-[22px] border p-4 text-left ${publicBatchUnitType === 'district' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                      >
                        <div className="font-semibold text-ink">按学区下载</div>
                        <div className="mt-2 text-sm text-secondary-600">适合学区统一下载本学区准考证</div>
                      </button>
                      <button
                        onClick={() => {
                          setPublicBatchUnitType('direct_school')
                          setPublicBatchUnitCode('')
                        }}
                        className={`rounded-[22px] border p-4 text-left ${publicBatchUnitType === 'direct_school' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                      >
                        <div className="font-semibold text-ink">按直属学校下载</div>
                        <div className="mt-2 text-sm text-secondary-600">适合直属学校按本校整体导出</div>
                      </button>
                    </div>

                    <select
                      value={publicBatchUnitCode}
                      onChange={(event) => setPublicBatchUnitCode(event.target.value)}
                      className="form-input mt-5"
                    >
                      <option value="">全部{publicBatchUnitType === 'district' ? '学区' : '直属学校'}</option>
                      {publicBatchOptions.map((unit) => (
                        <option key={unit.code} value={unit.code}>
                          {unit.name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={publicSchoolFilter}
                      onChange={(event) => setPublicSchoolFilter(event.target.value)}
                      className="form-input mt-4"
                      placeholder="按学校名称进一步筛选"
                    />

                    <button onClick={() => void handlePublicBatchDownload()} className="btn-primary mt-5 w-full justify-center">
                      <Users className="h-4 w-4" />
                      下载当前筛选准考证
                    </button>
                  </div>

                  <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">Preview</p>
                        <h3 className="mt-2 text-xl font-semibold text-ink">批量下载预览</h3>
                      </div>
                      {isLoadingPublicBatch && <Loader className="h-5 w-5 animate-spin text-primary-700" />}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                        <div className="text-sm text-secondary-600">已加载记录</div>
                        <div className="mt-2 text-3xl font-semibold text-ink">{allRegistrations.length}</div>
                      </div>
                      <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                        <div className="text-sm text-secondary-600">当前筛选</div>
                        <div className="mt-2 text-3xl font-semibold text-ink">{filteredPublicBatchRegistrations.length}</div>
                      </div>
                      <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                        <div className="text-sm text-secondary-600">下载方式</div>
                        <div className="mt-2 text-lg font-semibold text-ink">{publicBatchUnitType === 'district' ? '学区' : '直属学校'}</div>
                      </div>
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
                          {filteredPublicBatchRegistrations.slice(0, 10).map((registration) => (
                            <tr key={registration.ticket_number}>
                              <td className="table-cell">{registration.student_name}</td>
                              <td className="table-cell">{registration.school}</td>
                              <td className="table-cell">{getContestUnitName(registration.district_code)}</td>
                              <td className="table-cell">{registration.ticket_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredPublicBatchRegistrations.length > 10 && (
                      <p className="mt-3 text-sm text-secondary-500">
                        当前仅展示前 10 条，实际将下载全部 {filteredPublicBatchRegistrations.length} 份准考证。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {!adminToken ? (
                  <div className="mx-auto max-w-2xl rounded-[28px] border border-white/60 bg-white/78 p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6 text-primary-700" />
                      <div>
                        <h3 className="text-2xl font-semibold text-ink">管理员登录</h3>
                        <p className="mt-1 text-sm leading-7 text-secondary-600">
                          仅限授权管理人员使用。
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="form-label">管理员账号</label>
                        <input
                          className="form-input"
                          value={adminAccount}
                          onChange={(event) => setAdminAccount(event.target.value)}
                          placeholder="请输入管理员账号"
                        />
                      </div>
                      <div>
                        <label className="form-label">密码</label>
                        <input
                          type="password"
                          className="form-input"
                          value={adminPassword}
                          onChange={(event) => setAdminPassword(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && void handleAdminLogin()}
                          placeholder="请输入管理员密码"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button onClick={() => void handleAdminLogin()} disabled={isAdminLoading} className="btn-primary">
                        {isAdminLoading ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        进入管理员中心
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                      <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-ink">
                            <ShieldCheck className="h-5 w-5 text-primary-700" />
                            <h3 className="text-xl font-semibold">管理员工具</h3>
                          </div>
                          <button onClick={handleAdminLogout} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary-600">
                            <LogOut className="h-4 w-4" />
                            退出
                          </button>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <button
                            onClick={() => {
                              setAdminUnitType('district')
                              setAdminUnitCode('')
                            }}
                            className={`rounded-[22px] border p-4 text-left ${adminUnitType === 'district' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-ink">
                              <Landmark className="h-4 w-4 text-primary-700" />
                              按学区查看
                            </div>
                            <div className="mt-2 text-sm text-secondary-600">查看各学区进度并导出对应报名数据</div>
                          </button>
                          <button
                            onClick={() => {
                              setAdminUnitType('direct_school')
                              setAdminUnitCode('')
                            }}
                            className={`rounded-[22px] border p-4 text-left ${adminUnitType === 'direct_school' ? 'border-primary-400 bg-primary-50' : 'border-[#ddd4c7] bg-[#fffaf3]'}`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-ink">
                              <Building2 className="h-4 w-4 text-primary-700" />
                              按直属学校查看
                            </div>
                            <div className="mt-2 text-sm text-secondary-600">聚焦直属学校报名与导出需求</div>
                          </button>
                        </div>

                        <select value={adminUnitCode} onChange={(event) => setAdminUnitCode(event.target.value)} className="form-input mt-5">
                          <option value="">全部{adminUnitType === 'district' ? '学区' : '直属学校'}</option>
                          {adminOptions.map((unit) => (
                            <option key={unit.code} value={unit.code}>
                              {unit.name}
                            </option>
                          ))}
                        </select>

                        <input
                          value={adminSchoolFilter}
                          onChange={(event) => setAdminSchoolFilter(event.target.value)}
                          className="form-input mt-4"
                          placeholder="按学校名称进一步筛选"
                        />

                        <div className="mt-5 grid gap-3">
                          <button onClick={() => void handleAdminTicketDownload()} className="btn-primary w-full justify-center">
                            <Users className="h-4 w-4" />
                            下载当前筛选准考证
                          </button>
                          <button
                            onClick={() =>
                              exportAdminExcel(
                                filteredAdminRegistrations,
                                adminUnitCode ? `${getContestUnitName(adminUnitCode)}-报名信息` : '管理员筛选报名信息'
                              )
                            }
                            className="btn-secondary w-full justify-center"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            下载当前筛选 Excel
                          </button>
                          <button onClick={() => exportAdminExcel(adminRegistrations, '全部报名信息')} className="btn-secondary w-full justify-center">
                            <Download className="h-4 w-4" />
                            下载全部报名 Excel
                          </button>
                          <button
                            onClick={() => void handleDeleteSelectedAdminRegistrations()}
                            disabled={isDeletingAdminRows || selectedAdminIds.length === 0}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f0d9d3] bg-[#fff4f1] px-5 py-3 text-sm font-semibold text-[#b4452d] transition hover:bg-[#fde9e3] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingAdminRows ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            删除已选报名（{selectedAdminIds.length}）
                          </button>
                          <button
                            onClick={() => setShowResetPanel((current) => !current)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            {showResetPanel ? '收起清空面板' : '清空全部报名数据'}
                          </button>
                        </div>

                        {showResetPanel && (
                          <div className="mt-5 rounded-[22px] border border-red-200 bg-red-50 p-5">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                              <div className="text-sm leading-7 text-red-900">
                                <p className="font-semibold">危险操作：将永久清空全部报名记录与准考证编号。</p>
                                <p>此操作不可撤销。请先确认所有报名导出工作已经完成。</p>
                                <p>请输入“{ADMIN_RESET_CONFIRM_TEXT}”后，才能执行清空。</p>
                              </div>
                            </div>

                            <input
                              value={resetConfirmText}
                              onChange={(event) => setResetConfirmText(event.target.value)}
                              className="form-input mt-4 bg-white"
                              placeholder={`请输入：${ADMIN_RESET_CONFIRM_TEXT}`}
                            />

                            <button
                              onClick={() => void handleAdminReset()}
                              disabled={isResetting || resetConfirmText.trim() !== ADMIN_RESET_CONFIRM_TEXT}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isResetting ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              确认清空全部报名数据
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">Overview</p>
                            <h3 className="mt-2 text-xl font-semibold text-ink">报名进度总览</h3>
                          </div>
                          {isAdminLoading && <Loader className="h-5 w-5 animate-spin text-primary-700" />}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                            <div className="text-sm text-secondary-600">筛选后学生数</div>
                            <div className="mt-2 text-3xl font-semibold text-ink">{filteredAdminRegistrations.length}</div>
                          </div>
                          <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                            <div className="text-sm text-secondary-600">已有报名单位</div>
                            <div className="mt-2 text-3xl font-semibold text-ink">{adminProgress?.summary.registered_units || 0}</div>
                          </div>
                          <div className="rounded-[20px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                            <div className="text-sm text-secondary-600">已有报名学校</div>
                            <div className="mt-2 text-3xl font-semibold text-ink">{adminProgress?.summary.registered_schools || 0}</div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[22px] border border-[#e5dccd] bg-[#fffaf3] p-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-ink">
                              <BarChart3 className="h-5 w-5 text-primary-700" />
                              <h4 className="text-lg font-semibold">报名数据管理</h4>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-secondary-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-[#d8cfbf] text-primary-800 focus:ring-primary-300"
                                checked={
                                  filteredAdminRegistrations.length > 0 &&
                                  filteredAdminRegistrations.every((item) => selectedAdminIds.includes(item.id))
                                }
                                onChange={toggleSelectAllFilteredAdminRows}
                              />
                              全选当前筛选结果
                            </label>
                          </div>

                          <div className="mt-4 table-container">
                            <table className="table">
                              <thead className="table-head">
                                <tr>
                                  <th className="table-header w-[60px]">选择</th>
                                  <th className="table-header">学生姓名</th>
                                  <th className="table-header">学校</th>
                                  <th className="table-header">归属</th>
                                  <th className="table-header">准考证号</th>
                                  <th className="table-header w-[110px]">操作</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#ece4d7]">
                                {filteredAdminRegistrations.slice(0, 20).map((registration) => (
                                  <tr key={registration.ticket_number}>
                                    <td className="table-cell">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[#d8cfbf] text-primary-800 focus:ring-primary-300"
                                        checked={selectedAdminIds.includes(registration.id)}
                                        onChange={() => toggleAdminSelection(registration.id)}
                                      />
                                    </td>
                                    <td className="table-cell">{registration.student_name}</td>
                                    <td className="table-cell">{registration.school}</td>
                                    <td className="table-cell">{getContestUnitName(registration.district_code)}</td>
                                    <td className="table-cell">{registration.ticket_number}</td>
                                    <td className="table-cell">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => openEditModal(registration, true)}
                                          disabled={isDeletingAdminRows || isSavingEdit}
                                          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 disabled:opacity-50"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          编辑
                                        </button>
                                        <button
                                          onClick={() => void handleDeleteSingleAdminRegistration(registration)}
                                          disabled={isDeletingAdminRows || isSavingEdit}
                                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#b4452d] disabled:opacity-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          删除
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {filteredAdminRegistrations.length > 20 && (
                            <p className="mt-3 text-sm text-secondary-500">
                              当前仅展示前 20 条；勾选“全选当前筛选结果”可对全部 {filteredAdminRegistrations.length} 条筛选数据执行批量删除。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                        <h3 className="text-xl font-semibold text-ink">学区 / 学校名额进度</h3>
                        <div className="mt-5 table-container">
                          <table className="table">
                            <thead className="table-head">
                              <tr>
                                <th className="table-header">归属</th>
                                <th className="table-header">已报</th>
                                <th className="table-header">剩余</th>
                                <th className="table-header">学校数</th>
                                <th className="table-header">名额设置</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ece4d7]">
                              {filteredUnitProgress.map((item) => (
                                <tr key={item.code}>
                                  <td className="table-cell">
                                    <div className="font-semibold text-ink">{item.name}</div>
                                    <div className="text-xs text-secondary-500">总名额 {item.quota}</div>
                                  </td>
                                  <td className="table-cell">{item.registered_count}</td>
                                  <td className="table-cell">{item.remaining_quota}</td>
                                  <td className="table-cell">{item.school_count}</td>
                                  <td className="table-cell">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={0}
                                        max={999}
                                        value={quotaDrafts[item.code] ?? String(item.quota)}
                                        onChange={(event) =>
                                          setQuotaDrafts((current) => ({ ...current, [item.code]: event.target.value }))
                                        }
                                        className="h-10 w-[96px] rounded-[14px] border border-[#d8cfbf] bg-white px-3 text-sm font-semibold text-ink shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                      />
                                      <button
                                        onClick={() => void handleUpdateQuota(item.code)}
                                        disabled={updatingQuotaCode === item.code || isAdminLoading}
                                        className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {updatingQuotaCode === item.code ? (
                                          <Loader className="h-4 w-4 animate-spin" />
                                        ) : (
                                          '更新'
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/60 bg-white/78 p-5">
                        <h3 className="text-xl font-semibold text-ink">学校报名进度</h3>
                        <div className="mt-5 table-container">
                          <table className="table">
                            <thead className="table-head">
                              <tr>
                                <th className="table-header">学校</th>
                                <th className="table-header">归属</th>
                                <th className="table-header">报名人数</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ece4d7]">
                              {filteredSchoolProgress.slice(0, 20).map((item) => (
                                <tr key={`${item.district_code}-${item.school}`}>
                                  <td className="table-cell">{item.school}</td>
                                  <td className="table-cell">{item.district_name}</td>
                                  <td className="table-cell">{item.registered_count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {filteredSchoolProgress.length > 20 && (
                          <p className="mt-3 text-sm text-secondary-500">
                            当前仅展示前 20 所学校，实际导出数据会包含全部 {filteredSchoolProgress.length} 所学校的报名情况。
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-primary-100 bg-primary-50/55 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 text-primary-700" />
            <div className="text-sm leading-8 text-primary-900">
              <p>• 准考证号格式：年份后两位 + 考场号两位 + 座位号两位（例：260101）</p>
              <p>• 管理员中心支持查看学区与学校报名进度，并按筛选条件导出准考证和 Excel。</p>
              <p>• 单条查询适合现场补打，管理员中心适合后期统一汇总下载。</p>
            </div>
          </div>
        </section>
        </div>
      </div>
      {editingRegistration && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
        <div
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          onClick={closeEditModal}
          role="presentation"
        />
        <div className="relative w-full max-w-xl rounded-[28px] border border-white/60 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,40,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-ink">修改报名信息</h3>
              <p className="mt-1 text-sm leading-7 text-secondary-600">
                {isEditingAsAdmin
                  ? '管理员可直接修改报名信息。'
                  : '为确保安全，请先输入带队教师电话校验后再保存修改。'}
              </p>
            </div>
            <button
              onClick={closeEditModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-secondary-500 transition hover:bg-[#f4efe6]"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isEditingAsAdmin && (
            <div className="mt-5">
              <label className="form-label">带队教师电话（校验用）</label>
              <input
                value={editVerifyPhone}
                onChange={(event) => setEditVerifyPhone(event.target.value.trim())}
                placeholder="请输入原带队教师电话"
                className="form-input"
              />
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">学生姓名</label>
              <input
                value={editForm.student_name}
                onChange={(event) => setEditForm((current) => ({ ...current, student_name: event.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">学校</label>
              <input
                value={editForm.school}
                onChange={(event) => setEditForm((current) => ({ ...current, school: event.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">指导教师</label>
              <input
                value={editForm.teacher_name}
                onChange={(event) => setEditForm((current) => ({ ...current, teacher_name: event.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">带队教师</label>
              <input
                value={editForm.leader_name}
                onChange={(event) => setEditForm((current) => ({ ...current, leader_name: event.target.value }))}
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">带队教师电话</label>
              <input
                value={editForm.leader_phone}
                onChange={(event) => setEditForm((current) => ({ ...current, leader_phone: event.target.value.trim() }))}
                className="form-input"
                placeholder="11 位手机号"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={closeEditModal} className="btn-secondary">
              取消
            </button>
            <button onClick={() => void handleSaveEdit()} disabled={isSavingEdit} className="btn-primary">
              {isSavingEdit ? <Loader className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              保存修改
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  )
}

export default DownloadPage
