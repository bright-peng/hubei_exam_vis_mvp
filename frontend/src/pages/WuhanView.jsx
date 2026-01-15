import { useState, useEffect } from 'react';
import { 
  Card, 
  Grid, 
  Typography, 
  Space, 
  Statistic, 
  Button, 
  Table, 
  Badge, 
  Tag, 
  Spin, 
  Empty,
  Divider
} from '@arco-design/web-react';
import { 
  IconHistory, 
  IconFire, 
  IconCheckCircle, 
  IconUserGroup, 
  IconFile,
  IconSearch,
  IconClose
} from '@arco-design/web-react/icon';
import { getWuhanDistricts, getWuhanPositions, getSurgePositions } from '../api';
import DateSelector from '../components/DateSelector';
import './WuhanView.css';

const { Row, Col } = Grid;
const { Title, Text, Paragraph } = Typography;

// 武汉市各区配置 - 优化坐标以防止重叠
const WUHAN_DISTRICTS = [
  { name: '江岸区', x: 55, y: 30 },
  { name: '江汉区', x: 45, y: 35 },
  { name: '硚口区', x: 35, y: 40 },
  { name: '汉阳区', x: 33, y: 50 },
  { name: '武昌区', x: 60, y: 52 },
  { name: '青山区', x: 72, y: 45 },
  { name: '洪山区', x: 65, y: 62 },
  { name: '东西湖区', x: 28, y: 28 },
  { name: '汉南区', x: 22, y: 72 },
  { name: '蔡甸区', x: 18, y: 58 },
  { name: '江夏区', x: 55, y: 78 },
  { name: '黄陂区', x: 55, y: 12 },
  { name: '新洲区', x: 82, y: 25 },
  { name: '东湖高新区', x: 75, y: 65 },
  { name: '武汉经开区', x: 30, y: 65 },
  { name: '东湖风景区', x: 68, y: 52 },
  { name: '长江新区', x: 68, y: 18 },
  { name: '市直', x: 48, y: 46 }, // 调整市直位置，由 (50, 48) 改为 (48, 46)
];

