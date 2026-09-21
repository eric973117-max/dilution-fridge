/* ==========================================================================
   动效与滚动编排 · anime.js v4 + Lenis
   滚动只负责「推进度」，所有编排交给 anime.js 的时间轴
   ========================================================================== */

import { animate, stagger } from '../vendor/anime.esm.js';
import Lenis from '../vendor/lenis.mjs';
import { SEGMENTS } from './data.js';
import { splitIn, scrambleIn } from './fx.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* 手机端「时间轴拉长」系数（只在 ≤900px 生效，宽屏恒为 1）。
   试过 1.6 / 1.3，用户最终还是选回**最初的速度与节奏**：手感最顺。
   留着这个系数是为了以后想再调（改一个数即可），1 = 原样。 */
const MOBILE_SCROLL_STRETCH = 1;
const scrollStretch = () =>
  (window.matchMedia('(max-width: 900px)').matches ? MOBILE_SCROLL_STRETCH : 1);

/* -------------------------------------------------------------- 场景表 --- */

export const SCENES = [
  { key: 'boot', label: 'BOOT', vh: 110 },
  { key: 'overview', label: 'SHEET 01 · OVERVIEW', vh: 120 },
  ...SEGMENTS.map((s) => ({
    key: 'seg' + s.id,
    label: `SEG ${s.id} · ${s.short || s.en}`,
    vh: s.hero ? 140 : 100,
    seg: s.id,
  })),
  { key: 'xray', label: 'CROSS SECTION', vh: 110 },
  { key: 'signal', label: 'SIGNAL PATH TRACE', vh: 130 },
  { key: 'deps', label: 'SYSTEM DEPENDENCY', vh: 130 },
  { key: 'assembly', label: 'RE-ASSEMBLY', vh: 100 },
  /* 定格：合体完成后的整机按住不动（约 139→146 步 / 共 160 步）——
     先看清"一台完整的机器"，再让它一层层穿上罩子。机位/配色在这一章全程不变。 */
  { key: 'hold', label: 'RE-ASSEMBLED · 整机定格', vh: 85 },
  /* 逐层套罩：四级辐射罩由内向外，最后是真空外罩；每层一句说明，滚动驱动、连续落位。
     vh 给到 130（从 100 加长，行程多三成），落位不再"啪"一下；
     总长与 outro 一起配平，前面各章的步号保持不变。 */
  { key: 'shields', label: 'SHIELDING STACK · 逐层套罩', vh: 130 },
  /* 收尾：变色淡化 + 总规格表。
     注意 HUD 的"步"是 y /（总高 − 视口高）：最后一章里有一段是"滚不动"的视口高度，
     所以这一章要留够 vh，前面几章的步号才会落在该落的地方（139 / 146 / 155）。
     给到 130vh：变色淡化与总表各摊到半章的可读时间。 */
  { key: 'outro', label: 'SPEC SHEET', vh: 130 },
];

/* -------------------------------------------------------- 滚动引擎 ------ */

export function createScrollEngine({ reduced = false } = {}) {
  const main = document.getElementById('scroll');
  const sections = SCENES.map((sc, i) => {
    const el = document.createElement('section');
    el.className = 'scene';
    el.dataset.scene = String(i);
    el.dataset.key = sc.key;
    main.appendChild(el);
    return { ...sc, el, index: i };
  });

  let lenis = null;
  if (!reduced) {
    /* 触屏和鼠标滚轮是两种不同精度的输入：
       · 鼠标滚轮一格一格，1.6 倍放大仍然可控；
       · 手指滑动是位移输入，放大 1.6 倍 + 惯性会让"翻页"完全没法对位。
       所以窄屏（手机）改成 1:1 跟手 —— syncTouch 让页面直接跟随手指位移，
       松手不再甩出去；宽屏保持原来的手感和参数不变。 */
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
      void s;
    });
    document.body.style.height = 'auto';
  }

  function raf(time) {
    if (lenis) lenis.raf(time);
  }

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
    const r = ranges[idx];
    const local = clamp01((y - r.start) / Math.max(1, r.height));
    return { y, index: idx, scene: sections[idx], local, progress: clamp01(y / max) };
  }

  return {
    sections, measure, raf, getState, scrollToScene,
    get metrics() { return metrics; },
    get lenis() { return lenis; },
  };
}

