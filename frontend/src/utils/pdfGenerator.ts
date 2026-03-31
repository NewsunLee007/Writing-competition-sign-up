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

const createTicketCard = (registration: Registration) => {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-99999px'
  wrapper.style.top = '0'
  wrapper.style.width = '760px'
  wrapper.style.padding = '0'
  wrapper.style.background = '#f7f3ec'
  wrapper.style.fontFamily = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'
  wrapper.style.zIndex = '0'

  const districtName = getContestUnitName(registration.district_code)

  wrapper.innerHTML = `
    <div style="border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#ffffff 0%,#fbf7f1 100%);box-shadow:0 30px 70px rgba(16,32,60,.08);border:1px solid #e6dfd4;">
      <div style="padding:24px 30px 20px;background:linear-gradient(180deg,#f3f7ff 0%,#eef4fb 100%);border-bottom:1px solid #dde6f2;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
          <div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:52px;height:52px;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;padding:8px;border:1px solid #d8e1ec;">
                <img src="/contest-logo.png" alt="活动标识" style="width:100%;height:100%;object-fit:contain;" />
              </div>
              <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#47617f;">Ruian Writing Contest</div>
            </div>
            <div style="margin-top:16px;font-size:28px;font-weight:700;line-height:1.28;color:#10203c;">瑞安市第三届初中学生英语创意写作评审活动准考证</div>
            <div style="margin-top:8px;font-size:14px;line-height:1.8;color:#5d728b;">Admission Ticket · 请携带本准考证按时报到</div>
          </div>
          <div style="min-width:126px;padding:14px 16px;border-radius:20px;background:#fff;text-align:center;border:1px solid #dae2ed;">
            <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6c8098;">Ticket No.</div>
            <div style="margin-top:8px;font-size:26px;font-weight:700;letter-spacing:.08em;color:#10203c;">${registration.ticket_number}</div>
          </div>
        </div>
      </div>

      <div style="padding:22px 24px 24px;">
        <div style="display:grid;grid-template-columns:1fr .88fr;gap:16px;">
          <div style="border-radius:24px;background:#fff;border:1px solid #e9e2d8;padding:20px;">
            <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#71819a;">Candidate Information</div>
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
                    <div style="border-radius:18px;background:#fcf8f2;padding:14px 16px;border:1px solid #efe5d8;">
                      <div style="font-size:12px;letter-spacing:.08em;color:#7c8798;">${label}</div>
                      <div style="margin-top:10px;font-size:19px;font-weight:700;color:#111827;word-break:break-word;line-height:1.45;">${value}</div>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="border-radius:24px;background:linear-gradient(180deg,#eff5ff 0%,#e6eefb 100%);color:#10203c;padding:20px;border:1px solid #dbe4f0;">
              <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6e83a0;">Schedule</div>
              <div style="margin-top:14px;font-size:22px;font-weight:700;">4 月 12 日（星期日）</div>
              <div style="margin-top:14px;display:grid;gap:8px;font-size:17px;line-height:1.8;">
                <div>8:50 报到</div>
                <div>9:00 正式开始</div>
                <div>9:40 活动结束</div>
              </div>
            </div>

            <div style="border-radius:24px;background:#fff;border:1px solid #e8dece;padding:20px;">
              <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#71819a;">Venue</div>
              <div style="margin-top:14px;font-size:22px;font-weight:700;color:#111827;">瑞安市毓蒙中学</div>
              <div style="margin-top:14px;font-size:15px;line-height:1.9;color:#4b5563;">
                1. 请携带本准考证按时报到。<br/>
                2. 现场作文，服从工作人员安排。<br/>
                3. 如信息有误，请及时联系带队教师。
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top:16px;border-radius:24px;background:#fff;border:1px solid #e8dece;padding:18px 22px;">
          <div style="display:flex;justify-content:space-between;gap:24px;align-items:center;">
            <div>
              <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#71819a;">Notice</div>
              <div style="margin-top:8px;font-size:16px;line-height:1.9;color:#334155;">
                本准考证用于参加瑞安市第三届初中学生英语创意写作评审活动。请学校、学区或直属学校带队教师统一组织到场。
              </div>
            </div>
            <div style="min-width:168px;padding:16px 18px;border-radius:18px;background:#fbf7f1;border:1px solid #eee4d7;">
              <div style="font-size:12px;letter-spacing:.08em;color:#7c8798;">生成时间</div>
              <div style="margin-top:8px;font-size:16px;font-weight:700;color:#111827;line-height:1.7;">${new Date().toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(wrapper)
  return wrapper
}

const renderTicketImage = async (registration: Registration) => {
  const element = createTicketCard(registration)

  try {
    const content = element.firstElementChild as HTMLElement
    await waitForImages(content)

    const canvas = await html2canvas(content, {
      backgroundColor: '#f5efe5',
      scale: 2,
      useCORS: true,
    })

    return canvas.toDataURL('image/png')
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

  const image = await renderTicketImage(registration)
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.addImage(image, 'PNG', 10, 18, pageWidth - 20, 130)
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
    if (index > 0 && index % 2 === 0) {
      doc.addPage()
    }

    const image = await renderTicketImage(registration)
    const y = index % 2 === 0 ? 10 : 148
    doc.addImage(image, 'PNG', 10, y, 190, 130)
  }

  doc.save(`${fileBaseName}.pdf`)
}
