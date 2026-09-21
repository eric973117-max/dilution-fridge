/* ==========================================================================
   调色板与数学助手
   颜色是状态信号：白＝非聚焦，蓝＝聚焦，暗＝白模轮廓。
   —— 由 src/machine.js 拆分而来，几何与数值逻辑与拆分前逐字一致。
   ========================================================================== */

import * as THREE from '../../../../vendor/three.module.js';

export const EDGE_WHITE = new THREE.Color(0xffffff);
export const EDGE_BLUE = new THREE.Color(0x9fc4ff);
export const WIRE_WHITE = new THREE.Color(0xffffff);
export const WIRE_BLUE = new THREE.Color(0x4d7dff);
export const EDGE_DARK = new THREE.Color(0x1b2133);
export const WIRE_DARK = new THREE.Color(0x33406a);
export const FILL_LIGHT = new THREE.Color(0xeef3fa);
export const FILL_DARK = new THREE.Color(0x0e0f13);

/* 实体渲染（"有环境可反射"的两种底）：
   · FILL_SOLID —— 默认的暗实体：比 FILL_DARK 稍亮一点，配合环境反射与低粗糙度，
     曲面上会有一条连续的明暗渐变 + 一点高光，看着像真的阳极氧化件 / 塑料件，
     而不是一块平涂的黑。参考图 1 的"实体感"。
   · FILL_PRESENT —— 正在被讲的那一段：灰白实体（参考图 2 的白模语言）。
   · EDGE_INK —— 灰白实体上的勾线备选：近黑的墨色（"白模 + 墨线"那一版用的）。
     当前用的是**蓝色轮廓线**（见 `src/machine/index.js` 的 `PRESENT_BLUE`），
     要换回墨线就把那里的 lerp 目标换回 EDGE_INK。 */
export const FILL_SOLID = new THREE.Color(0x16191f);
export const FILL_PRESENT = new THREE.Color(0xd4d9e2);
export const EDGE_INK = new THREE.Color(0x14171d);

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
