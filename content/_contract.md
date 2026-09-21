# 内容模块契约 · v0.1（已冻结）

这个文件是"层"与"站"之间的接口。**并行开发前先读它**，改它要单独一轮、要同步改
`tools/check.mjs` 与 `src/content.js`，不要各写各的。

---

## 1. 一个层 = 一个目录

```
content/
  01-cloud/
    content.js     ← 纯数据：文案、章节、机位、规格、术语引用（Node 可 import）
    module.js      ← 行为：build / update / bounds / setActive（可以 import 自己的模型代码）
    model/         ← 可选：这一层的几何、数据、素材（自己管，别人不碰）
  04-fridge/       ← 已迁移的样板层：model/ 里是整台稀释制冷机的参数化几何
  _registry.js     ← 生成物，别手改
  glossary.json    ← 全站术语唯一来源
```

**铁律：一个并行会话只改自己那个目录。** 公共文件（注册表、样式版本号、CHANGELOG、
`src/` 下的引擎）由主线改，见 `docs/PARALLEL.md`。

---

## 2. `content.js` 必须导出 default 对象

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 两位序号（`'04'`），必须与目录名前两位一致；决定时间轴顺序 |
| `key` | string | 唯一英文短名（`'fridge'`） |
| `name` | `{zh,en}` | 层名 |
| `temperature` | string | 该层的温度区间（`'300 K → 10 mK'`），不翻译 |
| `accent` | string | 该层主色，取自 `styles/tokens.css` 的温度色阶 |
| `audience` | string[] | 主要给谁看：`investor` / `client` / `student` |
| `summary` | `{zh,en}` | 一句话（≤40 字），首页与轨道用 |
| `glossary` | string[] | 本层用到的术语 key，必须在 `glossary.json` 里 |
| `chapters` | Chapter[] | 至少一章 |

### Chapter

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | string | ✓ | 全站唯一（`fridge-seg04`） |
| `label` | string | ✓ | HUD 上的英文缩写（`SEG 04 · DILUTION`），不翻译 |
| `title` | `{zh,en}` | ✓ | 章节标题 |
| `vh` | number | ✓ | 这一章占多少"视口高"的滚动行程（100 = 滚过一屏） |
| `pose` | `{from, to?}` | ✓ | 相机关键帧，见下 |
| `stage` | object | | 舞台效果目标值，见下 |
| `details` | `{zh:[],en:[]}` | ✓ | 正文段落数组 |
| `specs` | `[{k:{zh,en}, v}]` | | 规格表，值不翻译 |
| `glossary` | string[] | | 本章额外用到的术语 |
| `plates` | string[] | | 这一章要标出哪几个锚点（冷盘 / 腔体的 id，模块自己定义） |
| `pin` | boolean | | 本章相机钉死不动（定格章用） |
| `parallax` | number | | 鼠标视差强度，默认 1；只看细节的章可以调小（如 `0.4`） |
| `overlay` | boolean | | 这一章底部有覆盖层（如依赖图）：手机端模型带要给"卡片 + 覆盖层"一起让位，并且这一章的相机水平偏移会被清零（窄屏没有"另一边"可让） |

### `pose` —— 相机

```js
pose: { from: { az: -96, el: 10, zoom: 0.92, tx: 0, ty: 0 }, to: { ... } }
```

- `from` 是**这一章的机位关键帧**。整站把每章的 `from` 串成一条 Catmull-Rom 曲线，
  所以相机全程连续、没有跳切；缺哪个通道就从上一章继承。
- `to` 只在**整条时间轴的最后一章**生效（作为曲线终点）。中间章节的 `to` 不参与取景。
- 方位角 `az` 是有方向的：想让相机一直朝一个方向环绕，就让它沿同一个方向递增；
  突然反号会让相机"甩"过去（稀释制冷机那几章是刻意这么编排的）。
- 手机端取景不由 `pose` 决定：导演会用 `bounds()` 把整层按带子重新 fit（见第 4 节）。

### `stage` —— 白模 / 压暗 / 剖面

每个通道可以是三种写法：

```js
stage: {
  clay: [0, 1],        // 章内从 0 过渡到 1（白模）
  bg:   [1, 0, 0.35],  // 只在本章前 35% 内从 1 过渡到 0，之后保持 0
  dim:  0.34,          // 整章恒定
  xray: 0,
}
```

四个通道：`clay`（白模强度）、`bg`（背景由黑转灰）、`dim`（其余部分压暗）、`xray`（剖面）。
导演每帧把这个对象算好传给模块，模块自己决定怎么用（稀释制冷机是直接写进 `motion`）。

---

## 3. `module.js` 必须导出 default = `{ ...content, 若干钩子 }`

```js
import content from './content.js';

export default {
  ...content,                       // ← 内容原样铺开，导演从 module.chapters 读章节
  build(ctx) {},                    // 第一次进入本层时调用一次：往 ctx.scene 里加 3D
  prepare(ctx) {},                   // build 之后立刻调用：算本层自己的时间轴计划
  onEnter(ctx) {},                  // 每进入一章调用一次
  update(ctx) {},                   // 每帧调用（本层自己的动效状态）
  poseOverride(ctx) { return null; },// 可选：在导演采样的机位之上再改（返回完整 pose）
  bounds(ctx) { return null; },     // 可选：{ height, centerY, width? }（米），手机端取景用
  setActive(on) {},                 // 本层进入/离开时间轴：切 visible
  dispose() {},                     // 可选
};
```

