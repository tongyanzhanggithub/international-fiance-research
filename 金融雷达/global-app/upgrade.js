const chokepoints = [
  { name: "苏伊士运河", lat: 30.4, lon: 32.5, score: 88, note: "红海绕行持续，欧洲进口成本上升" },
  { name: "曼德海峡", lat: 12.6, lon: 43.3, score: 91, note: "商船安全与保险溢价高位" },
  { name: "霍尔木兹海峡", lat: 26.6, lon: 56.3, score: 86, note: "原油与 LNG 运输风险上升" },
  { name: "马六甲海峡", lat: 2.5, lon: 101.2, score: 46, note: "流量高位，当前运行稳定" },
  { name: "巴拿马运河", lat: 9.1, lon: -79.7, score: 74, note: "旱季配额与船期延误" },
  { name: "博斯普鲁斯海峡", lat: 41.1, lon: 29.1, score: 68, note: "黑海粮食装运受扰" },
  { name: "台湾海峡", lat: 24.2, lon: 119.5, score: 67, note: "电子供应链需持续关注" },
  { name: "好望角", lat: -34.4, lon: 18.5, score: 63, note: "绕行流量与燃油成本增加" },
];

const strategicPorts = [
  { name: "上海港", lat: 31.2, lon: 121.5, note: "集装箱与制造出口枢纽" },
  { name: "新加坡港", lat: 1.26, lon: 103.84, note: "亚洲转运与燃油补给中心" },
  { name: "鹿特丹港", lat: 51.95, lon: 4.14, note: "欧洲能源与集装箱门户" },
  { name: "杰贝阿里港", lat: 25.0, lon: 55.06, note: "中东贸易中转枢纽" },
  { name: "桑托斯港", lat: -23.96, lon: -46.3, note: "巴西农产品出口枢纽" },
  { name: "洛杉矶港", lat: 33.74, lon: -118.27, note: "美国亚洲进口门户" },
  { name: "丹戎帕拉帕斯港", lat: 1.36, lon: 103.55, note: "东南亚制造与转运枢纽" },
  { name: "康斯坦察港", lat: 44.17, lon: 28.65, note: "黑海粮食替代出口节点" },
];

// 国家/地区中文名 → 地理中心坐标 [纬度, 经度]，用于把制裁名单、产业企业动态等按国家归属的
// 实时数据投射到地图上。坐标取首都或地理中心，仅用于近似定位，不代表精确边界。
const countryGeo = {
  中国: [35.0, 105.0],
  美国: [39.8, -98.6],
  俄罗斯: [61.5, 105.3],
  伊朗: [32.4, 53.7],
  沙特阿拉伯: [24.0, 45.0],
  阿联酋: [24.0, 54.0],
  卡塔尔: [25.3, 51.2],
  科威特: [29.3, 47.5],
  伊拉克: [33.0, 44.0],
  叙利亚: [35.0, 38.5],
  以色列: [31.0, 35.0],
  土耳其: [39.0, 35.0],
  印度: [22.0, 79.0],
  巴基斯坦: [30.0, 70.0],
  孟加拉国: [23.7, 90.4],
  印度尼西亚: [-2.5, 118.0],
  越南: [16.0, 108.0],
  菲律宾: [13.0, 122.0],
  日本: [36.2, 138.3],
  韩国: [36.5, 127.8],
  朝鲜: [40.3, 127.5],
  新加坡: [1.35, 103.8],
  澳大利亚: [-25.0, 133.0],
  英国: [54.0, -2.0],
  欧盟: [50.8, 4.4],
  德国: [51.2, 10.4],
  法国: [46.6, 2.2],
  意大利: [42.5, 12.5],
  西班牙: [40.0, -4.0],
  荷兰: [52.1, 5.3],
  乌克兰: [48.4, 31.2],
  白俄罗斯: [53.7, 27.9],
  加拿大: [56.1, -106.3],
  墨西哥: [23.6, -102.5],
  巴西: [-10.0, -55.0],
  智利: [-35.7, -71.5],
  阿根廷: [-34.0, -64.0],
  哥伦比亚: [4.0, -74.0],
  秘鲁: [-10.0, -76.0],
  巴拿马: [8.5, -80.8],
  也门: [15.5, 48.5],
  埃及: [26.8, 30.8],
  尼日利亚: [9.1, 8.7],
  加纳: [7.9, -1.0],
  南非: [-29.0, 24.0],
  "刚果（金）": [-4.0, 21.8],
  赞比亚: [-13.1, 27.9],
  全球: [10, 12],
};

function countryCoord(name) {
  if (!name) return null;
  const key = String(name).trim();
  if (countryGeo[key]) return countryGeo[key];
  const alias = Object.keys(countryGeo).find((item) => key.includes(item) || item.includes(key));
  return alias ? countryGeo[alias] : null;
}

const routeGeography = [
  {
    name: "中国—欧洲海运",
    score: 88,
    points: [[31.2, 121.5], [1.3, 103.8], [12.6, 43.3], [30.4, 32.5], [51.95, 4.14]],
    commodities: ["电子产品", "机械设备", "光伏组件", "纺织服装", "家具家居"],
    reason: "苏伊士运河绕行、红海护航成本与欧洲需求波动共同推高时效与保费",
  },
  {
    name: "波斯湾—东亚能源",
    score: 86,
    points: [[25.0, 55.1], [26.6, 56.3], [2.5, 101.2], [31.2, 121.5]],
    commodities: ["原油", "液化天然气 (LNG)", "石脑油 / 石化产品"],
    reason: "霍尔木兹海峡通行风险与OPEC+产量政策直接影响能源到岸成本",
  },
  {
    name: "亚洲—美国东海岸",
    score: 74,
    points: [[31.2, 121.5], [9.1, -79.7], [32.1, -80.9]],
    commodities: ["消费电子", "家具家居", "服装鞋帽", "汽车零部件"],
    reason: "巴拿马运河水位限制、美国关税调整与港口拥堵推升周转风险",
  },
  {
    name: "黑海—地中海粮食",
    score: 79,
    points: [[46.5, 30.7], [41.1, 29.1], [31.2, 29.9]],
    commodities: ["小麦", "玉米", "葵花籽油", "化肥"],
    reason: "黑海港口安全与博斯普鲁斯海峡通行节奏影响全球粮食与化肥供给",
  },
  {
    name: "巴西—中国粮食",
    score: 64,
    points: [[-24.0, -46.3], [-34.4, 18.5], [1.3, 103.8], [31.2, 121.5]],
    commodities: ["大豆", "铁矿石", "原油", "蔗糖"],
    reason: "南美收获季节、海运运价与中国采购节奏决定大宗商品到港波动",
  },
  {
    name: "中非—印度洋矿产",
    score: 75,
    points: [[-10.7, 25.5], [-14.0, 33.8], [-6.8, 39.3], [1.3, 103.8]],
    commodities: ["钴", "铜精矿", "锂辉石", "稀土精矿"],
    reason: "矿区政局、出口许可与电池材料需求共同左右关键矿产流向",
  },
  {
    name: "北美—东亚半导体走廊",
    score: 70,
    points: [[47.6, -122.3], [35.6, 139.7], [25.0, 121.5], [31.2, 121.5]],
    commodities: ["半导体设备", "高端芯片", "精密仪器", "存储模组"],
    reason: "出口管制清单更新与晶圆产能调度持续改变高科技物流路径",
  },
  {
    name: "澳大利亚—东亚铁矿能源",
    score: 68,
    points: [[-31.9, 115.9], [1.3, 103.8], [31.2, 121.5]],
    commodities: ["铁矿石", "动力煤", "液化天然气 (LNG)"],
    reason: "中澳贸易关系、钢铁需求周期与海岬型船运价波动影响装运节奏",
  },
  {
    name: "中国—东南亚电子供应链",
    score: 62,
    points: [[22.5, 114.1], [21.0, 105.8], [13.7, 100.5], [-6.2, 106.8]],
    commodities: ["电子元件", "显示面板", "锂电池材料", "半成品组件"],
    reason: "产能转移、原产地规则收紧与区域自贸协定持续重塑供应链布局",
  },
  {
    name: "西非—欧洲能源原料",
    score: 66,
    points: [[6.5, 3.4], [36.7, 3.1], [51.95, 4.14]],
    commodities: ["原油", "天然气", "铝土矿", "可可豆"],
    reason: "几内亚湾安全形势与北非管道供应共同影响欧洲能源与原料补给",
  },
  {
    name: "中国—中亚能源走廊",
    score: 60,
    points: [[43.8, 87.6], [43.2, 76.9], [35.7, 51.4], [41.0, 28.9]],
    commodities: ["天然气", "原油", "有色金属", "化肥"],
    reason: "跨境管道运维、过境清关效率与区域汇率波动影响陆路能源贸易",
  },
  {
    name: "印度—中东—欧洲经济走廊",
    score: 57,
    points: [[19.1, 72.9], [25.2, 55.3], [32.8, 35.0], [37.9, 23.6], [45.6, 13.8]],
    commodities: ["香料与农产品", "纺织原料", "原油", "化工与医药中间体"],
    reason: "IMEC多式联运基建进度与海湾港口枢纽地位决定该新兴走廊承载力",
  },
];


