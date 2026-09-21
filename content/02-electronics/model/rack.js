/* ==========================================================================
   室温电子学测控机柜 · 参数化装配（毫米为单位，root 缩放 0.001 → 米）

   依据用户提供的两张工程图（机柜内部设备详图 / 系统总体与关键模块图）建模：
     · 19 英寸机柜 2000 × 600 × 1000，前后门、侧板、脚轮、顶部散热
     · 十台设备（自上而下）：触摸屏 / 主控计算机 / 网络交换机 / 10 MHz 参考时钟 /
       任意波形发生器 / 脉冲发生器 / 采集机箱 / 多路直流电源 / 射频源 / 电源分配单元
     · 三块自制板卡：FPGA 控制主板 160×100、多通道直流偏置板 180×120×25、
       射频/微波模块 200×100×80（外形尺寸照图纸，内部为示意）
     · 低温信号线缆束 L=3000：低温同轴线 + 超导线 + 双绞线 + 光纤 + 固定胶块 + SMA 接头

   注意：**不使用任何厂商名称、型号或 LOGO**；面板上只用通用功能标识（REF / AWG / PG…），
   造型为工程示意，不代表真实设备外观。
   ========================================================================== */

import * as THREE from '../../../vendor/three.module.js';
import { createMaterials, createKit } from '../../../src/parts/kit.js';
import { buildAwgUnit } from './awg.js';

export const RACK = { w: 600, h: 2000, d: 1000, panelW: 482, u: 44 };

/* 自上而下的设备表：高度按工程量级给（1U = 44mm），标识用通用功能名 */
export const UNITS = [
  { key: 'display', label: 'TOUCH PANEL · 19"', zh: '监控显示器（触摸屏）', h: 356 },
  { key: 'ipc', label: 'IPC · HOST', zh: '主控计算机（工业 PC）', h: 178 },
  { key: 'switch', label: 'SWITCH · 24×1G', zh: '网络交换机', h: 89 },
  { key: 'clock', label: 'REF CLOCK · 10 MHz', zh: '10 MHz 参考时钟源', h: 89 },
  { key: 'awg', label: 'AWG · 4 CH', zh: '任意波形发生器', h: 178 },
  { key: 'pg', label: 'PG · 8 CH', zh: '脉冲发生器', h: 89 },
  { key: 'daq', label: 'DAQ CHASSIS', zh: '采集机箱与采集卡', h: 267 },
  { key: 'dc', label: 'DC BIAS · 8 CH', zh: '多路直流电源', h: 89 },
  { key: 'rf', label: 'RF SOURCE · 4–20 GHz', zh: '射频源（微波）', h: 178 },
  { key: 'pdu', label: 'PDU · 8×C13', zh: '机柜电源分配单元', h: 89 },
];

