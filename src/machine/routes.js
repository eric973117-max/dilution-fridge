/* ==========================================================================
   线缆路由
   沿整机下行的路径生成器，被 05 / 06 两段共用。
   —— 由 src/machine.js 拆分而来，几何与数值逻辑与拆分前逐字一致。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import {
  rod, helix, rng,
} from '../parts/index.js';
import {
  lerp,
} from './palette.js';

/** 沿整机的螺旋下行路由：每一级盘面取一个点，角度缓慢漂移 —— 形成瀑布式垂落 */
export function cascadeRoute({ levels, a0, a1, radiusScale = 1.06, seed = 1 }) {
  const rand = rng(seed);
  const pts = [];
  const n = levels.length;
  levels.forEach((lv, i) => {
    const t = i / (n - 1);
    const a = lerp(a0, a1, t) + (rand() - 0.5) * 0.35;
    const r = lv[1] * radiusScale * (0.92 + rand() * 0.22);
    pts.push([Math.cos(a) * r, lv[0], Math.sin(a) * r]);
  });
  return pts;
}


/**
 * 一段「穿级微波链路」—— 量子芯片版本才有、也是这台机器最标志性的东西
 * （参考 Bluefors 官网 coax_02 / readout 两张实物照）：
 *
 *   上级盘面 ── 金色 SMA 接头（六角螺母朝下）
 *              │ 半刚性同轴下行
 *              ◉ 热化螺旋 —— 绕在小芯棒上的一小段线圈，靠它把线芯的热导到冷盘
 *              │ 半刚性同轴继续下行
 *   下级盘面 ── 金色 SMA 接头
 *
 * 之前完全没有这一段，所以整机看着像「一堆盘」而不是「一柱穿级微波链路」。
 */
export function coaxRun({ yTop, yBot, x, z, seed = 1, coils = 7 }) {
  const g = new THREE.Group();
  const rand = rng(seed);
  const gap = yTop - yBot;
  const mid = (yTop + yBot) / 2;
  const coilH = Math.min(0.070, gap * 0.42);
  const coilTop = mid + coilH / 2;
  const coilBot = mid - coilH / 2;
  const coaxR = 0.0011;

  /* 上级 SMA：六角螺母 + 圆柱本体 + 中心针，整体朝下 */
  const top = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0062, 6));
  nut.userData.edgeAngle = 40;
  top.add(nut);
  const body = rod({ r: 0.0029, h: 0.018, seg: 12 });
  body.position.y = -0.012;
  top.add(body);
  const pin = rod({ r: 0.0007, h: 0.010, seg: 8 });
  pin.position.y = -0.026;
  top.add(pin);
  top.position.set(x, yTop - 0.005, z);
  g.add(top);

  /* 上段同轴 */
  const upH = (yTop - 0.032) - coilTop;
  if (upH > 0.004) {
    const t = rod({ r: coaxR, h: upH, seg: 8 });
    t.position.set(x, coilTop + upH / 2, z);
    g.add(t);
  }

  /* 热化螺旋 + 芯棒 */
  const coil = helix({ r: 0.0092, h: coilH, turns: coils, tubeR: coaxR, seg: 110 });
  coil.position.set(x, mid, z);
  g.add(coil);
  const mandrel = rod({ r: 0.0032, h: coilH * 0.94, seg: 10 });
  mandrel.position.set(x, mid, z);
  g.add(mandrel);

  /* 下段同轴 */
  const dnH = coilBot - (yBot + 0.020);
  if (dnH > 0.004) {
    const t = rod({ r: coaxR, h: dnH, seg: 8 });
    t.position.set(x, yBot + 0.020 + dnH / 2, z);
    g.add(t);
  }

  /* 下级 SMA（朝上装在盘面上） */
  const bot = new THREE.Group();
  const nut2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0062, 6));
  nut2.userData.edgeAngle = 40;
  bot.add(nut2);
  const body2 = rod({ r: 0.0029, h: 0.015, seg: 12 });
  body2.position.y = 0.010;
  bot.add(body2);
  bot.position.set(x, yBot + 0.004, z);
  g.add(bot);

  /* 每根线的角度微扰，实物不是等分的 */
  g.rotation.y = (rand() - 0.5) * 0.10;
  return g;
}

