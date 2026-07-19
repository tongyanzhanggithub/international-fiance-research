/* ============================================================
   中国金融雷达 China Finance Radar
   以中国省级地图为主 · 内置演示数据 · 刷新做小幅扰动模拟实时
   省界数据：DataV.GeoAtlas
   ============================================================ */
(() => {
  "use strict";
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- 境内金融行情（cat: index/fx/rate/flow/commodity/money）----
  const markets = [
    { sym: "SHCOMP", name: "上证综指",     cat: "index",     base: 3086.42, dec: 2, chg: 0.34,  risk: "中性" },
    { sym: "SZCOMP", name: "深证成指",     cat: "index",     base: 9642.18, dec: 2, chg: 0.52,  risk: "中性" },
    { sym: "CHINEXT",name: "创业板指",     cat: "index",     base: 1928.44, dec: 2, chg: 0.86,  risk: "关注" },
    { sym: "STAR50", name: "科创50",       cat: "index",     base: 962.30,  dec: 2, chg: 1.12,  risk: "关注" },
    { sym: "CSI300", name: "沪深300",      cat: "index",     base: 3612.75, dec: 2, chg: 0.28,  risk: "中性" },
    { sym: "CSI500", name: "中证500",      cat: "index",     base: 5480.60, dec: 2, chg: -0.14, risk: "中性" },
    { sym: "HSI",    name: "恒生指数",     cat: "index",     base: 19476.3, dec: 2, chg: 0.78,  risk: "中性" },
    { sym: "HSTECH", name: "恒生科技",     cat: "index",     base: 4062.90, dec: 2, chg: 1.34,  risk: "偏高" },
    { sym: "USDCNY", name: "美元/人民币在岸", cat: "fx",     base: 7.2648,  dec: 4, chg: 0.18,  risk: "偏高" },
    { sym: "USDCNH", name: "美元/人民币离岸", cat: "fx",     base: 7.2810,  dec: 4, chg: 0.22,  risk: "偏高" },
    { sym: "CN10Y",  name: "10年期国债收益率", cat: "rate",  base: 2.238,   dec: 3, chg: -1.2,  risk: "关注", suffix: "%" },
    { sym: "CN2Y",   name: "2年期国债收益率",  cat: "rate",  base: 1.642,   dec: 3, chg: -0.8,  risk: "中性", suffix: "%" },
    { sym: "SHIBOR", name: "隔夜 Shibor",   cat: "money",     base: 1.842,   dec: 3, chg: 0.5,   risk: "中性", suffix: "%" },
    { sym: "LPR1Y",  name: "1年期 LPR",     cat: "money",     base: 3.10,    dec: 2, chg: 0.0,   risk: "中性", suffix: "%" },
    { sym: "NORTH",  name: "北向资金净流入", cat: "flow",     base: 38.6,    dec: 1, chg: 12.4,  risk: "关注", suffix: "亿", signed: true },
    { sym: "RB",     name: "螺纹钢主力",     cat: "commodity", base: 3268,   dec: 0, chg: -0.62, risk: "关注", prefix: "¥" },
    { sym: "IO",     name: "铁矿石主力",     cat: "commodity", base: 812.5,  dec: 1, chg: -0.94, risk: "偏高", prefix: "¥" },
    { sym: "AU",     name: "沪金主力",       cat: "commodity", base: 552.8,  dec: 2, chg: 0.68,  risk: "避险", prefix: "¥" },
    { sym: "CU",     name: "沪铜主力",       cat: "commodity", base: 78460,  dec: 0, chg: 1.04,  risk: "偏高", prefix: "¥" },
  ];

  let tick = 0;
  function seededDrift(key) {
    let h = tick * 2654435761;
    for (let i = 0; i < key.length; i++) h = (h ^ key.charCodeAt(i)) * 16777619;
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  }
  function computeQuote(m) {
    const drift = seededDrift(m.sym);
    const chg = +(m.chg + drift * 0.6).toFixed(m.signed ? 1 : 2);
    const val = m.signed ? m.base + drift * 24 : m.base * (1 + (chg / 100) * 0.15);
    const points = Array.from({ length: 8 }, (_, i) => 8 + (16 - (chg > 0 ? i * 1.6 : (7 - i) * 1.6)) + seededDrift(m.sym + i) * 6);
    return { ...m, chg, val, points };
  }
  function fmt(m, val) {
    if (m.signed) { const n = val.toLocaleString("en-US", { minimumFractionDigits: m.dec, maximumFractionDigits: m.dec }); return `${val >= 0 ? "+" : ""}${n}${m.suffix || ""}`; }
    const num = val.toLocaleString("en-US", { minimumFractionDigits: m.dec, maximumFractionDigits: m.dec });
    return `${m.prefix || ""}${num}${m.suffix || ""}`;
  }
  function sparkline(points, positive) {
    const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
    const coords = points.map((p, i) => `${(i / (points.length - 1)) * 58},${26 - ((p - min) / span) * 22 - 2}`).join(" ");
    return `<svg class="fr-spark ${positive ? "up" : "down"}" viewBox="0 0 58 26" aria-hidden="true"><polyline points="${coords}" /></svg>`;
  }
  const catLabel = { index: "指数", fx: "汇率", rate: "债市", money: "货币", flow: "资金", commodity: "商品" };

  function renderMarkets(quotes) {
    el("fr-count").textContent = `${quotes.length} 项资产`;
    el("fr-markets").innerHTML = quotes.map((q) => {
      const up = q.chg >= 0;
      const chgTxt = q.cat === "flow" ? `${up ? "净流入" : "净流出"} ${Math.abs(q.chg).toFixed(1)}亿` : `${up ? "▲ +" : "▼ "}${q.chg.toFixed(2)}%`;
      return `<article class="fr-mcard">
        <div class="fr-mcard-top">
          <div><span class="fr-sym">${esc(q.sym)}</span><h3 class="fr-mname">${esc(q.name)}</h3></div>
          <span class="fr-tag">${catLabel[q.cat]}</span>
        </div>
        <div class="fr-mval">${fmt(q, q.val)}</div>
        <div class="fr-mrow">
          <span class="fr-chg ${up ? "up" : "down"}">${chgTxt}</span>
          ${sparkline(q.points, up)}
        </div>
      </article>`;
    }).join("");
  }

  // ---- 省域金融体量（示意：A股上市公司数量 → choropleth 热度）----
  const REGIONS = [
    { name: "广东", heat: 96, listed: 872, note: "上市公司全国第一 · 深交所主场" },
    { name: "浙江", heat: 90, listed: 704, note: "民营金融活跃 · 跨境电商与制造资本" },
    { name: "江苏", heat: 88, listed: 698, note: "制造业上市集群 · 产业资本密集" },
    { name: "北京", heat: 94, listed: 480, note: "央企总部 · 一行两会与货币政策中枢" },
    { name: "上海", heat: 100, listed: 440, note: "上交所 · 外汇/黄金/期货国家级市场" },
    { name: "山东", heat: 74, listed: 320, note: "能源与化工资本 · 区域城商行" },
    { name: "四川", heat: 66, listed: 176, note: "成渝双城金融圈 · 西部融资中心" },
    { name: "福建", heat: 63, listed: 172, note: "民营与两岸资本 · 消费制造上市" },
    { name: "安徽", heat: 60, listed: 168, note: "新能源与半导体产业资本" },
    { name: "湖北", heat: 58, listed: 148, note: "中部金融枢纽 · 光电子资本" },
    { name: "湖南", heat: 55, listed: 138, note: "工程机械与消费上市集群" },
    { name: "重庆", heat: 62, listed: 92, note: "西部金融中心 · 汽车电子资本" },
  ];
  const heatByName = Object.fromEntries(REGIONS.map((r) => [r.name, r]));

  // ---- 区域金融中心 markers（按省质心）----
  const HUBS = [
    { province: "上海", type: "core", title: "上海国际金融中心", note: "上交所 · 外汇/黄金/期货" },
    { province: "北京", type: "core", title: "北京金融决策中枢", note: "货币政策 · 央企总部" },
    { province: "广东", type: "core", title: "深圳证券市场", note: "深交所 · 创业板/科技资本" },
    { province: "浙江", type: "hub",  title: "杭州财富管理", note: "民营金融 · 数字支付" },
    { province: "四川", type: "hub",  title: "成渝金融圈", note: "西部融资中心" },
    { province: "湖北", type: "node", title: "武汉中部枢纽", note: "光电子产业资本" },
    { province: "陕西", type: "node", title: "西安西北节点", note: "能源与军工资本" },
  ];
  const hubColor = { core: "#e5564a", hub: "#f3b44b", node: "#58d5bc" };

  // ---- 顶部风险瓦片 ----
  function renderTiles(qm, quotes) {
    const idx = quotes.filter((q) => q.cat === "index");
    const upIdx = idx.filter((q) => q.chg >= 0).length;
    const mood = Math.round(50 + (upIdx / idx.length - 0.5) * 60);
    const cny = qm["USDCNY"], north = qm["NORTH"], cn10 = qm["CN10Y"];
    const tiles = [
      { label: "A股市场情绪", value: mood, note: `${upIdx}/${idx.length} 项指数上涨`, color: mood >= 55 ? "var(--up)" : mood >= 45 ? "var(--amber)" : "var(--down)" },
      { label: "人民币汇率压力", value: cny ? cny.val.toFixed(4) : "—", note: `在岸 ${cny && cny.chg >= 0 ? "贬值 +" : "升值 "}${cny ? cny.chg.toFixed(2) : "0"}%`, color: cny && cny.chg > 0 ? "var(--amber)" : "var(--teal)" },
      { label: "北向资金", value: north ? `${north.val >= 0 ? "+" : ""}${north.val.toFixed(1)}亿` : "—", note: north && north.val >= 0 ? "外资净流入 · 情绪偏暖" : "外资净流出 · 情绪谨慎", color: north && north.val >= 0 ? "var(--up)" : "var(--down)" },
      { label: "境内债市", value: cn10 ? cn10.val.toFixed(3) + "%" : "—", note: `10年国债 ${cn10 && cn10.chg >= 0 ? "上行" : "下行"} · ${cn10 && cn10.chg < 0 ? "债强股弱" : "风险偏好回升"}`, color: "var(--blue)" },
    ];
    el("fr-tiles").innerHTML = tiles.map((t) => `<div class="fr-tile" style="--tile-color:${t.color}">
      <div class="fr-tile-label">${esc(t.label)}</div>
      <div class="fr-tile-value">${esc(String(t.value))}</div>
      <div class="fr-tile-note">${esc(t.note)}</div></div>`).join("");
  }

  function renderBreadth() {
    const rows = [...REGIONS].sort((a, b) => b.listed - a.listed).slice(0, 8);
    const max = Math.max(...rows.map((r) => r.listed)) || 1;
    el("fr-breadth").innerHTML = rows.map((r) => `<div class="fr-bar-row">
      <span class="fr-bar-label">${esc(r.name)}</span>
      <span class="fr-bar-track"><i style="width:${Math.round((r.listed / max) * 100)}%"></i></span>
      <span class="fr-bar-val">${r.listed} 家</span></div>`).join("");
  }

  function renderSignals(qm) {
    const sig = [];
    const cny = qm["USDCNY"], north = qm["NORTH"], cn10 = qm["CN10Y"], star = qm["STAR50"], hstech = qm["HSTECH"], cu = qm["CU"];
    if (star) sig.push({ c: "var(--accent)", t: `科创/成长 科创50 ${star.chg >= 0 ? "+" : ""}${star.chg.toFixed(2)}%`, p: star.chg >= 0 ? "成长风格活跃，科技与半导体资金偏暖。" : "成长回调，资金转向低估值蓝筹。" });
    if (cny) sig.push({ c: cny.chg > 0 ? "var(--amber)" : "var(--teal)", t: `人民币 ${cny.val.toFixed(4)}`, p: cny.chg > 0 ? "人民币承压，关注跨境资本流动与出口企业结汇。" : "人民币走强，利好外资与进口成本。" });
    if (north) sig.push({ c: north.val >= 0 ? "var(--up)" : "var(--down)", t: `北向资金 ${north.val >= 0 ? "净流入" : "净流出"} ${Math.abs(north.val).toFixed(1)}亿`, p: north.val >= 0 ? "外资加仓核心资产，市场风险偏好回升。" : "外资减持，短期情绪偏谨慎。" });
    if (cn10) sig.push({ c: "var(--blue)", t: `10年国债 ${cn10.val.toFixed(3)}%`, p: cn10.chg < 0 ? "收益率下行、债市走强，反映避险与宽松预期。" : "收益率上行，权益风险偏好改善。" });
    if (hstech) sig.push({ c: "var(--teal)", t: `港股科技 恒生科技 ${hstech.chg >= 0 ? "+" : ""}${hstech.chg.toFixed(2)}%`, p: hstech.chg >= 0 ? "中概与港股科技回暖，离岸情绪改善。" : "港股科技承压，关注离岸流动性。" });
    if (cu) sig.push({ c: "var(--amber)", t: `工业金属 沪铜 ${cu.chg >= 0 ? "+" : ""}${cu.chg.toFixed(2)}%`, p: cu.chg >= 0 ? "有色走强，反映顺周期与制造需求预期。" : "工业金属回落，需求预期转弱。" });
    el("fr-signal-list").innerHTML = sig.map((s) => `<div class="fr-signal"><i style="--sig:${s.c}"></i>
      <div><strong>${esc(s.t)}</strong><p>${esc(s.p)}</p></div></div>`).join("");
  }

  // ---- 地图（Leaflet + DataV GeoJSON）----
  const GEO_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";
  let cnMap = null, cnGeoLayer = null, cnSelected = null, geoCache = null;

  const shortName = (full) => full.replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/, "");
  function heatColor(h) {
    if (h == null) return "#2a3233";
    if (h >= 90) return "#e5564a";
    if (h >= 80) return "#ef7a5f";
    if (h >= 70) return "#f3934b";
    if (h >= 55) return "#f3b44b";
    return "#6b5a3a";
  }
  const heatFor = (full) => (heatByName[shortName(full)] ? heatByName[shortName(full)].heat : null);
  function geoStyle(feature) {
    const h = heatFor(feature.properties.name);
    return { color: "#0b0e0f", weight: 1, fillColor: heatColor(h), fillOpacity: h == null ? 0.30 : 0.82 };
  }
  function showFocus(name) {
    const r = heatByName[shortName(name)];
    const focus = el("fr-focus");
    focus.hidden = false;
    if (!r) { focus.innerHTML = `<h3><span>${esc(shortName(name))}</span></h3><p>暂无重点金融数据。</p>`; return; }
    focus.innerHTML = `<h3><span>${esc(r.name)}</span> · 金融体量指数 ${r.heat}</h3>
      <p>${esc(r.note)}。</p>
      <div class="fr-focus-stats"><span>A股上市公司 <b style="color:var(--accent)">${r.listed} 家</b></span>
      <span>金融热度 <b style="color:${heatColor(r.heat)}">${r.heat}</b></span></div>`;
  }
  function selectProvince(layer, full) {
    if (cnSelected && cnSelected !== layer && cnGeoLayer) cnGeoLayer.resetStyle(cnSelected);
    cnSelected = layer;
    layer.setStyle({ weight: 2.5, color: "#fff" });
    layer.bringToFront();
    showFocus(full);
  }
  function onEachProvince(feature, layer) {
    layer.on({
      mouseover: () => { layer.setStyle({ weight: 2, color: "#fff" }); layer.bringToFront(); showFocus(feature.properties.name); },
      mouseout: () => { if (layer !== cnSelected && cnGeoLayer) cnGeoLayer.resetStyle(layer); },
      click: () => selectProvince(layer, feature.properties.name),
    });
  }
  function selectByName(sn) {
    if (!cnGeoLayer) return;
    cnGeoLayer.eachLayer((layer) => {
      if (shortName(layer.feature.properties.name) === sn) {
        selectProvince(layer, layer.feature.properties.name);
        const c = layer.feature.properties.centroid || layer.feature.properties.center;
        if (c && cnMap) cnMap.panTo([c[1], c[0]], { animate: true });
      }
    });
  }
  function addLabelsAndMarkers(geo) {
    cnGeoLayer.eachLayer((layer) => {
      const sn = shortName(layer.feature.properties.name);
      const isKey = Boolean(heatByName[sn]);
      layer.bindTooltip(sn, { permanent: true, direction: "center", className: "fr-prov-label" + (isKey ? " fr-prov-label--key" : "") });
    });
    HUBS.forEach((h) => {
      const feat = geo.features.find((f) => shortName(f.properties.name) === h.province);
      const c = feat && (feat.properties.centroid || feat.properties.center);
      if (!c) return;
      const icon = L.divIcon({ className: "fr-hub-marker", html: `<i style="--c:${hubColor[h.type]}"></i>`, iconSize: [12, 12] });
      const marker = L.marker([c[1], c[0]], { icon }).addTo(cnMap);
      marker.bindTooltip(`<b>${esc(h.title)}</b><span>${esc(h.province)} · ${esc(h.note)}</span>`, { className: "fr-hub-tip", direction: "top", offset: [0, -6] });
      marker.on("click", () => selectByName(h.province));
    });
  }
  function heatFallback() {
    const stage = document.querySelector(".fr-map-stage");
    if (!stage) return;
    const max = Math.max(...REGIONS.map((r) => r.heat));
    stage.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px">${REGIONS
      .map((r) => `<button style="border:1px solid var(--line-soft);border-radius:10px;padding:12px;background:rgba(229,86,74,${(0.15 + (r.heat / max) * 0.6).toFixed(2)});color:var(--text);text-align:left;cursor:pointer" onclick="this.blur()"><strong style="display:block;font-size:13px">${esc(r.name)}</strong><span style="font-size:11px;color:var(--muted)">金融热度 ${r.heat} · ${r.listed}家</span></button>`)
      .join("")}</div>`;
  }
  function mountMap() {
    const mapEl = el("cn-map");
    if (!mapEl || typeof L === "undefined") return heatFallback();
    cnMap = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: 2, maxZoom: 7 });
    cnMap.attributionControl.setPrefix("");
    const draw = (geo) => {
      if (!cnMap) return;
      cnGeoLayer = L.geoJSON(geo, { style: geoStyle, onEachFeature: onEachProvince }).addTo(cnMap);
      cnMap.fitBounds(cnGeoLayer.getBounds(), { padding: [12, 12] });
      cnMap.attributionControl.addAttribution("省界 © DataV.GeoAtlas");
      addLabelsAndMarkers(geo);
      cnGeoLayer.eachLayer((layer) => { if (shortName(layer.feature.properties.name) === "上海") selectProvince(layer, layer.feature.properties.name); });
      window.setTimeout(() => cnMap && cnMap.invalidateSize(), 80);
    };
    if (geoCache) { draw(geoCache); return; }
    fetch(GEO_URL).then((r) => r.json()).then((geo) => { geoCache = geo; draw(geo); }).catch(() => { if (cnMap) { cnMap.remove(); cnMap = null; } heatFallback(); });
  }

  function toast(msg) { const t = el("fr-toast"); t.textContent = msg; t.classList.add("show"); window.setTimeout(() => t.classList.remove("show"), 2200); }
  function stamp() {
    el("fr-updated").textContent = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
    el("fr-mode").textContent = "演示行情";
  }

  function refresh(manual) {
    tick += 1;
    const quotes = markets.map(computeQuote);
    const qm = Object.fromEntries(quotes.map((q) => [q.sym, q]));
    renderTiles(qm, quotes);
    renderMarkets(quotes);
    renderSignals(qm);
    stamp();
    if (manual) toast("行情已刷新（演示数据）");
  }

  el("fr-refresh").addEventListener("click", (e) => {
    const btn = e.currentTarget; btn.classList.add("spin");
    window.setTimeout(() => btn.classList.remove("spin"), 800);
    refresh(true);
  });

  renderBreadth();
  mountMap();
  refresh(false);
  window.setInterval(() => refresh(false), 30000);
})();
