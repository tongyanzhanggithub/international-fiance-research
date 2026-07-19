const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const auth = require("./auth.js");
const translate = require("./translate.js");
const config = require("./config.js");
const archive = require("./archive.js");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const periods = {
  day: { label: "日", gdelt: "1d", marketRange: "1d", marketInterval: "5m", days: 1 },
  week: { label: "周", gdelt: "7d", marketRange: "5d", marketInterval: "1h", days: 7 },
  month: { label: "月", gdelt: "30d", marketRange: "1mo", marketInterval: "1d", days: 30 },
};

const quoteAssets = [
  ["SPX", "^GSPC", "标普 500", "股票指数"],
  ["HSI", "^HSI", "恒生指数", "股票指数"],
  ["CSI300", "000300.SS", "沪深 300", "股票指数"],
  ["STOXX", "^STOXX", "欧洲 STOXX 600", "股票指数"],
  ["USDCNY", "CNY=X", "美元 / 人民币", "汇率"],
  ["EURUSD", "EURUSD=X", "欧元 / 美元", "汇率"],
  ["USDJPY", "JPY=X", "美元 / 日元", "汇率"],
  ["DXY", "DX-Y.NYB", "美元指数", "汇率"],
  ["BRENT", "BZ=F", "布伦特原油", "商品"],
  ["GOLD", "GC=F", "黄金", "商品"],
  ["COPPER", "HG=F", "铜", "商品"],
  ["NATGAS", "NG=F", "天然气", "商品"],
  ["ALUMINUM", "ALI=F", "铝", "商品"],
  ["US10Y", "^TNX", "美国十年期国债", "利率"],
  ["VIX", "^VIX", "波动率指数", "风险情绪"],
  ["BTC", "BTC-USD", "比特币", "加密资产"],
];

const industryWatchDomains = [
  {
    id: "ai",
    label: "AI",
    query: '("OpenAI" OR Anthropic OR "Google DeepMind" OR Microsoft OR Meta OR NVIDIA) ("AI" OR "artificial intelligence" OR "foundation model" OR "enterprise AI")',
    gdeltQuery: '("OpenAI" OR Anthropic OR "Google DeepMind" OR Microsoft OR Meta OR NVIDIA) ("artificial intelligence" OR AI OR "foundation model" OR "enterprise AI") sourcelang:english',
    queries: ["OpenAI AI", "Anthropic AI", "Google DeepMind AI", "Microsoft AI", "Meta AI", "NVIDIA AI", "enterprise AI"],
    tags: ["基础模型", "企业AI", "云服务"],
    pattern: /(openai|anthropic|deepmind|artificial intelligence|foundation model|enterprise ai|generative ai|large language model|\bllm\b|microsoft copilot|meta ai)/i,
  },
  {
    id: "robotics",
    label: "机器人",
    query: '("humanoid robot" OR robotics OR "industrial robot" OR automation) (Tesla OR "Figure AI" OR "Boston Dynamics" OR FANUC OR Yaskawa OR ABB OR Unitree OR UBTECH)',
    gdeltQuery: '("humanoid robot" OR robotics OR "industrial robot" OR automation) (Tesla OR "Figure AI" OR "Boston Dynamics" OR FANUC OR Yaskawa OR ABB OR Unitree OR UBTECH) sourcelang:english',
    queries: ["Tesla humanoid robot", "Figure AI robot", "Boston Dynamics robot", "FANUC robot automation", "Yaskawa robot", "ABB robotics automation", "Unitree robot", "UBTECH robot"],
    tags: ["机器人", "自动化", "量产"],
    pattern: /(robot|humanoid|automation|fanuc|yaskawa|unitree|ubtech|figure ai|boston dynamics|\babb\b|industrial automation|warehouse automation)/i,
  },
  {
    id: "physical-ai",
    label: "物理AI",
    query: '("physical AI" OR "embodied AI" OR "embodied intelligence" OR "world model" OR "edge AI" OR "digital twin" OR "vision-language-action") (NVIDIA OR Tesla OR "Google DeepMind" OR "Figure AI" OR Covariant OR "Skild AI" OR Unitree)',
    gdeltQuery: '("physical AI" OR "embodied AI" OR "embodied intelligence" OR "world model" OR "edge AI" OR "digital twin" OR "vision-language-action") (NVIDIA OR Tesla OR "Google DeepMind" OR "Figure AI" OR Covariant OR "Skild AI" OR Unitree OR robotics) sourcelang:english',
    queries: ["physical AI NVIDIA", "embodied AI robot", "world model robotics", "vision-language-action robot", "edge AI robot", "digital twin robotics", "Skild AI robot", "Covariant robot"],
    tags: ["物理AI", "具身智能", "边缘推理"],
    pattern: /(physical ai|embodied ai|embodied intelligence|world model|edge ai|digital twin|vision-language-action|vla model|robot foundation model|spatial intelligence)/i,
  },
  {
    id: "compute",
    label: "算力芯片",
    query: '(NVIDIA OR AMD OR Broadcom OR Qualcomm OR Arm OR TSMC OR "SK Hynix" OR Samsung) ("AI chip" OR GPU OR accelerator OR HBM OR "edge AI")',
    gdeltQuery: '(NVIDIA OR AMD OR Broadcom OR Qualcomm OR Arm OR TSMC OR "SK Hynix" OR Samsung) ("AI chip" OR GPU OR accelerator OR HBM OR "edge AI") sourcelang:english',
    queries: ["NVIDIA GPU AI chip", "AMD AI chip", "Broadcom AI chip", "Qualcomm edge AI", "Arm AI chip", "TSMC AI chip", "SK Hynix HBM", "Samsung HBM"],
    tags: ["AI芯片", "HBM", "边缘算力"],
    pattern: /(gpu|hbm|ai chip|accelerator|semiconductor|wafer|foundry|tsmc|sk hynix|samsung|amd|broadcom|qualcomm|\barm\b|nvidia|advanced packaging|chiplet)/i,
  },
  {
    id: "cloud",
    label: "云与数据中心",
    query: '(Amazon OR AWS OR Microsoft OR Azure OR Google OR Oracle OR Cloudflare OR "data center") (cloud OR datacenter OR "AI infrastructure" OR capex)',
    gdeltQuery: '(AWS OR Azure OR "Google Cloud" OR Oracle OR Cloudflare OR "data center" OR datacenter OR "AI infrastructure") sourcelang:english',
    queries: ["AWS cloud AI", "Azure AI infrastructure", "Google Cloud AI", "Oracle cloud AI", "data center AI capex", "Cloudflare AI"],
    tags: ["云计算", "数据中心", "AI基础设施"],
    pattern: /(aws|azure|google cloud|oracle cloud|cloudflare|data center|datacenter|cloud computing|ai infrastructure|server rack|hyperscaler)/i,
  },
  {
    id: "cybersecurity",
    label: "网络安全",
    query: '(CrowdStrike OR Palo Alto Networks OR Fortinet OR Zscaler OR Cloudflare OR SentinelOne OR "cybersecurity") (breach OR ransomware OR vulnerability OR security)',
    gdeltQuery: '(CrowdStrike OR "Palo Alto Networks" OR Fortinet OR Zscaler OR SentinelOne OR cybersecurity OR ransomware OR vulnerability) sourcelang:english',
    queries: ["cybersecurity ransomware", "CrowdStrike security", "Palo Alto Networks security", "Fortinet cybersecurity", "Zscaler security", "SentinelOne security"],
    tags: ["网络安全", "勒索软件", "漏洞"],
    pattern: /(cybersecurity|cyber security|ransomware|vulnerability|data breach|zero-day|crowdstrike|palo alto networks|fortinet|zscaler|sentinelone)/i,
  },
  {
    id: "ev-battery",
    label: "智能汽车与电池",
    query: '(Tesla OR BYD OR CATL OR Panasonic OR LG Energy Solution OR Rivian OR "electric vehicle" OR battery) (EV OR battery OR autonomous OR lidar)',
    gdeltQuery: '(Tesla OR BYD OR CATL OR Panasonic OR "LG Energy Solution" OR Rivian OR "electric vehicle" OR battery OR autonomous vehicle OR lidar) sourcelang:english',
    queries: ["Tesla EV battery", "BYD electric vehicle", "CATL battery", "autonomous vehicle lidar", "Rivian EV", "LG Energy Solution battery"],
    tags: ["智能汽车", "动力电池", "自动驾驶"],
    pattern: /(electric vehicle|\bev\b|battery|catl|byd|lg energy solution|panasonic|rivian|autonomous vehicle|self-driving|lidar|solid-state battery)/i,
  },
  {
    id: "quantum",
    label: "量子科技",
    query: '("quantum computing" OR "quantum chip" OR "quantum encryption" OR IBM OR IonQ OR Rigetti OR D-Wave)',
    gdeltQuery: '("quantum computing" OR "quantum chip" OR "quantum encryption" OR IonQ OR Rigetti OR D-Wave) sourcelang:english',
    queries: ["quantum computing", "IBM quantum", "IonQ quantum", "Rigetti quantum", "D-Wave quantum", "quantum encryption"],
    tags: ["量子计算", "量子通信", "前沿研发"],
    pattern: /(quantum computing|quantum chip|quantum encryption|ionq|rigetti|d-wave|quantum processor|qubit)/i,
  },
  {
    id: "space-defense",
    label: "航天与防务科技",
    query: '(SpaceX OR Starlink OR Rocket Lab OR Palantir OR Anduril OR satellite OR drone) (space OR defense OR launch OR geospatial)',
    gdeltQuery: '(SpaceX OR Starlink OR "Rocket Lab" OR Palantir OR Anduril OR satellite OR drone OR geospatial) sourcelang:english',
    queries: ["SpaceX Starlink", "Rocket Lab launch", "Palantir defense AI", "Anduril drone", "satellite geospatial", "drone defense tech"],
    tags: ["商业航天", "卫星", "防务科技"],
    pattern: /(spacex|starlink|rocket lab|satellite|space launch|palantir|anduril|drone|uav|geospatial|defense tech)/i,
  },
  {
    id: "consumer-devices",
    label: "消费电子",
    query: '(Apple OR Samsung OR Sony OR Xiaomi OR Huawei OR Lenovo OR "consumer electronics" OR smartphone OR PC) (AI OR device OR headset OR smartphone)',
    gdeltQuery: '(Apple OR Samsung OR Sony OR Xiaomi OR Huawei OR Lenovo OR smartphone OR PC OR headset OR "consumer electronics") sourcelang:english',
    queries: ["Apple AI device", "Samsung smartphone AI", "Huawei smartphone", "Xiaomi EV smartphone", "Lenovo PC AI", "Sony device"],
    tags: ["端侧AI", "智能终端", "消费电子"],
    pattern: /(apple|iphone|ipad|mac|samsung|sony|xiaomi|huawei|lenovo|smartphone|pc market|headset|consumer electronics|on-device ai)/i,
  },
  {
    id: "biotech",
    label: "生物科技",
    query: '(Moderna OR BioNTech OR CRISPR OR "gene editing" OR "AI drug discovery" OR biotech) (trial OR approval OR platform)',
    gdeltQuery: '(Moderna OR BioNTech OR CRISPR OR "gene editing" OR "AI drug discovery" OR biotech OR "clinical trial") sourcelang:english',
    queries: ["AI drug discovery", "CRISPR gene editing", "Moderna biotech", "BioNTech biotech", "biotech clinical trial"],
    tags: ["AI制药", "基因编辑", "临床进展"],
    pattern: /(biotech|ai drug discovery|drug discovery|crispr|gene editing|clinical trial|moderna|biontech|recursion pharmaceuticals)/i,
  },
  {
    id: "fintech-crypto",
    label: "金融科技",
    query: '(Stripe OR Block OR PayPal OR Coinbase OR Bitcoin OR stablecoin OR fintech) (payment OR crypto OR regulation)',
    gdeltQuery: '(Stripe OR Block OR PayPal OR Coinbase OR Bitcoin OR stablecoin OR fintech OR crypto) sourcelang:english',
    queries: ["fintech payment", "Stripe fintech", "PayPal stablecoin", "Coinbase crypto", "Bitcoin regulation", "stablecoin regulation"],
    tags: ["支付科技", "加密资产", "稳定币"],
    pattern: /(fintech|stripe|paypal|coinbase|stablecoin|bitcoin|crypto|digital payment|block inc)/i,
  },
];

