import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Registration } from '../services/api'
import { getContestUnitName } from '../data/contestOptions'

const PAGE_MARGIN = 10
const PAGE_GAP = 8
const BATCH_SLOT_WIDTH = 190
const BATCH_SLOT_HEIGHT = (297 - PAGE_MARGIN * 2 - PAGE_GAP) / 2
const SINGLE_SLOT_WIDTH = 190
const SINGLE_SLOT_HEIGHT = 277
const SINGLE_IMAGE_QUALITY = 0.9
const BATCH_IMAGE_QUALITY = 0.82

const waitForImages = async (container: HTMLElement) => {
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  )
}

const formatTimestamp = () => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return formatter.format(new Date()).replace(/\//g, '.')
}

const fitRect = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight)
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  }
}

const createTicketCard = (registration: Registration) => {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-99999px'
  wrapper.style.top = '0'
  wrapper.style.width = '1080px'
  wrapper.style.padding = '0'
  wrapper.style.background = '#f2f2f0'
  wrapper.style.fontFamily = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'
  wrapper.style.zIndex = '0'

  const districtName = getContestUnitName(registration.district_code)
  const fields = [
    ['学生姓名', registration.student_name],
    ['学校', registration.school],
    ['报名归属', districtName],
    ['指导教师', registration.teacher_name || '—'],
    ['带队教师', registration.leader_name],
    ['联系电话', registration.leader_phone],
  ]

  wrapper.innerHTML = `
    <div style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 18px rgba(16,32,60,.04);border:1px solid #d4d7dc;">
      <div style="padding:18px 28px 0;">
        <div style="border:1px solid #d7dbe1;border-bottom:none;border-radius:8px 8px 0 0;background:#f7f8fa;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:22px;padding:18px 22px 16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;padding:6px;border:1px solid #d7dbe1;">
                <img src="/contest-logo.png" alt="活动标识" style="width:100%;height:100%;object-fit:contain;" />
              </div>
              <div>
                <div style="font-size:12px;letter-spacing:.14em;color:#4c5b6a;">瑞安市教育发展研究院</div>
                <div style="margin-top:4px;font-size:11px;letter-spacing:.08em;color:#7a8793;">初中学生英语创意写作评审活动</div>
              </div>
            </div>
            <div style="min-width:178px;border-radius:6px;background:#fff;border:1px solid #d7dbe1;padding:12px 16px;text-align:center;">
              <div style="font-size:12px;letter-spacing:.08em;color:#697684;">准考证号</div>
              <div style="margin-top:8px;font-size:28px;font-weight:700;letter-spacing:.12em;color:#1a2633;">${registration.ticket_number}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="padding:0 28px 20px;">
        <div style="border:1px solid #d7dbe1;border-top:none;border-radius:0 0 8px 8px;background:#fff;padding:18px 22px 20px;">
          <div style="text-align:center;padding:4px 0 16px;border-bottom:1px solid #e3e5e8;">
            <div style="font-size:30px;font-weight:700;line-height:1.25;color:#1a2633;">瑞安市第三届初中学生英语创意写作评审活动准考证</div>
            <div style="margin-top:8px;font-size:13px;letter-spacing:.08em;color:#6d7782;">请携带本准考证按规定时间报到入场</div>
          </div>

          <div style="display:grid;grid-template-columns:1.3fr .86fr;gap:16px;align-items:stretch;margin-top:18px;">
            <div style="border:1px solid #dde1e6;background:#fff;padding:18px 18px 16px;">
              <div style="font-size:14px;font-weight:700;letter-spacing:.06em;color:#334155;">考生信息</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px;">
              ${fields
                .map(
                  ([label, value]) => `
                    <div style="min-height:76px;border:1px solid #e4e4e2;background:#fcfcfb;padding:11px 13px;">
                      <div style="font-size:12px;letter-spacing:.02em;color:#6f7782;">${label}</div>
                      <div style="margin-top:8px;font-size:${label === '学校' ? '16px' : '18px'};font-weight:700;color:#1f2937;word-break:break-word;line-height:1.4;">${value}</div>
                    </div>
                  `
                )
                .join('')}
              </div>
            </div>

            <div style="display:grid;grid-template-rows:auto auto;gap:12px;">
              <div style="border:1px solid #dde1e6;background:#f8f9fa;padding:18px 18px 16px;">
                <div style="font-size:14px;font-weight:700;letter-spacing:.06em;color:#334155;">考试安排</div>
                <div style="margin-top:14px;font-size:22px;font-weight:700;line-height:1.35;color:#1a2633;">4 月 12 日（星期日）</div>
                <div style="margin-top:14px;display:grid;gap:10px;font-size:16px;line-height:1.7;color:#374151;">
                  <div><span style="display:inline-block;min-width:62px;font-weight:700;">8:50</span>报到</div>
                  <div><span style="display:inline-block;min-width:62px;font-weight:700;">9:00</span>正式开始</div>
                  <div><span style="display:inline-block;min-width:62px;font-weight:700;">9:40</span>活动结束</div>
                </div>
              </div>

              <div style="border:1px solid #dde1e6;background:#fff;padding:18px 18px 16px;">
                <div style="font-size:14px;font-weight:700;letter-spacing:.06em;color:#334155;">考试地点</div>
                <div style="margin-top:14px;font-size:22px;font-weight:700;color:#1f2937;">瑞安市毓蒙中学</div>
                <div style="margin-top:14px;font-size:14px;line-height:1.85;color:#4b5563;">
                1. 请携带本准考证按时报到。<br/>
                2. 现场作文，服从工作人员安排。<br/>
                3. 如信息有误，请及时联系带队教师。
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:16px;display:grid;grid-template-columns:1fr 170px;gap:14px;align-items:stretch;">
            <div style="border:1px solid #e0e3e8;background:#fafafa;padding:14px 16px;">
              <div style="font-size:13px;font-weight:700;color:#334155;">考生须知</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.8;color:#4a5563;">
                本准考证用于参加瑞安市第三届初中学生英语创意写作评审活动，请学校、学区或直属学校带队教师统一组织到场。
              </div>
            </div>

            <div style="border:1px solid #e0e3e8;background:#fafafa;padding:14px 16px;">
              <div style="font-size:12px;color:#6f7782;">生成时间</div>
              <div style="margin-top:8px;font-size:16px;font-weight:700;color:#1f2937;line-height:1.7;">${formatTimestamp()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(wrapper)
  return wrapper
}

const renderTicketCanvas = async (registration: Registration, scale = 1.8) => {
  const element = createTicketCard(registration)

  try {
    const content = element.firstElementChild as HTMLElement
    await waitForImages(content)

    const canvas = await html2canvas(content, {
      backgroundColor: '#f2f2f0',
      scale,
      useCORS: true,
    })

    return canvas
  } finally {
    document.body.removeChild(element)
  }
}

export const generateExamTicketPDF = async (registration: Registration) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const canvas = await renderTicketCanvas(registration, 1.9)
  const image = canvas.toDataURL('image/jpeg', SINGLE_IMAGE_QUALITY)
  const size = fitRect(canvas.width, canvas.height, SINGLE_SLOT_WIDTH, SINGLE_SLOT_HEIGHT)
  const x = (210 - size.width) / 2
  const y = (297 - size.height) / 2
  doc.addImage(image, 'JPEG', x, y, size.width, size.height)
  doc.save(`准考证-${registration.student_name}-${registration.ticket_number}.pdf`)
}

export const generateBatchExamTicketsPDF = async (
  registrations: Registration[],
  fileBaseName = '批量准考证'
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  for (const [index, registration] of registrations.entries()) {
    if (index > 0 && index % 2 === 0) {
      doc.addPage()
    }

    const canvas = await renderTicketCanvas(registration, 1.6)
    const image = canvas.toDataURL('image/jpeg', BATCH_IMAGE_QUALITY)
    const size = fitRect(canvas.width, canvas.height, BATCH_SLOT_WIDTH, BATCH_SLOT_HEIGHT)
    const slotY = PAGE_MARGIN + (index % 2) * (BATCH_SLOT_HEIGHT + PAGE_GAP)
    const x = PAGE_MARGIN + (BATCH_SLOT_WIDTH - size.width) / 2
    const y = slotY + (BATCH_SLOT_HEIGHT - size.height) / 2
    doc.addImage(image, 'JPEG', x, y, size.width, size.height)
  }

  doc.save(`${fileBaseName}.pdf`)
}
