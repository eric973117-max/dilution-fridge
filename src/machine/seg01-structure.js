/* ==========================================================================
   段 01 · 结构承载段

   按参考图（quantumcomputer_01…08 / 28b26779）重建的四类零件：
     ① 金盘：薄盘 + 外圈大减重孔 + 盘缘金环边
     ② 焊盘 + 柱簇：每盘一圈凸起的金焊盘，每盘站一簇接线柱
     ③ 导线环：每根线垂下来在半空绕一个整圈再继续 —— 这台机器的招牌
     ④ 立柱 + 金箍：六根，每穿过一块盘套一个箍
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { discPlate, mergeGeos, ribbedTube, rng } from '../parts/index.js';
import { padCluster, wireLoopGeo, postGeo } from '../parts/pins.js';
import { D } from './dims.js';
import { PLATES, ROD_R, ROD_COUNT, ROD_PHASE } from './frame.js';
import { POST } from './ref-dims.js';

const TAU = Math.PI * 2;

const BIG_HOLES = 12;    // 每盘外圈大减重孔
const PAD_COUNT = 10;    // 每盘焊盘簇数
const PINS = 14;         // 每簇接线柱数
const WIRES = 30;        // 每层带环垂线数
const CURTAIN = [[0.10, 30], [0.18, 40], [0.26, 50], [0.33, 58]];

export function buildStructuralFrame() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  /* ---------------- ① 五块金盘 ---------------- */
  PLATES.forEach((p) => {
    const big = [];
    for (let i = 0; i < BIG_HOLES; i++) {
      const a = (i / BIG_HOLES) * TAU + 0.10;
      big.push([Math.cos(a) * p.r * 0.84, Math.sin(a) * p.r * 0.84, p.r * 0.076]);
    }
    add(discPlate({
      r: p.r, t: D.plateT, bore: p.r * 0.15,
      pockets: [], bolts: 0, dots: 0, extraHoles: big,
    }), 0, p.y, 0);

    /* 盘缘金环边 */
    const rim = new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.007, 0.0065, 6, 76));
    rim.rotation.x = Math.PI / 2;
    rim.userData.edgeAngle = 36;
    add(rim, 0, p.y, 0);
  });

  /* 顶法兰：同款，只是更大更厚 */
  const topBig = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + 0.08;
    topBig.push([Math.cos(a) * R_TOP() * 0.84, Math.sin(a) * R_TOP() * 0.84, R_TOP() * 0.062]);
  }
  add(discPlate({
    r: R_TOP(), t: 0.020, bore: R_TOP() * 0.18,
    pockets: [], bolts: 0, dots: 0, extraHoles: topBig,
  }), 0, D.top, 0);

  /* ---------------- ② 焊盘 + 柱簇 ---------------- */
  PLATES.forEach((p, pi) => {
    const y = p.y + D.plateT / 2;
    for (let i = 0; i < PAD_COUNT; i++) {
      const a = (i / PAD_COUNT) * TAU + (pi % 2) * 0.16;
      const rr = p.r * 0.60;
      const m = padCluster({ padR: 0.050, pins: PINS, spread: 0.034, seed: 11 + pi * 31 + i * 7 });
      m.rotation.y = -a;
      add(m, Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  });

  /* ---------------- ③ 层间：立柱 + 带环垂线 + 帘幕 + 中央波纹柱 ---------------- */
  const gaps = [
    [D.top - 0.020, D.p1], [D.p1, D.p2], [D.p2, D.p3],
    [D.p3, D.p4], [D.p4, D.p5], [D.p5, D.chassisTop],
  ];
  gaps.forEach(([yA, yB], gi) => {
    const midY = (yA + yB) / 2;
    const inner = D.plateT / 2 + 0.004;
    const yTop = yA - inner;
    const yBot = yB + inner;
    const hh = Math.max(0.02, yTop - yBot);

    /* ④ 立柱：不是一根通到底 —— 每一层各自一段，段端带金箍，
       段所在半径跟着这一层上下两块盘里较小的那块走 */
    const upper = PLATES[Math.min(gi, PLATES.length - 1)];
    const lower = PLATES[Math.min(gi + 1, PLATES.length - 1)];
    const pr = Math.min(upper.r, lower.r) * 0.72;
    for (let i = 0; i < ROD_COUNT; i++) {
      const a = (i / ROD_COUNT) * TAU + ROD_PHASE;
      const geo = postGeo({
        h: hh, section: POST.section,
        collarR: POST.collarR, collarH: POST.collarH,
        collars: [POST.collarH * 0.5, hh - POST.collarH * 0.5],
      });
      const m = new THREE.Mesh(geo);
      m.userData.edgeAngle = 28;
      m.rotation.y = -a;
      add(m, Math.cos(a) * pr, midY, Math.sin(a) * pr);
    }

    /* ③ 导线环：每根线自己绕一个整圈 */
    const wires = [];
    const rand = rng(53 + gi * 17);
    const rr0 = 0.60 * (PLATES[Math.min(gi, 4)]?.r ?? 0.34);
    for (let i = 0; i < WIRES; i++) {
      const a = (i / WIRES) * TAU + rand() * 0.2;
      const rr = rr0 * (0.55 + rand() * 0.85);
      wires.push(wireLoopGeo({
        x: Math.cos(a) * rr, z: Math.sin(a) * rr,
        yTop: yTop - midY, yBot: yBot - midY,
        loopR: 0.026 + rand() * 0.008, tube: 0.0011,
        loopAt: 0.40 + rand() * 0.18, seg: 30,
      }));
    }
    const wm = new THREE.Mesh(mergeGeos(wires));
    wm.userData.edgeAngle = 44;
    add(wm, 0, midY, 0);

    /* 帘幕：几百根细杆 */
    const geos = [];
    CURTAIN.forEach(([rr, n], ri) => {
      for (let i = 0; i < n; i++) {
        if (rand() > 0.88) continue;
        const a = (i / n) * TAU + ri * 0.13 + gi * 0.07 + (rand() - 0.5) * 0.06;
        const rad = 0.0011 + rand() * 0.0015;
        const geo = new THREE.CylinderGeometry(rad, rad, hh, 5, 1, true);
        geo.translate(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        geos.push(geo);
      }
    });
    const curtain = new THREE.Mesh(mergeGeos(geos));
    curtain.userData.edgeAngle = 34;
    add(curtain, 0, midY, 0);

    /* 中央波纹柱 */
    add(ribbedTube({ r: 0.050, h: hh * 0.98, ribs: 9, amp: 0.18 }), 0, midY, 0);
  });

  return g;
}

/* 顶法兰半径（比最大的盘略大） */
function R_TOP() { return PLATES[2].r * 1.12; }