const industryCompanies = [
  ["NVIDIA", "NVDA", /nvidia/i, "美国 / 全球"],
  ["OpenAI", "", /openai/i, "美国 / 全球"],
  ["Anthropic", "", /anthropic/i, "美国 / 全球"],
  ["Google DeepMind", "GOOGL", /deepmind|google/i, "美国 / 英国"],
  ["Microsoft", "MSFT", /microsoft/i, "美国 / 全球"],
  ["Meta", "META", /\bmeta\b/i, "美国 / 全球"],
  ["Tesla", "TSLA", /tesla|optimus/i, "美国 / 中国"],
  ["Figure AI", "", /figure ai/i, "美国"],
  ["Boston Dynamics", "", /boston dynamics/i, "美国 / 韩国"],
  ["FANUC", "", /fanuc/i, "日本 / 全球"],
  ["Yaskawa", "", /yaskawa/i, "日本 / 全球"],
  ["ABB", "", /\babb\b/i, "欧洲 / 全球"],
  ["Unitree", "", /unitree/i, "中国 / 全球"],
  ["UBTECH", "", /ubtech/i, "中国 / 全球"],
  ["AMD", "AMD", /\bamd\b|advanced micro devices/i, "美国 / 全球"],
  ["Broadcom", "AVGO", /broadcom/i, "美国 / 全球"],
  ["Qualcomm", "QCOM", /qualcomm/i, "美国 / 全球"],
  ["Arm", "ARM", /\barm\b/i, "英国 / 全球"],
  ["TSMC", "TSM", /tsmc|taiwan semiconductor/i, "中国台湾 / 全球"],
  ["SK Hynix", "", /sk hynix/i, "韩国 / 全球"],
  ["Samsung", "", /samsung/i, "韩国 / 全球"],
  ["AWS", "AMZN", /\baws\b|amazon web services/i, "美国 / 全球"],
  ["Amazon", "AMZN", /amazon/i, "美国 / 全球"],
  ["Google Cloud", "GOOGL", /google cloud/i, "美国 / 全球"],
  ["Oracle", "ORCL", /oracle/i, "美国 / 全球"],
  ["Cloudflare", "NET", /cloudflare/i, "美国 / 全球"],
  ["CrowdStrike", "CRWD", /crowdstrike/i, "美国 / 全球"],
  ["Palo Alto Networks", "PANW", /palo alto networks/i, "美国 / 全球"],
  ["Fortinet", "FTNT", /fortinet/i, "美国 / 全球"],
  ["Zscaler", "ZS", /zscaler/i, "美国 / 全球"],
  ["SentinelOne", "S", /sentinelone/i, "美国 / 全球"],
  ["BYD", "1211.HK", /\bbyd\b/i, "中国 / 全球"],
  ["CATL", "300750.SZ", /\bcatl\b|contemporary amperex/i, "中国 / 全球"],
  ["Panasonic", "", /panasonic/i, "日本 / 全球"],
  ["LG Energy Solution", "", /lg energy solution/i, "韩国 / 全球"],
  ["Rivian", "RIVN", /rivian/i, "美国"],
  ["Apple", "AAPL", /\bapple\b|iphone|ipad|mac\b/i, "美国 / 全球"],
  ["Sony", "SONY", /\bsony\b/i, "日本 / 全球"],
  ["Xiaomi", "1810.HK", /xiaomi/i, "中国 / 全球"],
  ["Huawei", "", /huawei/i, "中国 / 全球"],
  ["Lenovo", "0992.HK", /lenovo/i, "中国 / 全球"],
  ["IBM", "IBM", /\bibm\b/i, "美国 / 全球"],
  ["IonQ", "IONQ", /ionq/i, "美国"],
  ["Rigetti", "RGTI", /rigetti/i, "美国"],
  ["D-Wave", "QBTS", /d-wave/i, "加拿大 / 美国"],
  ["SpaceX", "", /spacex|starlink/i, "美国 / 全球"],
  ["Rocket Lab", "RKLB", /rocket lab/i, "美国 / 新西兰"],
  ["Palantir", "PLTR", /palantir/i, "美国 / 全球"],
  ["Anduril", "", /anduril/i, "美国"],
  ["Moderna", "MRNA", /moderna/i, "美国 / 全球"],
  ["BioNTech", "BNTX", /biontech/i, "德国 / 全球"],
  ["CRISPR Therapeutics", "CRSP", /crispr therapeutics|crispr/i, "瑞士 / 美国"],
  ["Stripe", "", /stripe/i, "美国 / 全球"],
  ["Block", "XYZ", /block inc|square payments/i, "美国 / 全球"],
  ["PayPal", "PYPL", /paypal/i, "美国 / 全球"],
  ["Coinbase", "COIN", /coinbase/i, "美国 / 全球"],
];

