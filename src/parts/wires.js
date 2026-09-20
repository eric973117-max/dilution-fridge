/* ==========================================================================
   wires · 线束与芯片
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { rng, V } from './utilities.js';
import { box } from './solids.js';

/* ----------------------------------------------------------------- wires */

/**
 * 线束：多条 Catmull-Rom 曲线，按 LOD 决定用「管」还是「线」
 * 返回 LineSegments（默认，1 drawcall）或 Mesh 组（近距离 LOD）
 */
export function wireBundle({ points, strands = 12, jitter = 0.006, samples = 28, seed = 7, asTubes = false, tubeR = 0.0011 }) {
  const rand = rng(seed);
  const base = points.map((p) => V(p[0], p[1], p[2]));

  if (asTubes) {
    const g = new THREE.Group();
    for (let s = 0; s < strands; s++) {
      const ctrl = base.map((p, i) => {
        const edge = i === 0 || i === base.length - 1 ? 0.35 : 1;
        return V(
          p.x + (rand() - 0.5) * jitter * edge,
          p.y + (rand() - 0.5) * jitter * 0.3,
          p.z + (rand() - 0.5) * jitter * edge,
        );
      });
      const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.4);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, samples, tubeR, 4, false));
      m.userData.isWire = true;
      g.add(m);
    }
    return g;
  }

  const pos = [];
  for (let s = 0; s < strands; s++) {
    const ctrl = base.map((p, i) => {
      const edge = i === 0 || i === base.length - 1 ? 0.35 : 1;
      return V(
        p.x + (rand() - 0.5) * jitter * edge,
        p.y + (rand() - 0.5) * jitter * 0.3,
        p.z + (rand() - 0.5) * jitter * edge,
      );
    });
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.4);
    let prev = curve.getPoint(0);
    for (let i = 1; i <= samples; i++) {
      const p = curve.getPoint(i / samples);
      pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  ls.userData.strandCount = strands;
  ls.userData.curvePoints = base;
  return ls;
}

/** 芯片：基板 + 引线键合点阵 */
export function chip({ w = 0.022, h = 0.0028, d = 0.022, bonds = 14 }) {
  const g = new THREE.Group();
  const base = box({ w, h, d });
  g.add(base);

  const pad = box({ w: w * 0.62, h: h * 0.5, d: d * 0.62 });
  pad.position.y = h * 0.75;
  g.add(pad);

  const pos = [];
  const rand = rng(21);
  for (let i = 0; i < bonds; i++) {
    const side = i % 4;
    const t = (Math.floor(i / 4) + 0.5) / Math.ceil(bonds / 4) - 0.5;
    const a = side === 0 ? [t * w, 0] : side === 1 ? [0.5, t] : side === 2 ? [t, 0.5] : [-0.5, t];
    const x = a[0] * w * 0.98;
    const z = a[1] * d * 0.98;
    const x2 = a[0] * w * 0.58;
    const z2 = a[1] * d * 0.58;
    pos.push(x, h * 0.9, z, x2, h * 1.35 + rand() * 0.0006, z2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const bondsMesh = new THREE.LineSegments(geo);
  bondsMesh.userData.isWire = true;
  g.add(bondsMesh);
  return g;
}
