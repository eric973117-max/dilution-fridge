/* ==========================================================================
   cables · 贯穿全高的线束带
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { V } from './utilities.js';

/* ----------------------------------------------------------------- cables */

/**
 * 线束带：所有芯线沿同一条路径平行行进，中段散开、两端收拢
 * —— 这是资料图里最标志性的视觉：像瀑布一样成束下垂的线缆
 */
export function harness({
  points, strands = 24, radius = 0.010, swirl = 1.6, samples = 26, tubeR = 0.0012,
  asTubes = false, spread = 1.6,
}) {
  const base = new THREE.CatmullRomCurve3(
    points.map((p) => V(p[0], p[1], p[2])), false, 'catmullrom', 0.4,
  );

  if (asTubes) {
    const g = new THREE.Group();
    for (let s = 0; s < strands; s++) {
      g.add(buildStrandMesh(base, s, strands, radius, swirl, samples, tubeR, spread));
    }
    return g;
  }

  const pos = [];
  for (let s = 0; s < strands; s++) {
    const phase = (s / strands) * Math.PI * 2;
    let prev = strandPoint(base, 0, phase, strands, radius, swirl, spread);
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const p = strandPoint(base, t, phase, strands, radius, swirl, spread);
      pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  ls.userData.strandCount = strands;
  return ls;
}

function strandOffset(base, t, phase, strands, radius, swirl, spread) {
  const tan = base.getTangent(clampT(t));
  /* 参考向量取 Z：我们的线束基本是竖直的，用 Y 会退化 */
  const n1 = new THREE.Vector3().crossVectors(tan, V(0, 0, 1));
  if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0);
  n1.normalize();
  const n2 = new THREE.Vector3().crossVectors(tan, n1).normalize();
  const envelope = Math.pow(Math.sin(Math.PI * clampT(t)), 0.55);
  const rr = radius * (0.35 + spread * envelope);
  const a = phase + t * swirl * Math.PI * 2;
  return { n1, n2, a, rr };
}

function strandPoint(base, t, phase, strands, radius, swirl, spread) {
  const p = base.getPoint(clampT(t));
  const { n1, n2, a, rr } = strandOffset(base, t, phase, strands, radius, swirl, spread);
  return p.clone().addScaledVector(n1, Math.cos(a) * rr).addScaledVector(n2, Math.sin(a) * rr);
}

function buildStrandMesh(base, s, strands, radius, swirl, samples, tubeR, spread) {
  const phase = (s / strands) * Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    pts.push(strandPoint(base, i / samples, phase, strands, radius, swirl, spread));
  }
  const c = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, samples, tubeR, 4, false));
  m.userData.isWire = true;
  return m;
}

function clampT(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
