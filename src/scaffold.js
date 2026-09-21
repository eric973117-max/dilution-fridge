/* ==========================================================================
   scaffold · 占位构件（线稿）

   P0 阶段：除了已经迁移过来的稀释制冷机（content/04-fridge），
   其余各层还没有正式模型，先用**线稿占位构件**把版面、时间轴、相机、双语
   全部跑通 —— 一眼就能看出"这一层以后要长成什么样"，也方便逐层替换：
   模块只要把自己的 build() 换掉，别的地方一行都不用改。

   所有构件都是自己用 three.js 画出来的线，不引用任何外部模型或贴图。
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';

/* ------------------------------------------------------------------ 基础画法 */

function lineMat(color, opacity = 0.72) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function boxGroup(w, h, d, color, opacity = 0.72) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.EdgesGeometry(geo);
  geo.dispose();
  return new THREE.LineSegments(edges, lineMat(color, opacity));
}

function ringGroup(r, color, { seg = 72, opacity = 0.6 } = {}) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, lineMat(color, opacity));
}

function curveGroup(points, color, { opacity = 0.55 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
  return new THREE.Line(geo, lineMat(color, opacity));
}

function boundsOf(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return { yMin: -1, yMax: 1, height: 2, centerY: 0, width: 2 };
  return {
    yMin: box.min.y,
    yMax: box.max.y,
    height: box.max.y - box.min.y,
    centerY: (box.min.y + box.max.y) / 2,
    /* width 给手机端用：窄屏只按高度取景的话，横着一排机柜会伸出屏幕 */
    width: box.max.x - box.min.x,
  };
}

/* ------------------------------------------------------------------ 占位构件 */

/** 一排机柜（云端 / 编排层）：箱体 + 前面板横线 + 顶上一条连起来的总线 */
export function rackRow({ color, n = 5 } = {}) {
  const g = new THREE.Group();
  const w = 0.42;
  const gap = 0.12;
  const total = n * w + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const x = -total / 2 + w / 2 + i * (w + gap);
    const box = boxGroup(w, 1.5, 0.7, color, i % 3 === 0 ? 0.85 : 0.6);
    box.position.set(x, 0, 0);
    g.add(box);
    for (let r = 0; r < 4; r++) {
      const bar = boxGroup(w * 0.7, 0.02, 0.01, color, 0.5);
      bar.position.set(x, -0.45 + r * 0.3, 0.36);
      g.add(bar);
    }
  }
  const bus = curveGroup([[-total / 2, 0.82, 0], [0, 0.92, 0], [total / 2, 0.82, 0]], color, { opacity: 0.45 });
  g.add(bus);
  return g;
}

/** 板卡叠层（室温电子学）：几块水平板 + 竖向的机框 */
export function boardStack({ color, n = 5 } = {}) {
  const g = new THREE.Group();
  const w = 1.1;
  const d = 0.6;
  const h = 0.9;
  for (let i = 0; i < n; i++) {
    const y = -h / 2 + (i / (n - 1)) * h;
    const slab = boxGroup(w, 0.03, d, color, i === 2 ? 0.9 : 0.62);
    slab.position.set(0, y, 0);
    g.add(slab);
    /* 板上的器件：几个小方块 */
    for (let k = 0; k < 5; k++) {
      const chip = boxGroup(0.06, 0.03, 0.06, color, 0.5);
      chip.position.set(-0.4 + k * 0.2, y + 0.03, 0.1);
      g.add(chip);
    }
  }
  [-1, 1].forEach((s) => {
    const rail = boxGroup(0.03, h + 0.12, 0.03, color, 0.75);
    rail.position.set(s * (w / 2 + 0.06), 0, d / 2);
    g.add(rail);
    const rail2 = rail.clone();
    rail2.position.z = -d / 2;
    g.add(rail2);
  });
  return g;
}

/** 下垂线束（信号链上段）：一束从顶部收拢、往下散开的同轴线 */
export function cableLoom({ color, n = 11 } = {}) {
  const g = new THREE.Group();
  const top = 0.9;
  const bottom = -0.9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rTop = 0.16 + (i % 3) * 0.01;
    const rMid = 0.34 + (i % 4) * 0.02;
    const rBot = 0.5 + (i % 5) * 0.02;
    g.add(curveGroup([
      [Math.cos(a) * rTop, top, Math.sin(a) * rTop],
      [Math.cos(a + 0.35) * rMid, 0, Math.sin(a + 0.35) * rMid],
      [Math.cos(a + 0.8) * rBot, bottom, Math.sin(a + 0.8) * rBot],
    ], color, { opacity: 0.5 }));
  }
  [top, 0, bottom].forEach((y, k) => {
    const r = [0.18, 0.36, 0.52][k];
    const ring = ringGroup(r, color, { opacity: 0.35 });
    ring.position.y = y;
    g.add(ring);
  });
  return g;
}