const techRssSources = [
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", defaultDomainId: "ai" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", defaultDomainId: "consumer-devices" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", defaultDomainId: "compute" },
  { source: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", defaultDomainId: "ai" },
  { source: "The Robot Report", url: "https://www.therobotreport.com/feed/", defaultDomainId: "robotics" },
  { source: "IEEE Spectrum Robotics", url: "https://spectrum.ieee.org/rss/robotics/fulltext", defaultDomainId: "robotics" },
  { source: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", defaultDomainId: "cybersecurity" },
  { source: "Cybersecurity Dive", url: "https://www.cybersecuritydive.com/feeds/news/", defaultDomainId: "cybersecurity" },
  { source: "Electrek", url: "https://electrek.co/feed/", defaultDomainId: "ev-battery" },
  { source: "SpaceNews", url: "https://spacenews.com/feed/", defaultDomainId: "space-defense" },
  { source: "Fierce Biotech", url: "https://www.fiercebiotech.com/rss/xml", defaultDomainId: "biotech" },
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", defaultDomainId: "fintech-crypto" },
  { source: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", defaultDomainId: "ai" },
  { source: "Wired", url: "https://www.wired.com/feed/rss", defaultDomainId: "consumer-devices" },
  { source: "Financial Times Technology", url: "https://www.ft.com/technology?format=rss", defaultDomainId: "compute" },
  { source: "Nikkei Asia", url: "https://asia.nikkei.com/rss/feed/nar", defaultDomainId: "ai" },
  { source: "Data Center Dynamics", url: "https://www.datacenterdynamics.com/en/rss/", defaultDomainId: "cloud" },
  { source: "Quantum Computing Report", url: "https://quantumcomputingreport.com/feed/", defaultDomainId: "quantum" },
  { source: "CNBC Tech", url: "https://www.cnbc.com/id/19854910/device/rss/rss.html", defaultDomainId: "ai" },
  { source: "ZDNet", url: "https://www.zdnet.com/news/rss.xml", defaultDomainId: "compute" },
];

const cache = new Map();
const lastGood = new Map();
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// ── 数据源健康埋点：每个 cachedProvider key 的成功/失败/耗时，供后台监控 ──
const sourceHealth = new Map();
const SOURCE_LABELS = {
  snapshot: "全球快照（事件+行情）",
  "cn-markets": "境内行情（新浪/东财）",
  "cn-news": "中国财经快讯（多源）",
  "cn-boards": "板块异动（东财）",
  "cn-search": "定向资讯搜索（东财）",
};
function recordSource(key, ok, ms, errMsg) {
  const h = sourceHealth.get(key) || { key, okCount: 0, errCount: 0, lastOkAt: null, lastErrAt: null, lastMs: 0, lastErr: null };
  h.lastMs = ms;
  if (ok) { h.okCount++; h.lastOkAt = new Date().toISOString(); h.lastErr = null; }
  else { h.errCount++; h.lastErrAt = new Date().toISOString(); h.lastErr = errMsg || "未知错误"; }
  sourceHealth.set(key, h);
}
function sourceHealthList() {
  return [...sourceHealth.values()].filter((h) => !h.key.startsWith("ai-")).map((h) => {
    const entry = cache.get(h.key);
    const ageMs = entry ? Date.now() - entry.fetchedAt : null;
    const total = h.okCount + h.errCount;
    return {
      key: h.key,
      label: SOURCE_LABELS[h.key] || h.key,
      okCount: h.okCount,
      errCount: h.errCount,
      okRate: total ? Math.round((h.okCount / total) * 100) : null,
      lastOkAt: h.lastOkAt,
      lastErrAt: h.lastErrAt,
      lastErr: h.lastErr,
      lastMs: h.lastMs,
      cacheAgeMs: ageMs,
      status: h.lastErr && (!h.lastOkAt || (h.lastErrAt && h.lastErrAt > h.lastOkAt)) ? "error" : "ok",
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
}

// ── AI 调用用量日志：计数 + 最近 N 条明细，供后台排查与防刷 ──
const AI_LOG_MAX = 60;
const aiUsage = { total: 0, ok: 0, fail: 0, byFeature: {}, recent: [] };
const AI_FEATURE_LABELS = { brief: "AI 简报", chat: "AI 问答", analyze: "新闻分析", insight: "博研观点" };
function logAiCall(feature, ok, ms, errMsg) {
  aiUsage.total++;
  if (ok) aiUsage.ok++; else aiUsage.fail++;
  const f = (aiUsage.byFeature[feature] = aiUsage.byFeature[feature] || { ok: 0, fail: 0 });
  if (ok) f.ok++; else f.fail++;
  aiUsage.recent.unshift({ at: new Date().toISOString(), feature, label: AI_FEATURE_LABELS[feature] || feature, ok, ms, err: ok ? null : (errMsg || "").slice(0, 160) });
  if (aiUsage.recent.length > AI_LOG_MAX) aiUsage.recent.length = AI_LOG_MAX;
}

// ── DeepSeek 统一调用封装：功能开关校验 + 运行时 key/模型 + 用量日志 ──
async function deepseekChat(feature, { system, user, temperature = 0.4, maxTokens = 700, json = false, timeout = 30000 }) {
  if (!config.featureOn(feature)) throw new Error("FEATURE_OFF");
  const key = config.getDeepSeekKey();
  if (!key) throw new Error("NO_KEY");
  const startedAt = Date.now();
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: config.getModel(),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
    const data = await res.json();
    const txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    logAiCall(feature, true, Date.now() - startedAt, null);
    return txt;
  } catch (e) {
    logAiCall(feature, false, Date.now() - startedAt, e.message);
    throw e;
  }
}

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    ...securityHeaders,
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 64) {
        reject(new Error("请求体过大"));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("请求体不是合法的 JSON"));
      }
    });
    request.on("error", reject);
  });
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sessionCookie(token, maxAgeSeconds) {
  const attrs = [`session=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  return attrs.join("; ");
}

function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function currentUser(request) {
  const cookies = parseCookies(request);
  return auth.userFromToken(cookies.session);
}

const rateLimitHits = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = rateLimitHits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitHits.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitHits) {
    if (now - entry.windowStart > 10 * 60 * 1000) rateLimitHits.delete(key);
  }
}, 10 * 60 * 1000).unref();

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.socket.remoteAddress || "unknown";
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 12000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoTrade-Radar/1.0 research-dashboard",
        Accept: options.accept || "*/*",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, { ...options, accept: "application/json" });
  return JSON.parse(text);
}

// 中国境内行情（Eastmoney 指数 + Sina 人民币）——供中国产业金融雷达实时化
async function loadCnMarkets() {
  const codeMap = { "000001": "SHCOMP", "399001": "SZCOMP", "399006": "CHINEXT", "000688": "STAR50", "000300": "CSI300", "000016": "SZ50", "000905": "CSI500", "899050": "BSE50", HSI: "HSI", HSTECH: "HSTECH" };
  const quotes = {};
  try {
    const secids = "1.000001,0.399001,0.399006,1.000688,1.000300,1.000016,1.000905,0.899050,100.HSI,100.HSTECH";
    const j = await fetchJson(
      `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f12,f14&secids=${secids}`,
      { timeout: 8000 },
    );
    (j?.data?.diff || []).forEach((x) => {
      const sym = codeMap[String(x.f12)];
      if (sym && typeof x.f2 === "number") quotes[sym] = { value: x.f2, change: Number(x.f3) || 0 };
    });
  } catch (error) {
    /* 指数源不可用，忽略并回退 */
  }
  try {
    // 新浪：一次请求同时拉 人民币 + A股指数(兜底) + 港股(兜底) + 商品期货主力(唯一实时源)
    // 单请求多源，任一品种解析失败自动跳过，其余照常返回
    const sinaCodes =
      "fx_susdcny,s_sh000001,s_sz399001,s_sz399006,s_sh000688,s_sh000300,s_sh000016,s_sh000905,s_bj899050," +
      "rt_hkHSI,rt_hkHSTECH,nf_AU0,nf_CU0,nf_RB0";
    const sinaMap = { s_sh000001: "SHCOMP", s_sz399001: "SZCOMP", s_sz399006: "CHINEXT", s_sh000688: "STAR50", s_sh000300: "CSI300", s_sh000016: "SZ50", s_sh000905: "CSI500", s_bj899050: "BSE50" };
    const hkMap = { rt_hkHSI: "HSI", rt_hkHSTECH: "HSTECH" };
    const futMap = { nf_AU0: "AU", nf_CU0: "CU", nf_RB0: "RB" };
    const resp = await fetch("https://hq.sinajs.cn/list=" + sinaCodes, {
      headers: { Referer: "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0" },
    });
    const t = await resp.text();
    t.split("\n").forEach((line) => {
      const mm = line.match(/hq_str_(\w+)="([^"]*)"/);
      if (!mm) return;
      const code = mm[1];
      const f = mm[2].split(",");
      if (code === "fx_susdcny") {
        const price = parseFloat(f[1]);
        const prev = parseFloat(f[8]);
        if (price) quotes.USDCNY = { value: price, change: prev ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0 };
      } else if (hkMap[code] && !quotes[hkMap[code]]) {
        // 港股：Eastmoney 未取到时用新浪补（现价 f[6]、涨跌幅% f[8]）
        const price = parseFloat(f[6]);
        const chg = parseFloat(f[8]);
        if (price) quotes[hkMap[code]] = { value: price, change: Number.isFinite(chg) ? chg : 0 };
      } else if (futMap[code]) {
        // 内盘期货主力：现价 f[8]、昨结算 f[10]，涨跌幅按结算价算（此前为纯演示数据，现转真实）
        const price = parseFloat(f[8]);
        const prev = parseFloat(f[10]);
        if (price) quotes[futMap[code]] = { value: price, change: prev ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0 };
      } else if (sinaMap[code] && !quotes[sinaMap[code]]) {
        // 仅在 Eastmoney 未取到该 A 股指数时用新浪补（Eastmoney 更全，含港股）
        const price = parseFloat(f[1]);
        const chg = parseFloat(f[3]);
        if (price) quotes[sinaMap[code]] = { value: price, change: Number.isFinite(chg) ? chg : 0 };
      }
    });
  } catch (error) {
    /* 新浪源不可用，忽略并回退 */
  }
  if (!Object.keys(quotes).length) throw new Error("中国行情数据源暂不可用");
  return quotes;
}

// 批量个股实时行情——供「产业链」板块的代表企业行情叠加
// secids 形如 "0.300750,1.601127"（0=深/1=沪），返回 { 代码: { value, change } }
// 双源冗余：新浪个股为主（稳定），东财 ulist 补全，任一可用即可
async function loadCnStocks(secids) {
  if (!secids) return {};
  const list = secids.split(",").filter(Boolean);
  const out = {};
  try {
    // 新浪个股：secid "1.600438"→"sh600438"、"0.300750"→"sz300750"；现价 f[3]、昨收 f[2]
    const sinaList = list.map((s) => (s.startsWith("1.") ? "sh" : "sz") + s.split(".")[1]).join(",");
    const resp = await fetch("https://hq.sinajs.cn/list=" + sinaList, {
      headers: { Referer: "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0" },
    });
    const t = await resp.text();
    t.split("\n").forEach((line) => {
      const m = line.match(/hq_str_(?:sh|sz)(\d{6})="([^"]*)"/);
      if (!m) return;
      const f = m[2].split(",");
      const price = parseFloat(f[3]);
      const prev = parseFloat(f[2]);
      if (price && prev) out[m[1]] = { value: price, change: Number((((price - prev) / prev) * 100).toFixed(2)) };
    });
  } catch (error) {
    /* 新浪个股不可用，尝试东财 */
  }
  if (Object.keys(out).length < list.length) {
    try {
      const j = await fetchJson(`https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f12,f14&secids=${secids}`, { timeout: 6000 });
      (j?.data?.diff || []).forEach((x) => {
        const code = String(x.f12);
        if (!out[code] && typeof x.f2 === "number") out[code] = { value: x.f2, change: Number(x.f3) || 0 };
      });
    } catch (error) {
      /* 东财个股不可用 */
    }
  }
  if (!Object.keys(out).length) throw new Error("个股行情数据源暂不可用");
  return out;
}

// 概念板块实时异动（东财 clist）——领涨 + 领跌，含涨跌幅/主力净流入/涨跌家数
// 用于替换原「异常波动」的硬编码假数据
async function loadCnBoards() {
  const fields = "f2,f3,f12,f14,f62,f104,f105";
  const url = (fid, order) =>
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10&po=${order}&np=1&fltt=2&fid=${fid}&fs=${encodeURIComponent("m:90 t:3")}&fields=${fields}`;
  const pick = (arr) => (Array.isArray(arr) ? arr : Object.values(arr || {})).map((x) => ({
    name: x.f14, change: Number(x.f3) || 0, inflow: Number(x.f62) || 0, up: Number(x.f104) || 0, down: Number(x.f105) || 0,
  })).filter((b) => b.name);
  const [gainRaw, loseRaw] = await Promise.all([
    fetchJson(url("f3", 1), { timeout: 8000 }).then((j) => j?.data?.diff).catch(() => null),
    fetchJson(url("f3", 0), { timeout: 8000 }).then((j) => j?.data?.diff).catch(() => null),
  ]);
  const gainers = gainRaw ? pick(gainRaw) : [];
  const losers = loseRaw ? pick(loseRaw) : [];
  if (!gainers.length && !losers.length) throw new Error("概念板块数据源暂不可用");
  return { gainers, losers };
}

// 按关键词实时搜索东财资讯——供「产业链雷达」每个细分赛道的实时情报（点赛道现搜）
async function loadCnSearch(kw) {
  const param = JSON.stringify({
    uid: "", keyword: kw, type: ["cmsArticleWebOld"], client: "web", clientType: "web",
    param: { cmsArticleWebOld: { searchScope: "default", sort: "time", pageIndex: 1, pageSize: 8 } },
  });
  const url = `https://search-api-web.eastmoney.com/search/jsonp?cb=cb&param=${encodeURIComponent(param)}`;
  const text = await fetchText(url, { timeout: 8000, headers: { Referer: "https://so.eastmoney.com/" } });
  const m = text.match(/cb\((.*)\)/s);
  const j = JSON.parse(m ? m[1] : text);
  const arts = j?.result?.cmsArticleWebOld || [];
  const items = arts
    .map((a) => ({
      title: cnNewsStripHtml(a.title),
      url: a.url,
      time: a.date || "",
      source: a.mediaName || "东方财富",
      summary: cnNewsStripHtml(a.content).slice(0, 110),
    }))
    .filter((x) => x.title && x.url);
  try { archive.record(items, { kind: "search", keyword: kw }); } catch (e) { /* 存档失败不影响主流程 */ }
  return items;
}

// 中国财经实时快讯——多源聚合：东方财富 + 新浪财经 + 华尔街见闻 + 金十数据
// 各源并行拉取、任一失败自动跳过，合并后按时间排序 + 标题去重
const cnNewsStripHtml = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").trim();
const cnNewsClean = (s) => cnNewsStripHtml(s).replace(/^【[^】]*】/, "").trim();

async function cnNewsEastmoney() {
  const raw = await fetchText("https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_30_1_.html", { timeout: 8000 });
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return [];
  const json = JSON.parse(m[0]);
  return (json.LivesList || []).map((it) => {
    const ts = String(it.sort || "").slice(0, 10);
    return {
      title: cnNewsClean(it.title || it.simtitle),
      summary: cnNewsClean(it.digest),
      url: it.url_w || it.url_m || "",
      ts: /^\d{10}$/.test(ts) ? Number(ts) * 1000 : null,
      source: "东方财富",
    };
  });
}

async function cnNewsSina() {
  const json = await fetchJson("https://feed.mix.sina.com.cn/api/roll/get?pageid=155&lid=1686&num=30&page=1", { timeout: 8000 });
  const data = (json.result && json.result.data) || [];
  return data.map((x) => ({
    title: cnNewsClean(x.title || x.stitle),
    summary: cnNewsClean(x.summary || x.intro),
    url: x.url || x.wapurl || "",
    ts: Number(x.intime) ? Number(x.intime) * 1000 : null,
    source: "新浪财经",
  }));
}

async function cnNewsWallst() {
  const json = await fetchJson("https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30", { timeout: 8000 });
  const items = (json.data && json.data.items) || [];
  return items.map((x) => ({
    title: cnNewsClean(x.title || x.content_text),
    summary: cnNewsClean(x.content_text),
    url: x.uri || "",
    ts: Number(x.display_time) ? Number(x.display_time) * 1000 : null,
    source: "华尔街见闻",
  }));
}

async function cnNewsJin10() {
  const raw = await fetchText("https://www.jin10.com/flash_newest.js", { timeout: 8000 });
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  const arr = JSON.parse(m[0]);
  return arr.map((x) => {
    const d = x.data || {};
    const ts = x.time ? new Date(String(x.time).replace(/-/g, "/")).getTime() : null;
    return {
      title: cnNewsClean(d.title || d.content),
      summary: cnNewsClean(d.content),
      url: "https://www.jin10.com/",
      ts: Number.isFinite(ts) ? ts : null,
      source: "金十数据",
    };
  });
}

async function loadCnNews() {
  // 各源配额，避免某一源（尤其金十的国际快讯）淹没中文财经流
  const feeds = [
    { fn: cnNewsEastmoney, cap: 14 },
    { fn: cnNewsSina, cap: 14 },
    { fn: cnNewsWallst, cap: 8 },
    { fn: cnNewsJin10, cap: 6 },
  ];
  const results = await Promise.allSettled(feeds.map((f) => f.fn()));
  let all = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && Array.isArray(r.value)) all = all.concat(r.value.slice(0, feeds[i].cap));
  });
  // 中文事件流：过滤纯外文/过短条目（标题需含足够中文）
  all = all.filter((x) => x.title && x.title.length > 3 && (x.title.match(/[一-鿿]/g) || []).length >= 2);
  // 标题归一化去重（去标点空白）
  const seen = new Set();
  const dedup = [];
  for (const x of all) {
    const key = x.title.replace(/[\s，。、！？：；""''（）()【】\[\]—\-.,!?:;]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(x);
  }
  dedup.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (!dedup.length) throw new Error("所有快讯源暂不可用");
  const out = dedup.slice(0, 30);
  try { archive.record(out.map((x) => ({ ...x, time: x.time || (x.ts ? new Date(x.ts).toISOString() : "") })), { kind: "news" }); } catch (e) { /* 存档失败不影响主流程 */ }
  return out;
}

function cachedProvider(key, ttl, loader) {
  const current = cache.get(key);
  if (current && Date.now() - current.fetchedAt < ttl) return Promise.resolve(current.value);
  const startedAt = Date.now();
  return loader()
    .then((data) => {
      const value = { data, stale: false, error: null, fetchedAt: new Date().toISOString() };
      cache.set(key, { fetchedAt: Date.now(), value });
      lastGood.set(key, value);
      recordSource(key, true, Date.now() - startedAt, null);
      return value;
    })
    .catch((error) => {
      recordSource(key, false, Date.now() - startedAt, error.message);
      const previous = lastGood.get(key);
      if (previous) {
        return { ...previous, stale: true, error: error.message };
      }
      return { data: [], stale: true, error: error.message, fetchedAt: null };
    });
}

// 缓存管理：列出各缓存项年龄/状态，供后台查看与强制刷新
function cacheEntryList() {
  return [...cache.entries()].map(([key, entry]) => ({
    key,
    label: SOURCE_LABELS[key] || key,
    ageMs: Date.now() - entry.fetchedAt,
    stale: !!(entry.value && entry.value.stale),
    error: (entry.value && entry.value.error) || null,
    hasLastGood: lastGood.has(key),
  })).sort((a, b) => a.key.localeCompare(b.key));
}
function clearCache(key) {
  if (key) { cache.delete(key); return 1; }
  const n = cache.size;
  cache.clear();
  return n;
}

function cleanText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value = "") {
  return cleanText(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " "),
  );
}

