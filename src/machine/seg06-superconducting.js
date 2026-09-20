/* ==========================================================================
   段 06 · 超导传输段（参考图第 ④ 号件：Superconducting Coaxial Lines）

   两组大线圈组挂在第三层盘下面，轴向朝外 —— 剖面里看到的就是
   左右各一簇圆环。最下一层盘的开口里再铺小线圈。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { coilStack } from '../parts/index.js';
import { D } from './dims.js';
import { plateOf, pocketAt } from './frame.js';

export function buildSuperconductingLink() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* 1. 两组大线圈：轴沿 X，横躺在第三层盘下面 */
  const yBig = D.p3 - 0.230;
  [-0.185, 0.185].forEach((x, i) => {
    const m = coilStack({ r: 0.088, turns: 7, gap: 0.028, tube: 0.0060, seed: 80 + i * 11 });
    m.rotation.z = Math.PI / 2;      // 堆叠方向从 Y 转到 X
    m.userData.edgeAngle = 34;
    add(m, x, yBig, 0);
    /* 中央的支撑管 */
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.175, 14));
    core.rotation.z = Math.PI / 2;
    core.userData.edgeAngle = 28;
    add(core, x, yBig, 0);
  });

  /* 2. 第四层盘开口里的小线圈 */
  const p4 = plateOf('p4');
  const y4 = p4.y + D.plateT / 2;
  for (let i = 0; i < p4.count; i++) {
    const { x, z, a } = pocketAt(p4, i);
    const m = coilStack({ r: 0.052, turns: 4, gap: 0.019, tube: 0.0042, seed: 90 + i * 7 });
    m.rotation.y = -a;
    add(m, x, y4 + 0.026, z);
  }

  /* 3. 从第二层盘直落到底的几束长同轴线 */
  const routes = 6;
  for (let i = 0; i < routes; i++) {
    const a = (i / routes) * Math.PI * 2 + 0.4;
    const seg = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const y = D.p2 - (D.p2 - D.p5) * t;
      const rr = 0.225 + Math.sin(t * Math.PI) * 0.055;
      seg.push(new THREE.Vector3(Math.cos(a + t * 0.5) * rr, y, Math.sin(a + t * 0.5) * rr));
    }
    const curve = new THREE.CatmullRomCurve3(seg);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.0068, 6, false));
    tube.userData.edgeAngle = 40;
    const c = seg[2].clone();
    tube.geometry.translate(-c.x, -c.y, -c.z);
    add(tube, c.x, c.y, c.z);
  }

  return g;
}
