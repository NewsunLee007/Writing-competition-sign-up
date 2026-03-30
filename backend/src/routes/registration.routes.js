import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeRole, validateUpload } from '../middlewares/auth.js';
import Registration from '../models/Registration.js';

const router = express.Router();

// ES 模块的 __dirname 替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置Multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/registrations');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

// 报名验证规则
const validateRegistration = [
  body('contest_year')
    .isInt({ min: 2023, max: 2030 })
    .withMessage('请选择有效的比赛年份'),
  
  body('contest_term')
    .isIn(['春季赛', '秋季赛', '冬季赛'])
    .withMessage('请选择有效的比赛学期'),
  
  body('contest_category')
    .isIn(['小学组', '初中组', '高中组'])
    .withMessage('请选择有效的组别'),
  
  body('contest_level')
    .optional()
    .isIn(['A组', 'B组', 'C组', '国际组'])
    .withMessage('请选择有效的级别'),
  
  body('student_full_name')
    .trim()
    .notEmpty()
    .withMessage('请输入学生姓名')
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度为2-50个字符'),
  
  body('student_birth_date')
    .isISO8601()
    .withMessage('请输入有效的出生日期')
    .custom(value => {
      const birthDate = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - birthDate.getFullYear();
      return age >= 6 && age <= 25;
    })
    .withMessage('年龄必须在6-25岁之间'),
  
  body('student_gender')
    .isIn(['男', '女'])
    .withMessage('请选择性别'),
  
  body('student_id_number')
    .optional()
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('请输入有效的身份证号码'),
  
  body('student_school')
    .trim()
    .notEmpty()
    .withMessage('请输入学校名称')
    .isLength({ min: 2, max: 100 })
    .withMessage('学校名称长度为2-100个字符'),
  
  body('student_grade')
    .trim()
    .notEmpty()
    .withMessage('请输入年级')
    .isIn(['四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '十年级', '十一年级', '十二年级'])
    .withMessage('请选择有效的年级'),
  
  body('student_phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的手机号'),
  
  body('student_email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  
  body('emergency_contact')
    .trim()
    .notEmpty()
    .withMessage('请输入紧急联系人姓名')
    .isLength({ min: 2, max: 50 })
    .withMessage('联系人姓名长度为2-50个字符'),
  
  body('emergency_phone')
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的紧急联系人手机号'),
  
  body('guardian_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('监护人姓名长度不能超过50个字符'),
  
  body('guardian_relation')
    .optional()
    .isIn(['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'])
    .withMessage('请选择有效的监护人关系'),
];

// 创建报名（需要认证）
router.post('/', authenticateToken, validateRegistration, async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;

    // 创建报名
    const registration = await Registration.create({
      user_id: userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: '报名信息提交成功，请等待审核',
      data: {
        registration: {
          id: registration.id,
          exam_number: registration.exam_number,
          status: registration.status,
          contest_year: registration.contest_year,
          contest_category: registration.contest_category,
          submitted_at: registration.submitted_at,
        },
      },
    });
  } catch (error) {
    console.error('创建报名错误:', error);
    
    let message = error.message;
    let statusCode = 400;

    if (error.message === '您已经报名本届比赛') {
      message = '您已报名本届比赛，不能重复报名';
    } else {
      statusCode = 500;
      message = '报名失败，请稍后重试';
    }

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
});

// 获取用户的报名列表（需要认证）
router.get('/my-registrations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const registrations = await Registration.findByUserId(userId);

    res.json({
      success: true,
      data: {
        registrations: registrations.map(reg => ({
          id: reg.id,
          exam_number: reg.exam_number,
          contest_year: reg.contest_year,
          contest_term: reg.contest_term,
          contest_category: reg.contest_category,
          student_full_name: reg.student_full_name,
          student_school: reg.student_school,
          student_grade: reg.student_grade,
          status: reg.status,
          score: reg.score,
          ranking: reg.ranking,
          award_level: reg.award_level,
          submitted_at: reg.submitted_at,
          created_at: reg.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('获取报名列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报名列表失败',
    });
  }
});

// 获取单个报名详情（需要认证）
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名信息不存在',
      });
    }

    // 检查权限：只有报名者本人或管理员可以查看
    if (registration.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此报名信息',
      });
    }

    // 构建响应数据（根据角色决定返回的信息量）
    const registrationData = {
      id: registration.id,
      exam_number: registration.exam_number,
      contest_year: registration.contest_year,
      contest_term: registration.contest_term,
      contest_category: registration.contest_category,
      contest_level: registration.contest_level,
      
      // 学生信息
      student_full_name: registration.student_full_name,
      student_birth_date: registration.student_birth_date,
      student_gender: registration.student_gender,
      student_id_number: registration.student_id_number,
      student_school: registration.student_school,
      student_grade: registration.student_grade,
      student_class: registration.student_class,
      student_phone: registration.student_phone,
      student_email: registration.student_email,
      
      // 紧急联系人
      emergency_contact: registration.emergency_contact,
      emergency_phone: registration.emergency_phone,
      
      // 监护人信息
      guardian_name: registration.guardian_name,
      guardian_relation: registration.guardian_relation,
      guardian_phone: registration.guardian_phone,
      guardian_email: registration.guardian_email,
      
      // 文件链接（管理员可看到所有，学生只能看到自己的）
      id_card_front_url: registration.user_id === userId || registration.user_email === req.user.email || ['admin', 'super_admin'].includes(req.user.role) 
        ? registration.id_card_front_url 
        : null,
      id_card_back_url: registration.user_id === userId || registration.user_email === req.user.email || ['admin', 'super_admin'].includes(req.user.role) 
        ? registration.id_card_back_url 
        : null,
      student_card_url: registration.user_id === userId || registration.user_email === req.user.email || ['admin', 'super_admin'].includes(req.user.role) 
        ? registration.student_card_url 
        : null,
      photo_url: registration.user_id === userId || registration.user_email === req.user.email || ['admin', 'super_admin'].includes(req.user.role) 
        ? registration.photo_url 
        : null,
      
      // 状态和进度
      status: registration.status,
      review_notes: ['admin', 'super_admin'].includes(req.user.role) ? registration.review_notes : null,
      
      // 支付信息（仅限管理员）
      payment_status: ['admin', 'super_admin'].includes(req.user.role) ? registration.payment_status : null,
      payment_method: ['admin', 'super_admin'].includes(req.user.role) ? registration.payment_method : null,
      
      // 考试信息
      exam_date: registration.exam_date,
      exam_time: registration.exam_time,
      exam_location: registration.exam_location,
      exam_room: registration.exam_room,
      exam_seat: registration.exam_seat,
      
      // 成绩信息
      score: registration.score,
      ranking: registration.ranking,
      award_level: registration.award_level,
      certificate_number: registration.certificate_number,
      certificate_url: registration.certificate_url,
      
      // 提交信息
      submitted_at: registration.submitted_at,
      created_at: registration.created_at,
      updated_at: registration.updated_at,
    };

    res.json({
      success: true,
      data: { registration: registrationData },
    });
  } catch (error) {
    console.error('获取报名详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报名详情失败',
    });
  }
});

