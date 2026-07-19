// 精简版：登录/注册系统已移除。此脚本只负责「雷达选择 ↔ 仪表盘」的界面切换与导航。
(() => {
  const landingGate = document.getElementById("landing-gate");
  const appShell = document.getElementById("app-shell");
  const radarSelect = document.getElementById("radar-select");
  const radarCardActive = document.querySelector('.rs-card[data-radar="global"]');
  const radarCardChina = document.querySelector('.rs-card[data-radar="china"]');
  const radarCardChain = document.querySelector('.rs-card[data-radar="chain"]');
  const brandHome = document.getElementById("brand-home");
  const radarSwitch = document.getElementById("radar-switch");
  const globalBack = document.getElementById("global-back");

  let enteredRadar = false;

  function revealShell() {
    if (!appShell) return;
    const wasHidden = appShell.hidden;
    appShell.hidden = false;
    if (wasHidden) {
      // Leaflet 在隐藏容器里初始化会得到零尺寸，显示后需要重新计算
      window.setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        if (typeof geoMap !== "undefined" && geoMap) geoMap.invalidateSize();
      }, 80);
    }
  }

  function updateGate() {
    if (landingGate) landingGate.hidden = true;
    if (enteredRadar) {
      if (radarSelect) radarSelect.hidden = true;
      revealShell();
    } else {
      if (radarSelect) radarSelect.hidden = false;
      if (appShell) appShell.hidden = true;
    }
  }

  function enterRadar() {
    enteredRadar = true;
    updateGate();
  }

  function backToRadarSelect() {
    enteredRadar = false;
    updateGate();
  }

  if (radarCardActive) radarCardActive.addEventListener("click", enterRadar);
  if (radarCardChina)
    radarCardChina.addEventListener("click", () => {
      window.location.href = "china.html";
    });
  if (radarCardChain)
    radarCardChain.addEventListener("click", () => {
      window.location.href = "chain.html";
    });
  if (radarSwitch) radarSwitch.addEventListener("click", backToRadarSelect);
  if (globalBack) globalBack.addEventListener("click", backToRadarSelect);
  if (brandHome) {
    brandHome.addEventListener("click", backToRadarSelect);
    brandHome.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        backToRadarSelect();
      }
    });
  }

  updateGate();
})();