export function buildRack({ mono = true } = {}) {
  const materials = createMaterials({ mono });
  const kit = createKit(materials, { outlineThreshold: 30 });
  const { group, box, cyl, ring, pipe, sphere, instanced, bag } = kit;

  const root = new THREE.Group();
  root.name = 'ECT-01_Parametric_Control_Rack';
  root.scale.setScalar(.001);
  root.userData = { units: 'mm', lodStatus: 'Design illustration based on the client engineering drawing. No vendor parts.', source: '量子计算机电子学测控系统 工程图（客户提供）' };

  const { w, h, d, panelW } = RACK;
  const pieces = [];
  const piece = (name, parent = root) => {
    const g = group(parent, name);
    pieces.push({ name, group: g, base: g.position.clone() });
    return g;
  };

  /* ------------------------------------------------------------ 机柜框架 */
  const frame = piece('01_Rack_frame');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cyl(frame, 14, h, [sx * (w / 2 - 20), 0, sz * (d / 2 - 20)], 'silver', 4, '机柜立柱（异型梁示意）');
  }
  box(frame, [w, 18, d], [0, h / 2 - 9, 0], 'white', '机柜顶框');
  box(frame, [w, 22, d], [0, -h / 2 + 11, 0], 'white', '机柜底框');
  box(frame, [w, 14, 60], [0, -h / 2 + 29, 0], 'dark', '底部走线槽');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cyl(frame, 26, 34, [sx * (w / 2 - 60), -h / 2 - 17, sz * (d / 2 - 70)], 'dark', 20, '脚轮');
  }
  for (let i = 0; i < 12; i++) box(frame, [w - 80, 4, 6], [0, h / 2 - 24, -d / 2 + 20 + i * 14], 'dark', '顶部散热格栅');

  /* 19 英寸安装柱与螺孔（每 1U 一组） */
  const rails = piece('02_Mounting_rails');
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(rails, [12, h - 120, 12], [sx * (panelW / 2 + 16), 0, sz * (d / 2 - 90)], 'silver', '安装柱');
  }
  const holes = kit.bag('安装螺孔');
  const holeGeo = new THREE.CylinderGeometry(2.6, 2.6, 3, 10);
  holeGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 38; i++) {
    const y = 830 - i * RACK.u;
    for (const sx of [-1, 1]) holes.add(holeGeo, [sx * (panelW / 2 + 16), y, d / 2 - 90]);
  }
  holes.flush(rails, 'dark', { outlineIt: false });

  /* ------------------------------------------------------- 十台设备（面板） */
  const units = [];
  let yTop = 852;
  for (const u of UNITS) {
    const g = piece(`03_Unit_${u.key}`);
    const hh = u.h;
    const yc = yTop - hh / 2;
    const front = d / 2 - 120;

    /* 标杆设备：AWG 走专用建模（零件密度对齐稀释制冷机的一个功能段），
       其余九台暂时复用通用模板 —— 观感确认后再逐台替换。 */
    if (u.key === 'awg') {
      const detail = buildAwgUnit({ mono, panelW, front, height: hh, y: yc });
      g.add(detail.group);
      units.push({
        ...u, group: g, cover: detail.cover, board: detail.board, rear: detail.rear,
        mats: detail.mats, parts: detail.parts, y: yc, height: hh,
      });
      yTop -= hh + 6;
      continue;
    }
    box(g, [panelW, hh - 6, 4], [0, yc, front + 2], 'white', `${u.zh} · 面板`);
    /* 机箱进深按设备量级给：2U 及以上 440 mm、1U 级 360 mm ——
       真实仪器就是这个量级，不是把机柜 1000 mm 进深填满；
       它后面空出来的那一截正好是机柜走线区。 */
    const unitD = hh >= 150 ? 440 : 360;
    box(g, [panelW - 8, hh - 16, unitD], [0, yc, front + 2 - unitD / 2], 'dark', `${u.zh} · 机壳`);

    /* ---------------- 内部结构：板卡 + 器件 + 后面板 ----------------
       冰箱之所以"精细"，是因为每个零件都真的建了；设备也一样 ——
       空壳设备在透视里一眼就露馅。这里给每台设备补三样：
         上盖（可抬起）、内部板卡（可抽出）、后面板（接口 + 风扇 + 电源入口）。 */
    const cover = group(g, `${u.zh} · 上盖`);
    box(cover, [panelW - 10, 6, d * 0.42], [0, yc + hh / 2 - 4, front - 150], 'white', `${u.zh} · 上盖板`);
    for (let i = 0; i < 4; i++) {
      box(cover, [26, 2, d * 0.34], [-120 + i * 80, yc + hh / 2 - 1, front - 150], 'dark', `${u.zh} · 散热槽`);
    }

    const board = group(g, `${u.zh} · 内部板卡`);
    const bw = panelW - 90;
    const bh = Math.min(hh - 24, 150);
    box(board, [bw, 3, bh], [0, yc - 2, front - 220], 'ceramic', `${u.zh} · 主板`);
    const chips = kit.bag(`${u.zh} · 板载器件`);
    const chipGeo = new THREE.BoxGeometry(14, 5, 14);
    const chipSm = new THREE.BoxGeometry(8, 3, 6);
    const rows = Math.max(2, Math.round(bh / 26));
    for (let i = 0; i < Math.min(6, rows); i++) {
      for (let j = 0; j < 4; j++) {
        const geo = (i + j) % 3 === 0 ? chipGeo : chipSm;
        chips.add(geo, [-bw / 2 + 22 + j * (bw - 44) / 3, yc + 4, front - 220 - bh / 2 + 18 + i * (bh - 30) / Math.max(1, Math.min(6, rows) - 1)]);
      }
    }
    chips.flush(board, 'dark', { outlineIt: false });
    for (let i = 0; i < 3; i++) {
      box(board, [16, 8, 10], [-bw / 2 + 30 + i * (bw - 60) / 2, yc + 6, front - 220 + bh / 2 - 10], 'silver', `${u.zh} · 板载接口`);
    }
    pipe(board, [[bw / 2 - 14, yc + 8, front - 220 - bh / 2 + 8], [bw / 2 - 4, yc + 18, front - 250], [-bw / 2 + 14, yc + 8, front - 220 - bh / 2 + 8]],
      2.6, 'bright', `${u.zh} · 内部排线`, 20);

    const rearP = group(g, `${u.zh} · 后面板`);
    const back = front + 2 - unitD;
    box(rearP, [panelW, hh - 6, 4], [0, yc, back], 'white', `${u.zh} · 后面板`);
    const rearPorts = kit.bag(`${u.zh} · 后面板接口`);
    const rpGeo = new THREE.CylinderGeometry(4.2, 4.2, 10, 12);
    rpGeo.rotateX(Math.PI / 2);
    const nRear = u.key === 'switch' ? 8 : u.key === 'daq' ? 12 : u.key === 'pdu' ? 4 : 6;
    for (let i = 0; i < nRear; i++) {
      rearPorts.add(rpGeo, [(i - (nRear - 1) / 2) * (panelW - 90) / Math.max(1, nRear - 1 + 0.001) * 0.9, yc - hh * 0.16, back - 3]);
    }
    rearPorts.flush(rearP, 'silver', { outlineIt: false });
    ring(rearP, Math.min(28, hh * 0.28), 3, [panelW / 2 - 46, yc + hh * 0.12, back - 6], 'dark', [0, 0, 0], `${u.zh} · 散热风扇`);
    box(rearP, [34, 22, 12], [-panelW / 2 + 44, yc - hh * 0.12, back - 6], 'dark', `${u.zh} · 电源入口`);
    cyl(rearP, 5, 12, [-panelW / 2 + 84, yc + hh * 0.2, back - 6], 'bright', 12, `${u.zh} · 接地柱`, [Math.PI / 2, 0, 0]);
    /* 各设备的通用面板元素：显示屏 / 旋钮 / 接口 / 按键 / 指示灯 */
    const display = (wR, hR, x = 0) => box(g, [wR, hR, 3], [x, yc + hh * 0.12, front + 4.4], 'dark', `${u.zh} · 显示屏`);
    const knob = (x) => {
      cyl(g, 9, 8, [x, yc - hh * 0.14, front + 8], 'silver', 20, `${u.zh} · 旋钮`, [Math.PI / 2, 0, 0]);
      box(g, [14, 2, 2], [x, yc - hh * 0.14, front + 12.4], 'bright', `${u.zh} · 旋钮指针`);
    };
    const ports = (n, kind, rowY, spread) => {
      const b = kit.bag(`${u.zh} · ${kind}`);
      const geo = kind === 'RJ45'
        ? new THREE.BoxGeometry(12, 9, 10)
        : new THREE.CylinderGeometry(4.2, 4.2, 9, 14);
      if (kind !== 'RJ45') geo.rotateX(Math.PI / 2);
      const pinGeo = new THREE.BoxGeometry(1.4, 1.4, 8);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * spread;
        b.add(geo, [x, rowY, front + 6]);
        if (kind !== 'RJ45') kit.bag(`${u.zh} · ${kind}内针`).add(pinGeo, [x, rowY, front + 6]);
      }
      b.flush(g, 'silver', { outlineIt: false });
    };
    const buttons = (cols, rows, cx = 0, cy = 0, gapX = 9, gapY = 9) => {
      const b = kit.bag(`${u.zh} · 按键`);
      const geo = new THREE.BoxGeometry(gapX - 2.4, gapY - 2.4, 3.4);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        b.add(geo, [cx + (i - (cols - 1) / 2) * gapX, cy + (j - (rows - 1) / 2) * gapY, front + 5.2]);
      }
      b.flush(g, 'dark', { outlineIt: false });
    };
    const leds = (n, cy, spread) => {
      const b = kit.bag(`${u.zh} · 状态灯`);
      const geo = new THREE.CylinderGeometry(1.8, 1.8, 2.6, 10);
      geo.rotateX(Math.PI / 2);
      for (let i = 0; i < n; i++) b.add(geo, [(i - (n - 1) / 2) * spread, cy, front + 4.6]);
      b.flush(g, 'cyan', { outlineIt: false });
    };
    const handle = (x) => box(g, [10, hh * 0.5, 24], [x, yc, front + 14], 'silver', `${u.zh} · 把手`);

    if (u.key === 'display') {
      display(panelW - 70, hh - 90);
      box(g, [panelW - 54, 10, 2], [0, yc - hh / 2 + 34, front + 4.4], 'dark', `${u.zh} · 触摸条`);
    } else if (u.key === 'ipc') {
      display(70, 22, -panelW / 2 + 80);
      handle(-panelW / 2 + 18); handle(panelW / 2 - 18);
      ports(4, 'RJ45', yc - 30, 22);
      leds(4, yc + 46, 14);
      cyl(g, 7, 6, [panelW / 2 - 60, yc - 30, front + 6], 'bright', 16, `${u.zh} · 电源键`, [Math.PI / 2, 0, 0]);
    } else if (u.key === 'switch') {
      ports(12, 'RJ45', yc - 12, 34);
      ports(12, 'RJ45', yc + 14, 34);
      leds(24, yc + 34, 17);
      box(g, [30, 14, 6], [-panelW / 2 + 40, yc - 12, front + 6], 'dark', `${u.zh} · 光模块位`);
    } else if (u.key === 'clock') {
      display(150, 22, -60);
      ports(4, 'BNC', yc - 16, 30);
      buttons(5, 2, 120, yc - 14, 11, 12);
      knob(panelW / 2 - 34);
      leds(3, yc + 30, 12);
    } else if (u.key === 'awg') {
      display(190, 34, -80);
      ports(4, 'BNC', yc - 46, 34);
      buttons(6, 3, 60, yc + 18, 11, 12);
      knob(panelW / 2 - 34);
      leds(6, yc - 20, 12);
    } else if (u.key === 'pg') {
      display(150, 22, -60);
      ports(8, 'BNC', yc - 12, 24);
      buttons(5, 2, 120, yc - 12, 11, 12);
      leds(8, yc + 26, 22);
    } else if (u.key === 'daq') {
      /* 采集机箱：4 个插槽模块 + 前面板接口 */
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * 74;
        box(g, [66, hh - 40, 6], [x, yc, front + 3], 'silver', `${u.zh} · 采集模块`);
        box(g, [40, 12, 3], [x, yc + 30, front + 6], 'dark', `${u.zh} · 模块标签`);
        box(g, [10, hh - 60, 16], [x + 24, yc, front + 12], 'bright', `${u.zh} · 模块把手`);
        ports(4, 'BNC', yc - 30, 14);
      }
      leds(4, yc - 70, 74);
    } else if (u.key === 'dc') {
      /* 多路直流：4 组红黑端子 + 显示屏 */
      display(120, 20, -90);
      for (let i = 0; i < 4; i++) {
        const x = -20 + i * 34;
        cyl(g, 5, 12, [x, yc - 12, front + 8], 'white', 14, `${u.zh} · 正极端子`, [Math.PI / 2, 0, 0]);
        cyl(g, 5, 12, [x + 12, yc - 12, front + 8], 'dark', 14, `${u.zh} · 负极端子`, [Math.PI / 2, 0, 0]);
      }
      buttons(4, 2, 130, yc - 10, 12, 13);
      leds(8, yc + 26, 16);
    } else if (u.key === 'rf') {
      display(170, 34, -80);
      ports(2, 'SMA', yc - 46, 30);
      buttons(6, 3, 70, yc + 16, 11, 12);
      knob(panelW / 2 - 34);
      leds(5, yc - 20, 12);
    } else if (u.key === 'pdu') {
      const out = kit.bag(`${u.zh} · IEC 插座`);
      const geo = new THREE.BoxGeometry(30, 20, 12);
      for (let i = 0; i < 8; i++) out.add(geo, [(i - 3.5) * 36 - 30, yc - 4, front + 7]);
      out.flush(g, 'dark', { outlineIt: false });
      for (let i = 0; i < 2; i++) box(g, [34, 24, 12], [140 + i * 38, yc - 4, front + 7], 'dark', `${u.zh} · C19 插座`);
      box(g, [26, 30, 6], [panelW / 2 - 40, yc, front + 6], 'white', `${u.zh} · 总开关`);
      display(70, 18, -panelW / 2 + 60);
    }
    /* 每台设备的材质独立克隆一份：这样"当前这台实、其余压暗"才能按台控制。
       共享材质做不到这一点（改一个等于改全部）。 */
    const mats = [];
    g.traverse((o) => {
      if (!o.material) return;
      o.material = o.material.clone();
      o.material.userData.base = o.material.color.clone();
      o.material.userData.baseOpacity = o.material.opacity ?? 1;
      o.material.userData.isLine = !!o.isLineSegments;
      mats.push(o.material);
    });
    units.push({ ...u, group: g, cover, board, rear: rearP, mats, y: yc, height: hh });
    yTop -= hh + 6;
  }

  /* ------------------------------------------------------ 前后门与侧板 */
  const doors = piece('04_Doors_and_panels');
  /* 前后门只保留门框 + 中横梁（不做实心门扇）：
     实心门在制图光照下就是一块不透明的板，会把十台设备整片挡住；
     工程图里的门本来也是"打开/拆下"的状态。 */
  const doorFrame = (z, tag) => {
    const g = group(doors, tag);
    const th = h - 90;
    box(g, [w - 20, 14, 12], [0, th / 2, 0], 'white', `${tag} · 上框`);
    box(g, [w - 20, 14, 12], [0, -th / 2, 0], 'white', `${tag} · 下框`);
    box(g, [16, th, 12], [-(w - 20) / 2, 0, 0], 'white', `${tag} · 左框`);
    box(g, [16, th, 12], [(w - 20) / 2, 0, 0], 'white', `${tag} · 右框`);
    box(g, [20, 10, 12], [0, 0, 0], 'silver', `${tag} · 中横梁`);
    g.position.set(0, 0, z);
    return g;
  };
  const frontDoor = doorFrame(d / 2 - 30, '前门框');
  const rearDoor = doorFrame(-d / 2 + 30, '后门框');
  /* 闭合状态需要一块真正的门板把内部挡住（只留门框的话，斜着看就能看见里面的设备）。
     门板列进"可开合外壳"名单，开壳时跟着淡出。 */
  box(doors, [w - 36, h - 110, 12], [0, 0, d / 2 - 22], 'white', '前门（实体板）');
  for (let i = 0; i < 3; i++) box(doors, [w - 120, 10, 2], [0, 120 + i * 34, d / 2 - 29], 'dark', '前门观察窗格线');
  for (const s of [-1, 1]) box(doors, [16, h - 60, d - 60], [s * (w / 2 - 4), 0, 0], 'white', '侧板');
  box(doors, [10, 90, 26], [w / 2 - 70, -40, d / 2 - 22], 'silver', '前门把手');
  box(doors, [w - 120, 10, 8], [0, h / 2 - 120, d / 2 - 26], 'dark', '前门通风口');

  /* -------------------------------------------------- 后部：线缆与配电 */
  const rear = piece('05_Rear_cabling');
  box(rear, [panelW, 40, 20], [0, 780, -d / 2 + 120], 'silver', '光纤配线架');
  const fibers = kit.bag('光纤跳线');
  const fGeo = new THREE.CylinderGeometry(1.5, 1.5, 60, 8);
  fGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 12; i++) fibers.add(fGeo, [(i - 5.5) * 20, 770, -d / 2 + 150]);
  fibers.flush(rear, 'cyan', { outlineIt: false });
  for (let i = 0; i < 6; i++) {
    pipe(rear, [[-140 + i * 56, 700, -d / 2 + 130], [-150 + i * 56, 300, -d / 2 + 170], [-120 + i * 56, -300, -d / 2 + 150]],
      3.2, 'dark', '机柜内走线（同轴）', 24);
  }
  box(rear, [120, 60, 26], [160, -820, -d / 2 + 140], 'white', '配电与接地汇流');

  return { root, materials, pieces, units, stats: { ...kit.stats }, groups: { frame, rails, doors, rear, frontDoor, rearDoor } };
}

