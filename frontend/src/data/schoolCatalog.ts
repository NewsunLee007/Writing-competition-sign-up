import { RegistrationUnitType } from './contestOptions'

export const CUSTOM_SCHOOL_OPTION = '其他学校（手动填写）'

export interface SchoolCatalogGroup {
  code: string
  unitType: RegistrationUnitType
  options: string[]
  sourceNote: string
}

export const SCHOOL_CATALOG: SchoolCatalogGroup[] = [
  {
    code: 'TX',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'AY',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'FY',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'XC',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'MY',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'GL',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'HL',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'TS',
    unitType: 'district',
    options: [],
    sourceNote: '待补充官方学校清单，当前支持手动填写',
  },
  {
    code: 'SY',
    unitType: 'direct_school',
    options: ['瑞安市实验中学'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'XY',
    unitType: 'direct_school',
    options: ['安阳新纪元'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'AG',
    unitType: 'direct_school',
    options: ['安高初中'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'RX',
    unitType: 'direct_school',
    options: ['瑞祥实验学校'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'JY',
    unitType: 'direct_school',
    options: ['集云实验学校'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'YM',
    unitType: 'direct_school',
    options: ['毓蒙中学'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'GC',
    unitType: 'direct_school',
    options: ['广场中学'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'RZ',
    unitType: 'direct_school',
    options: ['瑞中附初'],
    sourceNote: '直属学校固定项',
  },
  {
    code: 'ZJ',
    unitType: 'direct_school',
    options: ['紫荆书院'],
    sourceNote: '直属学校固定项',
  },
]

export const getSchoolCatalogByCode = (code: string) =>
  SCHOOL_CATALOG.find((item) => item.code === code)

export const getSchoolOptions = (code: string) => {
  const group = getSchoolCatalogByCode(code)
  if (!group) return [CUSTOM_SCHOOL_OPTION]

  const options = [...group.options]
  if (!options.includes(CUSTOM_SCHOOL_OPTION)) {
    options.push(CUSTOM_SCHOOL_OPTION)
  }
  return options
}

