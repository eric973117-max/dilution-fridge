/* ==========================================================================
   Bluefors LD 官方尺寸参考 + 按实测尺寸生成的构件

   所有数值来自 Bluefors 公开发布的资料，不是估的：
     · LD450 / LD350 规格表        bluefors.com/products/dilution-refrigerator-measurement-systems/
                                   ld-dilution-refrigerator-measurement-system/
     · 官方 3D 交互模型 LDsl        ldsl-system.bluefors.com
                                   模型文件 /models/LDsl.glb 里 12 个命名部件的包围盒
     · 官方产品照片                ld_1250 / ld-top_1250 / mxc_flange_hd_1250

   坐标约定：y 向上为正，室温法兰中心为 y = BF.flange。
   下面每个标高都标注了对应的实测值，改之前请回官方资料核对。
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';

/* ---------------------------------------------------------------- 尺寸表 */

/** 室温法兰中心的 y。整机其余标高都由它推出。 */
const Y0 = 0.360;

/** 官方实测：把世界坐标 y 换算到本站坐标 */
const at = (worldY) => Y0 + (worldY - 2.075);

export const BF = {
  /* 竖直方向：上表面 / 下表面（官方 GLB 包围盒，单位 m） */
  rtTop: at(2.075), rtBot: at(2.047),      // 室温法兰 Ø600 × 28
  p50Top: at(1.900), p50Bot: at(1.868),    // 50 K 法兰 Ø447 × 32
  p4Top: at(1.612), p4Bot: at(1.581),      // 4 K 法兰  Ø352 × 31
  stillTop: at(1.346), stillBot: at(1.318),// Still 法兰 Ø306 × 28
  coldTop: at(1.176), coldBot: at(1.163),  // 冷板 Ø298 × 13
  mcTop: at(1.008), mcBot: at(0.996),      // 混合室法兰 Ø298 × 12
  duTop: at(1.325), duBot: at(1.004),      // 稀释单元本体 Ø98
  expTop: at(1.007), expBot: at(0.541),    // 实验空间
  ovcTop: at(2.063), ovcBot: at(0.458),    // 真空罩与辐射屏蔽 Ø516
  ptTop: at(2.225), ptBot: at(1.629),      // 脉冲管 Ø205，长 596

  /* 半径（官方 GLB 的 X/Z 跨度 ÷ 2） */
  rt: 0.300,      // 室温法兰 Ø600
  ovc: 0.258,     // 真空罩外筒 Ø516
  p50: 0.2235,    // 50 K 法兰 Ø447
  p4: 0.176,      // 4 K 法兰  Ø352
  still: 0.153,   // Still 法兰 Ø306
  cold: 0.149,    // 冷板 Ø298
  mc: 0.149,      // 混合室法兰 Ø298 —— 官方规格书写 294 mm，取模型实测 298
  pt: 0.1025,     // 脉冲管 Ø205
  du: 0.049,      // 稀释单元 Ø98

  /* 温度（官方文案原文） */
  tRT: '300 K', t50: '~50 K', t4: '~4 K',
  tStill: '0.6–0.9 K', tCold: '100–120 mK', tMC: '<10 mK',
};

/** 两级之间的净空 —— 用来校核支撑杆、线束、屏蔽筒的长度 */
export const GAPS = {
  rtTo50: BF.rtBot - BF.p50Top,     // 0.147
  k50To4: BF.p50Bot - BF.p4Top,     // 0.256
  k4ToStill: BF.p4Bot - BF.stillTop,// 0.235
  stillToCold: BF.stillBot - BF.coldTop, // 0.142
  coldToMC: BF.coldBot - BF.mcTop,  // 0.155
  mcToOvc: BF.mcBot - BF.ovcBot,    // 0.538
};

/** 真空罩 / 屏蔽筒的实际层次。
    官方外观照片里是「上粗下细两个罐 + 中间一圈卡箍法兰」，
    所以真空外筒做成两段变径，辐射屏蔽吊在各自的冷台下面。
    半径必须严格递减，否则屏蔽筒会穿出筒壁：
      外筒上段 0.258 > 50 K 屏蔽 0.219 > 外筒下段 0.206 > 4 K 屏蔽 0.172 > 内筒 0.150 */