// 分类筛选中的「AI / 机器人」「物理AI」按需求已移除，不再注入

const aiRoboticsEvents = [
  {
    id: "china-humanoid-policy",
    title: "中国多地加快人形机器人产业集群建设",
    summary: "地方产业基金、场景开放和供应链配套同步加速，核心零部件与整机量产验证成为重点。",
    category: "ai-robotics",
    categoryLabel: "人形机器人",
    countries: ["中国"],
    sectors: ["人形机器人", "精密制造", "工业自动化"],
    commodities: ["稀土永磁", "铜"],
    route: "中国先进制造供应链",
    score: 79,
    confidence: 88,
    source: "产业政策汇总",
    time: "22 分钟前",
    lon: 121,
    lat: 31,
    impact: [
      ["政策与资本", "产业基金和示范场景加速落地"],
      ["核心零部件", "减速器、丝杠、传感器需求提升"],
      ["量产验证", "成本、可靠性与供应链能力受检验"],
      ["投资影响", "具备量产能力的核心部件企业受关注"],
    ],
  },
  {
    id: "us-ai-chip-controls",
    title: "美国评估扩大 AI 加速器出口许可范围",
    summary: "先进算力芯片、互连和相关云服务可能面临更严格许可要求，区域算力部署路径受到影响。",
    category: "ai-robotics",
    categoryLabel: "AI 算力政策",
    countries: ["美国", "中国", "新加坡"],
    sectors: ["AI 芯片", "云计算", "数据中心"],
    commodities: ["铜", "电力"],
    route: "全球 AI 硬件供应链",
    score: 87,
    confidence: 82,
    source: "BIS Policy Watch",
    time: "41 分钟前",
    lon: -77,
    lat: 38,
    impact: [
      ["出口许可", "先进 AI 芯片销售范围可能收紧"],
      ["算力部署", "区域数据中心建设方案需要调整"],
      ["供应链替代", "国产算力与替代芯片投入增加"],
      ["市场影响", "AI 硬件估值与订单预期分化"],
    ],
  },
  {
    id: "japan-robot-orders",
    title: "日本工业机器人订单出现回升信号",
    summary: "汽车、电子和半导体客户自动化投资改善，精密减速器与伺服系统订单同步回暖。",
    category: "ai-robotics",
    categoryLabel: "工业机器人",
    countries: ["日本", "中国", "韩国"],
    sectors: ["工业机器人", "汽车", "半导体"],
    commodities: ["铜"],
    route: "东北亚机器人供应链",
    score: 66,
    confidence: 86,
    source: "JARA",
    time: "1 小时前",
    lon: 139,
    lat: 36,
    impact: [
      ["订单回升", "制造业自动化投资改善"],
      ["部件需求", "减速器、伺服与控制器订单提升"],
      ["区域贸易", "东北亚机器人零部件流动增加"],
      ["市场影响", "自动化产业链景气预期改善"],
    ],
  },
  {
    id: "eu-ai-act",
    title: "欧盟 AI 法规进入企业合规实施阶段",
    summary: "高风险 AI 系统需要强化数据、透明度与责任管理，工业 AI 和机器人供应商合规成本增加。",
    category: "ai-robotics",
    categoryLabel: "AI 监管",
    countries: ["欧盟"],
    sectors: ["企业软件", "工业 AI", "机器人"],
    commodities: [],
    route: "欧洲数字服务贸易",
    score: 72,
    confidence: 94,
    source: "European Commission",
    time: "2 小时前",
    lon: 4,
    lat: 50,
    impact: [
      ["法规实施", "高风险 AI 系统合规要求增加"],
      ["产品管理", "数据、模型与责任链需要可审计"],
      ["贸易影响", "进入欧洲市场的认证周期延长"],
      ["机会信号", "AI 治理与合规服务需求提升"],
    ],
  },
  {
    id: "robot-magnet-risk",
    title: "机器人伺服电机关注稀土永磁供应风险",
    summary: "高性能磁材供应集中度与出口政策变化，使机器人电机厂商加强库存和替代材料评估。",
    category: "ai-robotics",
    categoryLabel: "机器人供应链",
    countries: ["中国", "日本", "德国"],
    sectors: ["机器人", "伺服电机", "稀土材料"],
    commodities: ["稀土永磁"],
    route: "亚洲—欧洲先进制造",
    score: 78,
    confidence: 76,
    source: "Industry Supply Chain Monitor",
    time: "3 小时前",
    lon: 112,
    lat: 35,
    impact: [
      ["原料集中", "高性能永磁材料供应集中度较高"],
      ["成本风险", "电机与执行器采购成本敏感"],
      ["企业响应", "库存、回收与替代材料投入增加"],
      ["投资影响", "磁材和高效电机技术受关注"],
    ],
  },
  {
    id: "gulf-ai-infrastructure",
    title: "海湾国家扩大 AI 数据中心与机器人投资",
    summary: "主权资本加大算力基础设施、能源配套和机器人应用投资，设备与工程服务机会增加。",
    category: "ai-robotics",
    categoryLabel: "AI 基础设施",
    countries: ["阿联酋", "沙特阿拉伯"],
    sectors: ["数据中心", "能源", "服务机器人"],
    commodities: ["铜", "天然气"],
    route: "亚洲—海湾科技贸易",
    score: 74,
    confidence: 84,
    source: "Gulf Investment Monitor",
    time: "4 小时前",
    lon: 54,
    lat: 24,
    impact: [
      ["资本投入", "算力与机器人项目融资增加"],
      ["基础设施", "电力、冷却与数据中心需求提升"],
      ["贸易机会", "设备、工程与系统集成出口增加"],
      ["本地化要求", "项目落地需要本地伙伴和服务能力"],
    ],
  },
  {
    id: "sea-smart-factory",
    title: "东南亚制造商加快智能工厂与机器人部署",
    summary: "电子、汽车零部件和消费品工厂提高自动化投入，以应对劳动力成本和质量一致性要求。",
    category: "ai-robotics",
    categoryLabel: "智能制造",
    countries: ["越南", "泰国", "马来西亚"],
    sectors: ["工业机器人", "机器视觉", "电子制造"],
    commodities: [],
    route: "东南亚制造供应链",
    score: 68,
    confidence: 81,
    source: "ASEAN Manufacturing Survey",
    time: "5 小时前",
    lon: 104,
    lat: 14,
    impact: [
      ["需求变化", "自动化投资和机器人密度提升"],
      ["设备贸易", "视觉、控制器与机器人进口增加"],
      ["服务需求", "本地集成、维护与培训成为瓶颈"],
      ["机会信号", "具备海外交付能力的供应商受益"],
    ],
  },
  {
    id: "ai-power-bottleneck",
    title: "AI 数据中心电力与冷却瓶颈持续显现",
    summary: "高密度算力集群推高电力、铜缆、变压器和冷却系统需求，项目交付周期面临约束。",
    category: "ai-robotics",
    categoryLabel: "算力基础设施",
    countries: ["美国", "欧盟", "新加坡"],
    sectors: ["数据中心", "电网设备", "液冷"],
    commodities: ["铜", "天然气"],
    route: "全球算力基础设施供应链",
    score: 82,
    confidence: 90,
    source: "Data Center Infrastructure Watch",
    time: "6 小时前",
    lon: -96,
    lat: 33,
    impact: [
      ["算力需求", "高密度 AI 集群建设加速"],
      ["基础设施", "电力、变压器与液冷需求上升"],
      ["交付约束", "并网和设备交期成为项目瓶颈"],
      ["市场影响", "电网设备与冷却产业链景气提升"],
    ],
  },
];

