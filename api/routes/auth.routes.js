import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import database from '../config/database.js';

const router = express.Router();

// 输入验证中间件
const validateAuth = (method) => {
  switch (method) {
    case 'register':
      return [
        body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
        body('password')
          .isLength({ min: 8 })
          .withMessage('密码至少需要8个字符')
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
          .withMessage('密码必须包含大小写字母和数字'),
        body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
        body('full_name').notEmpty().trim().withMessage('请输入姓名'),
        body('confirmPassword').custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('两次输入的密码不一致');
          }
          return true;
        }),
      ];
    case 'login':
      return [
        body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
        body('password').notEmpty().withMessage('请输入密码'),
      ];
    default:
      return [];
  }
};

// 注册端点
router.post('/register', validateAuth('register'), async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      email,
      password,
      phone,
      full_name,
      school,
      grade,
      student_id,
    } = req.body;

    // 创建用户
    const user = await User.create({
      email,
      password,
      phone,
      full_name,
      school,
      grade,
      student_id,
    });

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 生成refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 不返回敏感信息
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      school: user.school,
      grade: user.grade,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
    };

    res.status(201).json({
      success: true,
      message: '注册成功！请查收邮箱验证邮件。',
      data: {
        user: userResponse,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    
    // 用户友好的错误消息
    let message = error.message;
    let statusCode = 400;

    if (error.message.includes('邮箱已被注册')) {
      message = '该邮箱地址已被注册';
    } else if (error.message.includes('手机号已被注册')) {
      message = '该手机号已被注册';
    } else if (error.code === '23505') {
      message = '邮箱或手机号已被注册';
    } else {
      statusCode = 500;
      message = process.env.NODE_ENV === 'development' 
        ? error.message 
        : '注册失败，请稍后重试';
    }

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
});

// 登录端点
router.post('/login', validateAuth('login'), async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // 验证用户凭证
    const user = await User.verifyCredentials(email, password);

    // 检查邮箱是否已验证
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: '邮箱未验证，请先验证邮箱',
        requiresVerification: true,
      });
    }

    // 更新最后登录时间
    await User.updateLastLogin(user.id);

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 生成refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 不返回敏感信息
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      school: user.school,
      grade: user.grade,
      role: user.role,
      email_verified: user.email_verified,
      last_login: user.last_login,
      created_at: user.created_at,
    };

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userResponse,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    
    const message = error.message === '用户不存在' || error.message === '密码错误'
      ? '邮箱或密码错误'
      : '登录失败，请稍后重试';

    res.status(401).json({
      success: false,
      message,
    });
  }
});

// 验证邮箱端点
router.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '验证令牌不能为空',
      });
    }

    const user = await User.verifyEmail(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期',
      });
    }

    res.json({
      success: true,
      message: '邮箱验证成功！',
      data: {
        user: {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified,
        },
      },
    });
  } catch (error) {
    console.error('邮箱验证错误:', error);
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试',
    });
  }
});

// 刷新token端点
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '刷新令牌不能为空',
      });
    }

    // 验证refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '刷新令牌无效或已过期',
      });
    }

    // 获取用户信息
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 生成新的access token
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 生成新的refresh token
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '刷新失败，请重新登录',
    });
  }
});

// 请求密码重置端点
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // 请求密码重置
    const user = await User.requestPasswordReset(email);

    // 在实际应用中，这里应该发送密码重置邮件
    // 这里我们只返回重置令牌（在生产环境中应该只通过邮件发送）
    res.json({
      success: true,
      message: '密码重置请求已提交，请查收邮件',
      data: {
        // 注意：在生产环境中不应返回resetToken
        resetToken: process.env.NODE_ENV === 'development' ? user.reset_token : undefined,
      },
    });
  } catch (error) {
    console.error('请求密码重置错误:', error);
    
    // 即使邮箱不存在，我们也返回成功响应（防止邮箱枚举）
    res.json({
      success: true,
      message: '如果该邮箱已注册，您将收到重置密码的邮件',
    });
  }
});

// 重置密码端点
router.post('/reset-password', [
  body('token').notEmpty().withMessage('重置令牌不能为空'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码至少需要8个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('两次输入的密码不一致');
    }
    return true;
  }),
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { token, password } = req.body;

    // 重置密码
    const user = await User.resetPassword(token, password);

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || '密码重置失败',
    });
  }
});

// 用户信息端点（需要认证）
router.get('/profile', async (req, res) => {
  try {
    // 在实际应用中，这里应该验证JWT token
    // 这里我们假设用户ID通过token获取
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 不返回敏感信息
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      school: user.school,
      grade: user.grade,
      student_id: user.student_id,
      gender: user.gender,
      birth_date: user.birth_date,
      address: user.address,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: user.email_verified,
      last_login: user.last_login,
      login_count: user.login_count,
      created_at: user.created_at,
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

// 健康检查端点
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '认证服务运行正常',
    timestamp: new Date().toISOString(),
  });
});

export default router;