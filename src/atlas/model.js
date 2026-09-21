import * as THREE from '../../vendor/three.module.js';
import { buildChipPackage } from './chip-package.js';
import { EVIDENCE, LOS_SECTORS, PULSE_SECTORS, PLATE_DIAMETERS, PLATE_Y, cableBanks, cableType, cablePoint, attenuation } from './xld.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { seg } from '../machine/density.js';
/* 让出一次主线程（分块建模用）：按标签页可见性自动选 rAF / MessageChannel，见 src/yield.js */
import { yieldToBrowser as nextFrame } from '../yield.js';

export const DEFAULTS = Object.freeze({ diameter: 700, spacing: 220, channels: 65, supports: 8, qubits: 36 });
export const SOURCES = [
  { title: 'Bluefors — XLDsl System', url: 'https://bluefors.com/products/dilution-refrigerator-measurement-systems/xldsl-dilution-refrigerator-measurement-system/', scope: '500 mm MXC 法兰系列尺寸参考；中央稀释单元；六侧装口；双脉冲管。不是历史 XLD400 全尺寸图。' },
  { title: 'Krinner et al. — Engineering cryogenic setups (2019)', url: 'https://doi.org/10.1140/epjqt/s40507-019-0072-0', scope: '用户照片的实验配置：25驱动+25磁通+6读入+5泵浦+4输出；88 mm 开口、104 mm 热锚板、0.085英寸同轴；20/20/20 dB 驱动衰减；四通道 TWPA/HEMT 链。' },
  { title: 'Bluefors — How Does a Dilution Refrigerator Work?', url: 'https://bluefors.com/stories/how-does-a-dilution-refrigerator-work/', scope: '蒸馏室、连续与阶梯换热器、混合室位于 MXC 法兰上方；实验空间在法兰下方。' },
];
export const STAGES = [
  { id: 'room', name: '室温顶法兰', en: 'ROOM TEMPERATURE', temperature: '300 K', kelvin: 300, material: '不锈钢 / 铝（材质示意）', description: '封闭室温法兰，配六个 LOS 预留口和三组已装真空 SMA 馈通。默认65条RF接口与低温线路一一对应；另设双脉冲管接口与气路接口。' },
  { id: '50k', name: '50 K 级冷板', en: 'FIRST COOLING STAGE', temperature: '35 K', kelvin: 35, material: '铝 / 铜热锚（示意）', description: '名称为50 K级；论文图示工作温度35 K，不是实时测量。脉冲管一级以柔性铜带接入，线缆采用铜夹块热化，无额外离散衰减器。' },
  { id: '4k', name: '4 K 级冷板', en: 'SECOND COOLING STAGE', temperature: '3 K', kelvin: 3, material: '镀金铜 / 铝屏蔽（示意）', description: '图示约3 K；论文空载表为2.85 K。装有4个HEMT、驱动20 dB衰减、磁通10 dB衰减、泵浦20 dB衰减。两台脉冲管冷端位于独立扇区。' },
  { id: 'still', name: '蒸馏室温级', en: 'STILL STAGE', temperature: '900 mK', kelvin: .9, material: '铜 / 不锈钢（示意）', description: '图示900 mK，空载表882 mK。中央蒸馏室加热促进氦-3蒸发并抽回室温泵组。下方连续换热盘管连接CP；有独立铜辐射罩。' },
  { id: 'cold', name: '冷板 CP', en: 'COLD PLATE', temperature: '100 mK', kelvin: .1, material: '镀金铜（示意）', description: '图示100 mK，空载表82 mK。安装驱动20 dB、泵浦10 dB衰减和4个环行器。参考论文CP不单独配辐射罩；板间距仍为估算而非表中的线缆长度。' },
  { id: 'mc', name: '混合室 MXC', en: 'MIXING CHAMBER', temperature: '10 mK', kelvin: .01, material: '镀金无氧铜（示意）', description: '图示10 mK，论文空载约6 mK。混合室容器位于此板上方，芯片与四通道读出前端位于下方。默认法兰直径500 mm取自XLDsl系列公开规格，历史设备未实测。' },
];
export const COMPONENTS = [
  ...STAGES.map((s, index) => ({ ...s, icon: index === 0 ? 'disc-3' : 'layers', kind: 'stage' })),
  { id: 'pulse', name: '脉冲管冷却器', en: 'PULSE TUBE COOLERS', temperature: '50 / 4 K', icon: 'cylinder', material: '不锈钢 / 铜编织带（示意）', description: '双冷头示意：由室温阀头、分段脉冲管、波纹管和柔性铜热连接构成。两级预冷分别连接 50 K 与 4 K 冷板。' },
  { id: 'helium', name: '氦循环与换热器', en: 'DILUTION CIRCUIT', temperature: '4 K → mK', icon: 'waypoints', material: '铜 / CuNi / 烧结银（示意）', description: '包含冷凝段、蒸馏罐、回气管、毛细管、连续盘管、阶梯式换热器与混合室容器。气路仅表达功能结构，不作为阀控或工艺图。' },
  { id: 'wiring', name: '侧装 RF 线缆树', en: 'SIDE-LOADING CABLE TREES', temperature: '300 K → mK', icon: 'cable', material: 'UT085 SS-SS / 低温输出 NbTi', description: '默认三棵线缆树共65条：25驱动、25磁通、6读入、5泵浦、4输出。104 mm铜板、5×5端口网格和楔形夹块；同轴外径2.159 mm。用S弯代替装饰圆圈；输出线4 K以下转入冷头下方。' },
  { id: 'readout', name: '四通道读出链', en: 'FOUR-CHANNEL READOUT', temperature: 'MXC / CP / 4 K', icon: 'radio', material: '铜支架 / 微波器件外形估算', description: '按论文：MXC两组四通道隔离器、4个定向耦合器、4个TWPA与带通；CP四个环行器；4 K四个HEMT。低温输出NbTi；泵浦50 dB总衰减包含20 dB耦合器。几何接口仍为估算。' },
  { id: 'chip', name: '量子芯片与封装', en: 'QUANTUM PROCESSOR', temperature: '10 mK', icon: 'cpu', material: '硅 / 铜封装 / 载板（估算）', description: '添加的通用芯片装配，不是照片中芯片的复刻：热沉、承托层、载板、裸片、键合线、上盖和SMA。仅接入代表性输入及四通道输出，其余RF保留为已标记的实验端口。芯片图案不用于制造。' },
  { id: 'magnetic', name: 'Cryoperm 磁屏蔽', en: 'MAGNETIC SHIELD', temperature: 'mK', icon: 'shield-check', material: '高磁导率合金（示意）', description: '芯片外围的 Cryoperm 磁屏蔽示意，配合封装与辐射屏蔽降低环境干扰。默认以剖开形式呈现；模型未计算屏蔽因子。' },
  { id: 'radiation', name: '四级辐射屏蔽', en: 'RADIATION SHIELDS', temperature: '50K / 4K / Still / MXC', icon: 'shield', material: '50K与4K铝罩；Still与MXC铜罩', description: '按参考论文补齐四级嵌套辐射罩；CP不单独配罩。2 mm壁厚为估算，有板面连接法兰与底盖。剖视开关控制前半筒可见性，GLB包含完整筒壁；未进行气密或辐射热仿真。', optional: true },
  { id: 'vacuum', name: '真空外壳', en: 'OUTER VACUUM CHAMBER', temperature: '300 K', icon: 'container', material: '不锈钢（示意）', description: '室温真空外罩与底盖构成隔热真空边界。开口为可视化剖切而非实际开孔；真空口、密封槽、法兰螺栓仅按假设构建。默认隐藏。', optional: true },
  { id: 'services', name: '泵组与气体处理', en: 'GAS HANDLING SYSTEM', temperature: '300 K', icon: 'settings-2', material: '不锈钢 / 铝（示意）', description: '室温气体处理机架、混合气储罐、无油泵、阀组、压力表与示意回路。不按实际设备间距布置，也不包含专用型号和联锁设计。默认隐藏。', optional: true },
];