function formatSeenDate(value) {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return value || "实时更新";
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

function formatEventTime(value) {
  const gdeltTime = formatSeenDate(value);
  if (gdeltTime !== value) return gdeltTime;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "实时更新";
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function classifyArticle(title) {
  const text = title.toLowerCase();
  if (/(physical ai|embodied ai|embodied intelligence|world model|vision-language-action|\bvla\b|humanoid|autonomous robot|robot foundation model|edge ai|digital twin|synthetic data|simulation training)/.test(` ${text} `)) {
    return ["physical-ai", "物理AI"];
  }
  if (/(robot|automation|artificial intelligence| ai |chip|semiconductor|data center|datacenter)/.test(` ${text} `)) {
    return ["ai-robotics", "AI 与机器人"];
  }
  if (/(sanction|export control|entity list|designation|ofac)/.test(text)) return ["sanctions", "制裁与管制"];
  if (/(shipping|port|canal|freight|vessel|red sea|suez|hormuz|supply chain)/.test(text)) return ["supply", "供应链"];
  if (/(oil|gas|lng|energy|power|nuclear)/.test(text)) return ["energy", "能源"];
  if (/(tariff|trade policy|export ban|import ban|regulation|policy)/.test(text)) return ["policy", "贸易政策"];
  return ["market", "市场与产业"];
}

function inferLocation(title) {
  const places = [
    [/(china|chinese|beijing|shanghai)/i, "中国", 35, 105],
    [/(united states|u\.s\.|us |washington|america)/i, "美国", 38, -97],
    [/(europe|eu |european|brussels)/i, "欧盟", 50, 10],
    [/(russia|russian|moscow)/i, "俄罗斯", 55, 37],
    [/(iran|hormuz)/i, "伊朗", 32, 53],
    [/(red sea|suez|yemen)/i, "红海", 20, 39],
    [/(japan|japanese|tokyo)/i, "日本", 36, 138],
    [/(india|indian)/i, "印度", 22, 79],
    [/(indonesia|indonesian)/i, "印度尼西亚", -3, 117],
    [/(vietnam|vietnamese)/i, "越南", 16, 106],
    [/(mexico|mexican)/i, "墨西哥", 23, -102],
    [/(brazil|brazilian)/i, "巴西", -14, -52],
    [/(saudi|uae|emirates|gulf)/i, "海湾地区", 24, 52],
    [/(turkey|turkish)/i, "土耳其", 39, 35],
    [/(ukraine|ukrainian|black sea)/i, "黑海地区", 47, 32],
    [/(korea|korean)/i, "韩国", 36, 128],
    [/(australia|australian)/i, "澳大利亚", -25, 134],
    [/(africa|congo|nigeria)/i, "非洲", 2, 22],
  ];
  for (const [pattern, name, lat, lon] of places) {
    if (pattern.test(title)) return { name, lat, lon };
  }
  return { name: "全球", lat: 18, lon: 15 };
}

function inferEntities(title, category) {
  const text = title.toLowerCase();
  const sectors = [];
  const commodities = [];
  if (/(ship|port|freight|vessel|canal)/.test(text)) sectors.push("航运", "物流");
  if (/(physical ai|embodied ai|embodied intelligence|world model|vision-language-action|\bvla\b|humanoid|autonomous robot|robot foundation model|edge ai|digital twin|simulation training)/.test(` ${text} `)) sectors.push("物理AI", "具身智能", "边缘推理");
  if (/(chip|semiconductor| ai |robot|automation)/.test(` ${text} `)) sectors.push("AI 硬件", "先进制造");
  if (/(battery|ev |electric vehicle)/.test(` ${text} `)) sectors.push("新能源", "电池材料");
  if (/(bank|currency|rate|dollar|yen|yuan)/.test(text)) sectors.push("金融", "外汇");
  if (/(oil|crude)/.test(text)) commodities.push("原油");
  if (/(gas|lng)/.test(text)) commodities.push("天然气");
  if (/copper/.test(text)) commodities.push("铜");
  if (/(gold|bullion)/.test(text)) commodities.push("黄金");
  if (/(nickel|lithium|cobalt|rare earth)/.test(text)) commodities.push("关键矿产");
  if (!sectors.length) sectors.push(category === "政策" ? "跨境贸易" : "产业链");
  return { sectors: [...new Set(sectors)], commodities: [...new Set(commodities)] };
}

function scoreArticle(title, category) {
  let score = 58;
  if (/(war|attack|ban|block|crisis|emergency|surge|disruption|sanction)/i.test(title)) score += 18;
  if (/(physical ai|embodied ai|humanoid|edge ai|digital twin|simulation training|vision-language-action|\bvla\b)/i.test(title)) score += 12;
  if (/(tariff|export control|red sea|hormuz|chip|oil|shipping)/i.test(title)) score += 10;
  if (category === "制裁与管制" || category === "供应链") score += 5;
  return Math.min(score, 94);
}

function articleToEvent(article, index) {
    const title = cleanText(article.title || "未命名事件");
    const [category, categoryLabel] = classifyArticle(title);
    const location = inferLocation(title);
    const entities = inferEntities(title, categoryLabel);
    const score = scoreArticle(title, categoryLabel);
    const seen = String(article.seendate || "");
    const route =
      category === "physical-ai"
        ? "物理AI产业链与场景落地"
        : entities.sectors.includes("航运")
          ? "全球关键贸易路线"
          : "全球贸易与产业链";
    return {
      id: `live-${seen}-${index}`.replace(/[^a-zA-Z0-9-]/g, ""),
      title,
      summary: `来自 ${article.source || article.domain || "公开来源"} 的实时报道。点击原始来源可进一步核验事件背景与影响。`,
      category,
      categoryLabel,
      countries: [location.name],
      sectors: entities.sectors,
      commodities: entities.commodities,
      route,
      score,
      confidence: article.sourcecountry ? 78 : 70,
      source: article.source || article.domain || article.provider || "公开来源",
      sourceUrl: article.url || "",
      publishedAt: seen,
      time: formatEventTime(seen),
      lon: location.lon,
      lat: location.lat,
      impact: [
        ["实时事件", title],
        ["直接暴露", [...entities.sectors, ...entities.commodities].join("、") || "全球贸易"],
        ["区域影响", location.name],
        ["跟踪建议", "核验多源报道、价格反应与官方公告"],
      ],
      real: true,
    };
}

async function loadGdeltEvents(period) {
  const config = periods[period];
  const technologyQuery =
    '"OpenAI" OR Anthropic OR "Google DeepMind" OR NVIDIA OR Microsoft OR Meta OR Tesla OR "Figure AI" OR "Boston Dynamics" OR FANUC OR Yaskawa OR ABB OR Unitree OR UBTECH OR AMD OR Broadcom OR Qualcomm OR Arm OR TSMC OR "SK Hynix" OR Samsung OR AWS OR Azure OR "Google Cloud" OR Oracle OR Cloudflare OR CrowdStrike OR "Palo Alto Networks" OR Fortinet OR Zscaler OR SentinelOne OR BYD OR CATL OR Rivian OR Apple OR Huawei OR Xiaomi OR Lenovo OR IBM OR IonQ OR Rigetti OR "D-Wave" OR SpaceX OR Starlink OR "Rocket Lab" OR Palantir OR Anduril OR Moderna OR BioNTech OR CRISPR OR Stripe OR PayPal OR Coinbase OR "AI chip" OR GPU OR HBM OR robotics OR "physical AI" OR "embodied AI" OR "edge AI" OR "digital twin" OR "data center" OR cybersecurity OR ransomware OR "electric vehicle" OR battery OR "quantum computing" OR satellite OR drone OR biotech OR stablecoin';
  const chinaAsiaQuery =
    '"China exports" OR "China trade" OR "China stimulus" OR "China economy" OR yuan OR renminbi OR PBOC OR "Belt and Road" OR "rare earth export" OR "export controls China" OR "Hong Kong stocks" OR "A-share" OR "CSI 300" OR "Shanghai Composite" OR "China property" OR "China manufacturing PMI" OR "China tech crackdown" OR "US-China trade"';
  // 不限定 sourcelang：允许各国以本国语言发布的原文标题进入事件流（GDELT 仍按翻译后的
  // 英文文本匹配关键词），中文翻译由 translate.js 统一补充，做到"原文 + 中文"。
  const query = `(tariff OR sanctions OR "export control" OR shipping OR port OR commodity OR energy OR ${chinaAsiaQuery} OR ${technologyQuery})`;
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "150");
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("timespan", config.gdelt);
  const payload = await fetchJson(url);
  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  if (!articles.length) throw new Error("GDELT returned no events");
  return articles.slice(0, 120).map((article, index) => articleToEvent({ ...article, provider: "GDELT" }, index));
}

function xmlValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function xmlLinkValue(block) {
  const direct = xmlValue(block, "link");
  if (direct) return direct;
  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return href ? decodeXml(href[1]) : "";
}

function parseFeedItems(xml) {
  const rssItems = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  const atomItems = [...xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);
  return [...rssItems, ...atomItems];
}

async function loadGoogleNewsEvents(period) {
  const query = `tariff OR sanctions OR "export control" OR shipping OR port OR commodity OR energy OR "AI chip" OR robot OR automation OR "physical AI" OR "embodied AI" OR humanoid OR "edge AI" OR "digital twin" OR "China exports" OR "China trade" OR "China stimulus" OR yuan OR renminbi OR PBOC OR "Belt and Road" OR "rare earth export" OR "Hong Kong stocks" OR "A-share" OR "CSI 300" OR "China property" OR "US-China trade" when:${periods[period].days}d`;
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  const xml = await fetchText(url, { accept: "application/rss+xml, application/xml, text/xml" });
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 100);
  if (!items.length) throw new Error("Google News RSS returned no events");
  return items.map((match, index) => {
    const block = match[1];
    const sourceMatch = block.match(/<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i);
    return articleToEvent(
      {
        title: xmlValue(block, "title"),
        url: xmlValue(block, "link"),
        seendate: xmlValue(block, "pubDate"),
        source: sourceMatch ? decodeXml(sourceMatch[2]) : "Google News",
        domain: sourceMatch?.[1] || "news.google.com",
        sourcecountry: "global",
        provider: "Google News RSS",
      },
      index,
    );
  });
}

async function loadPublicRssEvents(period) {
  const feeds = [
    ["CNBC World", "https://www.cnbc.com/id/100003114/device/rss/rss.html"],
    ["CNBC Technology", "https://www.cnbc.com/id/19854910/device/rss/rss.html"],
    ["NPR World", "https://feeds.npr.org/1004/rss.xml"],
    ["Xinhua World", "https://english.news.cn/rss/worldrss.xml"],
    ["ABC International", "https://abcnews.go.com/abcnews/internationalheadlines"],
  ];
  const cutoff = Date.now() - periods[period].days * 86400000;
  const responses = await Promise.allSettled(
    feeds.map(async ([source, url]) => ({ source, xml: await fetchText(url, { accept: "application/rss+xml, application/xml, text/xml" }) })),
  );
  const articles = [];
  responses
    .filter((result) => result.status === "fulfilled")
    .forEach((result) => {
      const { source, xml } = result.value;
      [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].forEach((match) => {
        const block = match[1];
        const publishedAt = xmlValue(block, "pubDate") || xmlValue(block, "dc:date");
        const publishedTime = new Date(publishedAt).getTime();
        if (Number.isFinite(publishedTime) && publishedTime < cutoff) return;
        articles.push({
          title: xmlValue(block, "title"),
          url: xmlValue(block, "link"),
          seendate: publishedAt,
          source,
          domain: source,
          sourcecountry: "global",
          provider: "Public RSS",
        });
      });
    });
  const unique = articles.filter((article, index) => article.title && articles.findIndex((item) => item.title === article.title) === index);
  if (!unique.length) throw new Error("Public RSS feeds returned no events");
  return unique
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, 120)
    .map((article, index) => articleToEvent(article, index));
}

async function loadEvents(period) {
  try {
    return await loadGdeltEvents(period);
  } catch (gdeltError) {
    try {
      const events = await loadGoogleNewsEvents(period);
      events.forEach((event) => {
        event.providerFallback = `GDELT unavailable: ${gdeltError.message}`;
      });
      return events;
    } catch (googleNewsError) {
      const events = await loadPublicRssEvents(period);
      events.forEach((event) => {
        event.providerFallback = `GDELT unavailable: ${gdeltError.message}; Google News unavailable: ${googleNewsError.message}`;
      });
      return events;
    }
  }
}

