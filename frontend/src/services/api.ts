// API基础URL配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// API响应类型
interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errors?: any[]
}

// 学区信息类型
export interface District {
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
  async getDistrictStats(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/contest/districts/stats')
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

  // 删除报名
  async deleteRegistration(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/contest/registrations/${id}`, {
      method: 'DELETE',
    })
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/contest/health')
  }
}

// 导出单例
export const apiService = new ApiService()
