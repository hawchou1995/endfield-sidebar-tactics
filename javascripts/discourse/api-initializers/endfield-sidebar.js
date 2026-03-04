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
    const container = document.getElementById('about-stats-content') || document.querySelector('.rs-custom-html .sidebar-stats-block');
    if (!container) return;
    if (container.dataset.statsLoaded === "true") return;

    fetch("/about.json")
      .then(r => r.json())
      .then(data => {
        const s = (data.about && data.about.stats) || {};
        const statsMap =[
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
        
        if(container.id === 'about-stats-content') {
             container.innerHTML = html;
        } else {
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

  /* ==========================================================
     [新增/修改] 核心 4：处理最近回复的单行截断与 Title 提示
     ========================================================== */
  const formatRecentReplies = () => {
    document.querySelectorAll('.recent-replies--reply').forEach(reply => {
      const excerpt = reply.querySelector('.recent-replies--excerpt');
      
      // 1. 提取纯文本并注入 title 属性（悬停显示全量文本）
      if (excerpt && !excerpt.hasAttribute('title')) {
        // 使用正则替换掉多余的换行和空格，保持 tooltip 干净
        const cleanText = excerpt.textContent.replace(/\s+/g, ' ').trim();
        if (cleanText) {
          excerpt.setAttribute('title', cleanText);
        }
      }

      // 2. DOM 结构重组：将 username 和 excerpt 放入同一个 flex 容器
      const col2 = reply.querySelector('.recent-replies--col:nth-child(2)');
      // 使用 dataset 确保不会被重复包裹
      if (col2 && !col2.dataset.flexFormatted) {
        const username = col2.querySelector('.recent-replies--username');
        if (username && excerpt) {
          col2.dataset.flexFormatted = "true";
          
          const flexRow = document.createElement('div');
          flexRow.className = 'recent-replies--user-excerpt-row';
          
          // 将新行插入到 col2 的最前面
          col2.insertBefore(flexRow, col2.firstChild);
          
          // 将原有的 username 和 excerpt 移动到新的 Flex 容器中
          flexRow.appendChild(username);
          flexRow.appendChild(excerpt);
        }
      }
    });
  };

  // 守护进程：应对异步渲染
  const runTactics = () => {
    initTagMatrix();
    fetchAndRenderStats();
    cleanTagHashes();
    formatRecentReplies(); // [新增] 调用格式化函数
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
