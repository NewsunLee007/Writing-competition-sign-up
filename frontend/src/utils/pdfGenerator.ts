import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Registration } from '../services/api'
import { getContestUnitName } from '../data/contestOptions'

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

  const districtName = registration.district_name || getContestUnitName(registration.district_code)

  wrapper.innerHTML = `
    <div style="min-height:1123px;border-radius:32px;overflow:hidden;background:linear-gradient(180deg,#10203c 0%,#173463 24%,#fdf9f2 24.2%,#fdf9f2 100%);box-shadow:0 40px 120px rgba(16,32,60,.18);">
      <div style="padding:44px 48px 32px;color:#fff;">
        <div style="font-size:13px;letter-spacing:.42em;text-transform:uppercase;opacity:.7;">Admit Pass</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:16px;">
          <div>
            <div style="font-size:42px;font-weight:700;line-height:1.1;">瑞安市第三届初中学生</div>
            <div style="font-size:42px;font-weight:700;line-height:1.1;">英语创意写作评审活动准考证</div>
          </div>
          <div style="padding:14px 18px;border-radius:18px;background:rgba(255,255,255,.12);backdrop-filter:blur(8px);text-align:right;">
            <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;opacity:.72;">Ticket No.</div>
            <div style="margin-top:8px;font-size:24px;font-weight:700;">${registration.ticket_number}</div>
          </div>
        </div>
      </div>

      <div style="padding:34px 34px 42px;">
        <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:22px;">
          <div style="border-radius:28px;background:#fff;border:1px solid #e8dece;padding:26px;">
            <div style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#71819a;">Candidate</div>
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
                    <div style="border-radius:20px;background:#f7f2ea;padding:16px 18px;border:1px solid #eee4d7;">
                      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7c8798;">${label}</div>
                      <div style="margin-top:10px;font-size:22px;font-weight:700;color:#111827;word-break:break-word;">${value}</div>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:20px;">
            <div style="border-radius:28px;background:#173463;color:#fff;padding:26px;">
              <div style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;opacity:.65;">Schedule</div>
              <div style="margin-top:18px;font-size:22px;font-weight:700;">4 月 12 日（星期日）</div>
              <div style="margin-top:18px;display:grid;gap:12px;font-size:18px;line-height:1.7;">
                <div>8:50 报到</div>
                <div>9:00 正式开始</div>
                <div>9:40 活动结束</div>
              </div>
            </div>

            <div style="border-radius:28px;background:#fff;border:1px solid #e8dece;padding:26px;">
              <div style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#71819a;">Venue</div>
              <div style="margin-top:18px;font-size:26px;font-weight:700;color:#111827;">瑞安市毓蒙中学</div>
              <div style="margin-top:18px;font-size:16px;line-height:1.9;color:#4b5563;">
                1. 请携带本准考证按时报到。<br/>
                2. 现场作文，服从工作人员安排。<br/>
                3. 如信息有误，请及时联系带队教师。
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top:24px;border-radius:28px;background:#fff;border:1px solid #e8dece;padding:24px 28px;">
          <div style="display:flex;justify-content:space-between;gap:24px;align-items:center;">
            <div>
              <div style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#71819a;">Notice</div>
              <div style="margin-top:10px;font-size:18px;line-height:1.85;color:#334155;">
                本准考证用于参加瑞安市第三届初中学生英语创意写作评审活动。请学校、学区或直属学校带队教师统一组织到场。
              </div>
            </div>
            <div style="min-width:170px;padding:18px 20px;border-radius:22px;background:#f7f2ea;border:1px solid #eee4d7;">
              <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7c8798;">生成时间</div>
              <div style="margin-top:10px;font-size:18px;font-weight:700;color:#111827;">${new Date().toLocaleString('zh-CN')}</div>
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
    const canvas = await html2canvas(element.firstElementChild as HTMLElement, {
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
