# 稀释制冷机 · 八段功能拆解（下午版）

一个滚动驱动的工程级 3D 叙事站：把稀释制冷机拆成 8 个功能段，滚轮往下走就是一次拆机。

这份是 **2026-09-18 下午运行时的那一版**，已经从原项目里独立出来，单独成仓、单独运行，
和 `../交互网页设计` 里的其他版本互不影响。版本来源见 [PROVENANCE.md](PROVENANCE.md)。

## 跑起来

```bash
cd 稀释制冷机-下午版
npm start                     # → http://127.0.0.1:8400/
```

没有 npm 依赖，只要有 Node ≥ 18 就能跑（`npm start` 只是执行 `node tools/serve.mjs`）。
换端口：`npm start -- --port 8500`，或 `PORT=8500 node tools/serve.mjs`。

不想用 Node 也行，任意静态服务器都可以：

```bash
python3 -m http.server 8400
```

**别直接双击 `index.html`**：它是原生 ES module（`<script type="module">` + 相对路径 `import`），
浏览器不允许 `file://` 下的模块加载，必须走 http。服务器已经关掉缓存，改完源码刷新即可。

自检（不存在的 import / 漏文件一跑就知道）：

```bash
npm run check
```

## 目录

| 路径 | 作用 |
| --- | --- |
| `index.html` | 页面骨架：canvas、HUD、8 段卡片容器、各种 overlay |
| `styles.css` + `styles/*.css` | 设计令牌、HUD、卡片、overlay、响应式 |
| `src/main.js` | 装配入口：读章节 → 摆机位 → 驱动 3D 与 DOM |
| `src/data.js` | 八段文案、规格参数、章节镜头、依赖关系（**改内容先看这里**） |
| `src/machine/index.js` | 用参数化模型建整机、按段挂零件、分离/合体 |
| `src/atlas/*.js` | 参数化模型（XLD v2：平台/支撑/线缆/冷头/芯片/屏蔽/外罩） |
| `src/motion.js` | 运动状态机（展开、合体、罩子、剖面） |
| `src/stage.js` `src/fx.js` `src/ui.js` `src/graph.js` `src/leaders.js` | 相机、网格/颗粒特效、HUD、依赖图、三维标注引线 |
| `src/plates.js` | 冷盘标签：把六块平台的名字 / 温度 / 特点钉在盘边（锚点跟着零件走） |
| `src/parts/*` `src/machine/seg0*.js` `src/machine/builders.js` | 早先的程序化几何配方（本版仍被 import，但 `BUILDERS` 未被调用，不参与建模） |
| `vendor/` | 已内置的第三方库：three.js、anime.js、lenis（**无需联网安装**） |
| `data/` | 规格 JSON 等数据文件 |
| `docs/` | 设计文档与过程记录（`docs/prd/` 是原项目的 PRD 序列，`docs/原项目 README.md` 是原说明） |
| `tools/` | `serve.mjs` 静态服务器、`check.mjs` 引用自检 |

## 想改什么，打开哪

| 想改的东西 | 打开 |
| --- | --- |
| 八段文案 / 参数 / 镜头 / 依赖 | `src/data.js` |
| 机位、章节切换、相机曲线 | `src/main.js`（`KEYS` 那一段） |
| 机器外形、零件挂载 | `src/machine/index.js` + `src/atlas/*.js` |
| 展开/合体/罩子/剖面的运动 | `src/motion.js` |
| 配色、字号、间距 | `styles/tokens.css`（其余样式表引用它） |
| 标注引线 | `src/leaders.js` |
| 依赖图 | `src/graph.js` + `styles/overlays.css` |
| 结尾五层罩子的层序与说明 | `src/data.js` 的 `SHIELD_LAYERS`（`stage` 决定它认领哪块罩子） |
| 冷盘标签的文案与出现章节 | `src/data.js` 的 `PLATE_NOTES` / `PLATE_CHAPTERS`，位置在 `src/plates.js` |
| 3–9 步那轮"冷盘与腔室"讲解 | `src/data.js` 的 `PLATE_TOUR`（顺序与步窗）、`CHAMBERS`（两个腔体）、`PLATE_COLORS`（变色用的温度色） |
| 各章长度与顺序 | `src/motion.js` 的 `SCENES`（`vh` 决定它占多少步） |
| 定格 / 套罩 / 收尾的机位与配色 | `src/main.js` 的 `camPerScene`（`hold` / `shields` / `outro`）与 `frame()` 里的 `clayT/bgT` |

## 叙事时间轴（HUD 的"步" = 0–160）

HUD 的步数是 `y ÷（文档总高 − 视口高）`：**最后一章里有一段是滚不动的视口高度**。
改 `SCENES` 里任何一章的 `vh`，后面几章的步号都会跟着移动，改完照下表核对一遍。

