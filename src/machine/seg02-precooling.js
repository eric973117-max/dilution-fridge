/* ==========================================================================
   段 02 · 预冷段（参考图第 ① 号件：Pulse Tube Coolers）

   顶上那一坨：一块大方机头 + 两根带散热片的脉冲管 + 两侧散热块 + 一根 U 形软管。
   脉冲管制冷机提供第一级冷却，把这一级拉到 4 K —— 它是整台机器唯一"自己制冷"的部件，
   底下所有级都靠它往下带。第一层盘的开口里再塞立管束和盘管（输入微波线）。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { tubeBank, coilStack, mergeGeos, V, holeLoops } from '../parts/index.js';
import { D } from './dims.js';
import { plateOf, pocketAt } from './frame.js';

/** 带散热片的立筒 */
function finnedTube({ r = 0.024, h = 0.16, fins = 13, finR = 0.036 }) {
  const geos = [new THREE.CylinderGeometry(r, r, h, 18)];
  for (let i = 0; i < fins; i++) {
    const f = new THREE.CylinderGeometry(finR, finR, 0.0035, 22);
    f.translate(0, -h / 2 + 0.014 + i * ((h - 0.028) / Math.max(1, fins - 1)), 0);
    geos.push(f);
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 28;
  return m;
}

export function buildPreCooling() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* 1. 顶部机头：参考图顶上那块白箱 */
  const headH = D.headTop - D.headBot;
  /* 参考照片顶上是一只抛光不锈钢大鼓，不是方箱 */
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.470, 0.470, headH, 72));
  head.userData.edgeAngle = 24;
  add(head, 0, (D.headTop + D.headBot) / 2, 0);
  /* 机头顶面打一片螺栓点阵：参考图里它是一块压得住画面的实心白板 */
  const headDots = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    for (let k = 0; k < 3; k++) {
      const rr = 0.400 + k * 0.030;
      headDots.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.0055, D.headTop + 0.0010]);
    }
  }
  add(holeLoops(headDots, 8), 0, 0, 0);

  /* 2. 两根脉冲管：从机头吊到第一层盘上方 */
  const ptH = D.headBot - D.p1 - 0.015;
  [-0.150, 0.150].forEach((x) => {
    add(finnedTube({ r: 0.042, h: ptH, fins: 13, finR: 0.064 }), x, D.headBot - ptH / 2, 0);
  });

  /* 3. 两侧散热块：立着的方箱 + 一叠散热片 */
  [-0.278, 0.278].forEach((x) => {
    const geos = [new THREE.BoxGeometry(0.092, 0.190, 0.092)];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.BoxGeometry(0.106, 0.011, 0.106);
      f.translate(0, -0.078 + i * 0.030, 0);
      geos.push(f);
    }
    const m = new THREE.Mesh(mergeGeos(geos));
    m.userData.edgeAngle = 26;
    add(m, x, D.headBot - 0.140, 0);
  });

  /* 4. U 形软管：参考图右上方那根弯管 */
  const C = V(0.212, D.headBot - 0.104, 0.022);
  const hosePts = [
    V(0.238, D.headBot - 0.014, -0.061),
    V(0.284, D.headBot - 0.099, 0.011),
    V(0.223, D.headBot - 0.176, 0.079),
    V(0.137, D.headBot - 0.194, 0.040),
  ].map((p) => V(p.x - C.x, p.y - C.y, p.z - C.z));
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 28, 0.013, 8, false));
  hose.userData.edgeAngle = 40;
  add(hose, C.x, C.y, C.z);

  /* 5. 第一层盘开口里的立管束（输入微波线） */
  const p1 = plateOf('p1');
  const yTop = p1.y + D.plateT / 2;
  for (let i = 0; i < p1.count; i++) {
    const { x, z, a } = pocketAt(p1, i);
    const m = tubeBank({ cols: 5, sx: 0.0240, h: 0.115 + (i % 3) * 0.016, seed: 10 + i * 3 });
    m.rotation.y = -a;
    add(m, x, yTop, z);
  }

  /* 6. 盘面上的盘管 */
  [[0.205, 0.7], [0.215, 2.9], [0.205, 5.0]].forEach(([rr, a], i) => {
    const m = coilStack({ r: 0.060, turns: 6, gap: 0.023, tube: 0.0050, seed: 20 + i * 5 });
    add(m, Math.cos(a) * rr, yTop + 0.024, Math.sin(a) * rr);
  });

  return g;
}
