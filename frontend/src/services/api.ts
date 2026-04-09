// API基础URL配置
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api')

// API响应类型
interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errors?: unknown[]
}

// 学区信息类型
export interface District {
  code: string
  name: string
  quota: number
  registered_count?: number
  remaining_quota?: number
}

export interface AdminQuotaUpdateResponse {
  code: string
  name: string
  quota: number
}

// 报名信息类型
export interface Registration {
  id: number
  ticket_number: string
  district_code: string
  district_name?: string
  student_name: string
  school: string
  teacher_name?: string
  leader_name: string
  leader_phone: string
  registration_time: string
  client_ip?: string
}

export interface AdminLoginResponse {
  token: string
  account: string
  full_name: string
}

export interface AdminUnitProgress {
  code: string
  name: string
  quota: number
  registered_count: number
  remaining_quota: number
  school_count: number
}

export interface AdminSchoolProgress {
  district_code: string
  district_name: string
  school: string
  registered_count: number
}

export interface AdminProgress {
  summary: {
    total_registrations: number
    registered_units: number
    registered_schools: number
  }
  units: AdminUnitProgress[]
  schools: AdminSchoolProgress[]
}

export interface AdminResetResponse {
  cleared: number
}

export interface ClientContext {
  client_ip: string
}

export interface AdminDeleteResponse {
  deleted: number
}

export type RegistrationUpdatePayload = {
  student_name?: string
  school?: string
  teacher_name?: string
  leader_name?: string
  leader_phone?: string
}

// 批量报名请求类型
export interface BatchRegistrationRequest {
  students: Array<{
    district_code: string
    student_name: string
    school: string
    teacher_name?: string
    leader_name: string
    leader_phone: string
  }>
}

// 批量报名响应类型
export interface BatchRegistrationResponse {
  total: number
  success: number
  failed: number
  results: Array<{
    success: boolean
    client_id?: string
    student_name: string
    ticket_number?: string
    reason?: string
  }>
}

// 搜索参数类型
export interface SearchParams {
  ticket_number?: string
  student_name?: string
  school?: string
}

export type DistrictStatRow = Record<string, unknown>

// API服务类
class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || '请求失败',
        }
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络错误',
      }
    }
  }

  // 获取所有学区信息
  async getDistricts(): Promise<ApiResponse<District[]>> {
    return this.request<District[]>('/contest/districts')
  }

  // 获取学区报名统计
  async getDistrictStats(): Promise<ApiResponse<DistrictStatRow[]>> {
    return this.request<DistrictStatRow[]>('/contest/districts/stats')
  }

  // 批量报名
  async batchRegister(
    students: BatchRegistrationRequest['students']
  ): Promise<ApiResponse<BatchRegistrationResponse>> {
    return this.request<BatchRegistrationResponse>('/contest/registrations/batch', {
      method: 'POST',
      body: JSON.stringify({ students }),
    })
  }

  // 搜索报名信息
  async searchRegistrations(
    params: SearchParams
  ): Promise<ApiResponse<Registration[]>> {
    const queryParams = new URLSearchParams()
    
    if (params.ticket_number) {
      queryParams.append('ticket_number', params.ticket_number)
    }
    if (params.student_name) {
      queryParams.append('student_name', params.student_name)
    }
    if (params.school) {
      queryParams.append('school', params.school)
    }

    const queryString = queryParams.toString()
    const endpoint = `/contest/registrations/search${queryString ? `?${queryString}` : ''}`

    return this.request<Registration[]>(endpoint)
  }

  // 获取所有报名信息
  async getAllRegistrations(): Promise<ApiResponse<Registration[]>> {
    return this.request<Registration[]>('/contest/registrations')
  }

  async adminLogin(account: string, password: string): Promise<ApiResponse<AdminLoginResponse>> {
    return this.request<AdminLoginResponse>('/contest/admin/login', {
      method: 'POST',
      body: JSON.stringify({ account, password }),
    })
  }

  async getAdminProgress(token: string): Promise<ApiResponse<AdminProgress>> {
    return this.request<AdminProgress>('/contest/admin/progress', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async adminUpdateDistrictQuota(
    token: string,
    code: string,
    quota: number
  ): Promise<ApiResponse<AdminQuotaUpdateResponse>> {
    return this.request<AdminQuotaUpdateResponse>(`/contest/admin/districts/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quota }),
    })
  }

  async getAdminRegistrations(
    token: string,
    params?: { district_code?: string; school?: string }
  ): Promise<ApiResponse<Registration[]>> {
    const queryParams = new URLSearchParams()
    if (params?.district_code) queryParams.append('district_code', params.district_code)
    if (params?.school) queryParams.append('school', params.school)
    const query = queryParams.toString()

    return this.request<Registration[]>(`/contest/admin/registrations${query ? `?${query}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async resetAdminRegistrations(
    token: string,
    confirmText: string
  ): Promise<ApiResponse<AdminResetResponse>> {
    return this.request<AdminResetResponse>('/contest/admin/registrations/reset', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirm_text: confirmText }),
    })
  }

  async deleteAdminRegistration(token: string, id: number): Promise<ApiResponse<AdminDeleteResponse>> {
    return this.request<AdminDeleteResponse>(`/contest/admin/registrations/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async deleteAdminRegistrations(
    token: string,
    ids: number[],
    confirmText: string
  ): Promise<ApiResponse<AdminDeleteResponse>> {
    return this.request<AdminDeleteResponse>('/contest/admin/registrations/delete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ids,
        confirm_text: confirmText,
      }),
    })
  }

  async updateRegistrationByTicket(
    ticketNumber: string,
    currentLeaderPhone: string,
    payload: RegistrationUpdatePayload
  ): Promise<ApiResponse<Registration>> {
    return this.request<Registration>('/contest/registrations/update', {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        current_leader_phone: currentLeaderPhone,
        ...payload,
      }),
    })
  }

  async adminUpdateRegistration(
    token: string,
    id: number,
    payload: RegistrationUpdatePayload
  ): Promise<ApiResponse<Registration>> {
    return this.request<Registration>(`/contest/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
  }

  async getRecentRegistrations(params: { district_code?: string; school?: string }): Promise<ApiResponse<Registration[]>> {
    const queryParams = new URLSearchParams()
    if (params.district_code) queryParams.append('district_code', params.district_code)
    if (params.school) queryParams.append('school', params.school)
    return this.request<Registration[]>(`/contest/registrations/recent?${queryParams.toString()}`)
  }

  async getClientContext(): Promise<ApiResponse<ClientContext>> {
    return this.request<ClientContext>('/contest/visitor/context')
  }

  // 查询考场信息
  async queryExamRoom(params: { ticket_number?: string; student_name?: string; school?: string; district_code?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams()
    if (params.ticket_number) queryParams.append('ticket_number', params.ticket_number)
    if (params.student_name) queryParams.append('student_name', params.student_name)
    if (params.school) queryParams.append('school', params.school)
    if (params.district_code) queryParams.append('district_code', params.district_code)
    return this.request<any>(`/contest/registrations/exam-room?${queryParams.toString()}`)
  }

  // 删除报名
  async deleteRegistration(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/contest/registrations/${id}`, {
      method: 'DELETE',
    })
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>('/contest/health')
  }
}

// 导出单例
export const apiService = new ApiService()
