/* ==========================================================================
   Director · 把内容、几何、动效、滚动接在一起
   ========================================================================== */

import { SEGMENTS, SEGMENT_BY_ID, PLATE_CHAPTERS, PLATE_TOUR, TOTAL_STEPS } from './data.js';
import { createStage } from './stage.js';
import { createQuality } from './quality.js';
import { createStats } from './stats.js';
import { createMachine } from './machine/index.js';
import { buildUI, applyScene, toggle } from './ui.js';
import { buildGraph } from './graph.js';
import { buildDocMode } from './docmode.js';
import { createLeaders } from './leaders.js';
import { createDotGrid } from './fx.js';
import { createPlateLabels } from './plates.js';
import {
  SCENES, createScrollEngine, playBootIn, playCardIn, playCardOut,
  playRailIn, playGraphIn, playGraphOut, playSignalTrace, playReassembly,
  prefersReduced,
} from './motion.js';

/* ------------------------------------------------------------ 错误可见化 */

const errbox = document.getElementById('errbox');
function showError(msg) {
  errbox.hidden = false;
  errbox.textContent = String(msg).slice(0, 900);
}
window.addEventListener('error', (e) => showError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showError(`Promise: ${e.reason}`));

/* ------------------------------------------------------------------ 准备 */

/* 样式版本号（与 styles.css 的 @import ?v= 保持一致）——
   控制台里一眼能看出当前页面拿的是哪一版 CSS，排查"改了没生效"用。 */
const STYLE_VERSION = '20260920g';
console.info(`[ui] styles v${STYLE_VERSION}`);

const params = new URLSearchParams(location.search);
const forceDoc = params.get('doc') === '1';
let engineRef = null;

const ui = buildUI({
  onRailClick: (id) => {
    const i = SCENES.findIndex((s) => s.key === 'seg' + id);
    if (i >= 0 && engineRef) engineRef.scrollToScene(i);
  },
});

  const graph = buildGraph(document.getElementById('graph'));
  const leaders = createLeaders(document.body);
  const dotGrid = createDotGrid(document.getElementById('dotGrid'));
  /* 冷盘标签：前面各章在合适的位置标出六块平台的名字与特点（见 data.js PLATE_CHAPTERS） */
  const plateLabels = createPlateLabels(document.getElementById('plates'));

const canvas = document.getElementById('gl');
let stage = { failed: true };
let quality = null;
let stats = null;
let machineRef = null;          // 画质档位要在运行时改机器的环境反射强度
let envWanted = 0.55;
if (!forceDoc) {
  try {
    stage = createStage(canvas);
  } catch (e) {
    showError(e);
    stage = { failed: true };
  }
}

if (stage.failed || forceDoc) {
  canvas.style.display = 'none';
  document.getElementById('scroll').style.display = 'none';
  buildDocMode(document.getElementById('docmode'));
} else {
  /* 画质档位：弱机自动降档（规则见 src/quality.js）。只调"渲染倍率 + 环境反射强度"，
     画面内容一模一样，所以好设备上感觉不到；网址加 ?q=high|mid|low|auto 可强制。 */
  quality = createQuality((q, why) => {
    stage.setQuality({ maxDpr: q.maxDpr, env: q.env });
    envWanted = q.env;
    machineRef?.setEnvIntensity(q.env);          // 档位降下来时，环境反射也跟着关
    document.body.classList.toggle('q-mid', q.level === 'mid');
    document.body.classList.toggle('q-low', q.level === 'low');
    document.documentElement.dataset.quality = q.level;
    console.info(`[quality] ${q.level}（${why}）· dpr ≤ ${q.maxDpr ?? '设备默认'} · env ${q.env}`);
  });
  /* 现场诊断角标：网址加 ?stats=1（客户说"卡"时让他截图这个） */
  if (params.get('stats') === '1') stats = createStats(stage);
  if (prefersReduced) {
    document.querySelector('.fx--scan').style.display = 'none';
    document.querySelector('.fx--grain').style.display = 'none';
  }
  start();
}

/* ------------------------------------------------------------------- run */

/* 等浏览器真的画过一帧（rAF 回调跑在绘制之前，所以等第二帧才等于"已经画上去了"）。
   写成函数声明是为了提升 —— start() 在模块加载时就被调用，早于下面这些 const。
   后台标签页里 rAF 不跑，所以兜一层 yieldToBrowser（见 src/yield.js）。 */
