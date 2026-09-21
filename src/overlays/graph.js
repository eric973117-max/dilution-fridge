/* ==========================================================================
   依赖图 · 四类关系（承载 / 供冷 / 供信号 / 屏蔽）
   SVG 手绘，连线用 pathLength=1 + dashoffset 由 CSS 逐条描出。

   从「稀释制冷机-下午版」的 src/graph.js 迁移：原来节点与连线写死在那台机器上，
   现在由**模块把 spec 传进来**（见 content/04-fridge/overlays.js），别的层也能用。

   spec = {
     nodes: [{ id, x, y, w, h, en, zh, note?, note2?, core? }],
     edges: [{ d, type: 'support'|'cooling'|'signal'|'shield', arrow? }],
     legend: { support, cooling, signal, shield },   // 四项都是 {zh,en} 或字符串
     caption: { zh, en },
     ariaLabel: string,
   }
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

const rel = (v) => (v && typeof v === 'object' ? (v.zh || '') : String(v || ''));
const relEn = (v) => (v && typeof v === 'object' ? (v.en || '') : String(v || ''));

export function buildGraph(host, spec) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 720 430');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', spec.ariaLabel || 'dependency graph');

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

  const edgeEls = spec.edges.map((e) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', e.d);
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', `edge edge--${e.type}`);
    if (e.arrow) p.setAttribute('marker-end', `url(#arrow-${e.type})`);
    svg.appendChild(p);
    return p;
  });

  const nodeEls = spec.nodes.map((n) => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `node${n.core ? ' node--core' : ''}`);
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', n.x); r.setAttribute('y', n.y);
    r.setAttribute('width', n.w); r.setAttribute('height', n.h);
    g.appendChild(r);
    const en = document.createElementNS(SVG_NS, 'text');
    en.setAttribute('x', n.x + 14);
    en.setAttribute('y', n.y + 26);
    en.textContent = `${n.id}  ${n.en || ''}`;
    g.appendChild(en);
    const zh = document.createElementNS(SVG_NS, 'text');
    zh.setAttribute('x', n.x + 14);
    zh.setAttribute('y', n.y + 46);
    zh.setAttribute('class', 'zh');
    zh.textContent = n.zh || '';
    g.appendChild(zh);
    if (n.note) {
      const note = document.createElementNS(SVG_NS, 'text');
      note.setAttribute('x', n.x + n.w - 16);
      note.setAttribute('y', n.y + 26);
      note.setAttribute('text-anchor', 'end');
      note.setAttribute('class', 'zh');
      note.textContent = rel(n.note);
      g.appendChild(note);
      const note2 = document.createElementNS(SVG_NS, 'text');
      note2.setAttribute('x', n.x + n.w - 16);
      note2.setAttribute('y', n.y + 46);
      note2.setAttribute('text-anchor', 'end');
      note2.setAttribute('class', 'note');
      note2.textContent = n.note2 || '';
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

  if (spec.legend) {
    const legend = document.createElement('div');
    legend.className = 'graph__legend scrim';
    legend.innerHTML = `
      <i class="l-support">${rel(spec.legend.support)} · ${relEn(spec.legend.support)}</i>
      <i class="l-cooling">${rel(spec.legend.cooling)} · ${relEn(spec.legend.cooling)}</i>
      <i class="l-signal">${rel(spec.legend.signal)} · ${relEn(spec.legend.signal)}</i>
      <i class="l-shield">${rel(spec.legend.shield)} · ${relEn(spec.legend.shield)}</i>`;
    host.appendChild(legend);
  }

  const caption = document.createElement('div');
  caption.className = 'graph__caption scrim';
  caption.textContent = spec.caption
    ? `${relEn(spec.caption)} —— ${rel(spec.caption)}`
    : '';
  host.appendChild(caption);

  return { svg, edges: edgeEls, nodes: nodeEls };
}
