/* ==========================================================================
   solids · 盘 / 筒 / 杆 / 盒 / 波纹管 / 螺旋 / 环
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { V } from './utilities.js';

/* --------------------------------------------------------------- solids */

/** 安装盘 / 温区板：圆盘 + 环形孔位 */
export function plate({ r, t, holeRings = [], holeR = 0.004, seg = 96 }) {
  const g = new THREE.Group();

  const disk = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, seg, 1));
  disk.userData.edgeAngle = 24;
  g.add(disk);

  /* 盘面上的减重孔 / 走线孔：用环形轮廓线表达，成本低于布尔运算 */
  if (holeRings.length) {
    const pts = [];
    const steps = 20;
    holeRings.forEach(([hx, hz, hr = holeR]) => {
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * Math.PI * 2;
        const a1 = ((i + 1) / steps) * Math.PI * 2;
        pts.push(
          hx + Math.cos(a0) * hr, t / 2 + 0.0004, hz + Math.sin(a0) * hr,
          hx + Math.cos(a1) * hr, t / 2 + 0.0004, hz + Math.sin(a1) * hr,
        );
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const holes = new THREE.LineSegments(geo);
    holes.userData.isWire = true;
    g.add(holes);
  }

  g.userData.kind = 'plate';
  return g;
}

/** 真空罩 / 屏蔽筒：开口薄壁圆柱 */
export function shell({ r, h, seg = 96 }) {
  const geo = new THREE.CylinderGeometry(r, r, h, seg, 1, true);
  const m = new THREE.Mesh(geo);
  m.userData.edgeAngle = 40;
  m.userData.isShell = true;
  return m;
}

export function rod({ r, h, seg = 20 }) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1));
  m.userData.edgeAngle = 30;
  return m;
}

export function box({ w, h, d }) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  m.userData.edgeAngle = 10;
  return m;
}

/** 波纹管：正弦位移的旋转体 */
export function ribbedTube({ r, h, ribs = 5, amp = 0.14, seg = 64 }) {
  const pts = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const rr = r * (1 + Math.sin(t * Math.PI * 2 * ribs) * amp);
    pts.push(new THREE.Vector2(rr, -h / 2 + t * h));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg));
  m.userData.edgeAngle = 46;
  return m;
}

/** 毛细管 / 螺旋盘管 */
export function helix({ r, h, turns, tubeR = 0.0022, seg = 180, radial = 6 }) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = t * Math.PI * 2 * turns;
    pts.push(V(Math.cos(a) * r, -h / 2 + t * h, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, seg, tubeR, radial, false);
  const m = new THREE.Mesh(geo);
  m.userData.edgeAngle = 60;
  return m;
}

/**
 * 回绕线环：半刚性同轴从上一级下来，在盘下绕一个 U 再回到上面去。
 * 实物每一级都挂一圈这种东西做热化 —— 参考照片里最好认的纹理，之前完全没做。
 */
export function wireLoop({ w = 0.048, d = 0.062, tubeR = 0.0011, seg = 20, lean = 0 }) {
  const pts = [
    V(-w / 2, 0, 0),
    V(-w / 2, -d * 0.52, lean * 0.3),
    V(-w * 0.26, -d, lean * 0.6),
    V(w * 0.26, -d, lean * 0.6),
    V(w / 2, -d * 0.52, lean * 0.3),
    V(w / 2, 0, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.42);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, tubeR, 4, false));
  m.userData.edgeAngle = 60;
  return m;
}

export function torus({ r, tube, seg = 48, tseg = 10 }) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, tseg, seg));
  m.rotation.x = Math.PI / 2;
  m.userData.edgeAngle = 40;
  return m;
}

export function ring({ r, thick = 0.004, h = 0.006, seg = 64 }) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg, 1));
  m.userData.edgeAngle = 30;
  return m;
}