function nextPaint() {
  return new Promise((resolve) => {
    let done = false;
    const fire = () => { if (done) return; done = true; resolve(); };
    requestAnimationFrame(() => requestAnimationFrame(fire));
    setTimeout(fire, 150);
  });
}

async function start() {
  /* ---- 首屏延后建几何 ------------------------------------------------
     开机那一屏（自检行 / SCROLL TO DISASSEMBLE / 四周围栏）全是 HTML+CSS，
     不需要等模型。而 createMachine() 是同步的重活（建几何 + 生成轮廓线，
     手机上是几百毫秒到一两秒），放在这里会把它前面的一切都顶住 ——
     用户就是先看到几秒白屏、然后机器"啪"地出现。
     所以先把底色刷出来、让浏览器画一帧，再开始建机器。 */
  stage.render();
  await nextPaint();

  /* createMachine 现在是 async 的：它把 dress/computeParts 那一段拆成分块执行，
     中间会让出主线程（见 src/machine/index.js）。 */
  /* 环境贴图交给 machine（材质级），只给"展示中/白模"的段挂上 —— 见 machine/index.js */
  const machine = await createMachine({ envMap: stage.envMap, envIntensity: envWanted });
  stage.scene.add(machine.root);
  machine.prewarmEnv(stage);          // 两套材质各编译一次，免得第一次切章卡一下
  machineRef = machine;
  machine.setEnvIntensity(envWanted);

  /* 信号链路六个节点灯对齐到**真实路径**上的位置（machine 按线束半径算出来的 t） */
  [...ui.signalNodes.children].forEach((el, i) => {
    if (machine.signalNodeT?.[i] != null) el.dataset.t = String(machine.signalNodeT[i]);
  });

  const engine = createScrollEngine({ reduced: prefersReduced });
  engineRef = engine;

  const motion = {
    focus: null,
    dim: 0,
    xray: 0,
    signalT: 0,
    clay: 1,
    /* 03 段那叠罩子：shield 是"出现/不出现"，shieldReveal 是结尾"逐层套上"的进度，
       shieldGlow 只在套罩时把半透明罩子提亮一些，方便看清是哪一层。 */
    shield: 1,
    shieldFull: 1,        // 1 = 五层罩子齐活；0 = 只给最外的真空外罩（前面几章）
    shieldReveal: null,
    shieldGlow: 1,
    detach: SEGMENTS.reduce((acc, s) => { acc[s.id] = 0; return acc; }, {}),
  };

  const segSceneIndex = SEGMENTS.reduce((acc, s) => {
    acc[s.id] = SCENES.findIndex((sc) => sc.key === 'seg' + s.id);
    return acc;
  }, {});

  /* 手机端：把章节卡从"固定层"搬进各自的章节段落 ——
     卡片因此跟着滚动上下滑动（滑入 / 滑出），而机器一直留在屏幕中央
     （canvas 本身是固定的，取景由滚动进度驱动）。
     桌面端不搬，保持原来的侧栏卡片 + 引线标注。 */
  const narrowLayout = window.matchMedia('(max-width: 900px)').matches;
  if (narrowLayout) document.body.classList.add('mobile-cards');

  /* 手机端卡片的节奏：滑入（前 6%）→ 停住（直到 84%，这段是留给你读的）→ 滑走并淡出（后 16%）。
     全部由**章节进度**驱动，而不是跟着滚动 1:1 —— 所以刷得再快，卡片也会停在原位让你看完；
     往回滚同样原路返回（上下可逆）。桌面端不走这条分支。
     另外 motion.js 里手机端把整条时间轴拉长到 1.6 倍（MOBILE_SCROLL_STRETCH），
     所以这里 0.06→0.84 这段"停住"落到手指上大约是 1300px 的行程，够读完一段。 */
  const CARD = { in: 0.06, holdEnd: 0.84, out: 0.16, travel: 0.34 };
  function updateMobileCard(sc, local) {
    const active = sc.seg ? ui.cards.get(sc.seg) : null;
    ui.cards.forEach((el) => {
      if (el === active) return;
      if (el.style.opacity !== '0') { el.style.opacity = '0'; el.classList.remove('is-on'); }
    });
    if (!active) return;
    if (!active.classList.contains('is-on')) active.classList.add('is-on');
    const sm = (v) => v * v * (3 - 2 * v);
    const t1 = sm(Math.min(1, Math.max(0, local / CARD.in)));
    const t2 = sm(Math.min(1, Math.max(0, (local - CARD.holdEnd) / CARD.out)));
    const dy = ((1 - t1) - t2) * CARD.travel * window.innerHeight;
    active.style.transform = `translateY(${dy.toFixed(1)}px)`;
    active.style.opacity = (t1 * (1 - t2)).toFixed(3);
  }
  const iXray = SCENES.findIndex((s) => s.key === 'xray');
  const iSignal = SCENES.findIndex((s) => s.key === 'signal');
  const iAssembly = SCENES.findIndex((s) => s.key === 'assembly');

  const totalVh = SCENES.reduce((a, s) => a + s.vh, 0);

  /* 每段分离动作在全页进度上的时间窗：从前一章过半开始动，
     到本章 45% 到位 —— 相邻段的动作互相重叠，整页是一条连续变形，不是逐章跳变 */
  const sceneU = [];
  {
    let acc = 0;
    SCENES.forEach((sc) => {
      const u0 = acc / totalVh;
      acc += sc.vh;
      sceneU.push([u0, acc / totalVh]);
    });
  }
  /* 分解 = 合体（playReassembly：01→08 依次归位）的**逆向**。
     整机是"一起松、按 08→01 依次错开"地摊开的，段与段互相重叠，
     缓动与合体共用 machine.update 里同一条曲线 —— 看起来就是合体倒放。
     窗口铺满八段章：进 seg01 就开始松，走到 seg08 末尾整机已经全散开。 */
  const detachWindow = {};
  {
    const from = sceneU[segSceneIndex['01']][0];
    const to = sceneU[segSceneIndex['08']][1];
    const reversed = [...SEGMENTS].reverse();          // 08 → 01
    const stride = (to - from) / (reversed.length + 1.2);
    reversed.forEach((s, k) => {
      const u0 = from + stride * k;
    detachWindow[s.id] = [u0, u0 + stride * 1.7];    // 1.7 = 重叠比例，和合体的错开节奏同量级
    });
    /* 06 没有自己的零件（它讲的是 05 那串线束的下半截），
       但保留一个同样的窗口，免得它整章都被当成"没动"处理。 */
    detachWindow['06'] = [...detachWindow['05']];
  }

  /* 机位编排：每一章都有「起始 → 结束」两个姿势，滚动过程中相机持续运动。
       相邻章节首尾相接，全程没有跳切。这是让「动画变化明显」的主要手段。 */
  /* 方位角故意不收敛到 ±180：整页它是一条连续的大环绕曲线，
     前半程正向绕两圈多，后半程反向绕回来，所以不会是"每章转到某个角度再停下" */
  /* 整机全景要装下「框架 + 杜瓦」：包络从脚板 −2.01 到脉冲管顶 +0.51。
     取景高度按杜瓦定死（见 stage.js），所以靠把 zoom 收到 0.70、
     取景中心下移到 −0.40 来装下整机。段特写机位不受影响。 */
  const camDefault = { az: -186, el: -16, zoom: 0.86, tx: 0, ty: -0.05 };
  const camPerScene = {
    boot: { from: camDefault, to: { az: -96, el: 10, zoom: 0.92, tx: 0, ty: 0.00 } },
    overview: { from: { az: -96, el: 10, zoom: 0.92, tx: 0, ty: 0.00 }, to: { az: -6, el: 36, zoom: 1.00, tx: 0, ty: 0.08 } },
    xray: { from: { az: 262, el: 78, zoom: 1.45, tx: 0, ty: -0.60 }, to: { az: 132, el: 6, zoom: 0.74, tx: 0, ty: 0.02 } },
    signal: { from: { az: 132, el: 6, zoom: 0.74, tx: 0, ty: 0.02 }, to: { az: 70, el: 30, zoom: 0.70, tx: 0, ty: 0.06 } },
    /* 依赖图占左边，机器挪到右半边 —— 图不再压在机体上。
       下一章（assembly）的起始机位跟着同样右移，否则本章后半程机器会飘回中间又压到图。 */
    /* 依赖图占左边，机器让到右半边（图的尺寸与位置见 styles/overlays.css 的 .overlay--graph） */
    deps: { from: { az: 70, el: 30, zoom: 0.46, tx: -1.10, ty: 0.02 }, to: { az: -78, el: 8, zoom: 0.45, tx: -1.10, ty: -0.02 } },
    assembly: { from: { az: -78, el: 8, zoom: 0.45, tx: -1.10, ty: -0.02 }, to: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 } },
    /* 定格章：机位相对上一章末尾完全不动（frame() 里还会再钉一次，保证一动不动） */
    hold: { from: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 }, to: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 } },
    /* 套罩章：机位慢慢退到"连真空外罩一起装得下"的口径 —— 包络从 1.41 m 涨到 1.79 m，
       所以 zoom 收到 0.60，视线略抬起来看罩子一层层套下来 */
    /* 层列表挪到右侧，机器相应让到左边（tx 为正 = 机器在画面里往左） */
    shields: { from: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 }, to: { az: -150, el: 12, zoom: 0.56, tx: 0.34, ty: -0.10 } },
    /* 总表章：从套罩末尾那个近景接着走，几乎不动，只把总表看完 */
    outro: { from: { az: -158, el: 8, zoom: 0.80, tx: 0.22, ty: -0.06 }, to: { az: -164, el: 9, zoom: 0.86, tx: 0.16, ty: -0.05 } },
  };

  /* 定格用的姿势：整章不变（samplePose 的曲线在"两个相同关键帧"之间仍会有极小摆动） */
  const HOLD_POSE = { ...camDefault, ...camPerScene.hold.from };
  /* 罩子全部套完之后拉过去看的近景（套罩章末尾推到这里，总表章从这里接着走） */
  const SHIELDS_CLOSE = { ...camDefault, ...camPerScene.outro.from };

  /* ---------------------------------------------------------- 连续机位 --
     把每一章的起始机位按全页进度串成一条曲线，用 Catmull-Rom 采样。
     相邻章节的机位首尾相接，Catmull-Rom 又保证切线连续，
     所以整页看下来相机是一条不断的速度曲线，没有"停-走-停"。      */
  const POSE_KEYS = ['az', 'el', 'zoom', 'tx', 'ty'];
  const camKeys = [];
  {
    let acc = 0;
    SCENES.forEach((sc) => {
      const pose = sc.seg
        ? SEGMENT_BY_ID[sc.seg].cam
        : (camPerScene[sc.key]?.from ?? camDefault);
      camKeys.push({ u: acc / totalVh, pose: { ...camDefault, ...pose } });
      acc += sc.vh;
    });
    camKeys.push({ u: 1, pose: { ...camDefault, ...camPerScene.outro.to } });
  }

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

  /* 两个姿势之间线性插值（只用在"套罩末尾推近景"这一处） */
  function poseLerp(a, b, t) {
    const out = {};
    POSE_KEYS.forEach((k) => { out[k] = a[k] + (b[k] - a[k]) * t; });
    return out;
  }

  function samplePose(u) {
    let k = 0;
    while (k < camKeys.length - 2 && u > camKeys[k + 1].u) k++;
    const a = camKeys[Math.max(0, k - 1)].pose;
    const b = camKeys[k].pose;
    const c = camKeys[k + 1].pose;
    const d = camKeys[Math.min(camKeys.length - 1, k + 2)].pose;
    const span = Math.max(1e-6, camKeys[k + 1].u - camKeys[k].u);
    const t = Math.max(0, Math.min(1, (u - camKeys[k].u) / span));
    const out = {};
    POSE_KEYS.forEach((key) => {
      out[key] = catmull(a[key], b[key], c[key], d[key], t);
    });
    return out;
  }

  let activeIndex = -1;
  let assemblyDone = false;
  let lastVig = -1;
  let plateSide = 'right';
  let lastUiBand = -1;                 // 手机端 UI 带高度（写进 --drawer-px，给步进器定位）

  function enterScene(i) {
    const sc = SCENES[i];
    const prev = activeIndex >= 0 ? SCENES[activeIndex] : null;

    if (sc.key === 'boot') {
      playBootIn();
    }
    if (prev && prev.key === 'boot' && sc.key !== 'boot') {
      toggle(ui.rail, true);
      playRailIn(ui.rail);
    }

    if (narrowLayout) {
      /* 手机端：卡片已经在各自章节里、跟着滚动滑入滑出，这里不再按章切换 */
    } else if (sc.seg) {
      ui.cards.forEach((el, id) => { if (id !== sc.seg) playCardOut(el); });
      playCardIn(ui.cards.get(sc.seg));
    } else {
      ui.cards.forEach((el) => playCardOut(el));
    }

    if (sc.key === 'deps') playGraphIn(graph.nodes, graph.edges);
    if (prev && prev.key === 'deps' && sc.key !== 'deps') playGraphOut(graph.nodes, graph.edges);

    if (sc.key === 'signal') {
      machine.setSignalVisible(true);
      playSignalTrace(motion);
    }

    /* 06 超导传输段 = 这串线束的下半截（4 K 以下），模型里没有独立的几何块，
       所以这一章把信号路径整条拉出来，并把 4 K 冷板留作分界（PLATE_CHAPTERS.seg06）——
       亮着的那串线 + 4 K 那条线，就是这一段的答案。 */
    if (sc.seg === '06') {
      machine.setSignalVisible(true);
      motion.signalT = 1;
    }

    applyScene(ui, sc, sc.seg ?? null);
    leaders.setActive(sc.seg ?? null);

    /* 冷盘标签要挂到"当前段落说明卡"的对面一侧，别两个东西压在一起 */
    const cardEl = sc.seg ? ui.cards.get(sc.seg) : null;
    const rect = cardEl ? cardEl.getBoundingClientRect() : null;
    plateSide = rect && rect.left > window.innerWidth * 0.5 ? 'left' : 'right';
    /* 索引标注不由这里开关：等零件真的合体到位再逐条出现，见下面的每帧判断 */
    /* 段位点阵扫成当前段的温度色 —— 颜色是「这一段有多冷」的读数，不是装饰 */
    if (dotGrid) {
      /* 只在功能段章节出现 —— 温度色在那里才有读数意义 */
      dotGrid.setVisible(!!sc.seg);
      if (sc.seg) dotGrid.sweep(SEGMENT_BY_ID[sc.seg].accent || '#b4b1af');
    }
    document.getElementById('sceneLabel').textContent = sc.label;
    activeIndex = i;
  }

  /* --------------------------------------------------------------- 每帧 */
  let last = performance.now();
  let lastScene = -1;

  /* 章节偏移只在 measure 时读一次，避免每帧触发 8 次布局计算 */
  function localOf(i, y) {
    const m = engine.metrics[i];
    if (!m) return 0;
    if (y < m.top) return 0;
    if (y > m.top + m.height) return 1;
    return (y - m.top) / m.height;
  }

  function frame(now) {
    const rawDt = (now - last) / 1000;          // 真实帧间隔：画质档位靠它判断
    const dt = Math.min(0.05, rawDt);
    last = now;

    engine.raf(now);
    const st = engine.getState();
    const i = st.index;
    const sc = SCENES[i];
    if (i !== lastScene) {
      enterScene(i);
      lastScene = i;
    }

    const pastAssembly = i >= iAssembly;

    /* 分离量按全页进度推进，动作窗口互相重叠，整体是一次连续变形 */
    if (!pastAssembly) {
      SEGMENTS.forEach((s) => {
        const [u0, u1] = detachWindow[s.id];
        const raw = Math.max(0, Math.min(1, (st.progress - u0) / Math.max(1e-5, u1 - u0)));
        motion.detach[s.id] = raw * raw * (3 - 2 * raw);
      });
    }

    /* 合体：只要到达或越过合体章就演一次。
       判据用 st.index 而不是「有没有路过 assembly 章」——
       ?scene=N、?y=、导航轨跳转都可能整章跳过去，用「路过」判会漏演，
       结果就是跳着看的人永远看到一台散着的机器。 */
    if (pastAssembly) {
      if (!assemblyDone) { assemblyDone = true; playReassembly(motion); }
    } else {
      assemblyDone = false;
    }

    /* 06 讲的是 05 那串线束的下半截，不是另一件东西：
       焦点留在 05 上（整串线束亮着），其余段压暗 —— 亮着的那串线就是它讲的东西。 */
    motion.focus = sc.seg === '06' ? ['05'] : (sc.seg ?? null);
    /* 手机端把"非当前段"压得更暗：下面那条 UI 带里还看得见机器的话会很乱 */
    motion.dimOthers = window.innerWidth <= 900 ? 0.07 : 0.16;

    /* 连续机位：整页一条曲线，按全页进度采样 */
    const local = localOf(i, st.y);
    /* 定格章：姿势直接钉死，整章一动不动 */
    let target = sc.key === 'hold' ? { ...HOLD_POSE } : samplePose(st.progress);
    /* 套罩章末尾：五层都套上之后拉近景，让模型看得更清楚（总表章从这儿接着走） */
    if (sc.key === 'shields' && local > 0.72) {
      const t = (local - 0.72) / 0.28;
      target = poseLerp(target, SHIELDS_CLOSE, t * t * (3 - 2 * t));
    }
    /* 手机端取景：严格分区 —— 模型只占「顶部参数条以下、UI 带以上」这一块，
       UI（章节抽屉 / 结尾几章的说明块）只在下面那一带。
       带子的高度按**实际 UI 高度**算（抽屉有多高让多少），所以卡片矮的时候
       模型会自己长大把空间用起来，也不会再被抽屉压住。 */
    if (window.innerWidth <= 900) {
      const CAM_Y = stage.camY;
      const H = window.innerHeight;
      const DOCK = 92;                                     // 段位条 + 页脚（与 responsive.css 对齐）
      const TOP_PAD = 62;                                  // 顶部参数条让出的高度
      const cardEl = sc.seg ? ui.cards.get(sc.seg) : null;
      const hasCard = !!(cardEl && cardEl.classList.contains('is-on'));
      /* 这几章没有章节卡，但底部有一块说明/图表，同样按 34vh 的带子留出来 */
      const bigOverlay = ['deps', 'outro', 'signal', 'xray', 'shields'].includes(sc.key);
      /* 点了"隐藏说明"之后，UI 带归零 —— 模型立刻长满整屏 */
      const uiHidden = document.body.classList.contains('ui-hidden');
      const uiBand = hasCard ? cardEl.offsetHeight : (bigOverlay && !uiHidden ? H * 0.34 : 0);
      /* 步进器要正好贴在 UI 带的上沿：把实际高度写进 CSS 变量（≤900px 的 .stepper 用它定位） */
      if (uiBand !== lastUiBand) {
        document.documentElement.style.setProperty('--drawer-px', `${Math.round(uiBand)}px`);
        lastUiBand = uiBand;
      }
      const bandH = Math.max(200, H - DOCK - uiBand - TOP_PAD);
      const bandFrac = bandH / H;
      const bandCenter = (TOP_PAD + bandH / 2) / H;        // 带子中心在屏幕上的位置（0 = 顶）

      /* 用**整机**的包围盒，而不是"当前段"的：
         段包围盒只保证这一段装得下，机器上比它更靠下 / 更靠外的零件（比如 03 段的真空外罩、
         芯片与读出链）会漏到卡片后面，看着就像卡片有黑底。整机装进带子才真的不漏。 */
      const b = machine.bounds(null) ?? { height: 1.6, centerY: CAM_Y };
      const fit = (bandFrac * 0.92 * stage.viewSize) / Math.max(0.35, b.height);
      target.zoom = Math.min(target.zoom, Math.max(0.26, fit));
      const visibleH = stage.viewSize / target.zoom;
      target.ty = (b.centerY - CAM_Y) - (0.5 - bandCenter) * visibleH;
    }
    stage.setCameraTarget(target);
    /* 手机端卡片节奏（见 updateMobileCard）：滑入 → 停住可读 → 滑走淡出 */
    if (narrowLayout) updateMobileCard(sc, local);

    /* 参考顺序：整体(黑·线稿) → 白模(灰底) → 分解 → 合并 → 白模(灰底) → 整体(黑·线稿) */
    const smooth = local * local * (3 - 2 * local);
    let clayT = 0;
    let bgT = 0;
    if (sc.key === 'overview') { clayT = smooth; bgT = smooth; }
    else if (sc.key === 'seg01') {
      /* 褪成线稿要在本章前三分之一内完成，否则旁注文字压在灰底上看不清 */
      const t = Math.min(1, smooth / 0.35);
      clayT = 1 - t;
      bgT = 1 - t;
    }
    else if (sc.key === 'assembly') { clayT = smooth * 0.92; bgT = smooth; }
    /* 定格 + 逐层套罩：一直保持合体完成时的白模 —— 罩子是半透明的，
       白模底下才看得清一层层套到了哪儿。到总表章再一起褪回线稿，
       这就是"后面再变色淡化"的那一下。 */
    else if (sc.key === 'hold' || sc.key === 'shields') { clayT = 0.92; bgT = 1; }
    else if (sc.key === 'outro') { clayT = 0.92 * (1 - smooth); bgT = 1 - smooth; }
    motion.clay = clayT;

    const bgNow = stage.setBackground(bgT);
    const vig = 0.78 - 0.44 * bgNow;
    if (Math.abs(vig - lastVig) > 0.01) {
      document.documentElement.style.setProperty('--vig', vig.toFixed(2));
      lastVig = vig;
    }

    if (sc.key === 'signal') motion.dim = 0.9;
    else if (sc.key === 'deps') motion.dim = 0.86;
    else if (sc.key === 'hold') motion.dim = 0.34;   // 与 93 步那一帧完全一致
    else if (sc.key === 'shields') motion.dim = 0.20; // 套罩时留亮一点，看得清层
    else if (sc.key === 'outro') motion.dim = 0.34;   // 要看清引线指着的零件，别压太暗
    else motion.dim = 0;

    /* 罩子：只有两个地方出现 —— 03 段那一章给最外的真空外罩（这一段就是讲它），
       以及结尾"逐层套罩"。剖面章与前面各章不再重复展示那叠罩子，
       四级辐射罩留到结尾一层层套上时才出现。 */
    const onShieldStack = sc.key === 'shields' || sc.key === 'outro';
    motion.shield = (sc.seg === '03' || onShieldStack) ? 1 : 0;
    motion.shieldFull = onShieldStack ? 1 : 0;
    if (sc.key === 'shields') {
      /* 滚动驱动：整章 local 0→1 就是套罩进度，末尾 8% 留白给"都套好了" */
      motion.shieldReveal = Math.min(1, local / 0.92);
      motion.shieldGlow = 1.25;
    } else if (sc.key === 'outro') {
      motion.shieldReveal = 1;
      motion.shieldGlow = 1;
    } else if (sc.seg === '03') {
      /* 这一章只给真空外罩，把它提亮一点，别让"真空腔"淡到看不见 */
      motion.shieldReveal = null;
      motion.shieldGlow = 2.2;
    } else {
      motion.shieldReveal = null;
      motion.shieldGlow = 1;
    }

    if (sc.key === 'signal') motion.xray = 1;
    else if (sc.key === 'xray') motion.xray = Math.min(1, localOf(iXray, st.y) / 0.45);
    else motion.xray = 0;

    if (sc.key !== 'signal' && sc.seg !== '06') motion.signalT = 0;

    const axisOn = i >= 1 && i <= iXray;
    stage.setAxisOpacity(axisOn ? 0.42 : 0);
    stage.setDimsOpacity(i <= 1 ? 0.24 : 0.1);

    machine.update(motion, dt);
    stage.applyCamera(dt, sc.key === 'signal' ? 0.4 : 1);
    stage.render();

    /* 合体之后的几章（合体 / 定格 / 套罩 / 总表）挂索引标注：
       零件全部合体到位（各段 detach 归零）之后才逐条出现，没到位前一条都不挂。 */
    /* 套罩章不再挂 8 段索引标注 —— 那一段只讲罩子，把版面让给层列表 */
    const annotChapter = ['assembly', 'hold', 'outro'].includes(sc.key);
    const assembled = SEGMENTS.every((s) => (motion.detach[s.id] ?? 0) < 0.02);
    leaders.setAnnotated(annotChapter && assembled, machine);

    leaders.update(stage.camera, machine, sc.seg ? ui.cards.get(sc.seg) : null);

    /* 套罩章：高亮正在套的那一层说明 */
    if (sc.key === 'shields') {
      const items = [...ui.shieldNodes.children];
      const n = Math.max(1, items.length - 1);
      let active = 0;
      items.forEach((_, k) => {
        const ramp = Math.min(1, Math.max(0, (motion.shieldReveal - (k / n) * 0.58) / 0.42));
        if (ramp * ramp * (3 - 2 * ramp) > 0.5) active = k;
      });
      items.forEach((el, k) => el.classList.toggle('is-on', k === active));
    }

    /* 冷盘与腔室：
       · 3–9 步是"通览" —— 这一段机位俯视整体，盘和腔分得最开，逐个交待清楚；
       · 之后各段里只标出该章讲得到的那几块，本段内轮着高亮。 */
    const step = st.progress * TOTAL_STEPS;
    let plateIds = PLATE_CHAPTERS[sc.key] || [];
    let plateFocus = null;
    if (step >= PLATE_TOUR.from && step <= PLATE_TOUR.to) {
      const order = PLATE_TOUR.order;
      const per = (PLATE_TOUR.to - PLATE_TOUR.from) / order.length;
      const idx = Math.min(order.length - 1, Math.max(0, Math.floor((step - PLATE_TOUR.from) / per)));
      plateIds = order.slice(0, idx + 1);
      plateFocus = order[idx];
    } else if (plateIds.length) {
      plateFocus = plateIds[Math.min(plateIds.length - 1, Math.floor(local * plateIds.length))];
    }
    motion.plateFocus = plateFocus;
    plateLabels.setActive(plateIds, plateSide, plateFocus);
    plateLabels.update(stage.camera, machine.plates, machine.chambers);

    document.getElementById('progressBar').style.width = `${(st.progress * 100).toFixed(1)}%`;
    document.getElementById('progressPct').textContent = String(
      Math.round(st.progress * TOTAL_STEPS),
    ).padStart(3, '0');

    ui.signalNodes.querySelectorAll('li').forEach((el) => {
      el.classList.toggle('is-on', motion.signalT >= Number(el.dataset.t) - 0.02);
    });

    /* 画质档位：按实测帧时间自动升降（弱机掉到 mid/low，好设备不受影响） */
    if (quality) quality.sample(rawDt);
    if (stats) stats.tick(rawDt);

    requestAnimationFrame(frame);
  }

  function onResize() {
    stage.resize();
    engine.measure();
  }
  window.addEventListener('resize', onResize);
  engine.measure();

  /* -------------------------------------------------------------- 键盘 ---
     PRD §7：↑↓/Space 滚动、Home/End 首尾、1–8 直达段、C 剖面、S 链路、D 依赖图。
     Lenis 只接管滚轮，键盘默认的逐次跳转很生硬，所以统一走平滑滚动。 */
  const iDeps = SCENES.findIndex((s) => s.key === 'deps');

  function smoothTo(y) {
    if (engine.lenis) engine.lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
  }

  /* 手机端"±2 步"：手指滑动没办法像滚轮那样一格一格，用这两颗按钮精确推进。
     桌面端按钮是 display:none（见 styles/overlays.css 与 responsive.css），点了也没有副作用。 */
  const jumpSteps = (n) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.max(0, Math.min(max, window.scrollY + (n / TOTAL_STEPS) * max));
    smoothTo(y);
  };
  document.getElementById('stepBack')?.addEventListener('click', () => jumpSteps(-2));
  document.getElementById('stepFwd')?.addEventListener('click', () => jumpSteps(2));

  function scrollByViewport(dir) {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    smoothTo(Math.max(0, Math.min(max, window.scrollY + dir * window.innerHeight * 0.9)));
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t.isContentEditable) return;
    /* Space / Enter 要留给按钮和链接，别抢走它们的默认行为 */
    if ((e.key === ' ' || e.key === 'Enter') && t && /^(button|a)$/i.test(t.tagName)) return;
    if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;

    const k = e.key;
    const segKey = /^[1-8]$/.test(k) ? `0${k}` : null;
    if (segKey && segSceneIndex[segKey] != null) {
      engine.scrollToScene(segSceneIndex[segKey]);
    } else if (k === 'c' || k === 'C') {
      engine.scrollToScene(iXray);
    } else if (k === 's' || k === 'S') {
      if (activeIndex === iSignal) {
        machine.setSignalVisible(true);
        playSignalTrace(motion);
      } else {
        engine.scrollToScene(iSignal);
      }
    } else if (k === 'd' || k === 'D') {
      engine.scrollToScene(iDeps);
    } else if (k === 'Home') {
      smoothTo(0);
    } else if (k === 'End') {
      smoothTo(document.documentElement.scrollHeight);
    } else if (k === 'ArrowDown' || k === 'PageDown' || k === ' ') {
      scrollByViewport(1);
    } else if (k === 'ArrowUp' || k === 'PageUp') {
      scrollByViewport(-1);
    } else {
      return;
    }
    e.preventDefault();
  });

  applyScene(ui, SCENES[0], null);
  playBootIn();
  document.getElementById('sceneLabel').textContent = SCENES[0].label;

  if (params.get('scene') !== null) {
    const jump = Number(params.get('scene'));
    if (!Number.isNaN(jump)) setTimeout(() => engine.scrollToScene(jump, true), 80);
  }
  if (params.get('y') !== null) {
    const yJump = Number(params.get('y'));
    if (!Number.isNaN(yJump)) setTimeout(() => window.scrollTo(0, yJump), 80);
  }

  window.__dev = { machine, engine, stage, motion, SCENES };

  requestAnimationFrame((t) => { last = t; frame(t); });
}
