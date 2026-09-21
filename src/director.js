/* ==========================================================================
   director · 导演：把「各层模块拼出来的时间轴」变成一台会动的机器

   职责边界（别的文件别抢）：
     · 时间轴与滚动进度（scroll.js）
     · 相机：每章的 pose 是曲线上的一个关键帧，整站一条 Catmull-Rom 曲线，没有跳切
     · 舞台效果：每章的 stage 声明 clay/bg/dim/xray 的目标值，导演按章内进度插值
     · 模块生命周期：第一次进入某层才 build，离开就 setActive(false)
     · 手机端：把模型装进"顶部参数条以下、UI 带以上"的带子里
   模块自己负责"这一层的 3D 长什么样、每帧怎么动"（见 content/_contract.md）。
   ========================================================================== */

import { createScrollEngine } from './scroll.js';
import * as scaffold from './scaffold.js';
import { buildGraph } from './overlays/graph.js';
import { createLeaders } from './overlays/leaders.js';
import { createPlateLabels } from './overlays/labels.js';

const POSE_KEYS = ['az', 'el', 'zoom', 'tx', 'ty'];

/* 手机端（≤900px）的版面常数，与 styles/responsive.css 对齐 */
const DOCK = 92;        // 底部：段位条 + 页脚
const TOP_PAD = 62;     // 顶部：参数条让出的高度

/* 手机端章节卡的节奏：滑入（前 6%）→ 停住（到 84%，这段留给你读）→ 滑走并淡出（后 16%）
   由**章节进度**驱动，不是跟着手指 1:1 —— 所以划得再快，卡片也停在那儿让你看完。 */
const CARD = { in: 0.06, holdEnd: 0.84, out: 0.16, travel: 0.34 };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (v) => v * v * (3 - 2 * v);
const lerp = (a, b, t) => a + (b - a) * t;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

