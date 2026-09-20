/* ==========================================================================
   标注引线 · 卡片 → 三维锚点
   锚点定义在构件所在分组的局部坐标里，每帧用该分组的当前矩阵变换到世界，
   所以零件被拉出、旋转、缩放时，引线始终钉在同一个位置上。
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';
import { animate } from '../vendor/anime.esm.js';
import { SEGMENTS } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const STUB = 28;          // 卡片边缘的水平引出段
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createLeaders(host) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'leaders');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);

  const items = new Map();

  SEGMENTS.forEach((s) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'leader');
    g.dataset.id = s.id;
    g.style.setProperty('--seg', s.accent || '#2e6bff');

    const line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'leader__line');

    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'leader__ring');
    ring.setAttribute('r', '7.5');

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'leader__dot');
    dot.setAttribute('r', '0');

    /* 锚点旁边的小标签牌（参考图里贴在构件上的那种蓝色标签） */
    const tagBg = document.createElementNS(NS, 'polygon');
    tagBg.setAttribute('class', 'leader__tag-bg');
    const tagTx = document.createElementNS(NS, 'text');
    tagTx.setAttribute('class', 'leader__tag-tx');
    tagTx.textContent = `SEG ${s.id}`;
    /* 强调色很亮时（比如 01 段是纯白）标签文字必须反过来用深色，否则白底白字看不见 */
    const ac = new THREE.Color(s.accent || '#2e6bff');
    const lum = 0.2126 * ac.r + 0.7152 * ac.g + 0.0722 * ac.b;
    /* 必须写 inline style：SVG 表现属性优先级低于样式表里的 fill 规则 */
    tagTx.style.fill = lum > 0.62 ? '#141a2c' : '#ffffff';

    g.append(line, ring, dot, tagBg, tagTx);
    svg.appendChild(g);
    items.set(s.id, {
      g, line, ring, dot, tagBg, tagTx, drawn: false,
      local: new THREE.Vector3(...(s.anchor || [0, 0, 0])),
    });
  });

  let activeId = null;
  let drawTimer = null;

  /* ---------------------------------------------------------------------
     全局标注（outro 章）：不拿表格压住模型，改成 8 条引线同时挂在两侧 ——
     每段一块说明牌（段号 / 英文名 / 中文名 / 温区 · 关键参数），
     引线连到该段里体积最大的那个零件的包围盒中心。左右哪一侧由锚点在
     屏幕上的位置决定，同侧按屏幕高度排开，避免引线互相穿插。
     --------------------------------------------------------------------- */
  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  };

  const annots = new Map();
  SEGMENTS.forEach((s) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'annot');
    g.dataset.id = s.id;
    g.style.setProperty('--seg', s.accent || '#2e6bff');

    const line = svgEl('path', { class: 'annot__line' });
    const ring = svgEl('circle', { class: 'annot__ring', r: 7 });
    const dot = svgEl('circle', { class: 'annot__dot', r: 2.8 });
    const bg = svgEl('rect', { class: 'annot__bg', rx: 3 });
    const bar = svgEl('rect', { class: 'annot__bar', width: 2 });
    const tSeg = svgEl('text', { class: 'annot__seg' });
    const tEn = svgEl('text', { class: 'annot__en' });
    const tZh = svgEl('text', { class: 'annot__zh' });
    const tSpec = svgEl('text', { class: 'annot__spec' });
    tSeg.textContent = `SEG ${s.id}`;
    tEn.textContent = s.en;
    tZh.textContent = s.zh;
    tSpec.textContent = `${s.temp} · ${s.specs[0][0]} ${s.specs[0][1]}`;

    g.append(line, ring, dot, bg, bar, tSeg, tEn, tZh, tSpec);
    svg.appendChild(g);
    annots.set(s.id, { g, line, ring, dot, bg, bar, tSeg, tEn, tZh, tSpec, sx: 0, sy: 0 });
  });

  const anchorCache = new Map();
  let annotated = false;

  /* 03（真空与辐射屏蔽）、06（超导传输）现在没有挂到几何（那三件默认隐藏 /
     XLD 里没有独立超导组件），这两块牌子先钉在机体对应高度的中心轴上，
     等段的映射补上零件就会自动改成真实零件。坐标是根节点局部空间的 mm。 */
  const FALLBACK_ANCHOR = { '03': [0, 330, 0], '06': [0, -170, 0] };

  /** 每段挑一个代表零件当锚点：可见几何里包围盒体积最大的那个。
      锚点存成「零件局部坐标里的一个点」，每帧跟着零件走 —— 合体章零件在动，
      引线要一直钉在同一个零件上。 */
  function pickAnchors(machine) {
    anchorCache.clear();
    machine.segments.forEach((s, id) => {
      let best = null;
      let bestVol = -1;
      s.group.children.forEach((c) => {
        if (c.visible === false) return;
        const box = new THREE.Box3();
        c.traverseVisible((o) => { if (o.isMesh) box.expandByObject(o); });
        if (box.isEmpty()) return;
        const size = box.getSize(new THREE.Vector3());
        const vol = size.x * size.y * size.z;
        if (vol > bestVol) { bestVol = vol; best = { obj: c, center: box.getCenter(new THREE.Vector3()) }; }
      });
      if (!best) {
        const fb = FALLBACK_ANCHOR[id];
        if (fb) anchorCache.set(id, { obj: machine.root, offset: new THREE.Vector3(...fb) });
        return;
      }
      const offset = best.obj.worldToLocal(best.center.clone());
      anchorCache.set(id, { obj: best.obj, offset });
    });
  }

  function setAnnotated(on, machine) {
    const next = Boolean(on);
    if (next === annotated) return;
    annotated = next;
    /* 出现时按 SEG 01 → 08 的顺序一条条来（160ms 一条）；
       收起时不给延迟，一起退场。 */
    annots.forEach((it, id) => {
      const i = Math.max(0, Number(id) - 1);
      it.g.style.transitionDelay = annotated ? `${i * 160}ms` : '0ms';
      it.g.classList.toggle('is-on', annotated);
    });
    if (annotated && machine) pickAnchors(machine);
  }

  const ANNOT_W = 268;
  const ANNOT_H = 74;
  const ANNOT_TOP = 196;      // 让开右上角那排 HUD 和「跳过动画」按钮
  const ANNOT_BOTTOM = 88;

  function layoutAnnot(it, x, y, right) {
    const w = ANNOT_W;
    const tx = right ? x + 14 : x + w - 14;
    const anchor = right ? 'start' : 'end';
    it.bg.setAttribute('x', x);
    it.bg.setAttribute('y', y);
    it.bg.setAttribute('width', w);
    it.bg.setAttribute('height', ANNOT_H);
    it.bar.setAttribute('x', right ? x : x + w - 2);
    it.bar.setAttribute('y', y);
    it.bar.setAttribute('height', ANNOT_H);
    [it.tSeg, it.tEn, it.tZh, it.tSpec].forEach((t) => {
      t.setAttribute('x', tx);
      t.setAttribute('text-anchor', anchor);
    });
    it.tSeg.setAttribute('y', y + 17);
    it.tEn.setAttribute('y', y + 37);
    it.tZh.setAttribute('y', y + 57);
    it.tSpec.setAttribute('y', y + 71);

    /* 引线：牌子靠中心那一侧的中点 → 短横段 → 3D 锚点 */
    const cx = right ? x : x + w;
    const cy = y + ANNOT_H / 2;
    const sx = cx + (right ? -STUB : STUB);
    it.line.setAttribute('d',
      `M${cx.toFixed(1)},${cy.toFixed(1)} H${sx.toFixed(1)} L${it.sx.toFixed(1)},${it.sy.toFixed(1)}`);
    it.ring.setAttribute('cx', it.sx.toFixed(1));
    it.ring.setAttribute('cy', it.sy.toFixed(1));
    it.dot.setAttribute('cx', it.sx.toFixed(1));
    it.dot.setAttribute('cy', it.sy.toFixed(1));
  }

  function updateAnnotated(camera) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const colX = Math.min(392, W * 0.30);
    const live = [];
    annots.forEach((it, id) => {
      const a = anchorCache.get(id);
      if (!a) { it.g.classList.remove('is-on'); return; }
      a.obj.updateWorldMatrix(true, false);
      const v = a.offset.clone();
      a.obj.localToWorld(v);
      v.project(camera);
      it.sx = (v.x * 0.5 + 0.5) * W;
      it.sy = (-v.y * 0.5 + 0.5) * H;
      live.push(it);
    });
    /* 按锚点的屏幕横坐标一分为二：左半边挂左边、右半边挂右边 ——
       两侧张数固定，不会一边 5 条一边 1 条，引线也最少交叉。 */
    live.sort((a, b) => a.sx - b.sx);
    const cols = { left: live.slice(0, Math.ceil(live.length / 2)), right: live.slice(Math.ceil(live.length / 2)) };
    ['left', 'right'].forEach((side) => {
      const list = cols[side].sort((a, b) => a.sy - b.sy);
      const span = Math.max(1, H - ANNOT_TOP - ANNOT_BOTTOM - ANNOT_H);
      list.forEach((it, i) => {
        const y = ANNOT_TOP + (list.length === 1 ? span * 0.5 : (i * span) / (list.length - 1));
        const right = side === 'right';
        layoutAnnot(it, right ? W - colX : colX - ANNOT_W, y, right);
      });
    });
  }

  function setActive(id) {
    if (id === activeId) return;
    const prev = activeId ? items.get(activeId) : null;
    if (prev) {
      prev.g.classList.remove('is-on');
      prev.drawn = false;
    }
    activeId = id;
    clearTimeout(drawTimer);
    if (!id) return;
    const it = items.get(id);
    if (!it) return;
    it.g.classList.add('is-on');
    /* 等卡片进入之后再画线，形成"先出现标注、再引出线"的顺序 */
    drawTimer = setTimeout(() => drawIn(it), prefersReduced ? 0 : 260);
  }

  function drawIn(it) {
    if (it.drawn) return;
    it.drawn = true;
    const len = it.line.getTotalLength ? it.line.getTotalLength() : 400;
    it.line.style.transition = 'none';
    it.line.style.strokeDasharray = `${len}`;
    it.line.style.strokeDashoffset = `${len}`;
    void it.line.getBoundingClientRect();
    it.line.style.transition = 'stroke-dashoffset .78s cubic-bezier(.22,.61,.36,1)';
    it.line.style.strokeDashoffset = '0';
    setTimeout(() => {
      it.line.style.transition = 'none';
      it.line.style.strokeDasharray = 'none';
      it.ring.style.transition = 'none';
      it.ring.style.strokeDasharray = 'none';
    }, 820);

    if (!prefersReduced) animate(it.dot, { r: [0, 3.4], duration: 420, delay: 520, ease: 'outBack(2)' });
    else it.dot.setAttribute('r', '3.4');
    animate(it.ring, { opacity: [0, 1], duration: 420, delay: 480, ease: 'outExpo' });
  }

  const v = new THREE.Vector3();

  /** 每帧更新：投影锚点、重算折线 */
  function update(camera, machine, cardEl) {
    if (annotated) { updateAnnotated(camera); return; }
    if (!activeId || !cardEl) return;
    const it = items.get(activeId);
    const seg = machine.segments.get(activeId);
    if (!it || !seg) return;

    /* 锚点绑在具体构件上：零件展开、翻转、缩放时引线始终跟着它 */
    if (seg.anchorPart) {
      v.copy(seg.anchorPart.offset);
      seg.anchorPart.obj.localToWorld(v);
    } else {
      v.copy(it.local);
      seg.group.localToWorld(v);
    }
    v.project(camera);
    const ax = (v.x * 0.5 + 0.5) * window.innerWidth;
    const ay = (-v.y * 0.5 + 0.5) * window.innerHeight;

    const r = cardEl.getBoundingClientRect();
    const onRight = cardEl.dataset.side === 'right';
    const cx = onRight ? r.left : r.right;
    const cy = r.top + Math.min(r.height * 0.34, 120);
    const sx = cx + (onRight ? -STUB : STUB);

    it.line.setAttribute('d', `M${cx.toFixed(1)},${cy.toFixed(1)} H${sx.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`);
    it.ring.setAttribute('cx', ax.toFixed(1));
    it.ring.setAttribute('cy', ay.toFixed(1));
    it.dot.setAttribute('cx', ax.toFixed(1));
    it.dot.setAttribute('cy', ay.toFixed(1));

    /* 标签牌放在卡片的另一侧，贴着锚点 */
    const tw = 64;
    const th = 17;
    const tx0 = onRight ? ax - 24 - tw : ax + 24;
    const ty0 = ay - th - 7;
    it.tagBg.setAttribute('points',
      `${(tx0 + 6).toFixed(1)},${ty0.toFixed(1)} ${(tx0 + tw + 6).toFixed(1)},${ty0.toFixed(1)} `
      + `${(tx0 + tw).toFixed(1)},${(ty0 + th).toFixed(1)} ${tx0.toFixed(1)},${(ty0 + th).toFixed(1)}`);
    it.tagTx.setAttribute('x', (tx0 + tw / 2 + 3).toFixed(1));
    it.tagTx.setAttribute('y', (ty0 + 12).toFixed(1));
  }

  return { svg, setActive, update, setAnnotated };
}