### `ctx`（每帧原地更新，别缓存字段本身）

| 字段 | 说明 |
| --- | --- |
| `ctx.stage` | 舞台：`scene` / `camera` / `setFraming` / `setAxisOpacity` / `setDimsOpacity` / `viewSize` / `camY` |
| `ctx.scene` | `stage.scene` 的快捷方式 |
| `ctx.scaffold` | 占位构件库（线框机柜 / 板卡 / 线束 / 冷板 / 芯片 / 波形），没做正式模型时用它先把版面跑通 |
| `ctx.ui` / `ctx.i18n` | 版面与语言（`i18n.t({zh,en})`） |
| `ctx.feed` | 数据源适配器（现在只有静态；实时接口见 `src/feed.js`） |
| `ctx.module` | 当前层对象 |
| `ctx.moduleChapters` | 当前层的章节数组 |
| `ctx.chapter` | 当前章（`content.js` 里那张表里的对象，`u0/u1` 是导演写回的本层进度区间） |
| `ctx.chapterIndex` | 本章在本层内的下标 |
| `ctx.local` | 章内进度 0–1 |
| `ctx.moduleProgress` | 本层整体进度 0–1（做"逐章推进"的编排用它） |
| `ctx.progress` | 全站进度 0–1 |
| `ctx.effects` | 导演算好的 `{clay,bg,dim,xray}` |
| `ctx.basePose` | 导演这一帧采样的机位（`poseOverride` 用） |
| `ctx.mobile` | 是否 ≤900px |
| `ctx.overlays` | 覆盖层工厂：`buildGraph(spec)` / `createLeaders(items)` / `createLabels()`，见下 |

### 覆盖层（可选，但推荐都走这套）

三个都是**通用能力**（实现在 `src/overlays/`），数据由模块给，模块自己管生命周期：

```js
// 依赖图：spec = { nodes, edges, legend, caption, ariaLabel }，见 src/overlays/graph.js 顶部
const graph = ctx.overlays.buildGraph(spec);      // → { svg, nodes, edges }
ctx.overlays.graphHost.classList.add('is-on');    // 淡入 / 淡出

// 三维标注引线：items = [{ id, accent, en, zh, temp, spec, anchor, fallback }]
const leaders = ctx.overlays.createLeaders(items);
leaders.setActive(segId);                          // 单段引线（卡片 → 零件）
leaders.setAnnotated(on, machineObj);              // 合体后的整机标注牌（左右两栏）
leaders.update(stage.camera, machineObj, cardEl);  // 每帧

// 锚点名牌（冷盘 / 腔体这类"挂在零件上的标签"）
const labels = ctx.overlays.createLabels();
labels.setActive(ids, side, focusId);
labels.update(stage.camera, plates, chambers);     // plates/chambers 由模块给
```

覆盖层的样式在 `styles/overlays.css`，沿用原站那套变量名（`--ink-100` / `--accent` …），
`styles/tokens.css` 里做了别名；`--accent` 由导演在进入每一层时写成该层的温度色。
手机端（≤900px）引线不画、依赖图缩到 70vw 并贴在卡片上沿。

---

## 4. `bounds()` 与手机端

手机端不做"按章取景"，而是把**整个层**装进"顶部参数条以下、UI 带以上"的带子里。
所以 `bounds()` 要返回这一层内容的实际包围盒（米）：

```js
bounds(ctx) { return { height: 1.55, centerY: 0.02, width: 2.6 }; }
```

`width` 可选但建议给：窄屏只按高度取景时，横着的一排机柜会伸出屏幕。

---

## 5. 文案与术语

- 所有面向用户的文字必须是 `{zh, en}` 两边的字符串，`details` 是两边的数组。
  只写一边会被 `npm run check` 列出来（不阻塞开发，但上线前必须补齐）。
- **术语只从 `content/glossary.json` 取**，不许自造译名。要加术语：先加进 glossary，
  再由各层引用。这是中英双语站最容易被做散的地方。
- 不要在文案里写 Markdown 记号（`**粗体**` 之类）—— 渲染用的是纯文本。

---

## 6. 生成物（谁都不许手改）

`npm run gen`（`npm start` 会先自动跑一次）会写这四个：

| 文件 | 内容 |
| --- | --- |
| `content/_registry.js` | 模块注册表（按目录名排序） |
| `styles.css` | 样式入口，N 条带版本号的 `@import` |
| `src/version.js` | 样式版本号（内容 hash） |
| `index.html` 的 `?v=` | 同上 |

好处：并行开发时**没有人需要改注册表和版本号**，也就没有这处冲突；
忘了跑的话 `npm run check` 会直接报出来。

---

## 7. 验收标准（每层做完要过）

1. `npm run check` 没有 error（缺英文只算提醒，但要记进 CHANGELOG 的待办）。
2. 桌面 1600×1000：本层内容在画面里完整、不遮 HUD 与卡片。
3. 手机 430×932（另外看 390×844 / 768×1024）：整层装进带子、卡片不压模型。
4. 相机从上一层的最后一章过渡到本层第一章是连续的（不跳切、不翻转）。
5. 本层新增/修改的文案在两种语言下都读得通，术语与 glossary 一致。