const physicalAiEvents = [
  {
    id: "physical-ai-vla-factory",
    title: "视觉语言动作模型进入智能工厂验证",
    summary: "多模态模型开始从文本与图像理解走向真实设备控制，产线分拣、质检和柔性装配成为首批验证场景。",
    category: "physical-ai",
    categoryLabel: "物理AI",
    countries: ["美国", "中国", "德国"],
    sectors: ["具身智能", "智能制造", "机器视觉"],
    commodities: ["传感器", "边缘算力"],
    route: "全球智能制造执行层",
    score: 84,
    confidence: 84,
    source: "Physical AI Monitor",
    time: "35 分钟前",
    lon: -122,
    lat: 37,
    impact: [
      ["模型能力", "视觉语言动作模型从任务规划延伸到真实动作执行"],
      ["工厂场景", "分拣、质检、拧紧和搬运等低风险环节先落地"],
      ["硬件需求", "边缘 GPU、深度相机、力控传感器和安全控制器需求上升"],
      ["商业化路径", "从单机演示转向多设备编排和持续数据闭环"],
    ],
  },
  {
    id: "physical-ai-sim-data",
    title: "仿真数据与数字孪生成为机器人训练瓶颈突破口",
    summary: "物理世界数据采集成本高，企业加大仿真环境、合成数据和真实反馈闭环投入，以提高机器人泛化能力。",
    category: "physical-ai",
    categoryLabel: "仿真训练",
    countries: ["美国", "日本", "新加坡"],
    sectors: ["仿真平台", "机器人训练", "工业软件"],
    commodities: ["GPU", "数据中心"],
    route: "物理AI训练数据链",
    score: 79,
    confidence: 82,
    source: "Embodied AI Lab Watch",
    time: "1 小时前",
    lon: 103,
    lat: 1,
    impact: [
      ["训练数据", "真实采集与合成数据需要组合使用"],
      ["仿真平台", "数字孪生、物理引擎和场景随机化价值提升"],
      ["部署风险", "仿真到现实偏差仍是规模化落地主要约束"],
      ["机会信号", "工业软件、仿真工具链和机器人数据服务受关注"],
    ],
  },
  {
    id: "physical-ai-edge-inference",
    title: "边缘推理芯片成为物理AI落地关键约束",
    summary: "机器人和工业设备需要低延迟、高可靠、低功耗的本地推理能力，边缘 AI 芯片与传感器融合方案进入重点评估。",
    category: "physical-ai",
    categoryLabel: "边缘推理",
    countries: ["美国", "韩国", "中国台湾"],
    sectors: ["边缘 AI", "机器人控制器", "工业物联网"],
    commodities: ["半导体", "电力"],
    route: "边缘AI硬件供应链",
    score: 81,
    confidence: 80,
    source: "Edge AI Supply Chain",
    time: "2 小时前",
    lon: 121,
    lat: 24,
    impact: [
      ["实时控制", "端侧推理决定动作响应和安全冗余"],
      ["芯片需求", "低功耗 NPU、工业控制器和传感器融合模块需求上升"],
      ["供应链影响", "先进封装、存储和工业级认证周期影响交付"],
      ["投资影响", "端侧 AI 硬件、模组和工业软件栈形成新竞争点"],
    ],
  },
  {
    id: "physical-ai-safety-standard",
    title: "物理AI安全认证压力开始前置到产品设计阶段",
    summary: "当 AI 直接控制机械动作，功能安全、责任边界、远程接管和数据记录将成为客户采购前置条件。",
    category: "physical-ai",
    categoryLabel: "安全合规",
    countries: ["欧盟", "美国", "日本"],
    sectors: ["功能安全", "工业机器人", "AI 治理"],
    commodities: [],
    route: "物理AI安全合规链",
    score: 73,
    confidence: 86,
    source: "Industrial Safety Review",
    time: "3 小时前",
    lon: 10,
    lat: 50,
    impact: [
      ["认证前置", "安全设计、日志审计和远程接管能力提前进入招标条件"],
      ["部署周期", "高风险场景从试点到规模部署需要更长验证周期"],
      ["服务机会", "安全测试、合规咨询和保险定价模型需求提升"],
      ["市场分化", "具备安全工程能力的系统集成商更容易拿到订单"],
    ],
  },
];

physicalAiEvents.forEach((event) => {
  if (!events.some((item) => item.id === event.id)) events.push(event);
});

aiRoboticsEvents.forEach((event) => {
  if (!events.some((item) => item.id === event.id)) events.push(event);
});


const industryPulseItems = [
  {
    id: "industry-nvidia-physical-ai",
    domainId: "physical-ai",
    domain: "物理AI",
    company: "NVIDIA",
    ticker: "NVDA",
    type: "企业动态",
    title: "NVIDIA 将物理AI训练与边缘推理作为机器人生态重点",
    summary: "机器人基础模型、仿真训练和边缘推理硬件形成组合方案，推动物理AI从演示走向工厂、仓储和巡检场景。",
    source: "Industry Monitor",
    sourceUrl: "https://www.nvidia.com/en-us/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 86,
    sentiment: "机会上行",
    region: "美国 / 全球",
    tags: ["物理AI", "边缘推理", "仿真训练"],
    eventKeywords: ["物理AI", "边缘推理", "机器人"],
  },
  {
    id: "industry-openai-enterprise",
    domainId: "ai",
    domain: "AI",
    company: "OpenAI",
    ticker: "",
    type: "企业动态",
    title: "基础模型公司加速企业级部署与生态合作",
    summary: "模型能力竞争开始转向企业工作流、数据安全和行业应用，云厂商、软件公司与咨询服务商同步受益。",
    source: "Industry Monitor",
    sourceUrl: "https://openai.com/news/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 78,
    sentiment: "商业化加速",
    region: "美国 / 全球",
    tags: ["基础模型", "企业AI", "云服务"],
    eventKeywords: ["AI", "基础模型", "企业"],
  },
  {
    id: "industry-tesla-humanoid",
    domainId: "robotics",
    domain: "机器人",
    company: "Tesla",
    ticker: "TSLA",
    type: "企业动态",
    title: "人形机器人量产验证带动核心部件与制造工艺关注",
    summary: "市场开始关注从演示样机到小批量部署的成本、可靠性和供应链能力，执行器、传感器和电池系统成为观察重点。",
    source: "Industry Monitor",
    sourceUrl: "https://www.tesla.com/AI",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 81,
    sentiment: "量产验证",
    region: "美国 / 中国",
    tags: ["人形机器人", "执行器", "量产"],
    eventKeywords: ["人形机器人", "执行器", "量产"],
  },
  {
    id: "industry-abb-fanuc-automation",
    domainId: "robotics",
    domain: "机器人",
    company: "ABB / FANUC",
    ticker: "",
    type: "行业动态",
    title: "工业机器人订单关注汽车、电子和半导体资本开支",
    summary: "传统工业机器人景气度仍取决于制造业资本开支和自动化改造节奏，系统集成和维护服务比单机销量更能解释利润弹性。",
    source: "Industry Monitor",
    sourceUrl: "https://new.abb.com/products/robotics",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 70,
    sentiment: "温和复苏",
    region: "欧洲 / 日本 / 中国",
    tags: ["工业机器人", "自动化", "资本开支"],
    eventKeywords: ["工业机器人", "自动化", "订单"],
  },
  {
    id: "industry-edge-ai-chip",
    domainId: "compute",
    domain: "算力芯片",
    company: "Qualcomm / Arm",
    ticker: "",
    type: "行业动态",
    title: "端侧AI芯片竞争从手机扩展到机器人和工业设备",
    summary: "物理AI需要低延迟、本地推理和安全冗余，边缘AI芯片、工业控制器和传感器融合模组成为新一轮硬件竞争点。",
    source: "Industry Monitor",
    sourceUrl: "https://www.qualcomm.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 76,
    sentiment: "需求外溢",
    region: "美国 / 亚洲",
    tags: ["边缘AI", "芯片", "控制器"],
    eventKeywords: ["边缘AI", "芯片", "控制器"],
  },
];