/* --------------------------------------------------------------------------
   低温信号线缆束（图纸 4.4）：L = 3000 可定制
   低温同轴线 8 路 + 超导线 2 路 + 双绞控制线 1 组 + 光纤 2 路 + 固定胶块 + SMA 接头
   -------------------------------------------------------------------------- */
export function buildCableLoom({ length = 3000, mono = true } = {}) {
  const materials = createMaterials({ mono });
  const kit = createKit(materials, { outlineThreshold: 40 });
  const { group, box, cyl, pipe, bag } = kit;
  const root = new THREE.Group();
  root.name = 'ECT-02_Cryogenic_Cable_Loom';
  root.scale.setScalar(.001);

  const g = group(root, 'Cable_loom');
  const strand = (offset, radius, mat, kind, droop) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([t * length, -Math.sin(t * Math.PI) * droop + offset[1], offset[2] + Math.cos(t * 6) * 6]);
    }
    return pipe(g, pts, radius, mat, kind, 48);
  };
  for (let i = 0; i < 8; i++) strand([0, 0, (i - 3.5) * 14], 3, 'dark', '低温同轴线（不锈钢 / 超导段）', 120);
  for (let i = 0; i < 2; i++) strand([0, -26, (i - 0.5) * 20], 2.4, 'silver', '超导线缆（4 K 以下）', 118);
  strand([0, 26, 0], 2, 'bright', '双绞控制线', 126);
  for (let i = 0; i < 2; i++) strand([0, 44, (i - 0.5) * 10], 1.4, 'cyan', '光纤（高速数据）', 130);

  /* 每 500mm 一个低温固定胶块 + 两端 SMA 接头 */
  const blocks = bag('低温固定胶块');
  const blockGeo = new THREE.BoxGeometry(26, 74, 74);
  for (let i = 0; i <= 6; i++) blocks.add(blockGeo, [i * (length / 6), 0, 0]);
  blocks.flush(g, 'dark');
  for (const x of [0, length]) {
    for (let i = 0; i < 8; i++) cyl(g, 5.4, 22, [x, 0, (i - 3.5) * 14], 'silver', 16, 'SMA 接头', [0, 0, Math.PI / 2]);
    box(g, [18, 92, 92], [x + (x ? -9 : 9), 0, 0], 'white', '线束端接法兰');
  }
  return { root, materials, stats: { ...kit.stats } };
}

