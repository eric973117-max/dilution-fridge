/* ==========================================================================
   04 · 稀释制冷机 —— 行为层

   几何：./model/（原「稀释制冷机-下午版」的参数化整机，逐字迁移）
   文案：./content.js（纯数据，双语）
   本章每帧要做的事，全部从原 main.js 的 frame() / enterScene() 迁过来，
   只有两处结构性改动：
     1. 原来读「全页进度 st.progress 与 SCENES 下标」的地方，
        改成读导演传进来的「本层内进度 moduleProgress 与 chapterIndex」；
     2. 原来直接写 stage/DOM 的地方，改成走 ctx（stage / ui / effects）。
   没迁过来的部分（见 README「迁移状态」）：依赖图 overlay、引线标注、
   冷盘标签、点阵温度色、文档模式。
   ========================================================================== */

import content, { SHIELDS_CLOSE } from './content.js';
import { createMachine } from './model/machine/index.js';
import { MODEL_BOUNDS, XLD, STAGE_MARKS } from './model/machine/dims.js';
import { playSignalTrace, playReassembly, playGraphIn, playGraphOut, resetDetach } from './motion.js';
import { graphSpec, segmentItems, plateTourOrder } from './overlays.js';

const POSE_KEYS = ['az', 'el', 'zoom', 'tx', 'ty'];

let machine = null;
let plan = null;                     // 本层的时间轴计划（章序号 / 分离窗口），只算一次
let assemblyDone = false;
let leaders = null;
let labels = null;
let graph = null;
let prevKey = null;
let graphOn = false;

/* 与原 main.js 逐字一致的 motion 状态对象：machine.update() 每帧读它 */
const motion = {
  focus: null,
  dim: 0,
  xray: 0,
  signalT: 0,
  clay: 0,
  shield: 1,
  shieldFull: 1,
  shieldReveal: null,
  shieldGlow: 1,
  detach: {},
};

const smooth = (v) => v * v * (3 - 2 * v);

/* ------------------------------------------------------------ 时间轴计划 */

/* 分离动作的时间窗：进 seg01 开始松，走到 seg08 末尾整机全散开；
   相邻段互相重叠，整页是一条连续变形（算法与原 main.js 相同，
   只是把「全页 u」换成「本层 u」）。 */
function buildPlan(chapters) {
  const idx = {};
  chapters.forEach((c, i) => { idx[c.key] = i; });

  const segIndex = {};
  chapters.forEach((c, i) => { if (c.seg) segIndex[c.seg] = i; });

  /* 本层自身的时间占比：u0/u1 由导演写回 chapters[i].u0 / u1 */
  const u0 = (i) => chapters[i]?.u0 ?? 0;
  const u1 = (i) => chapters[i]?.u1 ?? 1;

  const windows = {};
  const from = u0(segIndex['01']);
  const to = u1(segIndex['08']);
  const reversed = ['08', '07', '06', '05', '04', '03', '02', '01'];
  const stride = (to - from) / (reversed.length + 1.2);
  reversed.forEach((id, k) => {
    const a = from + stride * k;
    windows[id] = [a, a + stride * 1.7];
  });
  windows['06'] = [...windows['05']];   // 06 讲的是 05 那串线束的下半截，没有独立几何

  motion.detach = Object.fromEntries(Object.keys(segIndex).map((id) => [id, 0]));

  return {
    assemblyIndex: idx['fridge-assembly'] ?? chapters.length,
    xrayIndex: idx['fridge-xray'] ?? 0,
    windows,
  };
}

/* ------------------------------------------------------------------ 生命周期 */

function build(ctx) {
  machine = createMachine();
  ctx.stage.scene.add(machine.root);

  /* 取景：这台机器的可视范围与制图附件（地面线 / 尺寸标注 / 中心轴）交给 stage */
  ctx.stage.setFraming({
    yMin: MODEL_BOUNDS.yMin,
    yMax: MODEL_BOUNDS.yMax,
    margin: MODEL_BOUNDS.margin,
    ground: XLD.ground,
    top: XLD.top,
    plateYs: XLD.plates,
    marks: STAGE_MARKS,
  });

  /* 覆盖层：依赖图（只在依赖章出现）、八段引线标注、冷盘名牌 */
  graph = ctx.overlays.buildGraph(graphSpec);
  leaders = ctx.overlays.createLeaders(segmentItems);
  labels = ctx.overlays.createLabels();
}

/* 第 0 章开始前会调一次：把计划算出来 */
function prepare(ctx) {
  if (!plan) plan = buildPlan(ctx.moduleChapters);
}

function onEnter(ctx) {
  if (!machine) return;
  const c = ctx.chapter;

  /* 依赖图：进场描线、离场收起（离开靠 prevKey 判断，onEnter 只在进入时触发） */
  const wantGraph = c.key === 'fridge-deps';
  if (prevKey === 'fridge-deps' && !wantGraph) {
    ctx.overlays.graphHost.classList.remove('is-on');
    if (graph) playGraphOut(graph.nodes, graph.edges);
  }
  if (wantGraph && !graphOn) {
    ctx.overlays.graphHost.classList.add('is-on');
    if (graph) playGraphIn(graph.nodes, graph.edges);
  }
  graphOn = wantGraph;
  prevKey = c.key;

  if (c.key === 'fridge-signal') {
    machine.setSignalVisible(true);
    playSignalTrace(motion);
  }
  /* 06 讲的是 05 那串线束的下半截：整串拉亮，不再重放追踪动画 */
  if (c.seg === '06') {
    machine.setSignalVisible(true);
    motion.signalT = 1;
  }
}