industryPulseItems.push(
  {
    id: "industry-cloud-datacenter",
    domainId: "cloud",
    domain: "云与数据中心",
    company: "AWS / Azure / Google Cloud",
    ticker: "",
    type: "行业动态",
    title: "AI基础设施投资继续向数据中心、电力和网络设备外溢",
    summary: "大模型训练与推理需求推动云厂商资本开支上行，服务器、交换机、液冷、电力设备和数据中心REITs成为联动观察对象。",
    source: "Industry Monitor",
    sourceUrl: "https://aws.amazon.com/ai/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 79,
    sentiment: "资本开支扩张",
    region: "美国 / 全球",
    tags: ["云计算", "数据中心", "AI基础设施"],
    eventKeywords: ["云计算", "数据中心", "AI基础设施"],
  },
  {
    id: "industry-cybersecurity",
    domainId: "cybersecurity",
    domain: "网络安全",
    company: "CrowdStrike / Palo Alto Networks",
    ticker: "",
    type: "行业动态",
    title: "AI应用扩散提升身份安全、终端防护和漏洞响应需求",
    summary: "企业AI部署增加数据接入面，安全预算从传统边界防护转向身份、云工作负载、终端遥测和自动化响应。",
    source: "Industry Monitor",
    sourceUrl: "https://www.crowdstrike.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 74,
    sentiment: "需求稳健",
    region: "美国 / 全球",
    tags: ["网络安全", "身份安全", "漏洞响应"],
    eventKeywords: ["网络安全", "漏洞", "企业AI"],
  },
  {
    id: "industry-ev-battery",
    domainId: "ev-battery",
    domain: "智能汽车与电池",
    company: "BYD / CATL / Tesla",
    ticker: "",
    type: "行业动态",
    title: "智能汽车竞争从整车价格扩展到电池、算力和自动驾驶软件",
    summary: "电池成本、自动驾驶功能、车载芯片和区域政策同时影响整车厂利润率，也改变供应链议价结构。",
    source: "Industry Monitor",
    sourceUrl: "https://www.catl.com/en/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 73,
    sentiment: "竞争加剧",
    region: "中国 / 美国 / 欧洲",
    tags: ["智能汽车", "动力电池", "自动驾驶"],
    eventKeywords: ["电动车", "电池", "自动驾驶"],
  },
  {
    id: "industry-quantum",
    domainId: "quantum",
    domain: "量子科技",
    company: "IBM / IonQ / D-Wave",
    ticker: "",
    type: "行业动态",
    title: "量子计算进入技术验证与政策投入并行阶段",
    summary: "量子硬件、纠错、量子通信和密码迁移仍处早期，但政府投入和企业试点会持续制造产业信号。",
    source: "Industry Monitor",
    sourceUrl: "https://www.ibm.com/quantum",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 68,
    sentiment: "前沿观察",
    region: "美国 / 欧洲 / 中国",
    tags: ["量子计算", "量子通信", "研发投入"],
    eventKeywords: ["量子计算", "量子科技", "密码"],
  },
  {
    id: "industry-space-defense",
    domainId: "space-defense",
    domain: "航天与防务科技",
    company: "SpaceX / Palantir / Anduril",
    ticker: "",
    type: "行业动态",
    title: "卫星、无人机和防务AI成为地缘风险下的科技支出重点",
    summary: "商业航天和防务科技把硬件交付、遥感数据、边缘AI和政府采购连接在一起，订单节奏比概念热度更关键。",
    source: "Industry Monitor",
    sourceUrl: "https://www.rocketlabusa.com/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 77,
    sentiment: "订单驱动",
    region: "美国 / 全球",
    tags: ["商业航天", "卫星", "防务AI"],
    eventKeywords: ["卫星", "无人机", "防务科技"],
  },
  {
    id: "industry-consumer-devices",
    domainId: "consumer-devices",
    domain: "消费电子",
    company: "Apple / Samsung / Huawei",
    ticker: "",
    type: "行业动态",
    title: "端侧AI推动手机、PC和可穿戴设备进入新一轮规格竞争",
    summary: "模型本地推理、存储容量、NPU性能和生态入口共同决定终端换机动力，也影响上游零部件拉货节奏。",
    source: "Industry Monitor",
    sourceUrl: "https://www.apple.com/newsroom/",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 71,
    sentiment: "产品周期",
    region: "美国 / 亚洲",
    tags: ["端侧AI", "智能终端", "消费电子"],
    eventKeywords: ["端侧AI", "手机", "PC"],
  },
  {
    id: "industry-biotech",
    domainId: "biotech",
    domain: "生物科技",
    company: "Moderna / BioNTech / CRISPR",
    ticker: "",
    type: "行业动态",
    title: "AI制药和基因编辑继续围绕临床进展与监管审批定价",
    summary: "平台能力需要通过临床里程碑和合作收入验证，算力、数据、专利和监管路径共同决定商业化速度。",
    source: "Industry Monitor",
    sourceUrl: "https://www.modernatx.com/en-US/media-center",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 69,
    sentiment: "里程碑驱动",
    region: "美国 / 欧洲",
    tags: ["AI制药", "基因编辑", "临床进展"],
    eventKeywords: ["AI制药", "基因编辑", "临床"],
  },
  {
    id: "industry-fintech-crypto",
    domainId: "fintech-crypto",
    domain: "金融科技",
    company: "Stripe / PayPal / Coinbase",
    ticker: "",
    type: "行业动态",
    title: "稳定币、支付网络和加密监管改变金融科技竞争边界",
    summary: "支付公司、交易平台和传统金融机构围绕合规、清算效率和资产入口展开竞争，监管节奏决定估值弹性。",
    source: "Industry Monitor",
    sourceUrl: "https://www.coinbase.com/blog",
    publishedAt: "实时更新",
    time: "实时更新",
    score: 72,
    sentiment: "政策敏感",
    region: "美国 / 全球",
    tags: ["支付科技", "稳定币", "加密资产"],
    eventKeywords: ["稳定币", "金融科技", "加密"],
  },
);

