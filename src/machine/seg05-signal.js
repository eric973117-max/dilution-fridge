/* ==========================================================================
   段 05 · 信号输入段

   参考图里最抢眼的那件事：几百根细线从各层模块顶部落下来，
   在机器下半部荡成一个笼子，再收进底部机箱。
   外加二、三层开口里的同轴模块。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { coaxModule, dropBundles, cableBasket, strayWire } from '../parts/index.js';
import { D, R } from './dims.js';
import { plateOf, pocketAt } from './frame.js';

export function buildSignalDistribution() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* 1. 第二、三层开口里的同轴模块 */
  ['p2', 'p3'].forEach((key, pi) => {
    const p = plateOf(key);
    const y = p.y + D.plateT / 2;
    for (let i = 0; i < p.count; i++) {
      const { x, z, a } = pocketAt(p, i);
      const m = coaxModule({
        h: 0.110 + (i % 3) * 0.019,
        r: 0.0140,
        nutR: 0.0200,
        collars: 2,
        tails: 2,
        seed: 40 + pi * 23 + i * 5,
        tailLen: 0.120 + (i % 4) * 0.021,
      });
      m.rotation.y = -a;
      add(m, x, y, z);
    }
  });

  /* 2. 从各层垂下来的线束 */
  dropBundles({
    levels: [[D.p1, R.p1], [D.p2, R.p2], [D.p3, R.p3], [D.p4, R.p4]],
    yEnd: D.chassisTop + 0.03,
    count: 18, strands: 8, radius: 0.010, bow: 0.18, radiusScale: 1.06,
    seed: 51, spread: 1.5,
  }).forEach((h) => g.add(h));

  /* 2b. 主瀑布：几股粗线束甩到盘外，一路垂过机箱 —— 参考图里最抢眼的那坨 */
  dropBundles({
    levels: [[D.p2, R.p2], [D.p3, R.p3], [D.p4, R.p4], [D.p5, R.p5]],
    yEnd: D.chassisBot - 0.05,
    count: 9, strands: 14, radius: 0.020, bow: 0.26, radiusScale: 1.18,
    a0: -1.05, a1: 1.05,
    seed: 55, spread: 2.6,
  }).forEach((h) => g.add(h));

  /* 3. 底部线笼 */
  cableBasket({
    yTop: D.p4 + 0.06, yBot: D.chassisBot - 0.02,
    rIn: 0.260, rOut: 0.420, loops: 18, strands: 8, seed: 61, spread: 2.2,
  }).forEach((h) => g.add(h));

  /* 4. 散线：补密度 */
  for (let i = 0; i < 12; i++) {
    const rr = 0.230 + (i % 3) * 0.035;
    g.add(strayWire({
      y: D.p3 - 0.03 - (i % 4) * 0.04,
      r: rr,
      a0: i * 0.62,
      a1: i * 0.62 + 2.1,
      lift: 0.05,
      seed: 70 + i * 7,
    }));
  }

  void add;
  return g;
}
