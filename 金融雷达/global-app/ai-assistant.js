/* ============================================================
   金融雷达助手 · 悬浮 AI 问答（全球 / 中国雷达通用）
   结合当前实时事件与行情，调用后端 /api/ask（DeepSeek）回答
   ============================================================ */
(() => {
  "use strict";
  const scope = /china\.html/i.test(location.pathname) ? "china" : "global";
  const accent = scope === "china" ? "#e5564a" : "#58d5bc";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
      #fa-toggle{position:fixed;right:22px;bottom:22px;z-index:9998;display:flex;align-items:center;gap:7px;
        padding:11px 16px;border:1px solid ${accent};border-radius:24px;background:rgba(16,21,22,.92);
        color:${accent};font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,.5);
        font-family:inherit;backdrop-filter:blur(6px)}
      #fa-toggle:hover{background:${accent};color:#06201b}
      #fa-panel{position:fixed;right:22px;bottom:78px;z-index:9999;width:370px;max-width:calc(100vw - 32px);
        height:min(560px,72vh);display:flex;flex-direction:column;border:1px solid var(--line,#293132);
        border-radius:16px;background:var(--surface,#101516);box-shadow:0 24px 60px rgba(0,0,0,.6);overflow:hidden;
        --fa-accent:${accent}}
      #fa-panel[hidden]{display:none}
      .fa-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;
        border-bottom:1px solid var(--line-soft,#202829)}
      .fa-head b{font-size:14px;color:var(--text,#edf2ef)}
      .fa-head i{font-style:normal;font-size:11px;color:var(--faint,#5f6b68);margin-left:7px}
      .fa-head button{border:0;background:transparent;color:var(--muted,#8e9b98);font-size:20px;cursor:pointer;line-height:1}
      #fa-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
      .fa-msg{max-width:86%;font-size:13px;line-height:1.6;padding:9px 12px;border-radius:12px;word-break:break-word}
      .fa-bot{align-self:flex-start;background:var(--surface-2,#151b1c);color:var(--text,#edf2ef);border:1px solid var(--line-soft,#202829)}
      .fa-user{align-self:flex-end;background:${accent};color:#06201b;font-weight:500}
      #fa-quick{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}
      .fa-q{font-size:11.5px;padding:5px 10px;border:1px solid var(--line,#293132);border-radius:14px;
        background:var(--surface-2,#151b1c);color:var(--muted,#8e9b98);cursor:pointer}
      .fa-q:hover{border-color:${accent};color:${accent}}
      #fa-form{display:flex;gap:8px;padding:11px 14px;border-top:1px solid var(--line-soft,#202829)}
      #fa-input{flex:1;min-width:0;padding:9px 12px;border:1px solid var(--line,#293132);border-radius:10px;
        background:var(--surface-2,#151b1c);color:var(--text,#edf2ef);font:inherit;font-size:13px;outline:none}
      #fa-input:focus{border-color:${accent}}
      #fa-form button{border:0;border-radius:10px;padding:0 15px;background:${accent};color:#06201b;font-weight:600;cursor:pointer;font-family:inherit}
      @media(max-width:560px){#fa-panel{right:10px;left:10px;width:auto;bottom:72px;height:70vh}}
    </style>`,
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `<button id="fa-toggle" type="button">💬 问 AI</button>
     <div id="fa-panel" hidden role="dialog" aria-label="金融雷达助手">
       <div class="fa-head"><span><b>金融雷达助手</b><i>DeepSeek · ${scope === "china" ? "中国" : "全球"}</i></span>
         <button id="fa-close" type="button" title="关闭">×</button></div>
       <div id="fa-msgs"></div>
       <div id="fa-quick"></div>
       <form id="fa-form"><input id="fa-input" type="text" autocomplete="off" placeholder="就当前事件/行情提问…" /><button type="submit">发送</button></form>
     </div>`,
  );

  const $ = (id) => document.getElementById(id);
  let busy = false;

  function addMsg(role, html) {
    $("fa-msgs").insertAdjacentHTML("beforeend", `<div class="fa-msg fa-${role}">${html}</div>`);
    $("fa-msgs").scrollTop = $("fa-msgs").scrollHeight;
  }

  async function ask(q) {
    if (busy) return;
    busy = true;
    addMsg("user", esc(q));
    const id = `fa-a-${Date.now()}`;
    addMsg("bot", `<span id="${id}">正在思考…</span>`);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, scope }) });
      const d = await r.json();
      const node = document.getElementById(id);
      if (!node) return;
      if (d.ok) node.innerHTML = esc(d.answer).replace(/\n/g, "<br>");
      else if (d.error === "NO_KEY") node.innerHTML = "AI 助手需要配置 DeepSeek Key 才能使用。请在后台「系统管理」填入 DeepSeek Key（或设置环境变量后重启）。";
      else if (d.error === "FEATURE_OFF") node.innerHTML = "AI 智能问答已在后台关闭。";
      else node.textContent = `暂时无法回答：${d.error || "未知错误"}`;
    } catch (e) {
      const node = document.getElementById(id);
      if (node) node.textContent = "网络错误，请稍后重试。";
    } finally {
      busy = false;
    }
  }

  $("fa-toggle").addEventListener("click", () => {
    const p = $("fa-panel");
    p.hidden = !p.hidden;
    if (!p.hidden) $("fa-input").focus();
  });
  $("fa-close").addEventListener("click", () => ($("fa-panel").hidden = true));
  $("fa-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("fa-input").value.trim();
    if (!q) return;
    $("fa-input").value = "";
    ask(q);
  });

  const quick = scope === "china"
    ? ["今天 A 股有什么重点？", "哪些板块有政策利好？", "人民币走势怎么看？"]
    : ["今天全球最大风险是什么？", "这些事件利好哪些板块？", "对油价有什么影响？"];
  $("fa-quick").innerHTML = quick.map((q) => `<button type="button" class="fa-q">${esc(q)}</button>`).join("");
  $("fa-quick").querySelectorAll(".fa-q").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));

  addMsg("bot", scope === "china"
    ? "你好，我是金融雷达助手。可以就中国实时财经快讯、A 股 / 人民币行情向我提问。"
    : "你好，我是金融雷达助手。可以就全球实时事件、市场行情向我提问。");
})();
