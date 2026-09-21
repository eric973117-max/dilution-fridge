/* ==========================================================================
   动效原语 · 用 anime.js v4 的原生能力，替掉手写的那几处
   （参考 animejs.com 官网的呈现方式）

   三件事：
     1. 逐字进场    splitText + stagger
     2. 乱码自检行  scrambleText —— 数值从乱码里「解」出来
     3. 点阵色扫    13×13 点阵按 stagger({from:'center', grid}) 扫成当前段温度色
   ========================================================================== */

import {
  animate, stagger, splitText, scrambleText, utils,
} from '../vendor/anime.esm.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- 1. 逐字 --- */

/** 把一个元素的文字拆成字，逐字推入。返回句柄供 revert 用 */
export function splitIn(el, { delay = 0, gap = 22, x = '.42em', duration = 900 } = {}) {
  if (!el || REDUCED) return null;

  let split;
  try {
    split = splitText(el, { chars: { class: 'fx-char' }, words: { class: 'fx-word' } });
  } catch (e) {
    return null;                      /* 拆字失败就保持原样，不要连累整页 */
  }
  const chars = split?.chars?.length ? split.chars : el.querySelectorAll('.fx-char');
  if (!chars.length) return split;

  utils.set(chars, { opacity: 0, translateX: x });
  animate(chars, {
    opacity: 1,
    translateX: 0,
    duration,
    delay: stagger(gap, { start: delay, ease: 'outIn(2)' }),
    ease: 'outQuint',
  });
  return split;
}

/* ----------------------------------------------------------- 2. 乱码行 --- */

const SCRAMBLE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#%+-·';

/** 数值从乱码里解出来 —— 自检行 / 参数读数用 */
export function scrambleIn(el, { text = null, delay = 0, duration = 900 } = {}) {
  if (!el) return null;
  const finalText = text ?? el.dataset.raw ?? el.textContent.trim();
  el.dataset.raw = finalText;
  if (REDUCED) { el.textContent = finalText; return null; }

  try {
    return scrambleText(el, {
      text: finalText,
      chars: SCRAMBLE_CHARS,
      duration,
      delay,
      revealRate: 45,
      settleRate: 22,
      settleDuration: 260,
    });
  } catch (e) {
    el.textContent = finalText;
    return null;
  }
}

/* --------------------------------------------------------- 3. 点阵扫色 --- */

/**
 * 官网那种「一格一格扫过去」的点阵。
 * 每个点是一个 div，换色时按从中心向外的 stagger 波纹扫过去。
 * 这里不用 canvas —— 169 个点的量级用 DOM 更简单，也让 anime.js 直接 animate CSS。
 */
export function createDotGrid(host, { cols = 13, rows = 13 } = {}) {
  if (!host) return null;
  const grid = document.createElement('div');
  grid.className = 'dotgrid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 5px)`;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = document.createElement('i');
      d.className = 'dotgrid__dot';
      grid.appendChild(d);
      dots.push(d);
    }
  }
  host.appendChild(grid);

  let current = '';

  function sweep(color) {
    if (!color || color === current) return;
    current = color;
    if (REDUCED) {
      utils.set(dots, { backgroundColor: color });
      return;
    }
    animate(dots, {
      backgroundColor: color,
      duration: 420,
      delay: stagger(14, { from: 'center', grid: [cols, rows], ease: 'in(2)' }),
    });
  }

  /** 整体淡入 / 淡出 */
  function setVisible(on) {
    /* 动画整个宿主而不是网格本身 —— 标签要跟着一起进出 */
    animate(host, { opacity: on ? 1 : 0, duration: 420, ease: 'outQuad' });
  }

  return { el: grid, dots, sweep, setVisible };
}
