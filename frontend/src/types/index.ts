// ==================== Position Types ====================

/**
 * 职位数据结构
 */
export interface Position {
  /** 职位代码 */
  职位代码: string
  /** 招录机关 */
  招录机关: string
  /** 用人单位 */
  用人单位: string
  /** 机关层级 */
  机关层级?: string
  /** 职位名称 */
  职位名称: string
  /** 职位简介 */
  职位简介?: string
  /** 招录人数 */
  招录人数: number
  /** 研究生专业 */
  研究生专业?: string
  /** 本科专业 */
  本科专业?: string
  /** 专科专业 */
  专科专业?: string
  /** 学历 */
  学历?: string
  /** 学位 */
  学位?: string
  /** 招录对象 */
  招录对象?: string
  /** 政治面貌 */
  政治面貌?: string
  /** 备注 */
  备注?: string
  /** 审核通过人数 */
  审核通过人数: number
  /** 竞争比 */
  竞争比?: number
  /** 工作地点 */
  工作地点?: string
  /** city (parsed from 工作地点) */
  city?: string
  /** district (parsed from 工作地点) */
  district?: string
  [key: string]: string | number | undefined
}

/**
 * 筛选参数
 */
export interface FilterParams {
  city?: string
  district?: string
  education?: string
  level?: string
  target?: string
  keyword?: string
  page?: number
  pageSize?: number
  codeList?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  latestDate?: string
}

// ==================== Statistics Types ====================

/**
 * 区域统计数据
 */
export interface RegionStats {
  name: string
  positions: number
  quota: number
  applicants: number
  competition_ratio: number
}

/**
 * 地图数据项
 */
export interface MapDataItem extends RegionStats {
  value: number
}

/**
 * 武汉区级统计数据
 */
export interface DistrictStats {
  name: string
  positions: number
  quota: number
  applicants: number
  competition_ratio: number
}

/**
 * 汇总数据
 */
export interface Summary {
  total_positions: number
  total_quota: number
  total_applicants: number
  avg_competition: number
  latest_date?: string
}

// ==================== Trend Types ====================

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  date: string
  applicants: number
  growth?: number
}

/**
 * 职位趋势数据
 */
export interface PositionTrend {
  code: string
  name: string
  data: TrendDataPoint[]
}

// ==================== Momentum Types ====================

/**
 * 动量数据
 */
export interface MomentumData {
  count: number
  ids: string[]
}

/**
 * 动量结果
 */
export interface MomentumResult {
  hot: MomentumData
  warm: MomentumData
  neutral: MomentumData
  cold: MomentumData
  frozen: MomentumData
}

// ==================== Filter Options Types ====================

/**
 * 筛选选项
 */
export interface FilterOptions {
  cities: string[]
  educations: string[]
  levels: string[]
}

// ==================== API Response Types ====================

/**
 * 热门/冷门职位响应
 */
export interface HotColdPositionsResponse {
  hot: Position[]
  cold: Position[]
}

/**
 * 可用日期响应
 */
export interface AvailableDatesResponse {
  dates: string[]
}
