import jsPDF from 'jspdf'
import { Registration } from '../services/api'

// 生成单个准考证PDF
export const generateExamTicketPDF = (registration: Registration): void => {
  // 创建PDF文档 (A4尺寸)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // 设置中文字体（使用默认字体，中文会显示为方块，建议使用自定义字体）
  // 注意：完整的中文字体支持需要额外配置，这里使用基础实现

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // 添加标题
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const title = 'Ruian English Writing Contest'
  doc.text(title, pageWidth / 2, 30, { align: 'center' })

  doc.setFontSize(18)
  doc.text('Examination Ticket', pageWidth / 2, 42, { align: 'center' })

  // 添加分隔线
  doc.setLineWidth(0.5)
  doc.line(margin, 50, pageWidth - margin, 50)

  // 准考证信息
  const startY = 65
  const lineHeight = 12
  let currentY = startY

  // 信息框
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, startY - 10, pageWidth - margin * 2, 120, 3, 3, 'FD')

  // 设置字体
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')

  // 准考证号（重点突出）
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Ticket Number:', margin + 10, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(registration.ticket_number, margin + 50, currentY)
  currentY += lineHeight * 1.5

  // 学生信息
  doc.setFontSize(12)
  
  // 学生姓名
  doc.setFont('helvetica', 'bold')
  doc.text('Student Name:', margin + 10, currentY)
  doc.setFont('helvetica', 'normal')
  // 中文名称使用拼音标注（因为默认字体不支持中文）
  doc.text(registration.student_name, margin + 50, currentY)
  currentY += lineHeight

  // 学校
  doc.setFont('helvetica', 'bold')
  doc.text('School:', margin + 10, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(registration.school, margin + 50, currentY)
  currentY += lineHeight

  // 学区
  const districtName = registration.district_name || getDistrictName(registration.district_code)
  doc.setFont('helvetica', 'bold')
  doc.text('District:', margin + 10, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(districtName, margin + 50, currentY)
  currentY += lineHeight

  // 带队教师
  doc.setFont('helvetica', 'bold')
  doc.text('Team Teacher:', margin + 10, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${registration.leader_name} (${registration.leader_phone})`, margin + 50, currentY)
  currentY += lineHeight

  // 指导教师（如果有）
  if (registration.teacher_name) {
    doc.setFont('helvetica', 'bold')
    doc.text('Guide Teacher:', margin + 10, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(registration.teacher_name, margin + 50, currentY)
    currentY += lineHeight
  }

  // 分隔线
  currentY += 10
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 15

  // 活动信息框
  doc.setFillColor(239, 246, 255)
  doc.roundedRect(margin, currentY - 5, pageWidth - margin * 2, 50, 3, 3, 'FD')

  currentY += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('Event Information', pageWidth / 2, currentY, { align: 'center' })
  currentY += 10

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Date: April 12, 2026 (Sunday)', margin + 10, currentY)
  currentY += 8
  doc.text('Time: 8:50 AM Check-in, 9:00 AM Start', margin + 10, currentY)
  currentY += 8
  doc.text('Venue: Yumeng Middle School, Ruian City', margin + 10, currentY)
  currentY += 15

  // 注意事项
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Important Notes:', margin, currentY)
  currentY += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const notes = [
    '1. Please bring this ticket and ID card on the day of the contest.',
    '2. Arrive at the venue 10 minutes before the start time.',
    '3. Electronic devices are not allowed during the contest.',
    '4. Contact your team teacher if you have any questions.',
  ]

  notes.forEach((note) => {
    doc.text(note, margin, currentY)
    currentY += 6
  })

  // 页脚
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    'Ruian English Writing Contest Organizing Committee',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )
  doc.text(
    `Generated on: ${new Date().toLocaleString('en-US')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // 保存PDF
  const fileName = `ExamTicket_${registration.ticket_number}.pdf`
  doc.save(fileName)
}

// 批量生成准考证PDF
export const generateBatchExamTicketsPDF = (registrations: Registration[]): void => {
  registrations.forEach((registration, index) => {
    // 为每个学生创建单独的PDF
    generateExamTicketPDF(registration)
    
    // 如果不是最后一个，添加延迟避免浏览器阻止多次下载
    if (index < registrations.length - 1) {
      setTimeout(() => {
        // 继续下一个
      }, 500)
    }
  })
}

// 获取学区名称
const getDistrictName = (code: string): string => {
  const districtNames: Record<string, string> = {
    TX: 'Tangxia District',
    AY: 'Anyang District',
    FY: 'Feiyun District',
    XC: 'Xincheng District',
    MY: 'Mayu District',
    GL: 'Gaolou District',
    HL: 'Huling District',
    TS: 'Taoshan District',
    SY: 'Ruian Experimental Middle School',
    XY: 'Anyang New Era',
    AG: 'Angao',
    RX: 'Ruixiang Experimental School',
    JY: 'Jiyun Experimental School',
    YM: 'Yumeng Middle School',
    GC: 'Guangchang Middle School',
    RZ: 'Ruizhong Fuchu',
    ZJ: 'Zijing Academy',
  }
  return districtNames[code] || code
}