// 更新报名信息（需要认证，只能更新草稿状态）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 只能更新自己的报名，且只能更新特定字段
    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名信息不存在',
      });
    }

    if (registration.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改此报名信息',
      });
    }

    // 只能修改草稿状态的报名
    if (registration.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态的报名才能修改',
      });
    }

    // 可更新的字段
    const allowedUpdates = [
      'contest_category', 'contest_level', 'student_class', 'student_phone',
      'student_email', 'emergency_contact', 'emergency_phone', 'guardian_name',
      'guardian_relation', 'guardian_phone', 'guardian_email',
      'status', // 只能从草案改为已提交
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // 如果更新状态，只能从draft改为submitted
    if (updates.status && updates.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: '只能提交报名，不能修改状态为其他值',
      });
    }

    const updatedRegistration = await Registration.update(id, updates, userId);

    res.json({
      success: true,
      message: updates.status === 'submitted' ? '报名信息提交成功' : '报名信息更新成功',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error) {
    console.error('更新报名错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新报名失败',
    });
  }
});

// 上传报名材料（需要认证）
router.post('/:id/upload', 
  authenticateToken,
  upload.fields([
    { name: 'id_card_front', maxCount: 1 },
    { name: 'id_card_back', maxCount: 1 },
    { name: 'student_card', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
  ]),
  validateUpload(10 * 1024 * 1024, ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // 检查权限
      const registration = await Registration.findById(id);
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: '报名信息不存在',
        });
      }

      if (registration.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权上传此报名的材料',
        });
      }

      // 准备更新数据
      const updates = {};

      // 处理上传的文件
      if (req.files) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
        
        if (req.files['id_card_front']) {
          const file = req.files['id_card_front'][0];
          updates.id_card_front_url = `${baseUrl}/uploads/registrations/${file.filename}`;
        }
        
        if (req.files['id_card_back']) {
          const file = req.files['id_card_back'][0];
          updates.id_card_back_url = `${baseUrl}/uploads/registrations/${file.filename}`;
        }
        
        if (req.files['student_card']) {
          const file = req.files['student_card'][0];
          updates.student_card_url = `${baseUrl}/uploads/registrations/${file.filename}`;
        }
        
        if (req.files['photo']) {
          const file = req.files['photo'][0];
          updates.photo_url = `${baseUrl}/uploads/registrations/${file.filename}`;
        }
      }

      // 更新报名信息
      const updatedRegistration = await Registration.update(id, updates, userId);

      res.json({
        success: true,
        message: '文件上传成功',
        data: {
          registration: {
            id: updatedRegistration.id,
            uploads: {
              id_card_front_url: updatedRegistration.id_card_front_url,
              id_card_back_url: updatedRegistration.id_card_back_url,
              student_card_url: updatedRegistration.student_card_url,
              photo_url: updatedRegistration.photo_url,
            },
          },
        },
      });
    } catch (error) {
      console.error('上传文件错误:', error);
      res.status(500).json({
        success: false,
        message: '文件上传失败',
      });
    }
  }
);

