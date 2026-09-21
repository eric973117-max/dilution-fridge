/* ==========================================================================
   scroll · 滚动引擎（Lenis）
   改自「稀释制冷机-下午版」的 motion.js：原来章节表写死在引擎里，
   现在由各层模块拼出来的时间轴传进来。

   手机端（≤900px）把每章行程 ×1.6：手指滑动是位移输入，一划就是两三百像素，
   按原来的行程走，卡片"停住可读"那一段只有几百像素，文字根本来不及看。
   桌面端恒为 1，行程与原来逐像素相同。
   ========================================================================== */

import Lenis from '../vendor/lenis.mjs';

const MOBILE_SCROLL_STRETCH = 1.6;
const scrollStretch = () => (window.matchMedia('(max-width: 900px)').matches ? MOBILE_SCROLL_STRETCH : 1);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createScrollEngine({ scenes, reduced = false }) {
  const main = document.getElementById('scroll');
  const sections = scenes.map((sc, i) => {
    const el = document.createElement('section');
    el.className = 'scene';
    el.dataset.scene = String(i);
    el.dataset.key = sc.key;
    main.appendChild(el);
    return { ...sc, el, index: i };
  });

  let lenis = null;
  if (!reduced) {
    /* 触屏和鼠标滚轮是两种精度的输入：滚轮一格一格，1.6 倍放大仍然可控；
       手指是位移输入，放大 + 惯性会让"翻页"完全没法对位 —— 所以窄屏 1:1 跟手。 */
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    lenis = new Lenis({
      duration: narrow ? 0.9 : 1.05,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: narrow ? 1 : 1.6,
      ...(narrow ? { syncTouch: true, syncTouchLerp: 0.08 } : {}),
    });
  }

  let ranges = [];
  let metrics = [];

  function measure() {
    const vh = window.innerHeight;
    const k = scrollStretch();
    sections.forEach((s) => { s.el.style.height = `${(s.vh * k * vh) / 100}px`; });
    ranges = [];
    metrics = [];
    let acc = 0;
    sections.forEach((s) => {
      const h = (s.vh * k * vh) / 100;
      ranges.push({ start: acc, end: acc + h, height: h });
      metrics.push({ top: acc, height: h });
      acc += h;
    });
  }

  const raf = (time) => { if (lenis) lenis.raf(time); };

  function scrollToScene(i, immediate = false) {
    const r = ranges[i];
    if (!r) return;
    const y = r.start + r.height * 0.45;
    if (immediate) {
      window.scrollTo(0, y);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      return;
    }
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function getState() {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let idx = ranges.length - 1;
    for (let i = 0; i < ranges.length; i++) {
      if (y < ranges[i].end) { idx = i; break; }
    }
    const r = ranges[idx] || { start: 0, height: 1 };
    const local = clamp01((y - r.start) / Math.max(1, r.height));
    return { y, index: idx, scene: sections[idx], local, progress: clamp01(y / max) };
  }

  return {
    sections,
    measure,
    raf,
    getState,
    scrollToScene,
    smoothTo(y) {
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    },
    get metrics() { return metrics; },
    get lenis() { return lenis; },
    get stretch() { return scrollStretch(); },
  };
}
