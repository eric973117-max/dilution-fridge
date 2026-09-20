/* ==========================================================================
   load-glb · 用参数化模型（cryo-atlas GLB）替代程序化几何

   GLB 里的节点命名本身就是零件清单：
     00_ROOM TEMPERATURE … 05_MIXING CHAMBER 六个温区，
     每个温区下面是 PT_5/PT_7（脉冲管）、RF_thermalization（RF 热锚）、
     DC_thermometry_bias、Central_dilution、Four_channel_readout、
     radiation 与 vacuum 的 shell、LOS 槽及安装孔法兰、传感器引线、温度计……
   这里按名字把零件归到网站的 8 个功能段，再套上原来的线稿材质管线。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

export const GLB_URL = './assets/cryo-atlas-dr01.glb';

/* 名字 → 功能段。顺序有优先级，先匹配到的先归位 */
const RULES = [
  ['03', /vacuum_|radiation_/i],
  ['02', /\bPT_|PT100|pulse/i],
  ['04', /dilution|mxc|mixing/i],
  ['07', /readout|amplifier|isolator|twpa|circulator/i],
  ['06', /thermometry|bias|cernox|ruo2|sensor|传感器/i],
  ['05', /rf_|coax|drive|flux|pump/i],
  ['08', /chip|qubit|die|pcb|lid|sample/i],
  ['01', /plate|flange|los|frame|盘|法兰|槽/i],
];

export function segmentOf(name) {
  for (const [seg, re] of RULES) if (re.test(name)) return seg;
  return null;
}

/** 边线预算：太密的网格不生成轮廓线，否则首屏要等好几秒 */
const EDGE_TRI_BUDGET = 24000;

function triCount(mesh) {
  const g = mesh.geometry;
  if (!g) return 0;
  return (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
}

/**
 * 套线稿管线：深色填充 + 白色轮廓线；罩体走半透明。
 * mats = { edgeMat, wireMat, fillMat, allMaterials }
 */
export function applyLineArt(group, mats) {
  const meshes = [];
  group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((m) => {
    /* GLB 里是 PBR 材质，这里一律换成线稿用的填充色 */
    m.material = mats.fillMat;
    m.castShadow = false;
    m.receiveShadow = false;
    const tris = triCount(m);
    if (tris <= EDGE_TRI_BUDGET) {
      const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(m.geometry, m.userData.edgeAngle ?? 24),
        mats.edgeMat,
      );
      m.add(e);
    }
  });
  return meshes.length;
}

/**
 * 把整台机器按功能段拆开。
 * 返回 Map<段 id, Group>，每个 Group 里的直接子对象都带着世界变换，
 * 这样原来的拆机引擎（按 group.children 算 rank / 展开方向）不用改。
 */
export function splitBySegment(model) {
  const groups = new Map();
  const bucketOf = (id) => {
    if (!groups.has(id)) groups.set(id, new THREE.Group());
    return groups.get(id);
  };

  /* 先把每个叶子网格的祖先名字串起来，便于按名字判断 */
  const leaves = [];
  model.traverse((o) => { if (o.isMesh) leaves.push(o); });

  leaves.forEach((mesh) => {
    const names = [];
    let p = mesh;
    while (p) { if (p.name) names.push(p.name); p = p.parent; }
    const id = names.map(segmentOf).find(Boolean) ?? '01';
    const bucket = bucketOf(id);

    mesh.updateWorldMatrix(true, false);
    const clone = new THREE.Mesh(mesh.geometry, mesh.material);
    clone.name = names[0] || 'part';
    clone.matrix.copy(mesh.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    clone.userData.edgeAngle = 24;
    bucket.add(clone);
  });

  /* 计数明细，便于核对 */
  const counts = {};
  groups.forEach((g, id) => { counts[id] = g.children.length; });
  return { groups, counts };
}

/** 加载 GLB 并拆段 */
export function loadMachine({ onProgress } = {}) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      GLB_URL,
      (gltf) => resolve(splitBySegment(gltf.scene)),
      (ev) => { if (onProgress && ev.total) onProgress(ev.loaded / ev.total); },
      (err) => reject(err),
    );
  });
}