/* --------------------------------------------------------------------------
   三块自制板卡（图纸 4.1 / 4.2 / 4.3）：外形尺寸照图纸，元件为示意
   -------------------------------------------------------------------------- */
export function buildBoards({ mono = true } = {}) {
  const materials = createMaterials({ mono });
  const kit = createKit(materials);
  const { group, box, cyl, bag, instanced } = kit;
  const root = new THREE.Group();
  root.name = 'ECT-03_Control_Boards';
  root.scale.setScalar(.001);

  const board = (name, w, h, t = 2.2) => {
    const g = group(root, name);
    box(g, [w, t, h], [0, 0, 0], 'ceramic', `${name} · 基板`);
    return g;
  };

  /* 4.1 FPGA 控制主板 160 × 100 */
  const fpga = board('4.1_FPGA_control_board', 160, 100);
  box(fpga, [42, 3.4, 42], [-18, 2.6, 2], 'dark', 'FPGA 主芯片');
  bag('FPGA 引脚').flush(fpga, 'silver', { outlineIt: false });
  for (const s of [-1, 1]) box(fpga, [26, 2, 14], [30 * s, 2.4, -28], 'dark', 'DDR 内存');
  box(fpga, [18, 4, 16], [58, 3, 26], 'silver', '以太网接口');
  box(fpga, [14, 4, 12], [-62, 3, 26], 'bright', '光纤接口');
  for (let i = 0; i < 2; i++) cyl(fpga, 4, 8, [-20 + i * 26, 3, 40], 'silver', 14, 'SMA 时钟接口', [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) box(fpga, [16, 5, 12], [-56 + i * 22, 3.4, -40], 'dark', '电源模块');
  {
    const pins = bag('板卡引脚阵列');
    const pin = new THREE.BoxGeometry(1.2, 1.6, 1.2);
    for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) pins.add(pin, [-14 + i * 1.6, 1.6, -3 + j * 6]);
    pins.flush(fpga, 'bright', { outlineIt: false });
  }

  /* 4.2 多通道直流偏置板 180 × 120 × 25 */
  const bias = board('4.2_Multi_channel_DC_bias_board', 180, 120, 25);
  const dacs = bag('DAC 芯片');
  const dacGeo = new THREE.BoxGeometry(16, 3.4, 12);
  for (let i = 0; i < 8; i++) dacs.add(dacGeo, [-70 + (i % 4) * 46, 14, -34 + Math.floor(i / 4) * 26]);
  dacs.flush(bias, 'dark');
  const amps = bag('运放电路');
  const ampGeo = new THREE.BoxGeometry(9, 2.6, 7);
  for (let i = 0; i < 16; i++) amps.add(ampGeo, [-70 + (i % 8) * 20, 14, 18 + Math.floor(i / 8) * 16]);
  amps.flush(bias, 'silver');
  for (let i = 0; i < 8; i++) box(bias, [16, 9, 10], [-70 + i * 20, 16, 46], 'white', '多通道输出端子');
  box(bias, [40, 4, 16], [62, 15, -46], 'cyan', '温度传感器（板载）');
  for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(bias, 4, 26, [s * 84, 0, t * 52], 'dark', 12, '机箱固定孔');

  /* 4.3 射频 / 微波模块 200 × 100 × 80 */
  const rf = board('4.3_RF_microwave_module', 200, 100, 80);
  box(rf, [200, 80, 100], [0, 0, 0], 'white', '射频模块屏蔽腔');
  for (let i = 0; i < 6; i++) {
    cyl(rf, 4.6, 16, [-70 + i * 28, 0, 58], 'silver', 16, 'SMA 射频端口', [Math.PI / 2, 0, 0]);
    cyl(rf, 2, 8, [-70 + i * 28, 0, 62], 'bright', 12, '端口中心针', [Math.PI / 2, 0, 0]);
  }
  box(rf, [46, 30, 30], [-46, 0, 0], 'dark', '功率放大器（腔体内）');
  box(rf, [36, 24, 26], [6, 0, 0], 'silver', 'IQ 调制器（腔体内）');
  box(rf, [30, 22, 24], [48, 0, 0], 'bright', '混频器（腔体内）');
  box(rf, [26, 8, 18], [78, 26, 0], 'cyan', '过温保护传感器');

  return { root, materials, stats: { ...kit.stats }, groups: { fpga, bias, rf } };
}