function inferIndustryCompany(title) {
  const match = industryCompanies.find(([, , pattern]) => pattern.test(title));
  if (!match) return { company: "行业", ticker: "", region: "全球" };
  return { company: match[0], ticker: match[1], region: match[3] };
}

function scoreIndustryNews(title, domainId) {
  let score = domainId === "physical-ai" ? 70 : 62;
  if (/(launch|release|partnership|deal|order|contract|funding|investment|raises|factory|ship|production|deployment)/i.test(title)) score += 12;
  if (/(chip|gpu|hbm|robot|humanoid|physical ai|embodied ai|edge ai|digital twin)/i.test(title)) score += 8;
  if (/(delay|ban|lawsuit|probe|risk|shortage|cuts|fall|plunge)/i.test(title)) score += 10;
  return Math.min(score, 94);
}

function articleToIndustryItem(article, domain, index) {
  const title = cleanText(article.title || "未命名行业动态");
  const company = inferIndustryCompany(title);
  const score = scoreIndustryNews(title, domain.id);
  const seen = String(article.seendate || "");
  const type = company.company === "行业" ? "行业动态" : "企业动态";
  const eventKeywords = [domain.label, company.company, ...domain.tags].filter(Boolean);
  return {
    id: `industry-${domain.id}-${seen}-${index}`.replace(/[^a-zA-Z0-9-]/g, ""),
    domainId: domain.id,
    domain: domain.label,
    company: company.company,
    ticker: company.ticker,
    type,
    title,
    summary: `${type}来自 ${article.source || article.domain || "公开来源"}。重点关注其对订单、供应链、资本开支、产品路线和竞争格局的影响。`,
    source: article.source || article.domain || article.provider || "公开来源",
    sourceUrl: article.sourceUrl || article.url || "",
    publishedAt: seen,
    time: formatEventTime(seen),
    score,
    sentiment: score >= 82 ? "高影响" : score >= 72 ? "重点跟踪" : "观察",
    region: company.region,
    tags: domain.tags,
    eventKeywords,
    real: true,
  };
}

function dedupeIndustryArticles(articles) {
  return articles.filter(
    (article, index) =>
      article.title &&
      articles.findIndex((item) => item.title === article.title || (item.url && item.url === article.url)) === index,
  );
}

function industryDomainForText(text) {
  return industryWatchDomains.find((item) => item.pattern?.test(text)) || null;
}

function industryItemsFromEvents(seedEvents = []) {
  const articles = seedEvents
    .map((event, index) => {
      const domain = industryDomainForText(`${event.title || ""} ${event.summary || ""} ${event.source || ""}`);
      if (!domain) return null;
      return {
        domain,
        index,
        title: event.title,
        url: event.sourceUrl,
        sourceUrl: event.sourceUrl,
        seendate: event.publishedAt || event.time || new Date().toISOString(),
        source: event.source || event.domain || "GDELT",
        domainName: event.domain || "",
        provider: event.provider || "GDELT Industry",
      };
    })
    .filter(Boolean);
  return dedupeIndustryArticles(articles)
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, 80)
    .map((article, index) => articleToIndustryItem(article, article.domain, index));
}

async function loadGdeltIndustryNews(period) {
  const config = periods[period];
  await delay(5500);
  const query =
    '("OpenAI" OR Anthropic OR "Google DeepMind" OR NVIDIA OR Microsoft OR Meta OR Tesla OR "Figure AI" OR "Boston Dynamics" OR robotics OR "humanoid robot" OR FANUC OR Yaskawa OR ABB OR Unitree OR UBTECH OR AMD OR Broadcom OR Qualcomm OR Arm OR TSMC OR "SK Hynix" OR Samsung OR AWS OR Azure OR "Google Cloud" OR Oracle OR Cloudflare OR CrowdStrike OR "Palo Alto Networks" OR Fortinet OR Zscaler OR SentinelOne OR BYD OR CATL OR Rivian OR Apple OR Huawei OR Xiaomi OR Lenovo OR IBM OR IonQ OR Rigetti OR "D-Wave" OR SpaceX OR Starlink OR "Rocket Lab" OR Palantir OR Anduril OR Moderna OR BioNTech OR CRISPR OR Stripe OR PayPal OR Coinbase OR "physical AI" OR "embodied AI" OR "edge AI" OR "digital twin" OR "AI chip" OR GPU OR HBM OR "data center" OR cybersecurity OR ransomware OR "electric vehicle" OR battery OR "quantum computing" OR satellite OR drone OR biotech OR stablecoin) sourcelang:english';
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "150");
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("timespan", config.gdelt);
  const payload = await fetchJson(url, { timeout: 18000 });
  const articles = (Array.isArray(payload.articles) ? payload.articles : []).map((article, index) => {
    const text = `${article.title || ""} ${article.domain || ""}`;
    const domain = industryDomainForText(text) || industryWatchDomains[0];
    return {
      domain,
      index,
      title: article.title,
      url: article.url,
      sourceUrl: article.url,
      seendate: article.seendate,
      source: article.source || article.domain || "GDELT",
      domainName: article.domain || "",
      provider: "GDELT Industry",
    };
  });
  const unique = dedupeIndustryArticles(articles);
  if (!unique.length) throw new Error("GDELT industry returned no items");
  return unique
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, 80)
    .map((article, index) => articleToIndustryItem(article, article.domain, index));
}

async function loadGoogleIndustryNews(period) {
  const cutoff = Date.now() - periods[period].days * 86400000;
  const days = periods[period].days;
  const responses = await Promise.allSettled(
    industryWatchDomains.flatMap((domain) =>
      (domain.queries || [domain.query]).map(async (query) => {
        const url = new URL("https://news.google.com/rss/search");
        url.searchParams.set("q", `${query} when:${days}d`);
        url.searchParams.set("hl", "en-US");
        url.searchParams.set("gl", "US");
        url.searchParams.set("ceid", "US:en");
        const xml = await fetchText(url, { accept: "application/rss+xml, application/xml, text/xml", timeout: 14000 });
        return { domain, xml };
      }),
    ),
  );

  const articles = [];
  responses
    .filter((result) => result.status === "fulfilled")
    .forEach((result) => {
      const { domain, xml } = result.value;
      [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 30).forEach((match, index) => {
        const block = match[1];
        const sourceMatch = block.match(/<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i);
        const publishedAt = xmlValue(block, "pubDate");
        const publishedTime = new Date(publishedAt).getTime();
        if (Number.isFinite(publishedTime) && publishedTime < cutoff) return;
        articles.push({
          domain,
          index,
          title: xmlValue(block, "title"),
          url: xmlValue(block, "link"),
          sourceUrl: xmlValue(block, "link"),
          seendate: publishedAt,
          source: sourceMatch ? decodeXml(sourceMatch[2]) : "Google News",
          domainName: sourceMatch?.[1] || "news.google.com",
          provider: "Google News RSS",
        });
      });
    });

  const unique = dedupeIndustryArticles(articles);
  if (!unique.length) throw new Error("Google industry RSS returned no items");
  return unique
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, 80)
    .map((article, index) => articleToIndustryItem(article, article.domain, index));
}

async function loadTechRssIndustry(period) {
  const cutoff = Date.now() - Math.max(periods[period].days, period === "day" ? 2 : 1) * 86400000;
  const responses = await Promise.allSettled(
    techRssSources.map(async (source) => {
      const xml = await fetchText(source.url, { accept: "application/rss+xml, application/xml, text/xml", timeout: 14000 });
      return { source, xml };
    }),
  );

  const articles = [];
  responses
    .filter((result) => result.status === "fulfilled")
    .forEach((result) => {
      const { source, xml } = result.value;
      parseFeedItems(xml)
        .slice(0, 25)
        .forEach((block, index) => {
          const title = xmlValue(block, "title");
          const summary = xmlValue(block, "description") || xmlValue(block, "summary") || xmlValue(block, "content");
          const link = xmlLinkValue(block);
          const publishedAt =
            xmlValue(block, "pubDate") ||
            xmlValue(block, "published") ||
            xmlValue(block, "updated") ||
            xmlValue(block, "dc:date") ||
            new Date().toISOString();
          const publishedTime = new Date(publishedAt).getTime();
          if (Number.isFinite(publishedTime) && publishedTime < cutoff) return;
          const domain =
            industryDomainForText(`${title} ${summary}`) ||
            industryWatchDomains.find((item) => item.id === source.defaultDomainId) ||
            industryWatchDomains[0];
          articles.push({
            domain,
            index,
            title,
            url: link || source.url,
            sourceUrl: link || source.url,
            seendate: publishedAt,
            source: source.source,
            domainName: source.url,
            provider: "Technology RSS",
          });
        });
    });

  const unique = dedupeIndustryArticles(articles);
  if (!unique.length) throw new Error("Technology RSS feeds returned no industry items");
  return unique
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, 80)
    .map((article, index) => articleToIndustryItem(article, article.domain, index));
}

async function loadIndustryNews(period, seedEvents = []) {
  const seededItems = industryItemsFromEvents(seedEvents);
  if (seededItems.length) return seededItems;
  try {
    return await loadGdeltIndustryNews(period);
  } catch (gdeltError) {
    try {
      const items = await loadTechRssIndustry(period);
      items.forEach((item) => {
        item.providerFallback = `GDELT industry unavailable: ${gdeltError.message}`;
      });
      return items;
    } catch (rssError) {
      const items = await loadGoogleIndustryNews(period);
      items.forEach((item) => {
        item.providerFallback = `GDELT industry unavailable: ${gdeltError.message}; Technology RSS unavailable: ${rssError.message}`;
      });
      return items;
    }
  }
}

function formatQuote(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (Math.abs(value) < 10) return value.toFixed(4);
  return value.toFixed(2);
}

