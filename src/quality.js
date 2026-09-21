/* ==========================================================================
   quality · 画质档位（弱机自动降级 + 网址强制）

   这台机器卡不卡，主要看两件事：**画多少像素**（devicePixelRatio）和
   **每个像素算多贵**（环境反射）。这两样都不用动模型就能调，
   所以做成"按实测帧时间自动升降"的三档：

     · high（默认）：dpr ≤ 1.5（手机）/ 2（桌面）、环境反射 0.55、装饰全开
     · mid：dpr ≤ 1.15、环境 0.35、去掉颗粒/扫描线、去掉毛玻璃
     · low：dpr 1.0、环境 0.12、装饰层全去掉

   判据顺序：网址参数 `?q=high|mid|low|auto` → localStorage → 设备线索给的起跑档
   → 之后完全由**实测帧时间**决定（有回差，不抖）。
   —— 猜设备从来猜不准（同一代 CPU 的系统版本 / 省电模式差别很大），
      所以只用线索定起跑档，跑起来之后以实测定档。
   ========================================================================== */

export const LEVELS = {
  high: { maxDpr: null, env: 0.55 },
  mid: { maxDpr: 1.15, env: 0.35 },
  /* low 直接把环境贴图摘掉（env: 0）—— 实测"把强度调小"几乎不省，
     因为只要贴图还在，片元着色器就一直在采样；摘掉它才是真的省钱。 */
  low: { maxDpr: 1.0, env: 0 },
};

const ORDER = ['low', 'mid', 'high'];      // 由低到高
const STORE_KEY = 'dr.quality';

/* 起跑档：只用一个"绝不冤枉新设备、也别让老设备开场就卡"的小规则 ——
   老 iOS（≤13，iPhone 7 及更早那一代）和 2 核机直接 mid 起步。 */
function startingLevel() {
  const ios = /OS (\d+)_/.exec(navigator.userAgent);
  const iosVer = ios ? Number(ios[1]) : null;
  const cores = navigator.hardwareConcurrency || 4;
  if (iosVer != null && iosVer <= 13) return { level: 'mid', why: `iOS ${iosVer}` };
  if (cores <= 2) return { level: 'mid', why: `${cores} 核` };
  return { level: 'high', why: '默认' };
}

function median(list) {
  const a = [...list].sort((x, y) => x - y);
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * @param {(q:{level:string,env:number,maxDpr:number|null}, why:string)=>void} onApply
 */
export function createQuality(onApply) {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('q');
  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { stored = null; }
  if (stored && !LEVELS[stored]) stored = null;

  const start = startingLevel();
  let level = start.level;
  let why = start.why;

  /* 只认这几个值；其余（含 auto）都按"自动"处理 */
  const lock = !!(forced && LEVELS[forced]) || !!stored;   // 用户显式指定过 → 不再自动升降
  if (stored) { level = stored; why = 'localStorage'; }
  if (forced && LEVELS[forced]) { level = forced; why = '?q='; }
  if (forced === 'auto') { level = start.level; why = `auto · ${start.why}`; }

  let dirty = true;
  function emit() {
    dirty = false;
    onApply({ level, ...LEVELS[level] }, why);
  }
  emit();

  /* 采样：每 12 帧看一次中位帧时间。
     阈值取 34ms（≈29fps）往下掉、20ms（≥50fps）才往上升 —— 回差够大，
     不会出现"降一档 → 变快 → 升回去 → 又卡"的抖动。
     注意升档阈值不能卡在 15ms：60Hz 屏的基准间隔就是 16.7ms，那样永远升不回去。
     掉得很惨（>60ms，≤16fps）时一次降两档，别让老机器在 mid 上再熬两秒。 */
  let acc = [];
  let lastChange = performance.now();

  function sample(dtSec) {
    if (lock) return;
    if (!(dtSec > 0) || document.hidden) return;  // 切后台时 rAF 会停，那种间隔不算
    /* 上限压到 600ms：卡到 2fps 的老机器也必须能被判出来（不钳住就永远触发不了降档） */
    acc.push(Math.min(dtSec, 0.6) * 1000);
    if (acc.length < 12) return;
    const med = median(acc);
    acc = [];
    const now = performance.now();
    if (now - lastChange < 1500) return;

    const i = ORDER.indexOf(level);
    /* 掉得很惨（>60ms ≈ ≤16fps）时一次降两档；一般慢（>34ms）降一档 */
    const drop = med > 60 ? 2 : med > 34 ? 1 : 0;
    if (drop && i > 0) {
      level = ORDER[Math.max(0, i - drop)];
      why = `实测 ${med.toFixed(0)}ms/帧`;
      lastChange = now;
      emit();
    } else if (med < 20 && i < ORDER.length - 1) {
      level = ORDER[i + 1];
      why = `实测 ${med.toFixed(0)}ms/帧`;
      lastChange = now;
      emit();
    }
  }

  return {
    sample,
    get level() { return level; },
    get locked() { return lock; },
    /* 供调试/以后做 UI 用 */
    set(lv) {
      if (!LEVELS[lv] || lv === level) return;
      level = lv;
      why = '手动';
      try { localStorage.setItem(STORE_KEY, lv); } catch (e) { /* 隐私模式就算了 */ }
      emit();
    },
    get stale() { return dirty; },
    dispose() {},
  };
}
