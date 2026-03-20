import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.8", (api) => {
  
  // ==========================================
  // 🧩 模块 1：强化版站点统计渲染器 (加入防并发与优雅降级)
  // ==========================================
  const fetchAndRenderStats = async (container) => {
    // 【防御性验证】如果容器不存在，或者正在加载中，或者已经加载完成，则直接阻断
    if (!container || container.dataset.statsLoaded === "true" || container.dataset.statsLoaded === "loading") {
      return;
    }

    // 上锁：声明当前处于加载态，防止网络慢时重复触发
    container.dataset.statsLoaded = "loading";

    try {
      const response = await fetch("/about.json");
      if (!response.ok) throw new Error(`[Tactics] HTTP Error: ${response.status}`);
      const data = await response.json();

      // 【零信任假设】严格校验数据路径，防止 JSON 结构意外变更导致 JS 崩溃
      const s = data?.about?.stats;
      const canSee = data?.about?.can_see_about_stats;

      if (!s || canSee === false) {
        throw new Error("[Tactics] No permission or missing stats data.");
      }

      // 数据映射矩阵，强制类型转换防止 toLocaleString 报错
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
      
      // DOM 注入策略分发
      if(container.id === 'about-stats-content') {
           container.innerHTML = html;
      } else {
           container.innerHTML = `<h3>站点统计</h3><div id="about-stats-content">${html}</div>`;
      }
      
      // 成功解锁
      container.dataset.statsLoaded = "true";

    } catch (err) {
      console.warn(err.message);
      // 【优雅降级】失败时显示离线网格并重置锁，允许未来重试
      container.innerHTML = `<h3>站点统计</h3><div id="about-stats-content" style="padding:10px;text-align:center;color:var(--primary-medium);font-size:12px;">[ DATA OFFLINE / PERMISSION DENIED ]</div>`;
      container.dataset.statsLoaded = "error"; 
    }
  };

  // ==========================================
  // 🧩 模块 2：标签清理与其他视图操作 (保持你原有的逻辑结构)
  // ==========================================
  // (此处省略 initTagMatrix 和 cleanTagHashes 的具体实现以保持篇幅，请保留你原始的这两个函数代码)
  const runTactics = () => {
    // initTagMatrix(); // 你的原有函数
    // cleanTagHashes(); // 你的原有函数
  };

  // ==========================================
  // 🧩 模块 3：零漏斗 DOM 监视器引擎 (彻底抛弃 setTimeout)
  // ==========================================
  const startTacticsObserver = () => {
    // 防止重复实例化 Observer
    if (window.endfieldTacticsObserver) return;

    // 监听整个 body 及其子树，捕获异步生成的侧边栏
    const observer = new MutationObserver((mutations) => {
      // 降低计算频率：一旦在变动中发现目标，立刻触发并由 dataset 锁阻断重复渲染
      const statsContainer = document.getElementById('about-stats-content') || document.querySelector('.rs-custom-html .sidebar-stats-block');
      
      if (statsContainer && statsContainer.dataset.statsLoaded !== "true") {
        fetchAndRenderStats(statsContainer);
      }
      
      runTactics(); // 触发其他渲染逻辑
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.endfieldTacticsObserver = observer;
  };

  // 启动观察者
  startTacticsObserver();
  
  // ==========================================
  // 🧩 模块 4：轮询更新服务 (10分钟自动刷新)
  // ==========================================
  if (window.endfieldStatUpdater) clearInterval(window.endfieldStatUpdater);
  window.endfieldStatUpdater = setInterval(() => {
      const container = document.getElementById('about-stats-content') || document.querySelector('.rs-custom-html .sidebar-stats-block');
      if (container) {
        // 重置状态锁以强制拉取新数据
        container.dataset.statsLoaded = "false";
        fetchAndRenderStats(container);
      }
  }, 600000);

});