async function loadYahooMarkets(period) {
  const config = periods[period];
  const results = await Promise.allSettled(
    quoteAssets.map(async ([symbol, providerSymbol, name, type]) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=${config.marketRange}&interval=${config.marketInterval}`;
      const payload = await fetchJson(url);
      const result = payload?.chart?.result?.[0];
      if (!result) throw new Error(`No quote for ${providerSymbol}`);
      const closes = (result.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
      const latest = result.meta?.regularMarketPrice ?? closes.at(-1);
      const base = closes[0] ?? result.meta?.chartPreviousClose ?? result.meta?.previousClose;
      const change = Number.isFinite(latest) && Number.isFinite(base) && base !== 0 ? ((latest - base) / base) * 100 : 0;
      const series = closes.length ? closes : [latest, latest].filter(Number.isFinite);
      const sampled = series.length > 8 ? Array.from({ length: 8 }, (_, index) => series[Math.floor((index * (series.length - 1)) / 7)]) : series;
      const min = Math.min(...sampled);
      const max = Math.max(...sampled);
      const points = sampled.map((value) => 28 - ((value - min) / (max - min || 1)) * 20);
      return {
        symbol,
        providerSymbol,
        name,
        type,
        value: formatQuote(latest),
        numericValue: latest,
        change: Number(change.toFixed(2)),
        risk: Math.abs(change) >= 2 ? "高" : Math.abs(change) >= 0.8 ? "偏高" : "关注",
        points,
        currency: result.meta?.currency || "",
        exchange: result.meta?.exchangeName || "",
        marketTime: result.meta?.regularMarketTime || null,
        source: "Yahoo Finance",
        real: true,
      };
    }),
  );
  const quotes = results.filter((item) => item.status === "fulfilled").map((item) => item.value);
  return quotes;
}

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value);
  return cells;
}

function sparkPoints(values) {
  const series = values.filter(Number.isFinite);
  if (!series.length) return [18, 18];
  const sampled =
    series.length > 8 ? Array.from({ length: 8 }, (_, index) => series[Math.floor((index * (series.length - 1)) / 7)]) : series;
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  return sampled.map((value) => 28 - ((value - min) / (max - min || 1)) * 20);
}

function marketFromSeries(symbol, name, type, values, source, marketTime) {
  const latest = values.at(-1);
  const base = values[0];
  const change = Number.isFinite(latest) && Number.isFinite(base) && base !== 0 ? ((latest - base) / base) * 100 : 0;
  return {
    symbol,
    name,
    type,
    value: formatQuote(latest),
    numericValue: latest,
    change: Number(change.toFixed(2)),
    risk: Math.abs(change) >= 2 ? "高" : Math.abs(change) >= 0.8 ? "偏高" : "关注",
    points: sparkPoints(values),
    marketTime,
    source,
    real: true,
  };
}

async function loadEcbMarkets(period) {
  const start = new Date(Date.now() - (periods[period].days + 10) * 86400000).toISOString().slice(0, 10);
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.USD+JPY+CNY+GBP+CHF+AUD+CAD.EUR.SP00.A?startPeriod=${start}&format=csvdata`;
  const csv = await fetchText(url, { accept: "text/csv" });
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const currencyIndex = headers.indexOf("CURRENCY");
  const dateIndex = headers.indexOf("TIME_PERIOD");
  const valueIndex = headers.indexOf("OBS_VALUE");
  const grouped = new Map();
  lines.forEach((line) => {
    const cells = parseCsvLine(line);
    const currency = cells[currencyIndex];
    const value = Number(cells[valueIndex]);
    if (!currency || !Number.isFinite(value)) return;
    if (!grouped.has(currency)) grouped.set(currency, []);
    grouped.get(currency).push({ date: cells[dateIndex], value });
  });
  grouped.forEach((series) => series.sort((a, b) => a.date.localeCompare(b.date)));

  const observationCount = period === "day" ? 2 : period === "week" ? 6 : 23;
  const pairSeries = (numerator, denominator = null) => {
    const numeratorSeries = grouped.get(numerator) || [];
    if (!denominator) return numeratorSeries.map((item) => item.value).slice(-observationCount);
    const denominatorByDate = new Map((grouped.get(denominator) || []).map((item) => [item.date, item.value]));
    return numeratorSeries
      .filter((item) => denominatorByDate.has(item.date))
      .map((item) => item.value / denominatorByDate.get(item.date))
      .slice(-observationCount);
  };
  const latestDate = [...grouped.values()].flat().map((item) => item.date).sort().at(-1);
  const definitions = [
    ["EURUSD", "欧元 / 美元", "USD"],
    ["EURCNY", "欧元 / 人民币", "CNY"],
    ["EURJPY", "欧元 / 日元", "JPY"],
    ["EURGBP", "欧元 / 英镑", "GBP"],
    ["EURCHF", "欧元 / 瑞郎", "CHF"],
    ["USDCNY", "美元 / 人民币", "CNY", "USD"],
    ["USDJPY", "美元 / 日元", "JPY", "USD"],
    ["AUDUSD", "澳元 / 美元", "USD", "AUD"],
    ["USDCAD", "美元 / 加元", "CAD", "USD"],
  ];
  return definitions
    .map(([symbol, name, numerator, denominator]) => marketFromSeries(symbol, name, "官方汇率", pairSeries(numerator, denominator), "ECB", latestDate))
    .filter((market) => Number.isFinite(market.numericValue));
}

async function loadCryptoMarkets(period) {
  const assets = [
    ["BTC", "bitcoin", "比特币"],
    ["ETH", "ethereum", "以太坊"],
    ["SOL", "solana", "Solana"],
  ];
  const results = await Promise.allSettled(
    assets.map(async ([symbol, id, name]) => {
      const payload = await fetchJson(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${periods[period].days}`);
      const prices = (payload.prices || []).map((item) => Number(item[1])).filter(Number.isFinite);
      if (!prices.length) throw new Error(`No CoinGecko prices for ${id}`);
      return marketFromSeries(symbol, name, "加密资产", prices, "CoinGecko", new Date().toISOString());
    }),
  );
  return results.filter((item) => item.status === "fulfilled").map((item) => item.value);
}

async function loadMarkets(period) {
  const yahoo = await loadYahooMarkets(period);
  if (yahoo.length) return yahoo;
  const fallbackResults = await Promise.allSettled([loadEcbMarkets(period), loadCryptoMarkets(period)]);
  const quotes = fallbackResults
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (!quotes.length) throw new Error("Market quote providers returned no quotes");
  return quotes;
}

async function loadSanctions(period) {
  const pageCount = period === "month" ? 5 : period === "week" ? 2 : 1;
  const pageResults = await Promise.allSettled(
    Array.from({ length: pageCount }, (_, page) => fetchText(`https://ofac.treasury.gov/recent-actions?headlines=1&page=${page}`)),
  );
  const pages = pageResults.filter((result) => result.status === "fulfilled").map((result) => result.value);
  if (!pages.length) throw new Error("OFAC recent actions pages are unavailable");
  const cutoff = Date.now() - periods[period].days * 86400000;
  const pattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]{0,450}?([A-Z][a-z]+ \d{2}, \d{4})/g;
  const items = [];
  let match;
  for (const html of pages) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) && items.length < 50) {
      const date = new Date(match[3]);
      if (Number.isNaN(date.getTime()) || date.getTime() < cutoff) continue;
      const title = cleanText(match[2]);
      if (!/designation|sanction|removal|terrorism|iran|russia|narcotics|criminal court/i.test(title)) continue;
      if (items.some((item) => item.name === title && item.date === match[3])) continue;
      items.push({
        name: title,
        country: inferLocation(title).name,
        program: "OFAC",
        action: /removal/i.test(title) ? "名单移除" : "名单更新",
        sectors: "制裁 / 合规",
        date: match[3],
        score: /iran|russia|terrorism/i.test(title) ? 88 : 76,
        sourceUrl: match[1].startsWith("http") ? match[1] : `https://ofac.treasury.gov${match[1]}`,
        real: true,
      });
    }
  }
  return items;
}

async function getSnapshot(period = "day", force = false) {
  if (!periods[period]) period = "day";
  if (force) {
    cache.delete(`events:${period}`);
    cache.delete(`industry:${period}`);
    cache.delete(`markets:${period}`);
  }
  // 制裁追踪功能已移除：不再拉取 OFAC（国内不可达、拖累实时状态），只保留事件/行情/产业三源
  const [eventResult, marketResult] = await Promise.all([
    cachedProvider(`events:${period}`, 5 * 60 * 1000, () => loadEvents(period)),
    cachedProvider(`markets:${period}`, 60 * 1000, () => loadMarkets(period)),
  ]);
  const industryResult = await cachedProvider(`industry:${period}`, 5 * 60 * 1000, () => loadIndustryNews(period, eventResult.data));
  // 给全球事件标题补充中文翻译（命中缓存即时返回，失败则回退原文，不阻断快照）
  await translate.attachTitles(eventResult.data);
  const providerStatus = (source, sourceUrl, result) => ({
    source,
    sourceUrl,
    count: result.data.length,
    stale: result.stale,
    error: result.error,
    fetchedAt: result.fetchedAt,
  });
  const providers = {
    events: providerStatus("GDELT / Public RSS", "https://www.gdeltproject.org/", eventResult),
    industry: providerStatus("GDELT Technology Industry / Public Tech RSS / Google News RSS", "https://www.gdeltproject.org/", industryResult),
    markets: providerStatus("Yahoo Finance / ECB / CoinGecko", "https://data.ecb.europa.eu/", marketResult),
  };
  const successful = Object.values(providers).filter((provider) => provider.fetchedAt && !provider.error).length;
  return {
    period,
    periodLabel: periods[period].label,
    updatedAt: new Date().toISOString(),
    mode: successful === 3 ? "live" : successful > 0 ? "partial" : "unavailable",
    cadence: { marketsSeconds: 60, eventsSeconds: 300, industrySeconds: 300 },
    providers,
    events: eventResult.data,
    industry: industryResult.data,
    markets: marketResult.data,
    sanctions: [],
  };
}

// AI 简报：把当前实时事件喂给 DeepSeek，生成中文形势研判 + 投资视角 + 跟踪指标
// 需配置环境变量 DEEPSEEK_API_KEY；未配置则抛错，前端回退到模板版简报
async function loadAiBrief(scope) {
  if (!config.featureOn("brief")) throw new Error("FEATURE_OFF");
  if (!config.getDeepSeekKey()) throw new Error("NO_KEY");
  let top;
  let sourceDesc;
  if (scope === "china") {
    const news = await cachedProvider("cn-news", 60 * 1000, loadCnNews);
    top = (Array.isArray(news.data) ? news.data : []).slice(0, 12).map((n) => ({ 标题: n.title, 摘要: String(n.summary || "").slice(0, 100) }));
    sourceDesc = "以下是今日中国实时财经快讯（多源聚合）";
  } else {
    const snap = await getSnapshot("day");
    top = (snap.events || [])
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8)
      .map((e) => ({ 标题: e.titleZh || e.title, 摘要: String(e.summary || "").slice(0, 120), 风险分: e.score }));
    sourceDesc = "以下是今日实时全球事件（按风险分排序）";
  }
  if (!top.length) throw new Error("暂无事件可用于生成简报");
  const system =
    (scope === "china"
      ? "你是资深中国产业与金融市场分析师。根据给定的实时财经快讯，生成简洁、专业、可执行的中文每日简报，聚焦 A 股、产业与政策影响。"
      : "你是资深全球宏观与产业金融分析师。根据给定的实时事件，生成简洁、专业、可执行的中文每日风险简报，聚焦金融与产业影响。") +
    "语气客观、不空谈。只输出 JSON。";
  const user =
    `${sourceDesc}：\n${JSON.stringify(top)}\n\n` +
    `请严格输出 JSON：{"headline":"一句话核心研判(不超30字)","summary":"2-3句形势研判，说明对金融/产业的影响与传导","investor":["投资人视角要点1","要点2","要点3"],"watch":["需跟踪的关键指标或信号1","2","3"]}`;
  const txt = await deepseekChat("brief", { system, user, temperature: 0.4, maxTokens: 900, json: true, timeout: 30000 });
  const m = txt.match(/\{[\s\S]*\}/);
  const obj = JSON.parse(m ? m[0] : txt);
  return {
    headline: String(obj.headline || "").trim(),
    summary: String(obj.summary || "").trim(),
    investor: Array.isArray(obj.investor) ? obj.investor.map(String) : [],
    watch: Array.isArray(obj.watch) ? obj.watch.map(String) : [],
    count: top.length,
  };
}

// AI 智能问答：结合当前实时事件/行情，用 DeepSeek 回答用户问题
async function askDeepSeek(question, scope) {
  if (!config.featureOn("chat")) throw new Error("FEATURE_OFF");
  if (!config.getDeepSeekKey()) throw new Error("NO_KEY");
  let context;
  if (scope === "china") {
    const news = await cachedProvider("cn-news", 60 * 1000, loadCnNews);
    const items = (Array.isArray(news.data) ? news.data : []).slice(0, 14).map((n) => `· ${n.title}`);
    let mk = {};
    try {
      const r = await cachedProvider("cn-markets", 20 * 1000, loadCnMarkets);
      mk = r.data && !Array.isArray(r.data) ? r.data : {};
    } catch (e) { /* 行情可选 */ }
    context = `【中国实时财经快讯】\n${items.join("\n")}\n【境内行情】${JSON.stringify(mk)}`;
  } else {
    const snap = await getSnapshot("day");
    const ev = (snap.events || [])
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 14)
      .map((e) => `[风险${e.score}] ${e.titleZh || e.title}`);
    const mk = (snap.markets || []).map((m) => `${m.name} ${m.value} ${m.change >= 0 ? "+" : ""}${m.change}%`);
    context = `【全球实时事件(按风险分)】\n${ev.join("\n")}\n【市场行情】\n${mk.join("；")}`;
  }
  const system =
    "你是「金融雷达助手」，专业的全球宏观、产业与金融市场分析助手。基于提供的实时数据，用简洁、专业、客观的中文回答用户问题，可分析事件对市场/产业/板块的影响与传导。不编造未提供的数据；不确定时如实说明。回答控制在 260 字内。";
  const user = `实时数据背景：\n${context}\n\n用户问题：${question}`;
  const txt = await deepseekChat("chat", { system, user, temperature: 0.5, maxTokens: 700, json: false, timeout: 40000 });
  return txt.trim();
}

// 新闻→板块影响分析：针对一条新闻，用 DeepSeek 分析利好/利空板块与传导链
async function analyzeNews(title, summary) {
  if (!config.featureOn("analyze")) throw new Error("FEATURE_OFF");
  if (!config.getDeepSeekKey()) throw new Error("NO_KEY");
  const arr = (x) => (Array.isArray(x) ? x.map(String).slice(0, 6) : []);
  const system =
    "你是专业的行业与证券分析师。针对给定的一条财经新闻，分析它对相关行业板块的利好/利空影响与传导逻辑。客观、具体、避免绝对化与投资建议措辞。只输出 JSON。";
  const user =
    `新闻标题：${title}\n${summary ? "摘要：" + summary + "\n" : ""}\n` +
    `请严格输出 JSON：{"bullish":["受利好的行业/板块/方向"],"bearish":["受利空的行业/板块/方向"],"chain":"1-2句说明影响如何传导到市场/产业","watch":["值得关注的细分方向或指标"]}`;
  const txt = await deepseekChat("analyze", { system, user, temperature: 0.4, maxTokens: 600, json: true, timeout: 30000 });
  const m = txt.match(/\{[\s\S]*\}/);
  const o = JSON.parse(m ? m[0] : txt);
  return { bullish: arr(o.bullish), bearish: arr(o.bearish), chain: String(o.chain || "").trim(), watch: arr(o.watch) };
}

