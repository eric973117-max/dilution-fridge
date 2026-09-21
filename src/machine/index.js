/* ==========================================================================
   稀释制冷机 · 程序化装配（v2 · 按资料图逐部位还原）

   对照资料图补上的四个标志性特征：
     1. 安装盘边缘的密集螺栓孔环（每盘 24–36 个）
     2. 盘面上的圆角开口 + 装在开口里的成簇圆柱元件（带六角螺母）
     3. 像瀑布一样成束下垂的线缆带（中段散开、两端收拢）
     4. 底部矩形处理器组件 + 两侧波纹管 + 大回环线缆

   单位：米（1 unit = 1 m）
   ========================================================================== */

/* ==========================================================================
   整机装配 · createMachine
   把 8 个段构建器接起来：材质分层、段内分层展开、机械翻转、剖面、信号链路。
   —— 由 src/machine.js 拆分而来，几何与数值逻辑与拆分前逐字一致。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { SEGMENTS, SHIELD_LAYERS, PLATE_NOTES, PLATE_COLORS, CHAMBERS } from '../data.js';
import {
  EDGE_WHITE, WIRE_WHITE, EDGE_DARK, WIRE_DARK, FILL_LIGHT,
  FILL_SOLID, FILL_PRESENT,
  easeOutBack, smoothstep, cap, clamp01, lerp, R2D,
} from './palette.js';
import { SEPARATION } from './separation.js';
import { EDGE_MIN_TRIS } from './density.js';
import { yieldToBrowser as nextFrame } from '../yield.js';
import { BUILDERS } from './builders.js';
/* 用 cryo-atlas 的 XLD v2 参数化模型（src/atlas/model.js）——
   和 CodeBuddy 里 5173 演示页默认显示的是同一套：
   六块平台 630/450/180/−50/−270/−390、8 根支撑、65 路 RF 线缆树、
   双脉冲管、氦循环与阶梯换热器、四通道读出链、量子芯片封装、
   Cryoperm 磁屏蔽、四级辐射罩（默认隐藏）、真空外壳（默认隐藏）。 */
import { createCryostat, DEFAULTS, STAGES } from '../atlas/model.js';

