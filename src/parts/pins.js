/* ==========================================================================
   pins · 参考图里决定 80% 长相的四类零件

   ① 焊盘 + 柱簇：盘上一圈凸起的金焊盘，每个焊盘上站一簇接线柱
   ② 导线环：每根线从柱顶垂下来，在半空绕一个完整的圈，再继续往下
      —— 这台机器最好认的特征，不是"挂一圈环"，是"每根线自己打个圈"
   ③ 立柱 + 金箍：六根金柱，每穿过一块盘套一个箍
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { mergeGeos } from './outlines.js';
import { rng } from './utilities.js';

/** 一根接线柱：柱身 + 顶部六角头 */
function pinGeo({ x, z, y = 0, r = 0.0040, h = 0.024, headR = 0.0062, headH = 0.007 }) {
  const out = [];
  const body = new THREE.CylinderGeometry(r, r, h, 10);
  body.translate(x, y + h / 2, z);
  out.push(body);
  const head = new THREE.CylinderGeometry(headR, headR, headH, 6);
  head.translate(x, y + h + headH / 2, z);
  out.push(head);
  return out;
}

/**
 * 焊盘 + 柱簇：一块凸起的小圆盘上站一簇接线柱。
 * 参考图里每块盘上环着 8–12 个这样的簇。
 */
export function padCluster({
  padR = 0.052, padH = 0.006, pins = 14, spread = 0.034, seed = 1,
  pinR = 0.0040, pinH = 0.024, headR = 0.0062,
}) {
  const rand = rng(seed);
  const geos = [];
  const pad = new THREE.CylinderGeometry(padR, padR, padH, 28);
  pad.translate(0, padH / 2, 0);
  geos.push(pad);
  /* 柱簇：极坐标散开，位置带抖动 —— 实物不是规矩的方阵 */
  for (let i = 0; i < pins; i++) {
    const t = i / Math.max(1, pins - 1);
    const rr = spread * Math.sqrt(t) * (0.85 + rand() * 0.3);
    const a = i * 2.399 + rand() * 0.3;          // 黄金角铺开
    geos.push(...pinGeo({
      x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: padH,
      r: pinR * (0.9 + rand() * 0.2), h: pinH * (0.85 + rand() * 0.35),
      headR: headR * (0.9 + rand() * 0.2),
    }));
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 26;
  return m;
}

/**
 * 一根带环的导线：柱顶 → 垂下来 → 半空绕一个整圈 → 继续垂到下一层。
 * 返回 BufferGeometry（调用方自行合并，几百根线只出一个 drawcall）。
 */
export function wireLoopGeo({
  x, z, yTop, yBot, loopR = 0.028, tube = 0.0011, loopAt = 0.45, seg = 34,
}) {
  const h = yTop - yBot;
  const cy = yTop - h * loopAt;
  const pts = [
    new THREE.Vector3(x, yTop, z),
    new THREE.Vector3(x, yTop - h * 0.22, z),
  ];
  /* 圈：立在与径向垂直的竖直面里，看起来就是一个环 */
  const ax = x === 0 && z === 0 ? 1 : x / Math.hypot(x, z);
  const az = x === 0 && z === 0 ? 0 : z / Math.hypot(x, z);
  for (let i = 0; i <= 12; i++) {
    const th = (i / 12) * Math.PI * 2;
    pts.push(new THREE.Vector3(
      x + ax * loopR * Math.sin(th),
      cy - loopR * Math.cos(th),
      z + az * loopR * Math.sin(th),
    ));
  }
  pts.push(new THREE.Vector3(x, yBot + h * 0.06, z));
  pts.push(new THREE.Vector3(x, yBot, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
  return new THREE.TubeGeometry(curve, seg, tube, 5, false);
}

/**
 * 立柱：方柱 + 若干金箍（金箍给的是相对这根柱底部的 y 偏移）。
 */
export function postGeo({ h, section = 0.030, collarR = 0.024, collarH = 0.024, collars = [] }) {
  const geos = [];
  const shaft = new THREE.CylinderGeometry(section / 2, section / 2, h, 8);
  geos.push(shaft);
  collars.forEach((cy) => {
    const c = new THREE.CylinderGeometry(collarR, collarR, collarH, 18);
    c.translate(0, cy - h / 2, 0);
    geos.push(c);
  });
  return mergeGeos(geos);
}