/* ----------------------------------------------------------- 入场编排 --- */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function playBootIn() {
  if (REDUCED) return;
  animate('.boot__line', {
    opacity: [0, 1],
    y: [8, 0],
    delay: stagger(150),
    duration: 520,
    ease: 'outExpo',
  });
  /* 自检行的数值从乱码里「解」出来（animejs.com 官网 hero 的同款手法） */
  document.querySelectorAll('.boot__line .boot__val').forEach((el, i) => {
    scrambleIn(el, { delay: 380 + i * 140, duration: 720 });
  });
  /* 大标题逐字推入。拆字只能拆一次 —— 重复进场时再拆会套娃 */
  const en = document.querySelector('.stack__en');
  if (en && !en.querySelector('.fx-char')) {
    splitIn(en, { delay: 520, gap: 26, duration: 820 });
  }
  animate('.stack__zh', { opacity: [0, 1], duration: 800, delay: 980, ease: 'outExpo' });
}

export function playCardIn(el) {
  const items = el.querySelectorAll('.anim');
  el.classList.add('is-on');
  if (REDUCED) return;
  animate(items, {
    opacity: [0, 1],
    x: [-10, 0],
    delay: stagger(55, { start: 60 }),
    duration: 480,
    ease: 'outExpo',
  });
  animate(el, { scale: [0.99, 1], duration: 520, ease: 'outExpo' });
  rollNumbers(el);
}

/** 数字滚动：卡片里的数值从 0 数到目标值（anime.js 驱动一个纯数据对象） */
function rollNumbers(el) {
  el.querySelectorAll('.kv__row b').forEach((node, i) => {
    const raw = node.dataset.raw ?? node.textContent.trim();
    node.dataset.raw = raw;
    const m = raw.match(/^([^\d]*)(\d+(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return;
    const target = parseFloat(m[2]);
    if (!Number.isFinite(target) || target === 0) return;
    const dec = (m[2].split('.')[1] || '').length;
    const obj = { v: 0 };
    animate(obj, {
      v: target,
      duration: 820,
      delay: 220 + i * 70,
      ease: 'outExpo',
      onUpdate: () => { node.textContent = m[1] + obj.v.toFixed(dec) + m[3]; },
      onComplete: () => { node.textContent = raw; },
    });
  });
}

export function playCardOut(el) {
  el.classList.remove('is-on');
}

export function playRailIn(el) {
  if (REDUCED) return;
  animate(el.querySelectorAll('.rail__item'), {
    opacity: [0, 1],
    x: [10, 0],
    delay: stagger(45),
    duration: 520,
    ease: 'outExpo',
  });
}

export function playGraphIn(nodes, edges) {
  if (REDUCED) {
    nodes.forEach((n) => n.classList.add('is-on'));
    edges.forEach((e) => e.classList.add('is-drawn'));
    return;
  }
  nodes.forEach((n, i) => {
    animate(n, { opacity: [0, 1], delay: i * 55, duration: 420, ease: 'outExpo' });
    setTimeout(() => n.classList.add('is-on'), i * 55);
  });
  edges.forEach((e, i) => {
    setTimeout(() => e.classList.add('is-drawn'), 420 + i * 130);
  });
}

export function playGraphOut(nodes, edges) {
  nodes.forEach((n) => n.classList.remove('is-on'));
  edges.forEach((e) => e.classList.remove('is-drawn'));
}

/** 信号链路追踪：用一个纯数据对象驱动，three.js 每帧读取 */
export function playSignalTrace(host, onDone) {
  host.signalT = 0;
  if (REDUCED) {
    host.signalT = 1;
    onDone?.();
    return null;
  }
  return animate(host, {
    signalT: 1,
    duration: 2600,
    ease: 'inOut(2)',
    onComplete: () => onDone?.(),
  });
}

/** 合体：按装配顺序把每一段的分离量收回去，最后一段带一点机械回弹。
    顺序 = 先立结构骨架，再上屏蔽，然后从冷头一路装到读出台；
    最核心的稀释循环段最后咔哒一声落位。八段必须一个不落——
    漏掉哪一段，它的内部展开量就会永远停在"散开"状态。 */
export function playReassembly(motion, order = ['01', '03', '02', '05', '06', '07', '08', '04']) {
  order.forEach((id, i) => {
    const last = i === order.length - 1;
    animate(motion.detach, {
      [id]: 0,
      duration: last ? 1100 : 780,
      delay: i * 110,
      ease: last ? 'outBack(1.6)' : 'inOut(3)',
    });
  });
  animate(motion, { xray: 0, duration: 700, ease: 'inOut(2)' });
  animate(motion, { dim: 0, duration: 700, ease: 'inOut(2)' });
}

export function resetDetach(motion) {
  Object.keys(motion.detach).forEach((k) => { motion.detach[k] = 0; });
  motion.xray = 0;
}

export const prefersReduced = REDUCED;