export async function createMachine(options = {}) {
  /* 环境贴图（stage 建好的 PMREM）改成"材质级"用：
     只有"展示中的那一段 / 白模章"才挂它，暗色零件不采样（见下面的 fillMatEnv）。 */
  const envTex = options.envMap ?? null;
  let envIntensity = options.envIntensity ?? 0.55;
  /* 参数化模型（XLD v2）的输出单位是 mm，整机挂到 root 上时缩放 0.001 变米。
     零件挂进 root 之后，局部坐标仍然是 mm，而分离距离、展开幅度、标注锚点
     这些数字是按「米」写的 —— 写进局部空间时必须乘 LOCAL_PER_M，
     否则整机的拆机动作只有千分之一，肉眼看不出。 */
  const MODEL_SCALE = 0.001;
  const LOCAL_PER_M = 1 / MODEL_SCALE;     // 局部单位（mm）/ 米
  const SPREAD_RADIAL = 0.058;             // 段内展开的径向幅度（米）
  const SPREAD_UP = 0.075;                 // 段内展开的分层位移上限（米）

  const root = new THREE.Group();
  const segments = new Map();
  const allMaterials = [];
  const segGroups = new Map();
  /* 灰白实体上的勾线颜色（每帧算一次，别在循环里 new Color） */
  const presentLine = new THREE.Color();
  /* 蓝色轮廓线用：用各段自己的强调色往这个饱和蓝上拉一半 ——
     01 段那种 accent 是白色的，直接用会在灰白底上"隐身"。 */
  const PRESENT_BLUE = new THREE.Color(0x2f6bff);

  /* -------------------------------------------------- 灰白实体的勾线方案 --
     灰白那件到底配什么颜色的线，是个反复试的效果问题，所以做成可切换的几档：
     加 `?lines=ink|soft|slate|cool|amber|blue` 到网址上就能当场比（手机上也行），
     不带参数时用 `DEFAULT_LINE_MODE`。
     · edge  = 结构轮廓线（外形、盘边）
     · wire  = 细节线 / 线缆（细而密的那一层）
     两档颜色分开，是为了让形体有层次，不至于糊成一片。
     accent: true 表示"用各段强调色混蓝"，跟着段的身份走。 */
  const LINE_MODES = {
    ink:   { edge: 0x14171d, wire: 0x14171d, note: '白模 + 墨线：最接近第 2 张参考图的写法' },
    soft:  { edge: 0x8f97a5, wire: 0xb6bdc8, note: '很浅的冷灰：几乎只剩明暗，线退到最后' },
    slate: { edge: 0x39404f, wire: 0x7d8798, note: '冷灰双色调：轮廓深、细节浅，形体分得开' },
    cool:  { edge: 0x455a86, wire: 0x8aa2cc, note: '低饱和冷蓝：工程图味，不刺眼' },
    amber: { edge: 0xb35a1f, wire: 0xe08a4a, note: '暖橙：跟站点强调色同一族' },
    blue:  { edge: null, wire: null, accent: true, note: '各段强调色混蓝（上一版试过的那个）' },
  };
  /* 默认用墨线：它和第 2 张参考图（白模 + 细墨线）最贴，缩到手机那么小也读得清。
     其余几档都是备选，加 `?lines=` 就能当场比（对照图见 docs/verify/lines-modes.png）。 */
  const DEFAULT_LINE_MODE = 'ink';
  const lineModeKey = (() => {
    const q = new URLSearchParams(window.location.search).get('lines');
    return Object.prototype.hasOwnProperty.call(LINE_MODES, q) ? q : DEFAULT_LINE_MODE;
  })();

  SEGMENTS.forEach((seg) => {
    /* 段先建成空壳 —— 几何等 GLB 载入后填进来 */
    const group = new THREE.Group();
    segGroups.set(seg.id, group);

    /* 黑白制图：本体极暗、轮廓与管路为白线；聚焦段向蓝偏移作为颜色信号 */
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30 });
    const fillMat = new THREE.MeshStandardMaterial({
      color: 0x16191f, roughness: 0.46, metalness: 0.22, transparent: true, opacity: 1,
    });
    /* 同一份底，但带环境贴图 —— 只给"展示中 / 白模"的段用。
       两者每个参数都同步（见 update 里的赋值），差别只在采样不采样环境。 */
    const fillMatEnv = fillMat.clone();
    fillMatEnv.envMap = envTex;
    fillMatEnv.envMapIntensity = 0.55;
    const glassMats = [];
    allMaterials.push(edgeMat, wireMat, fillMat, fillMatEnv, ...glassMats);
    root.add(group);

    segments.set(seg.id, {
      data: seg,
      group,
      edgeMat, wireMat, fillMat, fillMatEnv, glassMats,
      fillMeshes: [],                        // 用 fillMat 的那批网格（切材质时只动它们）
      usingEnv: false,                       // 当前挂的是不是"带反射"的那份
      parts: [], anchorPart: null, tint: 0,
      accent: new THREE.Color(seg.accent || '#ffffff'),
      detach: 0,
      opacity: 1,
      lit: 0,                                // 1 = "正在讲的那一段"（灰白实体 + 深勾线）
      shellLines: [],                       // 03 段罩子的轮廓线（和实体共用一套层序）
      target: { opacity: 1, detach: 0 },
    });
  });

  /* ------------------------------------------------- 线稿管线 + 拆解参数 -- */

  const edgeCache = new Map();

  /** 把 GLB 的 PBR 材质换成线稿材质，并按面数预算补轮廓线 */
  function dress(s) {
    const meshes = [];
    s.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    meshes.forEach((m) => {
      const shell = s.data.id === '03' || /vacuum_|radiation_|magnetic_/i.test(m.parent?.name || '');
      if (shell) {
        /* 罩子 = 深色半透明的"玻璃" + 白色轮廓线：和全站的线稿语言一致
           （深色本体 + 白线描边），落位中的那一层轮廓转成强调色。
           不跟着材质走色相，免得又冒出一层浅青。 */
        const base = 0.10;
        const gm = new THREE.MeshBasicMaterial({
          color: 0x0d1014, transparent: true, opacity: base,
          side: THREE.DoubleSide, depthWrite: false,
        });
        gm.userData.base = base;
        s.glassMats.push(gm);
        allMaterials.push(gm);
        m.material = gm;
      } else {
        m.material = s.fillMat;
        s.fillMeshes.push(m);
      }
      const g = m.geometry;
      if (!g || !g.attributes.position) return;
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      /* 轮廓线预算（见 density.js）：
         · 太密的网格（>24000 面）不画线；
         · 太小的零件（< EDGE_MIN_TRIS）也不画线 —— 手机上它们只有几个像素，
           线看不清，但每个线段对象都是一次 draw call。罩子例外：它靠线认层。 */
      if (!shell && (tris > 24000 || tris < EDGE_MIN_TRIS)) return;
      let eg = edgeCache.get(g.uuid);
      if (!eg) {
        eg = new THREE.EdgesGeometry(g, 24);
        edgeCache.set(g.uuid, eg);
      }
      if (shell) {
        /* 罩子单独一份线材质：套罩时按层亮起来，落位那一层转强调色 */
        const lm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
        lm.userData.base = 0.45;
        s.shellLines.push(lm);
        allMaterials.push(lm);
        m.add(new THREE.LineSegments(eg, lm));
      } else {
        m.add(new THREE.LineSegments(eg, s.edgeMat));
      }
    });
  }

  /** 拆解参数：每个直接子构件的 rank / 展开方向 / 自转，外加标注锚点绑定 */
  function computeParts(s) {
    const group = s.group;
    if (!group.children.length) { s.parts = []; s.anchorPart = null; return; }
    /* 参数化模型（XLD v2）的零件几何烘焙在分组局部坐标里，position 基本是 0，
       所以「零件在哪儿」一律问包围盒，不问 position。
       ① setFromObject 给的是世界坐标（米）→ 用 group.worldToLocal 换回本段局部空间
          （参数化模型的局部空间是 mm，见 MODEL_SCALE / LOCAL_PER_M），
       ② 之后 rank / 展开方向 / 分层位移 / 标注锚点全部用这个中心。 */
    const centers = group.children.map((c) => {
      const box = new THREE.Box3().setFromObject(c);
      if (box.isEmpty()) return group.worldToLocal(c.position.clone());
      return group.worldToLocal(box.getCenter(new THREE.Vector3()));
    });
    const bb = new THREE.Box3();
    centers.forEach((p) => bb.expandByPoint(p));
    const centerY = (bb.min.y + bb.max.y) / 2;
    const ySpan = Math.max(1e-4, bb.max.y - bb.min.y);
    s.parts = group.children.map((c, i) => {
      const base = c.position.clone();
      const at = centers[i];
      const radial = new THREE.Vector3(at.x, 0, at.z);
      const dir = radial.lengthSq() > 1e-8
        ? radial.normalize()
        : new THREE.Vector3(Math.cos(i * 2.1), 0, Math.sin(i * 2.1)).normalize();
      return {
        obj: c, base, dir,
        rank: (at.y - bb.min.y) / ySpan,
        baseRot: c.rotation.clone(),
        dy: cap((at.y - centerY) * 1.25, SPREAD_UP * LOCAL_PER_M),
        spin: (i % 2 ? 1 : -1) * (0.10 + (i % 5) * 0.045),
      };
    });
    /* data.js 的锚点是旧模型的米制坐标，这里换成本段的局部单位（mm）再比距离；
       offset 留在零件的局部空间里，leaders 用 obj.localToWorld 投影。 */
    const anchorLocal = new THREE.Vector3(...(s.data.anchor || [0, 0, 0]))
      .multiplyScalar(LOCAL_PER_M);
    s.anchorLocal = anchorLocal.clone();
    let best = null;
    let bestIndex = -1;
    let bestD = Infinity;
    s.parts.forEach((p, i) => {
      const dd = centers[i].distanceToSquared(anchorLocal);
      if (dd < bestD) { bestD = dd; best = p; bestIndex = i; }
    });
    s.anchorPart = best
      ? { obj: best.obj, offset: anchorLocal.clone().sub(centers[bestIndex]) }
      : null;
  }

  /* 信号链路不在这里建：它的路径要取模型里那根真实微波线的中心线，
     得等零件都归好段之后才算得出来 —— 见下面"信号链路（取真实线）"那一段。 */

  /* ------------------------------------------------------------- x-ray - */
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 12);
  let xrayAmount = 0;
  let claySmooth = 1;
  let clayTarget = 1;
  void clayTarget;

  let xrayClipping = null;

  function applyXray(v) {
    const on = v > 0.001;
    /* 只在开关状态翻转时改材质，避免每帧都标记 needsUpdate */
    if (on !== xrayClipping) {
      xrayClipping = on;
      allMaterials.forEach((m) => { m.clippingPlanes = on ? [clipPlane] : null; m.needsUpdate = true; });
    }
    clipPlane.constant = lerp(0.72, 0.02, clamp01(v));
  }

  /* ------------------------------------------------------------ update - */

  function update(motion, dt) {
    const k = Math.min(1, dt * 6.5);
    const dim = motion.dim ?? 0;
    clayTarget = motion.clay ?? 0;
    claySmooth = lerp(claySmooth, clayTarget, Math.min(1, dt * 3.2));

    segments.forEach((s, id) => {
      /* motion.focus 可以是单个段 id，也可以是一组 id ——
         05 与 06 是同一串线束的上下两截，讲其中一段时两半要一起亮，
         否则线束会"上半亮、下半暗"，看着像被切开了。 */
      const f = motion.focus;
      const focused = f == null || (Array.isArray(f) ? f.indexOf(id) >= 0 : f === id);
      /* 非当前段压到多暗：手机端更暗一点（0.08），下面那条 UI 带才干净 */
      const base = motion.focus === null ? 1 : (focused ? 1 : (motion.dimOthers ?? 0.16));
      /* 03 段整段就是那几层罩子：只有在讲屏蔽（03 章 / 剖面章）和结尾"逐层套罩"时才出现，
         其余章保持"裸机"，合体动画不会被一层半透明的筒壁压着看。 */
      const shieldMul = id === '03' ? clamp01(motion.shield ?? 1) : 1;
      s.target.opacity = base * (1 - dim) * shieldMul;
      s.target.detach = motion.detach[id] ?? 0;
      s.opacity = lerp(s.opacity, s.target.opacity, k);
      s.detach = lerp(s.detach, s.target.detach, k);

      const sep = SEPARATION[id];
      const d = s.detach;
      /* 整段先移出（d 的前 50%），内部再展开（d 的后 58%）—— 先后关系明确 */
      const segD = smoothstep(clamp01(d / 0.5));
      const spreadD = smoothstep(clamp01((d - 0.42) / 0.58));
      s.group.position.set(0, 0, 0);
      s.group.rotation.set(0, 0, 0);
      s.group.scale.setScalar(1);

      if (sep && segD > 0.0001) {
        if (sep.axis === 'y') s.group.position.y = sep.dir * sep.dist * segD * LOCAL_PER_M;
        if (sep.axis === 'x') {
          s.group.position.x = sep.dir * sep.dist * segD * LOCAL_PER_M;
          s.group.scale.setScalar(1 + (sep.scale || 0) * segD);
        }
        if (sep.axis === 'radial') s.group.scale.setScalar(1 + sep.scale * segD);
      }

      /* 机械翻转：分离到位的过程中绕轴翻过去，带一点冲过头的回弹 */
      let ry = 0;
      if (sep && segD > 0.0001) {
        if (sep.axis === 'x') ry += (sep.rotY || 0) * R2D * segD;
        if (sep.axis === 'radial') ry += 0.12 * segD;
      }
      const flip = s.data.flip;
      if (flip && segD > 0.0001) {
        const amt = Math.PI * 2 * flip[1] * easeOutBack(segD);
        if (flip[0] === 'y') ry += amt;
        else s.group.rotation.x += amt;
      }
      s.group.rotation.y = ry;

      /* 段内展开：按层级上下分层、按 rank 错开时间、各带一点自转 */
      if (spreadD > 0.0001) {
        s.parts.forEach((p) => {
          const local = clamp01((spreadD - p.rank * 0.30) / 0.70);
          const e = easeOutBack(local, 1.25);
          p.obj.position.set(
            p.base.x + p.dir.x * SPREAD_RADIAL * e,
            p.base.y + p.dy * e,
            p.base.z + p.dir.z * SPREAD_RADIAL * e,
          );
          p.obj.rotation.set(
            p.baseRot.x,
            p.baseRot.y + p.spin * e * 0.7,
            p.baseRot.z,
          );
        });
      } else {
        s.parts.forEach((p) => {
          p.obj.position.copy(p.base);
          p.obj.rotation.copy(p.baseRot);
        });
      }

      /* 结尾「逐层套罩」：还没轮到的层先不画，轮到的从上方落到自己的位置。
         进度由滚动驱动（motion.shieldReveal 0→1），所以是连续的套罩动作，
         不是一段到点就停的动画。 */
      if (s.shieldParts) {
        const reveal = motion.shieldReveal;
        s.shieldParts.forEach((p) => {
          const f = reveal == null ? 1 : smoothstep(clamp01((reveal - p.layerAt * 0.58) / 0.42));
          const inScope = (motion.shieldFull ?? 1)
            || p.layer.stage === 'room'
            || p.layer.component === 'magnetic';
          p.obj.position.y += (1 - f) * p.layerDrop;
          p.obj.visible = inScope && f > 0.002;
        });
      }

      const o = s.opacity;
      s.fillMat.depthWrite = o > 0.5;

      /* 渲染模式：
         · clay = 1 → 白模章（总览 / 合体）：亮实体 + 深色轮廓，老行为不变；
         · lit  = 1 → "正在讲的那一段"：灰白实体 + 深色勾线（参考图 2 的白模语言），
           用它和其余暗实体（参考图 1 那种有环境反射的实体感）分清楚。 */
      const clay = claySmooth;
      const litTarget = (motion.focus !== null && focused) ? 1 : 0;
      s.lit = lerp(s.lit, litTarget, Math.min(1, dt * 3.5));
      const lit = s.lit;
      const bright = Math.max(clay, lit);        // 1 = 亮实体（白模或"展示中"）
      const tintTarget = (motion.focus !== null && focused) ? 1 : 0;
      s.tint = lerp(s.tint, tintTarget, Math.min(1, dt * 3.5));

      s.edgeMat.color.copy(EDGE_DARK).lerp(EDGE_WHITE, 1 - clay);
      s.wireMat.color.copy(WIRE_DARK).lerp(WIRE_WHITE, 1 - clay);
      /* 灰白实体上的勾线：按 LINE_MODES 里选中的那一档上色
         （网址参数 `?lines=` 可切，见上面那张表） */
      if (lit > 0.001) {
        const mode = LINE_MODES[lineModeKey];
        if (mode.accent) {
          /* 各段强调色往饱和蓝拉一半：01 段 accent 是白的，直接用在灰白底上会隐身 */
          presentLine.copy(s.accent).lerp(PRESENT_BLUE, 0.5);
        } else {
          presentLine.setHex(mode.edge);
        }
        s.edgeMat.color.lerp(presentLine, lit);
        if (mode.accent) presentLine.copy(s.accent).lerp(PRESENT_BLUE, 0.5);
        else presentLine.setHex(mode.wire);
        s.wireMat.color.lerp(presentLine, lit * 0.92);
      }
      if (s.tint > 0.001) {
        const t = s.tint * (1 - lit);            // 白模上不再叠强调色，免得脏
        s.edgeMat.color.lerp(s.accent, t * 0.8 * (1 - clay));
        s.wireMat.color.lerp(s.accent, t * 1.0 * (1 - clay * 0.75));
      }
      /* 实体底：暗实体（低粗糙度 + 一点金属度，靠环境反射把形体读出来）
         ↔ 亮实体（哑光灰白），两者之间连续过渡 */
      s.fillMat.color.copy(FILL_SOLID).lerp(FILL_PRESENT, lit).lerp(FILL_LIGHT, clay);
      s.fillMat.roughness = 0.46 + 0.06 * clay + 0.16 * lit;
      s.fillMat.metalness = 0.22 * (1 - bright) + 0.03 * bright;
      s.fillMat.opacity = o * (1 - 0.10 * clay);

      /* ---- 环境反射只给"亮实体"那一份 --------------------------------------
         两份材质除 envMap 外每个参数都一样，每帧同步；只有需要反射的那一段
         才把网格切到 fillMatEnv 上。
         · 白模吃得多一点 → 上亮下暗的渐变就是它的"阴影"；
         · 暗实体那一大片像素不采样环境（`scene.environment` 全程为 null），
           这是弱机上实打实省下来的每像素成本。 */
      s.fillMatEnv.color.copy(s.fillMat.color);
      s.fillMatEnv.roughness = s.fillMat.roughness;
      s.fillMatEnv.metalness = s.fillMat.metalness;
      s.fillMatEnv.opacity = s.fillMat.opacity;
      s.fillMatEnv.envMapIntensity = envIntensity * (1.4 + 1.4 * bright);
      const wantEnv = envTex != null && envIntensity > 0.001 && bright > 0.5;
      if (wantEnv !== s.usingEnv) {
        s.usingEnv = wantEnv;
        const m2 = wantEnv ? s.fillMatEnv : s.fillMat;
        s.fillMeshes.forEach((mesh) => { mesh.material = m2; });
      }

      /* 展示中的那一段是灰白底，勾线要压得更实一点才读得出来（参考图 2 的线稿） */
      s.edgeMat.opacity = Math.min(1, (0.92 - 0.28 * clay + 0.08 * lit)) * o;
      /* 套罩时把 03 段的轮廓线提亮一档：罩子是半透明的，
         靠轮廓才看得出"套到了第几层"（见 motion.shieldGlow）。 */
      const wireBoost = (id === '03' && (motion.shieldGlow ?? 1) > 1) ? 2.4 : 1;
      /* 展示中的那一段：内部线缆（细线）也要看得见，所以提亮一档 */
      s.wireMat.opacity = Math.min(1, (0.30 + 0.16 * s.tint) * o * (1 - 0.30 * clay) * (1 + 1.0 * lit) * wireBoost);
      s.glassMats.forEach((gm) => {
        /* 逐层套罩：每层罩子按自己的 layerAt 错开淡入（motion.shieldReveal 是 null 时整层直接可见） */
        const at = gm.userData.layerAt;
        const reveal = motion.shieldReveal;
        /* 带上"这一层现在该不该出现"：前面几章只给最外的真空外罩（motion.shieldFull = 0），
           四级辐射罩留到结尾逐层套上时再出现。 */
        /* 磁屏蔽（Cryoperm）是 08 段自己的零件：不在结尾那叠罩子里也要跟着 08 段显示 */
        const inScope = (motion.shieldFull ?? 1)
          || gm.userData.layerStage === 'room'
          || gm.userData.layerComponent === 'magnetic';
        const f = reveal == null || at == null ? 1 : smoothstep(clamp01((reveal - at * 0.58) / 0.42));
        /* 套罩那一段：把罩子提到机器前面画（关掉深度测试）。
           MXC / Still 这两层本来就套在机体内部，正常遮挡下会被线束和平台整个挡掉；
           关掉深度测试后它们以半透明的方式压在机器上，"一层层套上去"才看得见。 */
        const over = reveal != null;
        if (gm.depthTest === over) { gm.depthTest = !over; gm.needsUpdate = true; }
        /* 正在落位的那一层给个亮度峰值：到 f≈0.5 时最亮，落定后回落 */
        const flash = over ? 1 + 1.3 * (f * (1 - f) * 4) : 1;
        gm.opacity = gm.userData.base * o * f * (inScope ? 1 : 0) * (1 - 0.6 * d) * (1 + clay * 2.6) * (motion.shieldGlow ?? 1) * flash;
      });
      /* 罩子的轮廓线：白线描边；正在落位的那一层转成强调色（珊瑚橙），
         一眼看出"现在套的是哪一层"。 */
      s.shellLines.forEach((lm) => {
        const at = lm.userData.layerAt ?? 0;
        const reveal = motion.shieldReveal;
        const inScope = (motion.shieldFull ?? 1)
          || lm.userData.layerStage === 'room'
          || lm.userData.layerComponent === 'magnetic';
        const f = reveal == null || at == null ? 1 : smoothstep(clamp01((reveal - at * 0.58) / 0.42));
        const flash = reveal != null ? f * (1 - f) * 4 : 0;
        lm.opacity = inScope ? lm.userData.base * o * (0.55 + 0.45 * f) * (1 + 0.9 * flash) : 0;
        lm.color.set(flash > 0.25 ? 0xff7d36 : 0xffffff);
      });
      s.group.visible = o > 0.01;
    });

    /* 冷盘 / 腔室高亮：讲到谁，谁那圈光就亮起来、盘面往自己的温度色偏一点 */
    const focus = motion.plateFocus;
    highlights.forEach((h, id) => {
      const cur = lerp(focusSmooth.get(id) ?? 0, focus === id ? 1 : 0, Math.min(1, dt * 7));
      focusSmooth.set(id, cur);
      h.mat.opacity = 0.9 * cur;
      h.mesh.visible = cur > 0.01;
    });
    plates.forEach((p) => {
      const cur = focusSmooth.get(p.id) ?? 0;
      p.mat.color.copy(p.mat.userData.base).lerp(p.tint, cur * 0.85);
      if (p.mat.emissive) p.mat.emissive.copy(p.tint).multiplyScalar(cur * 0.30);
    });

    xrayAmount = lerp(xrayAmount, motion.xray ?? 0, k);
    applyXray(xrayAmount);

    const st = motion.signalT ?? 0;
    signalGroup.visible = st > 0.001;
    if (signalGroup.visible) {
      const total = signalLine.geometry.attributes.position.count;
      signalLine.geometry.setDrawRange(0, Math.max(2, Math.floor(total * clamp01(st))));
      const p = signalCurve.getPointAt(clamp01(st));
      dot.position.copy(p);
      halo.position.copy(p);
      signalNodes.forEach((n, i) => {
        const nt = signalNodeT[i] ?? 1;
        const lit = st >= nt - 0.02;
        n.material.color.set(lit ? 0x2e6bff : 0x6b7ba6);
        n.material.opacity = lit ? 0.95 : 0.35;
      });
    }
  }

  /* ------------------- 参数化生成 → 按组件归段 → 套线稿管线 → 重算拆解参数 -- */
  const CRYO_PARAMS = { ...DEFAULTS };
  /* 组件 id → 网站的功能段（组件自己已经归好类，这里只做映射，不再猜名字） */
  const SEG_MAP = {
    pulse: '02', vacuum: '03', radiation: '03', helium: '04',
    wiring: '05', readout: '07', chip: '08', magnetic: '08', services: '08',
  };

  /* 分块计时：`?stats=1` 之外也用不着一堆 profile，直接记在返回对象上 */
  const buildMs = {};
  let tMark = performance.now();
  const mark = (k) => { buildMs[k] = Math.round(performance.now() - tMark); tMark = performance.now(); };
  /* createCryostat 也是 async 的：里面按"线缆树 / 偏置线 / 氦循环 / 读出链 / 罩子 / 合批"
     切成了 6 块，每块之间让出一次主线程（见 src/atlas/model.js 的 nextFrame 注释）。 */
  const cryo = await createCryostat(CRYO_PARAMS);
  mark('cryostat');
  /* 「悬挂框架」（吊到天花板的铝型材）是照片外补的展示件，继续隐藏。
     真空外罩与四级辐射罩则要留下 —— 它们正是 03 段（真空与辐射屏蔽段）的全部零件，
     结尾还要按层套上去，见下面的 shieldParts / SHIELD_LAYERS。 */
  const SKIP = new Set(['services']);
  SKIP.forEach((id) => cryo.setVisible(id, false));

  /* 罩子 → 层序。shell() 建出来的分组名形如 `${component}_${冷板序号}_${阶段名}_shell`，
     序号 0…5 对应 room / 50k / 4k / still / cold / mc 六块冷板，
     据此把 data.js 里 SHIELD_LAYERS 的说明认领到具体的罩子上。 */
  const layerByGroup = new Map();
  ['radiation', 'vacuum', 'magnetic'].forEach((id) => {
    const rec = cryo.records.get(id);
    if (!rec) return;
    rec.groups.forEach((g) => {
      const idx = Number(/_(\d\d)_/.exec(g.name || '')?.[1]);
      const layer = SHIELD_LAYERS.find((l) => l.stage === STAGES[idx]?.id);
      /* 四级辐射罩按"挂在哪块板上"区分；真空外罩与磁屏蔽各自只有一块，按组件认领 */
      const only = SHIELD_LAYERS.find((l) => l.component === id && id !== 'radiation');
      const hit = id === 'radiation' ? layer : only;
      if (hit) layerByGroup.set(g, hit);
    });
  });
  /* 先把缩放定下来再搬零件：attach 按「世界变换」换算局部矩阵，
     root 的 0.001 必须已经生效，搬进来的零件才会落在 mm 空间的正确标高上 */
  root.scale.setScalar(MODEL_SCALE);
  root.updateMatrixWorld(true);
  cryo.root.updateMatrixWorld(true);
  let moved = 0;
  cryo.records.forEach((rec, id) => {
    if (SKIP.has(id)) return;
    const seg = SEG_MAP[id] ?? '01';            // 各温区盘 / 法兰 / 屏蔽 → 段 01
    const s = segments.get(seg);
    if (!s || !rec.groups.length) return;
    /* 必须 attach（保留世界变换）而不是 add。
       参数化模型的零件几何烘焙在各自分组的局部坐标里，真正的标高写在祖先分组上
       （六级平台 y = 700/560/375/135/0/−210 mm）。直接 add 会把祖先变换丢掉，
       六个平台全叠到 y = 0，整机塌成一摞飞碟。 */
    /* 一个组件的零件按层级分在好几个分组里（wiring 每级一组、pulse 每级一组、
       helium 每段一台换热器…）。只搬 groups[0] 会漏掉一半机器 ——
       级间那帘 96 路线束、第二台冷头、右侧器件列就都不见了。这里全搬。 */
    rec.groups.forEach((g) => {
      /* 一个罩子由好几件组成（后筒壁 / 前剖切半 / 底盖 / 法兰 / 抽气口），
         它们同属一层，所以整组一起打上同一个 layer 标。 */
      const layer = layerByGroup.get(g);
      g.children.slice().forEach((c) => {
        if (layer) c.userData.layer = layer;
        s.group.attach(c);
        moved++;
      });
    });
  });
  /* 零件已经归到别的段、只剩空壳的分组清掉，免得它们混进零件表参与展开 */
  segments.forEach((s) => {
    s.group.children.slice().forEach((c) => {
      let solid = false;
      c.traverse((o) => { if (o.isMesh) solid = true; });
      if (!solid) s.group.remove(c);
    });
  });
  /* 零件搬进来时已经按世界变换落位；参数化模型本身就在真实坐标上，
     这里不再按包围盒中心挪机器 —— 一挪就出画。 */
  root.updateMatrixWorld(true);
  /* ---- 分块构建（对手机意义最大的一段）----------------------------------
     dress() 要给每个零件生成一份 EdgesGeometry，computeParts() 要算包围盒，
     这些是同步重活：整段跑完，手机上要好几秒，期间页面完全僵住 —— 滚动、
     按钮、甚至 CSS 动画都停摆。这里改成"一段一段来"，每段之间让出一次主线程，
     浏览器就能插空绘制、提前响应输入。总时长几乎不变，但不再"一冻到底"。
     （cryostat 那一大块仍然是一次性的 —— 它在 src/atlas/model.js 里，是另一个话题。） */
  for (const s of segments.values()) {
    dress(s);
    computeParts(s);
    await nextFrame();
  }
  mark('dressParts');

  /* 没有零件的段（06 超导传输段在这一版模型里没有独立几何）：
     说明锚点退回到"整机里离它最近的那个零件" —— 宁可指到真实存在的线束，
     也不要让引线指到空处。 */
  {
    const empty = [...segments.values()].filter((s) => !s.parts.length);
    if (empty.length) {
      const all = [...segments.values()].flatMap((s) => s.parts);
      empty.forEach((s) => {
        const anchorLocal = new THREE.Vector3(...(s.data.anchor || [0, 0, 0])).multiplyScalar(LOCAL_PER_M);
        s.anchorLocal = anchorLocal.clone();
        const targetWorld = root.localToWorld(anchorLocal.clone());
        let best = null;
        let bestD = Infinity;
        let bestOffset = null;
        all.forEach((p) => {
          const bb = new THREE.Box3().setFromObject(p.obj);
          if (bb.isEmpty()) return;
          const d = bb.getCenter(new THREE.Vector3()).distanceToSquared(targetWorld);
          if (d < bestD) { bestD = d; best = p; bestOffset = p.obj.worldToLocal(targetWorld.clone()); }
        });
        if (best) s.anchorPart = { obj: best.obj, offset: bestOffset };
      });
    }
  }

  /* 05 与 06 讲的是同一串信号线的上下两段（4 K 为界），但**几何不切**：
     整串线束都留在 05 里一起动，06 那一章靠机位和说明去讲下半截 ——
     切开以后线束会"上下一半亮一半暗"、动作也各走各的，反而凌乱。 */

  /* -------------------------------------------------- 屏蔽层（03 段 + 08 段的磁屏蔽）--
     给每件罩子挂上"第几层"（0 = 最内），结尾按这个次序落位：每层错开一点启动，
     形态上就是"一层层套上去"；没轮到的层先不画。
     ⚠ Cryoperm 磁屏蔽属于 08 段（套在芯片外），所以这里扫的是**所有段**。 */
  const shieldParts = [];
  {
    const total = Math.max(1, SHIELD_LAYERS.length - 1);
    segments.forEach((s) => {
      const tagged = s.parts.filter((p) => p.obj.userData.layer);
      if (!tagged.length) return;
      tagged.forEach((p) => {
        const layer = p.obj.userData.layer;
        p.layer = layer;
        p.layerAt = layer.order / total;                     // 0…1，落位进度里这层的起点
        /* 落下来的行程：按**世界尺度**换算到这件自己的局部空间 ——
           03 段罩子的局部是 mm，08 段磁屏蔽那几件是 m（attach 时保留下来的），
           直接乘 LOCAL_PER_M 会让后者放大 1000 倍（曾经飞出 145 m）。 */
        const wScale = new THREE.Vector3();
        p.obj.getWorldScale(wScale);
        p.layerDrop = (layer.stage === 'room' ? 0.38 : 0.26) / Math.max(1e-6, wScale.y);
        p.obj.traverse((o) => {
          if ((o.isMesh || o.isLineSegments) && o.material?.userData && 'base' in o.material.userData) {
            o.material.userData.layerAt = p.layerAt;         // 半透明罩子的淡入也按层错开
            o.material.userData.layerStage = layer.stage;    // 判断"这一层现在该不该出现"
            o.material.userData.layerComponent = layer.component;
          }
        });
      });
      s.shieldParts = tagged;
      shieldParts.push(...tagged);
    });
  }

  /* ---------------------------------------------------- 冷盘挂点（标签）--
     六块平台各自的理想中心 → 在 01 段里找离它最近的零件当挂点，
     标签跟着零件走（分离 / 展开时不会飘到空处）。 */
  const plates = (() => {
    const s01 = segments.get('01');
    return cryo.stageGroups.map((g, i) => {
      const r = (g.userData.diameterMM ?? 700) / 2;
      const ideal = new THREE.Vector3(r * 0.62, g.position.y, 0);
      let part = null;
      let offset = ideal.clone();
      let bestD = Infinity;
      s01.parts.forEach((p) => {
        const bb = new THREE.Box3().setFromObject(p.obj);
        if (bb.isEmpty()) return;
        const c = s01.group.worldToLocal(bb.getCenter(new THREE.Vector3()));
        const d = c.distanceToSquared(ideal);
        if (d < bestD) { bestD = d; part = p; offset = ideal.clone().sub(c); }
      });
      /* 变色：把这块盘上的网格换成它自己的一份材质（其余零件仍共用段材质），
         讲到它的时候往温度色偏一下 —— 见 update() 里的 motion.plateFocus。 */
      const mat = s01.fillMat.clone();
      mat.userData.base = s01.fillMat.color.clone();
      part?.obj.traverse((o) => { if (o.isMesh && o.material === s01.fillMat) o.material = mat; });
      /* 标签锚点放在盘沿外侧一点：文字不会压在机器轮廓上。
         part 有自己的局部坐标系（它挂在段分组下），所以先算到世界再换回 part 局部；
         之后 part 分离/展开时标签会跟着它走。 */
      const rimWorld = s01.group.localToWorld(new THREE.Vector3(r * 1.02, g.position.y, 0));
      const rimOffset = part
        ? part.obj.worldToLocal(rimWorld.clone())
        : new THREE.Vector3(r * 1.02, g.position.y, 0);
      return {
        id: STAGES[i].id,
        name: STAGES[i].name,
        en: STAGES[i].en,
        temp: STAGES[i].temperature,
        note: PLATE_NOTES[STAGES[i].id] || '',
        part,
        offset: rimOffset,
        mat,
        tint: new THREE.Color(PLATE_COLORS[STAGES[i].id] || '#ffffff'),
        radiusMM: r,
        yMM: g.position.y,
      };
    });
  })();

  /* 两个腔体：位置与半径写死在 data.js 里（这一段机器是合体状态，不会移动） */
  const chambers = CHAMBERS.map((c) => ({
    ...c,
    posWorld: root.localToWorld(new THREE.Vector3(c.radiusMM * 1.0, c.yMM, 0)),
  }));

  /* 高亮环：讲到哪块盘 / 哪个腔，那圈光就在哪儿亮起来（温度色） */
  const highlights = new Map();
  [...plates.map((p) => ({ id: p.id, radius: p.radiusMM * 1.04, y: p.yMM, color: p.tint })),
    ...chambers.map((c) => ({ id: c.id, radius: c.radiusMM, y: c.yMM, color: new THREE.Color(PLATE_COLORS[c.id] || '#9ab8ff') }))]
    .forEach((h) => {
      const mat = new THREE.MeshBasicMaterial({
        color: h.color, transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(h.radius, Math.max(1.6, h.radius * 0.006), 8, 128), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = h.y;
      mesh.renderOrder = 850;
      mesh.visible = false;
      root.add(mesh);
      highlights.set(h.id, { mesh, mat });
    });
  const focusSmooth = new Map();

  /* -------------------------------------------------------- 信号链路 ---
     动画路径不手摆：直接取模型里那根**真实微波线**的中心线。
     wiring 的每根同轴都是 TubeGeometry（按温区分段、段间带 S 弯），
     顶点按"环"排列（tubularSegments+1 环 × radialSegments+1 个），每环取平均
     就是这一段的中心线上一点；把同一路（同一个端口坐标）的几段从上到下接起来，
     末端再接进芯片封装，就是这条线真实走过的路。
     点在信号组自己的空间里，1 unit = 1 m（组已 scale = LOCAL_PER_M）。 */
  const signalGroup = new THREE.Group();
  signalGroup.visible = false;

  const signalMat = new THREE.LineBasicMaterial({
    color: 0x2e6bff, transparent: true, opacity: 0.95, depthTest: false,
  });
  const signalLine = new THREE.Line(new THREE.BufferGeometry(), signalMat);
  signalLine.renderOrder = 900;
  signalGroup.add(signalLine);

  const nodeDim = new THREE.MeshBasicMaterial({ color: 0x6b7ba6, transparent: true, opacity: 0.5, depthTest: false });
  const signalNodes = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0017, 6, 26), nodeDim.clone());
    m.rotation.x = Math.PI / 2;
    m.renderOrder = 901;
    signalGroup.add(m);
    signalNodes.push(m);
  }

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.95, depthTest: false }),
  );
  dot.renderOrder = 903;
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x2e6bff, transparent: true, opacity: 0.16, depthWrite: false, depthTest: false,
    }),
  );
  halo.renderOrder = 902;
  signalGroup.add(dot, halo);
  signalGroup.scale.setScalar(LOCAL_PER_M);   // 机器局部是 mm，这条线按米算
  root.add(signalGroup);

  /* 取一根**真实同轴**的路径。
     说明：线体虽然是用 TubeGeometry 建的，但模型最后跑了一遍 optimize()，
     把同材质的小网格合并成整批（所以运行时已经找不到单独的 tube mesh 了）。
     好在模型把自己的布线规则也留在了数据里 —— mechanical.rfPorts 记着每一级上
     每个端口的位置（x/z）与衰减，线体就是按「端口 + S 弯」这串控制点建的。
     这里照同一套规则把那根线重建出来，所以动画走的就是它本身。 */
  const pathPts = [];
  {
    const rfPorts = cryo.mechanical?.rfPorts ?? [];
    const firstId = rfPorts[0]?.id;                       // 同一个 id 在六级上是同一根线
    const line = rfPorts.filter((p) => p.id === firstId).sort((a, b) => a.stage - b.stage);
    line.forEach((p, k) => {
      if (k === 0) {
        pathPts.push(new THREE.Vector3(p.x / 1000, p.highY / 1000, p.z / 1000));
        return;
      }
      const prev = line[k - 1];
      const yBot = p.highY;                                // 本板之上 18mm
      const yTop = prev.lowY;                              // 上一块板之下 18mm
      const h = yTop - yBot;
      const a = Math.atan2(p.z, p.x);                      // 扇区方向（S 弯沿它摆）
      const bend = 8;
      /* 控制点按**自上而下**排列（整条线从室温一路往下），S 弯也跟着镜像 */
      [
        [p.x, yTop, p.z],
        [p.x, yTop - 14, p.z],
        [p.x - Math.cos(a) * bend, yBot + h * 0.60, p.z - Math.sin(a) * bend],
        [p.x + Math.cos(a) * bend, yBot + h * 0.40, p.z + Math.sin(a) * bend],
        [p.x, yBot + 14, p.z],
        [p.x, yBot, p.z],
      ].forEach((q) => pathPts.push(new THREE.Vector3(q[0] / 1000, q[1] / 1000, q[2] / 1000)));
    });
    const chip = SEGMENTS.find((s) => s.id === '08');
    if (chip?.anchor) pathPts.push(new THREE.Vector3(...chip.anchor));    // 末端接进芯片封装
  }
  const signalPath = pathPts.filter((p, i) => i === 0 || p.distanceTo(pathPts[i - 1]) > 0.004);
  const signalCurve = new THREE.CatmullRomCurve3(
    signalPath.length > 6 ? signalPath : [new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, -0.5, 0)],
    false, 'centripetal',   // 和模型建那根线用的是同一种曲线，路径才完全重合
  );
  signalCurve.updateArcLengths();
  signalLine.geometry.setFromPoints(signalCurve.getPoints(360));

  /* 六个节点压在各级平台（最后一个压在芯片封装）的标高上 */
  const chipAnchor = SEGMENTS.find((s) => s.id === '08')?.anchor ?? [0, -0.509, 0.034];
  const NODE_Y = [0.630, 0.450, 0.180, -0.270, -0.390, chipAnchor[1]];
  const signalNodeT = NODE_Y.map((y, i) => {
    if (signalPath.length <= 6) {
      signalNodes[i].position.set(0, y, 0);
      return i / (NODE_Y.length - 1);
    }
    let best = 0;
    let bestD = Infinity;
    signalPath.forEach((p, k) => {
      const d = Math.abs(p.y - y);
      if (d < bestD) { bestD = d; best = k; }
    });
    signalNodes[i].position.copy(signalPath[best]);
    return best / (signalPath.length - 1);
  });

  mark('rest');

  /* 画质档位改环境反射强度：0 就整体不用反射材质（弱机 low 档） */
  function setEnvIntensity(v) {
    envIntensity = Math.max(0, Number(v) || 0);
    if (envIntensity <= 0.001) {
      segments.forEach((s) => {
        if (!s.usingEnv) return;
        s.usingEnv = false;
        s.fillMeshes.forEach((mesh) => { mesh.material = s.fillMat; });
      });
    }
  }

  /* 预编译两套材质（有反射 / 无反射）：否则第一次切章时会现编译着色器，卡一下。
     把两套各渲一遍，图个"第一次切换无感"。 */
  function prewarmEnv(stage) {
    if (!envTex || !stage?.renderer) return;
    const setAll = (useEnv) => {
      segments.forEach((s) => {
        s.usingEnv = useEnv;
        const mesh2 = useEnv ? s.fillMatEnv : s.fillMat;
        s.fillMeshes.forEach((mesh) => { mesh.material = mesh2; });
      });
    };
    setAll(true); stage.renderer.compile(stage.scene, stage.camera);
    setAll(false); stage.renderer.compile(stage.scene, stage.camera);
  }

  console.info('[cryo] 参数化模型分段完成', {
    parts: moved,
    stats: cryo.stats,
    counts: [...segments].map(([id, s]) => `${id}:${s.group.children.length}`).join(' '),
    buildMs,
  });

  return {
    root,
    segments,
    update,
    buildMs,
    setEnvIntensity,
    prewarmEnv,
    signalCurve,
    /* 六个节点在这条曲线上的位置（0…1），HUD 的节点灯用它对齐 */
    signalNodeT,
    setSignalVisible(v) { signalGroup.visible = v; },
    /* 结尾"逐层套罩"用：层的文案 + 03 段里对应的零件 */
    shields: SHIELD_LAYERS,
    shieldParts,
    /* 冷盘标签用：六块盘的名字/温度/特点 + 跟随的挂点 */
    plates,
    /* 腔体标签用：混合室腔与真空腔（静态锚点） */
    chambers,
    /* 手机端取景用：某一段（id 为空 = 整机）在世界坐标里的包围盒（米） */
    bounds(id = null) {
      const obj = id ? segments.get(id)?.group : root;
      if (!obj) return null;
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return null;
      return {
        yMin: box.min.y,
        yMax: box.max.y,
        height: box.max.y - box.min.y,
        centerY: (box.min.y + box.max.y) / 2,
      };
    },
  };
}
