/* ==========================================================================
   discs · 大开孔安装盘（按参考图的盘形重做）

   一块盘 = 外缘螺栓孔环（真孔）+ 外缘小点阵（线稿）+ 中圈若干个圆角矩形
   开口（真孔，模块就装在里面）+ 中心通孔。
   和上一版的区别：开口从「圆形减重孔」改成「圆角矩形机加工窗口」。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { holeLoops, slotLoops } from './holes.js';

const TAU = Math.PI * 2;

/** 圆角矩形的轮廓点（局部坐标，中心在原点） */
export function roundedRectPts(w, d, rad, steps = 5) {
  const r = Math.max(1e-4, Math.min(rad, Math.min(w, d) / 2 - 1e-4));
  const hw = w / 2 - r;
  const hd = d / 2 - r;
  const pts = [];
  [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, -Math.PI / 2]]
    .forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (i / steps) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    });
  return pts;
}

/**
 * 把局部轮廓点搬到世界 XZ 的 (x, z)、绕 Y 转 rot，返回一条 Path。
 * 挤出用的是 shape 的 XY 平面，rotateX(-90°) 之后 shape.y 对应世界 -Z，
 * 所以这里统一做 y → -z 的换算，调用方只用世界坐标思考。
 */
export function pathAt(pts, x, z, rot = 0) {
  const p = new THREE.Path();
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const cx = x;
  const cy = -z;
  pts.forEach(([px, py], i) => {
    const X = cx + px * ca - py * sa;
    const Y = cy + px * sa + py * ca;
    if (i === 0) p.moveTo(X, Y);
    else p.lineTo(X, Y);
  });
  p.closePath();
  return p;
}

/**
 * 安装盘。
 * pockets: [{ x, z, w, d, rad, rot }] —— 世界 XZ 平面上的圆角矩形开口
 * 返回 Group：盘体 Mesh + 盘面线稿（点阵 / 开口描边）
 */
export function discPlate({
  r, t = 0.011, bore = 0.05,
  pockets = [], bolts = 0, boltR = 0.0042, boltInset = 0.026,
  dots = 0, dotR = 0.0016, dotInset = 0.046, extraHoles = [], seg = 128,
}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, TAU, false);

  if (bore > 0) {
    const p = new THREE.Path();
    p.absarc(0, 0, bore, 0, TAU, true);
    shape.holes.push(p);
  }
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * TAU + 0.05;
    const rr = r - boltInset;
    const p = new THREE.Path();
    p.absarc(Math.cos(a) * rr, Math.sin(a) * rr, boltR, 0, TAU, true);
    shape.holes.push(p);
  }
  pockets.forEach((pk) => {
    const rad = pk.rad ?? Math.min(pk.w, pk.d) * 0.24;
    shape.holes.push(pathAt(roundedRectPts(pk.w, pk.d, rad), pk.x, pk.z, pk.rot || 0));
  });
  extraHoles.forEach(([x, z, hr]) => {
    const p = new THREE.Path();
    p.absarc(x, -z, hr, 0, TAU, true);
    shape.holes.push(p);
  });

  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: seg > 96 ? 26 : 20 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -t / 2, 0);
  geo.computeVertexNormals();

  const g = new THREE.Group();
  const m = new THREE.Mesh(geo);
  m.userData.edgeAngle = 24;
  g.add(m);

  const y = t / 2 + 0.0005;
  if (dots) {
    const items = [];
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * TAU + 0.11;
      const rr = r - dotInset;
      items.push([Math.cos(a) * rr, Math.sin(a) * rr, dotR, y]);
    }
    g.add(holeLoops(items, 8));
  }
  if (pockets.length) {
    const ls = slotLoops(pockets.map((pk) => [pk.x, pk.z, pk.w, pk.d, pk.rot || 0]));
    ls.position.y = y;
    g.add(ls);
  }
  g.userData.radius = r;
  g.userData.thickness = t;
  return g;
}

/** 一圈均布的开口位置：返回可直接喂给 discPlate 的 pockets */
export function pocketRing({
  r, ring = 0.66, count = 6, w = 0.11, d = 0.115, rad = 0.024, phase = 0,
}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + phase;
    out.push({
      x: Math.cos(a) * r * ring,
      z: Math.sin(a) * r * ring,
      w, d, rad,
      rot: -a,
    });
  }
  return out;
}
