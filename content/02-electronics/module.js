/* ==========================================================================
   02 · 室温控制电子学 —— 行为层

   滚动驱动：机柜总览 → 十台设备逐个从机柜里抽出来 → 三块自制板卡 → 低温线束。
   每台设备抽出时配三样图形动画（都是黑白线稿语言，与稀释制冷机一致）：
     · 抽出导轨：从机柜面板到设备当前位置的虚线 + 两端直角标记
     · 扫描条：一道竖线沿面板从左到右扫过，标出"这台设备在哪儿"
     · 信号点：一个小球沿面板接口那一行走一遍，表示信号从哪儿进出
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import content from './content.js';
import { buildRack, buildBoards, buildCableLoom, RACK } from './model/rack.js';
import { createWaveform } from './model/wave.js';

/* 抽出方式：沿 +x 抽出到机柜右侧的展示位，同时升（降）到画面中线。
   注意不能用 +z "朝观众抽"：相机是正交的，朝观众移动在画面里几乎看不出来，
   而且机位略偏时会把它甩到画面外。 */
/* 抽屉式：沿机柜进深方向从**正面**弹出（+z）。之前沿 +x 侧向抽会横穿侧板（穿模），
   而真实机柜里设备就是往前拉的。正交相机下纯 +z 位移在正面机位看不出来，
   所以机位统一给到正面偏右 35° —— "往外拉"在屏幕上就是一条斜向位移。 */
const PULL_Z = 430;
const smoothstep = (t) => t * t * (3 - 2 * t);

/* 功能波形：每台设备用它自己在链路里的"形状"说话 ——
   参考时钟是时基正弦、开关与主控是数据包、直流电源是平直带纹波、
   射频源是调制包络、PDU 是功率柱、采集是采样包。 */
const SHAPE = {
  display: 'ramp', ipc: 'packets', switch: 'packets', clock: 'sine', awg: 'pulse',
  pg: 'pulse', daq: 'packets', dc: 'ripple', rf: 'noise', pdu: 'bars',
};

let rack = null;
let boards = null;
let loom = null;
let labels = null;
let labelItems = null;
let leaders = null;
let machineProxy = null;
let guide = null;
let sweep = null;
let packet = null;
let wave = null;
let wavePanel = null;
let mats = null;
let shells = [];
let elapsed = 0;
const params = { amp: 0.8, pulseWidth: 1.0, rate: 2.4 };
const unitZ = new Map();

/* 页面上的滑杆面板：改参数 → 三维里的波形立刻变（"能操控"的那部分） */
function buildControls(onChange) {
  const el = document.createElement('div');
  el.className = 'wave-panel';
  el.hidden = true;
  el.innerHTML = `
    <div class="wave-panel__title"><span>波形控制</span><span>WAVEFORM</span></div>
    <div class="wave-panel__row"><label>幅度 AMP</label><input name="amp" type="range" min="10" max="100" value="80"><span class="wave-panel__val" data-v="amp">0.80</span></div>
    <div class="wave-panel__row"><label>脉宽 WIDTH</label><input name="pulseWidth" type="range" min="20" max="300" value="100"><span class="wave-panel__val" data-v="pulseWidth">1.00</span></div>
    <div class="wave-panel__row"><label>频率 RATE</label><input name="rate" type="range" min="50" max="400" value="240"><span class="wave-panel__val" data-v="rate">2.40</span></div>`;
  document.body.appendChild(el);
  const readouts = {};
  el.querySelectorAll('.wave-panel__val').forEach((n) => { readouts[n.dataset.v] = n; });
  el.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.name;
      params[key] = key === 'amp' ? Number(input.value) / 100
        : key === 'pulseWidth' ? Number(input.value) / 100
          : Number(input.value) / 100;
      readouts[key].textContent = params[key].toFixed(2);
      onChange?.();
    });
  });
  return el;
}

/* 透视（X-ray）处理：机壳/侧板/门框半透明，这样能看到柜内设备与走线 */
function makeXray(root) {
  const shells = ['机壳', '侧板', '前门（实体板）', '机柜顶框', '机柜底框', '立柱'];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!shells.some((k) => String(o.name).includes(k))) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.opacity = String(o.name).includes('立柱') ? .35 : .22;
    o.material.depthWrite = false;
    o.userData.shell = true;          // 标记成"可开合的外壳"：模块按章节收放
  });
}

