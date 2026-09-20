import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { buildChipPackage } from './chip-package.js';

export const DEFAULTS = Object.freeze({ diameter: 700, spacing: 220, channels: 96, supports: 6, qubits: 36 });
export const SOURCES = [
  { title: '用户照片 01 · 长圆筒屏蔽状态', file: '728edae2ee40c91b496464734341b5a0 (1).jpg', scope: '顶部圆筒、铜编织带、环形冷板、盘绕线束、底部双侧器件与长屏蔽筒。图像来自本次对话，未提供原始网址。' },
  { title: '用户照片 02 · 芯片外露状态', file: '071dc772e7120524d9b93bdcbaa51ffc.jpg', scope: '仰视照片用于检查层板底面、两侧器件列、中央竖直芯片封装和扇出线束。' },
  { title: '用户照片 03 · 展示场景', file: '977cc7e7946aeeb226c7977054a60a29.jpg', scope: '带 IBM 展示背景，支持同类吊灯式装置的判断；不能确认型号、序列号或与前两张为同一台。' },
  { title: 'Cleveland Clinic — Quantum Leap', url: 'https://magazine.clevelandclinic.org/2023-spring/quantum-leap', scope: '白色吊灯插画、七项部件功能与原文15mK低温参考。实物照片用于外形重建，非XLD400的65路布局。' },
];
export const STAGES = [
  { id: 'room', name: '室温顶法兰', en: 'TOP FLANGE & DRUM', temperature: '300 K', kelvin: 300, y: 700, diameterRatio: 1 },
  { id: '50k', name: '一级预冷热锚', en: 'PARTIAL PRECOOL ANCHORS', temperature: '50 K', kelvin: 50, y: 560, diameterRatio: .77 },
  { id: '4k', name: '二级冷板', en: 'UPPER COLD PLATE', temperature: '4 K', kelvin: 4, y: 375, diameterRatio: .83 },
  { id: 'still', name: '蒸馏室平台', en: 'STILL PLATFORM', temperature: '0.8 K', kelvin: .8, y: 135, diameterRatio: .79 },
  { id: 'cold', name: '中间冷板', en: 'COLD PLATE', temperature: '100 mK', kelvin: .1, y: 0, diameterRatio: .75 },
  { id: 'mc', name: '混合室平台', en: 'MIXING CHAMBER PLATFORM', temperature: '15 mK', kelvin: .015, y: -210, diameterRatio: .76 },
];
export const COMPONENTS = [
  ...STAGES.map((s, i) => ({ ...s, icon: i ? 'layers' : 'disc-3', kind: 'stage', material: i < 2 ? '铝 / 不锈钢 / 铜（视觉示意）' : '镀金铜（视觉示意）', description: i === 1 ? '一级预冷以局部热锚和小平台表示，不插入一块遮挡上段构造的大圆板。对应照片中铜编织带及侧面冷端；温级归属为功能解释，不是照片测温。' : '按照照片和插画的轮廓比例构建。全局尺寸、孔位与温级归属为示意假设，温度不是实时读数，也不是此设备的厂家性能承诺。' })),
  { id: 'pulse', name: '冷头与铜编织带', en: 'COLD HEADS & COPPER BRAIDS', icon: 'cylinder', temperature: '50 / 4 K', material: '铜 / 不锈钢', description: '上段双侧冷头、U形铜编织带、多片柔性热连接。按照片外观重建，编织细丝为视觉几何，不宣称等同实物股数或材料规格。' },
  { id: 'helium', name: '中央管柱与换热器', en: 'CENTRAL DILUTION ASSEMBLY', icon: 'waypoints', temperature: '4 K → mK', material: '不锈钢 / 铜', description: '中央长波纹管、侧斜管、铜色管柱、螺旋换热器及下段银黑交替筒节。隐藏的真实氦回路无法由照片确定；内部只保留功能示意。' },
  { id: 'wiring', name: '环绕线束与应力环', en: 'CIRCUMFERENTIAL WIRING', icon: 'cable', temperature: '300 K → mK', material: '同轴外观示意', description: '围绕平台布置的密集直线、上段分组折弯和两条盘绕应力环带，底部扇形引线。通道数量为显示参数，不沿用XLD论文65RF配置；不代表每个同轴内部导体。' },
  { id: 'readout', name: '双侧低温器件列', en: 'PAIRED READOUT COLUMNS', icon: 'radio', temperature: 'mK', material: '铜安装板 / 银色器件壳', description: '复现两侧对称垂直安装板、叠列器件和短U形跳线；器件数量、类型、内部拓扑与增益不能仅从照片确认。近量子极限放大和隔离功能参照原始科普文。' },
  { id: 'chip', name: '竖直芯片封装', en: 'VERTICAL CHIP PACKAGE', icon: 'cpu', temperature: '15 mK', material: '复用铜封装 / 载板 / 示意裸片', description: '复用已有模型的通用封装、载板、裸片与键合线，重新竖直安装到中央铜载架。默认上盖滑开以露出芯片；细节视图可独立分解。不是照片中处理器电路的精确复刻。' },
  { id: 'magnetic', name: '长筒磁屏蔽罩', en: 'LONG SAMPLE SHIELD', icon: 'shield-check', temperature: 'mK', material: '银色高磁导罩外观', description: '长筒外观对应第一张照片；关闭可显示第二张照片的中央芯片封装。材质与屏蔽层数不能从照片判定，不模拟磁场屏蔽性能。' },
  { id: 'radiation', name: '辐射罩示意', en: 'OPTIONAL THERMAL SHIELDS', icon: 'shield', temperature: '50 / 4 K', material: '铝 / 铜示意', optional: true, description: '补充照片拆除状态下不可见的嵌套辐射罩，仅作功能示意。默认隐藏，不能作为照片可直接确认的几何信息。' },
  { id: 'vacuum', name: '真空外罩示意', en: 'OPTIONAL VACUUM CAN', icon: 'container', temperature: '300 K', material: '不锈钢示意', optional: true, description: '补充未出现在拆罩照片中的真空外筒，可剖视、侧移分解；尺寸由内部包络估算，未经气密与承压验证。' },
  { id: 'services', name: '展示悬挂框架', en: 'SUSPENSION FRAME', icon: 'settings-2', temperature: '300 K', material: '铝型材示意', optional: true, description: '按第三张照片的展示场景补充上方型材横梁与吊装安装块，不复刻展台环境。默认隐藏以突出低温组件。' },
];

