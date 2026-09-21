/* ==========================================================================
   ui · 版面：左上参数条 / 层级轨道 / 章节卡 / 进度

   桌面与手机共用同一套 DOM，差别只在 CSS（≤900px 变成"上模型 / 中轨道 / 下抽屉"）。
   手机端卡片的"滑入 → 停住 → 滑走"由 updateCard() 每帧写内联 transform/opacity，
   与样式表无关，所以不会出现"改了 CSS 卡片堆在一起"那类问题。
   ========================================================================== */

import { LANG_LABEL } from './i18n.js';

export function createUI({ timeline, i18n, onRail, onStep }) {
  const el = {
    hudLayer: document.getElementById('hudLayer'),
    hudTemp: document.getElementById('hudTemp'),
    hudPct: document.getElementById('hudPct'),
    progressBar: document.getElementById('progressBar'),
    rail: document.getElementById('rail'),
    cards: document.getElementById('cards'),
    langBtn: document.getElementById('langBtn'),
    stepBack: document.getElementById('stepBack'),
    stepFwd: document.getElementById('stepFwd'),
  };

  /* --------------------------------------------------------------- 层级轨道 */
  const layers = [];
  timeline.forEach((entry, i) => {
    if (layers.some((l) => l.module === entry.module)) return;
    layers.push({ module: entry.module, firstIndex: i });
  });

  const railItems = new Map();
  layers.forEach(({ module, firstIndex }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail__item';
    btn.style.setProperty('--accent', module.accent || '#ffffff');
    btn.addEventListener('click', () => onRail?.(firstIndex));
    const num = document.createElement('b');
    num.className = 'rail__num';
    num.textContent = module.id;
    const name = document.createElement('span');
    name.className = 'rail__name';
    btn.append(num, name);
    el.rail.appendChild(btn);
    railItems.set(module, btn);
  });

  /* 轨道文字要跟着语言变（名字太长，窄屏只显示当前那一层的名字） */
  function paintRail() {
    railItems.forEach((btn, module) => {
      btn.querySelector('.rail__name').textContent = i18n.t(module.name);
      btn.setAttribute('aria-label', `${module.id} ${i18n.t(module.name)}`);
    });
  }

  /* --------------------------------------------------------------- 章节卡 */
  const cards = new Map();
  timeline.forEach((entry) => {
    const c = entry.chapter;
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.key = c.key;
    card.style.setProperty('--accent', entry.module.accent || '#ffffff');
    card.addEventListener('click', () => card.classList.toggle('is-expanded'));
    el.cards.appendChild(card);
    cards.set(c.key, card);
  });

  let activeKey = null;

  function render(entry) {
    const module = entry.module;
    const c = entry.chapter;
    const card = cards.get(c.key);

    card.innerHTML = '';

    const head = document.createElement('header');
    head.className = 'card__head';
    const label = document.createElement('span');
    label.className = 'card__label';
    label.textContent = c.label || '';
    const title = document.createElement('h2');
    title.className = 'card__title';
    title.textContent = i18n.t(c.title);
    head.append(label, title);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'card__body';
    /* 英文还没补的章节：明确标出来，再把中文原文显示在下面（别让人以为英文就是中文） */
    const hasOwnLang = (c.details?.[i18n.current] || []).length > 0;
    if (!hasOwnLang && (c.details?.zh || []).length && i18n.current === 'en') {
      const note = document.createElement('p');
      note.className = 'card__todo';
      note.textContent = 'English copy pending — Chinese original below.';
      body.appendChild(note);
    }
    i18n.tl(c.details).forEach((p) => {
      const para = document.createElement('p');
      para.textContent = p;
      body.appendChild(para);
    });
    if (!body.childElementCount && c.details && !i18n.tl(c.details).length) {
      const todo = document.createElement('p');
      todo.className = 'card__todo';
      todo.textContent = i18n.current === 'en' ? 'English copy pending.' : '英文文案待补。';
      body.appendChild(todo);
    }
    card.appendChild(body);

    if (c.specs?.length) {
      const table = document.createElement('table');
      table.className = 'card__specs';
      c.specs.forEach(({ k, v }) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = i18n.t(k) || (k?.zh ?? '');
        const td = document.createElement('td');
        td.textContent = v;
        tr.append(th, td);
        table.appendChild(tr);
      });
      card.appendChild(table);
    }

    card.style.setProperty('--accent', module.accent || '#ffffff');
    void label;
  }

  function setChapter(entry) {
    if (entry.chapter.key === activeKey) return;
    activeKey = entry.chapter.key;
    render(entry);

    cards.forEach((card, key) => card.classList.toggle('is-on', key === activeKey));
    railItems.forEach((btn, module) => btn.classList.toggle('is-on', module === entry.module));
    el.hudLayer.textContent = `${i18n.t(entry.module.name)} · ${i18n.t(entry.chapter.title)}`;
    el.hudTemp.textContent = entry.module.temperature || '';
  }

  /* ------------------------------------------------- 手机端卡片节奏（每帧） */
  function updateCard(entry, local, CARD) {
    const active = cards.get(entry.chapter.key);
    cards.forEach((card) => {
      if (card === active) return;
      if (card.style.opacity !== '0') {
        card.style.opacity = '0';
        card.classList.remove('is-on');
      }
    });
    if (!active) return;
    if (!active.classList.contains('is-on')) active.classList.add('is-on');

    const t1 = Math.min(1, Math.max(0, local / CARD.in));
    const t2 = Math.min(1, Math.max(0, (local - CARD.holdEnd) / CARD.out));
    const dy = ((1 - t1) - t2) * CARD.travel * window.innerHeight;
    active.style.transform = `translateY(${dy.toFixed(1)}px)`;
    active.style.opacity = (t1 * (1 - t2)).toFixed(3);
  }

  /* ------------------------------------------------------------- 每帧进度 */
  function tick(st) {
    el.progressBar.style.width = `${(st.progress * 100).toFixed(1)}%`;
    el.hudPct.textContent = String(Math.round(st.progress * 100));
  }

  /* --------------------------------------------------------------- 语言 */
  function paintLang() {
    el.langBtn.textContent = LANG_LABEL[i18n.other];
    paintRail();
    const entry = timeline.find((t) => t.chapter.key === activeKey);
    if (entry) {
      activeKey = null;
      setChapter(entry);
    }
  }
  el.langBtn.addEventListener('click', () => i18n.toggle());
  i18n.subscribe(paintLang);

  el.stepBack.addEventListener('click', () => onStep?.(-2));
  el.stepFwd.addEventListener('click', () => onStep?.(2));

  paintLang();

  return {
    el,
    cards,
    railItems,
    layers,
    setChapter,
    updateCard,
    tick,
    paintLang,
    cardFor: (key) => cards.get(key) || null,
    layersOf: (module) => timeline.filter((t) => t.module === module),
  };
}