// 「博研观点」：结合重庆 33618 产业与本地企业，对一条新闻生成地方国资投研解读
async function generateInsight(title, summary) {
  if (!config.featureOn("insight")) throw new Error("FEATURE_OFF");
  if (!config.getDeepSeekKey()) throw new Error("NO_KEY");
  const arr = (x) => (Array.isArray(x) ? x.map(String).slice(0, 5) : []);
  const system =
    "你是重庆渝富集团（地方国资投资平台）产业研究部的投研分析师。针对给定新闻，结合重庆 33618 现代制造业集群体系" +
    "（智能网联新能源汽车、新一代电子信息、先进材料、智能装备、生物医药、新型储能、高端摩托车等）与重庆代表企业" +
    "（长安汽车、赛力斯、宗申、隆鑫、华润微、SK海力士重庆、臻宝科技、智翔金泰、博腾股份、金凤实验室等），" +
    "输出简洁、专业、可执行的『博研观点』：政策/行业解读、对重庆相关产业链与本地企业的影响、以及地方国资可关注的赛道或投资方向。客观、不空谈。只输出 JSON。";
  const user =
    `新闻标题：${title}\n${summary ? "摘要：" + summary + "\n" : ""}\n` +
    `请严格输出 JSON：{"reading":"1-2句政策/行业解读","local":"对重庆相关产业链/本地企业的影响(1-2句)","suggestion":["地方国资可关注的赛道或投资方向1","2","3"]}`;
  const txt = await deepseekChat("insight", { system, user, temperature: 0.5, maxTokens: 700, json: true, timeout: 30000 });
  const m = txt.match(/\{[\s\S]*\}/);
  const o = JSON.parse(m ? m[0] : txt);
  return { reading: String(o.reading || "").trim(), local: String(o.local || "").trim(), suggestion: arr(o.suggestion) };
}

// 硬科技初创：从一批财经快讯里，用 DeepSeek 抽取「真实融资/投资事件」→ 结构化初创公司榜单
async function extractStartups(items) {
  if (!config.featureOn("startups")) throw new Error("FEATURE_OFF");
  if (!config.getDeepSeekKey()) throw new Error("NO_KEY");
  const lines = items.slice(0, 40).map((n, i) => `${i + 1}. ${String(n.title || "")}${n.summary ? "｜" + String(n.summary).slice(0, 60) : ""}`).join("\n");
  const system =
    "你是专注中国硬科技一级市场的投研分析师，尤其熟悉『物理AI/具身智能』产业链。从给定的财经快讯里，只挑出【真实发生的融资 / 战略投资 / 被收购入股】事件，" +
    "抽取其中的『初创/未上市或新上市硬科技公司』。规则：" +
    "① 同一家公司若出现在多条快讯里，只输出一条（合并，取信息最全的）；" +
    "② 优先保留早期轮次（种子/天使/Pre-A/A轮）；" +
    "③ 公司名用规范简称，去掉媒体后缀与书名号；" +
    "④ 严格排除：大盘/指数/个股二级市场行情、上市/过会/IPO、银行授信/发债、政策与榜单综述、基金设立、与具体公司融资无关的新闻；无法确认是融资事件的一律不要编造。" +
    "只输出 JSON。";
  const user =
    `快讯列表：\n${lines}\n\n` +
    `请严格输出 JSON：{"startups":[{"company":"公司名","round":"轮次(如种子轮/天使轮/Pre-A轮/A轮/战略融资,不明填\\"未披露\\")","amount":"金额(如数千万元/数亿元/1亿美元,不明填\\"未披露\\")","sector":"硬科技赛道","source":"消息来源媒体"}]}。` +
    `sector 用具体赛道，物理AI相关请细分到：具身大模型/VLA、人形机器人、四足机器人、灵巧手、力矩/触觉传感、谐波减速器、丝杠、机器人电机、机器人芯片；其他如 AI芯片/大模型/商业航天/固态电池/合成生物/脑机接口 等照常。` +
    `合并同一公司，只保留确有融资/投资动作的公司，按轮次早→晚排序，最多 12 个；没有则返回 {"startups":[]}。`;
  const txt = await deepseekChat("startups", { system, user, temperature: 0.3, maxTokens: 900, json: true, timeout: 30000 });
  const m = txt.match(/\{[\s\S]*\}/);
  const o = JSON.parse(m ? m[0] : txt);
  const arr = Array.isArray(o.startups) ? o.startups : [];
  return arr.slice(0, 12).map((s) => ({
    company: String(s.company || "").trim(),
    round: String(s.round || "未披露").trim(),
    amount: String(s.amount || "未披露").trim(),
    sector: String(s.sector || "").trim(),
    source: String(s.source || "").trim(),
  })).filter((s) => s.company);
}