export function createDirector({ stage, ui, timeline, feed, i18n, reduced = false }) {
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  if (mobile) document.body.classList.add('layout-mobile');

  const engine = createScrollEngine({ scenes: timeline.map((t) => ({ key: t.key, vh: t.vh })), reduced });

  /* ------------------------------------------------------------------ 覆盖层
     依赖图 / 三段引线标注 / 冷盘标签都是**通用能力**（src/overlays/），
     数据由模块给。模块通过 ctx.overlays 这三支工厂自取，自己管生命周期。 */
  const graphHost = document.getElementById('overlayGraph');
  const graphInner = document.getElementById('graphHost');
  const plateHost = document.getElementById('plates');
  const overlays = {
    graphHost,
    /** 依赖图：spec 见 src/overlays/graph.js 顶部注释；返回 { svg, nodes, edges } */
    buildGraph(spec) {
      graphInner.innerHTML = '';
      return buildGraph(graphInner, spec);
    },
    /** 引线标注：items = [{id, accent, en, zh, temp, spec, anchor, fallback}] */
    createLeaders(items) {
      return createLeaders(document.body, { items });
    },
    /** 冷盘标签（挂在零件上的名牌） */
    createLabels() {
      return createPlateLabels(plateHost);
    },
  };

  /* ---------------------------------------------------------------- 相机曲线
     每章的 pose.from 是曲线上的一个关键帧；缺哪个通道就从上一章继承。
     最后一章的 pose.to 是整条曲线的终点。

     关键帧的位置用"章节坐标" c = 章节下标 + 章内进度，而不是像素比例：
     像素比例会被"最后一屏滚不动"污染（可滚动高度 = 总高 − 视口高 ≠ 总高），
     站越长偏差越大 —— 21 章时末尾实测差 640px，相机就会比章节早一点到位。 */
  const camKeys = [];
  let carry = { az: -186, el: -16, zoom: 0.86, tx: 0, ty: -0.05 };
  timeline.forEach((t, i) => {
    const pose = { ...carry, ...(t.chapter.pose?.from || {}) };
    camKeys.push({ c: i, pose });
    carry = pose;
  });
  const lastChapter = timeline[timeline.length - 1].chapter;
  camKeys.push({ c: timeline.length, pose: { ...carry, ...(lastChapter.pose?.to || {}) } });

  /** c = 章节坐标：0 = 第一章开头，N = 最后一章末尾 */
  function samplePose(c) {
    let k = 0;
    while (k < camKeys.length - 2 && c >= camKeys[k + 1].c) k++;
    const a = camKeys[Math.max(0, k - 1)].pose;
    const b = camKeys[k].pose;
    const cNext = camKeys[k + 1].pose;
    const d = camKeys[Math.min(camKeys.length - 1, k + 2)].pose;
    const span = Math.max(1e-6, camKeys[k + 1].c - camKeys[k].c);
    const t = clamp01((c - camKeys[k].c) / span);
    const out = {};
    POSE_KEYS.forEach((key) => { out[key] = catmull(a[key], b[key], cNext[key], d[key], t); });
    return out;
  }

  /* ------------------------------------------------------------ 舞台效果插值
     chapter.stage 里每个通道可以是：
       数字        → 本章恒定
       [from,to]   → 按章内进度平滑过渡
       [from,to,r] → 只在本章前 r 段过渡，之后保持 to（原版"白模在前 35% 内褪完"就靠这个） */
  const effects = { clay: 0, bg: 0, dim: 0, xray: 0 };
  function effectsOf(chapter, local) {
    const spec = chapter.stage || {};
    Object.keys(effects).forEach((k) => {
      const v = spec[k];
      if (v == null) { effects[k] = 0; return; }
      if (typeof v === 'number') { effects[k] = v; return; }
      const [a, b, ramp] = v;
      const t = ramp ? Math.min(1, local / ramp) : local;
      effects[k] = a + (b - a) * smoothstep(t);
    });
    return effects;
  }

  /* ------------------------------------------------------------------ 上下文
     交给模块的 ctx：所有字段每帧原地更新，不新建对象（避免每帧产生垃圾）。 */
  const ctx = {
    stage, ui, i18n, feed, scaffold, overlays,
    scene: stage.scene,
    mobile,
    module: null,
    moduleChapters: null,
    moduleProgress: 0,
    chapter: null,
    chapterIndex: 0,
    local: 0,
    progress: 0,
    dt: 0,
    effects,
    basePose: null,
  };

  const built = new WeakSet();
  let lastIndex = -1;
  let lastVig = null;
  let lastUiBand = -1;

  function enter(i, st) {
    const entry = timeline[i];

    /* 换层：上一层的 3D 收起来，这一层第一次进入时才 build */
    if (ctx.module !== entry.module) {
      ctx.module?.setActive?.(false);
      paintAccent(entry.module.accent);
      if (!built.has(entry.module)) {
        built.add(entry.module);
        entry.module.build?.(ctx);
      }
      ctx.moduleChapters = entry.module.chapters || [];
      entry.module.prepare?.(ctx);
      entry.module.setActive?.(true);
      ctx.module = entry.module;
    }

    ctx.chapter = entry.chapter;
    ctx.chapterIndex = entry.localIndex;
    syncProgress(entry, st.local, st.progress, 0);
    entry.module.onEnter?.(ctx);
    ui.setChapter(entry);
    lastIndex = i;
  }

  function syncProgress(entry, local, progress, dt) {
    ctx.local = local;
    ctx.progress = progress;
    ctx.dt = dt;
    const c = entry.chapter;
    ctx.moduleProgress = (c.u0 ?? 0) + ((c.u1 ?? 1) - (c.u0 ?? 0)) * local;
  }

  /* ------------------------------------------------------------- 手机端取景
     模型只占「顶部参数条以下、UI 带以上」这一块；UI 带的高度按抽屉的**实际高度**算，
     所以卡片矮的时候模型会自己长大把空间用起来，也不会被抽屉压住。 */
  function mobileFit(pose, entry) {
    const H = window.innerHeight;
    const cardEl = ui.cardFor(entry.chapter.key);
    const hasCard = !!(cardEl && cardEl.classList.contains('is-on'));
    const uiHidden = document.body.classList.contains('ui-hidden');
    const cardH = hasCard ? cardEl.offsetHeight : 0;
    /* 有覆盖层的章节（依赖图）：图摆在卡片上方，模型带要给"卡片 + 图"一起让位。
       --drawer-px 只记卡片高度 —— 依赖图靠它把自己贴到卡片上沿。 */
    const overlayH = entry.chapter.overlay && !uiHidden
      ? Math.round((graphInner?.offsetHeight || 0) + 18)
      : 0;
    const uiBand = cardH + overlayH;

    if (cardH !== lastUiBand) {
      document.documentElement.style.setProperty('--drawer-px', `${Math.round(cardH)}px`);
      lastUiBand = cardH;
    }

    const bandH = Math.max(200, H - DOCK - uiBand - TOP_PAD);
    const bandFrac = bandH / H;
    const bandCenter = (TOP_PAD + bandH / 2) / H;

    /* 用**整层**的包围盒（模块的 bounds()），不是"当前这一章"的：
       只保证当前这一段装得下的话，比它更靠下的零件会漏到卡片后面，看着就像卡片有底。 */
    const b = entry.module.bounds?.(ctx) || defaultBounds();
    /* 0.86 而不是 0.92：留出一点余量，免得机器底缘正好压到卡片第一行文字上
       （套罩章模型会长到 1.79 m，是最高的一章） */
    const fitH = (bandFrac * 0.86 * stage.viewSize) / Math.max(0.35, b.height);
    /* 横向也要装得下：竖向取景高度 × 宽高比 = 可见宽度 */
    const fitW = b.width
      ? (stage.viewSize * (window.innerWidth / H) * 0.86) / b.width
      : Number.POSITIVE_INFINITY;
    const fit = Math.min(fitH, fitW);
    const out = { ...pose, zoom: Math.min(pose.zoom, Math.max(0.16, fit)) };
    /* 依赖图章：桌面靠 tx 把机器让到右半边，手机上没有"另一边"，居中就好 */
    if (entry.chapter.overlay) out.tx = 0;
    const visibleH = stage.viewSize / out.zoom;
    out.ty = (b.centerY - stage.camY) - (0.5 - bandCenter) * visibleH;
    return out;
  }

  function defaultBounds() {
    return { height: Math.max(0.6, stage.viewSize * 0.9), centerY: stage.camY };
  }

  /* 层的强调色：覆盖层样式表沿用了原站的 --accent / --accent-hi 变量名，
     这里按当前层的温度色写进去（--accent-hi 是往白里调 34% 的高亮版）。 */
  function paintAccent(hex) {
    if (!hex) return;
    const root = document.documentElement.style;
    root.setProperty('--accent', hex);
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return;
    const n = parseInt(m[1], 16);
    const mix = (c) => Math.round(c + (255 - c) * 0.34);
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    root.setProperty('--accent-hi', `rgb(${r}, ${g}, ${b})`);
  }

  /* ------------------------------------------------------------------- 主循环 */
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    engine.raf(now);
    const st = engine.getState();
    const i = st.index;
    const entry = timeline[i];
    if (i !== lastIndex) enter(i, st);
    syncProgress(entry, st.local, st.progress, dt);

    ctx.effects = effectsOf(entry.chapter, st.local);

    let pose = entry.chapter.pin ? { ...camKeys[i].pose } : samplePose(i + st.local);
    ctx.basePose = pose;
    const override = entry.module.poseOverride?.(ctx);
    if (override) pose = override;
    if (mobile) pose = mobileFit(pose, entry);
    stage.setCameraTarget(pose);

    const bgNow = stage.setBackground(ctx.effects.bg);
    const vig = (0.78 - 0.44 * bgNow).toFixed(2);
    if (vig !== lastVig) {
      document.documentElement.style.setProperty('--vig', vig);
      lastVig = vig;
    }

    entry.module.update?.(ctx);

    stage.applyCamera(dt, entry.chapter.parallax ?? 1);
    stage.render();

    if (mobile) ui.updateCard(entry, st.local, CARD);
    ui.tick(st, entry);

    requestAnimationFrame(frame);
  }

  function onResize() {
    stage.resize();
    engine.measure();
  }
  window.addEventListener('resize', onResize);

  return {
    engine,
    ctx,
    mobile,
    timeline,
    card: CARD,
    measure: () => engine.measure(),
    scrollToChapter: (i, immediate) => engine.scrollToScene(i, immediate),
    start() {
      engine.measure();
      requestAnimationFrame((t) => { last = t; frame(t); });
    },
  };
}
