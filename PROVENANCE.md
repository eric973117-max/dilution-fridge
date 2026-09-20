# 这一版是怎么来的

目标：把 **2026-09-18 下午浏览器里正在跑的那一版** 找回来，独立成仓。

## 结论

时间点锁定为 **2026-09-18 12:38:33（Asia/Shanghai）**。
那一刻 Chrome（`http://127.0.0.1:8377/`）加载的资源集合、当晚会话日志里的文件快照、
以及此后所有改动的反向回退，三者互相印证。

## 三条证据链

1. **浏览器缓存**（`~/Library/Caches/Google/Chrome/Default/Cache/Cache_Data`）
   12:38:33 那次加载请求了 57 个资源，其中包含 `src/parts/*`、`src/machine/seg01…08`、
   `src/machine/builders.js`。原因是当时 `src/machine/index.js` 里还有一句没被使用的
   `import { BUILDERS } from './builders.js';` —— 模块图会把这条链整串拉下来。
   重建后的页面同样是 57 个请求，集合完全一致。

2. **会话日志里的文件快照**（`~/.codex/sessions/2026/09/18/rollout-2026-09-18T13-03-33…jsonl`）
   当天 13:05–13:20 的会话开头对若干文件做过完整 `cat`，且这些 dump 都**早于该文件当天第一次被修改**，
   因此就是 12:38 的内容：

   | 文件 | dump 时间 | 该文件当天首次修改 |
   | --- | --- | --- |
   | `src/main.js` | 13:06:04 | 14:25 |
   | `src/machine/index.js` | 13:06:08 | 13:10 |
   | `src/machine/dims.js` | 13:06:08 | 13:15 |
   | `src/data.js` | 13:08:27 | 13:11 |
   | `src/stage.js` | 13:09:00 | 14:38 |
   | `src/leaders.js` | 13:09:04 | 13:21 |
   | `src/atlas/xld.js`、`src/machine/palette.js`、`src/machine/separation.js` | 13:09:28 | — / — / 13:57 |
   | `src/ui.js` | 13:20:26 | 13:21 |
   | `src/graph.js` | 13:45:50 | 13:46 |

3. **反向回放**（12:38 之后共 197 个 `apply_patch`）
   从当晚的工作树倒着把补丁撤掉：这期间新建的文件删掉、改过的文件还原。
   与上一步的快照叠加后，得到这份重建树。

## 逐文件可信度

| 类别 | 文件 | 可信度 |
| --- | --- | --- |
| 有直接快照 | 上表 11 个文件 | 高（就是当时的字节） |
| 12:38 后未被修改 | `index.html` 之外的大部分 `styles/*`、`vendor/*`、`src/parts/*`、`src/machine/seg0*.js`、`src/atlas/*`、`src/docmode.js`、`src/fx.js` 等 | 高（与源仓库当前文件一致） |
| 靠反向回退推出（无快照） | `src/motion.js`、`styles/overlays.css`、`styles/cards.css`、`styles/responsive.css`、`index.html`、`src/plates.js` | 中（例如合体时长已还原为 780/1100 ms、依赖图 dock 样式已撤销；若有细微出入以运行时观感为准） |
| 逐文件明细 | 见重建时生成的 `/tmp/v-afternoon/manifest.json`（原项目 `snapshot/2026-09-18/manifest.json` 是当晚 22:40 版的同类清单） | — |

## 与原项目的关系

- 原项目：`../交互网页设计`（git 分支 `codex/camera-look`）。
  当晚的提交序列是 `937caa1`（22:25）→ `5992bae`（22:43，存盘）→ `c1cd055`（22:49，机位改动），
  这些都不等于 12:38 那一版。
- 未复制：`assets/cryo-atlas-dr01.glb`（28 MB，当前程序不加载它）、`preview/*.png`（11 MB，设计参考图）。
  需要时从原项目拷贝；只有用到 `src/machine/load-glb.js` 时才会需要那个 GLB。
- 抓取/重建用的脚本留在原项目 `snapshot/tools/`（`capture-live.mjs` 等）。

## 和"当晚版"的主要差别（供对照）

- **规格数据**：本版左侧面板是 `Blufors LD450 / 00.60 × 1.77 m / 制冷功率 450 µW / MXC Ø294`；
  当晚版已换成 `XLD · 定制 / 00.70 × 1.54 m / 冷板 6 级 / MXC Ø500`。
- **机位**：本版 `deps` 还带 `tx −0.50` 的世界坐标平移，归位章还是 `el 2°`；当晚版改为屏幕偏移 `sx`、归位/总表回到俯视 `el 14°`。
- **章节行为**：本版合体章与总表章共用同一批标注；当晚版拆成"合体讲装配顺序、总表讲屏蔽层"。
- **节奏**：本版合体动画是 780/1100 ms、错开 110 ms；当晚版拉到 1200/1600 ms、错开 170 ms。
