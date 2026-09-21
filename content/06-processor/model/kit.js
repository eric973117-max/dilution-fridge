/* ==========================================================================
   建模工具箱（与稀释制冷机那一层同一套手法）

   冰箱那层的模型（content/04-fridge/model/atlas/model.js）之所以"有细节"，靠的是这四件事：
     1. 毫米为单位、root 缩放 0.001 —— 数值都是真实量级，改尺寸不用换算
     2. 材质表 + 几何缓存 —— 同一个几何只建一次，几千个零件也扛得住
     3. 逐零件命名（螺栓垫圈 / 六角紧固件 / 内六角孔…），便于核对与后续标注
     4. 工程细节密度：螺栓孔环、焊盘阵列、走线、键合线、铭牌刻线
   这里把同一套工具箱抽出来，供这一层（以及后续各层）直接使用。
   ========================================================================== */

import * as THREE from '../../../vendor/three.module.js';
import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';

/* 材质与冰箱层一致（颜色、金属度、粗糙度都对齐，两层摆在一起不打架） */
export function createMaterials() {
  const materials = {
    white: new THREE.MeshStandardMaterial({ color: 0xdce9e6, roughness: .58, metalness: .24 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xa2b9b5, roughness: .45, metalness: .45 }),
    bright: new THREE.MeshStandardMaterial({ color: 0xf0faf7, roughness: .36, metalness: .32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x283d3b, roughness: .65, metalness: .3 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0x728e86, roughness: .72, metalness: .05 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x133734, roughness: .22, metalness: .7 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x9af4df, emissive: 0x417a6c, emissiveIntensity: .32, roughness: .5, metalness: .25 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x7eaaa0, roughness: .7, metalness: .15, side: THREE.DoubleSide, transparent: true, opacity: .34 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xdce9e6, roughness: .42, metalness: .48 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb6c6c0, roughness: .48, metalness: .52 }),
  };
  Object.entries(materials).forEach(([key, mat]) => { mat.name = key; mat.userData.baseColor = mat.color.getHex(); });
  return materials;
}

