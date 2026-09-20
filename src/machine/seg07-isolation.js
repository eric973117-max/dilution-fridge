/* ==========================================================================
   段 07 · 隔离与放大段

   按修正后的规格：**六个方箱环形均布**，吊在最后一层盘下面，
   每个箱子上引出一束接线（照片里箱面是一排排端子和扇形散线）。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { mergeGeos, holeLoops } from '../parts/index.js';
import { BOX, BOX_COUNT } from './ref-dims.js';
import { D } from './dims.js';

const TAU = Math.PI * 2;

/**
 * 滤波/接线盒：一块扁立板，外侧面正中一颗安装螺栓，
 * 上边缘一列金端子，每个端子引一根白线绕圈回到上面那块盘。
 */
function moduleBox({ seed = 1 }) {
  const g = new THREE.Group();
  const { w, h, d, rows } = BOX;

  /* 盒体（扁板） */
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  body.userData.edgeAngle = 24;
  g.add(body);

  /* 外侧面的安装螺栓 */
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12));
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(0, 0, d / 2 + 0.002);
  bolt.userData.edgeAngle = 28;
  g.add(bolt);

  /* 两侧竖排的端子 + 从端子近乎竖直往上收的线 */
  const geos = [];
  const dots = [];
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? -1 : 1;
    for (let k = 0; k < rows; k++) {
      const y0 = (k / Math.max(1, rows - 1) - 0.5) * h * 0.74;
      const x0 = sx * (w / 2 - 0.008);
      const z0 = d / 2;

      /* 端子：从盒子侧棱横向伸出的小柱 */
      const seat = new THREE.CylinderGeometry(0.0075, 0.0075, 0.026, 10);
      seat.rotateZ(Math.PI / 2);
      seat.translate(x0 + sx * 0.013, y0, z0);
      geos.push(seat);
      dots.push([x0 + sx * 0.026, y0, 0.0035, 0]);

      /* 线：从端子出来几乎竖直地往上收，中途只有很缓的弯（不是绕圈） */
      const reach = 0.055 + (k % 2) * 0.012;
      const pts = [
        new THREE.Vector3(x0 + sx * 0.026, y0, z0),
        new THREE.Vector3(x0 + sx * 0.040, y0 + reach * 0.5, z0 + 0.004),
        new THREE.Vector3(x0 + sx * 0.020, y0 + reach, z0 + 0.010),
        new THREE.Vector3(sx * 0.016, y0 + reach * 1.7, z0 + 0.014),
      ];
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
      geos.push(new THREE.TubeGeometry(curve, 18, 0.0012, 5, false));
    }
  }
  const m = new THREE.Mesh(mergeGeos(geos));
  m.userData.edgeAngle = 40;
  g.add(m);
  g.add(holeLoops(dots, 7));

  void seed;
  return g;
}

export function buildIsolation() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* 六个方箱：环形均布在最后一层盘下面 */
  const yBox = (D.p5 + D.chassisBot) / 2;
  for (let i = 0; i < BOX_COUNT; i++) {
    const a = (i / BOX_COUNT) * TAU + 0.26;
    const m = moduleBox({ seed: 200 + i * 13 });
    m.rotation.y = -a;
    add(m, Math.cos(a) * BOX.ringR, yBox, Math.sin(a) * BOX.ringR);
  }

  return g;
}