/** 冷板叠层（低温信号链）：六级盘 + 三根支撑杆 + 一串器件 */
export function coldLadder({ color, n = 6 } = {}) {
  const g = new THREE.Group();
  const top = 0.85;
  const bottom = -0.85;
  const radii = [0.62, 0.56, 0.5, 0.42, 0.34, 0.26];
  for (let i = 0; i < n; i++) {
    const y = top + (i / (n - 1)) * (bottom - top);
    const r = radii[i % radii.length];
    const ring = ringGroup(r, color, { opacity: i === n - 1 ? 0.9 : 0.5 });
    ring.position.y = y;
    g.add(ring);
    const disc = ringGroup(r * 0.42, color, { opacity: 0.28 });
    disc.position.y = y;
    g.add(disc);
    /* 挂在板边上的器件（环行器 / 放大器 / 衰减器） */
    const dev = boxGroup(0.1, 0.05, 0.07, color, 0.6);
    dev.position.set(r * 0.72, y + 0.03, 0);
    g.add(dev);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const rod = boxGroup(0.02, top - bottom, 0.02, color, 0.45);
    rod.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
    g.add(rod);
  }
  return g;
}

/** 芯片与封装（量子处理器）：载板 + 裸片 + 焊盘阵列 + 引出的键合线 */
export function chipDie({ color, px = 10, py = 10 } = {}) {
  const g = new THREE.Group();
  const carrier = boxGroup(1.0, 0.06, 0.9, color, 0.6);
  carrier.position.y = -0.06;
  g.add(carrier);
  const die = boxGroup(0.52, 0.03, 0.52, color, 0.95);
  g.add(die);
  for (let i = 0; i < px; i++) {
    for (let j = 0; j < py; j++) {
      const p = boxGroup(0.01, 0.012, 0.01, color, 0.35);
      p.position.set(-0.22 + (i / (px - 1)) * 0.44, 0.02, -0.22 + (j / (py - 1)) * 0.44);
      g.add(p);
    }
  }
  /* 键合线：从裸片四边拉到载板 */
  for (let i = 0; i < 12; i++) {
    const t = -0.25 + (i / 11) * 0.5;
    g.add(curveGroup([[t, 0.02, 0.26], [t, 0.09, 0.33], [t * 1.6, 0.02, 0.42]], color, { opacity: 0.45 }));
    g.add(curveGroup([[t, 0.02, -0.26], [t, 0.09, -0.33], [t * 1.6, 0.02, -0.42]], color, { opacity: 0.45 }));
  }
  return g;
}

/** 脉冲序列（校准 / 应用层）：一条带包络的波形 */
export function pulseTrain({ color, n = 7 } = {}) {
  const g = new THREE.Group();
  const span = 1.9;
  const pts = [];
  for (let x = -span / 2; x <= span / 2; x += 0.02) {
    pts.push(new THREE.Vector3(x, 0, 0));
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color, 0.35)));
  for (let i = 0; i < n; i++) {
    const x0 = -span / 2 + 0.16 + (i / n) * (span - 0.32);
    const w = 0.05 + (i % 2) * 0.03;
    const h = 0.22 + (i % 3) * 0.16;
    g.add(curveGroup([
      [x0 - w, 0, 0], [x0 - w * 0.5, h, 0], [x0, h, 0], [x0 + w, 0, 0],
    ], color, { opacity: 0.85 }));
  }
  return g;
}

/** 节点网络（虚拟化 / 编排）：几个节点 + 连线 */
export function nodeWeb({ color, n = 9 } = {}) {
  const g = new THREE.Group();
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.55 + (i % 2) * 0.22;
    const y = Math.sin(i * 1.7) * 0.45;
    nodes.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  nodes.forEach((p) => {
    const dot = boxGroup(0.09, 0.09, 0.09, color, 0.85);
    dot.position.set(...p);
    g.add(dot);
  });
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i + 3) % nodes.length];
    g.add(curveGroup([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.12, (a[2] + b[2]) / 2], b], color, { opacity: 0.4 }));
  }
  return g;
}

/* -------------------------------------------------------- 挂到舞台的公共动作 */

/** 把占位构件挂进场景，并把取景交给 stage（各层模块共用） */
export function mount(ctx, group, { margin = 0.2 } = {}) {
  const b = boundsOf(group);
  ctx.scene.add(group);
  ctx.stage.setFraming({
    yMin: b.yMin,
    yMax: b.yMax,
    margin,
    ground: null,
    top: null,
    plateYs: [],
    marks: [],
  });
  return b;
}

export const bounds = boundsOf;