export function createKit(materials, { outline = true, outlineThreshold = 34 } = {}) {
  const geometries = new Map();
  const edgeMaterials = new Map();
  const stats = { meshes: 0, vertices: 0, edgeLines: 0, edgeSegments: 0 };

  const geometry = (key, create) => {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  };

  /* 轮廓线：白模上一个零件的光靠它才"分得开"。线太密会糊，所以按角度阈值抽。 */
  const edgeMaterial = (opacity) => {
    if (!edgeMaterials.has(opacity)) {
      edgeMaterials.set(opacity, new THREE.LineBasicMaterial({
        color: 0xf2f6ff, transparent: true, opacity,
      }));
    }
    return edgeMaterials.get(opacity);
  };

  function group(parent, name) {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  }

  function add(parent, geo, matName, pos = [0, 0, 0], kind = '结构件', rotation, skipOutline = false) {
    const mesh = new THREE.Mesh(geo, materials[matName] || materials.white);
    mesh.position.set(...pos);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.name = kind;
    parent.add(mesh);
    stats.meshes++;
    stats.vertices += geo.attributes?.position?.count || 0;
    if (outline && !skipOutline) {
      const eKey = `${geo.uuid}:${outlineThreshold}`;
      const eGeo = geometry(eKey, () => new THREE.EdgesGeometry(geo, outlineThreshold));
      const line = new THREE.LineSegments(eGeo, edgeMaterial(kind.edgeOpacity ?? 0.42));
      line.name = `${kind} · 轮廓`;
      mesh.add(line);
      stats.edgeLines++;
      stats.edgeSegments += (eGeo.attributes?.position?.count || 0) / 2;
    }
    return mesh;
  }

  const cyl = (parent, radius, height, pos, mat = 'white', segments = 24, kind = '圆柱件', rotation) =>
    add(parent, geometry(`c:${radius}:${height}:${segments}`, () => new THREE.CylinderGeometry(radius, radius, height, segments)), mat, pos, kind, rotation);

  const cone = (parent, r1, r2, height, pos, mat = 'silver', segments = 20, kind = '锥形件', rotation) =>
    add(parent, geometry(`n:${r1}:${r2}:${height}:${segments}`, () => new THREE.CylinderGeometry(r1, r2, height, segments)), mat, pos, kind, rotation);

  const box = (parent, size, pos, mat = 'white', kind = '壳体') =>
    add(parent, geometry(`b:${size.join(':')}`, () => new THREE.BoxGeometry(...size)), mat, pos, kind);

  const sphere = (parent, radius, pos, mat = 'bright', kind = '焊球', widthSeg = 12) =>
    add(parent, geometry(`s:${radius}:${widthSeg}`, () => new THREE.SphereGeometry(radius, widthSeg, Math.max(6, widthSeg / 2))), mat, pos, kind);

  const ring = (parent, radius, tube, pos, mat = 'silver', rotation = [Math.PI / 2, 0, 0], kind = '密封环') =>
    add(parent, geometry(`t:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 6, 72)), mat, pos, kind, rotation);

  const rod = (parent, a, b, radius = 4, mat = 'silver', kind = '支撑杆') => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const mesh = cyl(parent, radius, delta.length(), start.clone().add(end).multiplyScalar(.5).toArray(), mat, 14, kind);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };

  const pipe = (parent, points, radius = 1.1, mat = 'bright', kind = '管线', segments = 20) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    return add(parent, new THREE.TubeGeometry(curve, segments, radius, 5, false), mat, [0, 0, 0], kind);
  };

  /** 螺栓孔环：垫圈 + 六角头 + 内六角孔，三道一起才像"装过"的机械件 */
  function bolts(parent, radius, y, n = 24, size = 2.4, kind = '紧固件') {
    for (let k = 0; k < n; k++) {
      const a = (k * Math.PI * 2) / n;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      cyl(parent, size * 1.5, .9, [x, y, z], 'silver', 16, `${kind}垫圈`);
      cyl(parent, size, 3.3, [x, y + 1.7, z], 'bright', 6, `${kind}六角头`);
      cyl(parent, size * .42, .3, [x, y + 3.5, z], 'dark', 6, `${kind}内六角孔`);
    }
  }

  /** 实例化小件（焊球 / 过孔这类成百上千的同形件）：省 draw call，手机上不卡 */
  function instanced(parent, geo, mat, positions, kind) {
    const mesh = new THREE.InstancedMesh(geo, materials[mat] || materials.bright, positions.length);
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = kind;
    parent.add(mesh);
    stats.meshes++;
    stats.vertices += (geo.attributes?.position?.count || 0) * positions.length;
    return mesh;
  }

  /** 蜿蜒线（读出谐振腔 / 蛇形馈线）：n 个折返段，长度用来区分频率 */
  function meander(parent, { x, z, width, length, pitch = 2.2, radius = .5, mat = 'bright', kind = '蜿蜒走线' }) {
    const turns = Math.max(2, Math.round(length / (width * 2)));
    const points = [];
    const z0 = z - (turns * pitch) / 2;
    for (let i = 0; i <= turns; i++) {
      const zz = z0 + i * pitch;
      const from = i % 2 === 0 ? x - width / 2 : x + width / 2;
      const to = i % 2 === 0 ? x + width / 2 : x - width / 2;
      points.push([from, .8, zz], [to, .8, zz]);
    }
    return pipe(parent, points, radius, mat, kind, Math.min(48, turns * 4));
  }

  /** 合并袋：把成百上千个同材质的小件（电容臂、结、焊盘、谐振腔…）合成一个网格。
      不这么做的话，49 个比特能堆出一千多个 draw call，手机上必掉帧。
      同一个袋里的几何会克隆后平移/旋转再合并，所以只适合"本来就同形"的零件。 */
  function bag(kind) {
    const items = [];
    return {
      kind,
      add(geo, pos = [0, 0, 0], rot = null) { items.push([geo, pos, rot]); return this; },
      get size() { return items.length; },
      /** 合并后挂到 parent 上；带轮廓的合并件看起来仍然是一个整体 */
      flush(parent, mat, { outlineIt = true } = {}) {
        if (!items.length) return null;
        const clones = items.map(([geo, pos, rot]) => {
          const c = geo.clone();
          if (rot) {
            if (rot[0]) c.rotateX(rot[0]);
            if (rot[1]) c.rotateY(rot[1]);
            if (rot[2]) c.rotateZ(rot[2]);
          }
          c.translate(pos[0], pos[1], pos[2]);
          return c;
        });
        const merged = mergeGeometries(clones, false);
        clones.forEach((c) => c.dispose());
        items.length = 0;
        return add(parent, merged, mat, [0, 0, 0], kind, null, !outlineIt);
      },
    };
  }

  return {
    materials, stats, geometry, group, add, box, cyl, cone, sphere, ring, rod, pipe, bolts, instanced, meander, bag,
  };
}
