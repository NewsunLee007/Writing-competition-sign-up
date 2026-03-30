import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加用户ID头（如果需要）
    const userId = localStorage.getItem('user_id');
    if (userId) {
      config.headers['X-User-ID'] = userId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API 错误:', error);
    
    // 网络错误
    if (!error.response) {
      return Promise.reject({
        success: false,
        message: '网络错误，请检查网络连接',
        error: 'NETWORK_ERROR',
      });
    }
    
    const { status, data } = error.response;
    
    // 处理特定 HTTP 状态码
    switch (status) {
      case 400:
        // 请求参数错误
        return Promise.reject({
          success: false,
          message: data.message || '请求参数错误',
          errors: data.errors,
          status,
          ...data,
        });
        
      case 401:
        // 未授权
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        // 可以添加重定向到登录页的逻辑
        // window.location.href = '/login';
        return Promise.reject({
          success: false,
          message: '登录已过期，请重新登录',
          status,
          ...data,
        });
        
      case 403:
        // 禁止访问
        return Promise.reject({
          success: false,
          message: '权限不足，无法访问此资源',
          status,
          ...data,
        });
        
      case 404:
        // 资源不存在
        return Promise.reject({
          success: false,
          message: '请求的资源不存在',
          status,
          ...data,
        });
        
      case 429:
        // 请求过多
        return Promise.reject({
          success: false,
          message: '请求过于频繁，请稍后再试',
          retryAfter: data.retryAfter,
          status,
          ...data,
        });
        
      case 500:
        // 服务器错误
        return Promise.reject({
          success: false,
          message: '服务器内部错误，请稍后重试',
          status,
          ...data,
        });
        
      case 502:
      case 503:
      case 504:
        // 网关/服务不可用
        return Promise.reject({
          success: false,
          message: '服务暂时不可用，请稍后重试',
          status,
          ...data,
        });
        
      default:
        // 其他错误
        return Promise.reject({
          success: false,
          message: '请求失败，请稍后重试',
          status,
          ...data,
        });
    }
  }
);

// API 封装函数
export const authApi = {
  // 注册
  register: (userData) => api.post('/auth/register', userData),
  
  // 登录
  login: (credentials) => api.post('/auth/login', credentials),
  
  // 验证邮箱
  verifyEmail: (token) => api.post(`/auth/verify-email/${token}`),
  
  // 刷新token
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  
  // 忘记密码
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  
  // 重置密码
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, password: newPassword }),
  
  // 获取用户资料
  getProfile: () => api.get('/auth/profile'),
  
  // 更新用户资料
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const registrationApi = {
  // 创建报名
  create: (data) => api.post('/registration', data),
  
  // 获取我的报名列表
  getMyRegistrations: () => api.get('/registration/my-registrations'),
  
  // 获取报名详情
  getById: (id) => api.get(`/registration/${id}`),
  
  // 更新报名
  update: (id, data) => api.put(`/registration/${id}`, data),
  
  // 上传文件
  uploadFiles: (id, formData) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/registration/${id}/upload`,
      formData,
      config
    );
  },
  
  // 获取准考证
  getExamCard: (id) => api.get(`/registration/${id}/exam-card`),
  
  // 删除报名
  delete: (id) => api.delete(`/registration/${id}`),
  
  // 获取统计
  getStats: (params) => api.get('/registration/stats/overview', { params }),
};

export const downloadApi = {
  // 下载准考证
  downloadAdmissionCard: (registrationId, format = 'pdf') => 
    api.get(`/download/admission-card/${registrationId}?format=${format}`, {
      responseType: 'blob',
    }),
  
  // 下载证书
  downloadCertificate: (registrationId) => 
    api.get(`/download/certificate/${registrationId}`, {
      responseType: 'blob',
    }),
  
  // 下载成绩单
  downloadScoreReport: (registrationId) => 
    api.get(`/download/score-report/${registrationId}`, {
      responseType: 'blob',
    }),
  
  // 获取下载历史
  getDownloadHistory: () => api.get('/download/history'),
};

export const adminApi = {
  // 搜索报名（管理员）
  searchRegistrations: (params) => api.get('/registration/search/admin', { params }),
  
  // 更新报名状态
  updateStatus: (id, status, reviewNotes) => 
    api.patch(`/registration/${id}/status`, { status, review_notes: reviewNotes }),
  
  // 更新考试信息
  updateExamInfo: (id, data) => api.patch(`/registration/${id}/exam-info`, data),
  
  // 录入成绩
  updateScore: (id, data) => api.patch(`/registration/${id}/score`, data),
  
  // 获取管理员统计
  getAdminStats: () => api.get('/admin/stats'),
  
  // 获取用户列表
  getUsers: (params) => api.get('/admin/users', { params }),
  
  // 导出数据
  exportData: (params) => api.get('/admin/export', { 
    responseType: 'blob',
    params,
  }),
};

// 通用工具函数
export const apiUtils = {
  // 检查是否需要验证邮箱
  requiresVerification: (error) => {
    return error?.requiresVerification === true;
  },
  
  // 检查是否token过期
  isTokenExpired: (error) => {
    return error?.expired === true;
  },
  
  // 获取错误消息
  getErrorMessage: (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    return '请求失败，请稍后重试';
  },
  
  // 获取验证错误
  getValidationErrors: (error) => {
    return error?.errors || [];
  },
  
  // 文件下载助手
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  
  // 防抖请求
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // 重试请求
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  },
};

// 导出默认实例
export default api;