export const SHELLS = [
  { key: 'ovc', r: BF.ovc, top: BF.rtBot - 0.002, bot: -0.640, seg: 120, clamp: true },
  { key: 'ovcLower', r: 0.206, top: -0.640, bot: BF.ovcBot + 0.002, seg: 104 },
  { key: 'shield50', r: 0.219, top: BF.p50Bot, bot: -0.632, seg: 104 },
  { key: 'shield4', r: 0.172, top: BF.p4Bot, bot: -1.230, seg: 96 },
  { key: 'ivc', r: 0.150, top: -0.700, bot: BF.ovcBot + 0.004, seg: 88 },
];

/* --------------------------------------------------------- 官方部件清单 */

/** 官方 3D 模型里 10 个部件的顺序、名称与温度，逐条对应 Bluefors 官网文案 */
export const BF_PARTS = [
  { n: 1, key: 'rt', en: 'Room Temperature Flange', zh: '室温法兰', t: '300 K',
    note: '整机从这块法兰吊装，所有电气、微波与气体接口都开在它上面。' },
  { n: 2, key: 'pt', en: 'Pulse Tube Cryocooler', zh: '脉冲管制冷机', t: '50 K / 4 K',
    note: '二级脉冲管，一级约 50 K、二级略低于 4 K；用柔性铜编织带与各级做热连接。' },
  { n: 3, key: 'p50', en: '50K Flange', zh: '50 K 法兰', t: '~50 K',
    note: '第一级冷台，拦截从室温下来的热量，冷却辐射屏蔽、线缆与结构件。' },
  { n: 4, key: 'p4', en: '4K Flange', zh: '4 K 法兰', t: '~4 K',
    note: 'He-3/He-4 混合气在这一级冷凝成液体，成为稀释循环的工作介质。' },
  { n: 5, key: 'still', en: 'Still Flange', zh: '蒸馏室法兰', t: '0.6–0.9 K',
    note: '混合液经换热器预冷后在此节流膨胀，He-3 优先蒸发带走热量。' },
  { n: 6, key: 'cold', en: 'Cold Plate', zh: '冷板', t: '100–120 mK',
    note: 'Still 与混合室之间的中间热沉，为线缆和元件提供热锚点。' },
  { n: 7, key: 'du', en: 'Dilution Unit', zh: '稀释单元', t: '<0.87 K',
    note: '0.87 K 以下 He-3/He-4 分相，He-3 从浓相穿过相界面进入稀相时吸热。' },
  { n: 8, key: 'mc', en: 'Mixing Chamber Flange', zh: '混合室法兰', t: '<10 mK',
    note: '全机最低温的热沉，量子器件直接装在它的下表面。' },
  { n: 9, key: 'exp', en: 'Experimental Space', zh: '实验空间', t: '<10 mK',
    note: '样品挂在混合室法兰下面，控制与读取线从室温法兰一路引到这里。' },
  { n: 10, key: 'ovc', en: 'Vacuum Enclosure & Shields', zh: '真空罩与辐射屏蔽', t: '—',
    note: '真空消除传导与对流，抛光铝/铜屏蔽层反射掉外层来的热辐射。' },
];

/** 官方规格表（LD450）—— 站点里所有数字都该用这一组 */
export const BF_SPEC = {
  model: 'LD450',
  baseTemp: '10 mK',
  power20mK: '14 µW',
  power100mK: '450 µW',
  mxcFlange: '294 mm',
  cooldown: '24 h',
  he3: '18 L',
  ports: '2 × ISO-K63 / 5 × KF40',
  rtFlange: 'Ø600 mm',
  envelope: '1.77 m',
};

/* -------------------------------------------------------------- 来源清单 */

export const SOURCES = [
  {
    claim: '基础温度 10 mK、100 mK 制冷量 450 µW、20 mK 制冷量 14 µW、混合室法兰 294 mm、降温 24 h',
    src: 'Bluefors LD System 产品页 · Technical Specifications',
    url: 'https://bluefors.com/products/dilution-refrigerator-measurement-systems/ld-dilution-refrigerator-measurement-system/',
  },
  {
    claim: '十个部件的外观、顺序与相对尺寸（室温法兰 Ø600、50 K 法兰 Ø447、4 K 法兰 Ø352、Still Ø306、冷板 Ø298、混合室 Ø298、真空罩 Ø516、脉冲管 Ø205）',
    src: 'Bluefors 官方 3D 交互模型 LDsl System，模型文件 LDsl.glb 的命名部件包围盒',
    url: 'https://ldsl-system.bluefors.com/',
  },
  {
    claim: '各级工作温度与功能说明（Still 0.6–0.9 K、冷板 100–120 mK、混合室 <10 mK、0.87 K 分相、铜编织带柔性热连接）',
    src: '同上，官方 3D 模型的部件说明文案',
    url: 'https://ldsl-system.bluefors.com/',
  },
  {
    claim: '安装盘为镀金无氧铜、抛光不锈钢支撑杆、半刚性同轴 + SMA 衰减器链的视觉特征',
    src: 'Bluefors 官方产品照片 ld_1250 / ld-top_1250 / mxc_flange_hd_1250',
    url: 'https://cdn.bluefors.com/wp-content/uploads/2023/09/22150042/ld_1250.png',
  },
];

