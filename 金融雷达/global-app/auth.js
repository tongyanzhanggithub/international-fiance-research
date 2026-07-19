const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

// 数据目录：托管平台可设 DATA_DIR 指向持久磁盘，避免重新部署丢失用户库；默认应用目录
const dataDir = process.env.DATA_DIR || __dirname;
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch {
  // 目录已存在或不可创建时忽略，交由打开数据库时报错
}
const db = new DatabaseSync(path.join(dataDir, "users.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    member_level TEXT NOT NULL DEFAULT 'free',
    member_expires_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  CREATE TABLE IF NOT EXISTS user_profile (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alert_log (
    user_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_key)
  );
  CREATE TABLE IF NOT EXISTS usage_stats (
    day TEXT NOT NULL,
    metric TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, metric)
  );
  CREATE TABLE IF NOT EXISTS weekly_log (
    user_id INTEGER NOT NULL,
    week TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    PRIMARY KEY (user_id, week)
  );
  CREATE TABLE IF NOT EXISTS report_usage (
    user_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
  -- 访客分析：匿名设备（vid）+ 可选昵称 + 观看时长
  CREATE TABLE IF NOT EXISTS visitors (
    vid TEXT PRIMARY KEY,
    nickname TEXT,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    last_radar TEXT,
    total_seconds INTEGER NOT NULL DEFAULT 0
  );
  -- 每设备 / 每天 / 每雷达 的累计观看秒数（覆盖时长、活跃天、雷达偏好、趋势）
  CREATE TABLE IF NOT EXISTS visit_time (
    vid TEXT NOT NULL,
    day TEXT NOT NULL,
    radar TEXT NOT NULL,
    seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (vid, day, radar)
  );
  CREATE INDEX IF NOT EXISTS idx_visit_time_day ON visit_time (day);
  CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors (last_seen);
  CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON visitors (first_seen);
  -- 访问时段分布：每个小时(0-23)的累计观看秒数
  CREATE TABLE IF NOT EXISTS hour_stats (
    hour INTEGER PRIMARY KEY,
    seconds INTEGER NOT NULL DEFAULT 0
  );
`);

// 迁移：给 visitors 补 device 列（桌面/手机/平板）
const visitorColumns = db.prepare("PRAGMA table_info(visitors)").all().map((c) => c.name);
if (!visitorColumns.includes("device")) {
  db.exec("ALTER TABLE visitors ADD COLUMN device TEXT");
}

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
if (!userColumns.includes("status")) {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    memberLevel: row.member_level,
    memberExpiresAt: row.member_expires_at,
    status: row.status || "active",
    createdAt: row.created_at,
  };
}

function register(email, password) {
  if (!isValidEmail(email)) throw new Error("邮箱格式不正确");
  if (typeof password !== "string" || password.length < 8) throw new Error("密码至少需要 8 位");

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("该邮箱已被注册");

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare("INSERT INTO users (email, password_hash, salt, member_level, created_at) VALUES (?, ?, ?, 'free', ?)")
    .run(email, passwordHash, salt, createdAt);

  return createSession(Number(result.lastInsertRowid));
}

function login(email, password) {
  let row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) throw new Error("邮箱或密码错误");
  row = downgradeIfExpired(row);

  const candidateHash = hashPassword(password, row.salt);
  const expected = Buffer.from(row.password_hash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  if (expected.length !== candidate.length || !crypto.timingSafeEqual(expected, candidate)) {
    throw new Error("邮箱或密码错误");
  }
  if (row.status === "disabled") throw new Error("该账号已被禁用，请联系管理员");

  return createSession(row.id);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    new Date(now).toISOString(),
    new Date(now + SESSION_TTL_MS).toISOString(),
  );
  return { token, user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) };
}

// 会员到期 → 自动降级为 free（单个用户即时检查；expireMembers 做全表扫）
function downgradeIfExpired(row) {
  if (!row || row.member_level === "free" || !row.member_expires_at) return row;
  if (new Date(row.member_expires_at).getTime() >= Date.now()) return row;
  db.prepare("UPDATE users SET member_level = 'free', member_expires_at = NULL WHERE id = ?").run(row.id);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
}

function expireMembers() {
  db.prepare(
    "UPDATE users SET member_level = 'free', member_expires_at = NULL WHERE member_level != 'free' AND member_expires_at IS NOT NULL AND member_expires_at < ?",
  ).run(new Date().toISOString());
}

function userFromToken(token) {
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  let row = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  if (!row) return null;
  row = downgradeIfExpired(row);
  if (row.status === "disabled") {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return publicUser(row);
}

function logout(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// 免登录访客会话：查找或创建固定访客账号（pro 权限，解锁全部功能），返回新会话
function ensureGuestSession() {
  let row = db.prepare("SELECT * FROM users WHERE email = ?").get("guest@local");
  if (!row) {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(crypto.randomBytes(12).toString("hex"), salt);
    const createdAt = new Date().toISOString();
    const result = db
      .prepare("INSERT INTO users (email, password_hash, salt, member_level, created_at) VALUES (?, ?, ?, 'pro', ?)")
      .run("guest@local", passwordHash, salt, createdAt);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
  }
  return createSession(row.id);
}

const VALID_MEMBER_LEVELS = ["free", "member", "pro"];

function listUsers({ search = "", level = "", page = 1, pageSize = 50 } = {}) {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const term = `%${search.trim()}%`;
  const hasSearch = Boolean(search.trim());
  const hasLevel = VALID_MEMBER_LEVELS.includes(level);

  const conditions = [];
  const params = [];
  if (hasSearch) {
    conditions.push("email LIKE ?");
    params.push(term);
  }
  if (hasLevel) {
    conditions.push("member_level = ?");
    params.push(level);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) AS count FROM users ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);
  return { users: rows.map(publicUser), total, page, pageSize };
}

function userStats() {
  const total = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const byLevel = {};
  for (const level of VALID_MEMBER_LEVELS) {
    byLevel[level] = db.prepare("SELECT COUNT(*) AS count FROM users WHERE member_level = ?").get(level).count;
  }
  const disabled = db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'disabled'").get().count;
  const since = (days) => new Date(Date.now() - days * 86400000).toISOString();
  const newToday = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").get(since(1)).count;
  const newThisWeek = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").get(since(7)).count;
  return { total, byLevel, disabled, newToday, newThisWeek };
}

function setMemberLevel(userId, level, expiresAt) {
  if (!VALID_MEMBER_LEVELS.includes(level)) throw new Error("无效的会员等级");
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  db.prepare("UPDATE users SET member_level = ?, member_expires_at = ? WHERE id = ?").run(
    level,
    expiresAt || null,
    userId,
  );
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

// 管理员重置密码：生成临时密码并踢掉所有会话，返回明文给管理员人工转交用户
function adminResetPassword(userId) {
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  const tempPassword = crypto.randomBytes(6).toString("base64url"); // 8 位
  const salt = crypto.randomBytes(16).toString("hex");
  db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(
    hashPassword(tempPassword, salt),
    salt,
    userId,
  );
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return tempPassword;
}

// 开通/续费会员 N 个月：未到期则在原到期日上顺延
function grantMembership(userId, level, months) {
  if (!VALID_MEMBER_LEVELS.includes(level) || level === "free") throw new Error("无效的会员等级");
  const monthCount = Number(months);
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 36) throw new Error("月数需为 1-36 的整数");
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  const base =
    row.member_level !== "free" && row.member_expires_at && new Date(row.member_expires_at).getTime() > Date.now()
      ? new Date(row.member_expires_at)
      : new Date();
  base.setMonth(base.getMonth() + monthCount);
  return setMemberLevel(userId, level, base.toISOString());
}

function setUserStatus(userId, status) {
  if (!["active", "disabled"].includes(status)) throw new Error("无效的账号状态");
  const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error("用户不存在");
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  if (status === "disabled") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

// 极简用量统计：按天 × 指标计数（指标=规整后的 API 路径）。出错不影响业务。
function recordUsage(metric) {
  try {
    db.prepare(
      "INSERT INTO usage_stats (day, metric, count) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET count = count + 1",
    ).run(new Date().toISOString().slice(0, 10), String(metric).slice(0, 80));
  } catch {
    /* 统计失败静默忽略 */
  }
}

function usageSummary(days = 14) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = db
    .prepare("SELECT day, metric, count FROM usage_stats WHERE day >= ? ORDER BY day DESC, count DESC")
    .all(since);
  const totals = db
    .prepare("SELECT metric, SUM(count) AS total FROM usage_stats WHERE day >= ? GROUP BY metric ORDER BY total DESC")
    .all(since);
  return { since, days, totals, daily: rows };
}

// 每会员等级的 AI 简报每日生成次数上限
const REPORT_DAILY_LIMITS = { free: 0, member: 5, pro: 20 };

// 检查并占用一次当日简报额度。额度足够时计数 +1 并返回 { ok: true, used, limit }；
// 不足时不计数，返回 { ok: false, used, limit }。
function consumeReportQuota(userId, memberLevel) {
  const limit = REPORT_DAILY_LIMITS[memberLevel] ?? 0;
  const day = new Date().toISOString().slice(0, 10);
  const row = db.prepare("SELECT count FROM report_usage WHERE user_id = ? AND day = ?").get(userId, day);
  const used = row ? row.count : 0;
  if (used >= limit) return { ok: false, used, limit };
  db.prepare(
    "INSERT INTO report_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1",
  ).run(userId, day);
  return { ok: true, used: used + 1, limit };
}

// 用户画像：品类（HS 编码或关键词）、出口市场、关注航线。所有字段都是字符串数组。
const PROFILE_FIELDS = ["hsCodes", "countries", "routes"];

function sanitizeProfile(input) {
  const profile = {};
  for (const field of PROFILE_FIELDS) {
    const raw = Array.isArray(input?.[field]) ? input[field] : [];
    profile[field] = raw
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((item) => item.slice(0, 40));
  }
  // 预警通道：企业微信群机器人 webhook（仅允许官方域名，防 SSRF）与邮件开关
  const webhook = String(input?.webhook || "").trim();
  profile.webhook = webhook.startsWith("https://qyapi.weixin.qq.com/") ? webhook.slice(0, 300) : "";
  profile.emailAlerts = Boolean(input?.emailAlerts);
  return profile;
}

// 所有可接收预警的用户：状态正常、付费会员、有画像
function listAlertSubscribers() {
  const rows = db
    .prepare(
      "SELECT u.id, u.email, u.member_level, p.data FROM users u JOIN user_profile p ON p.user_id = u.id WHERE u.status = 'active' AND u.member_level != 'free' AND (u.member_expires_at IS NULL OR u.member_expires_at >= ?)",
    )
    .all(new Date().toISOString());
  return rows
    .map((row) => {
      try {
        return { id: row.id, email: row.email, memberLevel: row.member_level, profile: sanitizeProfile(JSON.parse(row.data)) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function weeklyAlreadySent(userId, week) {
  return Boolean(db.prepare("SELECT 1 FROM weekly_log WHERE user_id = ? AND week = ?").get(userId, week));
}

function markWeeklySent(userId, week) {
  db.prepare("INSERT OR IGNORE INTO weekly_log (user_id, week, sent_at) VALUES (?, ?, ?)").run(
    userId,
    week,
    new Date().toISOString(),
  );
}

function alertAlreadySent(userId, itemKey) {
  return Boolean(db.prepare("SELECT 1 FROM alert_log WHERE user_id = ? AND item_key = ?").get(userId, itemKey));
}

function markAlertSent(userId, itemKey) {
  db.prepare("INSERT OR IGNORE INTO alert_log (user_id, item_key, sent_at) VALUES (?, ?, ?)").run(
    userId,
    itemKey,
    new Date().toISOString(),
  );
}

function getProfile(userId) {
  const row = db.prepare("SELECT data FROM user_profile WHERE user_id = ?").get(userId);
  if (!row) return null;
  try {
    return sanitizeProfile(JSON.parse(row.data));
  } catch {
    return null;
  }
}

function saveProfile(userId, input) {
  const profile = sanitizeProfile(input);
  db.prepare(
    "INSERT INTO user_profile (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).run(userId, JSON.stringify(profile), new Date().toISOString());
  return profile;
}

// 生成失败（API 报错等）时退还本次占用的额度
function refundReportQuota(userId) {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE report_usage SET count = count - 1 WHERE user_id = ? AND day = ? AND count > 0").run(userId, day);
}

setInterval(() => {
  expireMembers();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  db.prepare("DELETE FROM report_usage WHERE day < ?").run(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  db.prepare("DELETE FROM alert_log WHERE sent_at < ?").run(new Date(Date.now() - 90 * 86400000).toISOString());
}, 60 * 60 * 1000).unref();

// ===== 访客分析（匿名设备 + 可选昵称 + 观看时长）=====
const RADARS = ["global", "china", "chain", "other"];
function normRadar(r) { return RADARS.includes(r) ? r : "other"; }

const VALID_DEVICES = ["desktop", "mobile", "tablet"];
// 记录一次心跳：给设备在「今天 / 该雷达」累加 seconds（上限 30s/次防滥用）
function trackVisit(vid, radar, seconds, nickname, device) {
  if (!vid || typeof vid !== "string") return;
  vid = vid.slice(0, 40);
  const sec = Math.max(0, Math.min(30, Math.round(Number(seconds) || 0)));
  const rad = normRadar(radar);
  const dev = VALID_DEVICES.includes(device) ? device : null;
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();
  try {
    const exists = db.prepare("SELECT vid FROM visitors WHERE vid = ?").get(vid);
    if (exists) {
      db.prepare("UPDATE visitors SET last_seen = ?, last_radar = ?, total_seconds = total_seconds + ? WHERE vid = ?").run(now, rad, sec, vid);
      if (nickname != null) db.prepare("UPDATE visitors SET nickname = ? WHERE vid = ?").run(String(nickname).slice(0, 24), vid);
      if (dev) db.prepare("UPDATE visitors SET device = ? WHERE vid = ?").run(dev, vid);
    } else {
      db.prepare("INSERT INTO visitors (vid, nickname, first_seen, last_seen, last_radar, total_seconds, device) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        vid, nickname != null ? String(nickname).slice(0, 24) : null, now, now, rad, sec, dev);
    }
    if (sec > 0) {
      db.prepare("INSERT INTO visit_time (vid, day, radar, seconds) VALUES (?, ?, ?, ?) ON CONFLICT(vid, day, radar) DO UPDATE SET seconds = seconds + ?").run(vid, day, rad, sec, sec);
      db.prepare("INSERT INTO hour_stats (hour, seconds) VALUES (?, ?) ON CONFLICT(hour) DO UPDATE SET seconds = seconds + ?").run(hour, sec, sec);
    }
  } catch {
    /* 统计失败静默忽略 */
  }
}

function setVisitorNickname(vid, nickname) {
  try { db.prepare("UPDATE visitors SET nickname = ? WHERE vid = ?").run(String(nickname || "").slice(0, 24), String(vid).slice(0, 40)); } catch {}
}

// 后台分析汇总：概览 + 访客明细 + 每日趋势 + 雷达偏好
function analytics() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const onlineCut = now - 90 * 1000; // 90 秒内有心跳视为在线
  const secToMin = (s) => Math.round((s || 0) / 60);

  const todayStart = new Date(today + "T00:00:00").getTime();
  const totalVisitors = db.prepare("SELECT COUNT(*) AS c FROM visitors").get().c;
  const totalSeconds = db.prepare("SELECT SUM(total_seconds) AS s FROM visitors").get().s || 0;
  const todayVisitors = db.prepare("SELECT COUNT(DISTINCT vid) AS c FROM visit_time WHERE day = ?").get(today).c;
  const newToday = db.prepare("SELECT COUNT(*) AS c FROM visitors WHERE first_seen >= ?").get(todayStart).c;
  const overview = {
    onlineNow: db.prepare("SELECT COUNT(*) AS c FROM visitors WHERE last_seen >= ?").get(onlineCut).c,
    totalVisitors,
    todayVisitors,
    todayMinutes: secToMin(db.prepare("SELECT SUM(seconds) AS s FROM visit_time WHERE day = ?").get(today).s),
    totalMinutes: secToMin(totalSeconds),
    avgMinutes: totalVisitors ? secToMin(totalSeconds / totalVisitors) : 0,
    newToday,
    returningToday: Math.max(0, todayVisitors - newToday),
  };

  // 设备类型分布
  const deviceRows = db.prepare("SELECT COALESCE(device,'unknown') AS device, COUNT(*) AS c FROM visitors GROUP BY device").all();
  const devices = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  deviceRows.forEach((r) => { devices[r.device] = r.c; });

  // 访问时段分布（0-23 时的观看分钟）
  const hourRows = db.prepare("SELECT hour, seconds FROM hour_stats").all();
  const hours = Array.from({ length: 24 }, (_, h) => {
    const row = hourRows.find((r) => r.hour === h);
    return { hour: h, minutes: secToMin(row ? row.seconds : 0) };
  });

  // 访客留存分层：按活跃天数分桶（一次性 / 常来 / 忠实）
  const dayCounts = db.prepare("SELECT vid, COUNT(DISTINCT day) AS d FROM visit_time GROUP BY vid").all();
  const retention = { d1: 0, d2_6: 0, d7plus: 0 };
  dayCounts.forEach((r) => { if (r.d >= 7) retention.d7plus++; else if (r.d >= 2) retention.d2_6++; else retention.d1++; });

  const visitorRows = db.prepare("SELECT * FROM visitors ORDER BY last_seen DESC LIMIT 200").all();
  const visitors = visitorRows.map((v) => {
    const todaySec = db.prepare("SELECT SUM(seconds) AS s FROM visit_time WHERE vid = ? AND day = ?").get(v.vid, today).s || 0;
    const activeDays = db.prepare("SELECT COUNT(DISTINCT day) AS c FROM visit_time WHERE vid = ?").get(v.vid).c;
    const byRadar = {};
    db.prepare("SELECT radar, SUM(seconds) AS s FROM visit_time WHERE vid = ? GROUP BY radar").all(v.vid).forEach((r) => { byRadar[r.radar] = secToMin(r.s); });
    return {
      vid: v.vid,
      nickname: v.nickname || "",
      device: v.device || "unknown",
      firstSeen: v.first_seen,
      lastSeen: v.last_seen,
      lastRadar: v.last_radar || "",
      online: v.last_seen >= onlineCut,
      totalMinutes: secToMin(v.total_seconds),
      todayMinutes: secToMin(todaySec),
      activeDays,
      byRadar,
    };
  });

  const trend = db.prepare(
    "SELECT day, COUNT(DISTINCT vid) AS visitors, SUM(seconds) AS seconds FROM visit_time GROUP BY day ORDER BY day DESC LIMIT 30",
  ).all().map((r) => ({ day: r.day, visitors: r.visitors, minutes: secToMin(r.seconds) })).reverse();

  const radar = db.prepare(
    "SELECT radar, SUM(seconds) AS seconds, COUNT(DISTINCT vid) AS visitors FROM visit_time GROUP BY radar",
  ).all().map((r) => ({ radar: r.radar, minutes: secToMin(r.seconds), visitors: r.visitors }));

  return { overview, visitors, trend, radar, devices, hours, retention };
}

module.exports = {
  register,
  login,
  trackVisit,
  setVisitorNickname,
  analytics,
  logout,
  ensureGuestSession,
  userFromToken,
  listUsers,
  userStats,
  setMemberLevel,
  setUserStatus,
  adminResetPassword,
  grantMembership,
  recordUsage,
  usageSummary,
  consumeReportQuota,
  refundReportQuota,
  getProfile,
  saveProfile,
  listAlertSubscribers,
  alertAlreadySent,
  markAlertSent,
  weeklyAlreadySent,
  markWeeklySent,
  REPORT_DAILY_LIMITS,
  VALID_MEMBER_LEVELS,
  SESSION_TTL_MS,
};
