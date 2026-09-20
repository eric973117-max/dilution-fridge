/* ==========================================================================
   frame · 五层盘的公共规格

   盘和「装在盘里的模块」要共用同一套开口坐标 —— 所以开口位置在这里算一次，
   01 段拿它开孔，其余的段拿它摆模块。
   ========================================================================== */

import { D, R, POST_R } from './dims.js';
import { POST } from './ref-dims.js';
import { pocketRing } from '../parts/index.js';

const TAU = Math.PI * 2;
export const POCKET_PHASE = 0.18;

/**
 * 四根粗方柱：立在盘缘、夹在开口之间的那四个 45° 方位上。
 * 参考图里五块盘就是靠这四根柱子串起来的，不是靠中央细杆。
 */
/* 柱子立在盘外沿之外、贴着盘缘 —— 参考图里盘就是靠这四根柱子串起来的 */
/* 立柱立在盘面上（半径落在焊盘圈与外圈减重孔之间），不是立在盘外沿 */
export const ROD_R = POST.r;
export const ROD_COUNT = 6;
export const ROD_PHASE = Math.PI / 4;

export function rodHoles(holeR = 0.011) {
  const out = [];
  for (let i = 0; i < ROD_COUNT; i++) {
    const a = (i / ROD_COUNT) * TAU + ROD_PHASE;
    out.push([Math.cos(a) * ROD_R, Math.sin(a) * ROD_R, holeR]);
  }
  return out;
}

/**
 * key   —— 层号
 * mount —— 这一层的开口里默认放什么模块（各段自己决定用不用）
 */
export const PLATES = [
  { key: 'p1', y: D.p1, r: R.p1, bolts: 28, dots: 60, count: 5, w: 0.142, d: 0.150, ring: 0.60, mount: 'tubes' },
  { key: 'p2', y: D.p2, r: R.p2, bolts: 32, dots: 68, count: 6, w: 0.160, d: 0.168, ring: 0.61, mount: 'coax' },
  { key: 'p3', y: D.p3, r: R.p3, bolts: 36, dots: 74, count: 6, w: 0.176, d: 0.184, ring: 0.61, mount: 'coax' },
  { key: 'p4', y: D.p4, r: R.p4, bolts: 32, dots: 68, count: 6, w: 0.160, d: 0.168, ring: 0.61, mount: 'coil' },
  { key: 'p5', y: D.p5, r: R.p5, bolts: 26, dots: 54, count: 5, w: 0.132, d: 0.139, ring: 0.59, mount: 'connector' },
];

/** 某块盘上所有开口的几何参数（喂给 discPlate） */
export function pocketsOf(plate) {
  return pocketRing({
    r: plate.r, ring: plate.ring, count: plate.count,
    w: plate.w, d: plate.d, rad: 0.024, phase: POCKET_PHASE,
  });
}

/** 第 i 个开口的位置与朝向（模块摆这里） */
export function pocketAt(plate, i) {
  const a = (i / plate.count) * TAU + POCKET_PHASE;
  return { a, x: Math.cos(a) * plate.r * plate.ring, z: Math.sin(a) * plate.r * plate.ring };
}

/** 按层号取盘 */
export function plateOf(key) {
  return PLATES.find((p) => p.key === key);
}