const eventInsightOverrides = {
  "red-sea": {
    why: "红海风险并不只影响船期。它会通过绕行里程、保险费率和库存周期，直接压缩欧洲进口商与中国出口企业的利润空间。",
    assets: ["SCFI 集运指数", "布伦特原油", "航运 ETF", "欧洲零售股", "VIX"],
    indicators: ["承运商苏伊士复航公告", "战争险与船体险报价", "亚洲—欧洲即期运价", "欧洲港口到港延误"],
    horizon: "短期 · 成本上行",
  },
  "us-battery-tariff": {
    why: "关税将改变北美电池材料的到岸成本和供应商选择，并可能加速墨西哥、加拿大与东南亚的替代产能布局。",
    assets: ["USD/CNY", "锂价", "镍价", "清洁能源 ETF", "汽车零部件"],
    indicators: ["USTR 最终税目", "HS 8507 进口量", "北美电池材料价格", "墨西哥近岸投资公告"],
    horizon: "中期 · 供应链重构",
  },
  hormuz: {
    why: "霍尔木兹承担全球重要能源运输流量，任何保险与通行成本变化都会迅速传导至亚洲炼化、航空与化工企业。",
    assets: ["布伦特原油", "亚洲 LNG", "黄金", "航空股", "炼化利润"],
    indicators: ["油轮通行量", "能源船战争险", "迪拜原油升贴水", "亚洲 LNG 现货价"],
    horizon: "短期 · 能源上行",
  },
};

const additionalMarkets = [
  { symbol: "CSI300", name: "沪深 300", value: "3,688.42", change: 0.32, risk: "中性", points: [24, 22, 23, 19, 20, 16, 15, 12] },
  { symbol: "STOXX", name: "欧洲 STOXX 600", value: "514.20", change: -0.38, risk: "关注", points: [13, 14, 16, 15, 19, 21, 22, 25] },
  { symbol: "USDJPY", name: "美元 / 日元", value: "154.62", change: -0.72, risk: "高", points: [10, 12, 14, 15, 18, 20, 22, 26] },
  { symbol: "NATGAS", name: "天然气", value: "$2.86", change: 1.84, risk: "偏高", points: [25, 22, 24, 19, 17, 14, 12, 8] },
  { symbol: "ALUMINUM", name: "LME 铝", value: "$2,612", change: 0.58, risk: "关注", points: [21, 22, 20, 18, 19, 16, 14, 12] },
  { symbol: "LITHIUM", name: "碳酸锂", value: "¥102,500", change: -1.12, risk: "偏高", points: [12, 14, 15, 17, 19, 21, 23, 25] },
  { symbol: "US10Y", name: "美国十年期国债", value: "4.38%", change: 0.06, risk: "关注", points: [22, 20, 21, 18, 16, 17, 13, 11] },
  { symbol: "BTC", name: "比特币", value: "$67,840", change: -1.36, risk: "高", points: [11, 14, 12, 18, 17, 22, 20, 26] },
];

additionalMarkets.forEach((market) => {
  if (!markets.some((item) => item.symbol === market.symbol)) markets.push(market);
});

[
  ["英国", "中国 / 全球", "先进制造设备", "强化最终用户审查", "2026-06-20", 72],
  ["巴西", "全球", "绿色钢铁", "新增碳认证要求", "2026-09-01", 59],
  ["沙特阿拉伯", "全球", "新能源设备", "本地化采购规则", "2026-08-15", 64],
  ["欧盟", "中国", "电动车 / HS 8703", "反补贴复审", "审议中", 79],
].forEach((item) => {
  if (!policies.some((row) => row[0] === item[0] && row[2] === item[2])) policies.push(item);
});

[
  ["Meridian Industrial Supply", "土耳其", "EU", "强化尽调", "机械 / 金属", "2026-05-29", 69],
  ["Caspian Logistics Network", "哈萨克斯坦", "UK / EU", "转运风险", "物流 / 设备", "2026-05-27", 67],
  ["Gulf Petrochem Intermediary", "阿联酋", "OFAC", "交易审查", "能源 / 化工", "2026-05-25", 76],
].forEach((item) => {
  if (!sanctions.some((row) => row[0] === item[0])) sanctions.push(item);
});

[
  { name: "中国—中亚陆路", score: 58, status: "关注", reason: "边境清关、制裁合规与汇率风险", change: "+3 天", chokepoint: "霍尔果斯 / 里海" },
  { name: "中国—中东海运", score: 71, status: "偏高", reason: "红海与霍尔木兹风险共同影响", change: "+8% 保险", chokepoint: "马六甲 / 霍尔木兹" },
  { name: "中国—拉美海运", score: 53, status: "关注", reason: "巴拿马运河配额与港口排队波动", change: "+4 天", chokepoint: "巴拿马运河" },
].forEach((item) => {
  if (!routes.some((route) => route.name === item.name)) routes.push(item);
});

[
  { name: "阿联酋", region: "中东", score: 29 },
  { name: "哈萨克斯坦", region: "中亚", score: 57 },
  { name: "墨西哥", region: "北美", score: 52 },
].forEach((item) => {
  if (!countryRisks.some((country) => country.name === item.name)) countryRisks.push(item);
});

tabConfig.forEach((tab) => {
  if (tab.id === "markets") tab.count = markets.length;
  if (tab.id === "policy") tab.count = policies.length;
  if (tab.id === "supply") tab.count = routes.length;
  if (tab.id === "sanctions") tab.count = sanctions.length;
  if (tab.id === "brief") tab.count = Math.min(3, events.length);
});
[
  // 以下模块按需求隐藏，不再注入仪表盘标签：
  // 产业企业 / AI与机器人 / 物理AI / 国家—行业矩阵 / 机会雷达 / A股策略 / 情景推演
].forEach((tab) => {
  if (!tabConfig.some((item) => item.id === tab.id)) tabConfig.push(tab);
});

