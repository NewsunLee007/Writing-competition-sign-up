import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Registration } from '../services/api'
import { getContestUnitName } from '../data/contestOptions'

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

const createTicketElement = (registration: Registration) => {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-99999px'
  wrapper.style.top = '0'
  wrapper.style.width = '794px'
  wrapper.style.padding = '32px'
  wrapper.style.background = '#f5efe5'
  wrapper.style.fontFamily = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'
  wrapper.style.zIndex = '0'

  const districtName = getContestUnitName(registration.district_code)

  wrapper.innerHTML = `
    <div style="min-height:1123px;border-radius:36px;overflow:hidden;background:linear-gradient(180deg,#eef4ff 0%,#f7f1e8 100%);box-shadow:0 40px 120px rgba(16,32,60,.12);border:1px solid rgba(19,45,89,.08);">
      <div style="padding:40px 44px 30px;background:linear-gradient(135deg,#113a74 0%,#0f2550 100%);color:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
          <div>
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;padding:10px;">
                <img src="/contest-logo.png" alt="活动标识" style="width:100%;height:100%;object-fit:contain;" />
              </div>
              <div style="font-size:12px;letter-spacing:.36em;text-transform:uppercase;opacity:.76;">Ruian Creative Writing Contest</div>
            </div>
            <div style="margin-top:18px;font-size:40px;font-weight:700;line-height:1.16;">瑞安市第三届初中学生</div>
            <div style="font-size:40px;font-weight:700;line-height:1.16;">英语创意写作评审活动准考证</div>
            <div style="margin-top:12px;font-size:16px;line-height:1.8;opacity:.82;">Admission Ticket · 请携带本准考证按时报到</div>
          </div>
          <div style="min-width:150px;padding:18px 20px;border-radius:24px;background:rgba(255,255,255,.12);backdrop-filter:blur(8px);text-align:center;border:1px solid rgba(255,255,255,.12);">
            <div style="font-size:12px;letter-spacing:.24em;text-transform:uppercase;opacity:.72;">Ticket No.</div>
            <div style="margin-top:10px;font-size:30px;font-weight:700;letter-spacing:.08em;">${registration.ticket_number}</div>
          </div>
        </div>
      </div>

      <div style="padding:28px 30px 34px;">
        <div style="display:grid;grid-template-columns:1.08fr .92fr;gap:20px;">
          <div style="border-radius:30px;background:rgba(255,255,255,.92);border:1px solid #e8dece;padding:26px;">
            <div style="font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#71819a;">Candidate Information</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:22px;">
              ${[
                ['学生姓名', registration.student_name],
                ['学校', registration.school],
                ['报名归属', districtName],
                ['指导教师', registration.teacher_name || '—'],
                ['带队教师', registration.leader_name],
                ['联系电话', registration.leader_phone],
              ]
                .map(
                  ([label, value]) => `
                    <div style="border-radius:22px;background:#fbf7f1;padding:16px 18px;border:1px solid #efe5d8;">
                      <div style="font-size:12px;letter-spacing:.08em;color:#7c8798;">${label}</div>
                      <div style="margin-top:12px;font-size:22px;font-weight:700;color:#111827;word-break:break-word;line-height:1.45;">${value}</div>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:18px;">
            <div style="border-radius:30px;background:linear-gradient(180deg,#143f7c 0%,#163865 100%);color:#fff;padding:26px;">
              <div style="font-size:13px;letter-spacing:.24em;text-transform:uppercase;opacity:.68;">Schedule</div>
              <div style="margin-top:18px;font-size:24px;font-weight:700;">4 月 12 日（星期日）</div>
              <div style="margin-top:18px;display:grid;gap:10px;font-size:18px;line-height:1.8;">
                <div>8:50 报到</div>
                <div>9:00 正式开始</div>
                <div>9:40 活动结束</div>
              </div>
            </div>

            <div style="border-radius:30px;background:rgba(255,255,255,.94);border:1px solid #e8dece;padding:26px;">
              <div style="font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#71819a;">Venue & Reminder</div>
              <div style="margin-top:18px;font-size:26px;font-weight:700;color:#111827;">瑞安市毓蒙中学</div>
              <div style="margin-top:18px;font-size:16px;line-height:1.95;color:#4b5563;">
                1. 请携带本准考证按时报到。<br/>
                2. 现场作文，服从工作人员安排。<br/>
                3. 如信息有误，请及时联系带队教师。
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;border-radius:30px;background:rgba(255,255,255,.94);border:1px solid #e8dece;padding:24px 28px;">
          <div style="display:flex;justify-content:space-between;gap:24px;align-items:center;">
            <div>
              <div style="font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#71819a;">Notice</div>
              <div style="margin-top:10px;font-size:18px;line-height:1.9;color:#334155;">
                本准考证用于参加瑞安市第三届初中学生英语创意写作评审活动。请学校、学区或直属学校带队教师统一组织到场。
              </div>
            </div>
            <div style="min-width:180px;padding:18px 20px;border-radius:24px;background:#fbf7f1;border:1px solid #eee4d7;">
              <div style="font-size:12px;letter-spacing:.08em;color:#7c8798;">生成时间</div>
              <div style="margin-top:10px;font-size:18px;font-weight:700;color:#111827;line-height:1.7;">${new Date().toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(wrapper)
  return wrapper
}

const appendTicketPage = async (doc: jsPDF, registration: Registration, withNewPage: boolean) => {
  const element = createTicketElement(registration)

  try {
    const content = element.firstElementChild as HTMLElement
    await waitForImages(content)

    const canvas = await html2canvas(content, {
      backgroundColor: '#f5efe5',
      scale: 2,
      useCORS: true,
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL('image/png')

    if (withNewPage) {
      doc.addPage()
    }

    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  } finally {
    document.body.removeChild(element)
  }
}

export const generateExamTicketPDF = async (registration: Registration) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  await appendTicketPage(doc, registration, false)
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
  })

  for (const [index, registration] of registrations.entries()) {
    await appendTicketPage(doc, registration, index > 0)
  }

  doc.save(`${fileBaseName}.pdf`)
}
