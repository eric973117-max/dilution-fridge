/* ==========================================================================
   04 · 稀释制冷机 —— 覆盖层数据（依赖图 / 引线标注 / 冷盘标签）

   图和引线本身是通用能力（src/overlays/），这里只给数据：
     graphSpec     依赖图的节点、连线、图例、标题
     segmentItems  八段引线标注要的字段（编号、强调色、中英名、温区、代表规格、锚点）
     PLATE_TOUR    总览章里"逐个交待"冷盘与腔体的顺序
   节点坐标与连线路径都迁自原项目 src/graph.js，未改一个数。
   ========================================================================== */

import { SEGMENTS } from './model/data.js';

/* 图压成 720×430 的一块，站在画面左边；机体由机位（tx = −1.10）让到另一边 */
const NODE_BOX = [
  { id: '01', x: 20, y: 20, w: 660, h: 64, note: { zh: '支撑全部八段', en: 'SUPPORTS ALL' }, note2: 'G10 RODS · 6 PLATES' },
  { id: '03', x: 20, y: 100, w: 660, h: 64, note: { zh: '保护全部八段', en: 'SHIELDS ALL' }, note2: 'OVC + 50 K / 4 K SHIELDS' },
  { id: '02', x: 20, y: 210, w: 170, h: 64 },
  { id: '04', x: 215, y: 210, w: 170, h: 64, core: true },
  { id: '08', x: 410, y: 210, w: 270, h: 64 },
  { id: '05', x: 20, y: 330, w: 190, h: 64 },
  { id: '06', x: 235, y: 330, w: 190, h: 64 },
  { id: '07', x: 450, y: 330, w: 230, h: 64 },
];

const EDGE_PATH = [
  { d: 'M105,84 V210', type: 'support' },
  { d: 'M300,84 V210', type: 'support' },
  { d: 'M545,84 V210', type: 'support' },
  { d: 'M680,84 H700 V362 H680', type: 'support' },

  { d: 'M60,210 V164', type: 'cooling', arrow: true },
  { d: 'M190,242 H215', type: 'cooling', arrow: true },
  { d: 'M385,242 H410', type: 'cooling', arrow: true },

  { d: 'M210,362 H235', type: 'signal', arrow: true },
  { d: 'M425,362 H450', type: 'signal', arrow: true },
  { d: 'M565,330 V274', type: 'signal', arrow: true },

  { d: 'M620,164 V210', type: 'shield', arrow: true },
];

const byId = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));

export const graphSpec = {
  ariaLabel: '八段功能依赖图 · dependency graph of the eight sections',
  nodes: NODE_BOX.map((n) => ({
    ...n,
    en: byId[n.id].en,
    zh: byId[n.id].zh,
  })),
  edges: EDGE_PATH,
  legend: {
    support: { zh: '承载', en: 'SUPPORT' },
    cooling: { zh: '供冷', en: 'COOLING' },
    signal: { zh: '供信号', en: 'SIGNAL' },
    shield: { zh: '屏蔽', en: 'SHIELD' },
  },
  caption: {
    en: 'SEVEN DEPENDENCIES CONVERGE ON SEG 08',
    zh: '八段合体之前，先看清它们的关系',
  },
};

/* 引线标注：编号 / 强调色 / 中英名 / 温区 / 代表规格 / 锚点（局部坐标，跟着零件走）。
   03 与 06 在几何里没有独立零件（那两件默认隐藏 / XLD 里没有单独的超导组件），
   给一个兜底锚点点在机体中轴上，等以后补上零件会自动改用真实零件。 */
export const segmentItems = SEGMENTS.map((s) => ({
  id: s.id,
  accent: s.accent,
  en: s.en,
  zh: s.zh,
  temp: s.temp,
  spec: s.specs?.[0] ? `${s.specs[0][0]} ${s.specs[0][1]}` : '',
  anchor: s.anchor,
  fallback: { '03': [0, 330, 0], '06': [0, -170, 0] }[s.id] || null,
}));

/* 总览章里逐个交待的对象顺序（6 块冷盘 + 2 个腔体，迁自原 data.js 的 PLATE_TOUR） */
export const plateTourOrder = ['room', '50k', '4k', 'still', 'cold', 'mc', 'mxcvessel', 'vacuum'];
