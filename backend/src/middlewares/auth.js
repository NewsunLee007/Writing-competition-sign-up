import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// JWT 认证中间件
export const authenticateToken = async (req, res, next) => {
  try {
    // 从多个可能的位置获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 从cookie中获取token
      const cookieToken = req.cookies?.access_token;
      if (cookieToken) {
        req.token = cookieToken;
      } else {
        return res.status(401).json({
          success: false,
          message: '访问令牌缺失，请重新登录',
        });
      }
    }

    const accessToken = token || req.token;

    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '访问令牌已过期，请刷新令牌或重新登录',
          expired: true,
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '访问令牌无效，请重新登录',
        });
      }
      throw error;
    }

    // 获取用户信息
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或已被删除',
      });
    }

    // 检查邮箱是否已验证（除非是某些特定操作）
    if (!user.email_verified && !req.path.includes('/verify-email')) {
      return res.status(403).json({
        success: false,
        message: '请先验证邮箱地址',
        requiresVerification: true,
      });
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      email_verified: user.email_verified,
    };

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器认证错误',
    });
  }
};

// 基于角色的授权中间件
export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，无法访问此资源',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// 基于权限的授权中间件
export const authorizePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      // 获取用户的完整权限列表
      const user = await User.findById(req.user.id);
      const userPermissions = user.permissions || [];

      // 检查是否拥有所有要求的权限
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: '权限不足，缺少必要权限',
          requiredPermissions,
          userPermissions,
        });
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器权限检查错误',
      });
    }
  };
};

// 限流中间件（与主应用中的限流区别，这里针对特定路由）
export const rateLimitMiddleware = (windowMs, maxRequests) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const windowStart = now - windowMs;
    const userRequests = requests.get(key).filter(time => time > windowStart);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

// 验证请求体中间件
export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errorMessages,
        });
      }

      req.body = value;
      next();
    } catch (error) {
      console.error('请求参数验证错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器验证错误',
      });
    }
  };
};

// 文件上传验证中间件
export const validateUpload = (maxSize, allowedMimeTypes) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    // 检查文件大小
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `文件大小不能超过 ${maxSize / (1024 * 1024)}MB`,
        maxSize: maxSize,
        fileSize: req.file.size,
      });
    }

    // 检查文件类型
    if (allowedMimeTypes && !allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件类型',
        allowedTypes: allowedMimeTypes,
        fileType: req.file.mimetype,
      });
    }

    next();
  };
};

// 安全检查中间件
export const securityCheck = async (req, res, next) => {
  try {
    // 检查可疑的请求头
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
    ];
    
    for (const header of suspiciousHeaders) {
      if (req.headers[header] && !req.headers[header].match(/^[\d.:]+$/)) {
        console.warn(`可疑请求头检测: ${header}=${req.headers[header]}`);
      }
    }

    // 检查SQL注入模式（简单示例）
    const sqlInjectionPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|into|table|database)\b)/i,
      /(\b(exec|execute|sp_executesql)\b)/i,
    ];

    const requestData = {
      ...req.body,
      ...req.query,
      ...req.params,
    };

    const requestString = JSON.stringify(requestData).toLowerCase();
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(requestString)) {
        console.warn('潜在SQL注入攻击:', {
          pattern: pattern.source,
          requestString,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return res.status(403).json({
          success: false,
          message: '请求包含不安全的内容',
        });
      }
    }

    next();
  } catch (error) {
    console.error('安全检查错误:', error);
    // 安全检查出错时不阻止请求，但记录日志
    next();
  }
};

// CORS中间件（更严格）
export const strictCors = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        message: '跨域请求被拒绝',
      });
    }

    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24小时

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
};

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip, user } = req;
  const userAgent = req.get('User-Agent');

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const contentLength = res.get('Content-Length');

    const logData = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      status,
      duration: `${duration}ms`,
      ip,
      userAgent,
      user: user?.id || 'anonymous',
      contentLength,
    };

    // 根据状态码决定日志级别
    if (status >= 400) {
      console.warn('HTTP请求错误:', logData);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('HTTP请求:', logData);
    }
  });

  next();
};

export default {
  authenticateToken,
  authorizeRole,
  authorizePermission,
  rateLimitMiddleware,
  validateBody,
  validateUpload,
  securityCheck,
  strictCors,
  requestLogger,
};
