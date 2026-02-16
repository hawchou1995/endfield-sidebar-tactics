import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.8", (api) => {
  
  // 核心 1：标签词云矩阵初始化
  const initTagMatrix = () => {
    const container = document.querySelector('.popular-tags__container');
    if (!container || container.dataset.initMatrix === "true") return;

    let tags = Array.from(container.querySelectorAll('.popular-tags__tag'));
    if (tags.length === 0) return;

    container.dataset.initMatrix = "true";
    const viewAllBtn = container.querySelector('.popular-tags__view-all');

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
    if (viewAllBtn) container.appendChild(viewAllBtn);
    
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

  // 核心 2：站点统计获取
  const fetchAndRenderStats = () => {
    // 兼容大多数自定义 HTML 区块的探测
    const container = document.getElementById('about-stats-content') || document.querySelector('.rs-custom-html .sidebar-stats-block');
    if (!container) return;
    if (container.dataset.statsLoaded === "true") return;

    fetch("/about.json")
      .then(r => r.json())
      .then(data => {
        const s = (data.about && data.about.stats) || {};
        const statsMap = [
          { label: "TOPICS", value: s.topics_count || 0 },
          { label: "POSTS", value: s.posts_count || 0 },
          { label: "USERS", value: s.users_count || 0 },
          { label: "LIKES", value: s.likes_count || 0 },
          { label: "DAU 7D", value: s.active_users_7_days || 0 },
          { label: "MAU 30D", value: s.active_users_30_days || 0 }
        ];

        let html = '<div class="sidebar-stats-grid">';
        statsMap.forEach(item => {
          html += `<div class="sidebar-stat-item"><span class="s-label">${item.label}</span><span class="s-value">${item.value.toLocaleString()}</span></div>`;
        });
        html += '</div>';
        
        // 如果是原始容器，清空重写；如果是包裹容器，追加
        if(container.id === 'about-stats-content') {
             container.innerHTML = html;
        } else {
             // 🚨 这里已经为你替换成了 <h3> 标签，完美适配青色切角边框！
             container.innerHTML = `<h3>站点统计</h3><div id="about-stats-content">${html}</div>`;
        }
        container.dataset.statsLoaded = "true";
      })
      .catch(err => console.error("Stats Error:", err));
  };

  // 核心 3：清理 # 标签
  const cleanTagHashes = () => {
    document.querySelectorAll('.tag-topics__heading').forEach(h => {
      const txt = h.textContent.trim();
      if (txt.startsWith('#')) h.textContent = txt.substring(1);
    });
  };

  // 守护进程：应对异步渲染
  const runTactics = () => {
    initTagMatrix();
    fetchAndRenderStats();
    cleanTagHashes();
  };

  // 路由切换时重装载
  api.onPageChange(() => {
    setTimeout(runTactics, 300);
    setTimeout(runTactics, 1000); // 兜底防止慢加载
  });
  
  // 定时刷新统计
  if (window.endfieldStatUpdater) clearInterval(window.endfieldStatUpdater);
  window.endfieldStatUpdater = setInterval(() => {
      const container = document.getElementById('about-stats-content');
      if(container) container.dataset.statsLoaded = "false";
      fetchAndRenderStats();
  }, 600000);

});