export function normalizeParams(input = {}) {
  const finite = (key, min, max, step) => {
    const n = Number(input[key] ?? DEFAULTS[key]);
    return Math.min(max, Math.max(min, Math.round((Number.isFinite(n) ? n : DEFAULTS[key]) / step) * step));
  };
  const option = (key, choices) => choices.includes(Number(input[key])) ? Number(input[key]) : DEFAULTS[key];
  return { diameter: finite('diameter', 650, 800, 10), spacing: finite('spacing', 190, 310, 5), channels: option('channels', [24, 48, 65, 72]), supports: option('supports', [6, 8]), qubits: option('qubits', [16, 36, 64]) };
}

export async function createCryostat(input = {}) {
  const params = normalizeParams(input);
  const root = new THREE.Group();
  root.name = 'DR-01_Parametric_Dilution_Refrigerator';
  root.scale.setScalar(.001);
  root.userData = { units: 'Geometry is mm; root scale converts to meters', parameterUnits: 'mm', parameters: params, lodStatus: 'High-detail design illustration. NOT field-verified LOD 500.', sources: SOURCES, schemaVersion: 1 };
  const materials = {
    white: new THREE.MeshStandardMaterial({ color: 0xdce9e6, roughness: .58, metalness: .24 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xa2b9b5, roughness: .45, metalness: .45 }),
    bright: new THREE.MeshStandardMaterial({ color: 0xf0faf7, roughness: .36, metalness: .32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x283d3b, roughness: .65, metalness: .3 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0x728e86, roughness: .72, metalness: .05 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x133734, roughness: .22, metalness: .7 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x9af4df, emissive: 0x417a6c, emissiveIntensity: .32, roughness: .5, metalness: .25 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x7eaaa0, roughness: .7, metalness: .15, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xdce9e6, roughness: .42, metalness: .48 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb6c6c0, roughness: .48, metalness: .52 }),
  };
  Object.entries(materials).forEach(([key, mat]) => { mat.name = key; mat.userData.baseColor = mat.color.getHex(); });
  const records = new Map(COMPONENTS.map(c => [c.id, { ...c, groups: [], count: 0 }]));
  const stageGroups = [];
  const chipPieces = [];
  const shells = [];
  const geometries = new Map();
  const bill = new Map();
  let count = 0;
  const factor = params.spacing / 220;
  const ys = PLATE_Y.map(y => y * factor);
  const R = params.diameter / 2;
  const radii = PLATE_DIAMETERS.map(d => d * params.diameter / 1400);
  const cableRadius = radii[5] - 48;
  const banks = cableBanks(params.channels);
  const connections = [];
  const shellFronts = [];
  const mechanical = { plates: radii.map((r, i) => ({ stage: STAGES[i].id, diameterMM: 2 * r, yMM: ys[i], thicknessMM: i === 0 ? 15 : 8 })), slots: [], contacts: [] };
  root.userData.evidence = EVIDENCE;
  root.userData.modelRevision = 'XLD-reference-v2';
  function portPoint(sector, index) { return cablePoint(cableRadius, sector, index); }
  function recordConnection(id, owner, start, end, type) {
    connections.push({ id, owner, start: [...start], end: [...end], type });
  }
  const geometry = (key, create) => {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  };
  function group(parent, id, name = id) {
    const g = new THREE.Group();
    g.name = name;
    const rec = records.get(id);
    g.userData = { componentId: id, name: rec.name, materialSpecification: rec.material, temperature: rec.temperature, verificationStatus: 'unverified-design-assumption' };
    parent.add(g);
    rec.groups.push(g);
    return g;
  }
  function add(parent, geo, mat, pos = [0, 0, 0], kind = '结构件', rotation) {
    const m = new THREE.Mesh(geo, materials[mat]);
    m.position.set(...pos);
    if (rotation) m.rotation.set(...rotation);
    m.name = kind;
    parent.add(m);
    count++;
    const id = parent.userData.componentId;
    if (records.has(id)) records.get(id).count++;
    const key = `${id}|${kind}|${mat}`;
    if (!bill.has(key)) bill.set(key, { assembly: id, part: kind, visualMaterial: mat, quantity: 0, verified: false });
    bill.get(key).quantity++;
    return m;
  }
  function cyl(parent, radius, height, pos, mat = 'white', segments = 24, kind = '圆柱件', rotation) {
    const s = seg(segments);
    return add(parent, geometry(`c:${radius}:${height}:${s}`, () => new THREE.CylinderGeometry(radius, radius, height, s)), mat, pos, kind, rotation);
  }
  function box(parent, size, pos, mat = 'white', kind = '壳体') {
    return add(parent, geometry(`b:${size.join(':')}`, () => new THREE.BoxGeometry(...size)), mat, pos, kind);
  }
  function ring(parent, radius, tube, pos, mat = 'silver', rotation = [Math.PI / 2, 0, 0], kind = '密封环') {
    return add(parent, geometry(`t:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, seg(6, 3), seg(80, 10))), mat, pos, kind, rotation);
  }
  function pipe(parent, points, radius = 1.15, mat = 'bright', kind = '管线', segments = 20) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    return add(parent, new THREE.TubeGeometry(curve, seg(segments), radius, seg(5, 3), false), mat, [0, 0, 0], kind);
  }
  function rod(parent, a, b, radius = 4, mat = 'silver', kind = '支撑杆') {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const mesh = cyl(parent, radius, delta.length(), start.add(end).multiplyScalar(.5).toArray(), mat, 14, kind);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  }
  function bolts(parent, radius, y, n = 32, size = 2.4) {
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n;
      const p = [Math.cos(a) * radius, y, Math.sin(a) * radius];
      cyl(parent, size * 1.5, .9, p, 'silver', 16, '螺栓垫圈');
      cyl(parent, size, 3.3, [p[0], y + 1.7, p[2]], 'bright', 6, '六角紧固件');
      cyl(parent, size * .42, .3, [p[0], y + 3.5, p[2]], 'dark', 6, '内六角孔示意');
    }
  }
  function plate(parent, radius, thickness, index) {
    const shape = new THREE.Shape();
    const hole = (x, z, r) => { const p = new THREE.Path(); p.absarc(x, z, r, 0, Math.PI * 2, true); shape.holes.push(p); };
    if (index === 0) {
      shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
      for (const sector of LOS_SECTORS) {
        const [x, z] = portPoint(sector, 12);
        hole(x, z, 59);
      }
    } else {
      const delta = Math.asin(EVIDENCE.published.slotWidthMM / (2 * radius));
      const inner = cableRadius - 44;
      shape.moveTo(radius * Math.cos(-delta), radius * Math.sin(-delta));
      for (let j = 0; j < LOS_SECTORS.length; j++) {
        const a = LOS_SECTORS[j] * Math.PI / 4;
        const rotate = (r, t) => [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t];
        shape.lineTo(...rotate(inner, -44));
        shape.lineTo(...rotate(inner, 44));
        shape.lineTo(radius * Math.cos(a + delta), radius * Math.sin(a + delta));
        const next = j + 1 < LOS_SECTORS.length ? LOS_SECTORS[j + 1] * Math.PI / 4 - delta : Math.PI * 2 - delta;
        shape.absarc(0, 0, radius, a + delta, next, false);
        mechanical.slots.push({ stage: index, sector: LOS_SECTORS[j], widthMM: 88, innerRadiusMM: inner });
      }
      shape.closePath();
    }
    if (index >= 3) {
      const [cx, cz] = portPoint(7, 12);
      for (let j = 0; j < 4; j++) {
        const x = cx + (j - 1.5) * 20;
        const p = new THREE.Path();
        p.moveTo(x - 8.5, cz - 10.5); p.lineTo(x - 8.5, cz + 10.5); p.lineTo(x + 8.5, cz + 10.5); p.lineTo(x + 8.5, cz - 10.5); p.closePath();
        shape.holes.push(p);
      }
    }
    if (index < 5) { hole(-35, 0, 5); hole(35, 0, 5); }
    if (index < 3) {
      hole(0, 0, 18);
      for (const sector of PULSE_SECTORS) { const [x, z] = portPoint(sector, 12); hole(x, z, 27); }
    }
    for (const x of [-90, 90]) for (const z of [-60, 60]) { if (index <= 2 || x < 0) hole(x, z, 5); }
    const supportSlots = params.supports === 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 4, 5, 6];
    for (const k of supportSlots) {
      const a = (k + .5) * Math.PI / 4, r = radii[5] - 15;
      hole(Math.cos(a) * r, Math.sin(a) * r, 3.1);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(Math.PI / 2);
    add(parent, geo, index < 2 ? 'white' : 'gold', [0, thickness / 2, 0], 'LOS槽及安装孔法兰');
    if (index === 0) { ring(parent, radius - 8, 1.2, [0, 8, 0], 'silver'); bolts(parent, radius - 13, 8, 48, 2.3); }
    if (index === 5) {
      for (let x = -100; x <= 100; x += 20) for (let z = -100; z <= 100; z += 20) {
        if (Math.hypot(x, z) < 50) continue;
        cyl(parent, 1.5, .2, [x, 4.1, z], 'dark', 10, '实验安装螺孔位置示意');
      }
    }
  }
  function connector(parent, x, y, z) {
    cyl(parent, 3.5, 6, [x, y, z], 'silver', 6, 'SMA 连接器外壳');
    cyl(parent, 2, 6, [x, y + 4, z], 'bright', 16, '连接器馈针护套');
    ring(parent, 3.6, .5, [x, y - 2, z], 'dark', undefined, '连接器绝缘分隔');
  }
  function coil(parent, center, coilRadius, height, turns, pipeRadius = 1.5, mat = 'white') {
    const points = [];
    for (let k = 0; k <= turns * 20; k++) {
      const t = k / (turns * 20), a = t * turns * Math.PI * 2;
      points.push([center[0] + Math.cos(a) * coilRadius, center[1] - height * t, center[2] + Math.sin(a) * coilRadius]);
    }
    pipe(parent, points, pipeRadius, mat, '盘管换热器', turns * 32);
  }
  function shell(parent, id, radius, height, y, offset, mat = 'shell') {
    const g = group(parent, id, `${id}_${parent.name}_shell`);
    g.position.y = y;
    const wall = 2;
    g.userData.shell = { radiusMM: radius, heightMM: height, wallMM: wall, geometryStatus: 'dimension-estimate', closedGeometryExport: true };
    const section = (owner, start, end) => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, radius, start, end, false);
      shape.absarc(0, 0, radius - wall, end, start, true);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 48 });
      geo.rotateX(Math.PI / 2);
      add(owner, geo, mat, [0, 0, 0], '有壁厚屏蔽筒壁');
    };
    const front = group(g, id, `${g.name}_cutaway_front`);
    front.userData.cutawayFront = true;
    section(front, -.18, Math.PI * .88);
    section(g, Math.PI * .88, Math.PI * 2 - .18);
    shellFronts.push(front);
    cyl(g, radius, 3, [0, -height + 1.5, 0], mat, 80, '屏蔽筒底盖');
    const flange = new THREE.Shape();
    flange.absarc(0, 0, radius + 5, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, radius - 10, 0, Math.PI * 2, true); flange.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(flange, { depth: 3, bevelEnabled: false, curveSegments: 48 });
    geo.rotateX(Math.PI / 2);
    add(g, geo, mat, [0, 0, 0], '屏蔽罩板面连接法兰');
    shells.push({ group: g, base: g.position.clone(), offset });
    return g;
  }

  STAGES.forEach((s, i) => {
    const stage = group(root, s.id, `${String(i).padStart(2, '0')}_${s.en}`);
    stage.position.y = ys[i];
    stage.userData.kelvin = s.kelvin;
    stageGroups.push(stage);
    plate(stage, radii[i], i === 0 ? 15 : 8, i);
    stage.userData.diameterMM = radii[i] * 2;
    if (i > 0) {
      const height = ys[i - 1] - ys[i];
      const upperBottom = height - (i === 1 ? 7.5 : 4);
      const slots = params.supports === 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 4, 5, 6];
      for (const k of slots) {
        const a = (k + .5) * Math.PI / 4;
        const x = Math.cos(a) * (radii[5] - 15), z = Math.sin(a) * (radii[5] - 15);
        rod(stage, [x, 10, z], [x, upperBottom - 6, z], 4, 'silver', '分段薄壁支撑柱');
        for (const y of [7, upperBottom - 3]) {
          box(stage, [16, 6, 16], [x, y, z], 'bright', '支撑端部安装座');
          cyl(stage, 6.5, 4, [x, y, z], 'silver', 6, '支撑端部紧固件');
        }
        mechanical.contacts.push({ kind: 'support', stage: i, lowerMM: 4, lowerPlateMM: 4, upperMM: upperBottom, upperPlateMM: upperBottom, x, z });
      }
    }
    const sensorX = 85;
    const surface = i === 0 ? 7.5 : 4;
    box(stage, [14, 8, 9], [sensorX, surface + 4, -25], 'dark', ['室温传感器', 'PT100', 'Cernox CX-1010', 'Cernox CX-1010', 'RuO2 RX-102B', 'RuO2 RX-102B'][i]);
    box(stage, [12, 6, 7], [sensorX, surface + 3, -43], 'silver', '电阻加热器');
    pipe(stage, [[sensorX, 15, -25], [sensorX + 12, 20, -35], [sensorX + 24, 16, -60]], .55, 'cyan', '传感器引线', 12);
  });

  const top = stageGroups[0];
  for (const x of [-70, 70]) {
    cyl(top, 25, 8, [x, 11.5, -70], 'white', 36, 'KF40 端口底法兰');
    cyl(top, 18, 38, [x, 34.5, -70], 'silver', 24, '真空馈通颈管');
    ring(top, 25, 3, [x, 56, -70], 'bright', undefined, 'KF40 快卸卡箍');
    box(top, [12, 6, 7], [x + 25, 56, -70], 'silver', '卡箍闭合耳');
    cyl(top, 24, 3, [x, 58, -70], 'white', 36, '未接端口盲盖');
  }
  const lifting = radii[5] - 15;
  for (const a of [Math.PI / 8, Math.PI * 9 / 8]) {
    const x = Math.cos(a) * lifting, z = Math.sin(a) * lifting;
    cyl(top, 14, 16, [x, 15.5, z], 'silver', 24, '吊装安装柱');
    ring(top, 12, 3.5, [x, 34, z], 'bright', [0, 0, 0], '吊装环');
  }

  for (const sector of PULSE_SECTORS) {
    const [x, z] = portPoint(sector, 12);
    const head = group(top, 'pulse', `PT_${sector}_room_head`);
    cyl(head, 36, 8, [x, 11.5, z], 'white', 48, '脉冲管密封安装法兰');
    cyl(head, 24, 70, [x, 50.5, z], 'silver', 40, '脉冲管室温阀头');
    cyl(head, 28, 6, [x, 88.5, z], 'bright', 40, '阀头上盖');
    for (let j = 0; j < 12; j++) ring(head, 24.5, 1, [x, 20 + j * 5.5, z], 'white', undefined, '阀头翅环');
    rod(head, [x, 7.5, z], [x, -18, z], 18, 'silver', '脉冲管真空穿板段');
    for (let i = 1; i <= 2; i++) {
      const pg = group(stageGroups[i], 'pulse', `PT_${sector}_stage_${i}`);
      const height = ys[i - 1] - ys[i];
      for (const dx of [-9, 9]) {
        rod(pg, [x + dx, 18, z], [x + dx, height - 18, z], i === 1 ? 6.5 : 4.5, 'silver', '脉冲管与再生器分支');
      }
      for (let k = 0; k < 30; k++) ring(pg, 17, .95, [x, 28 + k * (height - 62) / 29, z], 'bright', undefined, '冷头波纹套');
      cyl(pg, 24, 36, [x, 0, z], 'copper', 40, '两级冷端铜热锚');
      const a = sector * Math.PI / 4, tx = x - Math.cos(a) * 48, tz = z - Math.sin(a) * 48;
      box(pg, [22, 5, 23], [tx, 6.5, tz], 'copper', '铜编织带板面压接座');
      for (let k = 0; k < 9; k++) {
        pipe(pg, [[x, 10, z + k - 4], [(x + tx) / 2, 32 + k * .6, (z + tz) / 2], [tx, 8, tz + k - 4]], .8, 'copper', '柔性铜编织热带', 20);
      }
    }
  }

  const rfPorts = [];
  for (let i = 0; i < 6; i++) {
    const wires = group(stageGroups[i], 'wiring', `RF_thermalization_${i}`);
    for (const sector of LOS_SECTORS) {
      const bank = banks.find(b => b.sector === sector);
      const n = bank ? (i > 2 && bank.type === 'readout' ? 11 : bank.count) : 0;
      const a = sector * Math.PI / 4;
      const [cx, cz] = portPoint(sector, 12);
      const adapter = new THREE.Shape();
      if (i === 0) adapter.absarc(0, 0, 65, 0, Math.PI * 2, false);
      else { adapter.moveTo(-52, -52); adapter.lineTo(52, -52); adapter.lineTo(52, 52); adapter.lineTo(-52, 52); adapter.closePath(); }
      for (let j = 0; j < n; j++) {
        const p = new THREE.Path();
        p.absarc((Math.floor(j / 5) - 2) * 16, (j % 5 - 2) * 16, 3.5, 0, Math.PI * 2, true);
        adapter.holes.push(p);
      }
      const geo = new THREE.ExtrudeGeometry(adapter, { depth: 8, bevelEnabled: false, curveSegments: 12 });
      geo.rotateX(Math.PI / 2); geo.rotateY(-a);
      add(wires, geo, i === 0 ? 'silver' : 'copper', [cx, i === 0 ? 15.5 : 12, cz], n ? '可拆卸5×5铜热锚板' : 'LOS预留口盲板');
      for (const u of [-48, 48]) for (const v of [-42, 42]) {
        if (i === 0) continue;
        const x = cx + Math.cos(a) * u - Math.sin(a) * v, z = cz + Math.sin(a) * u + Math.cos(a) * v;
        cyl(wires, 2.5, 3, [x, 13.5, z], 'bright', 6, '热锚板紧固件');
      }
      for (let j = 0; j < n; j++) {
        const type = cableType(bank, j), [x, z] = portPoint(sector, j);
        const db = attenuation(type, i);
        const id = `${sector}:${j}`;
        cyl(wires, 3.2, 24, [x, 0, z], db ? 'gold' : 'silver', 6, db ? `${type} ${db} dB 衰减器` : '贯穿热锚同轴适配器');
        for (const y of [-15, 15]) cyl(wires, 2.6, 6, [x, y, z], 'bright', 16, 'SMA 端口');
        if (i > 0) {
          const wedge = box(wires, [4, 5, 6], [x + 4.6, 14.5, z], 'copper', '两片式热锚夹块与楔块');
          wedge.rotation.y = .3;
          cyl(wires, 1.5, 4, [x + 6.3, 16, z], 'gold', 6, 'M3黄铜热锚螺钉');
        }
        rfPorts.push({ id, stage: i, type, x, z, lowY: ys[i] - 18, highY: ys[i] + 18, attenuationDB: db });
        if (i === 0) continue;
        const h = ys[i - 1] - ys[i];
        const start = [x, 18, z], end = [x, h - 18, z];
        const bend = 8;
        const points = [start, [x, 32, z], [x + Math.cos(a) * bend, h * .40, z + Math.sin(a) * bend], [x - Math.cos(a) * bend, h * .60, z - Math.sin(a) * bend], [x, h - 32, z], end];
        pipe(wires, points, EVIDENCE.published.coaxDiameterMM / 2, 'bright', `${type} UT085 SS-SS`, 32);
        recordConnection(id, i, [x, ys[i] + 18, z], [x, ys[i - 1] - 18, z], type);
        if (i === 5 && type === 'flux') {
          cyl(wires, 4.2, 25, [x, 38, z], 'silver', 12, 'VLFX1350 1.3GHz低通滤波器示意');
          cyl(wires, 3.6, 17, [x, 60, z], 'dark', 12, 'Eccosorb 红外滤波器');
        }
      }
    }
  }
  mechanical.rfPorts = rfPorts;
  mechanical.cableBanks = banks;
  mechanical.dcLooms = { roomTo4K: 4, below4K: 2, twistedPairsPerLoom: 12, materials: ['Cu AWG35', 'PhBr AWG36', 'NbTi'] };
  await nextFrame();                       // 分块①：65 路 RF 线缆树建完，让出一次主线程

  for (let i = 0; i < 6; i++) {
    const dc = group(stageGroups[i], 'wiring', `DC_thermometry_bias_${i}`);
    for (let b = 0; b < (i < 3 ? 4 : 2); b++) {
      const cx = b < 2 ? -90 : 90, cz = b % 2 ? -60 : 60;
      cyl(dc, 7, i === 0 ? 16 : 8, [cx, i === 0 ? 7.5 : 0, cz], 'copper', 24, 'DC多芯密封馈通与热锚');
      if (i === 0) continue;
      const height = ys[i - 1] - ys[i];
      for (let p = 0; p < 12; p++) for (const sign of [-1, 1]) {
        const x = cx + (p % 4 - 1.5) * 1.4, z = cz + (Math.floor(p / 4) - 1) * 1.4;
        const points = [];
        for (let k = 0; k <= 40; k++) {
          const t = k / 40, a = t * Math.PI * 16;
          points.push([x + sign * .22 * Math.cos(a), t * height, z + sign * .22 * Math.sin(a)]);
        }
        pipe(dc, points, .07, 'silver', i > 2 ? 'NbTi偏置测温双绞线' : b < 2 ? 'AWG35铜双绞线' : 'AWG36磷青铜双绞线', 64);
      }
    }
  }


  await nextFrame();                       // 分块②：偏置测温线束建完

  const heliumTop = group(top, 'helium', 'Room_helium_manifold');
  cyl(heliumTop, 26, 12, [0, 13.5, 0], 'silver', 40, '抽气管真空密封法兰');
  cyl(heliumTop, 17, 80, [0, 40, 0], 'silver', 32, '蒸馏室抽气总管接口');
  for (const x of [-35, 35]) { cyl(heliumTop, 7, 16, [x, 12, 0], 'silver', 6, '氦管真空馈通'); cyl(heliumTop, 3, 45, [x, 25, 0], 'bright', 16, '氦混合气接口'); }
  for (let i = 1; i < 6; i++) {
    const h = group(stageGroups[i], 'helium', `Central_dilution_${i}`);
    const height = ys[i - 1] - ys[i];
    if (i <= 3) {
      const bottom = i === 3 ? 90 : 0;
      rod(h, [0, bottom, 0], [0, height, 0], 16, 'silver', '蒸馏室中央抽气管');
      for (let k = 0; k < 24; k++) ring(h, 17.5, .9, [0, bottom + (height - bottom) * (k + .5) / 24, 0], 'bright', undefined, '抽气管波纹节');
    }
    for (const x of [-35, 35]) {
      const bottom = i === 5 ? 45 : 0;
      rod(h, [x, bottom, 0], [x, height, 0], 2.8, 'silver', x > 0 ? '浓相进液毛细管' : '稀相回流管');
      if (i === 5) pipe(h, [[x, 45, 0], [x, 36, 0], [Math.sign(x) * 26, 32, 0]], 2.8, 'silver', '混合室液体接口', 12);
      recordConnection(`helium-${x}`, i, [x, ys[i] + bottom, 0], [x, ys[i - 1], 0], 'helium-functional-path');
    }
    if (i === 2) {
      coil(h, [57, height - 25, 0], 14, height - 50, 10, 1.5, 'copper');
      for (const y of [25, height - 25]) rod(h, [35, y, 0], [71, y, 0], 1.5, 'copper', '冷凝预冷盘管接口');
    }
    if (i === 3) {
      cyl(h, 31, 75, [0, 51.5, 0], 'copper', 48, '中央蒸馏室');
      cyl(h, 37, 10, [0, 9, 0], 'gold', 48, '蒸馏室安装法兰');
      cyl(h, 34, 4, [0, 91, 0], 'silver', 48, '蒸馏室上盖');
      box(h, [10, 12, 10], [30, 44, 0], 'dark', '蒸馏室加热器');
    }
    if (i === 4) {
      coil(h, [0, height - 10, 0], 35, height - 20, 15, 2.1, 'copper');
      for (const y of [10, height - 10]) rod(h, [-35, y, 0], [35, y, 0], 2, 'copper', '连续逆流换热器端接');
    }
    if (i === 5) {
      const stepBottom = 62, stepTop = height - 12;
      for (let k = 0; k < 4; k++) {
        const y = stepBottom + (stepTop - stepBottom) * k / 3;
        cyl(h, 30 - k * 2, 7, [0, y, 0], 'gold', 40, '阶梯换热器（内部烧结结构未展开）');
        rod(h, [-35, y, 0], [35, y, 0], 2, 'copper', '阶梯换热器双流道接口示意');
      }
      cyl(h, 30, 38, [0, 32, 0], 'copper', 48, '中央混合室（位于MXC板上）');
      cyl(h, 41, 9, [0, 8.5, 0], 'gold', 48, '混合室板面热连接法兰');
      bolts(h, 35, 13, 12, 2);
      mechanical.contacts.push({ kind: 'mixing-chamber', lowerMM: 4, lowerPlateMM: 4, x: 0, z: 0 });
    }
  }

  await nextFrame();                       // 分块③：氦循环 / 蒸馏室 / 混合室建完

  const [readX, readZ] = portPoint(7, 12);
  const readGroups = [2, 3, 4, 5].map(i => group(stageGroups[i], 'readout', `Four_channel_readout_${i}`));
  const outputPositions = Array.from({ length: 4 }, (_, j) => [readX + (j - 1.5) * 20, readZ]);
  function inlineDevice(parent, name, x, y, z, height, material = 'gold') {
    box(parent, [15, height - 12, 19], [x, y, z], material, name);
    for (const end of [-1, 1]) cyl(parent, 2.6, 12, [x, y + end * (height / 2 - 6), z], 'silver', 6, `${name} SMA`);
  }
  for (const [k, i] of [2, 3, 4, 5].entries()) {
    const g = readGroups[k];
    if (i !== 3) {
      box(g, [100, 4, 35], [readX, -6, readZ], 'copper', '读出支架法兰安装脚');
      box(g, [94, i === 5 ? 270 : 65, 2], [readX, i === 5 ? -141 : -40.5, readZ - 12], 'copper', '2 mm读出器件热化铜板');
    }
    for (let j = 0; j < 4; j++) {
      const [x, z] = outputPositions[j];
      if (i === 2) {
        inlineDevice(g, 'LNF LNC4_8C HEMT（40dB参考）', x, -48, z, 60);
        const [wx, wz] = portPoint(4, 11 + j);
        pipe(g, [[wx, -18, wz], [wx, -28 - j * 5, wz], [20, -28 - j * 5, -100 - j * 10], [x, -18, z]], 1.0795, 'bright', '4K HEMT输出至室温线缆树', 36);
      } else {
        inlineDevice(g, i === 3 ? 'NbTi铜夹热锚' : i === 4 ? 'Quinstar环行器（第3口终端）' : '4–8GHz带通滤波器', x, 0, z, 36, i === 3 ? 'silver' : 'gold');
        if (i === 4) cyl(g, 3.3, 8, [x + 10, 0, z], 'dark', 12, '环行器50Ω终端', [0, 0, Math.PI / 2]);
        const upperEnd = i === 3 ? -78 : -18;
        const h = ys[i - 1] - ys[i];
        pipe(g, [[x, 18, z], [x, 36, z], [x + 7, h * .48, z], [x, h + upperEnd - 12, z], [x, h + upperEnd, z]], 1.0795, 'silver', 'NbTi低温输出同轴', 28);
        recordConnection(`output:${j}`, i, [x, ys[i] + 18, z], [x, ys[i - 1] + upperEnd, z], 'readOut-NbTi');
      }
    }
  }
  const readCold = readGroups[3];
  for (const y of [-75, -250]) box(readCold, [94, 38, 24], [readX, y, readZ], 'silver', '磁屏蔽四通道隔离器阵列');
  const deviceCenters = [-250, -195, -135, -75];
  for (let j = 0; j < 4; j++) {
    const [x, z] = outputPositions[j];
    inlineDevice(readCold, 'TWPA 近量子极限放大器', x, -135, z, 40);
    inlineDevice(readCold, '20dB定向耦合器', x, -195, z, 36, 'dark');
    for (const y of [-250, -75]) for (const end of [-1, 1]) cyl(readCold, 2.6, 8, [x, y + end * 23, z], 'gold', 6, '隔离器阵列通道接口');
    for (let n = 0; n < deviceCenters.length; n++) {
      const y = deviceCenters[n], half = n === 0 || n === 3 ? 27 : n === 1 ? 18 : 20;
      const nextY = n === 3 ? -18 : deviceCenters[n + 1] - (n + 1 === 3 ? 27 : n + 1 === 1 ? 18 : 20);
      rod(readCold, [x, y + half, z], [x, nextY, z], 1.0795, 'bright', '读出前端串接同轴');
    }
    const [px, pz] = portPoint(4, j + 6);
    pipe(readCold, [[px, -18, pz], [px, -180, pz], [x - 8, -195, z]], 1.0795, 'bright', 'TWPA泵浦至耦合器', 30);
    cyl(readCold, 3, 8, [x + 11, -195, z], 'dark', 12, '耦合器匹配终端', [0, 0, Math.PI / 2]);
    pipe(readCold, [[63, -170, 34 + (j - 1.5) * 9], [88 + j * 7, -220, 40], [x, -295, z + 20], [x, -277, z]], 1.0795, 'bright', '芯片输出至第一隔离器', 32);
  }
  const [spareX, spareZ] = portPoint(4, 10);
  cyl(readCold, 3, 8, [spareX, -22, spareZ], 'dark', 12, '第五泵浦实验备用端口');
  mechanical.readout = { hemt: 4, circulators: 4, twpa: 4, isolatorArrays: 2, bandpass: 4, couplers: 4, mountingSheetMM: 2 };


  await nextFrame();                       // 分块④：四通道读出链建完

  buildChipPackage({ stage: stageGroups[5], params, group, box, cyl, pipe, rod, chipPieces, mechanical });
  const sampleWires = group(stageGroups[5], 'wiring', 'Sample_input_connections');
  for (let j = 0; j < 4; j++) {
    const [x, z] = portPoint(j < 2 ? 0 : 2, j);
    pipe(sampleWires, [[x, -18, z], [x, -120, z], [-90, -155, 34 + (j - 1.5) * 9], [-63, -170, 34 + (j - 1.5) * 9]], 1.0795, 'bright', '代表性驱动与磁通芯片连接', 30);
  }
  const magnetic = shell(stageGroups[5], 'magnetic', 96, 230, -4, new THREE.Vector3(-340, -60, 50), 'silver');
  magnetic.position.z = 34;
  shells[shells.length - 1].base.copy(magnetic.position);
  shell(stageGroups[1], 'radiation', radii[1] - 2, ys[1] - ys[5] + 390, -4, new THREE.Vector3(-740, 0, -80), 'white');
  shell(stageGroups[2], 'radiation', radii[2] - 2, ys[2] - ys[5] + 370, -4, new THREE.Vector3(710, 0, -80), 'white');
  shell(stageGroups[3], 'radiation', radii[3] - 2, ys[3] - ys[5] + 350, -4, new THREE.Vector3(-420, 0, -580), 'gold');
  shell(stageGroups[5], 'radiation', radii[5] - 2, 330, -4, new THREE.Vector3(380, 0, -560), 'gold');
  const vacuum = shell(top, 'vacuum', R - 2, ys[0] - ys[5] + 420, -7.5, new THREE.Vector3(1080, 40, -230), 'silver');
  pipe(vacuum, [[-R + 1, -110, -10], [-R - 57, -110, -10], [-R - 69, -140, -10]], 12, 'silver', '外真空抽气端口示意', 20);
  mechanical.radiationStages = ['50k', '4k', 'still', 'mc'];

  const services = group(root, 'services', 'Room_temperature_gas_handling');
  services.position.set(-R - 300, ys[5] + 60, -80);
  box(services, [230, 13, 195], [0, -310, 0], 'silver', '气体处理机架底盘');
  for (const x of [-103, 103]) for (const z of [-84, 84]) {
    box(services, [10, 480, 10], [x, -64, z], 'white', '机架立柱');
    cyl(services, 14, 8, [x, -329, z], 'dark', 20, '减振支脚');
  }
  box(services, [215, 9, 190], [0, 180, 0], 'silver', '气体处理机架顶板');
  for (const x of [-54, 54]) {
    cyl(services, 36, 190, [x, -195, -12], 'white', 40, '氦混合气储罐');
    cyl(services, 9, 18, [x, -89, -12], 'silver', 14, '储罐阀门');
    ring(services, 13, 2, [x, -77, -12], 'cyan', undefined, '阀门手轮');
  }
  box(services, [194, 70, 133], [0, -21, 0], 'white', '无油循环泵与压缩模块');
  for (let k = 0; k < 13; k++) box(services, [137, 1.6, 2], [0, -42 + k * 3.3, 68], 'dark', '泵组散热格栅');
  box(services, [194, 66, 133], [0, 102, 0], 'white', '气体阀组与压力监控');
  for (const x of [-51, 0, 51]) {
    cyl(services, 17, 4, [x, 108, 69], 'dark', 32, '压力表表盘', [Math.PI / 2, 0, 0]);
    rod(services, [x, 108, 73], [x + 7, 114, 73], .9, 'cyan', '压力表示意指针');
  }
  for (const x of [-60, 60]) pipe(services, [[x, 147, 0], [x, 221, -10], [230, 245, -90], [290, 360, -90]], 3.5, 'silver', '气体循环外接软管（接口示意）', 30);

  await nextFrame();                       // 分块⑤：芯片封装 / 各级屏蔽罩 / 室温气体处理车建完

  function optimize(g) {
    for (const child of [...g.children]) if (child.isGroup) optimize(child);
    const buckets = new Map();
    for (const child of [...g.children]) {
      if (!child.isMesh) continue;
      child.updateMatrix();
      const key = `${child.material.uuid}:${Boolean(child.geometry.index)}:${Object.keys(child.geometry.attributes).sort().join(',')}`;
      if (!buckets.has(key)) buckets.set(key, { mat: child.material, items: [] });
      buckets.get(key).items.push(child);
    }
    for (const { mat, items } of buckets.values()) {
      if (items.length < 2) continue;
      const copies = items.map(m => m.geometry.clone().applyMatrix4(m.matrix));
      const merged = mergeGeometries(copies, false);
      copies.forEach(c => c.dispose());
      if (!merged) throw new Error('Geometry batching failed');
      const m = new THREE.Mesh(merged, mat);
      m.name = `${g.name}_${mat.name}_batch`;
      m.userData = { componentId: g.userData.componentId, batchedElements: items.length };
      g.add(m);
      items.forEach(item => g.remove(item));
    }
  }
  await nextFrame();                       // 分块⑥：合批（optimize）本身也是一次重活，单独一段
  optimize(root);
  const used = new Set();
  root.traverse(o => { if (o.geometry) used.add(o.geometry); });
  geometries.forEach(g => { if (!used.has(g)) g.dispose(); });
  let triangles = 0;
  root.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
  const hidden = new Set(['vacuum', 'radiation', 'services']);
  let isolated = null;
  let disposed = false;
  let cutaway = true, metalMode = false;
  let lastExplosion = 0, lastChip = 0;
  root.userData.mechanical = mechanical;
  root.userData.connections = connections;
  function applyVisibility() {
    root.traverse(o => {
      if (!o.isGroup || !o.userData.componentId) return;
      const id = o.userData.componentId;
      if (STAGES.some(s => s.id === id)) {
        o.visible = true;
        for (const child of o.children) if (child.isMesh) child.visible = !hidden.has(id) && (!isolated || id === isolated);
      } else {
        const isChipChild = id === 'chip' && o.parent?.userData.componentId === 'chip';
        o.visible = !hidden.has(id) && (!isolated || isolated === id || isChipChild && isolated === 'chip');
        if (isolated && STAGES.some(s => s.id === isolated)) {
          let p = o.parent;
          while (p && p !== root) { if (p.userData.componentId === isolated) o.visible = !hidden.has(id); p = p.parent; }
        }
      }
    });
    for (const front of shellFronts) front.visible = !cutaway;
  }
  function setExplosion(amount, chipAmount = amount) {
    lastExplosion = THREE.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
    lastChip = THREE.MathUtils.clamp(Number.isFinite(chipAmount) ? chipAmount : 0, 0, 1);
    stageGroups.forEach((g, i) => { g.position.y = ys[i] + (2.4 - i) * 155 * lastExplosion; });
    chipPieces.forEach(p => { p.group.position.copy(p.base).addScaledVector(p.direction, p.distance * lastChip); });
    shells.forEach(s => { s.group.position.copy(s.base).addScaledVector(s.offset, s.group.userData.componentId === 'magnetic' ? Math.max(lastExplosion, lastChip) : lastExplosion); });
    root.updateMatrixWorld(true);
  }
  applyVisibility();
  setExplosion(0);
  return {
    root, params, records, stageGroups, materials, chipPieces, mechanical, connections,
    stats: { parts: count, triangles: Math.round(triangles) },
    bom: [...bill.values()],
    setExplosion,
    setCutaway(value) { cutaway = Boolean(value); applyVisibility(); },
    setMaterialMode(value) {
      metalMode = Boolean(value);
      materials.gold.color.setHex(metalMode ? 0xd9ac48 : materials.gold.userData.baseColor);
      materials.copper.color.setHex(metalMode ? 0xb96c43 : materials.copper.userData.baseColor);
    },
    get cutaway() { return cutaway; },
    get metalMode() { return metalMode; },
    setVisible(id, visible) { if (!records.has(id)) return; visible ? hidden.delete(id) : hidden.add(id); applyVisibility(); },
    isVisible(id) { return !hidden.has(id); },
    isolate(id) { isolated = records.has(id) ? id : null; applyVisibility(); },
    get isolation() { return isolated; },
    get explosion() { return lastExplosion; },
    get chipExplosion() { return lastChip; },
    getWorldAnchor(id) {
      const target = records.get(id)?.groups[0];
      if (!target) return new THREE.Vector3();
      const pos = id === 'chip' ? new THREE.Vector3(0, 37, 0) : new THREE.Vector3();
      return target.localToWorld(pos);
    },
    getVisibleBounds() {
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      root.traverseVisible(o => {
        if (!o.isMesh) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
      });
      return bounds;
    },
    exportData() {
      return {
        schema: 'cryo-atlas/2.0', units: 'mm', parameters: params,
        state: { explosion: lastExplosion, chipExplosion: lastChip, hiddenComponents: [...hidden], isolated, cutaway, metalMode },
        qualification: root.userData.lodStatus, evidence: EVIDENCE, mechanical, connections,
        assumptions: 'Published configuration is separated from estimated geometry. 500mm MXC is an XLDsl family reference, not a measurement of the photographed XLD400. Temperatures are nominal diagram labels. Chip and services are illustrative. BOM counts graphical primitives, not purchasable parts.',
        sources: SOURCES, components: COMPONENTS.map(c => ({ ...c, geometryCount: records.get(c.id).count, verification: 'not-field-verified' })),
        billOfMaterials: [...bill.values()], statistics: { parts: count, triangles: Math.round(triangles) },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geos = new Set();
      root.traverse(o => { if (o.geometry) geos.add(o.geometry); });
      geos.forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
      root.removeFromParent();
    },
  };
}
