(() => {
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TOKEN_KEY = "cq_admin_token";
  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let timer = null;

  const RADAR_NAME = { global: "全球雷达", china: "中国雷达", chain: "产业链雷达", other: "其他" };
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}m`);
  const fmtTime = (ms) => {
    if (!ms) return "—";
    const diff = Date.now() - ms;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    const d = new Date(ms);
    return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  async function api(path, opts) {
    const r = await fetch(path, { ...opts, headers: { "x-admin-token": token, "Content-Type": "application/json", ...(opts && opts.headers) }, cache: "no-store" });
    if (r.status === 401 || r.status === 503) throw new Error(r.status === 401 ? "口令不正确" : "服务器未设置 ADMIN_TOKEN");
    return r.json();
  }

  function showMain(show) {
    el("ad-gate").classList.toggle("ad-hidden", show);
    el("ad-main").classList.toggle("ad-hidden", !show);
  }

  async function enter() {
    const t = el("ad-token").value.trim();
    if (!t) return;
    token = t;
    try {
      await api("/api/admin/analytics"); // 验证口令
      sessionStorage.setItem(TOKEN_KEY, token);
      showMain(true);
      start();
    } catch (e) {
      el("ad-gate-err").textContent = e.message || "验证失败";
    }
  }

  function renderCards(o) {
    el("ad-cards").innerHTML = `
      <div class="ad-card live"><span>实时在线</span><strong>${o.onlineNow}</strong><small>近 90 秒有心跳</small></div>
      <div class="ad-card"><span>今日访客</span><strong>${o.todayVisitors}</strong><small>新 ${o.newToday} · 回访 ${o.returningToday}</small></div>
      <div class="ad-card"><span>今日观看</span><strong>${fmtMin(o.todayMinutes)}</strong><small>累计分钟</small></div>
      <div class="ad-card"><span>总访客</span><strong>${o.totalVisitors}</strong><small>历史设备</small></div>
      <div class="ad-card"><span>总观看</span><strong>${fmtMin(o.totalMinutes)}</strong><small>累计时长</small></div>
      <div class="ad-card"><span>人均时长</span><strong>${fmtMin(o.avgMinutes)}</strong><small>每设备平均</small></div>`;
  }

  const DEV = { desktop: { n: "桌面", c: "#58d5bc", i: "🖥" }, mobile: { n: "手机", c: "#6fb7e8", i: "📱" }, tablet: { n: "平板", c: "#e8a06f", i: "▭" }, unknown: { n: "未知", c: "#5f6b68", i: "·" } };
  function renderDevices(d) {
    const order = ["desktop", "mobile", "tablet", "unknown"];
    const total = order.reduce((s, k) => s + (d[k] || 0), 0) || 1;
    el("ad-dev-seg").innerHTML = order.filter((k) => d[k]).map((k) =>
      `<div style="flex:${d[k]};background:${DEV[k].c}" title="${DEV[k].n} ${d[k]}">${Math.round((d[k] / total) * 100)}%</div>`).join("");
    el("ad-dev-legend").innerHTML = order.filter((k) => d[k]).map((k) =>
      `<div><i style="background:${DEV[k].c}"></i>${DEV[k].n}<b>${d[k]} 人</b></div>`).join("") || `<span style="color:var(--faint);font-size:12px">暂无数据</span>`;
  }

  function renderHours(hours) {
    const max = Math.max(1, ...hours.map((h) => h.minutes));
    el("ad-hours").innerHTML = hours.map((h) =>
      `<div class="hb" title="${h.hour}:00 · ${h.minutes} 分钟"><i style="height:${Math.round((h.minutes / max) * 74)}px"></i><b>${h.hour % 6 === 0 ? h.hour : ""}</b></div>`).join("");
  }

  function renderRetention(r) {
    const rows = [
      { n: "一次性（1 天）", v: r.d1, c: "#5f6b68" },
      { n: "常来（2-6 天）", v: r.d2_6, c: "#6fb7e8" },
      { n: "忠实（7 天+）", v: r.d7plus, c: "#58d5bc" },
    ];
    el("ad-retention").innerHTML = rows.map((x) =>
      `<div><i style="background:${x.c}"></i>${x.n}<b>${x.v} 人</b></div>`).join("");
  }

  function renderTrend(trend) {
    const max = Math.max(1, ...trend.map((d) => d.minutes));
    el("ad-trend").innerHTML = trend.length
      ? trend.map((d) => `<div class="bar" title="${d.day} · ${d.visitors} 访客 · ${d.minutes} 分钟"><i style="height:${Math.round((d.minutes / max) * 130)}px"></i><b>${d.day.slice(5)}</b></div>`).join("")
      : `<span style="color:var(--faint);font-size:12px">暂无数据</span>`;
  }

  function renderRadar(radar) {
    const order = ["global", "china", "chain", "other"];
    const map = {}; radar.forEach((r) => (map[r.radar] = r));
    const max = Math.max(1, ...radar.map((r) => r.minutes));
    el("ad-radar").innerHTML = order.filter((k) => map[k]).map((k) => {
      const r = map[k];
      return `<div class="ad-radar-row"><span>${RADAR_NAME[k] || k}</span><span class="ad-radar-bar"><i style="width:${Math.round((r.minutes / max) * 100)}%"></i></span><span>${fmtMin(r.minutes)}</span></div>`;
    }).join("") || `<span style="color:var(--faint);font-size:12px">暂无数据</span>`;
  }

  function renderTable(visitors) {
    el("ad-tbody").innerHTML = visitors.map((v) => `
      <tr>
        <td><span class="ad-dot ${v.online ? "on" : ""}"></span><span class="ad-nick" data-vid="${esc(v.vid)}">${esc(v.nickname || "未命名")}</span></td>
        <td class="ad-dev-icon" title="${(DEV[v.device] || DEV.unknown).n}">${(DEV[v.device] || DEV.unknown).i}</td>
        <td class="ad-vid">${esc(v.vid.slice(0, 12))}</td>
        <td class="ad-num">${fmtMin(v.totalMinutes)}</td>
        <td class="ad-num">${fmtMin(v.todayMinutes)}</td>
        <td class="ad-num">${v.activeDays}</td>
        <td class="ad-num">${v.byRadar.global ? fmtMin(v.byRadar.global) : "—"}</td>
        <td class="ad-num">${v.byRadar.china ? fmtMin(v.byRadar.china) : "—"}</td>
        <td class="ad-num">${v.byRadar.chain ? fmtMin(v.byRadar.chain) : "—"}</td>
        <td class="ad-radartag">${fmtTime(v.lastSeen)}</td>
      </tr>`).join("") || `<tr><td colspan="10" style="color:var(--faint);padding:20px">暂无访客数据</td></tr>`;
  }

  async function load() {
    try {
      const d = await api("/api/admin/analytics");
      renderCards(d.overview);
      renderTrend(d.trend);
      renderRadar(d.radar);
      renderDevices(d.devices || {});
      renderHours(d.hours || []);
      renderRetention(d.retention || { d1: 0, d2_6: 0, d7plus: 0 });
      renderTable(d.visitors);
      el("ad-updated").textContent = "更新于 " + new Date().toLocaleTimeString("zh-CN");
    } catch (e) {
      if ((e.message || "").includes("口令")) { logout(); }
    }
  }

  // ───────── 系统管理视图 ─────────
  let view = "analytics";
  const FEAT = { brief: "AI 简报", chat: "AI 智能问答", analyze: "新闻→板块分析", insight: "博研观点（重庆）", startups: "硬科技融资提炼" };
  let cfgFeatures = {};

  function switchView(v) {
    view = v;
    document.querySelectorAll(".ad-nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    el("ad-view-analytics").classList.toggle("ad-hidden", v !== "analytics");
    el("ad-view-system").classList.toggle("ad-hidden", v !== "system");
    if (v === "system") loadSystem();
  }

  function renderConfig(c) {
    cfgFeatures = { ...c.features };
    const srcName = { config: "后台配置", env: "环境变量", none: "未配置" }[c.keySource] || c.keySource;
    el("cfg-keystate").innerHTML = c.keyConfigured
      ? `当前 Key：<b>${esc(c.keyMasked)}</b> · 来源：${srcName}`
      : `<span style="color:var(--red)">尚未配置 API Key，AI 功能回退模板</span>`;
    if (c.configFile) el("cfg-file").textContent = c.configFile;
    el("cfg-model").value = c.deepseekModel || "deepseek-chat";
    el("cfg-features").innerHTML = Object.keys(FEAT).map((k) =>
      `<div class="ad-feat"><span>${FEAT[k]}</span><div class="ad-switch ${cfgFeatures[k] !== false ? "on" : ""}" data-feat="${k}"><i></i></div></div>`).join("");
  }

  function renderUsage(u) {
    el("ai-usage").innerHTML = `
      <div><span>总调用</span><strong>${u.total}</strong></div>
      <div><span>成功</span><strong style="color:var(--teal)">${u.ok}</strong></div>
      <div><span>失败</span><strong style="color:var(--red)">${u.fail}</strong></div>`;
    el("log-tbody").innerHTML = (u.recent || []).map((r) => `
      <tr>
        <td class="ad-radartag">${fmtTime(new Date(r.at).getTime())}</td>
        <td>${esc(r.label || r.feature)}</td>
        <td><span class="ad-badge ${r.ok ? "ok" : "err"}">${r.ok ? "成功" : "失败"}</span></td>
        <td class="ad-num">${r.ms} ms</td>
        <td style="color:var(--red);font-size:11px">${esc(r.err || "")}</td>
      </tr>`).join("") || `<tr><td colspan="5" style="color:var(--faint);padding:16px">暂无调用记录</td></tr>`;
  }

  function renderSources(list) {
    el("src-tbody").innerHTML = (list || []).map((s) => `
      <tr>
        <td>${esc(s.label)}</td>
        <td><span class="ad-badge ${s.status === "ok" ? "ok" : "err"}">${s.status === "ok" ? "正常" : "异常"}</span></td>
        <td class="ad-num">${s.okRate == null ? "—" : s.okRate + "%"}</td>
        <td class="ad-num">${s.okCount}/${s.errCount}</td>
        <td class="ad-radartag">${s.cacheAgeMs == null ? "—" : Math.round(s.cacheAgeMs / 1000) + "s"}</td>
        <td class="ad-num">${s.lastMs || 0} ms</td>
        <td class="ad-radartag">${s.lastOkAt ? fmtTime(new Date(s.lastOkAt).getTime()) : "—"}</td>
        <td style="color:var(--red);font-size:11px;max-width:200px;white-space:normal">${esc(s.lastErr || "")}</td>
      </tr>`).join("") || `<tr><td colspan="8" style="color:var(--faint);padding:16px">暂无数据源记录（先在前台触发一次抓取）</td></tr>`;
  }

  function renderCache(list) {
    el("cache-tbody").innerHTML = (list || []).map((c) => `
      <tr>
        <td>${esc(c.label)}</td>
        <td class="ad-radartag">${Math.round(c.ageMs / 1000)}s</td>
        <td>${c.error ? `<span class="ad-badge err">陈旧</span>` : `<span class="ad-badge ok">新鲜</span>`}</td>
        <td><button class="ad-mini" data-cache-key="${esc(c.key)}">强制刷新</button></td>
      </tr>`).join("") || `<tr><td colspan="4" style="color:var(--faint);padding:16px">暂无缓存</td></tr>`;
  }

  function archParams() {
    const p = new URLSearchParams({ limit: "60" });
    const q = el("arch-q").value.trim(); if (q) p.set("q", q);
    const day = el("arch-day").value; if (day) p.set("day", day);
    const kind = el("arch-kind").value; if (kind) p.set("kind", kind);
    return p.toString();
  }
  function renderArchive(d) {
    const s = d.stats || {};
    const range = s.oldest ? `${fmtTime(s.oldest)} 起` : "—";
    el("arch-stat").innerHTML = `累计存档 <b>${s.total || 0}</b> 条 · 今日新增 <b>${s.today || 0}</b> · 最早 ${range} · 当前筛选 <b>${d.result.total}</b> 条`;
    el("arch-tbody").innerHTML = (d.result.items || []).map((n) => `
      <tr>
        <td style="max-width:420px;white-space:normal">${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noreferrer">${esc(n.title)}</a>` : esc(n.title)}</td>
        <td class="ad-radartag">${esc(n.source || "")}</td>
        <td><span class="arch-kind ${n.kind}">${n.kind === "search" ? esc(n.keyword || "搜索") : "快讯"}</span></td>
        <td class="ad-radartag">${fmtTime(n.first_seen)}</td>
      </tr>`).join("") || `<tr><td colspan="4" style="color:var(--faint);padding:16px">无匹配记录</td></tr>`;
  }
  async function loadArchive() {
    try { renderArchive(await api("/api/admin/archive?" + archParams())); } catch (e) { if ((e.message || "").includes("口令")) logout(); }
  }
  async function loadArchiveTrend() {
    const q = el("arch-q").value.trim();
    const box = el("arch-trend");
    if (!q) { box.classList.add("ad-hidden"); return; }
    try {
      const d = await api("/api/admin/archive/trend?days=14&q=" + encodeURIComponent(q));
      const t = d.trend || [];
      const max = Math.max(1, ...t.map((x) => x.count));
      box.innerHTML = t.map((x) => `<div class="b" title="${x.day} · ${x.count} 次"><span>${x.count || ""}</span><i style="height:${Math.round((x.count / max) * 56)}px"></i><b>${x.day.slice(5)}</b></div>`).join("");
      box.classList.remove("ad-hidden");
    } catch (e) { /* ignore */ }
  }

  async function loadSystem() {
    try {
      const [cfg, usage, sources, cache, arch] = await Promise.all([
        api("/api/admin/config"),
        api("/api/admin/ai-usage"),
        api("/api/admin/sources"),
        api("/api/admin/cache"),
        api("/api/admin/archive?" + archParams()),
      ]);
      renderConfig(cfg);
      renderUsage(usage);
      renderSources(sources.sources);
      renderCache(cache.entries);
      renderArchive(arch);
    } catch (e) {
      if ((e.message || "").includes("口令")) logout();
    }
  }

  async function saveConfig() {
    const payload = { deepseekModel: el("cfg-model").value, features: cfgFeatures };
    const k = el("cfg-key").value.trim();
    if (k) payload.deepseekKey = k;
    const box = el("cfg-result"); box.className = "ad-result"; box.textContent = "保存中…";
    try {
      const c = await api("/api/admin/config", { method: "POST", body: JSON.stringify(payload) });
      el("cfg-key").value = "";
      renderConfig(c);
      box.className = "ad-result ok"; box.textContent = "✓ 已保存并生效";
    } catch (e) { box.className = "ad-result err"; box.textContent = "保存失败：" + e.message; }
  }

  async function testConfig() {
    const box = el("cfg-result"); box.className = "ad-result"; box.textContent = "测试中…（先保存后再测）";
    try {
      const r = await api("/api/admin/ai-test", { method: "POST", body: "{}" });
      if (r.ok) { box.className = "ad-result ok"; box.textContent = `✓ 连通正常 · ${r.model} · ${r.ms}ms · 回复「${r.reply}」`; }
      else { box.className = "ad-result err"; box.textContent = "✗ 测试失败：" + (r.error || "未知") + (r.ms ? ` (${r.ms}ms)` : ""); }
    } catch (e) { box.className = "ad-result err"; box.textContent = "✗ 请求失败：" + e.message; }
    loadSystem();
  }

  async function clearKey() {
    if (!window.confirm("确定清除已保存的 API Key？清除后将回退到环境变量或模板。")) return;
    try { const c = await api("/api/admin/config", { method: "POST", body: JSON.stringify({ deepseekKey: null }) }); renderConfig(c); el("cfg-result").className = "ad-result ok"; el("cfg-result").textContent = "✓ 已清除"; } catch (e) {}
  }

  function start() { load(); if (timer) clearInterval(timer); timer = window.setInterval(() => (view === "system" ? loadSystem() : load()), 30000); }
  function logout() { sessionStorage.removeItem(TOKEN_KEY); token = ""; if (timer) clearInterval(timer); showMain(false); el("ad-gate-err").textContent = "登录已失效，请重新输入口令"; }

  // 点昵称命名
  el("ad-tbody").addEventListener("click", async (e) => {
    const t = e.target.closest(".ad-nick");
    if (!t) return;
    const cur = t.textContent === "未命名" ? "" : t.textContent;
    const name = window.prompt("为该设备命名（方便认人）：", cur);
    if (name == null) return;
    try { await api("/api/admin/label", { method: "POST", body: JSON.stringify({ vid: t.dataset.vid, nickname: name }) }); load(); } catch {}
  });

  el("ad-enter").addEventListener("click", enter);
  el("ad-token").addEventListener("keydown", (e) => { if (e.key === "Enter") enter(); });
  el("ad-refresh").addEventListener("click", () => (view === "system" ? loadSystem() : load()));
  el("ad-logout").addEventListener("click", logout);

  // 系统管理：视图切换
  el("ad-nav").addEventListener("click", (e) => { const b = e.target.closest(".ad-nav-btn"); if (b) switchView(b.dataset.view); });
  // 功能开关（点击切换本地态，保存时提交）
  el("cfg-features").addEventListener("click", (e) => {
    const sw = e.target.closest(".ad-switch"); if (!sw) return;
    const k = sw.dataset.feat; cfgFeatures[k] = cfgFeatures[k] === false; sw.classList.toggle("on", cfgFeatures[k] !== false);
  });
  el("cfg-save").addEventListener("click", saveConfig);
  el("cfg-test").addEventListener("click", testConfig);
  el("cfg-clear").addEventListener("click", clearKey);
  // 缓存操作
  el("cache-refresh").addEventListener("click", loadSystem);
  el("cache-clear-all").addEventListener("click", async () => {
    if (!window.confirm("确定清空全部服务器缓存？下次请求会重新抓取。")) return;
    try { await api("/api/admin/cache/clear", { method: "POST", body: "{}" }); loadSystem(); } catch (e) {}
  });
  el("cache-tbody").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cache-key]"); if (!b) return;
    try { await api("/api/admin/cache/clear", { method: "POST", body: JSON.stringify({ key: b.dataset.cacheKey }) }); loadSystem(); } catch (e) {}
  });
  // 新闻存档
  el("arch-search").addEventListener("click", loadArchive);
  el("arch-q").addEventListener("keydown", (e) => { if (e.key === "Enter") loadArchive(); });
  el("arch-day").addEventListener("change", loadArchive);
  el("arch-kind").addEventListener("change", loadArchive);
  el("arch-trend-btn").addEventListener("click", loadArchiveTrend);
  el("arch-prune").addEventListener("click", async () => {
    if (!window.confirm("确定删除 180 天前的存档记录？")) return;
    try { const r = await api("/api/admin/archive/prune", { method: "POST", body: JSON.stringify({ days: 180 }) }); alert(`已裁剪 ${r.removed} 条`); loadArchive(); } catch (e) {}
  });

  if (token) { showMain(true); start(); } else { showMain(false); el("ad-token").focus(); }
})();
