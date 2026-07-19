// 匿名访客埋点：稳定设备 ID + 心跳计时（仅统计可见且非闲置的观看时间）
(() => {
  const VID_KEY = "cq_radar_vid";
  const NICK_KEY = "cq_radar_nick";
  let vid = "";
  try {
    vid = localStorage.getItem(VID_KEY) || "";
    if (!vid) {
      vid = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5);
      localStorage.setItem(VID_KEY, vid);
    }
  } catch { return; } // localStorage 不可用（隐私模式）则不埋点

  const path = location.pathname;
  const radar = /china\.html/.test(path) ? "china" : /chain\.html/.test(path) ? "chain" : "global";
  const device = (() => {
    const ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
    return "desktop";
  })();
  const nickname = () => { try { return localStorage.getItem(NICK_KEY) || null; } catch { return null; } };
  // 访客可选设置昵称：控制台或页面调用 setRadarNick("张三")
  window.setRadarNick = (n) => { try { localStorage.setItem(NICK_KEY, String(n)); } catch {} beat(0); };

  let lastActivity = Date.now();
  ["mousemove", "keydown", "scroll", "click", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));

  function beat(seconds) {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({ vid, radar, seconds, nickname: nickname(), device }),
      });
    } catch { /* 埋点失败不影响页面 */ }
  }

  const STEP = 15; // 秒
  beat(0); // 进入即注册在线
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;      // 后台标签不计
    if (Date.now() - lastActivity > 60000) return;           // 闲置超 60s 不计
    beat(STEP);
  }, STEP * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beat(0); });
})();
