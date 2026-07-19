// 指标算法说明浮层：接管指标卡的原生 title，换成好看的自定义气泡。
// 悬停即显、点击 ⓘ 锁定（手机可用）、点外部关闭。三个雷达页面共用。
(() => {
  "use strict";

  // 需要接管说明的元素：带 title 的指标卡 + 机会信号卡
  const SELECTOR = ".overview-metric[title], .overview-opportunity[title]";

  let bubble = null;
  let pinnedHost = null; // 被点击锁定的卡片

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement("div");
    bubble.className = "tip-bubble";
    bubble.setAttribute("role", "tooltip");
    bubble.hidden = true;
    document.body.appendChild(bubble);
    return bubble;
  }

  function place(host) {
    const b = ensureBubble();
    const text = host.dataset.tip || "";
    if (!text) return;
    b.textContent = text;
    b.hidden = false;

    // 先量气泡尺寸，再定位（默认显示在卡片下方，空间不足则上方）
    const r = host.getBoundingClientRect();
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const margin = 8;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - bw - margin));

    let top = r.bottom + margin;
    let below = true;
    if (top + bh > window.innerHeight - margin && r.top - bh - margin > margin) {
      top = r.top - bh - margin;
      below = false;
    }
    b.classList.toggle("tip-below", below);
    b.classList.toggle("tip-above", !below);
    b.style.left = Math.round(left + window.scrollX) + "px";
    b.style.top = Math.round(top + window.scrollY) + "px";
  }

  function show(host) {
    place(host);
    if (bubble) bubble.classList.add("is-open");
  }

  function hide(force) {
    if (pinnedHost && !force) return; // 锁定时不因移出而隐藏
    if (bubble) {
      bubble.classList.remove("is-open");
      bubble.hidden = true;
    }
  }

  function unpin() {
    pinnedHost = null;
    hide(true);
  }

  function initHost(host) {
    if (host.dataset.tipReady) return;
    // 把原生 title 搬进 data-tip，避免系统灰框和延迟
    const t = host.getAttribute("title");
    if (t) {
      host.dataset.tip = t;
      host.removeAttribute("title");
    }
    if (!host.dataset.tip) return;
    host.dataset.tipReady = "1";

    host.addEventListener("mouseenter", () => {
      if (!pinnedHost) show(host);
    });
    host.addEventListener("mouseleave", () => {
      if (pinnedHost !== host) hide();
    });

    // 点击 ⓘ（或整卡）锁定/解锁，便于触屏和长文阅读
    host.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pinnedHost === host) {
        unpin();
      } else {
        pinnedHost = host;
        show(host);
      }
    });

    // 键盘可达
    host.setAttribute("tabindex", host.getAttribute("tabindex") || "0");
    host.addEventListener("focus", () => show(host));
    host.addEventListener("blur", () => {
      if (pinnedHost !== host) hide();
    });
    host.addEventListener("keydown", (e) => {
      if (e.key === "Escape") unpin();
    });
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(initHost);
  }

  // 点空白处、滚动、缩放时收起锁定的气泡
  document.addEventListener("click", () => unpin());
  window.addEventListener("scroll", () => hide(true), true);
  window.addEventListener("resize", () => hide(true));

  function boot() {
    scan();
    // 指标卡可能由脚本延迟渲染，观察 DOM 变化补挂
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