function insightFor(event) {
  const defaultIndicators = {
    supply: ["相关路线即期运价", "港口等待时间", "保险与燃油附加费", "承运商运营公告"],
    policy: ["最终政策文本", "相关 HS Code 贸易量", "进口到岸成本", "替代供应国订单"],
    sanctions: ["官方名单更新", "银行合规口径", "贸易流向变化", "相关商品升贴水"],
    market: ["价格与波动率", "成交与持仓变化", "汇率套保成本", "相关行业订单"],
    energy: ["现货升贴水", "库存与装运量", "船舶通行量", "炼化与化工利润"],
    "ai-robotics": ["量产订单与交付周期", "核心部件成本", "政策与出口许可", "终端行业资本开支"],
    "physical-ai": ["跨场景任务成功率", "端侧推理延迟", "仿真到现实误差", "安全认证与远程接管数据"],
  };
  const defaultAssets = [
    ...event.commodities,
    ...event.sectors.slice(0, 2).map((sector) => `${sector}板块`),
    event.countries.includes("中国") ? "USD/CNY" : "美元指数",
  ].filter(Boolean);
  const override = eventInsightOverrides[event.id] || {};
  return {
    why:
      override.why ||
      `${event.summary} 该事件会通过“${event.route}”向${event.sectors.slice(0, 2).join("、")}等环节传导，需结合成本、交期与合规变化判断实际影响。`,
    assets: override.assets || defaultAssets.slice(0, 5),
    indicators: override.indicators || defaultIndicators[event.category] || defaultIndicators.market,
    horizon: override.horizon || (event.score >= 80 ? "短中期 · 高影响" : "短期 · 持续观察"),
  };
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function escapeMarkup(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function eventSourceUrl(event) {
  const sourceUrl = String(event?.sourceUrl || "").trim();
  return isHttpUrl(sourceUrl) ? sourceUrl : "";
}

function eventSourceActionMarkup(event) {
  const sourceUrl = eventSourceUrl(event);
  if (!sourceUrl) return "";
  const source = event.source || "原始来源";
  return `
    <div class="event-card-actions">
      <a
        class="event-source-link"
        href="${escapeMarkup(sourceUrl)}"
        target="_blank"
        rel="noreferrer"
        title="打开原文：${escapeMarkup(source)}"
      >原文 ↗</a>
    </div>
  `;
}

function renderDetailSourceAction(event) {
  const detailPanel = document.querySelector(".selected-detail");
  const metaNode = detailPanel?.querySelector(".detail-meta");
  if (!detailPanel || !metaNode) return;

  let action = document.getElementById("detail-source-action");
  if (!action) {
    action = document.createElement("a");
    action.id = "detail-source-action";
    action.className = "detail-source-action";
    action.target = "_blank";
    action.rel = "noreferrer";
    metaNode.insertAdjacentElement("afterend", action);
  }

  const sourceUrl = eventSourceUrl(event);
  if (!sourceUrl) {
    action.hidden = true;
    action.removeAttribute("href");
    return;
  }

  const source = event.source || "原始来源";
  action.hidden = false;
  action.href = sourceUrl;
  action.textContent = `查看原文：${source} ↗`;
  action.title = `打开原始报道：${event.title}`;
}

const previousRenderSelectedEvent = renderSelectedEvent;
renderSelectedEvent = function renderSelectedEventUpgraded() {
  previousRenderSelectedEvent();
  const event = selectedEvent();
  const insight = insightFor(event);
  renderDetailSourceAction(event);
  el("why-text").textContent = insight.why;
  el("detail-horizon").textContent = insight.horizon;
  el("affected-entities").innerHTML = [
    ...event.countries.map((item) => `<span class="entity country">${escapeMarkup(item)}</span>`),
    ...event.sectors.map((item) => `<span class="entity sector">${escapeMarkup(item)}</span>`),
    ...event.commodities.map((item) => `<span class="entity commodity">${escapeMarkup(item)}</span>`),
    `<span class="entity route">${escapeMarkup(event.route)}</span>`,
  ].join("");
  el("related-assets").innerHTML = insight.assets
    .map((asset, index) => `<span><b>${index % 3 === 0 ? "↑" : index % 3 === 1 ? "↕" : "!"}</b>${escapeMarkup(asset)}</span>`)
    .join("");
  el("watch-indicators").innerHTML = insight.indicators.map((indicator) => `<li>${escapeMarkup(indicator)}</li>`).join("");
  const gAnalyze = document.getElementById("g-analyze-result");
  if (gAnalyze) gAnalyze.innerHTML = ""; // 切换事件时清空上一条的板块影响分析
};

// AI 新闻→板块影响分析（全球雷达）
function globalAnalyzeHtml(d) {
  const chips = (arr, cls) =>
    Array.isArray(arr) && arr.length
      ? arr.map((x) => `<span class="cn-imp cn-imp--${cls}">${escapeMarkup(x)}</span>`).join("")
      : `<span class="cn-empty">暂无</span>`;
  return `<div class="cn-analyze">
    <div class="cn-imp-row"><b class="cn-imp-lbl cn-imp-lbl--up">利好</b><div class="cn-imp-chips">${chips(d.bullish, "up")}</div></div>
    <div class="cn-imp-row"><b class="cn-imp-lbl cn-imp-lbl--down">利空</b><div class="cn-imp-chips">${chips(d.bearish, "down")}</div></div>
    ${d.chain ? `<p class="cn-imp-chain">${escapeMarkup(d.chain)}</p>` : ""}
    ${d.watch && d.watch.length ? `<div class="cn-imp-row"><b class="cn-imp-lbl">关注</b><div class="cn-imp-chips">${d.watch.map((x) => `<span class="cn-imp cn-imp--watch">${escapeMarkup(x)}</span>`).join("")}</div></div>` : ""}
  </div>`;
}

(() => {
  const btn = document.getElementById("g-analyze-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const e = selectedEvent();
    const res = document.getElementById("g-analyze-result");
    if (!e || !res) return;
    res.innerHTML = `<span class="cn-empty">正在分析该新闻的板块影响…</span>`;
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: e.titleZh || e.title, summary: e.summary }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "unavailable");
      res.innerHTML = globalAnalyzeHtml(d);
    } catch (err) {
      res.innerHTML = err.message === "NO_KEY"
        ? `<span class="cn-empty">需在后台「系统管理」配置 DeepSeek Key 后可用。</span>`
        : err.message === "FEATURE_OFF"
        ? `<span class="cn-empty">新闻分析已在后台关闭。</span>`
        : `<span class="cn-empty">分析失败：${escapeMarkup(err.message || "")}</span>`;
    }
  });
})();

renderEventList = function renderEventListUpgraded() {
  const list = filteredEvents();
  el("event-count").textContent = list.length;
  el("high-risk-count").textContent = events.filter((event) => event.score >= 80).length;

  if (!list.length) {
    el("event-list").innerHTML = `<div class="empty-state">没有匹配的事件。尝试切换分类或清除搜索条件。</div>`;
    return;
  }

  el("event-list").innerHTML = list
    .map((event) => {
      const insight = insightFor(event);
      return `
        <article class="event-card ${state.selectedEventId === event.id ? "active" : ""} ${eventSourceUrl(event) ? "has-source" : ""}" data-event-card-id="${event.id}">
          <button class="event-select" data-event-id="${event.id}" type="button">
            <span class="risk-score ${scoreClass(event.score)}">${event.score}</span>
            <span>
              <span class="event-meta">
                <span class="category">${event.categoryLabel}</span>
                <span>·</span>
                <span>${event.time}</span>
                <span>· ${event.confidence}% 可信</span>
              </span>
              <h3>${escapeMarkup(event.title)}</h3>
              ${event.titleZh && event.titleZh !== event.title ? `<p class="event-translation" lang="zh">${escapeMarkup(event.titleZh)}</p>` : ""}
              <p>${escapeMarkup(event.summary)}</p>
              <span class="event-context">${escapeMarkup(insight.horizon)} · ${escapeMarkup(event.route)}</span>
              <span class="event-tags">
                ${event.countries.slice(0, 2).map((item) => `<span>${escapeMarkup(item)}</span>`).join("")}
                ${event.sectors.slice(0, 2).map((item) => `<span>${escapeMarkup(item)}</span>`).join("")}
                ${event.commodities.slice(0, 1).map((item) => `<span>${escapeMarkup(item)}</span>`).join("")}
              </span>
            </span>
          </button>
          ${eventSourceActionMarkup(event)}
        </article>
      `;
    })
    .join("");
};

// 观察列表功能已按需求整体移除（不再绑定观察按钮与工作台）。

renderTabs = function renderTabsUpgraded() {
  el("dock-tabs").innerHTML = tabConfig
    .map(
      (tab) =>
        `<button class="tab-button ${state.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}" type="button">${tab.label}<b>${tab.count}</b></button>`,
    )
    .join("");
  const renders = {
    markets: renderMarketTab,
    policy: renderPolicyTab,
    supply: renderSupplyTab,
    brief: renderBriefTab,
  };
  el("dock-content").innerHTML = (renders[state.activeTab] || renderMarketTab)();
};

// 产业政策「分国家 / 33618 行业」切换（委托绑定，跨内容重渲染仍有效）
el("dock-content").addEventListener("click", (event) => {
  const button = event.target.closest("[data-gpolicy-view]");
  if (!button) return;
  state.globalPolicyView = button.dataset.gpolicyView;
  renderTabs();
});

let geoMap;
let geoLayers = {};
let fallbackScale = 1;
const layerState = { events: true, routes: true, chokepoints: true, ports: false, sanctions: false, industry: false, heatmap: false };

function leafletColor(score) {
  return score >= 80 ? "#f06f62" : score >= 65 ? "#f3b44b" : "#58d5bc";
}

function geoTooltipMarkup(title, meta, route = "", commodities = null) {
  const commoditiesLine =
    Array.isArray(commodities) && commodities.length
      ? `<span class="geo-tooltip-commodities">主要商品：${escapeMarkup(commodities.join(" / "))}</span>`
      : "";
  return `
    <span class="geo-tooltip">
      <strong>${escapeMarkup(title)}</strong>
      <span class="geo-tooltip-meta">${escapeMarkup(meta)}</span>
      ${route ? `<span class="geo-tooltip-route">${escapeMarkup(route)}</span>` : ""}
      ${commoditiesLine}
    </span>
  `;
}

