/* ==========================================================================
   DOM 层 · 规格面板 / 功能段导航轨 / 标注卡 / 场景覆层 / 比例人形
   ========================================================================== */

import { SPECS, BOOT, SEGMENTS, SIGNAL_NODES, SHIELD_LAYERS } from './data.js';

export function buildUI({ onRailClick }) {
  /* ------------------------------------------------------------ 规格面板 */
  const specPanel = document.getElementById('specPanel');
  specPanel.innerHTML = [
    `<div class="spec__title">${SPECS.title}</div>`,
    ...SPECS.rows.map(([k, v]) => `<div class="spec__row"><span>${k}</span><b>${v}</b></div>`),
  ].join('');

  /* -------------------------------------------------------------- 引导行 */
  const bootLines = document.getElementById('bootLines');
  bootLines.innerHTML = BOOT.map(([k, v]) => `
    <div class="boot__line">
      <span class="boot__lead">${k}</span>
      <span class="boot__dots"></span>
      <span class="boot__val">${v}</span>
    </div>`).join('');

  /* -------------------------------------------------------------- 导航轨 */
  const rail = document.getElementById('rail');
  rail.innerHTML = SEGMENTS.map((s) => `
    <button class="rail__item${s.core ? ' is-core' : ''}" type="button" data-id="${s.id}" style="--seg:${s.accent || '#2e6bff'}">
      <i>${s.id}</i>
      <span class="rail__item-name">${s.short || s.en}</span>
      <em>${s.temp}</em>
    </button>`).join('');
  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('.rail__item');
    if (btn) onRailClick?.(btn.dataset.id);
  });

  /* -------------------------------------------------------------- 标注卡 */
  const cardsHost = document.getElementById('cards');
  cardsHost.innerHTML = SEGMENTS.map((s) => {
    const on = lightAccent(s.accent) ? '#141a2c' : '#ffffff';
    return `
    <article class="card${s.hero ? ' card--hero' : ''}" id="card-${s.id}" data-side="${s.side}" data-pos="${s.pos}" style="--seg:${s.accent || '#2e6bff'};--on-seg:${on}">
      <button class="card__handle" type="button" aria-label="展开 / 收起本段说明">
        <i></i>
        <span class="card__handle-hint hint-open">上滑展开</span>
        <span class="card__handle-hint hint-close">下滑收起</span>
      </button>
      <div class="card__head anim">
        <span class="flag"><span>SEG ${s.id}</span></span>
        <span class="card__temp">${s.temp}</span>
      </div>
      <div class="card__en anim">${s.en}</div>
      <div class="card__zh anim">${s.zh}</div>
      <p class="card__role anim">${s.role}</p>
      <p class="card__why anim"><b>缺失后果 · </b>${s.why}</p>
      <div class="kv anim">
        ${s.specs.map(([k, v]) => `<div class="kv__row"><span>${k}</span><b>${v}</b></div>`).join('')}
      </div>
      <pre class="snippet anim">${s.snippet.map((l) => `  ${highlight(l)}`).join('\n')}</pre>
    </article>`;
  }).join('');

  function lightAccent(hex) {
    const c = (hex || '').replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62;
  }

  const cards = new Map(SEGMENTS.map((s) => [s.id, document.getElementById(`card-${s.id}`)]));

  /* 手机端：抽屉的开合有三种触发 —— 点把手、点标题行、整块上滑 / 下滑。
     （桌面端没有把手/手势，这些监听不会命中。） */
  let swipeStart = null;
  let swiped = false;                    // 刚刚发生过滑动 → 抑制紧随其后的 click

  cardsHost.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (!e.target.closest('.card__handle') && !e.target.closest('.card__head')) return;
    e.target.closest('.card')?.classList.toggle('is-open');
  });

  /* 用 pointer 事件：触屏是手指滑动，桌面上鼠标拖拽同样能开合，方便预览 */
  cardsHost.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.card');
    if (!card) { swipeStart = null; return; }
    const top = card.getBoundingClientRect().top;
    swipeStart = { card, y: e.clientY, inTop: e.clientY - top < 110, scrollTop: card.scrollTop };
  });

  cardsHost.addEventListener('pointerup', (e) => {
    if (!swipeStart) return;
    const { card, y, inTop, scrollTop } = swipeStart;
    const dy = e.clientY - y;
    swipeStart = null;
    /* 在卡片上部往上拖 → 展开；已经滚到顶时往下拖 → 收起 */
    if (dy < -36 && inTop) { card.classList.add('is-open'); swiped = true; }
    else if (dy > 36 && scrollTop <= 1) { card.classList.remove('is-open'); swiped = true; }
  });

  cardsHost.addEventListener('pointercancel', () => { swipeStart = null; });

  /* ---------------------------------------------------------- 信号节点 */
  const signalNodes = document.getElementById('signalNodes');
  signalNodes.innerHTML = SIGNAL_NODES.map(
    (n) => `<li data-t="${n.t}"><b>${n.label}</b><br>${n.temp}</li>`,
  ).join('');

  /* 手机端"隐藏说明"：只出现在最后两章（套罩 / 总表），点一下把说明块收起来，
     模型随即占满整屏；再点恢复。模型带的计算见 main.js 的 uiBand。 */
  const uiToggle = document.getElementById('uiToggle');
  uiToggle.addEventListener('click', () => {
    const hidden = document.body.classList.toggle('ui-hidden');
    uiToggle.textContent = hidden ? '显示说明' : '隐藏说明';
    uiToggle.setAttribute('aria-pressed', String(hidden));
  });

  /* ---------------------------------------------------------- 屏蔽层节点
     结尾"逐层套罩"：五层罩子按 data.js 的顺序列出来，轮到哪层哪层展开说明。 */
  const shieldNodes = document.getElementById('shieldNodes');
  shieldNodes.innerHTML = SHIELD_LAYERS.map((l, i) => `
    <li data-order="${i}" data-temp="${l.temp}">
      <i>${String(i + 1).padStart(2, '0')}</i>
      <span class="shields-hud__name">${l.name}</span>
      <em>${l.en} · ${l.temp} · ${l.material}</em>
      <p>${l.note}</p>
    </li>`).join('');

  /* ---------------------------------------------------------- 总规格表
     outro 章不再拿整张表压住模型：宽屏下每一行都由 leaders.js 变成两侧的
     引线标注（setAnnotated），这里只留图纸标题 + 整机一句话总述；
     窄屏引线是关掉的（.leaders 在 <=900px 隐藏），表格行保留。 */
  const specTable = document.getElementById('specTable');
  specTable.innerHTML = `
    <div class="table__title">
      <span class="t-assembly">RE-ASSEMBLY · 按依赖顺序合体</span>
      <span class="t-sheet">SEGMENT SPECIFICATION SHEET · DR-001 REV.A</span>
    </div>
    <div class="table__summary">整机 8 个功能段 · 300 K → 10 mK · Ø0.70 m × 1.41 m · 六级平台 / 8 根支撑 / 65 路 RF</div>
    <div class="table__rows">
      <div class="table__row head">
        <span>SEG</span><span>FUNCTION</span><span>中文</span><span>TEMP</span><span>KEY SPEC</span>
      </div>
      ${SEGMENTS.map((s) => `
        <div class="table__row">
          <b>${s.id}</b>
          <b>${s.en}</b>
          <span class="zh">${s.zh}</span>
          <span>${s.temp}</span>
          <span>${s.specs[0][0]} ${s.specs[0][1]}</span>
        </div>`).join('')}
    </div>`;

  return { specPanel, bootLines, rail, cards, signalNodes, shieldNodes, specTable };
}

