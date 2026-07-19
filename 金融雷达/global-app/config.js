// 运行时配置存储：后台可配置 DeepSeek key / 模型 / 功能开关，持久化到磁盘，重启不丢。
// 存放于 DATA_DIR（与 users.db 同目录），托管平台指向持久磁盘即可跨部署保留。
const fs = require("node:fs");
const path = require("node:path");

const dataDir = process.env.DATA_DIR || __dirname;
const file = path.join(dataDir, "radar-config.json");

const DEFAULTS = {
  deepseekKey: "",          // 为空则回退到环境变量 DEEPSEEK_API_KEY
  deepseekModel: "deepseek-chat",
  features: {
    brief: true,            // AI 每日简报
    chat: true,             // AI 智能问答
    analyze: true,          // 新闻→板块影响分析
    insight: true,          // 博研观点（重庆视角）
    startups: true,         // 硬科技初创：融资快讯 AI 提炼
  },
};

let state = load();

function load() {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const obj = JSON.parse(raw);
    return {
      deepseekKey: typeof obj.deepseekKey === "string" ? obj.deepseekKey : "",
      deepseekModel: obj.deepseekModel || DEFAULTS.deepseekModel,
      features: { ...DEFAULTS.features, ...(obj.features || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function save() {
  try {
    fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[config] 写入失败:", e.message);
    return false;
  }
}

// 生效的 DeepSeek key：后台配置优先，其次环境变量
function getDeepSeekKey() {
  return (state.deepseekKey && state.deepseekKey.trim()) || process.env.DEEPSEEK_API_KEY || "";
}

function keySource() {
  if (state.deepseekKey && state.deepseekKey.trim()) return "config";
  if (process.env.DEEPSEEK_API_KEY) return "env";
  return "none";
}

function getModel() {
  return state.deepseekModel || DEFAULTS.deepseekModel;
}

function featureOn(name) {
  return state.features[name] !== false;
}

// 打码后的 key，用于后台展示（绝不回传明文）
function maskedKey() {
  const k = getDeepSeekKey();
  if (!k) return "";
  if (k.length <= 8) return "····";
  return k.slice(0, 3) + "····" + k.slice(-4);
}

// 后台保存：只更新传入的字段；deepseekKey 传空字符串视为「不改动」，传 null 视为「清除」
function patch(input = {}) {
  if (typeof input.deepseekKey === "string" && input.deepseekKey.trim()) {
    state.deepseekKey = input.deepseekKey.trim();
  } else if (input.deepseekKey === null) {
    state.deepseekKey = "";
  }
  if (typeof input.deepseekModel === "string" && input.deepseekModel.trim()) {
    state.deepseekModel = input.deepseekModel.trim();
  }
  if (input.features && typeof input.features === "object") {
    for (const k of Object.keys(DEFAULTS.features)) {
      if (typeof input.features[k] === "boolean") state.features[k] = input.features[k];
    }
  }
  save();
  return publicView();
}

// 对后台暴露的安全视图（不含明文 key）
function publicView() {
  return {
    keySource: keySource(),
    keyMasked: maskedKey(),
    keyConfigured: !!getDeepSeekKey(),
    deepseekModel: getModel(),
    features: { ...state.features },
    configFile: file,
  };
}

module.exports = { getDeepSeekKey, keySource, getModel, featureOn, maskedKey, patch, publicView };