function initializeGeoMap() {
  if (typeof L === "undefined") return;
  try {
    geoMap = L.map("leaflet-map", {
      center: [18, 15],
      zoom: 2,
      minZoom: 1,
      maxZoom: 7,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: "",
    }).addTo(geoMap);
    el("map-canvas").classList.add("leaflet-ready");
    renderGeoLayers();
    window.setTimeout(() => geoMap.invalidateSize(), 150);
  } catch (error) {
    console.warn("Interactive map fallback active", error);
  }
}

function renderGeoLayers() {
  if (!geoMap) return;
  Object.values(geoLayers).forEach((layer) => geoMap.removeLayer(layer));
  geoLayers = {};

  if (layerState.routes) {
    geoLayers.routes = L.layerGroup(
      routeGeography.map((route) =>
        L.polyline(route.points, {
          color: leafletColor(route.score),
          weight: route.score >= 80 ? 2.4 : 1.8,
          opacity: 0.75,
          dashArray: "7 7",
          className: "trade-route-line",
        }).bindTooltip(geoTooltipMarkup(route.name, `路线风险 ${route.score}`, route.reason, route.commodities), {
          sticky: true,
          className: "geo-map-tooltip",
        }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.events) {
    const visibleIds = new Set(filteredEvents().map((event) => event.id));
    const eventMarkers = events
      .filter((event) => visibleIds.has(event.id))
      .map((event) => {
        const marker = L.circleMarker([event.lat, event.lon], {
          radius: event.id === state.selectedEventId ? 8 : Math.max(4.5, event.score / 14),
          color: "#f4f7f5",
          weight: event.id === state.selectedEventId ? 2 : 1,
          fillColor: leafletColor(event.score),
          fillOpacity: 0.92,
          riskScore: event.score,
          className: event.id === state.selectedEventId ? "selected-geo-event" : "geo-event",
        });
        marker.bindTooltip(geoTooltipMarkup(event.title, `${event.categoryLabel} · 风险 ${event.score}`, event.route), {
          sticky: true,
          className: "geo-map-tooltip",
        });
        marker.on("click", () => {
          selectEvent(event.id);
          geoMap.flyTo([event.lat, event.lon], Math.max(geoMap.getZoom(), 3), { duration: 0.45 });
        });
        return marker;
      });
    geoLayers.events =
      typeof L.markerClusterGroup === "function"
        ? L.markerClusterGroup({
            maxClusterRadius: 42,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            iconCreateFunction(cluster) {
              const childMarkers = cluster.getAllChildMarkers();
              const avgScore = childMarkers.length
                ? Math.round(childMarkers.reduce((sum, marker) => sum + Number(marker.options.riskScore || 60), 0) / childMarkers.length)
                : 60;
              return L.divIcon({
                html: `<span style="background:${leafletColor(avgScore)}">${cluster.getChildCount()}</span>`,
                className: "geo-cluster-icon",
                iconSize: L.point(34, 34),
              });
            },
          }).addLayers(eventMarkers)
        : L.layerGroup(eventMarkers);
    geoLayers.events.addTo(geoMap);
  }

  if (layerState.chokepoints) {
    geoLayers.chokepoints = L.layerGroup(
      chokepoints.map((node) =>
        L.circleMarker([node.lat, node.lon], {
          radius: 5,
          color: leafletColor(node.score),
          weight: 2,
          fillColor: "#0d1213",
          fillOpacity: 1,
          className: "chokepoint-node",
        }).bindTooltip(`<strong>${node.name}</strong><br>风险 ${node.score} · ${node.note}`, { direction: "top" }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.ports) {
    geoLayers.ports = L.layerGroup(
      strategicPorts.map((port) =>
        L.circleMarker([port.lat, port.lon], {
          radius: 4,
          color: "#70aef3",
          weight: 2,
          fillColor: "#0d1213",
          fillOpacity: 1,
          className: "port-node",
        }).bindTooltip(`<strong>${port.name}</strong><br>${port.note}`, { direction: "top" }),
      ),
    ).addTo(geoMap);
  }

  if (layerState.sanctions) {
    const seen = {};
    geoLayers.sanctions = L.layerGroup(
      sanctions
        .map((row) => {
          const [name, country, program, action, sectors, date, score] = row;
          const base = countryCoord(country);
          if (!base) return null;
          seen[country] = (seen[country] || 0) + 1;
          const offset = (seen[country] - 1) * 1.6;
          const angle = ((seen[country] - 1) * 47 * Math.PI) / 180;
          const lat = base[0] + offset * Math.cos(angle);
          const lon = base[1] + offset * Math.sin(angle);
          return L.circleMarker([lat, lon], {
            radius: 6,
            color: "#f06f62",
            weight: 2,
            fillColor: "#06231d",
            fillOpacity: 0.85,
            dashArray: "2 3",
            className: "sanction-node",
          }).bindTooltip(
            `<strong>${escapeMarkup(name)}</strong><br>${escapeMarkup(country)} · ${escapeMarkup(program)} · ${escapeMarkup(action)}<br>涉及行业：${escapeMarkup(sectors)}<br>生效日期：${escapeMarkup(date)} · 风险 ${score}`,
            { direction: "top", className: "geo-map-tooltip" },
          );
        })
        .filter(Boolean),
    ).addTo(geoMap);
  }

  if (layerState.industry) {
    const seen = {};
    geoLayers.industry = L.layerGroup(
      industryPulseItems
        .map((item) => {
          const primaryRegion = String(item.region || "").split(/[\/、,，\s]/)[0].trim();
          const base = countryCoord(primaryRegion) || countryCoord(item.region);
          if (!base) return null;
          const key = primaryRegion || item.region;
          seen[key] = (seen[key] || 0) + 1;
          const offset = (seen[key] - 1) * 1.4;
          const angle = ((seen[key] - 1) * 63 * Math.PI) / 180;
          const lat = base[0] + offset * Math.cos(angle);
          const lon = base[1] + offset * Math.sin(angle);
          return L.circleMarker([lat, lon], {
            radius: 4.5,
            color: "#9b8cff",
            weight: 1.5,
            fillColor: "#1c1633",
            fillOpacity: 0.9,
            className: "industry-node",
          }).bindTooltip(
            `<strong>${escapeMarkup(item.title)}</strong><br>${escapeMarkup(item.domain)} · ${escapeMarkup(item.company || "行业")}<br>${escapeMarkup(item.source || "公开来源")} · ${escapeMarkup(item.time || "实时")}`,
            { direction: "top", className: "geo-map-tooltip" },
          );
        })
        .filter(Boolean),
    ).addTo(geoMap);
  }

  if (layerState.heatmap && typeof L.heatLayer === "function") {
    const visibleIds = new Set(filteredEvents().map((event) => event.id));
    const heatPoints = events
      .filter((event) => visibleIds.has(event.id) && Number.isFinite(event.lat) && Number.isFinite(event.lon))
      .map((event) => [event.lat, event.lon, Math.max(0.25, Number(event.score || 55) / 100)]);
    geoLayers.heatmap = L.heatLayer(heatPoints, {
      radius: 34,
      blur: 26,
      maxZoom: 5,
      max: 1,
      gradient: { 0.2: "#3a7bd5", 0.4: "#3ad6c6", 0.6: "#f4d35e", 0.8: "#f0934a", 1.0: "#f0625a" },
    }).addTo(geoMap);
  }
}

const previousRenderMarkers = renderMarkers;
renderMarkers = function renderMarkersUpgraded() {
  previousRenderMarkers();
  if (!geoMap) {
    const nodeMarkup = [];
    if (layerState.chokepoints) {
      chokepoints.forEach((node) => {
        nodeMarkup.push(`
          <button
            class="fallback-node chokepoint-fallback"
            type="button"
            title="${node.name} · 风险 ${node.score} · ${node.note}"
            style="left:${markerX(node.lon)}%; top:${markerY(node.lat)}%; --node-color:${scoreColor(node.score)}"
          ><i></i><span>${node.name}</span></button>
        `);
      });
    }
    if (layerState.ports) {
      strategicPorts.forEach((port) => {
        nodeMarkup.push(`
          <button
            class="fallback-node port-fallback"
            type="button"
            title="${port.name} · ${port.note}"
            style="left:${markerX(port.lon)}%; top:${markerY(port.lat)}%; --node-color:var(--blue)"
          ><i></i><span>${port.name}</span></button>
        `);
      });
    }
    if (layerState.sanctions) {
      const seen = {};
      sanctions.forEach((row) => {
        const [name, country, program, action, , , score] = row;
        const base = countryCoord(country);
        if (!base) return;
        seen[country] = (seen[country] || 0) + 1;
        const offset = (seen[country] - 1) * 1.6;
        const angle = ((seen[country] - 1) * 47 * Math.PI) / 180;
        const lat = base[0] + offset * Math.cos(angle);
        const lon = base[1] + offset * Math.sin(angle);
        nodeMarkup.push(`
          <button
            class="fallback-node sanction-fallback"
            type="button"
            title="${name} · ${country} · ${program} / ${action} · 风险 ${score}"
            style="left:${markerX(lon)}%; top:${markerY(lat)}%; --node-color:#f06f62"
          ><i></i><span>${name}</span></button>
        `);
      });
    }
    if (layerState.industry) {
      const seen = {};
      industryPulseItems.forEach((item) => {
        const primaryRegion = String(item.region || "").split(/[\/、,，\s]/)[0].trim();
        const base = countryCoord(primaryRegion) || countryCoord(item.region);
        if (!base) return;
        const key = primaryRegion || item.region;
        seen[key] = (seen[key] || 0) + 1;
        const offset = (seen[key] - 1) * 1.4;
        const angle = ((seen[key] - 1) * 63 * Math.PI) / 180;
        const lat = base[0] + offset * Math.cos(angle);
        const lon = base[1] + offset * Math.sin(angle);
        nodeMarkup.push(`
          <button
            class="fallback-node industry-fallback"
            type="button"
            title="${item.title} · ${item.domain} · ${item.company || "行业"}"
            style="left:${markerX(lon)}%; top:${markerY(lat)}%; --node-color:#9b8cff"
          ><i></i><span>${item.title}</span></button>
        `);
      });
    }
    el("map-markers").insertAdjacentHTML("beforeend", nodeMarkup.join(""));
  }
  renderGeoLayers();
};

document.querySelectorAll("[data-layer]").forEach((button) => {
  button.addEventListener("click", () => {
    const layer = button.dataset.layer;
    layerState[layer] = !layerState[layer];
    button.classList.toggle("active", layerState[layer]);
    if (geoMap) renderGeoLayers();
    else renderMarkers();
    if (!geoMap) showToast("交互地图加载后可切换该图层；当前保留离线地图视图");
  });
});

function fallbackZoom(delta) {
  fallbackScale = Math.min(1.7, Math.max(0.85, fallbackScale + delta));
  document.querySelector(".world-map").style.transform = `scale(${fallbackScale})`;
  el("map-markers").style.transform = `scale(${fallbackScale})`;
}

el("map-zoom-in").addEventListener("click", () => (geoMap ? geoMap.zoomIn() : fallbackZoom(0.15)));
el("map-zoom-out").addEventListener("click", () => (geoMap ? geoMap.zoomOut() : fallbackZoom(-0.15)));
el("map-reset").addEventListener("click", () => {
  if (geoMap) geoMap.flyTo([18, 15], 2, { duration: 0.45 });
  else {
    fallbackScale = 1;
    document.querySelector(".world-map").style.transform = "";
    el("map-markers").style.transform = "";
  }
});

const readingSizes = ["comfortable", "large", "xlarge", "max"];
let readingSizeIndex = 3;
try {
  const savedReadingSize = localStorage.getItem("geotrade-reading-size-v2");
  const savedIndex = readingSizes.indexOf(savedReadingSize);
  if (savedIndex >= 0) readingSizeIndex = savedIndex;
} catch {}

function applyReadingSize() {
  const size = readingSizes[readingSizeIndex];
  document.body.dataset.readingSize = size;
  el("font-decrease").disabled = readingSizeIndex === 0;
  el("font-increase").disabled = readingSizeIndex === readingSizes.length - 1;
  el("font-decrease").classList.toggle("active", readingSizeIndex === 0);
  el("font-increase").classList.toggle("active", readingSizeIndex > 0);
  try {
    localStorage.setItem("geotrade-reading-size-v2", size);
  } catch {}
  if (geoMap) window.setTimeout(() => geoMap.invalidateSize(), 120);
}

function readingSizeLabel(size) {
  return {
    comfortable: "舒适",
    large: "大字",
    xlarge: "特大",
    max: "超大",
  }[size];
}

el("font-decrease").addEventListener("click", () => {
  readingSizeIndex = Math.max(0, readingSizeIndex - 1);
  applyReadingSize();
  showToast(`阅读字号：${readingSizeLabel(readingSizes[readingSizeIndex])}`);
});

el("font-increase").addEventListener("click", () => {
  readingSizeIndex = Math.min(readingSizes.length - 1, readingSizeIndex + 1);
  applyReadingSize();
  showToast(`阅读字号：${readingSizeLabel(readingSizes[readingSizeIndex])}`);
});

const mapEventCount = document.querySelector('[data-layer="events"] b');
if (mapEventCount) mapEventCount.textContent = events.length;
const routesLayerCount = document.querySelector('[data-layer="routes"] b');
if (routesLayerCount) routesLayerCount.textContent = routeGeography.length;
const chokeLayerCount = document.querySelector('[data-layer="chokepoints"] b');
if (chokeLayerCount) chokeLayerCount.textContent = chokepoints.length;
const portsLayerCount = document.querySelector('[data-layer="ports"] b');
if (portsLayerCount) portsLayerCount.textContent = strategicPorts.length;
const industryLayerCountEl = document.getElementById("industry-layer-count");
if (industryLayerCountEl) industryLayerCountEl.textContent = industryPulseItems.length;

let adaptiveResizeTimer;
function applyAdaptiveLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const layout = width <= 620 ? "mobile" : width <= 920 ? "tablet" : width <= 1640 ? "compact" : "wide";
  document.body.dataset.screenLayout = layout;
  document.body.dataset.screenHeight = height <= 800 ? "short" : height >= 1000 ? "tall" : "standard";
  if (layout === "wide") el("event-rail").classList.remove("open");
  el("mobile-menu").setAttribute("aria-expanded", String(el("event-rail").classList.contains("open")));
  if (geoMap) window.setTimeout(() => geoMap.invalidateSize(), 120);
}

el("mobile-menu").addEventListener("click", () => {
  window.setTimeout(() => {
    el("mobile-menu").setAttribute("aria-expanded", String(el("event-rail").classList.contains("open")));
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".event-source-link, .detail-source-action")) return;
  const eventTarget = event.target.closest("[data-event-id]");
  const cardTarget = event.target.closest("[data-event-card-id]");
  if (cardTarget && !eventTarget) selectEvent(cardTarget.dataset.eventCardId);
  if ((eventTarget || cardTarget) && window.innerWidth <= 1640) {
    el("event-rail").classList.remove("open");
    el("mobile-menu").setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(adaptiveResizeTimer);
  adaptiveResizeTimer = window.setTimeout(applyAdaptiveLayout, 100);
});

renderFilters();
renderEventList();
renderSelectedEvent();
renderCountryRisks();
renderTabs();
renderMarkers();
applyReadingSize();
applyAdaptiveLayout();
initializeGeoMap();
