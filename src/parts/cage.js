/* ==========================================================================
   cage · 线缆瀑布与笼

   参考图里最抢眼的东西：几百根细线从各层模块顶部落下来，
   在机器下半部荡成一个笼子，再收进底部机箱。
   线束一律走 LineSegments（wireBundle / harness 的默认形态），
   线稿风格下才够细、够密、够便宜。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { V, rng } from './utilities.js';
import { harness } from './cables.js';

const TAU = Math.PI * 2;

/**
 * 把线束的几何重心挪到原点、位置设在重心上。
 * 拆机动画是按每个直接子构件的位置算方向的，线束如果位置全在原点，
 * 展开时会原地不动 —— 所以每条线束都要有自己的 pivot。
 */
function pivot(obj) {
  obj.geometry.computeBoundingBox();
  const c = new THREE.Vector3();
  obj.geometry.boundingBox.getCenter(c);
  obj.geometry.translate(-c.x, -c.y, -c.z);
  obj.position.copy(c);
  return obj;
}

/**
 * 从某层盘面往下一路垂到 target 的一组线束。
 * levels: [[y, radius], ...] 由上到下；每束在该层取一个角度，角度缓慢漂移。
 */
export function dropBundles({
  levels, yEnd, strands = 6, count = 8, a0 = 0, a1 = 6.0, radiusScale = 1.0,
  bow = 0.12, seed = 11, spread = 1.2, radius = 0.006,
}) {
  const g = [];
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const a = a0 + (a1 - a0) * t;
    const pts = levels.map(([y, r], k) => {
      const tt = k / Math.max(1, levels.length - 1);
      const aa = a + (rand() - 0.5) * 0.35 + tt * 0.5;
      const rr = r * radiusScale * (0.86 + rand() * 0.22) * (1 + bow * tt);
      return V(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
    });
    pts.push(V(
      Math.cos(a + 1.1) * (radiusScale * bow * 3.2),
      yEnd,
      Math.sin(a + 1.1) * (radiusScale * bow * 3.2),
    ));
    g.push(pivot(harness({ points: pts, strands, radius, swirl: 0.35, spread, samples: 26 })));
  }
  return g;
}

/**
 * 底部线笼：绕机器一圈荡出去的闭环线束。
 * 参考图里下半部分的那个「篮子」就是这个。
 */
export function cableBasket({
  yTop, yBot, rIn = 0.20, rOut = 0.34, loops = 14, strands = 5, seed = 21, spread = 2.0,
}) {
  const g = [];
  const rand = rng(seed);
  for (let i = 0; i < loops; i++) {
    const a = (i / loops) * TAU + rand() * 0.2;
    const bulge = 0.86 + rand() * 0.32;
    const yMid = (yTop + yBot) / 2;
    const pts = [
      V(Math.cos(a) * rIn, yTop, Math.sin(a) * rIn),
      V(Math.cos(a + 0.5) * rIn * 1.25, yTop - (yTop - yMid) * 0.55, Math.sin(a + 0.5) * rIn * 1.25),
      V(Math.cos(a + 1.15) * rOut * bulge, yMid, Math.sin(a + 1.15) * rOut * bulge),
      V(Math.cos(a + 1.85) * rOut * bulge * 0.95, yBot + (yMid - yBot) * 0.4, Math.sin(a + 1.85) * rOut * bulge * 0.95),
      V(Math.cos(a + 2.5) * rIn * 0.9, yBot, Math.sin(a + 2.5) * rIn * 0.9),
    ];
    g.push(pivot(harness({ points: pts, strands, radius: 0.005, swirl: 0.3, spread, samples: 30 })));
  }
  return g;
}

/** 一条单独的、绕机器小半圈的散线（补密度用） */
export function strayWire({ y, r, a0, a1, lift = 0.05, seed = 31 }) {
  const rand = rng(seed);
  const pts = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + (a1 - a0) * t;
    const rr = r * (0.9 + rand() * 0.3);
    pts.push(V(Math.cos(a) * rr, y + lift * t + (rand() - 0.5) * 0.02, Math.sin(a) * rr));
  }
  return pivot(harness({ points: pts, strands: 1, radius: 0.003, swirl: 0.2, spread: 0.2, samples: 22 }));
}
