/* ==========================================================================
   系统依赖图 · 供冷 / 供信号 / 承载 / 屏蔽 四类关系
   SVG 手绘，连线用 pathLength=1 + dashoffset 由 CSS 逐条描出
   ========================================================================== */

import { SEGMENTS } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const NODES = [
  /* 图不再铺满屏幕中央：压成 720×430 的一块，站在页边，
     机体由机位挪到另一半（main.js 的 camPerScene.deps.tx）——谁也压不着谁 */
  { id: '01', x: 20, y: 20, w: 660, h: 64, note: '支撑全部八段 · SUPPORTS ALL' },
  { id: '03', x: 20, y: 100, w: 660, h: 64, note: '保护全部八段 · SHIELDS ALL' },
  { id: '02', x: 20, y: 210, w: 170, h: 64 },
  { id: '04', x: 215, y: 210, w: 170, h: 64, core: true },
  { id: '08', x: 410, y: 210, w: 270, h: 64 },
  { id: '05', x: 20, y: 330, w: 190, h: 64 },
  { id: '06', x: 235, y: 330, w: 190, h: 64 },
  { id: '07', x: 450, y: 330, w: 230, h: 64 },
];

const EDGES = [
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

export function buildGraph(host) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 720 430');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '八段功能依赖图');

  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <marker id="arrow-cooling" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 z" fill="#2e6bff"></path>
    </marker>
    <marker id="arrow-signal" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 z" fill="#1d3fe0"></path>
    </marker>
    <marker id="arrow-shield" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 z" fill="#2b3a55"></path>
    </marker>`;
  svg.appendChild(defs);

  const edgeEls = EDGES.map((e) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', e.d);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', `edge edge--${e.type}`);
    if (e.arrow) p.setAttribute('marker-end', `url(#arrow-${e.type})`);
    svg.appendChild(p);
    return p;
  });

  const nodeEls = NODES.map((n) => {
    const seg = SEGMENTS.find((s) => s.id === n.id);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `node${n.core ? ' node--core' : ''}`);
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', n.x); r.setAttribute('y', n.y);
    r.setAttribute('width', n.w); r.setAttribute('height', n.h);
    g.appendChild(r);
    const en = document.createElementNS(SVG_NS, 'text');
    en.setAttribute('x', n.x + 14);
    en.setAttribute('y', n.y + 26);
    en.textContent = `${n.id}  ${seg.en}`;
    g.appendChild(en);
    const zh = document.createElementNS(SVG_NS, 'text');
    zh.setAttribute('x', n.x + 14);
    zh.setAttribute('y', n.y + 46);
    zh.setAttribute('class', 'zh');
    zh.textContent = seg.zh;
    g.appendChild(zh);
    if (n.note) {
      const note = document.createElementNS(SVG_NS, 'text');
      note.setAttribute('x', n.x + n.w - 16);
      note.setAttribute('y', n.y + 26);
      note.setAttribute('text-anchor', 'end');
      note.setAttribute('class', 'zh');
      note.textContent = n.note;
      g.appendChild(note);
      const note2 = document.createElementNS(SVG_NS, 'text');
      note2.setAttribute('x', n.x + n.w - 16);
      note2.setAttribute('y', n.y + 46);
      note2.setAttribute('text-anchor', 'end');
      note2.setAttribute('class', 'note');
      note2.textContent = n.id === '01' ? 'G10 RODS · 6 PLATES' : 'OVC + 50 K / 4 K SHIELDS';
      g.appendChild(note2);
    }
    g.dataset.id = n.id;
    g.dataset.x = String(n.x + n.w / 2);
    g.dataset.y = String(n.y);
    svg.appendChild(g);
    return g;
  });

  host.innerHTML = '';
  host.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'graph__legend scrim';
  legend.innerHTML = `
    <i class="l-support">01 承载 SUPPORT</i>
    <i class="l-cooling">供冷 COOLING</i>
    <i class="l-signal">供信号 SIGNAL</i>
    <i class="l-shield">屏蔽 SHIELD</i>`;
  host.appendChild(legend);

  const caption = document.createElement('div');
  caption.className = 'graph__caption scrim';
  caption.textContent = 'SEVEN DEPENDENCIES CONVERGE ON SEG 08 —— 八段合体之前，先看清它们的关系';
  host.appendChild(caption);

  return { svg, edges: edgeEls, nodes: nodeEls };
}
