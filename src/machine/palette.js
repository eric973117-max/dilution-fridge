/* ==========================================================================
   调色板与数学助手
   颜色是状态信号：白＝非聚焦，蓝＝聚焦，暗＝白模轮廓。
   —— 由 src/machine.js 拆分而来，几何与数值逻辑与拆分前逐字一致。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';

export const EDGE_WHITE = new THREE.Color(0xffffff);
export const EDGE_BLUE = new THREE.Color(0x9fc4ff);
export const WIRE_WHITE = new THREE.Color(0xffffff);
export const WIRE_BLUE = new THREE.Color(0x4d7dff);
export const EDGE_DARK = new THREE.Color(0x1b2133);
export const WIRE_DARK = new THREE.Color(0x33406a);
export const FILL_LIGHT = new THREE.Color(0xeef3fa);
export const FILL_DARK = new THREE.Color(0x0e0f13);

/** 机械翻转的回弹曲线：冲过头再收回来 */
export function easeOutBack(d, c1 = 1.9) {
  const c3 = c1 + 1;
  const t = d - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const cap = (v, lim) => (v > lim ? lim : v < -lim ? -lim : v);

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const R2D = Math.PI / 180;
