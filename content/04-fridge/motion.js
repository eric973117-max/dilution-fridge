/* ==========================================================================
   04 · 稀释制冷机 —— 模块内动效（anime.js）
   从原 motion.js 里挑出这一层真正用得到的三支：信号追踪、合体、复位。
   ========================================================================== */

import { animate } from '../../vendor/anime.esm.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    顺序 = 先立结构骨架，再上屏蔽，然后从冷头一路装到读出台；稀释循环段最后落位。 */
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

/** 依赖图入场：节点按顺序淡入，连线随后一条条描出来 */
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

/** 依赖图退场 */
export function playGraphOut(nodes, edges) {
  nodes.forEach((n) => n.classList.remove('is-on'));
  edges.forEach((e) => e.classList.remove('is-drawn'));
}

export const prefersReduced = REDUCED;
