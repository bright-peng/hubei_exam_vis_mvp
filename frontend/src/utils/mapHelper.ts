/**
 * 城市名称标准化处理，确保与 GeoJSON 中的 name 匹配
 * @param name 原始城市名称
 * @returns 标准化后的城市名称
 */
export const normalizeCityName = (name: string): string => {
    if (!name) return ''
    
    // "省直" 保留原样（不显示在地图上，但保持数据原始语义），或者根据业务需求处理
    if (name === '省直') return '省直'
    
    // 特殊行政区处理
    if (name.includes('恩施')) return '恩施土家族苗族自治州'
    if (name.includes('神农架')) return '神农架林区'
    
    // 如果已有后缀，不做处理
    const lastChar = name.charAt(name.length - 1)
    if (['市', '州', '区'].includes(lastChar)) {
        return name
    }
    
    // 默认添加 "市" 后缀
    return name + '市'
}
