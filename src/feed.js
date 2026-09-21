/* ==========================================================================
   feed · 数据源适配层（全站唯一的数据入口）

   页面与动画**永远不直接读 JSON**，一律通过这里拿数据。这样以后要接真实实验数据、
   或者接实时数据，只换适配器，页面一行都不用改。

     静态（现在）  kind: 'static'  —— 内容就在 content/ 里，feed 只提供订阅口
     回放（预留）  kind: 'replay'  —— 把一段实验时间序列（CSV/JSON）按时间推进
     实时（预留）  kind: 'live'    —— MQTT / WebSocket / SSE，后端契约见 docs/PLAN.md

   两种数据形态，别混：
     1. 静态内容（content/*）：章节文案、规格、几何参数 —— 走构建期，不进 feed。
     2. 运行时数据（data/*）：实验曲线、实时读数 —— 走 feed，UI 订阅后自己画。

   适配器必须实现：{ kind, available, latest(), subscribe(fn), push(sample) }
   push 是留给适配器的写入口：谁拿到数据（回放定时器 / WebSocket 回调）就往这里塞，
   订阅者收到 { t, channel, value, unit, source } 形状的样本。
   ========================================================================== */

export const FEED_KINDS = ['static', 'replay', 'live'];

export function createFeed({ kind = 'static', url = null } = {}) {
  const listeners = new Set();
  let latest = null;
  let series = null;

  const adapter = {
    kind: 'static',
    requested: kind,
    url,
    /* 现在只有静态一种：接实时数据时，这里会变成"已连接" */
    get available() { return true; },
    latest: () => latest,
    series: () => series,
    subscribe(fn) {
      listeners.add(fn);
      if (latest) fn(latest);
      return () => listeners.delete(fn);
    },
    push(sample) {
      latest = sample;
      listeners.forEach((fn) => fn(sample));
    },
    /* 回放用：一次性灌入一条时间序列，之后由适配器按时间点 push */
    loadSeries(rows) { series = rows; },
  };

  if (kind !== 'static') {
    console.warn(
      `[feed] kind="${kind}" 还没接上（P0 只有静态内容）。`
      + ' 契约与预留接口见 src/feed.js 顶部注释与 docs/PLAN.md「数据接口」。',
    );
  }
  return adapter;
}
