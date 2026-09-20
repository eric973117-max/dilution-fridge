/* ==========================================================================
   Stage · 正交制图相机 / 灯光 / 地面线 / 尺寸标注 / 中心虚线轴
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';
import { XLD, MODEL_BOUNDS, STAGE_MARKS } from './machine/dims.js';

/* 正交相机纵向可视高度（米）。
   取景高度跟着 MODEL_BOUNDS 走 —— 那个区间是机器装配完成后的实测包围盒
   （再加 MODEL_BOUNDS.margin 的取景留白，见 dims.js），
   所以取景高度和取景中心都是一次量出来的，改模型尺寸时不用再手调。 */
const VIEW_SIZE = (
  (MODEL_BOUNDS.yMax - MODEL_BOUNDS.yMin) + (MODEL_BOUNDS.margin || 0) * 2
) * 0.96;
const CAM_DIST = 4;

/* 取景中心 = 机器实测范围的中点（XLD v2 装配后 ≈ +0.02 m）。
   main.js 的 camPerScene / data.js 每个段的 cam 里的 ty 都是相对这个中心的
   上下偏移，所以中心跟着模型走，各章机位的手感不会变。 */
const CAM_Y = (MODEL_BOUNDS.yMin + MODEL_BOUNDS.yMax) / 2;

export function createStage(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return { failed: true };
  }
  if (!renderer.getContext()) return { failed: true };

  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const maxDpr = isMobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x252423, 1);
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 24);
  camera.zoom = 1;

  /* --------------------------------------------------------------- lights */
  /* 白模模式需要足够的光才能把形体读出来；线稿模式下填充接近纯黑，光照不影响观感 */
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(0.9, 1.3, 1.1);
  const fill = new THREE.DirectionalLight(0xc9d4ee, 0.28);
  fill.position.set(-1.1, 0.3, 0.6);
  const rim = new THREE.DirectionalLight(0xffffff, 0.22);
  rim.position.set(-0.2, -0.8, -1.0);
  const amb = new THREE.AmbientLight(0xf2f5ff, 0.60);
  scene.add(key, fill, rim, amb);

  /* ------------------------------------------------------- 地面线（图 3） */
  const groundY = XLD.ground;
  const groundPts = [];
  const groundHalf = 0.62;
  groundPts.push(-groundHalf, groundY, 0, groundHalf, groundY, 0);
  for (let i = -4; i <= 4; i++) {
    const x = (i / 4) * groundHalf;
    const len = i === 0 ? 0.05 : 0.022;
    groundPts.push(x, groundY, 0, x, groundY + len, 0);
  }
  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(groundPts, 3));
  const ground = new THREE.LineSegments(groundGeo, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.22,
  }));
  scene.add(ground);

  /* ----------------------------------------------------- 尺寸标注（左侧） */
  const dimPts = [];
  const dimX = -0.680;   // 要让开顶法兰外沿（Ø1000）
  const levels = STAGE_MARKS;
  dimPts.push(dimX, XLD.plates[0] + 0.02, 0, dimX, XLD.plates[5] - 0.06, 0);
  levels.forEach(([y]) => {
    dimPts.push(dimX - 0.012, y, 0, dimX + 0.012, y, 0);
    dimPts.push(dimX, y, 0, dimX + 0.055, y, 0);
  });
  const dimGeo = new THREE.BufferGeometry();
  dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(dimPts, 3));
  const dims = new THREE.LineSegments(dimGeo, new THREE.LineBasicMaterial({
    color: 0x2e6bff, transparent: true, opacity: 0.34,
  }));
  scene.add(dims);

  /* --------------------------------------------------------- 中心虚线轴 */
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, XLD.top + 0.06, 0),
    new THREE.Vector3(0, XLD.ground, 0),
  ]);
  const axis = new THREE.Line(axisGeo, new THREE.LineDashedMaterial({
    color: 0xf2f4f8, dashSize: 0.012, gapSize: 0.010, transparent: true, opacity: 0,
  }));
  axis.computeLineDistances();
  scene.add(axis);

  /* ------------------------------------------------------------- resizing */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const halfH = VIEW_SIZE / 2;
    const halfW = halfH * aspect;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();

  /* ------------------------------------------------------ camera controller */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const cam = {
    az: -20, el: 8, zoom: 1.0, tx: 0, ty: 0.18,
    tAz: -20, tEl: 8, tZoom: 1.0, tTx: 0, tTy: 0.18,
  };

  /* 背景在纯黑与灰度之间过渡：白模章节需要一个灰度背景才立得住 */
  const BG_DARK = new THREE.Color(0x252423);   // 与 styles.css 的 --bg 一致
  const BG_GRAY = new THREE.Color(0x4a4847);
  let bgCurrent = 0;
  function setBackground(v) {
    bgCurrent = lerp(bgCurrent, v, 0.08);
    renderer.setClearColor(BG_DARK.clone().lerp(BG_GRAY, bgCurrent), 1);
    return bgCurrent;
  }

  function setCameraTarget(t) {
    cam.tAz = t.az ?? cam.tAz;
    cam.tEl = t.el ?? cam.tEl;
    cam.tZoom = t.zoom ?? cam.tZoom;
    cam.tTx = t.tx ?? cam.tTx;
    cam.tTy = t.ty ?? cam.tTy;
  }

  function applyCamera(dt, parallax = 1) {
    const k = Math.min(1, dt * 3.2);
    cam.az = lerp(cam.az, cam.tAz, k);
    cam.el = lerp(cam.el, cam.tEl, k);
    cam.zoom = lerp(cam.zoom, cam.tZoom, k);
    cam.tx = lerp(cam.tx, cam.tTx, k);
    cam.ty = lerp(cam.ty, cam.tTy, k);

    pointer.x = lerp(pointer.x, pointer.tx, Math.min(1, dt * 2.6));
    pointer.y = lerp(pointer.y, pointer.ty, Math.min(1, dt * 2.6));

    const az = THREE.MathUtils.degToRad(cam.az) + pointer.x * 0.035 * parallax;
    const el = THREE.MathUtils.degToRad(cam.el) - pointer.y * 0.028 * parallax;

    const target = new THREE.Vector3(cam.tx, cam.ty + CAM_Y, 0);
    const dir = new THREE.Vector3(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    );
    camera.position.copy(target).addScaledVector(dir, CAM_DIST);
    camera.lookAt(target);
    camera.zoom = cam.zoom;
    camera.updateProjectionMatrix();
  }

  function setAxisOpacity(v) { axis.material.opacity = v; }
  function setDimsOpacity(v) { dims.material.opacity = v; }

  return {
    failed: false,
    renderer, scene, camera,
    /* 取景参数给 main.js 用：手机端要按包围盒算 zoom / ty */
    viewSize: VIEW_SIZE,
    camY: CAM_Y,
    resize, applyCamera, setCameraTarget,
    setBackground,
    setAxisOpacity, setDimsOpacity,
    render() { renderer.render(scene, camera); },
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
