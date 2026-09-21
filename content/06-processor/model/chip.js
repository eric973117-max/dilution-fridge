/* ==========================================================================
   量子处理器 · 参数化装配（毫米为单位，root 缩放 0.001 → 米）

   零件清单（全部自制，不含任何厂商信息；图案是示意，不能用于制造）：
     · Cryoperm 磁屏蔽筒（对半剖开）
     · 铜封装：基座 / 侧壁 / 上盖 / 密封边 / 24 颗螺钉 / 铭牌刻线
     · SMA 接口阵列（两侧各 8 个：外壳 + 螺纹示意 + 中心针）
     · 微波载板（介质基板 / 过孔阵列 / 64 个焊盘 / 微带走线 / 贴片元件）
     · 铝键合线（每边 24 根）
     · 硅裸片 + 倒装焊焊球阵列
     · 量子比特阵列（默认 7×7 = 49 个）：十字电容 + SQUID 环 + 结
     · 每个比特一条蜿蜒读出谐振腔 + 比特间耦合总线
     · 横向蛇形馈线 + 两端发射结构
     · 每比特一根磁通控制线 + 纵向总线
     · 支撑柱 / 热沉 / 铜编织带

   LOD 说明：这是"设计示意"级别的高细节模型（与稀释制冷机同一档），
   面数与零件密度对齐那一层；图案不是版图，不能用于制造。
   ========================================================================== */

import * as THREE from '../../../vendor/three.module.js';
import { createMaterials, createKit } from '../../../src/parts/kit.js';

export const DEFAULTS = { qubits: 49, columns: 7 };

