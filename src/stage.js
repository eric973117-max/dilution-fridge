/* ==========================================================================
   stage · 三维舞台（正交制图相机 / 灯光 / 制图附件）

   从「稀释制冷机-下午版」的 stage.js 迁移。唯一的改动：
   取景范围（VIEW_SIZE / CAM_Y）、地面线、尺寸标注、中心轴原来写死成那台机器的尺寸，
   现在由**模块**通过 setFraming() 提供 —— 换模型、换层都不用动这个文件。
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';

const CAM_DIST = 4;

export function createStage(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return { failed: true };
  }
  if (!renderer.getContext()) return { failed: true };

  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x252423, 1);
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  /* ------------------------------------------------ 环境反射（实体感，无外部贴图）
     程序化画一张很小的等距柱状环境（上亮下暗 + 主光 + 补光 + 地面回弹），
     过一遍 PMREM 当 scene.environment。只对 Standard/Physical 材质生效。 */
  function buildStudioEnv() {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 64;
    const c = cv.getContext('2d');
    const grad = c.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.00, '#e8edf6');
    grad.addColorStop(0.34, '#8d95a4');
    grad.addColorStop(0.58, '#3a3f49');
    grad.addColorStop(1.00, '#0a0b0e');
    c.fillStyle = grad;
    c.fillRect(0, 0, 128, 64);
    const blob = (x, y, r, a, rgb = '255,255,255') => {
      const g = c.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 64);
    };
    blob(30, 13, 30, 0.95);
    blob(97, 21, 26, 0.32);
    blob(64, 58, 44, 0.14);
    const tex = new THREE.CanvasTexture(cv);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return rt.texture;
  }
  try {
    scene.environment = buildStudioEnv();
    scene.environmentIntensity = 0.55;
  } catch (e) {
    console.warn('[stage] 环境反射生成失败（不影响主流程）', e);
  }

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 24);
  camera.zoom = 1;

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(0.9, 1.3, 1.1);
  const fill = new THREE.DirectionalLight(0xc9d4ee, 0.28);
  fill.position.set(-1.1, 0.3, 0.6);
  const rim = new THREE.DirectionalLight(0xffffff, 0.22);
  rim.position.set(-0.2, -0.8, -1.0);
  const amb = new THREE.AmbientLight(0xf2f5ff, 0.60);
  scene.add(key, fill, rim, amb);

  /* ---------------------------------------------------- 制图附件（由 framing 决定） */
  const extras = new THREE.Group();
  scene.add(extras);

  let framing = { yMin: -0.8, yMax: 0.8, margin: 0.16, ground: null, top: null, plateYs: [], marks: [] };
  let viewSize = ((framing.yMax - framing.yMin) + framing.margin * 2) * 0.96;
  let camY = (framing.yMin + framing.yMax) / 2;

  let groundLine = null;
  let dimsLine = null;
  let axisLine = null;

  function rebuildExtras() {
    extras.clear();

    /* 地面线：机器最低点下方当作制图地平线 */
    if (framing.ground != null) {
      const pts = [];
      const half = Math.max(0.4, (framing.yMax - framing.yMin) * 0.36);
      pts.push(-half, framing.ground, 0, half, framing.ground, 0);
      for (let i = -4; i <= 4; i++) {
        const x = (i / 4) * half;
        pts.push(x, framing.ground, 0, x, framing.ground + (i === 0 ? 0.05 : 0.022), 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      groundLine = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.22,
      }));
      extras.add(groundLine);
    }

    /* 左侧尺寸标注：每一级冷板一根刻度 */
    if (framing.plateYs.length) {
      const x = -Math.max(0.5, (framing.yMax - framing.yMin) * 0.42);
      const top = framing.plateYs[0] + 0.02;
      const bottom = framing.plateYs[framing.plateYs.length - 1] - 0.06;
      const pts = [x, top, 0, x, bottom, 0];
      framing.marks.forEach(([y]) => {
        pts.push(x - 0.012, y, 0, x + 0.012, y, 0);
        pts.push(x, y, 0, x + 0.055, y, 0);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      dimsLine = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x2e6bff, transparent: true, opacity: 0.34,
      }));
      extras.add(dimsLine);
    }

    /* 中心虚线轴 */
    if (framing.top != null) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, framing.top + 0.06, 0),
        new THREE.Vector3(0, framing.ground ?? framing.yMin, 0),
      ]);
      axisLine = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: 0xf2f4f8, dashSize: 0.012, gapSize: 0.010, transparent: true, opacity: 0,
      }));
      axisLine.computeLineDistances();
      extras.add(axisLine);
    }
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const halfH = viewSize / 2;
    const halfW = halfH * (w / h);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  rebuildExtras();
  resize();

  /* ------------------------------------------------------------ 相机控制器 */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const cam = {
    az: -20, el: 8, zoom: 1.0, tx: 0, ty: 0.18,
    tAz: -20, tEl: 8, tZoom: 1.0, tTx: 0, tTy: 0.18,
  };

  const BG_DARK = new THREE.Color(0x252423);
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

    const target = new THREE.Vector3(cam.tx, cam.ty + camY, 0);
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

  function setFraming(next) {
    framing = { ...framing, ...next };
    viewSize = ((framing.yMax - framing.yMin) + framing.margin * 2) * 0.96;
    camY = (framing.yMin + framing.yMax) / 2;
    rebuildExtras();
    resize();
  }

  return {
    failed: false,
    renderer, scene, camera,
    get viewSize() { return viewSize; },
    get camY() { return camY; },
    setFraming,
    resize, applyCamera, setCameraTarget, setBackground,
    setAxisOpacity(v) { if (axisLine) axisLine.material.opacity = v; },
    setDimsOpacity(v) { if (dimsLine) dimsLine.material.opacity = v; },
    render() { renderer.render(scene, camera); },
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
