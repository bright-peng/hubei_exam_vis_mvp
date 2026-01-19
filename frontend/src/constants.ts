/** 数据字段键名常量 */
export const DATA_KEYS = {
    CODE: '职位代码',
    NAME: '职位名称',
    ORG: '招录机关',
    UNIT: '用人单位',
    CITY: '城市',
    DISTRICT: '区县',
    DISTRICT_MAP: 'district', // MapView use this
    EDUCATION: '学历',
    DEGREE: '学位',
    MAJOR_PG: '研究生专业', // Post-Graduate
    MAJOR_UG: '本科专业',   // Under-Graduate
    MAJOR_OLD: '专业',      // Back compatibility
    TARGET: '招录对象',
    INTRO: '职位简介',
    NOTES: '备注',
    QUOTA: '招录人数',
    APPLICANTS: '报名人数',
    RATIO: '竞争比',
} as const

/** DATA_KEYS 的类型 */
export type DataKeyType = typeof DATA_KEYS
export type DataKeyValue = DataKeyType[keyof DataKeyType]
