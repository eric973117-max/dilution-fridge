/* ==========================================================================
   details · 元件组 / 连接器块 / 簧片 / 盘管簇 / 斜撑
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { rng, V } from './utilities.js';
import { mergeGeos } from './outlines.js';

export function componentBank({
  rows = 3, cols = 4, sx = 0.012, sz = 0.014,
  cylR = 0.0042, cylH = 0.024, nutR = 0.0062, nutH = 0.004,
  jitter = 0.34, seed = 3,
}) {
  const geos = [];
  const rand = rng(seed);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      /* 海报里的元件簇不是规整阵列：粗细高矮不一、位置有抖动 */
      const x = (j - (cols - 1) / 2) * sx + (rand() - 0.5) * sx * jitter;
      const z = (i - (rows - 1) / 2) * sz + (rand() - 0.5) * sz * jitter;
      const rr = cylR * (0.78 + rand() * 0.5);
      const hh = cylH * (0.65 + rand() * 0.8);
      const nr = rr * 1.5;
      const g1 = new THREE.CylinderGeometry(rr, rr * 0.94, hh, 9);
      g1.translate(x, hh / 2, z);
      geos.push(g1);
      const g2 = new THREE.CylinderGeometry(nr, nr, nutH, 6);
      g2.translate(x, hh + nutH / 2, z);
      geos.push(g2);
      /* 少数元件顶部还带一小截细管 */
      if (rand() > 0.55) {
        const g3 = new THREE.CylinderGeometry(rr * 0.3, rr * 0.3, hh * 0.7, 6);
        g3.translate(x, hh + nutH + hh * 0.35, z);
        geos.push(g3);
      }
    }
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 28;
  return m;
}

/** 连接器块：小方盒 + 顶部圆点（资料图里盘面上到处是这种东西） */
export function connectorBlock({ w = 0.012, h = 0.008, d = 0.008, dots = 2 }) {
  const geos = [];
  const b = new THREE.BoxGeometry(w, h, d);
  b.translate(0, h / 2, 0);
  geos.push(b);
  for (let i = 0; i < dots; i++) {
    const c = new THREE.CylinderGeometry(0.0016, 0.0016, 0.003, 8);
    c.translate((i - (dots - 1) / 2) * 0.0042, h + 0.0015, 0);
    geos.push(c);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 20;
  return m;
}

/**
 * 圆筒的母线：技术制图里圆柱体靠若干条竖直线交代形体
 * 光滑圆柱的 EdgesGeometry 只有上下口，没有侧影线，必须补这个
 */
export function shellGeneratrix({ r, h, count = 10, offset = 0 }) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + offset;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    pts.push(x, -h / 2, z, x, h / 2, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  return ls;
}

/**
 * 梳齿：安装盘下方密排的细立柱
 * 海报里的盘几乎都挂着几十根竖线，是这台机器最标志性的纹理
 */
export function pinComb({
  r, count = 44, h = 0.022, pinR = 0.0016, innerRatio = 0.52, y = 0, seed = 5,
}) {
  const rand = rng(seed);
  const geos = [];
  const outer = Math.round(count * 0.68);
  for (let i = 0; i < count; i++) {
    const isOuter = i < outer;
    const n = isOuter ? outer : count - outer;
    const k = isOuter ? i : i - outer;
    const a = (k / Math.max(1, n)) * Math.PI * 2 + (isOuter ? 0 : 0.4);
    const rr = isOuter
      ? r * (0.80 + rand() * 0.14)
      : r * innerRatio * (0.25 + rand() * 0.75);
    const hh = h * (0.7 + rand() * 0.6);
    const g = new THREE.CylinderGeometry(pinR, pinR * 0.86, hh, 6);
    g.translate(Math.cos(a) * rr, y - hh / 2, Math.sin(a) * rr);
    geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 34;
  return m;
}

/**
 * 盘管簇：海报里中间几层挂着一圈圈环形盘管
 * 用一组小圆环按环带排布，模拟管路绕圈
 */
export function coilCluster({
  count = 10, r = 0.014, tube = 0.0016, bandR = 0.05, band = 0.016, y = 0, seed = 9,
}) {
  const rand = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.TorusGeometry(r * (0.75 + rand() * 0.5), tube, 5, 16));
    t.position.set(
      Math.cos(a) * bandR + (rand() - 0.5) * 0.006,
      y + (rand() - 0.5) * band,
      Math.sin(a) * bandR + (rand() - 0.5) * 0.006,
    );
    t.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.6);
    t.userData.edgeAngle = 46;
    g.add(t);
  }
  return g;
}

/** 斜撑：两块盘之间的 V 形拉杆（海报立面上到处是这种斜线） */
export function strut({ from, to, rad = 0.0022, seg = 8 }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(rad, rad, len, seg, 1);
  const m = new THREE.Mesh(geo);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.userData.edgeAngle = 34;
  return m;
}