function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, requestedPath);
  // 路径穿越防护：比较时带上分隔符，避免同名前缀兄弟目录（如 geotrade-radar-secrets）绕过
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  // 敏感文件黑名单：禁止经静态服务下载数据库、备份与点文件
  // （root 内的源码本身可被读取属已知，但用户数据库含邮箱与密码哈希、会话 token，必须拦截）
  const base = path.basename(filePath).toLowerCase();
  if (base.startsWith(".") || /\.(db|sqlite)(-(journal|wal|shm))?$/.test(base) || base.includes(".bak") || base === "radar-config.json") {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      ...securityHeaders,
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  // 免登录：未携带有效会话时即时分配一个访客会话（跳过登录/落地页，直达雷达选择）
  // 注销请求除外，避免注销后立刻又被自动登录
  if (pathname !== "/api/logout" && !currentUser(request)) {
    try {
      const guest = auth.ensureGuestSession();
      request.headers.cookie = (request.headers.cookie ? request.headers.cookie + "; " : "") + "session=" + guest.token;
      response.setHeader("Set-Cookie", sessionCookie(guest.token, auth.SESSION_TTL_MS / 1000));
    } catch (error) {
      // 访客会话创建失败时降级为匿名，不阻断请求
    }
  }
  // 用量统计：按"路径模板"计数（用户 id 归一化），心跳类接口不计
  if (pathname.startsWith("/api/") && pathname !== "/api/health" && pathname !== "/api/me") {
    auth.recordUsage(pathname.replace(/\/\d+(\/|$)/g, "/:id$1"));
  }
  // 全球快照数据端点按 IP 限流（访客会话已由前置中间件自动分配）
  if (pathname === "/api/snapshot") {
    if (!rateLimit(`radar:${clientIp(request)}`, 120, 60 * 1000)) {
      sendJson(response, 429, { error: "请求过于频繁，请稍后再试" });
      return;
    }
  }
  if (pathname === "/api/snapshot") {
    try {
      const snapshot = await getSnapshot(url.searchParams.get("period") || "day", url.searchParams.get("force") === "1");
      sendJson(response, 200, snapshot);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
    return;
  }
  if (pathname === "/api/health") {
    sendJson(response, 200, { ok: true, now: new Date().toISOString(), cacheEntries: cache.size });
    return;
  }
  if (pathname === "/api/cn-markets") {
    try {
      const result = await cachedProvider("cn-markets", 20 * 1000, loadCnMarkets);
      const quotes = result.data && !Array.isArray(result.data) ? result.data : {};
      sendJson(response, 200, { ok: Object.keys(quotes).length > 0, quotes, stale: result.stale, error: result.error, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, quotes: {}, error: error.message });
    }
    return;
  }
  if (pathname === "/api/cn-stocks") {
    const secids = (url.searchParams.get("secids") || "").trim();
    // 严格校验格式，只允许 "0.300750,1.601127" 这种 secid 列表，杜绝任意 URL 注入
    if (!/^[01]\.[0-9]{6}(,[01]\.[0-9]{6})*$/.test(secids)) {
      sendJson(response, 200, { ok: false, quotes: {}, error: "invalid secids" });
      return;
    }
    try {
      const result = await cachedProvider("cn-stocks:" + secids, 20 * 1000, () => loadCnStocks(secids));
      const quotes = result.data && !Array.isArray(result.data) ? result.data : {};
      sendJson(response, 200, { ok: Object.keys(quotes).length > 0, quotes, stale: result.stale, error: result.error, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, quotes: {}, error: error.message });
    }
    return;
  }
  if (pathname === "/api/track" && request.method === "POST") {
    // 限流防刷量：单 IP 每分钟最多 240 次心跳（正常每标签页 4 次/分）
    if (!rateLimit(`track:${clientIp(request)}`, 240, 60 * 1000)) {
      sendJson(response, 429, { ok: false });
      return;
    }
    try {
      const body = await readJsonBody(request);
      auth.trackVisit(String(body.vid || ""), String(body.radar || "other"), Number(body.seconds) || 0, body.nickname, body.device);
    } catch {
      /* 埋点失败静默忽略，不影响页面 */
    }
    sendJson(response, 200, { ok: true });
    return;
  }
  if (pathname === "/api/cn-search") {
    const kw = (url.searchParams.get("kw") || "").trim().slice(0, 20);
    if (!kw) { sendJson(response, 200, { ok: false, items: [], error: "empty kw" }); return; }
    try {
      const result = await cachedProvider("cn-search:" + kw, 90 * 1000, () => loadCnSearch(kw));
      const items = Array.isArray(result.data) ? result.data : [];
      sendJson(response, 200, { ok: items.length > 0, kw, items, stale: result.stale, error: result.error, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, kw, items: [], error: error.message });
    }
    return;
  }
  if (pathname === "/api/cn-boards") {
    try {
      const result = await cachedProvider("cn-boards", 30 * 1000, loadCnBoards);
      const data = result.data && !Array.isArray(result.data) ? result.data : { gainers: [], losers: [] };
      sendJson(response, 200, { ok: (data.gainers || []).length > 0, ...data, stale: result.stale, error: result.error, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, gainers: [], losers: [], error: error.message });
    }
    return;
  }
  if (pathname === "/api/cn-news") {
    try {
      const result = await cachedProvider("cn-news", 60 * 1000, loadCnNews);
      const items = Array.isArray(result.data) ? result.data : [];
      sendJson(response, 200, { ok: items.length > 0, items, stale: result.stale, error: result.error, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, items: [], error: error.message });
    }
    return;
  }
  if (pathname === "/api/brief") {
    try {
      const scope = url.searchParams.get("scope") === "china" ? "china" : "global";
      const result = await cachedProvider(`ai-brief:${scope}`, 10 * 60 * 1000, () => loadAiBrief(scope));
      const d = result.data;
      if (!d || Array.isArray(d) || result.error) throw new Error(result.error || "AI 简报暂不可用");
      sendJson(response, 200, { ok: true, ...d, fetchedAt: result.fetchedAt });
    } catch (error) {
      sendJson(response, 200, { ok: false, error: error.message });
    }
    return;
  }
  if (pathname === "/api/ask" && request.method === "POST") {
    try {
      if (!rateLimit(`ask:${clientIp(request)}`, 30, 60 * 1000)) {
        sendJson(response, 200, { ok: false, error: "提问太频繁，请稍后再试" });
        return;
      }
      const body = await readJsonBody(request);
      const question = String(body.question || "").trim().slice(0, 300);
      if (!question) {
        sendJson(response, 200, { ok: false, error: "问题不能为空" });
        return;
      }
      const answer = await askDeepSeek(question, body.scope === "china" ? "china" : "global");
      sendJson(response, 200, { ok: true, answer });
    } catch (error) {
      sendJson(response, 200, { ok: false, error: error.message });
    }
    return;
  }
  if (pathname === "/api/analyze" && request.method === "POST") {
    try {
      if (!rateLimit(`analyze:${clientIp(request)}`, 30, 60 * 1000)) {
        sendJson(response, 200, { ok: false, error: "分析太频繁，请稍后再试" });
        return;
      }
      const body = await readJsonBody(request);
      const title = String(body.title || "").trim().slice(0, 200);
      if (!title) {
        sendJson(response, 200, { ok: false, error: "缺少新闻标题" });
        return;
      }
      const result = await analyzeNews(title, String(body.summary || "").slice(0, 300));
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 200, { ok: false, error: error.message });
    }
    return;
  }
  if (pathname === "/api/insight" && request.method === "POST") {
    try {
      if (!rateLimit(`insight:${clientIp(request)}`, 30, 60 * 1000)) {
        sendJson(response, 200, { ok: false, error: "生成太频繁，请稍后再试" });
        return;
      }
      const body = await readJsonBody(request);
      const title = String(body.title || "").trim().slice(0, 200);
      if (!title) {
        sendJson(response, 200, { ok: false, error: "缺少新闻标题" });
        return;
      }
      const result = await generateInsight(title, String(body.summary || "").slice(0, 300));
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 200, { ok: false, error: error.message });
    }
    return;
  }
  // 硬科技初创：从客户端聚合的融资快讯里 AI 提炼结构化榜单（需 DeepSeek key + startups 开关）
  if (pathname === "/api/cn-startups" && request.method === "POST") {
    try {
      if (!rateLimit(`startups:${clientIp(request)}`, 20, 60 * 1000)) {
        sendJson(response, 200, { ok: false, error: "请求太频繁，请稍后再试" });
        return;
      }
      const body = await readJsonBody(request);
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) { sendJson(response, 200, { ok: false, error: "无可分析快讯" }); return; }
      const startups = await extractStartups(items);
      sendJson(response, 200, { ok: true, startups });
    } catch (error) {
      sendJson(response, 200, { ok: false, error: error.message });
    }
    return;
  }
  if (pathname === "/api/register" && request.method === "POST") {
    const ip = clientIp(request);
    if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
      sendJson(response, 429, { error: "注册尝试过于频繁，请稍后再试" });
      return;
    }
    try {
      const body = await readJsonBody(request);
      const { token, user } = auth.register(body.email, body.password);
      sendJson(response, 200, { user }, { "Set-Cookie": sessionCookie(token, auth.SESSION_TTL_MS / 1000) });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }
  if (pathname === "/api/login" && request.method === "POST") {
    const ip = clientIp(request);
    if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000)) {
      sendJson(response, 429, { error: "登录尝试过于频繁，请稍后再试" });
      return;
    }
    try {
      const body = await readJsonBody(request);
      const { token, user } = auth.login(body.email, body.password);
      sendJson(response, 200, { user }, { "Set-Cookie": sessionCookie(token, auth.SESSION_TTL_MS / 1000) });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }
  if (pathname === "/api/logout" && request.method === "POST") {
    const cookies = parseCookies(request);
    auth.logout(cookies.session);
    sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    return;
  }
  if (pathname === "/api/me") {
    const user = currentUser(request);
    sendJson(response, 200, { user });
    return;
  }
  if (pathname === "/api/profile") {
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { error: "请先登录" });
      return;
    }
    if (request.method === "GET") {
      sendJson(response, 200, { profile: auth.getProfile(user.id) });
      return;
    }
    if (request.method === "PUT" || request.method === "POST") {
      if (user.memberLevel === "free") {
        sendJson(response, 403, { error: "个性化雷达为会员专属功能，请升级会员后使用" });
        return;
      }
      try {
        const body = await readJsonBody(request);
        sendJson(response, 200, { profile: auth.saveProfile(user.id, body) });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
    sendJson(response, 405, { error: "不支持的请求方法" });
    return;
  }
  if (pathname.startsWith("/api/admin/")) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) {
      sendJson(response, 503, { error: "管理后台未启用：服务器未设置 ADMIN_TOKEN" });
      return;
    }
    if (request.headers["x-admin-token"] !== adminToken) {
      sendJson(response, 401, { error: "管理口令不正确" });
      return;
    }
    // ── 系统管理：AI 配置 ──
    if (pathname === "/api/admin/config" && request.method === "GET") {
      sendJson(response, 200, config.publicView());
      return;
    }
    if (pathname === "/api/admin/config" && request.method === "POST") {
      const body = await readJsonBody(request);
      sendJson(response, 200, config.patch(body));
      return;
    }
    // ── 系统管理：一键测试 AI key（发一条极短请求验证连通）──
    if (pathname === "/api/admin/ai-test" && request.method === "POST") {
      if (!config.getDeepSeekKey()) { sendJson(response, 200, { ok: false, error: "尚未配置 API Key" }); return; }
      const startedAt = Date.now();
      try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.getDeepSeekKey()}` },
          body: JSON.stringify({ model: config.getModel(), messages: [{ role: "user", content: "ping，只回复 pong" }], max_tokens: 5 }),
          signal: AbortSignal.timeout(15000),
        });
        const ms = Date.now() - startedAt;
        if (!res.ok) { sendJson(response, 200, { ok: false, ms, error: `DeepSeek ${res.status}` }); return; }
        const data = await res.json();
        const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
        sendJson(response, 200, { ok: true, ms, model: config.getModel(), reply: String(reply).slice(0, 40) });
      } catch (e) {
        sendJson(response, 200, { ok: false, ms: Date.now() - startedAt, error: e.message });
      }
      return;
    }
    // ── 系统管理：AI 用量与调用日志 ──
    if (pathname === "/api/admin/ai-usage" && request.method === "GET") {
      sendJson(response, 200, { total: aiUsage.total, ok: aiUsage.ok, fail: aiUsage.fail, byFeature: aiUsage.byFeature, recent: aiUsage.recent });
      return;
    }
    // ── 系统管理：数据源健康 ──
    if (pathname === "/api/admin/sources" && request.method === "GET") {
      sendJson(response, 200, { sources: sourceHealthList() });
      return;
    }
    // ── 系统管理：缓存查看 / 清理 / 强制刷新 ──
    if (pathname === "/api/admin/cache" && request.method === "GET") {
      sendJson(response, 200, { entries: cacheEntryList() });
      return;
    }
    if (pathname === "/api/admin/cache/clear" && request.method === "POST") {
      const body = await readJsonBody(request);
      const cleared = clearCache(body.key ? String(body.key) : null);
      sendJson(response, 200, { ok: true, cleared });
      return;
    }
    // ── 新闻存档：概览 / 列表 / 趋势 / 裁剪 ──
    if (pathname === "/api/admin/archive" && request.method === "GET") {
      sendJson(response, 200, {
        stats: archive.stats(),
        result: archive.list({
          limit: Number(url.searchParams.get("limit")) || 50,
          offset: Number(url.searchParams.get("offset")) || 0,
          kind: url.searchParams.get("kind") || "",
          keyword: url.searchParams.get("keyword") || "",
          q: url.searchParams.get("q") || "",
          day: url.searchParams.get("day") || "",
        }),
      });
      return;
    }
    if (pathname === "/api/admin/archive/trend" && request.method === "GET") {
      sendJson(response, 200, { trend: archive.trend(url.searchParams.get("q") || "", Number(url.searchParams.get("days")) || 14) });
      return;
    }
    if (pathname === "/api/admin/archive/prune" && request.method === "POST") {
      const body = await readJsonBody(request);
      const removed = archive.prune(Number(body.days) || 180);
      sendJson(response, 200, { ok: true, removed });
      return;
    }
    if (pathname === "/api/admin/stats" && request.method === "GET") {
      sendJson(response, 200, auth.userStats());
      return;
    }
    if (pathname === "/api/admin/analytics" && request.method === "GET") {
      sendJson(response, 200, auth.analytics());
      return;
    }
    if (pathname === "/api/admin/label" && request.method === "POST") {
      const body = await readJsonBody(request);
      auth.setVisitorNickname(String(body.vid || ""), String(body.nickname || ""));
      sendJson(response, 200, { ok: true });
      return;
    }
    if (pathname === "/api/admin/usage" && request.method === "GET") {
      sendJson(response, 200, auth.usageSummary(Number(url.searchParams.get("days")) || 14));
      return;
    }
    if (pathname === "/api/admin/users" && request.method === "GET") {
      const search = url.searchParams.get("search") || "";
      const level = url.searchParams.get("level") || "";
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize")) || 50));
      sendJson(response, 200, auth.listUsers({ search, level, page, pageSize }));
      return;
    }
    if (pathname === "/api/admin/users.csv" && request.method === "GET") {
      const search = url.searchParams.get("search") || "";
      const level = url.searchParams.get("level") || "";
      const { users } = auth.listUsers({ search, level, page: 1, pageSize: 5000 });
      const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const header = ["id", "email", "memberLevel", "memberExpiresAt", "status", "createdAt"];
      const lines = [header.join(",")];
      for (const user of users) lines.push(header.map((key) => escape(user[key])).join(","));
      response.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${Date.now()}.csv"`,
        "Cache-Control": "no-store",
      });
      response.end(`﻿${lines.join("\r\n")}`);
      return;
    }
    const memberMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/member$/);
    if (memberMatch && request.method === "POST") {
      try {
        const body = await readJsonBody(request);
        const user = auth.setMemberLevel(Number(memberMatch[1]), body.level, body.expiresAt || null);
        sendJson(response, 200, { user });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
    const grantMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/grant$/);
    if (grantMatch && request.method === "POST") {
      try {
        const body = await readJsonBody(request);
        const user = auth.grantMembership(Number(grantMatch[1]), body.level, body.months);
        sendJson(response, 200, { user });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
    const resetMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
    if (resetMatch && request.method === "POST") {
      try {
        const tempPassword = auth.adminResetPassword(Number(resetMatch[1]));
        sendJson(response, 200, { tempPassword });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
    const statusMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/);
    if (statusMatch && request.method === "POST") {
      try {
        const body = await readJsonBody(request);
        const user = auth.setUserStatus(Number(statusMatch[1]), body.status);
        sendJson(response, 200, { user });
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
    sendJson(response, 404, { error: "未知的管理接口" });
    return;
  }
  serveStatic(pathname, response);
});

const host = process.env.HOST || "127.0.0.1";

server.listen(port, host, () => {
  console.log(`GeoTrade Radar live server running at http://${host}:${port}`);
});

setInterval(() => {
  getSnapshot("day").catch(() => {});
}, 5 * 60 * 1000).unref();

// 新闻存档保留期裁剪：每 24h 删除 180 天前的记录，防止无限增长
setInterval(() => {
  try { const n = archive.prune(180); if (n) console.log(`[archive] 裁剪 ${n} 条过期新闻`); } catch (e) { /* ignore */ }
}, 24 * 60 * 60 * 1000).unref();

// ── 服务端定时归档器：进程存活即连续抓取入库，不依赖访客流量 ──
// 覆盖：财经快讯流 + 融资关键词 + 全部硬科技赛道。入库去重在 loadCnNews/loadCnSearch 内完成。
// 可用环境变量 ARCHIVE_SWEEP=off 关闭；ARCHIVE_SWEEP_MIN 改扫描间隔（分钟，默认 5）。
const ARCHIVE_KEYWORDS = [
  // 融资
  "完成融资", "天使轮 融资", "A轮 融资", "硬科技 融资", "获数亿元融资",
  // AI 集群
  "大模型", "多模态 视频生成", "AI Agent", "算力 大模型", "国产GPU 芯片",
  // 物理AI · 具身智能
  "人形机器人", "具身智能", "灵巧手 机器人",
  // 其余硬科技
  "商业航天", "可控核聚变", "脑机接口", "固态电池", "合成生物", "量子计算", "自动驾驶", "低空 eVTOL",
];
async function archiveSweep() {
  try { await cachedProvider("cn-news", 60 * 1000, loadCnNews); } catch (e) { /* 单次失败忽略 */ }
  for (const kw of ARCHIVE_KEYWORDS) {
    try { await cachedProvider("cn-search:" + kw, 90 * 1000, () => loadCnSearch(kw)); } catch (e) { /* 单个关键词失败忽略 */ }
    await delay(1500); // 逐个间隔，避免对数据源突发请求
  }
}
if (String(process.env.ARCHIVE_SWEEP || "on").toLowerCase() !== "off") {
  const sweepMs = Math.max(2, Number(process.env.ARCHIVE_SWEEP_MIN) || 5) * 60 * 1000;
  setTimeout(() => { archiveSweep().catch(() => {}); }, 15 * 1000).unref(); // 启动 15s 后先跑一次
  setInterval(() => { archiveSweep().catch(() => {}); }, sweepMs).unref();
  console.log(`[archive] 定时归档器已启用，每 ${sweepMs / 60000} 分钟扫描 ${ARCHIVE_KEYWORDS.length + 1} 个源`);
}