刻度总量在 `src/data.js` 的 `TOTAL_STEPS`（现在是 **160**，早先限制在 100 时每一"步"
摊到的行程太短，结尾几段被赶着播完）。步数只是刻度，真正决定每段行程的是各章的 `vh`。

| 步 | 章节 | 内容 |
| --- | --- | --- |
| 0–10 | `boot` | 开场自检行 |
| 10–20 | `overview` | 整机总览（切白模） |
| **5–19** | （横跨 boot/overview） | **冷盘与腔室逐个交待**：8 个对象轮着高亮、变色、展开一句特点 |
| 20–97 | `seg01…seg08` | 八段逐段拆解（20–29 / 29–38 / 38–46 / 46–59 / 59–67 / 67–76 / 76–85 / 85–97）；讲到哪几块冷盘就标出来 |
| 97–107 | `xray` | 沿 Z 轴剖开，看八段怎么叠 |
| 107–118 | `signal` | 一条微波控制线从 300 K 走到 10 mK |
| 118–130 | `deps` | 依赖图：左侧一块八段方块图（承载 / 供冷 / 信号 / 屏蔽 四类连线），机器让到右半边 |
| 130–139 | `assembly` | 按依赖顺序合体 |
| **139–146** | `hold` | **整机定格**：机位、白模、配色全程不变（相机姿势钉死） |
| **146–157** | `shields` | **逐层套罩**：MXC → Still → 4 K → 50 K → 真空外罩，每层一句说明（列表在右侧竖排，机器让到左边）；这一段收起 8 段索引标注与导航轨 |
| **157–160** | `outro` | **变色淡化** + 总规格表；机位从套罩末尾的近景接着走（模型看得更清楚） |

两条容易踩的约定：

- **分解是合体的逆向**：整机按 08→01 依次错开摊开（窗口由 `main.js` 的 `detachWindow` 算，
  铺满八段章），所以某一段往往在讲它之前就已经散开了 —— 这是刻意的。
- **引线锚点是模型实测值**：八段的 `anchor` 必须落在该段真实零件附近，
  换模型或改尺寸后要重新量（`data.js` 里那 8 个数）。
- **05 与 06 是同一串线束的上下两段，几何不切**：整串 `wiring` 都归 05，一起动；
  06 那一章 `motion.focus = null`（不压暗其余段），只换机位与说明，引线指向 4 K 以下那段。
- **信号链路按真实线束走**：路径点由 `machine/index.js` 的 `ROUTE` 按线束挂载半径
  （MXC 半径 − 48mm）与平台标高算出，六个节点压在路径点上，HUD 的 t 由 `signalNodeT` 写进 `data-t`。

结尾这条链实现在三处：层序与文案在 `src/data.js` 的 `SHIELD_LAYERS`；
落位进度与半透明罩子的淡入在 `src/machine/index.js`（按 `motion.shieldReveal` 逐层错开，
还没轮到的层直接不画）；章节、机位与配色在 `src/motion.js` / `src/main.js`。

## 移动端（≤900px）

版面按竖屏排成三段：**上：模型 / 中：段位条 / 下：章节抽屉**（桌面端一行未改）。

| 部位 | 规则 |
| --- | --- |
| 机位 | `src/main.js`：`innerWidth <= 900` 时 `zoom × 0.78`、`ty − 0.28`，机器整体上移让开抽屉 |
| 章节卡 | `styles/responsive.css` 的 `.card`：底部抽屉，收起 27–34vh、展开 68vh；把手在 `src/ui.js` 的 `.card__handle` |
| 段位条 | `.rail` 横排一行，每项 44px 可点 |
| 冷盘标签 | `src/plates.js` 的 mobile 分支：一次只显示当前那一块，固定在左上角下方一行 |
| 结尾几章 | 信号 / 剖面 / 套罩的说明块放进抽屉带（`padding-bottom: calc(dock + 6px)`），模型完整留在上半屏 |
| 引线 | 窄屏关闭（`.leaders { display: none }`）；规格表走窄屏表格 |

**待办：移动端另交付** —— 产物分目录（`dist/web`、`dist/mobile`）+ 单独交付仓，两边用同一个 tag 对齐；细节见 CHANGELOG。

## 关于这一版

- 时间点：**2026-09-18 12:38:33**（Asia/Shanghai），即当天下午浏览器里实际跑着的那一版。
- 它和当晚之后的版本差别在机位、规格数据、章节行为、合体时长这些地方，几何引擎相同（都已是参数化模型）。
- `assets/`（28 MB 的 GLB）和 `preview/`（11 MB 参考图）没有复制进来：它们不参与运行，
  需要的话从 `../交互网页设计/` 里取。
- 重建过程与逐文件可信度见 [PROVENANCE.md](PROVENANCE.md)。