export function buildChip(params = {}) {
  const p = { ...DEFAULTS, ...params };
  const cols = Math.max(3, Math.round(Math.sqrt(p.qubits)));
  const rows = cols;

  const materials = createMaterials();
  const kit = createKit(materials);
  const { group, box, cyl, sphere, ring, rod, pipe, bolts, instanced } = kit;

  const root = new THREE.Group();
  root.name = 'QP-01_Parametric_Quantum_Processor';
  root.scale.setScalar(.001);
  root.userData = {
    units: 'mm',
    lodStatus: 'High-detail design illustration. NOT a manufacturable layout.',
    qubits: cols * rows,
  };

  const pieces = [];
  const piece = (name, parent = root) => {
    const g = group(parent, name);
    pieces.push({ name, group: g, base: g.position.clone() });
    return g;
  };

  /* ------------------------------------------------------------ 磁屏蔽（对半剖开） */
  const shield = piece('01_Cryoperm_shield');
  const shieldHalf = (dir) => {
    const half = group(shield, `shield_${dir > 0 ? 'R' : 'L'}`);
    const shell = new THREE.CylinderGeometry(96, 96, 168, 48, 1, true, dir > 0 ? 0 : Math.PI, Math.PI);
    kit.add(half, shell, 'shell', [0, 20, 0], '高磁导率磁屏蔽筒（示意）', null);
    box(half, [10, 6, 192], [0, 104, 0], 'shell', '屏蔽筒上沿翻边');
    box(half, [10, 6, 192], [0, -64, 0], 'shell', '屏蔽筒下沿翻边');
    cyl(half, 4.5, 8, [dir * 92, 104, 0], 'silver', 16, '屏蔽筒紧固件');
    return half;
  };
  const shieldR = shieldHalf(1);
  const shieldL = shieldHalf(-1);
  bolts(shield, 88, -62, 12, 3, '屏蔽筒底座');

  /* ---------------------------------------------------------------- 支撑与热沉 */
  const mount = piece('02_Thermal_mount');
  box(mount, [168, 12, 156], [0, -78, 0], 'copper', '芯片热沉');
  for (const x of [-72, 72]) for (const z of [-66, 66]) {
    cyl(mount, 5.5, 62, [x, -46, z], 'silver', 18, '热沉支撑柱');
    cyl(mount, 8, 5, [x, -16, z], 'bright', 6, '支撑柱紧固件');
  }
  for (const s of [-1, 1]) {
    pipe(mount, [[s * 74, -72, -60], [s * 96, -30, -20], [s * 86, 30, 30], [s * 74, 62, 60]],
      2.6, 'copper', '铜编织热连接（示意）', 24);
  }

  /* -------------------------------------------------------------------- 封装 */
  const pkg = piece('03_Package_base');
  box(pkg, [142, 14, 128], [0, -6, 0], 'white', '无氧铜封装基座');
  for (const z of [-57, 57]) box(pkg, [136, 10, 6], [0, 6, z], 'silver', '封装密封边');
  for (const x of [-65, 65]) box(pkg, [6, 10, 116], [x, 6, 0], 'silver', '封装侧壁');
  for (const x of [-56, 56]) for (const z of [-48, 48]) cyl(pkg, 4, 4, [x, 4, z], 'dark', 6, '封装安装螺孔');
  box(pkg, [104, .1, 96], [0, 1.05, 0], 'silver', '载板接合层（厚度估算）');

  /* SMA 接口：两侧各 8 个 —— 外壳、螺纹示意、中心针三段 */
  const sma = piece('04_SMA_launchers');
  const threadGeo = new THREE.CylinderGeometry(5.8, 5.8, .8, 20);
  const smaThreads = kit.bag('接口螺纹示意');
  for (const s of [-1, 1]) for (let j = 0; j < 8; j++) {
    const z = (j - 3.5) * 13;
    cyl(sma, 5.4, 20, [s * 74, 0, z], 'silver', 20, 'SMA 接口外壳', [0, 0, Math.PI / 2]);
    for (let k = 0; k < 5; k++) smaThreads.add(threadGeo, [s * (66 + k * 3.6), 0, z], [0, 0, Math.PI / 2]);
    cyl(sma, 2.1, 26, [s * 70, 0, z], 'bright', 14, '中心导体', [0, 0, Math.PI / 2]);
    cyl(sma, 6.4, 3, [s * 82, 0, z], 'gold', 20, '接口法兰', [0, 0, Math.PI / 2]);
  }
  smaThreads.flush(sma, 'dark', { outlineIt: false });

  /* --------------------------------------------------- 微波载板（interposer） */
  const pcb = piece('05_Microwave_interposer');
  box(pcb, [104, 3.4, 96], [0, 3, 0], 'ceramic', '微波介质载板');
  box(pcb, [58, .25, 58], [0, 4.8, 0], 'silver', '裸片贴装层（厚度估算）');
  /* 边缘焊盘 + 从焊盘往里走的微带线 */
  const padGeo = new THREE.BoxGeometry(12, .28, 1.1);
  const padBag = kit.bag('微波焊盘');
  const traceBag = kit.bag('载板微波走线');
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    for (let j = 0; j < 16; j++) {
      const d = (j - 7.5) * 5.6;
      const xx = Math.cos(a) * 43 + Math.sin(a) * d;
      const zz = Math.sin(a) * 37 + Math.cos(a) * d;
      padBag.add(padGeo, [xx, 4.9, zz], [0, -a, 0]);
      traceBag.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 52 + Math.sin(a) * d, 4.9, Math.sin(a) * 44 + Math.cos(a) * d),
        new THREE.Vector3(xx, 4.9, zz),
        new THREE.Vector3(Math.cos(a) * 26 + Math.sin(a) * d * .62, 4.9, Math.sin(a) * 24 + Math.cos(a) * d * .62),
      ], false, 'centripetal'), 10, .34, 5, false));
    }
  }
  padBag.flush(pcb, 'gold');
  traceBag.flush(pcb, 'bright', { outlineIt: false });
  /* 接地过孔阵列（实例化，256 个）+ 几个贴片元件 */
  const viaGeo = new THREE.CylinderGeometry(.5, .5, 3.6, 8);
  const vias = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      const x = -39 + i * 5.2;
      const z = -33 + j * 4.4;
      if (Math.abs(x) < 31 && Math.abs(z) < 31) continue;      // 让开裸片
      vias.push([x, 2.4, z]);
    }
  }
  instanced(pcb, viaGeo, 'dark', vias, '接地过孔阵列');
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
    box(pcb, [6, 1.6, 3.2], [s * 46, 5.4, -28 + k * 11], 'dark', '贴片元件（示意）');
  }

  /* ------------------------------------------------------------------ 裸片 */
  const die = piece('06_Quantum_die');
  box(die, [58, 1.8, 58], [0, 6.2, 0], 'chip', '超导量子处理器硅裸片');
  /* 倒装焊焊球阵列（实例化） */
  const bumpGeo = new THREE.SphereGeometry(1.05, 10, 6);
  const bumps = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    if (Math.abs(i - 4.5) < 2.2 && Math.abs(j - 4.5) < 2.2) continue;
    bumps.push([-27.5 + i * 6.1, 5.2, -27.5 + j * 6.1]);
  }
  instanced(die, bumpGeo, 'bright', bumps, '倒装焊焊球阵列');
  /* 边缘键合焊盘环 */
  const diePadGeo = new THREE.BoxGeometry(1.5, .3, 1.5);
  const diePads = kit.bag('芯片键合焊盘');
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    for (let j = 0; j < 24; j++) {
      const d = (j - 11.5) * 2.35;
      const xx = Math.cos(a) * 27.4 + Math.sin(a) * d;
      const zz = Math.sin(a) * 27.4 + Math.cos(a) * d;
      diePads.add(diePadGeo, [xx, 7.2, zz]);
    }
  }
  diePads.flush(die, 'silver');

  /* ------------------------------------------------------ 量子比特阵列 7×7 */
  const array = piece('07_Qubit_array');
  const cell = 7.2;
  const half = (cols - 1) / 2;

  /* 49 个比特是同一套形状，所以几何只建一次、按位置合并：
     不合并的话这里一个人就要堆出一千多个 draw call，手机上必掉帧。 */
  const armA = new THREE.BoxGeometry(cell * .74, .16, .95);
  const armB = new THREE.BoxGeometry(.95, .16, cell * .74);
  const junctionGeo = new THREE.BoxGeometry(1.1, .3, .8);
  const squidGeo = new THREE.TorusGeometry(1.5, .34, 6, 32);
  squidGeo.rotateX(Math.PI / 2);
  const fluxGeo = new THREE.CylinderGeometry(.32, .32, 1.8, 10);
  const fluxLoopGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 8.2, -3.4), new THREE.Vector3(0, 7.9, -2.6), new THREE.Vector3(1.2, 7.9, -2.4),
  ], false, 'centripetal'), 12, .34, 5, false);
  const resonatorGeo = (() => {
    const pts = [];
    for (let k = 0; k < 7; k++) {
      const zz = 3.4 + k * 1.5;
      pts.push(new THREE.Vector3(-1.3, 7.55, zz), new THREE.Vector3(1.3, 7.55, zz));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 32, .3, 5, false);
  })();
  const couplerXGeo = new THREE.CylinderGeometry(.42, .42, cell - 5.8, 10);
  couplerXGeo.rotateZ(Math.PI / 2);
  const couplerZGeo = new THREE.CylinderGeometry(.42, .42, cell - 5.8, 10);
  couplerZGeo.rotateX(Math.PI / 2);

  const arms = kit.bag('Transmon 电容长臂（示意）');
  const squid = kit.bag('SQUID 环与约瑟夫森结（示意）');
  const flux = kit.bag('磁通控制线与回环（示意）');
  const resonators = kit.bag('读出谐振腔（蜿蜒走线）');
  const couplers = kit.bag('比特间耦合总线');

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = (col - half) * cell;
      const cz = (row - half) * cell;
      /* 十字电容：两条正交的长臂 */
      arms.add(armA, [cx, 7.35, cz]).add(armB, [cx, 7.35, cz]);
      /* SQUID 环 + 两个约瑟夫森结 */
      squid.add(squidGeo, [cx + 2.5, 7.5, cz]);
      squid.add(junctionGeo, [cx + 2.5, 7.6, cz - 1.6]).add(junctionGeo, [cx + 2.5, 7.6, cz + 1.6]);
      /* 每比特一根磁通控制线（垂直段）+ 末端回环 */
      flux.add(fluxGeo, [cx, 8.9, cz - 4.2]).add(fluxLoopGeo, [cx, 0, cz]);
      /* 每比特一条蜿蜒读出谐振腔 */
      resonators.add(resonatorGeo, [cx, 0, cz]);
      /* 耦合总线：与右邻 / 下邻 */
      if (col < cols - 1) couplers.add(couplerXGeo, [cx + cell / 2, 7.5, cz]);
      if (row < rows - 1) couplers.add(couplerZGeo, [cx, 7.5, cz + cell / 2]);
    }
  }
  arms.flush(array, 'cyan');
  squid.flush(array, 'bright');
  flux.flush(array, 'dark', { outlineIt: false });
  resonators.flush(array, 'bright', { outlineIt: false });
  couplers.flush(array, 'silver', { outlineIt: false });

  /* --------------------------------------------------------- 蛇形馈线与发射 */
  const feed = piece('08_Readout_feedline');
  const feedPts = [];
  const span = (cols - 1) * cell;
  for (let i = 0; i <= 14; i++) {
    const zz = -span / 2 - 4 + (i / 14) * (span + 8);
    feedPts.push([-span / 2 - 5, 6.9, zz], [span / 2 + 5, 6.9, zz]);
  }
  pipe(feed, feedPts, .55, 'bright', '蛇形读出馈线', 60);
  for (const s of [-1, 1]) {
    box(feed, [3.2, 1.2, 6.4], [s * (span / 2 + 6.4), 6.9, -span / 2 - 4], 'gold', '馈线发射结构');
    pipe(feed, [[s * (span / 2 + 6.4), 6.9, -span / 2 - 4], [s * (span / 2 + 3.2), 6.9, -span / 2 - 4], [s * (span / 2 + 3.2), 6.9, span / 2 + 4]],
      .5, 'gold', '馈线引出段', 12);
  }

  /* ------------------------------------------------------------- 键合线与线束 */
  const wire = piece('09_Bonding_and_loom');
  const bondPadGeo = new THREE.BoxGeometry(1.7, .3, 1.7);
  const bondPads = kit.bag('载板键合着落焊盘');
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    for (let j = 0; j < 24; j++) {
      const d = (j - 11.5) * 2.35;
      const x1 = Math.cos(a) * 29.2 + Math.sin(a) * d;
      const z1 = Math.sin(a) * 29.2 + Math.cos(a) * d;
      const x2 = Math.cos(a) * 34.4 + Math.sin(a) * d;
      const z2 = Math.sin(a) * 34.4 + Math.cos(a) * d;
      pipe(wire, [[x1, 7.4, z1], [(x1 + x2) / 2, 10.2, (z1 + z2) / 2], [x2, 4.9, z2]], .28, 'bright', '铝键合线（可视化加粗）', 10);
      bondPads.add(bondPadGeo, [x2, 4.95, z2]);
    }
  }
  bondPads.flush(pcb, 'silver');
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = -30 + k * 20;
      pipe(wire, [[s * 52, 4.6, z], [s * 62, 10, z + 6], [s * 70, 16, z + 2], [s * 76, 22, z - 4]], 1.1, 'copper', '微波线束引出（示意）', 20);
    }
  }

  /* ------------------------------------------------------------------ 上盖 */
  const lid = piece('10_RF_package_lid');
  box(lid, [146, 6, 132], [0, 46, 0], 'white', '微波封装上盖');
  box(lid, [72, 1.4, 34], [0, 50, 0], 'silver', '封装铭牌');
  for (let i = 0; i < 7; i++) box(lid, [38 - i * 2.6, .5, .9], [-10, 49.2, -12 + i * 4], 'dark', '铭牌刻线');
  for (const x of [-60, 60]) for (const z of [-52, 52]) cyl(lid, 4, 3, [x, 50, z], 'silver', 6, '封装上盖螺钉');

  return {
    root,
    materials,
    pieces,
    stats: { ...kit.stats },
    groups: {
      shield, shieldR, shieldL, mount, pkg, sma, pcb, die, array, feed, wire, lid,
    },
  };
}