function makeLabels(ctx) {
  const t = (v) => ctx.i18n.t(v);
  const items = [];
  rack.units.forEach((u, i) => {
    items.push({
      id: u.key,
      name: t({ zh: u.zh, en: u.label }),
      en: u.label,
      temp: '300 K',
      note: t({ zh: `机柜第 ${i + 1} 台 · 面板高度 ${u.h} mm`, en: `Unit ${i + 1} in the rack · ${u.h} mm tall` }),
      /* 名牌钉在设备**左缘**：展开时落在机柜左侧，不压柜体 */
      part: { obj: u.group, offset: new THREE.Vector3(-(RACK.panelW / 2 + 90), 0, 300) },
    });
  });
  const BOARD_ANCHORS = {
    fpga: [{ zh: 'FPGA 控制主板', en: 'FPGA control board' }, '160 × 100 mm'],
    bias: [{ zh: '多通道直流偏置板', en: 'Multi-channel DC bias board' }, '180 × 120 × 25 mm'],
    rf: [{ zh: '射频 / 微波模块', en: 'RF / microwave module' }, '200 × 100 × 80 mm'],
  };
  Object.entries(BOARD_ANCHORS).forEach(([id, [name, size]]) => {
    items.push({
      id,
      name: t(name),
      en: size,
      temp: '300 K',
      note: t({ zh: `自制板卡 · 外形 ${size}`, en: `In-house board · outline ${size}` }),
      part: { obj: boards.groups[id], offset: new THREE.Vector3(0, 40, 0) },
    });
  });
  const loomGroup = loom.root.children[0];
  items.push({
    id: 'coax',
    name: t({ zh: '低温同轴线 ×8', en: 'Cryogenic coax ×8' }),
    en: 'COAX ×8',
    temp: '300 K → 4 K',
    note: t({ zh: '机柜到制冷机室温法兰，进柜后逐级换线与衰减。', en: 'Rack to the fridge flange; changes type and attenuation inside the cryostat.' }),
    part: { obj: loomGroup, offset: new THREE.Vector3(600, 0, -40) },
  });
  items.push({
    id: 'nbti',
    name: t({ zh: '超导线缆 ×2', en: 'Superconducting lines ×2' }),
    en: 'NbTi ×2',
    temp: '4 K 以下',
    note: t({ zh: '4 K 以下改用超导同轴，直流电阻归零。', en: 'Below 4 K the lines become superconducting coax with zero DC resistance.' }),
    part: { obj: loomGroup, offset: new THREE.Vector3(1500, -26, 0) },
  });
  items.push({
    id: 'block',
    name: t({ zh: '低温固定胶块', en: 'Cryogenic clamp' }),
    en: 'CLAMP',
    temp: '300 K → 4 K',
    note: t({ zh: '每 500 mm 一个，把线束重量卸在支撑上。', en: 'One every 500 mm, taking the loom’s weight off the cold stages.' }),
    part: { obj: loomGroup, offset: new THREE.Vector3(1000, 0, 0) },
  });
  return items;
}

