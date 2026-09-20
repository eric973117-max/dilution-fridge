/* ==========================================================================
   modules · 装进盘面开口里的模块

   参考图里每块盘的圆角开口里都塞着东西，而且一层一种：
     管束模块（立管 + 出线）/ 同轴模块（圆柱 + 六角螺母 + 出线）/
     螺母排 / 线圈组 / 弹簧屏蔽 / 穿孔刀片机箱
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { V, rng } from './utilities.js';
import { mergeGeos } from './outlines.js';
import { wireBundle } from './wires.js';

/** 六角螺母 */
function hexNut({ r = 0.008, h = 0.005, y = 0, seg = 6 }) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(0, y + h / 2, 0);
  return g;
}

/** 立管 + 卡箍环 + 顶部六角螺母 + 一小截接头，出线另外接 */
function tubeStack({ h = 0.05, r = 0.007, nutR = 0.010, nutH = 0.005, collars = 2, seg = 18 }) {
  const geos = [];
  const body = new THREE.CylinderGeometry(r, r, h, seg);
  body.translate(0, h / 2, 0);
  geos.push(body);
  for (let i = 0; i < collars; i++) {
    const c = new THREE.CylinderGeometry(r * 1.22, r * 1.22, 0.004, seg);
    c.translate(0, h * (0.3 + i * 0.4), 0);
    geos.push(c);
  }
  geos.push(hexNut({ r: nutR, h: nutH, y: h }));
  const post = new THREE.CylinderGeometry(nutR * 0.42, nutR * 0.42, 0.010, 10);
  post.translate(0, h + nutH + 0.005, 0);
  geos.push(post);
  return mergeGeos(geos);
}

/** 一条下垂的出线：从模块顶部往外甩出去再落下来 */
function tailCurve({ y, a, len = 0.075, out = 0.030, seed = 1 }) {
  const rand = rng(seed);
  const r0 = 0.006 + rand() * 0.004;
  const pts = [
    V(Math.cos(a) * r0, y, Math.sin(a) * r0),
    V(Math.cos(a) * (r0 + out * 0.5), y + 0.010 + rand() * 0.008, Math.sin(a) * (r0 + out * 0.5)),
    V(Math.cos(a + 0.35) * (r0 + out), y - len * 0.45, Math.sin(a + 0.35) * (r0 + out)),
    V(Math.cos(a + 0.7) * (r0 + out * 0.8), y - len, Math.sin(a + 0.7) * (r0 + out * 0.8)),
  ];
  return pts;
}

/**
 * 同轴模块：一根立管 + 六角螺母 + 若干条出线。
 * 参考图里盘面上密密麻麻都是这个，是整台机器最基础的可读单元。
 */
export function coaxModule({
  h = 0.05, r = 0.007, nutR = 0.010, collars = 2, tails = 2, seed = 1, tailLen = 0.075,
}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(tubeStack({ h, r, nutR, collars }));
  m.userData.edgeAngle = 26;
  g.add(m);
  for (let i = 0; i < tails; i++) {
    const pts = tailCurve({ y: h + 0.012, a: (i / tails) * Math.PI * 2 + 0.4, len: tailLen, seed: seed + i * 7 });
    g.add(wireBundle({ points: pts, strands: 1, jitter: 0.001, samples: 14 }));
  }
  return g;
}

/** 一叠水平圆环（超导同轴线 / 冷台盘管） */
export function coilStack({
  r = 0.048, turns = 7, gap = 0.011, tube = 0.0032, wobble = 0.05, seed = 2, y0 = 0,
}) {
  const rand = rng(seed);
  const geos = [];
  const yc = y0 - ((turns - 1) * gap) / 2;
  for (let i = 0; i < turns; i++) {
    const rr = r * (1 - wobble * (rand() - 0.5));
    const t = new THREE.TorusGeometry(rr, tube, 6, 24);
    t.rotateX(Math.PI / 2);
    t.translate(0, yc + i * gap, 0);
    geos.push(t);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 34;
  return m;
}

/**
 * 크라이오퍼멀 弹簧屏蔽：一叠立着的环 + 中间一块带螺栓孔的板。
 * 参考图第 ⑤ 号件就是这个形状，左右各一组夹着中央柱。
 */
export function springShield({
  r = 0.052, turns = 9, gap = 0.013, tube = 0.0034, blockW = 0.030, blockH = 0.115, blockD = 0.020, seed = 4,
}) {
  const rand = rng(seed);
  const geos = [];
  const yc = -((turns - 1) * gap) / 2;
  for (let i = 0; i < turns; i++) {
    const rr = r * (0.94 + rand() * 0.12);
    const t = new THREE.TorusGeometry(rr, tube, 6, 22);
    t.rotateX(Math.PI / 2);
    t.translate((rand() - 0.5) * 0.006, yc + i * gap, (rand() - 0.5) * 0.006);
    geos.push(t);
  }
  geos.push(new THREE.BoxGeometry(blockW, blockH, blockD));
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 34;
  return m;
}

/** 立管束：一排细管 + 顶部小接头，装在盘面的开口里 */
export function tubeBank({
  cols = 5, sx = 0.015, h = 0.055, r = 0.0042, nutR = 0.0062, seed = 5,
}) {
  const rand = rng(seed);
  const geos = [];
  for (let i = 0; i < cols; i++) {
    const x = (i - (cols - 1) / 2) * sx;
    const z = (rand() - 0.5) * 0.008;
    const hh = h * (0.82 + rand() * 0.36);
    const rr = r * (0.85 + rand() * 0.3);
    const body = new THREE.CylinderGeometry(rr, rr, hh, 14);
    body.translate(x, hh / 2, z);
    geos.push(body);
    const nut = hexNut({ r: nutR, h: 0.0048, y: hh });
    nut.translate(x, 0, z);
    geos.push(nut);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 28;
  return m;
}

/** 在竖直面上打一片点阵（穿孔刀片机箱的面板用） */
export function faceDotsXY({
  nx = 6, ny = 8, dx = 0.010, dy = 0.012, r = 0.0018, z = 0, steps = 7, phase = 0,
}) {
  const pts = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x = (i - (nx - 1) / 2) * dx + (j % 2) * dx * 0.5;
      const y = (j - (ny - 1) / 2) * dy;
      for (let s = 0; s < steps; s++) {
        const a0 = (s / steps) * Math.PI * 2 + phase;
        const a1 = ((s + 1) / steps) * Math.PI * 2 + phase;
        pts.push(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z);
        pts.push(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  return ls;
}

/**
 * 穿孔刀片机箱：一排立着的薄板，正面打点阵 —— 参考图底部的那个机箱。
 */
export function bladeRack({
  count = 5, w = 0.026, h = 0.26, d = 0.18, gap = 0.012, dots = true, seed = 6,
}) {
  const g = new THREE.Group();
  const rand = rng(seed);
  const geos = [];
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * (w + gap);
    const hh = h * (0.9 + rand() * 0.2);
    const b = new THREE.BoxGeometry(w, hh, d);
    b.translate(x, 0, 0);
    geos.push(b);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 26;
  g.add(m);
  if (dots) {
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * (w + gap);
      const ls = faceDotsXY({ nx: 2, ny: 9, dx: 0.009, dy: 0.020, r: 0.0016, z: d / 2 + 0.0006 });
      ls.position.x = x;
      g.add(ls);
    }
  }
  return g;
}
