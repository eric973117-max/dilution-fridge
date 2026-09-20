/* ==========================================================================
   holes · 螺栓孔环 / 盘面气孔 / 圆角开口
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';

export function holeLoops(items, steps = 16) {
  const pts = [];
  items.forEach((it) => {
    const cx = it[0];
    const cz = it[1];
    const r = it[2];
    const y = it[3] ?? 0;
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1) / steps) * Math.PI * 2;
      pts.push(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r);
      pts.push(cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  return ls;
}

/** 盘面上的大开口轮廓（资料图里每个盘都有若干圆角开口，元件组就装在里面） */
export function slotLoops(slots) {
  const pts = [];
  slots.forEach((s) => {
    const [cx, cz, w, d, rot = 0] = s;
    const r = Math.min(w, d) * 0.32;
    const hw = w / 2 - r;
    const hd = d / 2 - r;
    const corner = [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, -Math.PI / 2]];
    const seg = 6;
    const local = [];
    corner.forEach(([x, z, a0]) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        local.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
      }
    });
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    for (let i = 0; i < local.length; i++) {
      const [x0, z0] = local[i];
      const [x1, z1] = local[(i + 1) % local.length];
      pts.push(
        cx + x0 * ca - z0 * sa, 0, cz + x0 * sa + z0 * ca,
        cx + x1 * ca - z1 * sa, 0, cz + x1 * sa + z1 * ca,
      );
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const ls = new THREE.LineSegments(geo);
  ls.userData.isWire = true;
  return ls;
}

/**
 * 元件组：一排排直立的圆柱 + 六角螺母，装在盘的开口里
 * 合并成一个几何体，保证只有一个 drawcall，且能正常生成轮廓线
 */