/* 虚线用的几何：每帧按设备当前位置重写两个端点 */
function makeGuide() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const mat = new THREE.LineDashedMaterial({
    color: 0xffffff, transparent: true, opacity: .5, dashSize: 14, gapSize: 10,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.frustumCulled = false;
  return line;
}

function build(ctx) {
  rack = buildRack({ mono: true });
  ctx.stage.scene.add(rack.root);
  rack.units.forEach((u) => unitZ.set(u.key, 0));

  boards = buildBoards({ mono: true });
  boards.root.position.set(0, 60, 500);
  ctx.stage.scene.add(boards.root);

  loom = buildCableLoom({ length: 3000, mono: true });
  loom.root.rotation.z = -Math.PI / 2;
  loom.root.position.set(1100, 1500, -200);
  ctx.stage.scene.add(loom.root);
  makeXray(rack.root);
  shells = [];
  rack.root.traverse((o) => { if (o.isMesh && o.userData.shell) shells.push(o); });

  /* 波形屏：摆在机柜右前方（单位是米，直接挂在舞台上） */
  wave = createWaveform({ w: 0.78, h: 0.28 });
  /* 摆在抽出设备的右上方：设备章的机位（tx 0.40 / zoom ≈2.4）刚好把它框进画面 */
  wave.group.position.set(0.80, 0.32, 0.62);
  ctx.stage.scene.add(wave.group);
  wavePanel = buildControls(() => wave.update({ ...params, t: elapsed }));

  /* 图形动画三件套 */
  guide = makeGuide();
  rack.root.add(guide);

  sweep = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  );
  sweep.name = '扫描条（示意）';
  rack.root.add(sweep);

  packet = new THREE.Mesh(
    new THREE.SphereGeometry(9, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  );
  packet.name = '信号点（示意）';
  rack.root.add(packet);

  ctx.stage.setFraming({ yMin: -1.1, yMax: 1.1, margin: 0.05, ground: null, top: null, plateYs: [], marks: [] });

  labels = ctx.overlays.createLabels();
  labelItems = makeLabels(ctx);

  /* 引线标注：与冰箱层同一套 —— 从章节卡拉一条线到这台设备内部的那块板卡。
     每台设备一个锚点，模块自己做一层 machine 代理（leaders 只要求 segments 这个形状）。 */
  machineProxy = {
    segments: new Map(rack.units.map((u) => [u.key, {
      group: u.group,
      anchorPart: { obj: u.board, offset: new THREE.Vector3(0, 10, 0) },
    }])),
  };
  leaders = ctx.overlays.createLeaders(rack.units.map((u) => ({
    id: u.key,
    accent: content.accent,
    en: u.label,
    zh: u.zh,
    temp: '300 K',
    spec: `面板 ${u.h} mm`,
    anchor: [0, 0, 0],
  })));
  ctx.i18n.subscribe(() => { labelItems = null; labels?.reset(); });

  /* 收集全部材质，供"黑体白线 ↔ 实体"两态切换。
     每台设备的材质在 rack.js 里已经独立克隆过，所以可以按台控制。
     unit 字段标明这份材质属于哪一台设备（null = 机柜结构件）。 */
  mats = [];
  const collect = (obj, unit) => obj?.traverse((o) => {
    if (!o.material) return;
    mats.push({
      mat: o.material,
      base: o.material.color.clone(),
      baseOpacity: o.material.opacity ?? 1,
      isLine: !!o.isLineSegments,
      unit,
    });
  });
  rack.units.forEach((u) => collect(u.group, u.key));
  [rack.groups.frame, rack.groups.rails, rack.groups.doors, rack.groups.rear].forEach((g) => collect(g, null));
  collect(boards.root, 'BOARDS');
  collect(loom.root, 'LOOM');
}

const VISIBILITY = {
  'electronics-rack': { rack: true, boards: false, loom: false },
  'electronics-boards': { rack: false, boards: true, loom: false },
  'electronics-wiring': { rack: false, boards: false, loom: true },
};

function update(ctx) {
  if (!rack) return;
  const { chapter, local, dt } = ctx;
  elapsed += dt;

  /* 波形屏只在设备章出现；滑杆面板跟着它一起显隐 */
  const wantWave = !!chapter.device;
  if (wave) {
    wave.group.visible = wantWave;
  }
  if (wavePanel) wavePanel.hidden = !wantWave;
  /* 机柜后部的走线只在总览与线束章出现，设备章里它只会碍事 */
  if (rack.groups?.rear) rack.groups.rear.visible = !chapter.device && chapter.key !== 'electronics-boards';

  const vis = VISIBILITY[chapter.key] || { rack: true, boards: false, loom: false };
  rack.root.visible = vis.rack;
  boards.root.visible = vis.boards;
  loom.root.visible = vis.loom;

  const activeKey = chapter.device || null;
  const t = smoothstep(Math.min(1, Math.max(0, local / 0.85)));
  const k = Math.min(1, dt * 4);
  let activeUnit = null;

  rack.units.forEach((u) => {
    const want = u.key === activeKey ? t : 0;
    const now = unitZ.get(u.key) + (want - unitZ.get(u.key)) * k;
    unitZ.set(u.key, now);
    u.group.position.z = now * PULL_Z;
    /* 冰箱式的"分离"：上盖抬起 → 内部板卡抽出 → 后面板让开，各自错开一点节奏 */
    if (u.cover) u.cover.position.y = now * 74;
    if (u.board) u.board.position.z = now * 150;
    if (u.rear) u.rear.position.z = now * 60;
      if (u.key === activeKey) activeUnit = u;
    });

    /* 两态渲染（与稀释制冷机同一套逻辑）：
         · 默认：**黑体白线** —— 实体压到近黑（本色 ×0.10），轮廓线提到 0.85；
         · 逐台展示时：被讲到的那一台转**实体**（恢复本色、轮廓线降到 0.32），
           其余继续黑体白线并把线压到 0.25，画面层次收敛。 */
    const focusing = !!activeKey;
    /* 开合进度：总览章先给"实体闭合机柜"，滚到 35%–75% 这段才打开外壳、
       同时把内部板卡放出来 —— 一上来就掏心掏肺是最没有工业感的做法。 */
    const openT = chapter.key === 'electronics-rack'
      ? smoothstep(Math.min(1, Math.max(0, (local - 0.35) / 0.4)))
      : 1;
    shells.forEach((o) => {
      /* 关键：闭合状态下必须把 transparent / depthWrite 一起还原成实体材质。
         只把 opacity 拉回 1 是不够的 —— 材质还是 transparent + depthWrite:false 时，
         它照样走透明渲染通道，后面的东西会直接透过来（上一版的"看着还是透明"就是这个原因）。 */
      const base = String(o.name).includes('立柱') ? .35 : .22;
      const opaque = openT < .02;
      o.material.transparent = !opaque;
      o.material.depthWrite = opaque;
      o.material.opacity = opaque ? 1 : base + (1 - openT) * .78;
    });
    rack.units.forEach((u) => {
      const showInner = openT > 0.02 || u.key === activeKey;
      [u.board, u.cover].forEach((grp) => { if (grp) grp.visible = showInner; });
    });
    (mats || []).forEach((e) => {
      const isSelf = focusing ? e.unit === activeKey : false;
      if (e.isLine) {
        /* 白线：被讲到的那台降到 0.32（实体上不需要抢眼），
           其余一律 0.85（黑体白线的线要亮），逐台展示时其他线压到 0.25 让层次收敛 */
        e.mat.opacity = isSelf ? 0.32 : (focusing ? 0.25 : 0.85);
        e.mat.color.setScalar(1);
        return;
      }
      /* 柜体与未讲到的设备一律**黑体**（本色 ×0.10），只有被讲到的那一台转实体 */
      const k = isSelf ? 1 : 0.1;
      e.mat.color.copy(e.base).multiplyScalar(k);
      if (e.mat.transparent) e.mat.opacity = e.baseOpacity * (isSelf ? 1 : 0.55);
    });

    /* 波形屏挂到当前这台设备的右上方（世界 = 局部 mm × 0.001）：
       机位绕到侧面它也还在画面里 —— 固定在世界坐标时，侧视章会飞出画面。 */
    if (wave && wantWave) {
      const u = activeUnit || rack.units[0];
      wave.group.position.set(u.group.position.x * 0.001 + 0.46, u.group.position.y * 0.001 + 0.30, 0.62);
      wave.update({ ...params, t: elapsed, shape: SHAPE[chapter.device] || 'pulse' });
    }

  /* 抽出导轨 + 扫描条 + 信号点：只在设备章出现，跟着这台设备的当前位置走 */
  if (activeUnit) {
    const pull = unitZ.get(activeKey);
    const uz = pull * PULL_Z;
    const front = RACK.d / 2 - 120;
    const y = activeUnit.y;
    guide.visible = true;
    guide.geometry.setFromPoints([
      new THREE.Vector3(0, y, front),
      new THREE.Vector3(0, y, front + uz + 40),
    ]);
    guide.computeLineDistances();
    guide.material.opacity = 0.25 + 0.3 * t;

    const sweepX = (-0.5 + local) * (RACK.panelW - 20);
    sweep.visible = true;
    sweep.position.set(sweepX, y, front + uz + 6);
    sweep.scale.set(1, activeUnit.h * 0.9, 1);
    sweep.material.opacity = 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, local))) ** 0.6;

    packet.visible = true;
    const pt = (local * 2.2) % 1;
    packet.position.set((-0.5 + pt) * (RACK.panelW - 40), y - activeUnit.h * 0.22, front + uz + 8);
    packet.material.opacity = t * 0.9;
  } else {
    guide.visible = false;
    sweep.visible = false;
    packet.visible = false;
  }

  if (!labels) return;
  if (!labelItems) labelItems = makeLabels(ctx);
  const ids = chapter.plates || [];
  const focus = ids.length ? ids[ids.length - 1] : null;
  /* 未逐台展示时（总览）名牌统一靠左；逐台展示时让到右侧，避开抽出的那台设备 */
  labels.setActive(ids, focusing ? (ctx.mobile ? 'right' : 'left') : 'left', focus);
  labels.update(ctx.stage.camera, labelItems, []);

  /* 卡片 → 零件 的引线（冰箱层同款），逐章切换锚点 */
  if (leaders) {
    leaders.setActive(chapter.device || null);
    leaders.update(ctx.stage.camera, machineProxy, ctx.ui.cardFor(chapter.key));
  }
}

const bounds = () => ({ yMin: -1.1, yMax: 1.1, height: 2.2, centerY: 0, width: 2.4 });

const setActive = (on) => {
  [rack, boards, loom].forEach((m) => { if (m) m.root.visible = on; });
  if (!on) {
    labels?.setActive([], 'left', null);
    leaders?.setActive(null);
    if (guide) guide.visible = false;
    if (sweep) sweep.visible = false;
    if (packet) packet.visible = false;
    if (wave) wave.group.visible = false;
    if (wavePanel) wavePanel.hidden = true;
  }
};

const dispose = () => {
  [rack, boards, loom].forEach((m) => m?.root.parent?.remove(m.root));
  wave?.group.parent?.remove(wave.group);
  wavePanel?.remove();
  rack = null;
  boards = null;
  loom = null;
  wave = null;
  wavePanel = null;
  labels = null;
  labelItems = null;
};

export default { ...content, build, update, bounds, setActive, dispose };
