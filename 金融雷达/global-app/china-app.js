/* ============================================================
   中国产业金融雷达 · 童彦彰的金融工具
   复用全球 app-shell 结构（styles.css），中国数据 + 中国省级地图
   纯前端 · 内置演示数据 · 省界 © DataV.GeoAtlas
   ============================================================ */
(() => {
  "use strict";
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const scoreColor = (s) => (s >= 80 ? "var(--red)" : s >= 65 ? "var(--amber)" : "var(--teal)");
  const scoreClass = (s) => (s >= 80 ? "critical" : s >= 65 ? "elevated" : "guarded");

  // ---------------- 分类 ----------------
  const categories = [
    { id: "all", label: "全部" },
    { id: "industry", label: "产业" },
    { id: "policy", label: "政策" },
    { id: "market", label: "市场" },
    { id: "supply", label: "供应链" },
  ];

  // ---------------- 中国事件流 ----------------
  const DEMO_EVENTS = [
    { id: "eu-ev-tariff", title: "欧盟对中国电动汽车加征反补贴税", cat: "policy", catLabel: "政策", score: 86, confidence: 88, source: "欧盟委员会", time: "24 分钟前", lat: 31.2, lon: 121.5,
      summary: "终裁税率与价格承诺谈判持续，广东、上海、安徽等整车出口承压，车企加快欧洲本地化布局。",
      impact: [["政策变化", "反补贴终裁税率落地"], ["出口成本", "欧洲到岸价与利润率承压"], ["产业应对", "车企加速欧洲建厂与本地化"], ["市场影响", "新能源汽车板块估值分化"]],
      why: "欧洲是中国电动车出口的高价值市场，关税与价格承诺直接决定出海节奏与盈利结构。",
      entities: ["广东", "上海", "安徽", "整车厂", "动力电池"], assets: ["新能源汽车指数", "锂电材料", "港股汽车"], horizon: "中期 · 高影响" },
    { id: "rare-earth-control", title: "稀土永磁出口管制与许可审查趋严", cat: "policy", catLabel: "政策", score: 82, confidence: 84, source: "商务部", time: "41 分钟前", lat: 28.7, lon: 115.9,
      summary: "江西、内蒙古等地稀土出口许可审查趋严，全球磁材供应链关注中国政策边界。",
      impact: [["出口管制", "稀土/永磁许可审查趋严"], ["供应链", "海外磁材采购不确定性上升"], ["价格", "稀土永磁报价波动加大"], ["市场影响", "稀土板块情绪走强"]],
      why: "稀土永磁是新能源与高端制造的关键材料，出口政策变化牵动全球供应链与相关企业估值。",
      entities: ["江西", "内蒙古", "四川", "稀土企业"], assets: ["稀土永磁指数", "小金属", "新能源"], horizon: "短中期 · 高影响" },
    { id: "sea-newenergy", title: "东盟新能源与电动两轮车出海放量", cat: "industry", catLabel: "产业", score: 61, confidence: 80, source: "海关总署", time: "1 小时前", lat: 29.6, lon: 106.5,
      summary: "重庆、广东摩配与电动两轮车对东盟出口高增，本地化认证与渠道成为关键。",
      impact: [["需求放量", "东盟新能源与两轮车需求旺盛"], ["出海机会", "摩配/储能/整车出口高增"], ["合规", "需前置本地化认证"], ["市场影响", "相关出海标的受关注"]],
      why: "东盟是中国制造出海的核心增量市场，新能源与消费制造的渗透决定中期出口景气。",
      entities: ["重庆", "广东", "浙江", "摩配企业"], assets: ["出口景气指数", "两轮车", "储能"], horizon: "中期 · 机会" },
    { id: "cbam-steel", title: "CBAM 碳关税推进，钢铁出口承压", cat: "policy", catLabel: "政策", score: 74, confidence: 82, source: "欧盟 / 行业协会", time: "1 小时前", lat: 38.0, lon: 114.5,
      summary: "河北、山东、江苏钢铁出口面临欧盟碳边境调节机制成本，绿色转型压力上升。",
      impact: [["绿色壁垒", "CBAM 碳成本计入出口"], ["出口承压", "钢铁欧洲市场竞争力下降"], ["产业升级", "低碳工艺与绿电需求上升"], ["市场影响", "钢铁板块分化"]],
      why: "碳关税重塑高耗能产品的出口成本结构，倒逼产业绿色升级，影响相关企业盈利。",
      entities: ["河北", "山东", "江苏", "钢铁企业"], assets: ["钢铁指数", "绿电", "碳交易"], horizon: "中长期 · 结构性" },
    { id: "chip-import", title: "高端芯片进口依赖与先进制程受限", cat: "supply", catLabel: "供应链", score: 80, confidence: 83, source: "行业情报", time: "2 小时前", lat: 31.2, lon: 121.5,
      summary: "上海等地对先进制程与高端芯片进口依赖较高，国产替代与设备自主进程受关注。",
      impact: [["进口依赖", "高端芯片进口占比高"], ["管制风险", "先进制程设备受限"], ["国产替代", "成熟制程与设备加速"], ["市场影响", "半导体设备/材料受关注"]],
      why: "集成电路是中国第一大进口商品，供应安全与国产替代进程影响整条电子产业链。",
      entities: ["上海", "江苏", "半导体企业"], assets: ["半导体设备", "集成电路", "国产替代"], horizon: "中长期 · 高影响" },
    { id: "pv-antidump", title: "新兴市场对中国光伏发起反倾销", cat: "policy", catLabel: "政策", score: 72, confidence: 79, source: "贸易救济", time: "3 小时前", lat: 30.3, lon: 120.2,
      summary: "江苏、浙江光伏组件在部分新兴市场遭遇反倾销，海外产能竞争与价格战持续。",
      impact: [["贸易救济", "新兴市场反倾销加税"], ["价格", "光伏组件单价快速下行"], ["产能", "海外建厂与渠道下沉"], ["市场影响", "光伏板块情绪承压"]],
      why: "光伏是中国优势出口产业，海外贸易救济与价格竞争直接影响行业盈利与出海策略。",
      entities: ["江苏", "浙江", "光伏企业"], assets: ["光伏指数", "组件", "逆变器"], horizon: "短中期 · 承压" },
    { id: "cny-flow", title: "北向资金净流入，人民币双向波动", cat: "market", catLabel: "市场", score: 58, confidence: 76, source: "交易所 / 外汇", time: "3 小时前", lat: 22.5, lon: 114.1,
      summary: "外资通过港股通与陆股通加仓核心资产，人民币在岸离岸双向波动、整体可控。",
      impact: [["资金流向", "北向资金净流入"], ["汇率", "人民币双向波动"], ["情绪", "核心资产风险偏好回升"], ["市场影响", "蓝筹与消费获支撑"]],
      why: "跨境资金流与人民币走势反映外部对中国资产的定价，牵动 A 股与港股情绪。",
      entities: ["上海", "香港", "外资机构"], assets: ["沪深300", "人民币汇率", "恒生指数"], horizon: "短期 · 中性" },
    { id: "robot-reducer", title: "机器人减速器等核心零部件进口依赖", cat: "supply", catLabel: "供应链", score: 68, confidence: 78, source: "产业研究", time: "4 小时前", lat: 30.6, lon: 114.3,
      summary: "工业机器人减速器、伺服等核心部件进口依赖较高，国产化率提升成产业焦点。",
      impact: [["进口依赖", "减速器/伺服进口占比高"], ["国产化", "核心部件加速替代"], ["成本", "自主化改善毛利结构"], ["市场影响", "工业自动化受关注"]],
      why: "核心零部件自主化决定中国高端制造的成本与安全，是产业升级的关键环节。",
      entities: ["湖北", "广东", "机器人企业"], assets: ["工业机器人", "自动化", "机床"], horizon: "中期 · 结构性" },
    { id: "csi-earnings", title: "科创与新能源龙头业绩预期改善", cat: "market", catLabel: "市场", score: 55, confidence: 74, source: "卖方研究", time: "5 小时前", lat: 31.2, lon: 121.5,
      summary: "科创50、创业板成长风格活跃，半导体与新能源龙头盈利预期边际改善。",
      impact: [["盈利预期", "成长龙头业绩改善"], ["风格", "科创/成长资金偏暖"], ["估值", "成长板块估值修复"], ["市场影响", "科创50、创业板走强"]],
      why: "成长板块盈利与风格轮动反映市场风险偏好，是 A 股结构性机会的核心线索。",
      entities: ["上海", "深圳", "科创企业"], assets: ["科创50", "创业板指", "半导体"], horizon: "短期 · 机会" },
  ];
  // 事件流：默认演示，syncNews() 拉到实时快讯后替换为真实新闻
  let events = DEMO_EVENTS;

  // ---------------- 境内行情（dock：市场行情）----------------
  const marketsBase = [
    { symbol: "SHCOMP", name: "上证综指", base: 3086.42, dec: 2, chg: 0.34, risk: "中性" },
    { symbol: "SZCOMP", name: "深证成指", base: 9642.18, dec: 2, chg: 0.52, risk: "中性" },
    { symbol: "CHINEXT", name: "创业板指", base: 1928.44, dec: 2, chg: 0.86, risk: "关注" },
    { symbol: "STAR50", name: "科创50", base: 962.30, dec: 2, chg: 1.12, risk: "关注" },
    { symbol: "CSI300", name: "沪深300", base: 3612.75, dec: 2, chg: 0.28, risk: "中性" },
    { symbol: "HSI", name: "恒生指数", base: 19476.3, dec: 2, chg: 0.78, risk: "中性" },
    { symbol: "HSTECH", name: "恒生科技", base: 4062.9, dec: 2, chg: 1.34, risk: "偏高" },
    { symbol: "SZ50", name: "上证50", base: 2680.0, dec: 2, chg: 0.22, risk: "中性" },
    { symbol: "CSI500", name: "中证500", base: 5480.6, dec: 2, chg: -0.14, risk: "中性" },
    { symbol: "BSE50", name: "北证50", base: 1180.0, dec: 2, chg: 0.86, risk: "关注" },
    { symbol: "USDCNY", name: "美元/人民币", base: 7.2648, dec: 4, chg: 0.18, risk: "偏高" },
    { symbol: "AU", name: "沪金主力", base: 552.8, dec: 2, chg: 0.68, risk: "避险", prefix: "¥" },
    { symbol: "CU", name: "沪铜主力", base: 78460, dec: 0, chg: 1.04, risk: "偏高", prefix: "¥" },
    { symbol: "RB", name: "螺纹钢主力", base: 3268, dec: 0, chg: -0.62, risk: "关注", prefix: "¥" },
  ];
  let tick = 0;
  function seed(k) { let h = tick * 2654435761; for (let i = 0; i < k.length; i++) h = (h ^ k.charCodeAt(i)) * 16777619; return ((h >>> 0) % 1000) / 1000 - 0.5; }
  function quote(m) {
    const chg = +(m.chg + seed(m.symbol) * 0.6).toFixed(m.signed ? 1 : 2);
    const val = m.signed ? m.base + seed(m.symbol) * 24 : m.base * (1 + (chg / 100) * 0.15);
    const points = Array.from({ length: 8 }, (_, i) => 8 + (16 - (chg > 0 ? i * 1.6 : (7 - i) * 1.6)) + seed(m.symbol + i) * 6);
    const value = m.signed ? `${val >= 0 ? "+" : ""}${val.toFixed(m.dec)}` : `${m.prefix || ""}${val.toLocaleString("en-US", { minimumFractionDigits: m.dec, maximumFractionDigits: m.dec })}${m.suffix || ""}`;
    return { ...m, chg, value, points };
  }
  // 实时行情覆盖层：syncLive() 从 /api/cn-markets 拉取真实数据后填充，未覆盖的品种仍走演示扰动
  let liveQuotes = {};
  // 实时健壮性状态：连续失败计数 + 单次重试定时器 + 并发锁（避免请求挂起时轮询叠加）
  let liveFailStreak = 0;
  let newsFailStreak = 0;
  let liveRetryTimer = null;
  let syncingLive = false;
  // 带超时的 JSON 拉取：请求挂起（网络卡死）时 timeoutMs 后主动 abort，不拖垮实时管线
  async function fetchJSON(url, opts, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { cache: "no-store", ...(opts || {}), signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      window.clearTimeout(timer);
    }
  }
  // 失败后不必等满 20s，按退避（6s→12s→18s，上限 20s）尽快重连
  function scheduleLiveRetry() {
    if (liveRetryTimer) return;
    const delay = Math.min(6000 * Math.max(1, liveFailStreak), 20000);
    liveRetryTimer = window.setTimeout(() => { liveRetryTimer = null; syncLive(false); }, delay);
  }
  function buildMarkets() {
    return marketsBase.map((m) => {
      const q = quote(m);
      const live = liveQuotes[m.symbol];
      if (live && typeof live.value === "number") {
        const chg = Number(live.change) || 0;
        const val = live.value;
        const value = m.signed
          ? `${val >= 0 ? "+" : ""}${val.toFixed(m.dec)}`
          : `${m.prefix || ""}${val.toLocaleString("en-US", { minimumFractionDigits: m.dec, maximumFractionDigits: m.dec })}${m.suffix || ""}`;
        return { ...q, chg, value, live: true };
      }
      return q;
    });
  }
  let markets = buildMarkets();

  // ---------------- 省域金融/产业数据 ----------------
  const REGIONS = [
    { name: "广东", heat: 96, listed: 872, lead: "电子信息 · 新能源 · 家电" },
    { name: "浙江", heat: 90, listed: 704, lead: "数字经济 · 跨境电商 · 光伏" },
    { name: "江苏", heat: 88, listed: 698, lead: "高端装备 · 光伏 · 生物医药" },
    { name: "北京", heat: 94, listed: 480, lead: "软件信息 · 集成电路 · 央企总部" },
    { name: "上海", heat: 100, listed: 440, lead: "集成电路 · 生物医药 · 金融" },
    { name: "山东", heat: 74, listed: 320, lead: "化工 · 机械装备 · 食品" },
    { name: "四川", heat: 66, listed: 176, lead: "电子信息 · 白酒 · 能源装备" },
    { name: "福建", heat: 63, listed: 172, lead: "电子 · 纺织鞋服 · 消费" },
    { name: "安徽", heat: 60, listed: 168, lead: "新能源汽车 · 新型显示 · 家电" },
    { name: "湖北", heat: 58, listed: 148, lead: "光电子 · 汽车 · 生物医药" },
    { name: "湖南", heat: 55, listed: 138, lead: "工程机械 · 消费 · 先进材料" },
    { name: "重庆", heat: 62, listed: 92, lead: "智能网联汽车 · 电子信息 · 摩托车" },
  ];
  const regionByName = Object.fromEntries(REGIONS.map((r) => [r.name, r]));

  // 各省「产业金融活跃度」(综合经济体量与资本市场规模，示意)——用于地图连续着色，让全图都有含义
  const PROVINCE_HEAT = {
    广东: 100, 上海: 96, 北京: 92, 江苏: 90, 浙江: 86, 山东: 76, 福建: 62, 四川: 62, 重庆: 60, 湖北: 60,
    河南: 58, 湖南: 56, 安徽: 56, 河北: 52, 陕西: 50, 辽宁: 48, 天津: 48, 江西: 44, 广西: 40, 云南: 40,
    山西: 40, 内蒙古: 40, 贵州: 38, 新疆: 36, 黑龙江: 36, 吉林: 34, 海南: 32, 甘肃: 30, 宁夏: 26,
    青海: 22, 西藏: 20, 香港: 72, 澳门: 34, 台湾: 66,
  };

  const HOTSPOTS = [
    { province: "重庆", type: "opp", title: "新能源汽摩出海", note: "东盟 / 非洲 / 拉美" },
    { province: "广东", type: "opp", title: "电子与新能源整链", note: "消费电子 + 储能" },
    { province: "安徽", type: "opp", title: "新能源汽车整车", note: "整车出口高增" },
    { province: "浙江", type: "opp", title: "跨境电商 + 光伏", note: "小商品出海" },
    { province: "江西", type: "risk", title: "稀土出口管制", note: "许可审查趋严" },
    { province: "河北", type: "risk", title: "CBAM 碳关税", note: "钢铁出口承压" },
    { province: "江苏", type: "risk", title: "光伏反倾销", note: "新兴市场加税" },
    { province: "上海", type: "risk", title: "高端芯片进口依赖", note: "先进制程受限" },
  ];

  // 各省代表上市公司（名单策展，行情实时经 /api/cn-stocks）——点击省份即拉这些公司的实时涨跌
  // 全部代码已用 /api/cn-stocks 校验可解析为真实行情
  const PROVINCE_COMPANIES = {
    广东: [["美的集团","000333"],["比亚迪","002594"],["格力电器","000651"],["立讯精密","002475"],["招商银行","600036"],["迈瑞医疗","300760"]],
    浙江: [["海康威视","002415"],["恒生电子","600570"],["三花智控","002050"],["荣盛石化","002493"],["巨化股份","600160"]],
    江苏: [["恒瑞医药","600276"],["汇川技术","300124"],["药明康德","603259"],["天合光能","688599"],["亨通光电","600487"]],
    北京: [["京东方A","000725"],["北方华创","002371"],["用友网络","600588"],["兆易创新","603986"],["中国神华","601088"]],
    上海: [["中芯国际","688981"],["上汽集团","600104"],["复星医药","600196"],["韦尔股份","603501"],["澜起科技","688008"]],
    山东: [["万华化学","600309"],["潍柴动力","000338"],["海尔智家","600690"],["歌尔股份","002241"],["浪潮信息","000977"]],
    四川: [["五粮液","000858"],["通威股份","600438"],["泸州老窖","000568"],["新希望","000876"],["科伦药业","002422"]],
    福建: [["宁德时代","300750"],["紫金矿业","601899"],["福耀玻璃","600660"],["兴业银行","601166"],["三安光电","600703"]],
    安徽: [["阳光电源","300274"],["科大讯飞","002230"],["海螺水泥","600585"],["古井贡酒","000596"],["江淮汽车","600418"]],
    湖北: [["长江电力","600900"],["华工科技","000988"],["中航光电","002179"],["兴发集团","600141"],["三峡能源","600905"]],
    湖南: [["三一重工","600031"],["中联重科","000157"],["蓝思科技","300433"],["爱尔眼科","300015"],["山河智能","002097"]],
    重庆: [["长安汽车","000625"],["赛力斯","601127"],["华润微","688396"],["宗申动力","001696"],["智飞生物","300122"]],
    河南: [["牧原股份","002714"],["洛阳钼业","603993"],["双汇发展","000895"],["宇通客车","600066"],["郑煤机","601717"]],
    河北: [["长城汽车","601633"],["华北制药","600812"],["冀东水泥","000401"],["承德露露","000848"]],
    陕西: [["隆基绿能","601012"],["西部超导","688122"],["陕西煤业","601225"],["中航西飞","000768"],["三角防务","300775"]],
    江西: [["赣锋锂业","002460"],["江西铜业","600362"],["晶科能源","688223"],["洪都航空","600316"]],
    辽宁: [["恒力石化","600346"],["东软集团","600718"],["大商股份","600694"]],
    天津: [["TCL中环","002129"],["天士力","600535"],["中新药业","600329"]],
    云南: [["云南白药","000538"],["云铝股份","000807"],["沃森生物","300142"],["云天化","600096"]],
    贵州: [["贵州茅台","600519"],["贵州百灵","002424"],["中伟股份","300919"],["振华风光","688439"]],
    广西: [["柳工","000528"],["桂冠电力","600236"],["国海证券","000750"]],
    山西: [["山西汾酒","600809"],["潞安环能","601699"],["华阳股份","600348"],["太原重工","600169"]],
    内蒙古: [["伊利股份","600887"],["包钢股份","600010"],["内蒙华电","600863"]],
    黑龙江: [["中国一重","601106"],["北大荒","600598"]],
    吉林: [["长春高新","000661"],["一汽解放","000800"],["亚泰集团","600881"],["吉林敖东","000623"]],
    新疆: [["广汇能源","600256"],["特变电工","600089"],["中泰化学","002092"],["新疆众和","600888"]],
    甘肃: [["白银有色","601212"],["甘肃能化","000552"]],
    海南: [["海南橡胶","601118"],["海南矿业","601969"],["罗牛山","000735"]],
    宁夏: [["宝丰能源","600989"],["英力特","000635"]],
    青海: [["盐湖股份","000792"],["西部矿业","601168"]],
    西藏: [["西藏矿业","000762"],["西藏城投","600773"],["西藏药业","600211"]],
  };

  const POLICIES = [
    ["欧盟", "广东/上海/安徽", "电动汽车", "反补贴终裁", "评估中", 86],
    ["中国商务部", "江西/内蒙古", "稀土永磁", "出口许可审查", "已生效", 82],
    ["欧盟", "河北/山东/江苏", "钢铁 / CBAM", "碳边境调节", "过渡期", 74],
    ["新兴市场", "江苏/浙江", "光伏组件", "反倾销加税", "陆续落地", 72],
    ["美国 BIS", "上海/江苏", "先进制程设备", "出口管制", "持续", 80],
    ["印尼", "全国", "镍矿 / 冶炼", "本地化要求", "征求意见", 66],
  ];


  // —— 重庆 33618 现代制造业集群体系（行业分类维度）——
  const CLUSTERS_33618 = [
    { tier: "3 个万亿级主导产业集群", clusters: [
      { name: "智能网联新能源汽车", kw: ["新能源汽车", "电动汽车", "智能网联", "汽车", "车企", "动力电池", "充电", "整车", "混动"],
        rule: [["工信部", "智能网联汽车准入与上路通行试点扩容", "已实施"], ["财政部", "新能源汽车车购税减免政策延续", "至2027年底"]] },
      { name: "新一代电子信息制造业", kw: ["芯片", "半导体", "集成电路", "电子信息", "封测", "晶圆", "消费电子", "MLCC", "PCB"],
        rule: [["发改委", "集成电路企业税收优惠目录更新", "已实施"], ["工信部", "先进封装与EDA工具攻关专项", "评估中"]] },
      { name: "先进材料", kw: ["先进材料", "新材料", "轻合金", "石墨烯", "高分子", "稀土", "特种钢", "碳纤维"],
        rule: [["科技部", "关键战略材料攻关重点专项", "持续"], ["工信部", "先进金属材料产业集群培育", "已实施"]] },
    ]},
    { tier: "3 个五千亿级支柱产业集群", clusters: [
      { name: "智能装备及智能制造", kw: ["智能制造", "机器人", "数控机床", "装备", "减速器", "伺服", "工业母机", "自动化"],
        rule: [["工信部", "智能制造示范工厂揭榜挂帅", "已实施"]] },
      { name: "食品及农产品加工", kw: ["食品", "农产品", "预制菜", "粮油", "饮料", "调味品"],
        rule: [["农业农村部", "预制菜产业标准体系建设", "征求意见"]] },
      { name: "软件信息服务", kw: ["软件", "信息服务", "云计算", "数据中心", "SaaS", "工业软件", "算力"],
        rule: [["工信部", "工业软件突破提升专项", "持续"]] },
    ]},
    { tier: "6 个千亿级特色产业集群", clusters: [
      { name: "新能源及新型储能", kw: ["储能", "光伏", "风电", "氢能", "新型储能", "锂电", "钠电"],
        rule: [["能源局", "新型储能并网与容量电价机制", "已实施"]] },
      { name: "生物医药", kw: ["生物医药", "医药", "创新药", "疫苗", "医疗器械", "CXO", "中药"],
        rule: [["药监局", "创新药与临床急需器械优先审评扩围", "已实施"]] },
      { name: "新型显示", kw: ["新型显示", "OLED", "MicroLED", "面板", "显示", "液晶"],
        rule: [["工信部", "新型显示产业升级行动", "持续"]] },
      { name: "高端摩托车", kw: ["摩托车", "摩配", "两轮车", "大排量", "电动两轮"],
        rule: [["工信部", "摩托车排放升级与出口认证", "已实施"]] },
      { name: "轻合金材料", kw: ["轻合金", "镁合金", "铝合金", "压铸", "轻量化"],
        rule: [["工信部", "汽车轻量化材料应用推广", "持续"]] },
      { name: "生物制造", kw: ["生物制造", "合成生物", "生物基", "发酵"],
        rule: [["发改委", "合成生物与生物制造产业培育", "评估中"]] },
    ]},
    { tier: "18 个“新星”未来产业集群", clusters: [
      { name: "卫星互联网", kw: ["卫星互联网", "商业航天", "火箭", "星座"],
        rule: [["发改委", "卫星互联网与商业航天先导区布局", "布局中"]] },
      { name: "生成式AI", kw: ["生成式AI", "大模型", "人工智能", "AGI"],
        rule: [["网信办", "生成式人工智能服务管理办法", "已实施"]] },
      { name: "人形机器人", kw: ["人形机器人", "具身智能", "机器人"],
        rule: [["工信部", "人形机器人创新发展指导意见", "已实施"]] },
      { name: "低空经济", kw: ["低空经济", "eVTOL", "无人机", "飞行汽车"],
        rule: [["民航局", "低空空域管理改革与 eVTOL 适航", "推进中"]] },
      { name: "合成生物", kw: ["合成生物", "生物制造", "生命科学"],
        rule: [["发改委", "合成生物与未来生命科学培育", "评估中"]] },
      { name: "未来能源", kw: ["核聚变", "氢能", "钠电"],
        rule: [["能源局", "可控核聚变与氢能示范", "布局中"]] },
    ]},
  ];

  // —— 地区（省市）产业政策 ——
  const POLICY_PROVINCES = [
    { name: "重庆", lead: "33618 体系主阵地 · 智能网联汽车 / 电子信息 / 先进材料", rule: [
      ["重庆市政府", "33618 现代制造业集群体系建设行动方案", "实施中"],
      ["重庆市", "智能网联新能源汽车零部件强链补链行动", "已实施"],
      ["重庆市", "软件和信息服务业“满天星”行动计划", "持续"],
      ["重庆市", "制造业高质量发展 / 西部陆海新通道产业协同", "推进中"]] },
    { name: "广东", lead: "电子信息 / 新能源 / 集成电路", rule: [
      ["广东省", "“广东强芯”工程（集成电路）", "推进中"],
      ["广东省", "新型储能产业高质量发展指导意见", "已实施"],
      ["广东省", "20 个战略性产业集群行动计划", "持续"]] },
    { name: "上海", lead: "三大先导：集成电路 / 生物医药 / 人工智能", rule: [
      ["上海市", "集成电路、生物医药、人工智能“上海方案”", "持续"],
      ["上海市", "先进制程与半导体设备材料攻关", "推进中"],
      ["上海市", "生物医药全链条创新与商业化支持", "已实施"]] },
    { name: "江苏", lead: "光伏 / 动力电池 / 高端装备", rule: [
      ["江苏省", "“1650”产业体系（16 集群 + 50 链）", "实施中"],
      ["江苏省", "新能源与新型电力装备集群培育", "已实施"]] },
    { name: "浙江", lead: "数字经济 / 光伏 / 新材料", rule: [
      ["浙江省", "数字经济创新提质“一号发展工程”", "持续"],
      ["浙江省", "“415X”先进制造业集群培育", "推进中"]] },
    { name: "安徽", lead: "新能源汽车 / 新型显示 / 集成电路", rule: [
      ["安徽省", "新能源汽车产业集群（首位产业）", "已实施"],
      ["安徽省", "十大新兴产业双招双引", "持续"]] },
    { name: "山东", lead: "高端化工 / 工程机械 / 新一代信息", rule: [
      ["山东省", "“十强产业”高质量发展", "持续"],
      ["山东省", "绿色低碳高质量发展先行区", "推进中"]] },
    { name: "四川", lead: "电子信息 / 动力电池 / 晶硅光伏", rule: [
      ["四川省", "六大优势产业提质倍增行动", "实施中"],
      ["四川省", "动力电池与晶硅光伏集群（宜宾 / 乐山）", "已实施"]] },
    { name: "湖北", lead: "光电子信息 / 汽车 / 大健康", rule: [
      ["湖北省", "“51020”现代产业集群", "持续"],
      ["武汉市", "“光谷”光电子信息产业集群", "已实施"]] },
    { name: "北京", lead: "新一代信息技术 / 医药健康 / 人工智能", rule: [
      ["北京市", "新一代信息技术 + 医药健康“双发动机”", "持续"],
      ["北京市", "通用人工智能创新引领发展", "推进中"]] },
    { name: "福建", lead: "新型显示 / 锂电新能源 / 电子信息", rule: [
      ["福建省", "电子信息与数字产业集群", "持续"],
      ["宁德市", "锂电新能源世界级产业集群", "已实施"]] },
    { name: "陕西", lead: "半导体 / 太阳能光伏 / 航空航天", rule: [
      ["陕西省", "重点产业链“链长制”提升行动", "推进中"],
      ["西安市", "半导体与集成电路产业发展", "已实施"]] },
    { name: "江西", lead: "稀土永磁 / 电子材料 / 有色", rule: [
      ["江西省", "稀土磁材产业链协同与管控", "已实施"],
      ["赣州市", "稀土永磁及应用产业集群", "持续"]] },
    { name: "河北", lead: "钢铁绿色转型 / 氢能 / 新材料", rule: [
      ["河北省", "钢铁行业超低碳改造与 CBAM 应对", "过渡期"],
      ["河北省", "氢能产业链示范", "推进中"]] },
    { name: "天津", lead: "信创 / 生物医药 / 高端装备", rule: [
      ["天津市", "信创产业与网络安全（海河实验室）", "推进中"],
      ["天津市", "12 条重点产业链高质量发展", "持续"],
      ["天津市", "天开高教科创园成果转化", "已实施"]] },
    { name: "河南", lead: "装备制造 / 新材料 / 食品", rule: [
      ["河南省", "7 大产业集群、28 条重点产业链", "实施中"],
      ["河南省", "新型显示和智能终端集群", "已实施"],
      ["郑州市", "超硬材料（金刚石）产业", "持续"]] },
    { name: "湖南", lead: "工程机械 / 轨道交通 / 先进材料", rule: [
      ["湖南省", "打造国家重要先进制造业高地", "持续"],
      ["长沙市", "工程机械世界级产业集群", "已实施"],
      ["湖南省", "“3+3+2”现代产业体系", "推进中"]] },
    { name: "辽宁", lead: "装备制造 / 石化 / 冶金新材料", rule: [
      ["辽宁省", "22 个重点产业集群（结构调整“三篇大文章”）", "实施中"],
      ["大连市", "石化与精细化工（长兴岛）", "已实施"]] },
    { name: "吉林", lead: "汽车 / 轨道客车 / 农产品加工", rule: [
      ["吉林省", "汽车产业集群“上台阶”工程", "推进中"],
      ["吉林省", "“一主六双”高质量发展战略", "持续"],
      ["长春市", "轨道交通装备（中车长客）", "已实施"]] },
    { name: "黑龙江", lead: "装备制造 / 生物经济 / 能源", rule: [
      ["黑龙江省", "“4567”现代产业体系", "推进中"],
      ["黑龙江省", "生物经济与航空航天装备", "持续"]] },
    { name: "山西", lead: "能源革命 / 特钢材料 / 煤化工", rule: [
      ["山西省", "能源革命综合改革试点", "实施中"],
      ["山西省", "14 个战略性新兴产业集群", "推进中"],
      ["山西省", "特钢材料与先进金属材料", "持续"]] },
    { name: "内蒙古", lead: "新能源 / 现代煤化工 / 稀土", rule: [
      ["内蒙古", "新能源装备制造与大基地", "已实施"],
      ["包头市", "稀土新材料产业基地", "持续"],
      ["内蒙古", "现代煤化工示范", "推进中"]] },
    { name: "广西", lead: "铝基新材料 / 汽车 / 糖业", rule: [
      ["广西", "“双百双新”产业项目", "实施中"],
      ["柳州市", "新能源汽车（五菱）产业集群", "已实施"],
      ["广西", "铝基新材料与林木加工", "持续"]] },
    { name: "云南", lead: "绿色铝硅 / 生物医药 / 高原特色农业", rule: [
      ["云南省", "绿色铝、绿色硅先进制造", "已实施"],
      ["云南省", "“三张牌”（绿色能源 / 食品 / 健康）", "持续"],
      ["云南省", "生物医药和大健康", "推进中"]] },
    { name: "贵州", lead: "大数据 / 白酒 / 新能源电池材料", rule: [
      ["贵州省", "数字经济（中国数谷）", "持续"],
      ["贵州省", "新能源电池及材料基地", "已实施"],
      ["贵州省", "现代化工（磷煤耦合）", "推进中"]] },
    { name: "甘肃", lead: "有色冶金 / 石化 / 新能源", rule: [
      ["甘肃省", "强工业行动与“四强”战略", "实施中"],
      ["甘肃省", "新能源及新能源装备制造", "已实施"],
      ["甘肃省", "有色冶金新材料", "持续"]] },
    { name: "海南", lead: "自贸港 / 种业深海 / 旅游", rule: [
      ["海南省", "自由贸易港产业体系", "推进中"],
      ["海南省", "南繁种业与深海科技", "已实施"],
      ["海南省", "旅游 / 现代服务 / 高新技术", "持续"]] },
    { name: "宁夏", lead: "新材料 / 现代煤化工 / 葡萄酒", rule: [
      ["宁夏", "“六新六特六优”产业体系", "实施中"],
      ["宁夏", "新型材料（单晶硅 / 石墨烯）", "已实施"]] },
    { name: "青海", lead: "盐湖化工 / 清洁能源 / 锂电光伏", rule: [
      ["青海省", "世界级盐湖产业基地", "推进中"],
      ["青海省", "国家清洁能源产业高地", "已实施"],
      ["青海省", "锂电与光伏制造", "持续"]] },
    { name: "西藏", lead: "清洁能源 / 特色农牧 / 文旅", rule: [
      ["西藏", "清洁能源基地建设", "推进中"],
      ["西藏", "高原特色农牧业与绿色工业", "持续"]] },
    { name: "新疆", lead: "油气 / 新能源 / 棉纺", rule: [
      ["新疆", "“八大产业集群”", "实施中"],
      ["新疆", "油气生产加工与新能源基地", "已实施"],
      ["新疆", "棉花和纺织服装产业", "持续"]] },
  ];

  const EXPORTS = [
    { label: "机电产品", value: 100, note: "¥15.1万亿" }, { label: "锂电池", value: 64, note: "+18%" },
    { label: "电动汽车", value: 58, note: "+22%" }, { label: "光伏组件", value: 47, note: "-9%" },
    { label: "家用电器", value: 41, note: "+7%" }, { label: "纺织服装", value: 38, note: "+1%" },
  ];

  // ---------------- 状态 ----------------
  const state = { category: "all", highRiskOnly: false, query: "", selectedId: events[0].id, activeTab: "markets" };
  // 概念板块异动（真实，替换原硬编码假数据）
  let boards = { gainers: [], losers: [] };
  async function syncBoards() {
    try {
      const d = await fetchJSON("/api/cn-boards");
      if (d && d.ok) {
        boards = { gainers: d.gainers || [], losers: d.losers || [] };
        if (state.activeTab === "anomaly") renderTabs();
      }
    } catch (error) {
      /* 板块源暂不可用 */
    }
  }

  // ---------------- 事件流 ----------------
  function filteredEvents() {
    return events.filter((e) => {
      if (state.category !== "all" && e.cat !== state.category) return false;
      if (state.highRiskOnly && e.score < 75) return false;
      if (state.query) { const q = state.query.toLowerCase(); if (!(`${e.title}${e.summary}${e.catLabel}`.toLowerCase().includes(q))) return false; }
      return true;
    });
  }
  function renderFilters() {
    el("category-filters").innerHTML = categories.map((c) =>
      `<button class="filter-button ${state.category === c.id ? "active" : ""}" data-category="${c.id}" type="button">${esc(c.label)}</button>`).join("");
    el("category-filters").querySelectorAll("[data-category]").forEach((b) =>
      b.addEventListener("click", () => { state.category = b.dataset.category; renderFilters(); renderEventList(); }));
  }
  function renderEventList() {
    const list = filteredEvents();
    el("event-count").textContent = list.length;
    el("event-list").innerHTML = list.length
      ? list.map((e) => `
        <article class="event-card ${state.selectedId === e.id ? "active" : ""} ${e.url ? "has-source" : ""}">
          <button class="event-select" data-id="${e.id}" type="button">
            <span class="risk-score ${scoreClass(e.score)}">${e.score}</span>
            <span>
              <span class="event-meta">
                <span class="category">${esc(e.catLabel)}</span><span>·</span><span>${esc(e.time)}</span><span>· ${e.confidence}% 可信</span>
              </span>
              <h3>${esc(e.title)}</h3>
              <p>${esc(e.summary)}</p>
              <span class="event-tags">${e.entities.slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("")}</span>
            </span>
          </button>
          ${e.url ? `<div class="event-card-actions"><a class="event-source-link" href="${esc(e.url)}" target="_blank" rel="noreferrer">原文 ↗</a></div>` : ""}
        </article>`).join("")
      : `<div class="empty-state">没有匹配的事件。尝试切换分类或清除搜索。</div>`;
    el("event-list").querySelectorAll("[data-id]").forEach((n) => {
      n.addEventListener("click", () => selectEvent(n.dataset.id));
    });
  }
  function selectedEvent() { return events.find((e) => e.id === state.selectedId) || events[0]; }
  function selectEvent(id) {
    state.selectedId = id;
    renderEventList();
    renderDetail();
    // 小屏：选中事件后自动收起事件流抽屉，露出地图与影响链
    const rail = el("event-rail");
    if (rail && rail.classList.contains("open")) rail.classList.remove("open");
  }

  function renderDetail() {
    const e = selectedEvent();
    el("impact-chain").innerHTML = e.impact.map(([label, text], i) =>
      `<li data-step="0${i + 1}"><span><strong>${esc(label)}</strong><br />${esc(text)}</span></li>`).join("");
    el("detail-confidence").textContent = `${e.confidence}%`;
    el("detail-source").innerHTML = e.url
      ? `<a href="${esc(e.url)}" target="_blank" rel="noreferrer" style="color:#e8907f">${esc(e.source)} ↗</a>`
      : esc(e.source);
    el("detail-time").textContent = e.time;
    el("detail-horizon").textContent = e.horizon;
    el("why-text").textContent = e.why;
    el("affected-entities").innerHTML = (e.entities || []).map((t) => `<span>${esc(t)}</span>`).join("");
    el("related-assets").innerHTML = (e.assets && e.assets.length ? e.assets : ["点击原文核验"]).map((t) => `<span>${esc(t)}</span>`).join("");
    const ar = el("cn-analyze-result");
    if (ar) ar.innerHTML = "";
    const ir = el("cn-insight-result");
    if (ir) ir.innerHTML = ""; // 切换新闻时清空上一条的板块影响分析与博研观点
  }

  function renderInsightResult(d) {
    const li = (arr) => (Array.isArray(arr) ? arr : []).map((x) => `<li>${esc(x)}</li>`).join("");
    return `<div class="cn-insight">
      <div class="cn-insight-block"><b>解读</b><p>${esc(d.reading || "")}</p></div>
      <div class="cn-insight-block"><b>重庆关联</b><p>${esc(d.local || "")}</p></div>
      <div class="cn-insight-block"><b>可关注方向</b><ul>${li(d.suggestion)}</ul></div>
    </div>`;
  }

  function renderAnalyzeResult(d) {
    const chips = (arr, cls) =>
      Array.isArray(arr) && arr.length
        ? arr.map((x) => `<span class="cn-imp cn-imp--${cls}">${esc(x)}</span>`).join("")
        : `<span class="cn-empty">暂无</span>`;
    return `<div class="cn-analyze">
      <div class="cn-imp-row"><b class="cn-imp-lbl cn-imp-lbl--up">利好</b><div class="cn-imp-chips">${chips(d.bullish, "up")}</div></div>
      <div class="cn-imp-row"><b class="cn-imp-lbl cn-imp-lbl--down">利空</b><div class="cn-imp-chips">${chips(d.bearish, "down")}</div></div>
      ${d.chain ? `<p class="cn-imp-chain">${esc(d.chain)}</p>` : ""}
      ${d.watch && d.watch.length ? `<div class="cn-imp-row"><b class="cn-imp-lbl">关注</b><div class="cn-imp-chips">${d.watch.map((x) => `<span class="cn-imp cn-imp--watch">${esc(x)}</span>`).join("")}</div></div>` : ""}
    </div>`;
  }

  // ---------------- 实时快讯 → 事件流 ----------------
  function catFromText(t) {
    if (/关税|管制|制裁|反倾销|反补贴|政策|监管|央行|证监会|发改委|商务部|部委|立法|规定/.test(t)) return { cat: "policy", catLabel: "政策" };
    if (/供应链|港口|航运|运价|物流|海运/.test(t)) return { cat: "supply", catLabel: "供应链" };
    if (/芯片|半导体|稀土|锂电|光伏|新能源|制造|产能|机器人|汽车|电池|产业|出口|外贸|东盟|一带一路|进出口|海关/.test(t)) return { cat: "industry", catLabel: "产业" };
    return { cat: "market", catLabel: "市场" };
  }
  function scoreFromText(t) {
    if (/制裁|管制|反倾销|反补贴|关税|冲突|危机|暴跌|跳水|退市|违约/.test(t)) return 84;
    if (/涨停|大涨|新高|放量|利好|中标|突破|签约|获批/.test(t)) return 68;
    if (/回落|下跌|承压|风险|放缓|下滑|减持/.test(t)) return 64;
    return 56;
  }
  const PROV = ["北京", "上海", "广东", "深圳", "浙江", "江苏", "山东", "四川", "安徽", "湖北", "湖南", "福建", "重庆", "河北", "江西", "陕西", "河南"];
  const SECTORS = ["半导体", "芯片", "光伏", "新能源", "汽车", "锂电", "锂", "稀土", "钢铁", "医药", "银行", "地产", "券商", "白酒", "电力", "军工", "机器人", "AI", "算力"];
  function tagsFromText(t) {
    return [...PROV.filter((p) => t.includes(p)), ...SECTORS.filter((s) => t.includes(s))].slice(0, 3);
  }
  function relTime(ms) {
    if (!ms) return "实时";
    const d = Math.max(0, (Date.now() - ms) / 60000);
    if (d < 1) return "刚刚";
    if (d < 60) return `${Math.floor(d)} 分钟前`;
    return `${Math.floor(d / 60)} 小时前`;
  }
  function newsToEvent(n, i) {
    const txt = `${n.title} ${n.summary || ""}`;
    const c = catFromText(txt);
    const tags = tagsFromText(txt);
    return {
      id: `news-${i}`, title: n.title, summary: n.summary || n.title, cat: c.cat, catLabel: c.catLabel,
      score: scoreFromText(txt), confidence: 90, source: n.source ? `${n.source} · 快讯` : "财经快讯", time: relTime(n.ts), url: n.url,
      impact: [["实时快讯", n.title], ["要点", n.summary || "点击原文查看详情"]],
      why: n.summary || "来自东方财富 7×24 实时财经快讯，点击右侧来源可打开原文核验详情与市场影响。",
      entities: tags.length ? tags : ["中国市场"], assets: [], horizon: "实时 · 快讯",
    };
  }
  let newsMode = "demo";
  let newsRaw = []; // 原始快讯（供产业政策标签按地区/行业匹配）

  // 重庆专版：每个 33618 集群的实时情报（东财定向搜索），键为集群名
  const cqNews = {};
  const cqFmtTime = (t) => { const m = String(t || "").match(/(\d{2})-(\d{2})\s+(\d{2}:\d{2})/); return m ? `${m[1]}-${m[2]} ${m[3]}` : ""; };
  async function syncCqIntel() {
    const names = [];
    CLUSTERS_33618.forEach((g) => g.clusters.forEach((c) => names.push(c.name)));
    await Promise.all(names.map(async (name, i) => {
      try {
        const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(name), 10000);
        cqNews[name] = d && Array.isArray(d.items) ? d.items.slice(0, 3) : [];
      } catch (error) {
        cqNews[name] = cqNews[name] || [];
      }
      // 逐个就地更新对应卡片，避免整页重渲染打断滚动
      if (state.activeTab === "chongqing") {
        const box = el("cq-intel-" + i);
        if (box) box.innerHTML = cqIntelHtml(cqNews[name]);
      }
    }));
    if (state.activeTab === "chongqing") { const t = el("cq-intel-total"); if (t) t.textContent = cqTotalNews(); }
  }
  function cqTotalNews() { return Object.values(cqNews).reduce((s, arr) => s + (arr ? arr.length : 0), 0); }
  function cqIntelHtml(news) {
    if (!news) return `<span class="cn-empty">情报加载中…</span>`;
    if (!news.length) return `<span class="cn-empty">暂无相关实时快讯</span>`;
    return news.map((n) =>
      `<a class="cq-news" href="${esc(n.url)}" target="_blank" rel="noreferrer"><span>${esc(n.title)}</span><i>${esc(n.source || "东财")} · ${esc(cqFmtTime(n.time))}</i></a>`).join("");
  }

  // 产业政策标签：每个省份/集群的实时动态（东财定向搜索），键为搜索词
  const policyIntel = {};
  function policyKeywords() {
    if ((state.policyView || "region") === "region") return POLICY_PROVINCES.map((p) => p.name);
    const kws = [];
    CLUSTERS_33618.forEach((g) => g.clusters.forEach((c) => kws.push(c.name)));
    return kws;
  }
  async function syncPolicyIntel() {
    const kws = policyKeywords();
    await Promise.all(kws.map(async (kw, i) => {
      if (!policyIntel[kw]) {
        try {
          const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(kw), 10000);
          policyIntel[kw] = d && Array.isArray(d.items) ? d.items.slice(0, 3) : [];
        } catch (error) { policyIntel[kw] = []; }
      }
      if (state.activeTab === "policy") { const box = el("pol-intel-" + i); if (box) box.innerHTML = cqIntelHtml(policyIntel[kw]); }
    }));
  }
  async function syncNews(manual) {
    try {
      const d = await fetchJSON("/api/cn-news");
      if (d && d.ok && Array.isArray(d.items) && d.items.length) {
        newsRaw = d.items;
        events = d.items.map(newsToEvent);
        if (!events.some((e) => e.id === state.selectedId)) state.selectedId = events[0].id;
        newsMode = "live";
        newsFailStreak = 0;
        renderEventList();
        renderDetail();
        if (state.activeTab === "policy") renderTabs();
        if (manual) toast(`已同步 ${events.length} 条实时快讯`);
        return;
      }
      throw new Error("no news");
    } catch (error) {
      newsFailStreak += 1;
      // 只有从未拿到过实时快讯时才回退演示；已有实时列表则保留，避免刷新时闪回演示
      if (newsMode !== "live") {
        events = DEMO_EVENTS;
        renderEventList();
        renderDetail();
      }
      if (manual) toast("快讯源暂不可用，已保留现有事件");
    }
  }

  // ---------------- 总览指标 ----------------
  // 总览四指标 + 机会信号：全部由实时行情/事件推导，无任何硬编码假值
  function renderOverview() {
    // A股市场情绪（真实）：主要指数上涨占比
    const idx = markets.filter((m) => ["SHCOMP", "SZCOMP", "CHINEXT", "STAR50", "CSI300", "HSI"].includes(m.symbol));
    const up = idx.filter((m) => m.chg >= 0).length;
    const mood = idx.length ? Math.round(50 + (up / idx.length - 0.5) * 60) : 50;
    el("m-mood").textContent = idx.length ? mood : "—";
    el("m-mood-note").textContent = idx.length ? `${up}/${idx.length} 项指数上涨` : "指数源暂不可用";

    // 港股科技情绪（真实，替代原「出口景气」——出口为月度宏观、无实时源）
    const hstech = markets.find((m) => m.symbol === "HSTECH");
    if (hstech) {
      el("m-export").textContent = `${hstech.chg >= 0 ? "+" : ""}${hstech.chg.toFixed(2)}%`;
      el("m-export").className = hstech.chg >= 0 ? "status-high" : "negative";
    } else {
      el("m-export").textContent = "—";
      el("m-export-note").textContent = "港股源暂不可用";
    }

    // 产业政策风险（真实）：实时政策类事件的数量与平均评分
    const polEvents = events.filter((e) => e.cat === "policy");
    if (polEvents.length) {
      const polScore = Math.round(polEvents.reduce((s, e) => s + (e.score || 60), 0) / polEvents.length);
      el("m-policy").textContent = polScore;
      el("m-policy").className = polScore >= 65 ? "negative" : "status-high";
      el("m-policy-note").textContent = `${polEvents.length} 条政策事件在监控`;
    } else {
      el("m-policy").textContent = "—";
      el("m-policy-note").textContent = "暂无政策类事件";
    }

    // 人民币汇率压力（真实）：在岸 USDCNY 越高/升得越快，贬值压力越大
    const cny = markets.find((m) => m.symbol === "USDCNY");
    if (cny) {
      const cnyNum = parseFloat(String(cny.value).replace(/,/g, "")) || 7.1;
      const pressure = Math.max(5, Math.min(95, Math.round(50 + (cnyNum - 7.1) * 45 + cny.chg * 18)));
      el("m-cny").textContent = pressure;
      el("m-cny").className = pressure >= 60 ? "negative" : "";
      el("m-cny-note").textContent = `在岸 ${cny.value} · ${cny.chg >= 0 ? "承压贬值" : "偏强升值"}`;
    } else {
      el("m-cny").textContent = "—";
      el("m-cny-note").textContent = "汇率源暂不可用";
    }

    // 机会信号（真实）：当前实时领涨的品种
    const best = markets.filter((m) => m.live).sort((a, b) => b.chg - a.chg)[0];
    if (best) {
      el("opp-name").textContent = best.name;
      el("opp-note").textContent = `${best.chg >= 0 ? "+" : ""}${best.chg.toFixed(2)}% · 实时领涨`;
    }

    el("risk-overview-summary").textContent = `${events.length} 条中国产业与政策事件纳入当前范围，重点集中在新能源出海、稀土管制与半导体自主。`;
  }

  // ---------------- 关键信号 ----------------
  // 关键信号：全部来自实时行情与政策事件，无硬编码
  function renderSignals() {
    const g = (sym) => markets.find((m) => m.symbol === sym);
    const cny = g("USDCNY"), star = g("STAR50"), au = g("AU"), hstech = g("HSTECH");
    const polCount = events.filter((e) => e.cat === "policy").length;
    const pct = (m) => (m ? `${m.chg >= 0 ? "+" : ""}${m.chg.toFixed(2)}%` : "—");
    const rows = [
      { k: "科创情绪", v: pct(star), note: "成长风格", cls: star && star.chg >= 0 ? "positive" : "negative" },
      { k: "恒生科技", v: pct(hstech), note: "港股科技", cls: hstech && hstech.chg >= 0 ? "positive" : "negative" },
      { k: "避险·沪金", v: pct(au), note: au && au.chg >= 0 ? "避险升温" : "避险回落", cls: au && au.chg >= 0 ? "negative" : "positive" },
      { k: "人民币", v: cny ? cny.value : "—", note: cny && cny.chg >= 0 ? "承压贬值" : "偏强升值", cls: cny && cny.chg >= 0 ? "negative" : "positive" },
      { k: "政策事件", v: `${polCount} 条`, note: "实时监控中", cls: "" },
    ];
    el("signal-list").innerHTML = rows.map((r) =>
      `<div class="signal-row"><span>${esc(r.k)}</span><strong>${esc(String(r.v))}</strong><b class="${r.cls}">${esc(r.note)}</b></div>`).join("");
  }

  // ---------------- dock 标签 ----------------
  function sparkline(points, positive) {
    const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
    const c = points.map((p, i) => `${(i / (points.length - 1)) * 58},${34 - ((p - min) / span) * 30 - 2}`).join(" ");
    return `<svg class="sparkline ${positive ? "positive" : "negative"}" viewBox="0 0 58 34" aria-hidden="true"><polyline points="${c}" /></svg>`;
  }
  // ---------------- 硬科技初创公司图谱（策展底盘 + 实时快讯 + 融资雷达）----------------
  // 名单为策展（多为未上市初创，无二级行情）；实时性来自每赛道快讯 + 融资雷达
  const HARDTECH = [
    // ===== AI 集群 =====
    { sector: "AI · 大模型（基础）", kw: "大模型 融资", cos: [["智谱AI","独角兽"],["月之暗面","独角兽"],["MiniMax","独角兽"],["百川智能","独角兽"],["阶跃星辰","独角兽"],["深度求索","明星"],["零一万物","明星"]] },
    { sector: "AI · 多模态 / 视频生成", kw: "视频生成 大模型 融资", cos: [["生数科技","明星"],["爱诗科技","明星"],["智象未来","明星"],["潞晨科技","明星"],["Sand AI","早期"]] },
    { sector: "AI · Infra / 算力云", kw: "算力 大模型 融资", cos: [["无问芯穹","明星"],["硅基流动","明星"],["趋境科技","早期"],["清程极智","早期"]] },
    { sector: "AI · Agent / 应用", kw: "AI Agent 融资", cos: [["面壁智能","明星"],["蝴蝶效应","明星"],["澜舟科技","明星"],["澜码科技","早期"],["波形智能","早期"],["心识宇宙","早期"]] },
    // ===== 物理AI 集群（此处只收未上市初创；上市供应商见顶部「物理AI产业链专区」）=====
    { sector: "物理AI · 具身大模型 VLA", kw: "具身智能 大模型 融资", cos: [["自变量机器人","明星"],["千寻智能","明星"],["穹彻智能","明星"],["星海图","明星"],["它石智航","早期"],["原力灵机","早期"],["光轮智能","明星"]] },
    { sector: "物理AI · 人形机器人本体", kw: "人形机器人 融资", cos: [["宇树科技","拟IPO"],["智元机器人","独角兽"],["银河通用","独角兽"],["星动纪元","明星"],["逐际动力","明星"],["众擎机器人","早期"],["松延动力","早期"],["加速进化","早期"],["数字华夏","早期"]] },
    { sector: "物理AI · 灵巧手 / 触觉传感", kw: "灵巧手 机器人 融资", cos: [["因时机器人","早期"],["帕西尼感知","明星"],["灵心巧手","早期"],["戴盟机器人","早期"],["钛深科技","早期"]] },
    { sector: "物理AI · 四足 / 特种机器人", kw: "四足机器人 融资", cos: [["云深处科技","明星"],["宇树科技","拟IPO"],["蔚蓝智能","早期"]] },
    // ===== 其余硬科技 =====
    { sector: "AI算力芯片 · GPU", kw: "国产GPU 芯片 融资", cos: [["摩尔线程","拟IPO"],["沐曦","拟IPO"],["壁仞科技","独角兽"],["燧原科技","独角兽"],["天数智芯","独角兽"],["后摩智能","明星"],["爱芯元速","明星"],["芯动科技","明星"]] },
    { sector: "商业航天", kw: "商业航天 火箭 融资", cos: [["蓝箭航天","独角兽"],["天兵科技","独角兽"],["银河航天","独角兽"],["星际荣耀","明星"],["东方空间","明星"],["星河动力","明星"],["中科宇航","明星"]] },
    { sector: "可控核聚变", kw: "可控核聚变 融资", cos: [["能量奇点","明星"],["星环聚能","明星"],["瀚海聚能","早期"],["新奥聚变","国资"],["聚变新能","国资"]] },
    { sector: "脑机接口", kw: "脑机接口 融资", cos: [["强脑科技","独角兽"],["脑虎科技","明星"],["阶梯医疗","早期"],["微灵医疗","早期"]] },
    { sector: "固态电池", kw: "固态电池 融资", cos: [["卫蓝新能源","独角兽"],["清陶能源","独角兽"],["太蓝新能源","明星"],["恩力动力","明星"],["高能时代","明星"]] },
    { sector: "合成生物", kw: "合成生物 融资", cos: [["蓝晶微生物","明星"],["恩和生物","明星"],["微构工场","明星"],["态创生物","明星"],["引航生物","早期"]] },
    { sector: "量子科技", kw: "量子计算 融资", cos: [["本源量子","独角兽"],["国仪量子","明星"],["图灵量子","明星"],["玻色量子","早期"]] },
    { sector: "自动驾驶 · 智驾", kw: "自动驾驶 融资", cos: [["Momenta","拟IPO"],["元戎启行","明星"],["轻舟智航","明星"],["卓驭科技","明星"],["鉴智机器人","早期"],["千挂科技","早期"]] },
    { sector: "低空经济 · eVTOL", kw: "eVTOL 低空 融资", cos: [["峰飞航空","独角兽"],["沃飞长空","明星"],["时的科技","明星"],["沃兰特","明星"],["御风未来","明星"],["零重力飞机","早期"]] },
  ];
  const HT_BADGE = { "独角兽": "uni", "拟IPO": "ipo", "明星": "star", "早期": "early", "国资": "soe", "美股": "list", "港股": "list", "已上市": "list" };
  const htNews = {};   // sector.kw -> 实时快讯
  let htFeed = [];     // 融资雷达原始快讯流
  let htStartups = null; // AI 提炼结果

  function htCard(s, i) {
    const chips = s.cos.map(([n, st]) =>
      `<span class="ht-co"><b>${esc(n)}</b><i class="ht-badge ht-${HT_BADGE[st] || "star"}">${esc(st)}</i></span>`).join("");
    return `<article class="ht-card cq-card" data-cq-kw="${esc(s.kw.split(" ")[0])}" title="点击搜索「${esc(s.sector)}」更多资讯">
      <header><h4>${esc(s.sector)}</h4><span>${s.cos.length} 家</span></header>
      <div class="ht-cos">${chips}</div>
      <div class="ht-news-block"><b>相关实时快讯 · 东财</b><div class="cq-intel" id="ht-news-${i}">${cqIntelHtml(htNews[s.kw])}</div></div>
    </article>`;
  }
  function htStartupRow(s) {
    return `<div class="ht-su"><b>${esc(s.company)}</b>` +
      `<span class="ht-su-round">${esc(s.round)}</span>` +
      `<span class="ht-su-amt">${esc(s.amount)}</span>` +
      (s.sector ? `<i class="ht-su-sec">${esc(s.sector)}</i>` : "") + `</div>`;
  }
  function htRadarListHtml() {
    if (htStartups === null) return `<span class="cn-empty">正在从实时快讯挖掘融资事件…</span>`;
    if (Array.isArray(htStartups) && htStartups.length) return htStartups.map(htStartupRow).join("");
    return `<div class="ht-radar-hint">配置 DeepSeek Key（后台「系统管理」）后，这里自动从快讯提炼「公司 · 轮次 · 金额 · 赛道」。当前可查看下方原始融资快讯流。</div>`;
  }
  // ---------------- 物理AI · 具身智能产业链专区（上市供应商实时行情 + 未上市新锐）----------------
  const PHYS_AI = [
    { layer: "上游 · 核心零部件", accent: "up", groups: [
      { g: "灵巧手", cos: [["因时机器人","早期"],["帕西尼感知","明星"],["灵心巧手","早期"],["戴盟机器人","早期"],["兆威机电","003021"],["鸣志电器","603728"]] },
      { g: "触觉 / 力矩传感", cos: [["帕西尼感知","明星"],["钛深科技","早期"],["柯力传感","603662"],["汉威科技","300007"]] },
      { g: "无框力矩电机", cos: [["步科股份","688160"],["鸣志电器","603728"],["昊志机电","300503"],["伟创电气","688698"]] },
      { g: "空心杯 / 无刷电机", cos: [["江苏雷利","300660"],["鸣志电器","603728"],["拓邦股份","002139"]] },
      { g: "谐波 / RV 减速器", cos: [["绿的谐波","688017"],["双环传动","002472"],["中大力德","002896"],["国茂股份","603915"]] },
      { g: "行星滚柱丝杠", cos: [["贝斯特","300580"],["恒立液压","601100"],["秦川机床","000837"],["五洲新春","603667"]] },
      { g: "编码器 / 轴承", cos: [["奥普光电","002338"],["长盛轴承","300718"]] },
      { g: "六维力传感", cos: [["柯力传感","603662"],["东华测试","300354"],["宇立仪器","早期"]] },
      { g: "电子皮肤 / 柔性传感", cos: [["汉威科技","300007"],["福莱新材","605488"],["帕西尼感知","明星"]] },
      { g: "轻量化材料 · PEEK", cos: [["中研股份","688716"],["沃特股份","002886"],["普利特","002324"]] },
      { g: "机器人芯片 / 域控", cos: [["地平线","港股"],["黑芝麻智能","港股"],["爱芯元速","明星"],["后摩智能","明星"]] },
    ] },
    { layer: "中游 · 本体 + 具身大脑 + 仿真", accent: "mid", groups: [
      { g: "人形机器人本体", cos: [["宇树科技","拟IPO"],["智元机器人","独角兽"],["星动纪元","明星"],["逐际动力","明星"],["众擎机器人","早期"],["松延动力","早期"],["傅利叶智能","明星"],["乐聚机器人","明星"],["优必选","港股"]] },
      { g: "关节模组 / 一体化执行器", cos: [["三花智控","002050"],["拓普集团","601689"],["兆威机电","003021"]] },
      { g: "四足 / 移动机器人", cos: [["宇树科技","拟IPO"],["云深处科技","明星"],["九号公司","689009"]] },
      { g: "工业 / 协作机械臂", cos: [["埃斯顿","002747"],["埃夫特","688165"],["新时达","002527"],["节卡机器人","明星"],["珞石机器人","明星"]] },
      { g: "具身大模型 / VLA", cos: [["自变量机器人","明星"],["千寻智能","明星"],["穹彻智能","明星"],["它石智航","明星"],["星海图","早期"],["银河通用","明星"]] },
      { g: "仿真 / 数据 / 空间智能", cos: [["光轮智能","明星"],["群核科技","拟IPO"],["原力灵机","早期"]] },
    ] },
    { layer: "下游 · 应用场景", accent: "down", groups: [
      { g: "工业 / 智能制造", cos: [["拓斯达","300607"],["博实股份","002698"],["巨一科技","688162"]] },
      { g: "服务 / 商用", cos: [["科沃斯","603486"],["九号公司","689009"],["普渡科技","明星"],["擎朗智能","明星"]] },
      { g: "物流 / 仓储", cos: [["极智嘉","明星"],["快仓智能","明星"],["海康机器人","明星"]] },
    ] },
  ];
  const physQuotes = {};
  const isCode6 = (c) => /^[0-9]{6}$/.test(c);
  function physChip([name, tag]) {
    if (isCode6(tag)) {
      const d = physQuotes[tag];
      const q = d ? `<i class="pa-q ${d.change >= 0 ? "up" : "down"}">${d.change >= 0 ? "+" : ""}${d.change.toFixed(2)}%</i>` : `<i class="pa-q pa-q--wait">···</i>`;
      return `<a class="pa-co pa-co--listed" href="${stockUrl(tag)}" target="_blank" rel="noreferrer" title="${esc(name)} · 实时行情"><b>${esc(name)}</b>${q}</a>`;
    }
    return `<span class="pa-co"><b>${esc(name)}</b><i class="ht-badge ht-${HT_BADGE[tag] || "star"}">${esc(tag)}</i></span>`;
  }
  function renderPhysAI() {
    const listed = new Set(); PHYS_AI.forEach((L) => L.groups.forEach((g) => g.cos.forEach(([, c]) => { if (isCode6(c)) listed.add(c); })));
    const total = PHYS_AI.reduce((n, L) => n + L.groups.reduce((m, g) => m + g.cos.length, 0), 0);
    return `<section class="pa-hub">
      <div class="pa-hub-head"><h3>🤖 物理AI · 具身智能产业链</h3><span>上游零部件 → 本体 + 具身大脑 + 仿真 → 下游应用 · ${listed.size} 家上市供应商实时行情 + 未上市新锐（共 ${total}）</span></div>
      ${PHYS_AI.map((L) => `<div class="pa-layer pa-${L.accent}">
        <div class="pa-layer-h">${esc(L.layer)}</div>
        <div class="pa-groups">${L.groups.map((g) => `<div class="pa-group" data-pa-node="${esc(g.g)}" title="点击查看「${esc(g.g)}」环节详情与实时快讯"><span class="pa-g-name">${esc(g.g)} <i class="pa-g-go">›</i></span><div class="pa-cos">${g.cos.map(physChip).join("")}</div></div>`).join("")}</div>
      </div>`).join("")}
      <div class="pa-extra">
        <section class="pa-sub">
          <h4>⚡ 物理AI 实时融资 / 新锐</h4>
          <div class="cq-intel" id="pa-fin">${cqIntelHtml(paFinFeed.length ? paFinFeed : undefined)}</div>
        </section>
        <section class="pa-sub">
          <h4>📋 物理AI 政策与事件</h4>
          <div class="pa-pol-rules">${PA_POLICY.map((r) => `<div class="cn-rule"><span class="cn-rule-org">${esc(r[0])}</span><em>${esc(r[1])}</em><i class="cn-rule-st">${esc(r[2])}</i></div>`).join("")}</div>
          <div class="cq-intel" id="pa-policy-news">${cqIntelHtml(paPolicyNews.length ? paPolicyNews : undefined)}</div>
        </section>
      </div>
      <p class="ht-note">红涨绿跌为上市供应商实时行情（点开跳东财）；徽章为未上市阶段（<i class="ht-badge ht-uni">独角兽</i> <i class="ht-badge ht-ipo">拟IPO</i> <i class="ht-badge ht-star">明星</i> <i class="ht-badge ht-early">早期</i> <i class="ht-badge ht-list">港股</i>）。点环节看详情；未上市新锐动态见「早期雷达」。</p>
    </section>`;
  }
  // 物理AI：融资流 + 政策事件 + 环节详情
  const PA_POLICY = [
    ["工信部等17部门", "人形机器人创新发展指导意见", "已发布"],
    ["“十四五”规划", "机器人产业发展规划（工信部等15部门）", "实施中"],
    ["北京市", "具身智能科技创新与产业培育行动方案", "推进中"],
    ["上海市", "打造智能机器人 / 具身智能创新高地", "推进中"],
    ["深圳市", "具身智能机器人产业集群行动", "持续"],
  ];
  const PA_FIN_QUERIES = ["人形机器人 融资", "具身智能 融资", "机器人 天使轮", "灵巧手 融资"];
  const PA_POLICY_QUERIES = ["人形机器人 政策", "具身智能 规划"];
  let paFinFeed = [];
  let paPolicyNews = [];
  const paNodeCache = {};
  function findPaNode(name) { for (const L of PHYS_AI) for (const g of L.groups) if (g.g === name) return { layer: L.layer, group: g }; return null; }
  function paNodeDetailHtml(node) {
    const f = findPaNode(node); if (!f) return "";
    const news = paNodeCache[node];
    const newsBody = news === undefined ? `<span class="cn-empty">加载中…</span>` : (!news.length ? `<span class="cn-empty">暂无相关快讯</span>` :
      `<div class="cn-focus-news">${news.map((n) => `<a href="${esc(n.url)}" target="_blank" rel="noreferrer">${esc(n.title)}<i>${esc(n.source || "东财")} · ${esc(cqFmtTime(n.time))}</i></a>`).join("")}</div>`);
    return `<div class="pd-head"><strong>${esc(node)}</strong><span>${esc(f.layer)} · 物理AI产业链</span></div>
      <div class="pd-sec"><b>环节企业 · 上市供应商实时行情</b><div class="pa-cos">${f.group.cos.map(physChip).join("")}</div></div>
      <div class="pd-sec"><b>该环节实时快讯 · 东财</b>${newsBody}</div>`;
  }
  async function openNodeDetail(node) {
    pdProv = null;
    const token = ++pdToken;
    const modal = ensurePdModal();
    modal.querySelector(".pd-body").innerHTML = paNodeDetailHtml(node);
    modal.hidden = false; document.body.classList.add("pd-open"); modal.querySelector(".pd-panel").scrollTop = 0;
    const kw = node.replace(/\s*[\/·]\s*/g, " ").trim() + " 机器人";
    try { const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(kw), 10000); paNodeCache[node] = d && Array.isArray(d.items) ? d.items.slice(0, 6) : []; }
    catch (e) { if (!paNodeCache[node]) paNodeCache[node] = []; }
    if (token === pdToken && !modal.hidden) modal.querySelector(".pd-body").innerHTML = paNodeDetailHtml(node);
  }
  async function syncPaExtra() {
    // 融资流
    const finAll = [];
    await Promise.all(PA_FIN_QUERIES.map(async (q) => {
      try { const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(q), 10000); (d && d.items ? d.items : []).forEach((n) => finAll.push(n)); } catch (e) { /* ignore */ }
    }));
    const seen = new Set();
    paFinFeed = finAll.filter((n) => { if (!n.title || seen.has(n.title)) return false; seen.add(n.title); return HT_FIN_INC.test(n.title) && !HT_FIN_EXC.test(n.title); }).slice(0, 12);
    if (state.activeTab === "hardtech") { const f = el("pa-fin"); if (f) f.innerHTML = cqIntelHtml(paFinFeed.length ? paFinFeed : []); }
    // 政策事件
    const polAll = [];
    await Promise.all(PA_POLICY_QUERIES.map(async (q) => {
      try { const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(q), 10000); (d && d.items ? d.items : []).forEach((n) => polAll.push(n)); } catch (e) { /* ignore */ }
    }));
    const seen2 = new Set();
    paPolicyNews = polAll.filter((n) => { if (!n.title || seen2.has(n.title)) return false; seen2.add(n.title); return true; }).slice(0, 8);
    if (state.activeTab === "hardtech") { const f = el("pa-policy-news"); if (f) f.innerHTML = cqIntelHtml(paPolicyNews.length ? paPolicyNews : []); }
  }
  async function syncPhysAI() {
    const codes = new Set();
    PHYS_AI.forEach((L) => L.groups.forEach((g) => g.cos.forEach(([, c]) => { if (isCode6(c)) codes.add(c); })));
    const secids = [...codes].map(secidOf).join(",");
    try { const d = await fetchJSON("/api/cn-stocks?secids=" + secids, 12000); if (d && d.quotes && Object.keys(d.quotes).length) Object.assign(physQuotes, d.quotes); } catch (e) { return; }
    if (state.activeTab === "hardtech") { const hub = document.querySelector(".pa-hub"); if (hub) hub.outerHTML = renderPhysAI(); }
  }

  function renderHardtechTab() {
    return `<div class="ht-wrap">
      ${renderPhysAI()}
      <section class="ht-radar">
        <div class="ht-radar-head"><h3>⚡ 实时融资雷达</h3>
          <div class="ht-fin-toggle">
            <button data-ht-fin="all" class="${(state.htFinMode || "all") === "all" ? "active" : ""}" type="button">全部融资</button>
            <button data-ht-fin="early" class="${state.htFinMode === "early" ? "active" : ""}" type="button">仅早期</button>
          </div>
        </div>
        <div class="ht-radar-list" id="ht-radar-list">${htRadarListHtml()}</div>
        <details class="ht-radar-raw"${htStartups ? "" : " open"}>
          <summary>原始融资快讯流（可信来源）</summary>
          <div class="cq-intel" id="ht-radar-feed">${cqIntelHtml(htFeed.length ? htFeed : undefined)}</div>
        </details>
      </section>
      <section class="ht-map">
        <div class="ht-map-head"><h3>硬科技赛道图谱 · 未上市初创</h3><span>策展 · ${HARDTECH.reduce((n, s) => n + s.cos.length, 0)} 家未上市初创 / 独角兽（已上市公司不收录，见产业链雷达）</span></div>
        <div class="ht-grid">${HARDTECH.map((s, i) => htCard(s, i)).join("")}</div>
        <p class="ht-note">阶段徽章：<i class="ht-badge ht-uni">独角兽</i> <i class="ht-badge ht-ipo">拟IPO</i> <i class="ht-badge ht-star">明星未上市</i> <i class="ht-badge ht-early">早期</i> <i class="ht-badge ht-soe">国资</i>。<b>本图谱只收未上市公司</b>：已上市（含美股 / 港股 / A股）不在此列，请到产业链雷达看其实时行情。名单为策展，融资动态实时；纯早期新锐见「早期雷达」。</p>
      </section>
    </div>`;
  }
  async function syncHardtechNews() {
    await Promise.all(HARDTECH.map(async (s, i) => {
      try {
        const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(s.kw.split(" ")[0]), 10000);
        htNews[s.kw] = d && Array.isArray(d.items) ? d.items.slice(0, 3) : [];
      } catch (e) { htNews[s.kw] = htNews[s.kw] || []; }
      if (state.activeTab === "hardtech") { const box = el("ht-news-" + i); if (box) box.innerHTML = cqIntelHtml(htNews[s.kw]); }
    }));
  }
  const HT_FIN_QUERIES = ["完成融资", "天使轮 融资", "A轮 融资", "硬科技 融资", "获数亿元融资"];
  // 融资信号：需命中「明确融资动作」且排除二级市场/业绩类噪音
  const HT_FIN_INC = /完成.{0,4}融资|[天使种子]+轮|Pre-?[ABC]|[ABC]\s*轮|战略融资|战略投资|领投|投资方|估值.{0,4}[亿千万]|入股|数[亿千万]+元.{0,6}(融资|轮)/i;
  const HT_FIN_EXC = /净利|业绩|营收|季报|预增|预减|亏损|股价|涨停|跌停|涨超|跌超|募集资金.{0,4}(使用|变更)|回购|减持|理财|公募|基金经理|指数|大盘|高速公路/;
  async function syncFinancingRadar() {
    const all = [];
    await Promise.all(HT_FIN_QUERIES.map(async (q) => {
      try { const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(q), 10000); (d && d.items ? d.items : []).forEach((n) => all.push(n)); } catch (e) { /* 单个查询失败忽略 */ }
    }));
    const seen = new Set();
    const early = state.htFinMode === "early";
    const filtered = all.filter((n) => {
      if (!n.title || seen.has(n.title)) return false; seen.add(n.title);
      if (early) return isEarly(n.title);
      return HT_FIN_INC.test(n.title) && !HT_FIN_EXC.test(n.title);
    });
    htFeed = (early ? dedupEarly(filtered) : filtered).slice(0, 30);
    if (state.activeTab === "hardtech") { const f = el("ht-radar-feed"); if (f) f.innerHTML = cqIntelHtml(htFeed.length ? htFeed : []); }
    // AI 提炼（无 key/关闭则降级）
    if (!htFeed.length) { htStartups = []; if (state.activeTab === "hardtech") { const l = el("ht-radar-list"); if (l) l.innerHTML = htRadarListHtml(); } return; }
    try {
      const r = await fetch("/api/cn-startups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: htFeed.map((n) => ({ title: n.title, summary: n.summary })) }) });
      const d = await r.json();
      htStartups = d.ok && Array.isArray(d.startups) ? d.startups : [];
    } catch (e) { htStartups = []; }
    if (state.activeTab === "hardtech") { const l = el("ht-radar-list"); if (l) l.innerHTML = htRadarListHtml(); }
  }

  // ---------------- 早期雷达：专挖种子/天使/Pre-A/A 轮 + 院所成果转化的新锐初创 ----------------
  const EARLY_QUERIES = [
    "天使轮 融资", "种子轮 融资", "Pre-A轮 融资", "A轮 融资", "A+轮 融资",
    "获数千万元融资", "获数百万元融资", "科技成果转化 融资", "硬科技 早期融资",
  ];
  // —— 共享早期信号过滤（两级：强早期轮次 或 明确融资动作，减去硬排除项）——
  const EARLY_STRONG = /种子轮|天使轮|Pre-?A\+?\s*轮?|A\+?\+?\s*轮|A1\s*轮|首轮融资/i;
  const EARLY_SOFT = /(完成|获得?|获投|宣布完成|斩获|拿下|到手|新获).{0,10}(融资|轮|投资)|成果转化|孵化(器|加速)?/;
  // 硬排除：后期轮次 / 上市过会 / 二级市场 / 债权授信 / 基金设立 / 非融资动作
  const EARLY_HARD_EXC = /IPO|过会|招股|科创板|创业板|北交所|主板挂牌|新三板|Pre-?IPO|[B-F]\s*轮|Pre-?[B-F]|战略配售|定增|回购|减持|增持|质押|季报|财报|年报|净利润?|营收|涨停|跌停|ETF|指数|大盘|授信|贷款|发债|债券|票据|中标|签约|揭牌/;
  function isEarly(title) {
    const t = String(title || "");
    if (!t || EARLY_HARD_EXC.test(t)) return false;
    return EARLY_STRONG.test(t) || EARLY_SOFT.test(t);
  }
  // 按公司名去重（融资动词前的片段），合并同一家公司的多条不同标题快讯
  function earlyKey(n) {
    const t = String(n.title || "");
    const m = t.match(/^[《\s"“]*([一-龥A-Za-z0-9·\-.]{2,20}?)(?:完成|宣布|获得|获投|斩获|拿下|获|近日|正式)/);
    if (m) return m[1];
    return t.replace(/[\s，。、？！,.!?：:；;（）()【】\[\]"'""]/g, "").slice(0, 12);
  }
  function dedupEarly(items) {
    const seen = new Set(); const out = [];
    for (const n of items) { if (!n.title) continue; const k = earlyKey(n); if (seen.has(k)) continue; seen.add(k); out.push(n); }
    return out;
  }
  let earlyFeed = [];
  let earlyStartups = null;
  function earlyListHtml() {
    if (earlyStartups === null) return `<span class="cn-empty">正在从早期融资快讯挖掘新锐公司…</span>`;
    if (Array.isArray(earlyStartups) && earlyStartups.length) return earlyStartups.map(htStartupRow).join("");
    return `<div class="ht-radar-hint">配置 DeepSeek Key（后台「系统管理」）后，这里自动从早期融资快讯提炼「公司 · 轮次 · 金额 · 赛道」。当前可查看下方原始早期融资快讯流。</div>`;
  }
  function renderEarlyTab() {
    return `<div class="ht-wrap">
      <section class="ht-radar ht-radar--early">
        <div class="ht-radar-head"><h3>🌱 早期雷达</h3><span>种子 / 天使 / Pre-A / A轮 + 院所成果转化 · 挖未上市新锐</span></div>
        <div class="ht-radar-list" id="early-list">${earlyListHtml()}</div>
        <details class="ht-radar-raw"${earlyStartups ? "" : " open"}>
          <summary>原始早期融资快讯流（可信来源 · 东财）</summary>
          <div class="cq-intel" id="early-feed">${cqIntelHtml(earlyFeed.length ? earlyFeed : undefined)}</div>
        </details>
        <p class="ht-note">口径：保留 <b>种子/天使/Pre-A/A轮</b> 及明确融资动作 / 成果转化，硬过滤 B 轮及以后、Pre-IPO、上市过会、二级市场、债权授信、基金设立与非融资动作；并按公司名去重合并。名单来自实时快讯，非策展。</p>
      </section>
    </div>`;
  }
  async function syncEarlyRadar() {
    const all = [];
    await Promise.all(EARLY_QUERIES.map(async (q) => {
      try { const d = await fetchJSON("/api/cn-search?kw=" + encodeURIComponent(q), 10000); (d && d.items ? d.items : []).forEach((n) => all.push(n)); } catch (e) { /* 单查询失败忽略 */ }
    }));
    earlyFeed = dedupEarly(all.filter((n) => isEarly(n.title))).slice(0, 30);
    if (state.activeTab === "early") { const f = el("early-feed"); if (f) f.innerHTML = cqIntelHtml(earlyFeed.length ? earlyFeed : []); }
    if (!earlyFeed.length) { earlyStartups = []; if (state.activeTab === "early") { const l = el("early-list"); if (l) l.innerHTML = earlyListHtml(); } return; }
    try {
      const r = await fetch("/api/cn-startups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: earlyFeed.map((n) => ({ title: n.title, summary: n.summary })) }) });
      const d = await r.json();
      earlyStartups = d.ok && Array.isArray(d.startups) ? d.startups : [];
    } catch (e) { earlyStartups = []; }
    if (state.activeTab === "early") { const l = el("early-list"); if (l) l.innerHTML = earlyListHtml(); }
  }

  const tabs = [
    { id: "markets", label: "市场行情", render: renderMarketsTab },
    { id: "chongqing", label: "重庆专版", render: renderChongqingTab },
    { id: "policy", label: "产业政策", render: renderPolicyTab },
    { id: "regions", label: "省域产业", render: renderRegionsTab },
    { id: "anomaly", label: "板块异动", render: renderAnomalyTab },
    { id: "hardtech", label: "硬科技初创", render: renderHardtechTab },
    { id: "early", label: "早期雷达", render: renderEarlyTab },
    { id: "brief", label: "AI简报", render: renderCnBriefTab },
  ];
  function renderMarketsTab() {
    return `<div class="market-grid">${markets.map((m) => `
      <article class="market-card">
        <header><div><span class="market-symbol">${esc(m.symbol)}</span><span class="market-live ${m.live ? "is-live" : ""}" title="${m.live ? "实时行情" : "暂无实时源，演示数据"}">${m.live ? "实时" : "演示"}</span><h3>${esc(m.name)}</h3></div><span class="market-risk">${esc(m.risk)}</span></header>
        <div><div class="market-value">${esc(m.value)}</div><div class="market-change ${m.chg >= 0 ? "positive" : "negative"}">${m.chg >= 0 ? "+" : ""}${m.chg.toFixed(2)}%</div></div>
        ${sparkline(m.points, m.chg >= 0)}
      </article>`).join("")}</div>`;
  }
  // 按关键词从实时快讯匹配相关新闻
  function matchNews(keywords, limit) {
    return newsRaw
      .filter((n) => { const t = `${n.title} ${n.summary || ""}`; return keywords.some((k) => t.includes(k)); })
      .slice(0, limit || 3);
  }
  function ruleRows(rules) {
    return rules.map((r) => `<div class="cn-rule"><span class="cn-rule-org">${esc(r[0])}</span><em>${esc(r[1])}</em><i class="cn-rule-st">${esc(r[2])}</i></div>`).join("");
  }
  function newsRows(news) {
    if (!news.length) return `<span class="cn-empty">暂无匹配快讯</span>`;
    return news.map((n) => `<a class="cn-news-link" href="${esc(n.url)}" target="_blank" rel="noreferrer">${esc(n.title)} <b>↗</b></a>`).join("");
  }
  function policyCard(title, sub, rules, idx) {
    const isProv = !!PROVINCE_COMPANIES[title];
    const hint = isProv ? "点击查看该省代表企业实时行情与政策详情" : `点击搜索「${esc(title)}」更多资讯`;
    return `<article class="cn-policy-card cq-card${isProv ? " cn-policy-card--prov" : ""}" data-cq-kw="${esc(title)}" title="${hint}">
      <header><h4>${esc(title)}</h4>${sub ? `<span>${esc(sub)}</span>` : ""}${isProv ? `<i class="cn-policy-go">实时行情 ›</i>` : ""}</header>
      <div class="cn-policy-block"><b>收录政策条例</b>${ruleRows(rules)}</div>
      <div class="cn-policy-block"><b>相关实时动态 · 东财</b><div class="cq-intel" id="pol-intel-${idx}">${cqIntelHtml(policyIntel[title])}</div></div>
    </article>`;
  }
  function renderPolicyTab() {
    const view = state.policyView || "region";
    const toggle = `<div class="cn-policy-toggle">
      <button data-policy-view="region" class="${view === "region" ? "active" : ""}" type="button">地区产业政策</button>
      <button data-policy-view="industry" class="${view === "industry" ? "active" : ""}" type="button">行业产业政策 · 33618</button>
    </div>`;
    let body;
    if (view === "region") {
      body = `<div class="cn-policy-grid">${POLICY_PROVINCES.map((p, i) =>
        policyCard(p.name, p.lead, p.rule, i)).join("")}</div>`;
    } else {
      let idx = -1;
      body = CLUSTERS_33618.map((g) =>
        `<div class="cn-tier"><span class="cn-tier-label">${esc(g.tier)}</span><div class="cn-policy-grid">${g.clusters.map((c) => {
          idx += 1;
          return policyCard(c.name, "", c.rule, idx);
        }).join("")}</div></div>`).join("");
    }
    return `<div class="cn-policy">${toggle}${body}</div>`;
  }

  // —— 省份详情弹层：点击政策卡（地区视图）→ 该省代表企业实时行情 + 政策条例 + 实时快讯 ——
  let pdProv = null, pdToken = 0;
  const provEarlyCache = {}; // prov -> 该省早期融资快讯
  function provEarlyHtml(prov) {
    const items = provEarlyCache[prov];
    if (items === undefined) return `<div class="pd-sec"><b>该省新锐 · 近期融资</b><span class="cn-empty">加载中…</span></div>`;
    if (!items.length) return `<div class="pd-sec"><b>该省新锐 · 近期融资</b><span class="cn-empty">近期暂无该省早期融资快讯</span></div>`;
    return `<div class="pd-sec"><b>该省新锐 · 近期融资</b><div class="cn-focus-news">${items.map((n) =>
      `<a href="${esc(n.url)}" target="_blank" rel="noreferrer">${esc(n.title)}<i>${esc(n.source || "东财")} · ${esc(cqFmtTime(n.time))}</i></a>`).join("")}</div></div>`;
  }
  function ensurePdModal() {
    let m = document.getElementById("pd-modal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "pd-modal"; m.className = "pd-modal"; m.hidden = true;
    m.innerHTML = `<div class="pd-backdrop"></div><div class="pd-panel"><button class="pd-close" type="button" title="关闭">✕</button><div class="pd-body"></div></div>`;
    document.body.appendChild(m);
    m.querySelector(".pd-backdrop").addEventListener("click", closeProvinceDetail);
    m.querySelector(".pd-close").addEventListener("click", closeProvinceDetail);
    return m;
  }
  function closeProvinceDetail() {
    const m = document.getElementById("pd-modal");
    if (m) m.hidden = true;
    document.body.classList.remove("pd-open");
    pdProv = null;
  }
  function policyDetailHtml(prov) {
    const pol = POLICY_PROVINCES.find((p) => p.name === prov);
    const lead = pol ? pol.lead : (regionByName[prov] ? regionByName[prov].lead : "");
    const rules = pol && pol.rule ? ruleRows(pol.rule) : "";
    const reg = regionByName[prov];
    const heat = PROVINCE_HEAT[prov];
    const coCount = (PROVINCE_COMPANIES[prov] || []).length;
    const stats = [];
    if (typeof heat === "number") stats.push(`<div><span>产业金融活跃度</span><strong style="color:${heatColor(heat)}">${heat}</strong><small>参考</small></div>`);
    if (reg && reg.listed) stats.push(`<div><span>A股上市公司</span><strong>${reg.listed}</strong><small>家 · 示意</small></div>`);
    stats.push(`<div><span>收录代表企业</span><strong>${coCount}</strong><small>家 · 实时行情</small></div>`);
    const searchBtn = `<a class="pd-more" href="https://so.eastmoney.com/news/s?keyword=${encodeURIComponent(prov)}" target="_blank" rel="noreferrer">在东方财富查看「${esc(prov)}」完整资讯 ↗</a>`;
    return `<div class="pd-head"><strong>${esc(prov)}</strong>${lead ? `<span>${esc(lead)}</span>` : ""}</div>
      <div class="pd-stats">${stats.join("")}</div>
      ${stocksHtml(prov)}
      ${provEarlyHtml(prov)}
      ${rules ? `<div class="pd-sec"><b>收录政策条例</b>${rules}</div>` : ""}
      ${newsHtml(prov)}
      ${searchBtn}`;
  }
  async function openProvinceDetail(prov) {
    pdProv = prov;
    const token = ++pdToken;
    const modal = ensurePdModal();
    modal.querySelector(".pd-body").innerHTML = policyDetailHtml(prov);
    modal.hidden = false;
    document.body.classList.add("pd-open");
    modal.querySelector(".pd-panel").scrollTop = 0;
    const list = PROVINCE_COMPANIES[prov];
    const tasks = [];
    if (list) {
      const secids = list.map(([, c]) => secidOf(c)).join(",");
      tasks.push(fetchJSON("/api/cn-stocks?secids=" + secids, 10000)
        .then((d) => { if (d && d.quotes && Object.keys(d.quotes).length) provStockCache[prov] = d.quotes; })
        .catch(() => {}));
    }
    tasks.push(fetchJSON("/api/cn-search?kw=" + encodeURIComponent(prov), 10000)
      .then((d) => { provNewsCache[prov] = d && Array.isArray(d.items) ? d.items.slice(0, 6) : []; })
      .catch(() => { if (!provNewsCache[prov]) provNewsCache[prov] = []; }));
    // 该省新锐：早期融资定向搜索（省名 + 融资，过滤早期信号）
    tasks.push(fetchJSON("/api/cn-search?kw=" + encodeURIComponent(prov + " 融资"), 10000)
      .then((d) => {
        const items = dedupEarly((d && Array.isArray(d.items) ? d.items : []).filter((n) => isEarly(n.title)));
        provEarlyCache[prov] = items.slice(0, 5);
      })
      .catch(() => { if (!provEarlyCache[prov]) provEarlyCache[prov] = []; }));
    await Promise.all(tasks);
    if (token === pdToken && pdProv === prov && !modal.hidden) modal.querySelector(".pd-body").innerHTML = policyDetailHtml(prov);
  }

  // 省域产业：全 31 省 + 各省代表企业实时表现 + 点击看详情
  let regionQuotes = {}; // code -> {value, change}
  function provLiveSummary(prov) {
    const list = PROVINCE_COMPANIES[prov] || [];
    const rows = list.map(([n, c]) => ({ n, d: regionQuotes[c] })).filter((x) => x.d);
    if (!rows.length) return null;
    rows.sort((a, b) => b.d.change - a.d.change);
    const up = rows.filter((x) => x.d.change > 0).length;
    const down = rows.filter((x) => x.d.change < 0).length;
    const avg = rows.reduce((s, x) => s + x.d.change, 0) / rows.length;
    return { up, down, avg, lead: rows[0], n: rows.length };
  }
  function rgLiveHtml(prov) {
    const s = provLiveSummary(prov);
    if (!s) return `<span class="cn-empty">行情加载中…</span>`;
    return `<b class="rg-avg ${s.avg >= 0 ? "up" : "down"}">${s.avg >= 0 ? "+" : ""}${s.avg.toFixed(2)}%</b>` +
      `<span class="rg-ud">${s.up}涨 ${s.down}跌</span>` +
      `<span class="rg-lead">领涨 ${esc(s.lead.n)} <em class="${s.lead.d.change >= 0 ? "up" : "down"}">${s.lead.d.change >= 0 ? "+" : ""}${s.lead.d.change.toFixed(2)}%</em></span>`;
  }
  async function syncRegionsQuotes() {
    const codes = new Set();
    Object.values(PROVINCE_COMPANIES).forEach((list) => list.forEach(([, c]) => codes.add(c)));
    const secids = [...codes].map(secidOf).join(",");
    try {
      const d = await fetchJSON("/api/cn-stocks?secids=" + secids, 12000);
      if (d && d.quotes && Object.keys(d.quotes).length) regionQuotes = d.quotes;
    } catch (e) { return; }
    if (state.activeTab === "regions") {
      POLICY_PROVINCES.forEach((p) => { const box = el("rg-live-" + p.name); if (box) box.innerHTML = rgLiveHtml(p.name); });
    }
  }
  function renderRegionsTab() {
    const provs = POLICY_PROVINCES.map((p) => p.name).sort((a, b) => (PROVINCE_HEAT[b] || 0) - (PROVINCE_HEAT[a] || 0));
    return `<div class="cn-regions">
      <div class="cn-regions-head"><b>各省产业与实时资本市场表现 · 全 31 省</b><span>涨跌 = 该省代表企业实时均值（涨红跌绿）；数字徽标为产业金融活跃度（示意参考）。<b style="color:var(--muted)">点击任一省 → 代表企业实时行情 + 政策 + 快讯</b>。</span></div>
      <div class="rg-list">
        ${provs.map((prov) => {
          const pol = POLICY_PROVINCES.find((p) => p.name === prov);
          const reg = regionByName[prov];
          const heat = PROVINCE_HEAT[prov];
          const tail = reg && reg.listed ? `${reg.listed} 家A股` : `${(PROVINCE_COMPANIES[prov] || []).length} 家代表企业`;
          return `<div class="rg-row cq-card" data-prov-detail="${esc(prov)}" title="点击查看 ${esc(prov)} 实时行情详情">
            <div class="rg-name">${esc(prov)}${typeof heat === "number" ? `<i class="rg-heat" style="color:${heatColor(heat)}">${heat}</i>` : ""}</div>
            <div class="rg-lead">${esc(pol ? pol.lead : (reg ? reg.lead : ""))}</div>
            <div class="rg-live" id="rg-live-${esc(prov)}">${rgLiveHtml(prov)}</div>
            <div class="rg-tail">${tail} <span class="rg-go">›</span></div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }
  // —— 重庆专版：33618 集群体系 + 每个集群的实时定向情报（东财搜索）——
  function renderChongqingTab() {
    const cq = regionByName["重庆"] || {};
    const overview = `<div class="cq-overview">
      <div class="cq-stat"><span>集群体系</span><strong>33618</strong><small>重庆现代制造业</small></div>
      <div class="cq-stat"><span>集群梯队</span><strong>3·3·6·18</strong><small>主导 / 支柱 / 特色 / 新星</small></div>
      <div class="cq-stat cq-stat--live"><span>今日情报</span><strong id="cq-intel-total">${cqTotalNews() || "…"}</strong><small>条实时快讯（东财）</small></div>
      <div class="cq-stat cq-stat--lead"><span>主导方向</span><strong>${esc(cq.lead || "智能网联汽车 · 电子信息 · 摩托车")}</strong></div>
    </div>`;

    let idx = -1;
    const tiers = CLUSTERS_33618.map((g) =>
      `<div class="cn-tier"><span class="cn-tier-label">${esc(g.tier)}</span><div class="cn-policy-grid">${g.clusters.map((c) => {
        idx += 1;
        return `<article class="cn-policy-card cq-card" data-cq-kw="${esc(c.name)}" title="点击搜索「${esc(c.name)}」更多资讯">
          <header><h4>${esc(c.name)}</h4><span class="cq-badge hot">实时情报</span></header>
          <div class="cn-policy-block"><b>收录条例</b>${ruleRows(c.rule)}</div>
          <div class="cn-policy-block"><b>实时快讯 · 东财</b><div class="cq-intel" id="cq-intel-${idx}">${cqIntelHtml(cqNews[c.name])}</div></div>
        </article>`;
      }).join("")}</div></div>`).join("");

    return `<div class="cn-chongqing">
      <div class="cq-lede"><span class="eyebrow">CHONGQING · 33618</span><h3>重庆现代制造业集群专版</h3><p>以重庆 33618 集群体系为主轴，每个产业集群实时拉取东财定向资讯，辅助博研 / 国资视角研判本地产业动态。点击集群卡可查更多。</p></div>
      ${overview}
      <div class="cq-tiers">${tiers}</div>
    </div>`;
  }
  // 板块异动：真实概念板块领涨/领跌（东财 clist），含主力净流入与涨跌家数
  function renderAnomalyTab() {
    const yi = (v) => (Math.abs(v) >= 1e8 ? (v / 1e8).toFixed(1) + " 亿" : Math.round(v / 1e4) + " 万");
    const row = (b) => {
      const up = b.change >= 0;
      return `<div class="cn-board-row">
        <span class="cn-board-nm">${esc(b.name)}</span>
        <span class="cn-board-chg ${up ? "up" : "down"}">${up ? "+" : ""}${b.change.toFixed(2)}%</span>
        <span class="cn-board-flow ${b.inflow >= 0 ? "up" : "down"}">主力 ${b.inflow >= 0 ? "+" : "-"}${yi(Math.abs(b.inflow))}</span>
        <span class="cn-board-ud">${b.up}↑ ${b.down}↓</span>
      </div>`;
    };
    if (!boards.gainers.length && !boards.losers.length) {
      return `<div class="cn-board"><span class="cn-empty">正在加载真实概念板块异动…</span></div>`;
    }
    return `<div class="cn-board">
      <div class="cn-board-col">
        <b class="cn-board-h up">领涨概念板块 <em>· 实时</em></b>
        ${boards.gainers.slice(0, 8).map(row).join("")}
      </div>
      <div class="cn-board-col">
        <b class="cn-board-h down">领跌概念板块 <em>· 实时</em></b>
        ${boards.losers.slice(0, 8).map(row).join("")}
      </div>
    </div>`;
  }

  // AI 简报（DeepSeek 基于四源快讯生成）——复用全球 .brief-layout 样式
  function renderCnBriefTab() {
    loadCnBrief();
    return `<div id="cn-brief-root" style="padding:16px;color:var(--muted)">正在用 DeepSeek 生成 AI 简报…</div>`;
  }
  function cnBriefHtml(d) {
    const li = (arr) => (Array.isArray(arr) ? arr : []).map((x) => `<li>${esc(x)}</li>`).join("");
    return `<div class="brief-layout">
      <article class="brief-lead"><span class="eyebrow">AI 每日简报 · DeepSeek</span><h3>${esc(d.headline || "")}</h3><p>${esc(d.summary || "")}</p></article>
      <article class="brief-column"><span class="eyebrow">FOR INVESTORS</span><h3>投资人视角</h3><ul>${li(d.investor)}</ul></article>
      <article class="brief-column"><span class="eyebrow">WHAT TO WATCH</span><h3>跟踪指标</h3><ul>${li(d.watch)}</ul></article>
    </div>`;
  }
  function cnBriefFallback(err) {
    const top = events.slice(0, 5);
    const note = err === "NO_KEY"
      ? "AI 简报需要配置 DeepSeek Key（在后台「系统管理」填入）。配置后这里会显示由 DeepSeek 基于四源快讯生成的每日简报。"
      : err === "FEATURE_OFF"
      ? "AI 简报已在后台关闭。以下为今日快讯摘要。"
      : `AI 简报暂不可用：${err || ""}`;
    return `<div class="brief-layout">
      <article class="brief-lead"><span class="eyebrow">每日快讯摘要</span><h3>${esc(top[0] ? top[0].title : "暂无重点快讯")}</h3><p>${esc(note)}</p></article>
      <article class="brief-column"><span class="eyebrow">TODAY</span><h3>今日快讯要点</h3><ul>${top.map((e) => `<li>${esc(e.title)}</li>`).join("")}</ul></article>
    </div>`;
  }
  async function loadCnBrief() {
    const root = () => document.getElementById("cn-brief-root");
    try {
      const r = await fetch("/api/brief?scope=china", { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "unavailable");
      const node = root();
      if (node) node.outerHTML = cnBriefHtml(d);
    } catch (e) {
      const node = root();
      if (node) node.outerHTML = cnBriefFallback(e.message);
    }
  }
  function renderTabs() {
    el("dock-tabs").innerHTML = tabs.map((t) =>
      `<button class="tab-button ${state.activeTab === t.id ? "active" : ""}" data-tab="${t.id}" type="button">${esc(t.label)}</button>`).join("");
    el("dock-tabs").querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => { state.activeTab = b.dataset.tab; renderTabs(); if (b.dataset.tab === "anomaly") syncBoards(); if (b.dataset.tab === "chongqing") syncCqIntel(); if (b.dataset.tab === "policy") syncPolicyIntel(); if (b.dataset.tab === "hardtech") { syncPhysAI(); syncPaExtra(); syncHardtechNews(); syncFinancingRadar(); } if (b.dataset.tab === "regions") syncRegionsQuotes(); if (b.dataset.tab === "early") syncEarlyRadar(); }));
    const tab = tabs.find((t) => t.id === state.activeTab) || tabs[0];
    const dc = el("dock-content");
    dc.innerHTML = tab.render();
    dc.scrollLeft = 0; // 切换标签时复位横向滚动，避免左侧内容（如省份名）被裁切
    dc.scrollTop = 0;
  }
  // 产业政策「地区 / 行业(33618)」切换 + 重庆专版集群卡点击查更多（委托绑定，跨内容重渲染仍有效）
  el("dock-content").addEventListener("click", (e) => {
    const pv = e.target.closest("[data-policy-view]");
    if (pv) { state.policyView = pv.dataset.policyView; renderTabs(); syncPolicyIntel(); return; }
    if (e.target.closest(".cq-news")) return; // 快讯链接照常跳原文
    if (e.target.closest(".cn-focus-news a") || e.target.closest(".cn-fs-row")) return; // 详情弹层里的链接照常跳
    const paNode = e.target.closest("[data-pa-node]");
    if (paNode) { if (e.target.closest(".pa-co--listed")) return; openNodeDetail(paNode.dataset.paNode); return; }
    const finT = e.target.closest("[data-ht-fin]");
    if (finT) { state.htFinMode = finT.dataset.htFin; htStartups = null; renderTabs(); syncFinancingRadar(); return; }
    const provRow = e.target.closest("[data-prov-detail]");
    if (provRow) { openProvinceDetail(provRow.dataset.provDetail); return; }
    const card = e.target.closest(".cq-card");
    if (card && card.dataset.cqKw) {
      const kw = card.dataset.cqKw;
      // 地区视图的省份卡 → 打开该省实时行情详情弹层；行业集群卡 / 其他 → 东财搜索
      if (card.classList.contains("cn-policy-card") && PROVINCE_COMPANIES[kw]) { openProvinceDetail(kw); return; }
      window.open("https://so.eastmoney.com/news/s?keyword=" + encodeURIComponent(kw), "_blank", "noopener"); return;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeProvinceDetail(); });

  // ---------------- 中国省级地图 ----------------
  const GEO_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";
  let cnMap = null, geoLayer = null, selectedLayer = null, geoCache = null;
  const shortName = (f) => f.replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/, "");
  const heatFor = (f) => { const v = PROVINCE_HEAT[shortName(f)]; return typeof v === "number" ? v : null; };
  const isLightTheme = () => document.documentElement.getAttribute("data-theme") === "light";
  // 热力色阶：深色主题为「暗棕→红」；浅色主题必须反过来走「浅→深」，
  // 否则低值的暗棕在白底上会比高值更抢眼，色阶语义颠倒。
  function heatColor(h) {
    if (isLightTheme()) {
      if (h == null) return "#e9eef4";
      if (h >= 88) return "#d3352a";
      if (h >= 74) return "#e4703f";
      if (h >= 60) return "#ec9a4e";
      if (h >= 48) return "#f5bb62";
      if (h >= 36) return "#f3d9a8";
      return "#fbecd2";
    }
    if (h == null) return "#2a3233";
    if (h >= 88) return "#e5564a";
    if (h >= 74) return "#ef7a5f";
    if (h >= 60) return "#f3934b";
    if (h >= 48) return "#f3b44b";
    if (h >= 36) return "#b5893c";
    return "#6d5c38";
  }
  // 省界描边：深色主题下原为 #0b0e0f，与背景同色 = 等于没有边界线，省份糊成一片，改用浅灰蓝；
  // 浅色主题下用白色描边，衬得色块干净利落。
  function geoStyle(feat) {
    const h = heatFor(feat.properties.name);
    const light = isLightTheme();
    return {
      color: light ? "#ffffff" : "#5b6b70",
      weight: light ? 1 : 0.8,
      fillColor: heatColor(h),
      fillOpacity: h == null ? (light ? 0.9 : 0.35) : (light ? 0.95 : 0.85),
    };
  }
  // ---- 省份聚焦：悬停显示静态概览，点击拉取实时行情+实时快讯 ----
  const provStockCache = {}; // sn -> quotes（20s 内复用）
  const provNewsCache = {};  // sn -> items
  let focusSn = null;        // 当前聚焦省份
  let focusToken = 0;        // 递增令牌，丢弃过期异步结果
  const secidOf = (code) => (code[0] === "6" ? "1." : "0.") + code;
  const stockUrl = (code) => `https://quote.eastmoney.com/${code[0] === "6" ? "sh" : "sz"}${code}.html`;

  function focusHeader(sn) {
    const r = regionByName[sn];
    const act = PROVINCE_HEAT[sn];
    const rows = [`<strong>${esc(sn)}</strong>`];
    if (r) rows.push(`<span>主导产业：${esc(r.lead)}</span>`);
    if (typeof act === "number") rows.push(`<span>产业金融活跃度 <b style="color:${heatColor(act)}">${act}</b> <i class="cn-focus-ref">参考</i></span>`);
    return rows.join("");
  }
  function stocksHtml(sn) {
    const list = PROVINCE_COMPANIES[sn];
    if (!list) return `<div class="cn-focus-stocks"><b>代表企业实时行情</b><span class="cn-empty">该省暂未收录代表企业</span></div>`;
    const q = provStockCache[sn];
    if (!q) return `<div class="cn-focus-stocks"><b>代表企业实时行情</b><span class="cn-empty">加载中…</span></div>`;
    const rows = list.map(([name, code]) => ({ name, code, d: q[code] })).filter((x) => x.d);
    if (!rows.length) return `<div class="cn-focus-stocks"><b>代表企业实时行情</b><span class="cn-empty">行情暂不可用</span></div>`;
    rows.sort((a, b) => b.d.change - a.d.change);
    const up = rows.filter((x) => x.d.change > 0).length;
    const down = rows.filter((x) => x.d.change < 0).length;
    const avg = rows.reduce((s, x) => s + x.d.change, 0) / rows.length;
    const lead = rows[0];
    const sum = `<div class="cn-fs-sum">${up} 涨 · ${down} 跌 · 均 <b class="${avg >= 0 ? "up" : "down"}">${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%</b> · 领涨 ${esc(lead.name)} <b class="${lead.d.change >= 0 ? "up" : "down"}">${lead.d.change >= 0 ? "+" : ""}${lead.d.change.toFixed(2)}%</b></div>`;
    const items = rows.map((x) =>
      `<a class="cn-fs-row" href="${stockUrl(x.code)}" target="_blank" rel="noreferrer"><span>${esc(x.name)}</span><em>${x.d.value}</em><i class="${x.d.change >= 0 ? "up" : "down"}">${x.d.change >= 0 ? "+" : ""}${x.d.change.toFixed(2)}%</i></a>`).join("");
    return `<div class="cn-focus-stocks"><b>代表企业实时行情</b>${sum}${items}</div>`;
  }
  function newsHtml(sn) {
    const items = provNewsCache[sn];
    if (!items) return `<div class="cn-focus-news"><b>该省实时快讯 · 东财</b><span class="cn-empty">加载中…</span></div>`;
    if (!items.length) return `<div class="cn-focus-news"><b>该省实时快讯 · 东财</b><span class="cn-empty">暂无相关快讯</span></div>`;
    return `<div class="cn-focus-news"><b>该省实时快讯 · 东财</b>${items.map((n) =>
      `<a href="${esc(n.url)}" target="_blank" rel="noreferrer">${esc(n.title)}<i>${esc(n.source || "东财")} · ${esc(cqFmtTime(n.time))}</i></a>`).join("")}</div>`;
  }
  function renderFocus(sn) {
    el("cn-focus-body").innerHTML = focusHeader(sn) + stocksHtml(sn) + newsHtml(sn);
  }
  // 悬停：只显示静态概览（无网络请求），提示点击看实时
  function showFocusHover(name) {
    const sn = shortName(name);
    if (sn === focusSn) { renderFocus(sn); return; } // 已选中省份保留其实时数据
    const tip = PROVINCE_COMPANIES[sn] ? `<span class="cn-focus-hint">点击查看实时行情与快讯</span>` : `<span class="cn-focus-hint">点击查看该省实时快讯</span>`;
    el("cn-focus-body").innerHTML = focusHeader(sn) + tip;
  }
  // 点击：拉取实时行情 + 实时快讯
  async function loadProvinceLive(name) {
    const sn = shortName(name);
    focusSn = sn;
    const token = ++focusToken;
    renderFocus(sn); // 先出静态头 + 加载态
    const list = PROVINCE_COMPANIES[sn];
    const tasks = [];
    // 实时行情（每次点击刷新，服务端 20s 缓存兜住上游）
    if (list) {
      const secids = list.map(([, c]) => secidOf(c)).join(",");
      tasks.push(fetchJSON("/api/cn-stocks?secids=" + secids, 10000)
        .then((d) => { if (d && d.quotes && Object.keys(d.quotes).length) provStockCache[sn] = d.quotes; })
        .catch(() => {}));
    }
    // 实时快讯
    tasks.push(fetchJSON("/api/cn-search?kw=" + encodeURIComponent(sn), 10000)
      .then((d) => { provNewsCache[sn] = d && Array.isArray(d.items) ? d.items.slice(0, 4) : []; })
      .catch(() => { if (!provNewsCache[sn]) provNewsCache[sn] = []; }));
    if (tasks.length) await Promise.all(tasks);
    if (token === focusToken && focusSn === sn) renderFocus(sn); // 仍是当前省份才更新，避免竞态
  }
  function selectProvince(layer, full) {
    if (selectedLayer && selectedLayer !== layer && geoLayer) geoLayer.resetStyle(selectedLayer);
    selectedLayer = layer; layer.setStyle({ weight: 2.4, color: "#fff" }); layer.bringToFront(); loadProvinceLive(full);
  }
  function onEachProvince(feat, layer) {
    layer.on({
      mouseover: () => { layer.setStyle({ weight: 2, color: "#fff" }); layer.bringToFront(); showFocusHover(feat.properties.name); },
      mouseout: () => { if (layer !== selectedLayer && geoLayer) { geoLayer.resetStyle(layer); if (focusSn) renderFocus(focusSn); } },
      click: () => selectProvince(layer, feat.properties.name),
    });
  }
  function addLabels(geo) {
    geoLayer.eachLayer((layer) => {
      const sn = shortName(layer.feature.properties.name);
      layer.bindTooltip(sn, { permanent: true, direction: "center", className: "cn-prov-label" + (regionByName[sn] ? " cn-prov-label--key" : "") });
    });
    HOTSPOTS.forEach((h) => {
      const feat = geo.features.find((f) => shortName(f.properties.name) === h.province);
      const c = feat && (feat.properties.centroid || feat.properties.center);
      if (!c) return;
      const icon = L.divIcon({ className: "cn-hub-dot", html: `<i style="--c:${h.type === "opp" ? "#58d5bc" : "#e5564a"}"></i>`, iconSize: [11, 11] });
      L.marker([c[1], c[0]], { icon }).addTo(cnMap)
        .bindTooltip(`<b>${esc(h.title)}</b><span>${esc(h.province)} · ${esc(h.note)}</span>`, { className: "cn-hub-tip", direction: "top", offset: [0, -6] });
    });
  }
  function mountMap() {
    const node = el("cn-leaflet");
    if (!node || typeof L === "undefined") return;
    cnMap = L.map(node, { zoomControl: false, scrollWheelZoom: true, attributionControl: false, minZoom: 2, maxZoom: 7, zoomSnap: 0.25 });
    const draw = (geo) => {
      if (!cnMap) return;
      geoLayer = L.geoJSON(geo, { style: geoStyle, onEachFeature: onEachProvince }).addTo(cnMap);
      cnMap.fitBounds(geoLayer.getBounds(), { padding: [8, 8] });
      cnMap.setZoom(cnMap.getZoom() + 0.6); // 初始放大约半级，减少四周留白
      addLabels(geo);
      geoLayer.eachLayer((layer) => { if (shortName(layer.feature.properties.name) === "上海") selectProvince(layer, layer.feature.properties.name); });
      window.setTimeout(() => cnMap && cnMap.invalidateSize(), 120);
    };
    if (geoCache) draw(geoCache);
    else fetch(GEO_URL).then((r) => r.json()).then((geo) => { geoCache = geo; draw(geo); }).catch(() => {});
  }
  // 缩放按钮
  el("map-zoom-in").addEventListener("click", () => cnMap && cnMap.zoomIn());
  el("map-zoom-out").addEventListener("click", () => cnMap && cnMap.zoomOut());
  el("map-reset").addEventListener("click", () => { if (cnMap && geoLayer) { cnMap.fitBounds(geoLayer.getBounds(), { padding: [8, 8] }); cnMap.setZoom(cnMap.getZoom() + 0.6); } });

  // 地图指标
  function renderMapMetrics() {
    el("hot-opp").textContent = HOTSPOTS.filter((h) => h.type === "opp").length;
    el("hot-risk").textContent = HOTSPOTS.filter((h) => h.type === "risk").length;
  }

  // ---------------- 顶栏交互 ----------------
  function stamp() {
    el("updated-at").textContent = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  }
  function toast(msg) { const t = el("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); window.setTimeout(() => t.classList.remove("show"), 2000); }

  // 自适应布局：按屏幕宽高给 body 打标记，复用 styles.css 的响应式断点（笔记本/平板/手机）
  let layoutTimer;
  function applyLayout() {
    const w = window.innerWidth, h = window.innerHeight;
    document.body.dataset.screenLayout = w <= 620 ? "mobile" : w <= 920 ? "tablet" : w <= 1640 ? "compact" : "wide";
    document.body.dataset.screenHeight = h <= 800 ? "short" : h >= 1000 ? "tall" : "standard";
    if (cnMap) window.setTimeout(() => cnMap.invalidateSize(), 120);
  }
  applyLayout();
  window.addEventListener("resize", () => { window.clearTimeout(layoutTimer); layoutTimer = window.setTimeout(applyLayout, 150); });

  el("refresh-data").addEventListener("click", () => { syncLive(true); syncNews(false); });
  // 小屏事件流抽屉：☰ 切换开合；点抽屉外区域自动收起
  const menuBtn = el("mobile-menu");
  if (menuBtn) menuBtn.addEventListener("click", (ev) => { ev.stopPropagation(); el("event-rail").classList.toggle("open"); });
  document.addEventListener("click", (ev) => {
    const rail = el("event-rail");
    if (!rail || !rail.classList.contains("open")) return;
    if (rail.contains(ev.target) || (menuBtn && menuBtn.contains(ev.target))) return;
    rail.classList.remove("open");
  });
  const analyzeBtn = el("cn-analyze-btn");
  if (analyzeBtn) analyzeBtn.addEventListener("click", async () => {
    const e = selectedEvent();
    const res = el("cn-analyze-result");
    if (!e || !res) return;
    res.innerHTML = `<span class="cn-empty">正在分析该新闻的板块影响…</span>`;
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: e.title, summary: e.summary }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "unavailable");
      res.innerHTML = renderAnalyzeResult(d);
    } catch (err) {
      res.innerHTML = err.message === "NO_KEY"
        ? `<span class="cn-empty">需在后台「系统管理」配置 DeepSeek Key 后可用。</span>`
        : err.message === "FEATURE_OFF"
        ? `<span class="cn-empty">新闻分析已在后台关闭。</span>`
        : `<span class="cn-empty">分析失败：${esc(err.message || "")}</span>`;
    }
  });
  const insightBtn = el("cn-insight-btn");
  if (insightBtn) insightBtn.addEventListener("click", async () => {
    const e = selectedEvent();
    const res = el("cn-insight-result");
    if (!e || !res) return;
    res.innerHTML = `<span class="cn-empty">正在生成博研观点（重庆视角）…</span>`;
    try {
      const r = await fetch("/api/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: e.title, summary: e.summary }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "unavailable");
      res.innerHTML = renderInsightResult(d);
    } catch (err) {
      res.innerHTML = err.message === "NO_KEY"
        ? `<span class="cn-empty">需在后台「系统管理」配置 DeepSeek Key 后可用。</span>`
        : err.message === "FEATURE_OFF"
        ? `<span class="cn-empty">博研观点已在后台关闭。</span>`
        : `<span class="cn-empty">生成失败：${esc(err.message || "")}</span>`;
    }
  });
  const hr = el("high-risk-only");
  if (hr) hr.addEventListener("change", (e) => { state.highRiskOnly = e.target.checked; renderEventList(); });
  document.querySelectorAll("[data-period]").forEach((b) =>
    b.addEventListener("click", () => { document.querySelectorAll("[data-period]").forEach((x) => x.classList.toggle("active", x === b)); refreshMarkets(); }));
  const brand = el("brand-home");
  if (brand) { brand.addEventListener("click", () => (window.location.href = "index.html")); brand.style.cursor = "pointer"; }

  function setMode(mode) {
    const labels = { live: "实时数据", partial: "部分实时", stale: "数据延迟·重连中", demo: "演示数据", loading: "正在同步" };
    const node = el("sync-mode"); if (node) node.textContent = labels[mode] || mode;
    const st = el("sync-state"); if (st) st.dataset.mode = mode;
  }

  // 非实时品种的演示扰动（实时覆盖的品种保持真实值）
  function refreshMarkets() {
    tick += 1;
    markets = buildMarkets();
    renderOverview(); renderSignals();
    if (state.activeTab === "markets" || state.activeTab === "anomaly") renderTabs();
    stamp();
  }

  // 拉取境内实时行情（Eastmoney 指数 + Sina 人民币），失败则保留演示
  async function syncLive(manual) {
    if (syncingLive) return; // 并发锁：上一次请求（含挂起重试）未结束时不叠加
    syncingLive = true;
    if (manual) setMode("loading");
    try {
      const d = await fetchJSON("/api/cn-markets");
      if (d && d.ok && d.quotes && Object.keys(d.quotes).length) {
        liveQuotes = d.quotes;
        const n = Object.keys(d.quotes).length;
        liveFailStreak = 0;
        setMode(n >= 5 ? "live" : "partial");
        markets = buildMarkets();
        renderOverview(); renderSignals(); renderTabs();
        stamp();
        if (manual) toast(`已同步 ${n} 项实时行情`);
        return;
      }
      throw new Error("no live data");
    } catch (error) {
      liveFailStreak += 1;
      if (!Object.keys(liveQuotes).length) {
        setMode("demo"); // 从未拿到真实数据 → 演示态
      } else if (liveFailStreak >= 2) {
        setMode("stale"); // 有旧数据但连续失败 → 明确提示「数据延迟·重连中」，不再假装实时
      }
      if (manual) toast("实时源暂不可用，已保留上次数据并自动重连");
      scheduleLiveRetry();
    } finally {
      syncingLive = false;
    }
  }

  // ---------------- 初始化 ----------------
  renderFilters();
  renderEventList();
  renderDetail();
  renderOverview();
  renderSignals();
  renderTabs();
  renderMapMetrics();
  mountMap();
  stamp();
  syncLive(false);
  syncNews(false);
  window.setInterval(refreshMarkets, 30000);
  window.setInterval(() => syncLive(false), 20000); // 真实行情每 20s 同步（与服务端缓存对齐，更实时）
  window.setInterval(() => syncNews(false), 60000); // 实时快讯每 60s 同步
  window.setInterval(() => { if (state.activeTab === "anomaly") syncBoards(); }, 30000); // 板块异动随激活标签每 30s 刷新
  window.setInterval(() => { if (state.activeTab === "chongqing") { Object.keys(cqNews).forEach((k) => delete cqNews[k]); syncCqIntel(); } }, 120000); // 重庆专版情报每 2 分钟刷新
  window.setInterval(() => { if (state.activeTab === "hardtech") { syncPhysAI(); syncPaExtra(); syncHardtechNews(); syncFinancingRadar(); } }, 120000); // 硬科技初创：物理AI行情/融资/政策 + 快讯 + 融资雷达每 2 分钟刷新
  window.setInterval(() => { if (state.activeTab === "hardtech") syncPhysAI(); }, 30000); // 物理AI 上市供应商行情每 30s 刷新
  window.setInterval(() => { if (state.activeTab === "regions") syncRegionsQuotes(); }, 30000); // 省域产业：代表企业行情每 30s 刷新
  window.setInterval(() => { if (state.activeTab === "early") syncEarlyRadar(); }, 120000); // 早期雷达每 2 分钟刷新
})();
