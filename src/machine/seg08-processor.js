/* ==========================================================================
   段 08 · 处理器段（参考图第 ⑥ 号件：Quantum Amplifier）

   底部那坨东西：一排穿孔刀片机箱 + 顶面螺栓阵列 + 挂在下面的量子放大器盒，
   盒底再接样品杆和量子芯片。整机最下面是一圈支脚站到地面线上。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { bladeRack, chip, connectorBlock, holeLoops, mergeGeos } from '../parts/index.js';
import { D } from './dims.js';

const TAU = Math.PI * 2;

export function buildProcessor() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  const rackH = D.chassisTop - D.chassisBot;
  const yMid = (D.chassisTop + D.chassisBot) / 2;

  /* 1. 机箱本体：一排立着的穿孔刀片 */
  add(bladeRack({
    count: 6, w: 0.052, h: rackH, d: 0.400, gap: 0.026, seed: 6,
  }), 0, yMid, 0);

  /* 2. 机箱顶面的螺栓阵列 */
  const bolts = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      bolts.push([(i - 2) * 0.068, (j - 1) * 0.100, 0.0060, D.chassisTop + 0.0008]);
    }
  }
  add(holeLoops(bolts, 8), 0, 0, 0);

  /* 3. 量子放大器盒：挂在机箱下面 */
  const caseH = 0.140;
  const caseTop = D.chassisBot;
  const caseGeos = [];
  /* 参考照片里最底下一根粗银色圆筒，不是方箱 */
  const body = new THREE.CylinderGeometry(0.128, 0.128, caseH, 40);
  body.translate(0, caseTop - caseH / 2, 0);
  caseGeos.push(body);
  const lid = new THREE.CylinderGeometry(0.142, 0.142, 0.018, 40);
  lid.translate(0, caseTop - 0.006, 0);
  caseGeos.push(lid);
  const caseMesh = new THREE.Mesh(mergeGeos(caseGeos));
  caseMesh.userData.edgeAngle = 24;
  add(caseMesh, 0, 0, 0);

  /* 盒顶的螺栓点阵 */
  const caseBolts = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      caseBolts.push([(i - 1.5) * 0.050, (j - 0.5) * 0.080, 0.0050, caseTop + 0.0008]);
    }
  }
  add(holeLoops(caseBolts, 8), 0, 0, 0);

  /* 4. 盒侧面的连接器 */
  [[-0.118, 0.034], [0.118, 0.034], [0, 0.034]].forEach(([dx, dz]) => {
    const cb = connectorBlock({ w: 0.042, h: 0.019, d: 0.024, dots: 4 });
    cb.rotation.y = Math.PI / 2;
    add(cb, dx, caseTop - caseH - 0.011, dz);
  });

  /* 5. 样品杆 + 量子芯片（在盒子正下方） */
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.080, 14));
  stem.userData.edgeAngle = 28;
  add(stem, 0, caseTop - caseH - 0.025, 0);

  const c = chip({ w: 0.050, h: 0.005, d: 0.050, bonds: 18 });
  add(c, 0, caseTop - caseH - 0.056, 0);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.010, 28));
  seat.userData.edgeAngle = 26;
  add(seat, 0, caseTop - caseH - 0.063, 0);

  return g;
}