function update(ctx) {
  if (!machine || !plan) return;
  const { chapter, local, effects, dt, chapterIndex } = ctx;

  /* 1. 分离量：按本层进度推进，窗口互相重叠 */
  if (chapterIndex < plan.assemblyIndex) {
    Object.keys(plan.windows).forEach((id) => {
      const [a, b] = plan.windows[id];
      const raw = Math.max(0, Math.min(1, (ctx.moduleProgress - a) / Math.max(1e-5, b - a)));
      motion.detach[id] = smooth(raw);
    });
  }

  /* 2. 合体：到达或越过合体章就演一次（往回滚再往前会重演） */
  if (chapterIndex >= plan.assemblyIndex) {
    if (!assemblyDone) { assemblyDone = true; playReassembly(motion); }
  } else {
    assemblyDone = false;
  }

  /* 3. 焦点与舞台效果（clay 白模 / dim 压暗 / xray 剖面都来自章节数据） */
  motion.focus = chapter.seg === '06' ? ['05'] : (chapter.seg ?? null);
  motion.clay = effects.clay;
  motion.dim = effects.dim;
  motion.xray = effects.xray;

  /* 4. 罩子：只有两处出现 —— seg03 那一章给最外的真空外罩，以及结尾逐层套罩 */
  const onStack = chapter.key === 'fridge-shields' || chapter.key === 'fridge-outro';
  motion.shield = (chapter.seg === '03' || onStack) ? 1 : 0;
  motion.shieldFull = onStack ? 1 : 0;
  if (chapter.key === 'fridge-shields') {
    motion.shieldReveal = Math.min(1, local / 0.92);   // 滚动驱动套罩进度
    motion.shieldGlow = 1.25;
  } else if (chapter.key === 'fridge-outro') {
    motion.shieldReveal = 1;
    motion.shieldGlow = 1;
  } else if (chapter.seg === '03') {
    motion.shieldReveal = null;
    motion.shieldGlow = 2.2;
  } else {
    motion.shieldReveal = null;
    motion.shieldGlow = 1;
  }

  /* 5. 信号：离开这两章就把追踪拉回 0 */
  if (chapter.key !== 'fridge-signal' && chapter.seg !== '06') motion.signalT = 0;

  /* 6. 制图附件：轴线只在 overview→剖面之间出现，尺寸标注在开头最亮 */
  ctx.stage.setAxisOpacity(chapterIndex >= 0 && chapterIndex <= plan.xrayIndex ? 0.42 : 0);
  ctx.stage.setDimsOpacity(chapterIndex <= 0 ? 0.24 : 0.1);

  /* 7. 交给几何 */
  machine.update(motion, dt);

  /* 8. 覆盖层：引线标注（按段）、合体之后的整机标注、冷盘名牌 */
  if (leaders) {
    leaders.setActive(chapter.seg ?? null);
    const annotChapter = ['fridge-assembly', 'fridge-hold', 'fridge-outro'].includes(chapter.key);
    const assembled = Object.values(motion.detach).every((v) => (v ?? 0) < 0.02);
    leaders.setAnnotated(annotChapter && assembled, machine);
    leaders.update(ctx.stage.camera, machine, ctx.ui.cardFor(chapter.key));
  }

  if (labels) {
    /* 总览章：八件东西按顺序逐个交待（迁自原版的 PLATE_TOUR）；
       其余章节只标出这一章讲得到的那几块，并在章内轮着高亮。 */
    let plateIds = chapter.plates || [];
    let plateFocus = null;
    if (chapter.key === 'fridge-overview') {
      const per = 1 / plateTourOrder.length;
      const idx = Math.min(plateTourOrder.length - 1, Math.max(0, Math.floor(local / per)));
      plateIds = plateTourOrder.slice(0, idx + 1);
      plateFocus = plateTourOrder[idx];
    } else if (plateIds.length) {
      plateFocus = plateIds[Math.min(plateIds.length - 1, Math.floor(local * plateIds.length))];
    }
    motion.plateFocus = plateFocus;
    /* 桌面端卡片在右侧，名牌就往左展开；手机端由 labels.js 自己摆到固定位置 */
    labels.setActive(plateIds, ctx.mobile ? 'right' : 'left', plateFocus);
    labels.update(ctx.stage.camera, machine.plates, machine.chambers);
  }
}

/* 套罩章末尾推近景：导演采样出来的机位之上，再往近景插值一段 */
function poseOverride(ctx) {
  if (ctx.chapter.key !== 'fridge-shields' || ctx.local <= 0.72 || !ctx.basePose) return null;
  const t = smooth((ctx.local - 0.72) / 0.28);
  const out = {};
  POSE_KEYS.forEach((k) => {
    out[k] = ctx.basePose[k] + (SHIELDS_CLOSE[k] - ctx.basePose[k]) * t;
  });
  return out;
}

const bounds = () => (machine ? machine.bounds(null) : null);
const setActive = (on) => {
  if (machine) machine.root.visible = on;
  /* 离开这一层时把名牌与引线一起收掉，否则会挂在那儿压住后面几层 */
  if (!on) {
    labels?.setActive([], 'left', null);
    leaders?.setActive(null);
  }
};
const dispose = () => {
  if (!machine) return;
  resetDetach(motion);
  machine.root.parent?.remove(machine.root);
  machine = null;
  plan = null;
};

export default { ...content, build, prepare, onEnter, update, poseOverride, bounds, setActive, dispose };