/* ------------------------------------------------------------------ 导出 */

export const BOUNDS = {
  yMax: BF.ptTop,
  yMin: BF.ovcBot - 0.02,
};

/* ------------------------------------------------------------ 盘形几何 */

/**
 * 一块安装盘的平面轮廓 —— 官方照片里的盘长这样：
 *   · 圆盘两侧切平（不是正圆，切平处是加工基准面）
 *   · 沿外缘一圈大减重孔 / 走线孔
 *   · 中间可能有中心通孔（稀释单元穿过去）
 * 返回 THREE.Shape，交给 ExtrudeGeometry 挤出厚度 —— 孔是真孔，不是贴图。
 */
export function plateOutline({ r, bore = 0, flats = 0, holes = [], seg = 128 }) {
  const s = new THREE.Shape();
  const xc = Math.max(1e-4, r - flats);
  const half = Math.sqrt(Math.max(0, r * r - xc * xc));
  const aR = Math.atan2(half, xc);
  const arc = Math.round(seg * 0.72);

  s.moveTo(xc, half);
  for (let i = 1; i <= arc; i++) {
    const a = aR - (2 * aR) * (i / arc);          // 右侧弧，经过 0°
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.lineTo(-xc, -half);                            // 底边切平
  for (let i = 1; i <= arc; i++) {
    const a = Math.PI + aR - (2 * aR) * (i / arc); // 左侧弧，经过 180°
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();

  const addHole = (x, y, hr) => {
    if (hr <= 0) return;
    const p = new THREE.Path();
    p.absarc(x, y, hr, 0, Math.PI * 2, true);
    s.holes.push(p);
  };
  if (bore > 0) addHole(0, 0, bore);
  holes.forEach(([x, y, hr]) => addHole(x, y, hr));
  return s;
}

/** 沿外缘均布的大减重孔，官方盘上一般 4–8 个 */
export function lighteningHoles(r, count = 6, ringScale = 0.70, holeScale = 0.155, phase = 0.4) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + phase;
    out.push([Math.cos(a) * r * ringScale, Math.sin(a) * r * ringScale, r * holeScale]);
  }
  return out;
}

/** 盘面密集螺纹孔：极坐标交错排布。用固定种子，保证每次刷新模型完全一致 */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 返回盘面螺纹孔的线框点对（世界 XZ 平面，y = 面高），用于线稿模式叠在实体上 */
export function tappedHoleLoops(r, y, { pitch = 0.0145, inner = 0.30, outer = 0.90, seed = 7 } = {}) {
  const rand = seeded(seed);
  const pts = [];
  const holeR = 0.0021;
  const steps = 7;
  const bigRing = lighteningHoles(r);
  const rows = Math.max(2, Math.floor((r * outer - r * inner) / pitch));
  for (let i = 0; i <= rows; i++) {
    const rr = r * inner + i * pitch;
    const n = Math.max(4, Math.round((Math.PI * 2 * rr) / pitch));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (i % 2) * (Math.PI / n);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      if (rand() > 0.82) continue;
      let clash = false;
      for (const [hx, hz, hr] of bigRing) {
        if (Math.hypot(x - hx, z - hz) < hr + pitch * 0.55) { clash = true; break; }
      }
      if (clash) continue;
      for (let s = 0; s < steps; s++) {
        const a0 = (s / steps) * Math.PI * 2;
        const a1 = ((s + 1) / steps) * Math.PI * 2;
        pts.push(
          x + Math.cos(a0) * holeR, y, z + Math.sin(a0) * holeR,
          x + Math.cos(a1) * holeR, y, z + Math.sin(a1) * holeR,
        );
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(geo);
  lines.userData.isWire = true;
  return lines;
}

export default BF;