function WuhanView() {
  const [districtData, setDistrictData] = useState([]);
  const [positions, setPositions] = useState([]);
  const [wuhanSurge, setWuhanSurge] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [displayMode, setDisplayMode] = useState('applicants'); 
  const [loading, setLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(false);

  useEffect(() => {
    fetchDistrictStats();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchDistrictPositions(selectedDistrict);
    }
  }, [selectedDistrict, selectedDate]);

  const fetchDistrictStats = async () => {
    setLoading(true);
    try {
      const promises = [getWuhanDistricts(selectedDate)];
      if (!selectedDate) {
        promises.push(getSurgePositions());
      }
      const results = await Promise.all(promises);
      const data = results[0];
      const surgeData = !selectedDate ? results[1] : { wuhan: [] };

      setDistrictData(data.data || []);
      setSummary({
        totalPositions: data.total_positions,
        totalQuota: data.total_quota,
        totalApplicants: data.total_applicants,
        date: data.date
      });
      setWuhanSurge(surgeData.wuhan || []);
    } catch (err) {
      console.error('获取武汉区县数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistrictPositions = async (district) => {
    setPositionsLoading(true);
    try {
      const data = await getWuhanPositions({
        district,
        date: selectedDate,
        page_size: 200
      });
      setPositions(data.data || []);
    } catch (err) {
      console.error('获取职位列表失败:', err);
    } finally {
      setPositionsLoading(false);
    }
  };

  const getDistrictValue = (name) => {
    const district = districtData.find(d => d.name === name);
    if (!district) return 0;
    switch (displayMode) {
      case 'applicants': return district.applicants;
      case 'positions': return district.positions;
      case 'ratio': return district.competition_ratio;
      default: return district.applicants;
    }
  };

  const getMaxValue = () => {
    if (districtData.length === 0) return 1;
    const values = districtData.map(d => {
      switch (displayMode) {
        case 'applicants': return d.applicants;
        case 'positions': return d.positions;
        case 'ratio': return d.competition_ratio;
        default: return d.applicants;
      }
    });
    return Math.max(...values) || 1;
  };

  const getDistrictColor = (name) => {
    const value = getDistrictValue(name);
    const ratio = value / getMaxValue();
    const hue = 260 - ratio * 60;
    const saturation = 40 + ratio * 40;
    const lightness = 65 - ratio * 30;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getDistrictSize = (name) => {
    const value = getDistrictValue(name);
    const ratio = value / getMaxValue();
    // 减小基础大小，从 40-80 调整为 30-55，半径对应为 3.0-5.5
    return 30 + ratio * 25; 
  };

  const formatValue = (value) => {
    if (displayMode === 'ratio') return `${value}:1`;
    return value?.toLocaleString() || '0';
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spin size={40} /></div>;
  }

  const columns = [
    { title: '职位代码', dataIndex: '职位代码', width: 120, render: (val) => <Text copyable className="code-text-arco">{val}</Text> },
    { title: '职位名称', dataIndex: '职位名称', ellipsis: true },
    { title: '用人单位', dataIndex: '用人单位', ellipsis: true },
    { title: '招录', dataIndex: '招录人数', width: 80, align: 'center' },
    { title: '报名', dataIndex: '报名人数', width: 100, align: 'center', render: (val) => <Text bold color="arcoblue">{val?.toLocaleString()}</Text> },
    { title: '竞争比', dataIndex: '竞争比', width: 100, align: 'center', render: (val) => <Tag color={val > 50 ? 'red' : val > 20 ? 'orange' : 'green'}>{val}:1</Tag> }
  ];

  return (
    <div className="wuhan-view-arco fade-in">
      <Card bordered={false} className="glass-card-arco" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="center" gutter={[0, 16]}>
          <Col xs={24} sm={12}>
            <Title heading={3} style={{ margin: 0 }}>🏙️ 武汉市报名数据可视化</Title>
            <Text type="secondary">实时监测各行政区及市直机关的报名热度分布</Text>
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </Col>
        </Row>

        <Divider style={{ margin: '20px 0' }} />

        <Row gutter={[24, 16]}>
          <Col xs={12} sm={6}>
            <Statistic title="职位总数" value={summary.totalPositions} suffix="个" countUp />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="计划招录" value={summary.totalQuota} suffix="人" countUp />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="当前报名" value={summary.totalApplicants} suffix="人" countUp />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="平均竞争比" value={(summary.totalApplicants / (summary.totalQuota || 1)).toFixed(1)} suffix=":1" countUp />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={15}>
          <Card 
            title="区域热力分布" 
            bordered={false} 
            className="glass-card-arco district-map-card"
            extra={
              <Space>
                <Button size="mini" type={displayMode === 'applicants' ? 'primary' : 'secondary'} onClick={() => setDisplayMode('applicants')}>人数</Button>
                <Button size="mini" type={displayMode === 'positions' ? 'primary' : 'secondary'} onClick={() => setDisplayMode('positions')}>职位</Button>
                <Button size="mini" type={displayMode === 'ratio' ? 'primary' : 'secondary'} onClick={() => setDisplayMode('ratio')}>竞争</Button>
              </Space>
            }
          >
            <div className="district-map-arco">
              <svg viewBox="0 0 100 100" className="wuhan-svg-arco">
                <defs>
                  <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(102, 126, 234, 0.1)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
                  </radialGradient>
                </defs>
                <ellipse cx="50" cy="50" rx="48" ry="42" fill="url(#bgGradient)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                
                {WUHAN_DISTRICTS.map((district) => {
                  const size = getDistrictSize(district.name) / 10;
                  const value = getDistrictValue(district.name);
                  const isSelected = selectedDistrict === district.name;
                  
                  return (
                    <g key={district.name} 
                       className={`district-bubble-arco ${isSelected ? 'selected' : ''}`}
                       onClick={() => setSelectedDistrict(district.name)}>
                      <circle
                        cx={district.x}
                        cy={district.y}
                        r={size}
                        fill={getDistrictColor(district.name)}
                        className="bubble-circle-arco"
                      />
                      <text x={district.x} y={district.y - 0.5} textAnchor="middle" className="bubble-name-arco">
                        {district.name.replace('区', '')}
                      </text>
                      <text x={district.x} y={district.y + 2.2} textAnchor="middle" className="bubble-value-arco">
                        {formatValue(value)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="map-legend-arco">
              <Text size="small" type="secondary">低</Text>
              <div className="gradient-bar-arco"></div>
              <Text size="small" type="secondary">高</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={9}>
          <Card title="区域数据排名" bordered={false} className="glass-card-arco district-list-card">
            <div className="district-rank-list-arco">
              {districtData.sort((a,b) => b[displayMode === 'ratio' ? 'competition_ratio' : displayMode] - a[displayMode === 'ratio' ? 'competition_ratio' : displayMode])
                .map((district, index) => (
                <div 
                  key={district.name}
                  className={`rank-item-arco ${selectedDistrict === district.name ? 'active' : ''}`}
                  onClick={() => setSelectedDistrict(district.name)}
                >
                  <div className={`rank-no-arco rank-${index + 1}`}>{index + 1}</div>
                  <div className="rank-info-arco">
                    <Text bold>{district.name}</Text>
                    <Text type="secondary" size="small">{district.positions} 职位 / {district.quota} 招录</Text>
                  </div>
                  <div className="rank-value-arco">
                    <Text bold type={displayMode === 'ratio' ? 'danger' : 'primary'}>{formatValue(district[displayMode === 'ratio' ? 'competition_ratio' : displayMode])}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 飙升榜 */}
      {!selectedDate && wuhanSurge.length > 0 && (
        <Card 
          title={<Space><IconFire style={{ color: '#ff4d4f' }} />今日报名飙升 Top 20 (武汉)</Space>}
          bordered={false} 
          className="glass-card-arco" 
          style={{ marginTop: 24 }}
        >
          <Table
            data={wuhanSurge}
            pagination={false}
            rowKey="code"
            size="small"
            scroll={{ y: 400, x: 600 }}
            columns={[
              { title: '排名', width: 60, align: 'center', render: (_, __, index) => <Badge count={index+1} dotStyle={index < 3 ? { backgroundColor: '#ff4d4f' } : { backgroundColor: '#94a3b8' }} /> },
              { title: '职位代码', dataIndex: 'code', width: 120, render: (val) => <Text copyable className="code-text-arco">{val}</Text> },
              { title: '名称/单位', render: (_, record) => (
                <Space direction="vertical" size={0}>
                  <Text bold>{record.name}</Text>
                  <Text type="secondary" size="small" ellipsis>{record.unit}</Text>
                </Space>
              )},
              { title: '所在区', dataIndex: 'district', width: 100 },
              { title: '报名数', dataIndex: 'applicants_today', width: 100, align: 'right' },
              { title: '今日新增', dataIndex: 'delta', width: 100, align: 'right', render: (val) => <Text bold color="red">+{val}</Text> }
            ]}
          />
        </Card>
      )}

      {/* 区域详情 */}
      {selectedDistrict && (
        <Card 
          title={<Space><IconFile /> {selectedDistrict} 职位详情</Space>}
          bordered={false} 
          className="glass-card-arco detail-card-arco"
          style={{ marginTop: 24 }}
          extra={<Button icon={<IconClose />} type="text" onClick={() => setSelectedDistrict(null)} />}
        >
          <Table
            loading={positionsLoading}
            columns={columns}
            data={positions}
            rowKey="职位代码"
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 800 }}
            noDataElement={<Empty description="该区域暂无匹配职位" />}
          />
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <Button 
              type="secondary" 
              icon={<IconClose />} 
              onClick={() => setSelectedDistrict(null)}
              style={{ padding: '0 40px' }}
            >
              关闭详情
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default WuhanView;
