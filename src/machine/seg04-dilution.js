/* ==========================================================================
   段 04 · 稀释循环段（参考图第 ③ 号件：Mixing Chamber）

   中央那根阶梯柱：一串直径递减的圆盘叠下来，中间夹一段波纹肋管，
   最外面是贯穿全高的中央支撑管。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { ring, ribbedTube, rod } from '../parts/index.js';
import { D } from './dims.js';

/** 阶梯柱的每一级：y 相对第三个盘往下排 */
const STEPS = [
  { dy: -0.100, r: 0.140, h: 0.094 },
  { dy: -0.230, r: 0.130, h: 0.094 },
  { dy: -0.360, r: 0.115, h: 0.090 },
  { dy: -0.485, r: 0.100, h: 0.086 },
  { dy: -0.605, r: 0.085, h: 0.082 },
];

export function buildDilutionCircuit() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* 1. 阶梯柱 */
  STEPS.forEach((s, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.96, s.h, 28));
    m.userData.edgeAngle = 26;
    add(m, 0, D.p3 + s.dy, 0);
    add(ring({ r: s.r * 1.07, h: 0.006 }), 0, D.p3 + s.dy + s.h / 2 + 0.003, 0);
    if (i < STEPS.length - 1) {
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.62, s.r * 0.62, 0.040, 20));
      neck.userData.edgeAngle = 28;
      add(neck, 0, D.p3 + s.dy - s.h / 2 - 0.020, 0);
    }
  });

  /* 2. 肋管段：夹在最后一层盘和阶梯柱之间 */
  add(ribbedTube({ r: 0.090, h: 0.240, ribs: 7, amp: 0.15 }), 0, D.p4 + 0.055, 0);

  /* 3. 中央支撑管：贯穿全高 */
  const h = D.top - D.chassisTop - 0.10;
  add(rod({ r: 0.038, h, seg: 22 }), 0, (D.top + D.chassisTop) / 2, 0);

  return g;
}
