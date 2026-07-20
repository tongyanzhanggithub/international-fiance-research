// 新闻存档：把实时拉到的快讯去重留痕，支持按天回看 / 按公司·赛道查历史提及趋势。
// 独立 news.db（不与用户库耦合），存 DATA_DIR，部署时指向持久磁盘即可跨部署保留。
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const dataDir = process.env.DATA_DIR || __dirname;
try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
const db = new DatabaseSync(path.join(dataDir, "news.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,          -- sha1(title)
    title TEXT NOT NULL,
    summary TEXT,
    source TEXT,
    url TEXT,
    src_time TEXT,                -- 源站给的时间字符串
    kind TEXT,                    -- 'news' 事件流 | 'search' 定向搜索
    keyword TEXT,                 -- search 的关键词（news 为空）
    first_seen INTEGER NOT NULL,  -- 首次入库 ms
    last_seen INTEGER NOT NULL    -- 最近一次仍在快讯里 ms
  );
  CREATE INDEX IF NOT EXISTS idx_news_first ON news(first_seen);
  CREATE INDEX IF NOT EXISTS idx_news_kw ON news(keyword);

  -- 指数快照：景气指数等由实时行情合成的指标需落盘才能看趋势（内存里只有瞬时值）
  CREATE TABLE IF NOT EXISTS idx_snap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,           -- 指数名，如 'physical_ai'
    ts INTEGER NOT NULL,          -- 采样时刻 ms
    value REAL NOT NULL,          -- 指数值
    avg_chg REAL,                 -- 成分股平均涨跌幅 %
    inflow REAL,                  -- 主力净流入合计 元
    up INTEGER, down INTEGER, n INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_snap_name_ts ON idx_snap(name, ts);
`);

const hash = (s) => crypto.createHash("sha1").update(String(s)).digest("hex");

const upsert = db.prepare(`
  INSERT INTO news (id, title, summary, source, url, src_time, kind, keyword, first_seen, last_seen)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    last_seen = excluded.last_seen,
    summary = COALESCE(NULLIF(excluded.summary, ''), news.summary),
    keyword = CASE WHEN news.kind = 'search' AND excluded.kind = 'news' THEN news.keyword ELSE excluded.keyword END
`);

// 记录一批快讯；重复标题只更新 last_seen（不覆盖 first_seen）
function record(items, opts = {}) {
  if (!Array.isArray(items) || !items.length) return 0;
  const now = Date.now();
  const kind = opts.kind || "news";
  const keyword = opts.keyword || null;
  let n = 0;
  const tx = db.prepare("BEGIN"); const commit = db.prepare("COMMIT"); const rollback = db.prepare("ROLLBACK");
  tx.run();
  try {
    for (const it of items) {
      const title = String(it.title || "").trim();
      if (!title) continue;
      upsert.run(hash(title), title, String(it.summary || ""), String(it.source || ""), String(it.url || ""), String(it.time || it.src_time || ""), kind, keyword, now, now);
      n++;
    }
    commit.run();
  } catch (e) {
    rollback.run();
    console.error("[archive] record 失败:", e.message);
  }
  return n;
}

// 最近入库的快讯（分页 / 可按 kind、keyword、日期、关键字搜索）
function list({ limit = 50, offset = 0, kind = "", keyword = "", q = "", day = "" } = {}) {
  const where = []; const args = [];
  if (kind) { where.push("kind = ?"); args.push(kind); }
  if (keyword) { where.push("keyword = ?"); args.push(keyword); }
  if (q) { where.push("(title LIKE ? OR summary LIKE ?)"); args.push(`%${q}%`, `%${q}%`); }
  if (day) {
    const start = new Date(`${day}T00:00:00`).getTime();
    const end = start + 86400000;
    where.push("first_seen >= ? AND first_seen < ?"); args.push(start, end);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT title, summary, source, url, src_time, kind, keyword, first_seen, last_seen FROM news ${w} ORDER BY first_seen DESC LIMIT ? OFFSET ?`).all(...args, Math.min(200, limit), offset);
  const total = db.prepare(`SELECT COUNT(*) c FROM news ${w}`).get(...args).c;
  return { total, items: rows };
}

// 某关键字最近 N 天的每日提及次数（趋势）
function trend(q, days = 14) {
  if (!q) return [];
  const since = Date.now() - days * 86400000;
  const rows = db.prepare(`SELECT first_seen FROM news WHERE first_seen >= ? AND (title LIKE ? OR summary LIKE ?)`).all(since, `%${q}%`, `%${q}%`);
  const byDay = {};
  for (const r of rows) {
    const d = new Date(r.first_seen);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay[key] = (byDay[key] || 0) + 1;
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ day: key, count: byDay[key] || 0 });
  }
  return out;
}

function stats() {
  const total = db.prepare("SELECT COUNT(*) c FROM news").get().c;
  const byKind = db.prepare("SELECT kind, COUNT(*) c FROM news GROUP BY kind").all();
  const oldest = db.prepare("SELECT MIN(first_seen) m FROM news").get().m;
  const newest = db.prepare("SELECT MAX(first_seen) m FROM news").get().m;
  const today = db.prepare("SELECT COUNT(*) c FROM news WHERE first_seen >= ?").get(new Date().setHours(0, 0, 0, 0)).c;
  return { total, byKind, oldest, newest, today };
}

// 保留期裁剪：删除 first_seen 早于 N 天的记录，防止无限增长
function prune(days = 180) {
  const cutoff = Date.now() - days * 86400000;
  const info = db.prepare("DELETE FROM news WHERE first_seen < ?").run(cutoff);
  return info.changes || 0;
}

// —— 指数快照 ——
// 节流写入：同一指数 minGapMs 内不重复落盘，避免每次刷新都写库。
function recordIndex(name, snap, minGapMs = 5 * 60 * 1000) {
  const now = Date.now();
  const last = db.prepare("SELECT ts FROM idx_snap WHERE name=? ORDER BY ts DESC LIMIT 1").get(name);
  if (last && now - Number(last.ts) < minGapMs) return false;
  db.prepare("INSERT INTO idx_snap(name,ts,value,avg_chg,inflow,up,down,n) VALUES(?,?,?,?,?,?,?,?)")
    .run(name, now, Number(snap.value) || 0, Number(snap.avgChg) || 0, Number(snap.inflow) || 0,
      Number(snap.up) || 0, Number(snap.down) || 0, Number(snap.n) || 0);
  return true;
}

function indexHistory(name, limit = 120) {
  const rows = db.prepare("SELECT ts,value,avg_chg,inflow,up,down,n FROM idx_snap WHERE name=? ORDER BY ts DESC LIMIT ?")
    .all(name, Math.max(1, Math.min(500, Number(limit) || 120)));
  return rows.reverse().map((r) => ({
    ts: Number(r.ts), value: Number(r.value), avgChg: Number(r.avg_chg),
    inflow: Number(r.inflow), up: Number(r.up), down: Number(r.down), n: Number(r.n),
  }));
}

module.exports = { record, list, trend, stats, prune, recordIndex, indexHistory };
