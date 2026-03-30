export type RegistrationUnitType = 'district' | 'direct_school'

export interface ContestUnitDefinition {
  code: string
  name: string
  type: RegistrationUnitType
  label: string
  roomNo: string
  aliases?: string[]
}

export const CONTEST_UNITS: ContestUnitDefinition[] = [
  { code: 'TX', name: '塘下学区', type: 'district', label: '学区推荐', roomNo: '01' },
  { code: 'AY', name: '安阳学区', type: 'district', label: '学区推荐', roomNo: '02' },
  { code: 'FY', name: '飞云学区', type: 'district', label: '学区推荐', roomNo: '03' },
  { code: 'XC', name: '莘塍学区', type: 'district', label: '学区推荐', roomNo: '04' },
  { code: 'MY', name: '马屿学区', type: 'district', label: '学区推荐', roomNo: '05' },
  { code: 'GL', name: '高楼学区', type: 'district', label: '学区推荐', roomNo: '06' },
  { code: 'HL', name: '湖岭学区', type: 'district', label: '学区推荐', roomNo: '07' },
  { code: 'TS', name: '陶山学区', type: 'district', label: '学区推荐', roomNo: '08' },
  { code: 'SY', name: '安阳实验', type: 'direct_school', label: '直属学校', roomNo: '09', aliases: ['瑞安市实验中学'] },
  { code: 'XY', name: '新纪元', type: 'direct_school', label: '直属学校', roomNo: '10', aliases: ['安阳新纪元'] },
  { code: 'AG', name: '安高初中', type: 'direct_school', label: '直属学校', roomNo: '11', aliases: ['安高'] },
  { code: 'RX', name: '瑞祥实验', type: 'direct_school', label: '直属学校', roomNo: '12', aliases: ['瑞祥实验学校'] },
  { code: 'JY', name: '集云学校', type: 'direct_school', label: '直属学校', roomNo: '13', aliases: ['集云实验学校'] },
  { code: 'YM', name: '毓蒙中学', type: 'direct_school', label: '直属学校', roomNo: '14' },
  { code: 'GC', name: '广场中学', type: 'direct_school', label: '直属学校', roomNo: '15' },
  { code: 'RZ', name: '瑞中附初', type: 'direct_school', label: '直属学校', roomNo: '16' },
  { code: 'ZJ', name: '紫荆书院', type: 'direct_school', label: '直属学校', roomNo: '17' },
]

export const DISTRICT_CODES = CONTEST_UNITS.filter((unit) => unit.type === 'district').map((unit) => unit.code)
export const DIRECT_SCHOOL_CODES = CONTEST_UNITS.filter((unit) => unit.type === 'direct_school').map((unit) => unit.code)

export const getContestUnit = (code: string) =>
  CONTEST_UNITS.find((unit) => unit.code === code)

export const getContestUnitName = (code: string) => getContestUnit(code)?.name || code

export const getExamRoomNo = (code: string) => getContestUnit(code)?.roomNo || '99'

export const isDirectSchoolCode = (code: string) =>
  DIRECT_SCHOOL_CODES.includes(code)