// 获取准考证数据（需要认证）
router.get('/:id/exam-card', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查权限
    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名信息不存在',
      });
    }

    if (registration.user_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权获取准考证信息',
      });
    }

    // 检查报名状态
    if (registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: '报名尚未审核通过，无法获取准考证',
      });
    }

    // 获取准考证数据
    const examCardData = await Registration.getExamCardData(userId, id);
    
    if (!examCardData) {
      return res.status(404).json({
        success: false,
        message: '未找到准考证信息',
      });
    }

    res.json({
      success: true,
      data: {
        exam_card: examCardData,
      },
    });
  } catch (error) {
    console.error('获取准考证错误:', error);
    res.status(500).json({
      success: false,
      message: '获取准考证失败',
    });
  }
});

// 删除报名（只能删除草稿状态）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedRegistration = await Registration.delete(id, userId);

    res.json({
      success: true,
      message: '报名信息已删除',
      data: {
        deleted_at: deletedRegistration.deleted_at,
      },
    });
  } catch (error) {
    console.error('删除报名错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '删除报名失败',
    });
  }
});

// 管理员接口 - 搜索报名（需要管理员权限）
router.get('/search/admin', authenticateToken, authorizeRole('admin', 'super_admin'), async (req, res) => {
  try {
    const searchParams = req.query;
    
    // 设置默认分页
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 20;
    const sortBy = searchParams.sortBy || 'created_at';
    const sortOrder = searchParams.sortOrder || 'DESC';

    const result = await Registration.search({
      ...searchParams,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('管理员搜索报名错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索报名失败',
    });
  }
});

// 管理员接口 - 更新报名状态（需要管理员权限）
router.patch('/:id/status', authenticateToken, authorizeRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '请提供状态',
      });
    }

    const updatedRegistration = await Registration.updateStatus(
      id, 
      status, 
      review_notes, 
      req.user.id
    );

    res.json({
      success: true,
      message: `报名状态已更新为${status === 'approved' ? '审核通过' : 
        status === 'rejected' ? '审核未通过' : '审核中'}`,
      data: {
        registration: {
          id: updatedRegistration.id,
          status: updatedRegistration.status,
          exam_number: updatedRegistration.exam_number,
          review_notes: updatedRegistration.review_notes,
          reviewed_at: updatedRegistration.reviewed_at,
          reviewer_id: updatedRegistration.reviewer_id,
        },
      },
    });
  } catch (error) {
    console.error('更新报名状态错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新报名状态失败',
    });
  }
});

// 管理员接口 - 更新考试信息（需要管理员权限）
router.patch('/:id/exam-info', authenticateToken, authorizeRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRegistration = await Registration.updateExamInfo(id, req.body);

    res.json({
      success: true,
      message: '考试信息更新成功',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error) {
    console.error('更新考试信息错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新考试信息失败',
    });
  }
});

// 管理员接口 - 录入成绩（需要管理员权限）
router.patch('/:id/score', authenticateToken, authorizeRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { score, ranking, award_level } = req.body;

    if (score === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供成绩',
      });
    }

    const updatedRegistration = await Registration.updateScore(id, score, ranking, award_level);

    res.json({
      success: true,
      message: '成绩录入成功',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error) {
    console.error('录入成绩错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '录入成绩失败',
    });
  }
});

// 查看报名统计（公开接口，但限制频率）
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Registration.getStats(req.query);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取报名统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报名统计失败',
    });
  }
});

export default router;
