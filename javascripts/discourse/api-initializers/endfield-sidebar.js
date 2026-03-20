import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.8", (api) => {

  // ==========================================
  // 🧩 模块 1：强化版站点统计渲染器
  // ==========================================
  const getStatsContainer = () => {
    // 1. 尝试精确定位
    let el = document.getElementById('about-stats-content') || document.querySelector('.rs-custom-html .sidebar-stats-block');
    if (el) return el;
    
    // 2. 模糊定位 (对抗 Discourse DOM 结构更新)：寻找包含特定文字的通用自定义模块
    const customBlocks = document.querySelectorAll('.rs-custom-html');
    for (let block of customBlocks) {
      if (block.textContent.includes('站点统计') || block.textContent.includes('正在同步数据')) {
        return block;
      }
    }
    return null;
  };

  const fetchAndRenderStats = async (container) => {
    if (!container || container.dataset.statsLoaded === "true" || container.dataset.statsLoaded === "loading") {
      return;
    }

    container.dataset.statsLoaded = "loading"; // 上锁防并发

    try {
      const response = await fetch("/about.json");
      if (!response.ok) throw new Error(`[Tactics] HTTP Error: ${response.status}`);
      const data = await response.json();

      const s = data?.about?.stats;
      const canSee = data?.about?.can_see_about_stats;

      if (!s || canSee === false) {
        throw new Error("[Tactics] No permission or missing stats data.");
      }

      const statsMap = [
        { label: "TOPICS", value: Number(s.topics_count) || 0 },
        { label: "POSTS", value: Number(s.posts_count) || 0 },
        { label: "USERS", value: Number(s.users_count) || 0 },
        { label: "LIKES", value: Number(s.likes_count) || 0 },
        { label: "DAU 7D", value: Number(s.active_users_7_days) || 0 },
        { label: "MAU 30D", value: Number(s.active_users_30_days) || 0 }
      ];

      let html = '<div class="sidebar-stats-grid">';
      statsMap.forEach(item => {
        html += `<div class="sidebar-stat-item"><span class="s-label">${item.label}</span><span class="s-value">${item.value.toLocaleString()}</span></div>`;
      });
      html += '</div>';
      
      // 统一注入标准结构，完美适配你的 CSS
      if(container.id === 'about-stats-content') {
           container.innerHTML = html;
      } else {
           container.innerHTML = `<h3>站点统计</h3><div id="about-stats-content">${html}</div>`;
      }
      
      container.dataset.statsLoaded = "true"; // 成功解锁

    } catch (err) {
      console.warn(err.message);
      container.innerHTML = `<h3>站点统计</h3><div id="about-stats-content" style="padding:10px;text-align:center;color:var(--primary-medium);font-size:12px;">[ DATA OFFLINE ]</div>`;
      container.dataset.statsLoaded = "error"; 
    }
  };

  // ==========================================
  // 🧩 模块 2：标签词云矩阵初始化 (完整恢复)
  // ==========================================
  const initTagMatrix = () => {
    const container = document.querySelector('.popular-tags__container');
    if (!container || container.dataset.initMatrix === "true") return;

    let tags = Array.from(container.querySelectorAll('.popular-tags__tag'));
    if (tags.length === 0) return;

    container.dataset.initMatrix = "true";
    const viewAllBtn = container.parentElement.querySelector('.popular-tags__view-all');

    const grid = document.createElement('div');
    grid.className = 'popular-tags__grid';
    
    tags.forEach((tag, index) => {
      const isHot = index < 5;
      tag.dataset.hot = isHot;
      
      const iconSpan = tag.querySelector('.tag-icon'); 
      const svgIcon = tag.querySelector('svg.d-icon');
      
      let pureText = "";
      tag.childNodes.forEach(node => {
        if (node.nodeType === 3) pureText += node.textContent;
      });
      pureText = pureText.trim();
      
      const isLongTag = pureText.length > 8;
      
      const textWrapper = document.createElement('span');
      textWrapper.className = 'popular-tags__tag-text';
      textWrapper.textContent = pureText;
      textWrapper.dataset.text = pureText;
      
      tag.innerHTML = '';
      if (iconSpan) tag.appendChild(iconSpan);
      else if (svgIcon) tag.appendChild(svgIcon);
      tag.appendChild(textWrapper);
      
      if (isLongTag) tag.classList.add('long-tag');
      
      const count = tag.querySelector('.badge-category');
      if (count) {
        const badge = document.createElement('span');
        badge.className = 'popular-tags__tag-count';
        badge.textContent = count.textContent.trim();
        tag.appendChild(badge);
        count.style.display = 'none'; 
      }
      grid.appendChild(tag);
    });
    
    container.innerHTML = '';
    container.appendChild(grid);
    
    // 注入扫描线
    const scanLine = document.createElement('div');
    scanLine.style.cssText = `position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--tertiary-low), transparent); animation: scan 4s linear infinite; pointer-events: none; z-index: 1;`;
    grid.parentElement.appendChild(scanLine);
    
    if(!document.getElementById('endfield-scan-style')){
        const style = document.createElement('style');
        style.id = 'endfield-scan-style';
        style.textContent = `@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`;
        document.head.appendChild(style);
    }
  };

  // ==========================================
  // 🧩 模块 3：清理 # 标签前缀 (完整恢复)
  // ==========================================
  const cleanTagHashes = () => {
    document.querySelectorAll('.tag-topics__heading').forEach(h => {
      const txt = h.textContent.trim();
      if (txt.startsWith('#')) h.textContent = txt.substring(1);
    });
  };

  // 守护进程组装
  const runTactics = () => {
    initTagMatrix();
    cleanTagHashes();
  };

  // ==========================================
  // 🧩 模块 4：零漏斗 DOM 监视器引擎
  // ==========================================
  const startTacticsObserver = () => {
    if (window.endfieldTacticsObserver) return;

    const observer = new MutationObserver(() => {
      const statsContainer = getStatsContainer();
      if (statsContainer && statsContainer.dataset.statsLoaded !== "true" && statsContainer.dataset.statsLoaded !== "loading") {
        fetchAndRenderStats(statsContainer);
      }
      runTactics(); 
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.endfieldTacticsObserver = observer;
  };

  startTacticsObserver();
  
  // 定时轮询
  if (window.endfieldStatUpdater) clearInterval(window.endfieldStatUpdater);
  window.endfieldStatUpdater = setInterval(() => {
      const container = getStatsContainer();
      if (container) {
        container.dataset.statsLoaded = "false";
        fetchAndRenderStats(container);
      }
  }, 600000);

});
