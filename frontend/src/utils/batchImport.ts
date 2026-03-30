import * as XLSX from 'xlsx'
import { CONTEST_UNITS, getContestUnit, getContestUnitName } from '../data/contestOptions'

export interface ImportedStudent {
  id: string
  unitType: 'district' | 'direct_school'
  unitCode: string
  unitName: string
  school: string
  studentName: string
  guideTeacher: string
  teamTeacherName: string
  teamTeacherPhone: string
}

const REQUIRED_HEADERS = ['报名类别', '学区/直属学校', '学校', '学生姓名', '指导教师', '带队教师', '带队教师电话']

const normalizeText = (value: unknown) => String(value ?? '').trim()

const resolveType = (value: string) => {
  if (['学区', '学区推荐', 'district'].includes(value)) return 'district'
  if (['直属学校', 'direct_school', 'direct-school'].includes(value)) return 'direct_school'
  return null
}

const resolveUnit = (value: string) =>
  CONTEST_UNITS.find(
    (unit) =>
      unit.code === value ||
      unit.name === value ||
      unit.schoolName === value ||
      `${unit.label}-${unit.name}` === value
  )

export const parseBatchImportFile = async (file: File): Promise<ImportedStudent[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const targetSheetName =
    workbook.SheetNames.find((name: string) => name.includes('报名')) || workbook.SheetNames[0]

  if (!targetSheetName) {
    throw new Error('未找到可读取的工作表')
  }

  const sheet = workbook.Sheets[targetSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (!rows.length) {
    throw new Error('模板中没有可导入的数据')
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !(header in rows[0]))
  if (missingHeaders.length > 0) {
    throw new Error(`模板缺少列：${missingHeaders.join('、')}`)
  }

  return rows.map((row: Record<string, unknown>, index: number) => {
    const typeText = normalizeText(row['报名类别'])
    const unitText = normalizeText(row['学区/直属学校'])
    const schoolText = normalizeText(row['学校'])
    const studentName = normalizeText(row['学生姓名'])
    const guideTeacher = normalizeText(row['指导教师'])
    const teamTeacherName = normalizeText(row['带队教师'])
    const teamTeacherPhone = normalizeText(row['带队教师电话'])

    const unitType = resolveType(typeText)
    if (!unitType) {
      throw new Error(`第 ${index + 2} 行“报名类别”无效：${typeText || '空值'}`)
    }

    const unit = resolveUnit(unitText)
    if (!unit) {
      throw new Error(`第 ${index + 2} 行“学区/直属学校”无效：${unitText || '空值'}`)
    }

    if (unit.type !== unitType) {
      throw new Error(`第 ${index + 2} 行“报名类别”与“学区/直属学校”不匹配`)
    }

    if (!studentName || !guideTeacher || !teamTeacherName || !teamTeacherPhone) {
      throw new Error(`第 ${index + 2} 行存在必填项未填写`)
    }

    const school =
      unit.type === 'direct_school'
        ? schoolText || unit.schoolName || getContestUnitName(unit.code)
        : schoolText

    if (!school) {
      throw new Error(`第 ${index + 2} 行“学校”不能为空`)
    }

    return {
      id: `import-${index + 1}`,
      unitType,
      unitCode: unit.code,
      unitName: unit.schoolName || unit.name,
      school,
      studentName,
      guideTeacher,
      teamTeacherName,
      teamTeacherPhone,
    }
  })
}

export const getImportSummary = (students: ImportedStudent[]) => {
  const counts = new Map<string, number>()
  students.forEach((student) => {
    const key = `${student.unitName}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
}

export const getTemplateOptionsPreview = () => ({
  districtOptions: CONTEST_UNITS.filter((unit) => unit.type === 'district').map((unit) => unit.name),
  directSchoolOptions: CONTEST_UNITS.filter((unit) => unit.type === 'direct_school').map(
    (unit) => unit.schoolName || unit.name
  ),
})

export const resolveUnitByCode = (code: string) => getContestUnit(code)