export function normalizeParams(input = {}) {
  const number = (key, min, max, step) => {
    const v = Number(input[key] ?? DEFAULTS[key]);
    return Math.min(max, Math.max(min, Math.round((Number.isFinite(v) ? v : DEFAULTS[key]) / step) * step));
  };
  const option = (key, values) => values.includes(Number(input[key])) ? Number(input[key]) : DEFAULTS[key];
  return { diameter: number('diameter', 600, 800, 10), spacing: number('spacing', 190, 310, 5), channels: option('channels', [48, 72, 96]), supports: option('supports', [6, 8]), qubits: option('qubits', [16, 36, 64]) };
}

export function createCryostat(input = {}) {
  const params = normalizeParams(input);
  const radialScale = params.diameter / 700, verticalScale = params.spacing / 220;
  const R = params.diameter / 2;
  const ys = STAGES.map(s => s.y * verticalScale);
  const radii = STAGES.map(s => R * s.diameterRatio);
  const root = new THREE.Group(); root.name = 'DR-02_Chandelier_Photo_Reference'; root.scale.setScalar(.001);
  const evidence = {
    identity: 'Same chandelier-style architecture; exact manufacturer model and same-unit identity not established.',
    photos: SOURCES.slice(0, 3),
    observed: ['Top cylindrical drum', 'Four prominent full lower flanges', 'Upper local cold anchors and copper braid loops', 'Two circumferential strain-relief loop bands', 'Central bellows and stepped cylinder', 'Paired lower component stacks', 'Long shield versus exposed vertical package'],
    estimated: ['All dimensions in mm', 'Cable and component counts', 'Mount hole positions', 'Hidden rear-side details', 'Thermal-stage assignments', 'Internal helium and microwave topology', 'Chip layout'],
    reuse: 'Shared procedural chip package with XLD model; independently positioned and mounted. XLD geometry unchanged.',
    temperatureNote: '50 K / 4 K / 0.8 K / 100 mK generic stage labels. 15 mK is from Quantum Leap, not photo thermometry.',
  };
  root.userData = { units: 'Geometry in mm; root scale converts to meters', modelRevision: 'photo-chandelier-v1', parameters: params, sources: SOURCES, evidence, lodStatus: 'Photo-proportioned reference model. NOT field-verified LOD 500.' };
  const materials = {};
  for (const [name, color, metalness, roughness] of [
    ['white', 0xe0e9e7, .22, .52], ['silver', 0xabbfba, .65, .31], ['bright', 0xe5efeb, .43, .39],
    ['dark', 0x192524, .25, .61], ['gold', 0xdce5df, .62, .4], ['copper', 0xb8c8c0, .62, .45],
    ['ceramic', 0x526d66, .05, .7], ['chip', 0x143d38, .62, .24], ['cyan', 0x98f7e1, .15, .48],
  ]) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    m.name = name; m.userData.baseColor = color; materials[name] = m;
  }
  const records = new Map(COMPONENTS.map(c => [c.id, { ...c, groups: [], count: 0 }]));
  const mechanical = { plates: [], contacts: [], loopBands: [3, 5], topShape: 'drum', referenceStatus: 'all-geometry-estimated' };
  const stageGroups = [], chipPieces = [], radialExploders = [], shells = [], fronts = [], allGeometries = new Set();
  const connections = [], bill = new Map(), cache = new Map();
  let partCount = 0;
  function group(parent, id, name = id) {
    const g = new THREE.Group(); g.name = name;
    g.userData = { componentId: id, temperature: records.get(id).temperature, verificationStatus: 'photo-inferred-unverified' };
    parent.add(g); records.get(id).groups.push(g); return g;
  }
  function geometry(key, build) {
    if (!cache.has(key)) { const g = build(); allGeometries.add(g); cache.set(key, g); }
    return cache.get(key);
  }
  function add(parent, geo, material, position, name) {
    allGeometries.add(geo);
    const mesh = new THREE.Mesh(geo, materials[material]); mesh.position.set(...position); mesh.name = name; parent.add(mesh);
    partCount++; const id = parent.userData.componentId; records.get(id).count++;
    const key = `${id}:${name}:${material}`;
    if (!bill.has(key)) bill.set(key, { assembly: id, part: name, visualMaterial: material, quantity: 0, verified: false });
    bill.get(key).quantity++; return mesh;
  }
  function cyl(parent, radius, height, position, material = 'silver', segments = 24, name = '圆柱件', rotation) {
    const m = add(parent, geometry(`c:${radius}:${height}:${segments}`, () => new THREE.CylinderGeometry(radius, radius, height, segments)), material, position, name);
    if (rotation) m.rotation.set(...rotation); return m;
  }
  function box(parent, size, position, material = 'white', name = '安装件') {
    return add(parent, geometry(`b:${size.join(':')}`, () => new THREE.BoxGeometry(...size)), material, position, name);
  }
  function ring(parent, radius, tube, position, material = 'bright', rotation = [Math.PI / 2, 0, 0], name = '精加工边缘') {
    const m = add(parent, geometry(`t:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 6, 96)), material, position, name); m.rotation.set(...rotation); return m;
  }
  function rod(parent, start, end, radius = 2, material = 'silver', name = '管线') {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), d = b.clone().sub(a);
    const m = cyl(parent, radius, d.length(), a.add(b).multiplyScalar(.5).toArray(), material, 12, name);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  function pipe(parent, points, radius = 1, material = 'bright', name = '弯管', segments = 28) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    return add(parent, new THREE.TubeGeometry(curve, segments, radius, 6, false), material, [0, 0, 0], name);
  }
  function bolt(parent, x, y, z, size = 2.3) {
    cyl(parent, size * 1.5, 1, [x, y + .5, z], 'silver', 18, '垫圈');
    cyl(parent, size, 3.3, [x, y + 2.6, z], 'bright', 6, '六角螺钉');
    cyl(parent, size * .43, .25, [x, y + 4.4, z], 'dark', 6, '螺钉凹孔示意');
  }
  const wireAngle = k => (k + .5) / params.channels * Math.PI * 2;
  const wireXZ = (i, k) => {
    const a = wireAngle(k), r = radii[i] * .86;
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
  function disc(parent, radius, thickness, index) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = (x, z, r) => { const h = new THREE.Path(); h.absarc(x, z, r, 0, Math.PI * 2, true); shape.holes.push(h); };
    if (index < 4) hole(0, 0, index === 0 ? 19 : 23);
    for (let k = 0; k < params.channels; k++) { const [x, z] = wireXZ(index, k); hole(x, z, 2.5); }
    for (let k = 0; k < params.supports; k++) {
      const a = k / params.supports * Math.PI * 2 + .27;
      hole(Math.sin(a) * radius * .94, Math.cos(a) * radius * .94, 3.4);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 }); geo.rotateX(Math.PI / 2);
    add(parent, geo, index === 0 ? 'white' : 'gold', [0, thickness / 2, 0], '环形布线孔冷板');
    ring(parent, radius - 1, 1.4, [0, thickness / 2, 0], index === 0 ? 'bright' : 'gold');
    for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; bolt(parent, Math.sin(a) * radius * .96, thickness / 2, Math.cos(a) * radius * .96, 1.8); }
    if (index > 1) for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      cyl(parent, 1.3, .25, [Math.sin(a) * radius * .66, thickness / 2 + .15, Math.cos(a) * radius * .66], 'dark', 10, '实验孔位示意');
    }
  }
  function addShell(parent, id, radius, height, y, offset, material = 'silver') {
    const g = group(parent, id, `${id}_${shells.length}_shell`); g.position.y = y;
    const makeWall = (owner, start, end) => {
      const s = new THREE.Shape(); s.absarc(0, 0, radius, start, end, false); s.absarc(0, 0, radius - 2, end, start, true); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 48 }); geo.rotateX(Math.PI / 2);
      add(owner, geo, material, [0, 0, 0], '2mm壁厚罩体（估算）');
    };
    const front = group(g, id, `${g.name}_front`); front.userData.cutawayFront = true;
    makeWall(front, 0, Math.PI); makeWall(g, Math.PI, 2 * Math.PI);
    fronts.push(front);
    cyl(g, radius, 3, [0, -height + 1.5, 0], material, 80, '屏蔽筒底盖');
    ring(g, radius, 2, [0, 0, 0], 'gold');
    g.userData.shell = { radiusMM: radius, heightMM: height, wallMM: 2, status: 'photo-estimate' };
    shells.push({ group: g, base: g.position.clone(), offset: new THREE.Vector3(...offset) }); return g;
  }

  STAGES.forEach((s, i) => {
    const g = group(root, s.id, `${String(i).padStart(2, '0')}_${s.en.replaceAll(' ', '_')}`); stageGroups.push(g); g.position.y = ys[i];
    g.userData.diameterMM = radii[i] * 2;
    mechanical.plates.push({ stage: s.id, yMM: ys[i], diameterMM: radii[i] * 2, partial: i === 1, status: 'estimated' });
    if (i !== 1) disc(g, radii[i], i === 0 ? 16 : 6, i);
    else for (const side of [-1, 1]) {
      const x = side * R * .57;
      box(g, [98 * radialScale, 9, 63], [x, 0, -R * .09], 'copper', '局部预冷热锚（非全圆板）');
      for (const dx of [-35, 35]) bolt(g, x + dx, 4.5, -R * .09, 2.5);
    }
    if (i > 1) {
      const upper = i === 2 ? 0 : i - 1, h = ys[upper] - ys[i];
      for (let k = 0; k < params.supports; k++) {
        const a = k / params.supports * Math.PI * 2 + .27;
        const r1 = radii[i] * .94, r2 = radii[upper] * (i === 2 ? .78 : .94);
        const x = Math.sin(a) * r1, z = Math.cos(a) * r1, tx = Math.sin(a) * r2, tz = Math.cos(a) * r2;
        rod(g, [x, 9, z], [tx, h - (upper === 0 ? 14 : 9), tz], 4.3, 'silver', '级间支撑柱');
        cyl(g, 7.2, 30, [x, 18, z], 'gold', 24, '下端铜热截获套');
        cyl(g, 7.2, 22, [tx, h - (upper === 0 ? 19 : 14), tz], 'gold', 24, '上端铜套');
        bolt(g, x, 3, z, 3);
      }
    }
    if (i > 1) {
      box(g, [11, 5, 7], [radii[i] * .46, 5.5, 15], 'dark', '温度传感器示意');
      pipe(g, [[radii[i] * .46, 8, 15], [radii[i] * .50, 10, 20], [radii[i] * .62, 5, 31]], .35, 'silver', '测温引线', 12);
    }
  });

  const top = stageGroups[0];
  cyl(top, R * .94, 92 * verticalScale, [0, 8 + 46 * verticalScale, 0], 'silver', 112, '顶部不锈钢圆筒');
  for (const y of [14, 8 + 84 * verticalScale]) ring(top, R * .945, 3.2, [0, y, 0], 'white', undefined, '圆筒端部翻边');
  cyl(top, R * .99, 7, [0, 8 + 92 * verticalScale, 0], 'white', 112, '上部承载盖');
  const head = group(top, 'pulse', 'Upper_copper_braids');
  for (const side of [-1, 1]) {
    const x = side * R * .68, z = -R * .06;
    box(head, [53, 36, 50], [x, -28, z], 'copper', '冷头铜压接块');
    for (const dx of [-16, 16]) bolt(head, x + dx, -9, z, 3);
    const uCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 18, -43, z), new THREE.Vector3(x - 26, -105, z + 1), new THREE.Vector3(x, -132, z + 3), new THREE.Vector3(x + 26, -105, z + 1), new THREE.Vector3(x + 18, -43, z),
    ]);
    for (let strand = 0; strand < 14; strand++) {
      const pts = [];
      for (let k = 0; k <= 64; k++) {
        const t = k / 64, p = uCurve.getPoint(t);
        p.z += (strand - 6.5) * 1.25 + Math.sin(t * Math.PI * 30 + strand) * .5;
        p.x += Math.cos(t * Math.PI * 30 + strand) * .45;
        pts.push(p.toArray());
      }
      pipe(head, pts, .78, 'copper', 'U形编织铜带细股', 100);
    }
    pipe(head, [[x + side * 24, -40, z], [x + side * 34, -152, z], [x + side * 12, -215, z], [x - side * 28, -221, z], [x - side * 44, -175, z]], 3.1, 'copper', '长U形柔性铜热连接', 48);
    for (let i = 1; i <= 2; i++) {
      const pg = group(stageGroups[i], 'pulse', `PT_${side}_${i}`), height = ys[i - 1] - ys[i];
      cyl(pg, 18, height, [x, height / 2, z - 18], 'silver', 36, '两级圆柱冷头');
      cyl(pg, 25, 13, [x, 7, z - 18], 'copper', 36, '冷端铜连接座');
      for (let k = 0; k < 9; k++) {
        pipe(pg, [[x, 12, z - 18 + k], [x - side * 18, 22, z - 18 + k], [x - side * 34, 3, z - 18 + k]], .8, 'copper', '平行铜热带', 16);
      }
    }
  }

  const mainTubes = group(stageGroups[2], 'helium', 'Central_bellows');
  const topH = ys[0] - ys[2];
  cyl(mainTubes, 16.5, topH, [0, topH / 2, 0], 'silver', 48, '中央长管');
  for (let k = 0; k < 84; k++) ring(mainTubes, 18, 1.3, [0, (k + .5) * topH / 84, 0], 'bright', undefined, '中央波纹节');
  for (const side of [-1, 1]) {
    pipe(mainTubes, [[side * 24, topH * .87, -10], [side * 35, topH * .66, -5], [side * 113, topH * .08, 0], [side * 109, 9, 0]], 4.5, 'silver', '斜向辅助管路', 32);
  }
  for (let i = 3; i < 6; i++) {
    const g = group(stageGroups[i], 'helium', `Central_exchange_${i}`), h = ys[i - 1] - ys[i];
    if (i === 3) {
      cyl(g, 28, h - 12, [0, h / 2, 0], 'copper', 48, '中央铜色换热柱');
      for (const x of [-70, 70]) {
        cyl(g, 4.5, h - 18, [x, h / 2, 0], 'silver', 18, '换热器边柱');
        const points = [];
        for (let k = 0; k <= 20 * 24; k++) { const t = k / (20 * 24), a = t * 20 * Math.PI * 2; points.push([x + Math.cos(a) * 23, 9 + t * (h - 18), Math.sin(a) * 23]); }
        pipe(g, points, 1.2, 'bright', '铜柱两侧螺旋毛细管', 480);
      }
    } else if (i === 4) {
      cyl(g, 23, h - 15, [0, h / 2, 0], 'silver', 48, '中间换热器芯筒');
      for (let k = 0; k < 15; k++) ring(g, 28, 2.2, [0, 11 + k * (h - 22) / 14, 0], 'bright', undefined, '紧密螺旋换热环');
      for (const side of [-1, 1]) rod(g, [side * 70, 9, 0], [side * 88, h - 9, 0], 4, 'silver', '低温斜连管');
    } else {
      cyl(g, 27, h - 14, [0, h / 2, 0], 'silver', 48, '下段换热筒柱');
      for (let k = 0; k < 7; k++) {
        cyl(g, 28.2, 11, [0, 22 + k * (h - 42) / 6, 0], k % 2 ? 'dark' : 'bright', 48, '银黑交替换热筒节');
      }
      cyl(g, 42, 30, [0, 18, 0], 'gold', 48, '混合室底座');
    }
  }

  const wireSegments = [];
  for (let i = 0; i < 6; i++) {
    const g = group(stageGroups[i], 'wiring', `Wiring_${i}`);
    for (let k = 0; k < params.channels; k++) {
      const [x, z] = wireXZ(i, k);
      cyl(g, 3.1, 13, [x, 0, z], 'gold', 12, '环形阵列热化接头');
      for (const end of [-1, 1]) cyl(g, 1.9, 4, [x, end * 8.5, z], 'bright', 12, '同轴端接');
      if (i === 0) continue;
      const [tx, tz] = wireXZ(i - 1, k), h = ys[i - 1] - ys[i];
      const start = [x, 10.5, z], end = [tx, h - 10.5, tz];
      const pts = [start, [x, 25, z]];
      if (i === 3 || i === 5) {
        const a = wireAngle(k), centerY = h * (.48 + (k % 4) * .028), r = 13.5 + (k % 3) * 1.2;
        pts.push([x, centerY - r - 7, z]);
        for (let n = 0; n <= 30; n++) {
          const theta = n / 30 * Math.PI * 2;
          pts.push([x + Math.cos(a) * r * Math.sin(theta) + Math.sin(a) * n / 30 * 3, centerY - r * Math.cos(theta), z - Math.sin(a) * r * Math.sin(theta) + Math.cos(a) * n / 30 * 3]);
        }
        pts.push([tx, h - 28, tz]);
      } else if (i < 3) {
        const bend = (k % 8) * 2.1;
        pts.push([x, h * .3 + bend, z], [tx, h * .68 + bend, tz]);
      }
      pts.push(end);
      const m = pipe(g, pts, .88, 'bright', i === 3 || i === 5 ? '带应力环同轴' : '分组折弯同轴', i === 3 || i === 5 ? 72 : 28);
      m.userData.channel = k;
      wireSegments.push({ id: k, stage: i, from: [x, ys[i] + 10.5, z], to: [tx, ys[i - 1] - 10.5, tz], loop: i === 3 || i === 5 });
    }
    if (i === 1) {
      for (let b = 0; b < 8; b++) {
        const a = (b + .5) * Math.PI / 4, r = radii[i] * .86;
        const block = box(g, [r * .69, 9, 24], [Math.sin(a) * r, -4, Math.cos(a) * r], 'gold', '分组线束热锚排（局部平台）');
        block.rotation.y = a;
        const side = Math.sin(a) >= 0 ? 1 : -1;
        rod(g, [Math.sin(a) * r, -4, Math.cos(a) * r], [side * R * .57, -4, -R * .09], 2.5, 'copper', '热锚排铜连接示意');
      }
    }
  }
  mechanical.wireSegments = wireSegments;

  const low = stageGroups[5];
  const columnHeight = 247, columnX = R * .40, columnZ = R * .13;
  for (const side of [-1, 1]) {
    const g = group(low, 'readout', `Readout_column_${side < 0 ? 'left' : 'right'}`);
    g.position.set(side * columnX, 0, columnZ);
    box(g, [77, 7, 59], [0, -6.5, 0], 'gold', '下挂器件安装法兰');
    box(g, [56, columnHeight, 5], [0, -columnHeight / 2 - 10, -14], 'copper', '竖直铜热化背板');
    for (const z of [-21, 21]) box(g, [70, 8, 8], [0, -columnHeight - 14, z], 'copper', '铜底座翻边');
    for (let j = 0; j < 12; j++) {
      const y = -28 - j * 19;
      box(g, [40, 13, 19], [0, y, -2], 'white', '叠列低温微波器件外壳');
      for (const x of [-16, 16]) {
        cyl(g, 3, 7, [x, y, 12], 'gold', 12, '正面SMA连接器', [Math.PI / 2, 0, 0]);
        const sx = x / Math.abs(x);
        pipe(g, [[x, y, 15.5], [x + sx * 15, y, 20], [x + sx * 23, y - 10, 20], [x + sx * 15, y - 19, 20], [x, y - 19, 15.5]], .92, 'bright', '叠列器件U形跳线', 24);
      }
      bolt(g, 0, y + 6.5, -3, 1.7);
    }
    for (let j = 0; j < 18; j++) {
      const angle = (side < 0 ? -1 : 1) * (.62 + j * .042);
      const from = [Math.sin(angle) * radii[5] * .86 - side * columnX, -10.5, Math.cos(angle) * radii[5] * .86 - columnZ];
      const end = [(j % 2 ? 1 : -1) * 16, -28 - Math.floor(j / 2) * 19, 15.5];
      pipe(g, [from, [from[0] * .9, -62, from[2] * .55 + 24], [end[0] * 1.3, end[1] - 6, 28], end], .83, 'bright', '底部扇形连接线', 32);
    }
    radialExploders.push({ group: g, base: g.position.clone(), offset: new THREE.Vector3(side * 190, -80, 0) });
  }

  const mechanicalChip = { contacts: [] };
  const shared = buildChipPackage({ stage: low, params, group, box, cyl, pipe, rod, chipPieces, mechanical: mechanicalChip });
  shared.root.name = 'Reused_vertical_chip_package';
  shared.root.position.set(0, -236, 36);
  shared.root.rotation.x = Math.PI / 2;
  shared.root.scale.setScalar(.72);
  shared.mount.traverse(o => {
    if (!o.isMesh) return;
    partCount--; records.get('chip').count--;
    const key = `chip:${o.name}:${o.material.name}`;
    const entry = bill.get(key);
    if (entry && --entry.quantity === 0) bill.delete(key);
  });
  shared.mount.removeFromParent();
  records.get('chip').groups = records.get('chip').groups.filter(g => g !== shared.mount);
  const carrier = group(low, 'chip', 'Photo_vertical_chip_carrier');
  carrier.userData.labelAnchor = [0, -216, 33];
  chipPieces[0] = { group: carrier, base: carrier.position.clone(), direction: new THREE.Vector3(0, 1, 0), distance: 35 };
  box(carrier, [82, 156, 6], [0, -216, 33], 'copper', '中央竖直封装安装板');
  box(carrier, [110, 10, 88], [0, -20, 25], 'gold', '芯片支架上法兰');
  for (const x of [-35, 35]) rod(carrier, [x, -25, 25], [x, -174, 33], 4, 'gold', '芯片载架悬挂杆');
  for (let j = 0; j < 16; j++) {
    const x = (j - 7.5) * 3.7;
    pipe(carrier, [[x * 1.4, -26, 28], [x * 1.3, -125, 30], [x, -177, 66], [x, -194, 65]], .72, 'bright', '中央芯片上方扇出线', 24);
    pipe(carrier, [[x, -267, 65], [x, -296, 61], [x * .62, -305, 36], [x * .62, -266, 25]], .72, 'bright', '中央芯片下方回弯线', 28);
  }
  mechanical.chipStack = mechanicalChip.chipStack;
  mechanical.reusedChip = { source: 'chip-package.js', orientation: 'vertical', scale: .72, poseStatus: 'illustrative' };
  const shield = addShell(low, 'magnetic', 59, 297, -42, [-235, -40, 70], 'silver');
  shield.position.z = 30; shells[shells.length - 1].base.copy(shield.position);
  cyl(shield, 67, 9, [0, 0, 0], 'gold', 64, '长筒屏蔽安装圈');
  cyl(shield, 5, 2, [0, -259, 59], 'dark', 20, '屏蔽筒检视标记', [Math.PI / 2, 0, 0]);
  addShell(stageGroups[1], 'radiation', R * .91, ys[1] - ys[5] + 355, -5, [-660, 0, -180], 'white');
  addShell(stageGroups[2], 'radiation', R * .845, ys[2] - ys[5] + 338, -4, [640, 0, -180], 'gold');
  addShell(top, 'vacuum', R * .98, ys[0] - ys[5] + 380, -8, [1010, 0, -200], 'silver');
  const frame = group(top, 'services', 'Display_suspension_frame');
  for (const z of [-R * .8, R * .8]) box(frame, [R * 2.8, 30, 30], [0, 130, z], 'silver', '展示铝型材横梁');
  for (const x of [-R * .8, R * .8]) {
    box(frame, [30, 30, R * 2.5], [x, 130, 0], 'silver', '框架纵梁');
    for (const z of [-R * .45, R * .45]) box(frame, [30, 26, 30], [x, 103, z], 'dark', '减振悬挂块');
  }

  function batch(g) {
    for (const child of [...g.children]) if (child.isGroup) batch(child);
    const buckets = new Map();
    for (const m of [...g.children]) if (m.isMesh && !radialExploders.some(e => e.group === m)) {
      m.updateMatrix();
      const key = `${m.material.uuid}:${!!m.geometry.index}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(m);
    }
    for (const items of buckets.values()) if (items.length > 1) {
      const copies = items.map(m => m.geometry.clone().applyMatrix4(m.matrix));
      const geo = mergeGeometries(copies, false); copies.forEach(c => c.dispose());
      if (!geo) throw new Error('Chandelier geometry batching failed');
      allGeometries.add(geo);
      const merged = new THREE.Mesh(geo, items[0].material); merged.name = `${g.name}_${items[0].material.name}`;
      merged.userData = { batchedElements: items.length, componentId: g.userData.componentId };
      g.add(merged); items.forEach(m => g.remove(m));
    }
  }
  batch(root);
  const used = new Set(); let triangles = 0;
  root.traverse(o => { if (o.isMesh) { used.add(o.geometry); triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; } });
  allGeometries.forEach(g => { if (!used.has(g)) g.dispose(); });
  const hidden = new Set(['magnetic', 'radiation', 'vacuum', 'services']);
  let isolated = null, cutaway = true, metalMode = false, lastExplosion = 0, lastChip = 0, sampleMode = 'exposed', disposed = false;
  function visibility() {
    root.traverse(o => {
      if (!o.isGroup || !o.userData.componentId) return;
      const id = o.userData.componentId;
      if (stageGroups.includes(o)) {
        o.visible = true;
        o.children.filter(c => c.isMesh).forEach(c => { c.visible = !hidden.has(id) && (!isolated || isolated === id); });
      } else {
        const ancestorMatch = (() => { let p = o.parent; while (p && p !== root) { if (p.userData.componentId === isolated) return true; p = p.parent; } return false; })();
        o.visible = !hidden.has(id) && (!isolated || isolated === id || ancestorMatch);
      }
    });
    for (const f of fronts) f.visible = f.parent === shield ? true : !cutaway;
    shared.mount.visible = false;
  }
  function setExplosion(amount, chipAmount = amount) {
    lastExplosion = THREE.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
    lastChip = THREE.MathUtils.clamp(Number.isFinite(chipAmount) ? chipAmount : 0, 0, 1);
    stageGroups.forEach((g, i) => { g.position.y = ys[i] + (2.4 - i) * 145 * lastExplosion; });
    radialExploders.forEach(e => e.group.position.copy(e.base).addScaledVector(e.offset, lastExplosion));
    chipPieces.forEach(p => {
      p.group.position.copy(p.base).addScaledVector(p.direction, p.distance * lastChip);
      if (p.group === shared.lid && sampleMode === 'exposed') p.group.position.x += 76 * (1 - lastChip);
    });
    for (const s of shells) s.group.position.copy(s.base).addScaledVector(s.offset, s.group === shield ? Math.max(lastExplosion, lastChip) : lastExplosion);
    root.updateMatrixWorld(true);
  }
  visibility(); setExplosion(0, 0);
  const statistics = { parts: partCount, triangles: Math.round(triangles) };
  root.userData.mechanical = mechanical;
  return {
    root, params, records, stageGroups, materials, chipPieces, mechanical, connections: wireSegments, bom: [...bill.values()], stats: statistics,
    variant: 'chandelier', exportBasename: 'cryo-atlas-chandelier',
    setExplosion,
    setVisible(id, value) { if (!records.has(id)) return; value ? hidden.delete(id) : hidden.add(id); visibility(); },
    isVisible(id) { return !hidden.has(id); },
    isolate(id) { isolated = records.has(id) ? id : null; visibility(); },
    setCutaway(value) { cutaway = Boolean(value); visibility(); },
    setMaterialMode(value) {
      metalMode = Boolean(value);
      materials.gold.color.setHex(metalMode ? 0xd7a73d : materials.gold.userData.baseColor);
      materials.copper.color.setHex(metalMode ? 0xb6653f : materials.copper.userData.baseColor);
    },
    setSampleMode(mode) {
      sampleMode = mode === 'shielded' ? 'shielded' : 'exposed';
      sampleMode === 'shielded' ? hidden.delete('magnetic') : hidden.add('magnetic');
      visibility(); setExplosion(lastExplosion, lastChip);
    },
    get sampleMode() { return sampleMode; }, get cutaway() { return cutaway; }, get metalMode() { return metalMode; },
    get isolation() { return isolated; }, get explosion() { return lastExplosion; }, get chipExplosion() { return lastChip; },
    getWorldAnchor(id) {
      const g = id === 'chip' ? shared.die : records.get(id)?.groups[0];
      return g ? g.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    },
    getVisibleBounds() {
      root.updateMatrixWorld(true); const b = new THREE.Box3();
      root.traverseVisible(o => { if (o.isMesh) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
      return b;
    },
    exportData() {
      return { schema: 'cryo-atlas/chandelier-1', units: 'mm', parameters: params, evidence, sources: SOURCES, qualification: root.userData.lodStatus, mechanical, connections: wireSegments, statistics, billOfMaterials: [...bill.values()], components: COMPONENTS.map(c => ({ ...c, geometryCount: records.get(c.id).count })), state: { explosion: lastExplosion, chipExplosion: lastChip, hiddenComponents: [...hidden], isolated, cutaway, metalMode, sampleMode } };
    },
    dispose() { if (disposed) return; disposed = true; used.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose()); root.removeFromParent(); },
  };
}