function highlight(line) {
  return line
    .replace(/("[^"]+")/, '<b>$1</b>')
    .replace(/(true)/, '<b>$1</b>');
}

/* ----------------------------------------------------------- 场景可见性 */

export function applyScene(ui, scene, activeSegId) {
  const isBoot = scene.key === 'boot';
  const isGraph = scene.key === 'deps';
  const isSignal = scene.key === 'signal';
  const isXray = scene.key === 'xray';
  const isShields = scene.key === 'shields';
  /* 合体章、定格章、总表章用「两侧引线标注」代替压在场上的面板：
     模型留在画面中间，8 个功能段的说明挂在两边（见 leaders.js）。 */
  const isAnnot = ['assembly', 'hold', 'outro'].includes(scene.key);
  /* 套罩章把两边都让出来：不挂 8 段索引标注，也不出导航轨 —— 版面只留给层列表 */
  const showRail = !isBoot && !isAnnot && !isGraph && !isShields;

  toggle(ui.specPanel, !isBoot && !isAnnot);
  toggle(document.getElementById('overlayBoot'), isBoot);
  toggle(document.getElementById('overlayGraph'), isGraph);
  const overlayTable = document.getElementById('overlayTable');
  overlayTable.dataset.mode = scene.key;
  toggle(overlayTable, isAnnot);
  toggle(document.getElementById('overlaySignal'), isSignal);
  toggle(document.getElementById('overlayXray'), isXray);
  toggle(document.getElementById('overlayShields'), isShields);

  /* 最后两章（套罩 / 总表）才给"隐藏说明"这颗按钮；离开这两章自动复位 */
  const canHide = isShields || scene.key === 'outro';
  document.getElementById('uiToggle')?.classList.toggle('is-on', canHide);
  if (!canHide) document.body.classList.remove('ui-hidden');
  toggle(ui.rail, showRail);
  ui.rail.querySelectorAll('.rail__item').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.id === activeSegId);
  });
}

export function toggle(el, on) {
  if (!el) return;
  el.classList.toggle('is-on', !!on);
}
