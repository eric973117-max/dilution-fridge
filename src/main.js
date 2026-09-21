/* ==========================================================================
   main · 启动
   顺序：i18n → feed → 拼时间轴 → 舞台 → 版面 → 导演 → 键盘 / URL 参数
   ========================================================================== */

import { STYLE_VERSION } from './version.js';
import { composeTimeline } from './content.js';
import { createStage } from './stage.js';
import { createI18n } from './i18n.js';
import { createFeed } from './feed.js';
import { createUI } from './ui.js';
import { createDirector } from './director.js';

/* ------------------------------------------------------------ 错误可见化 */

const errbox = document.getElementById('errbox');
function showError(msg) {
  errbox.hidden = false;
  errbox.textContent = String(msg).slice(0, 900);
}
window.addEventListener('error', (e) => showError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showError(`Promise: ${e.reason}`));

console.info(`[ui] styles v${STYLE_VERSION}`);

const params = new URLSearchParams(location.search);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const i18n = createI18n(params.get('lang'));
const feed = createFeed({ kind: params.get('feed') || 'static' });

const composed = composeTimeline();
const { timeline, problems } = composed;

/* 每按一次"±2 步"推进的比例（步 = 全站行程的 1/100，所以 2 步 = 2%） */
const STEP = 0.01;

const stage = createStage(document.getElementById('gl'));

if (stage.failed) {
  /* 没有 WebGL（老设备 / 关掉了硬件加速）：退成纯文字版，内容一条不少 */
  document.body.classList.add('no-webgl');
  buildTextMode();
} else {
  boot();
}

function boot() {
  let director = null;

  const ui = createUI({
    timeline,
    i18n,
    onRail: (i) => director?.scrollToChapter(i),
    onStep: (n) => jumpSteps(n),
  });

  director = createDirector({ stage, ui, timeline, feed, i18n, reduced });
  director.start();

  /* ------------------------------------------------------------- 跳转工具 */
  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  function jumpSteps(n) {
    const y = Math.max(0, Math.min(maxY(), window.scrollY + n * STEP * maxY()));
    director.engine.smoothTo(y);
  }
  function scrollByViewport(dir) {
    director.engine.smoothTo(
      Math.max(0, Math.min(maxY(), window.scrollY + dir * window.innerHeight * 0.9)),
    );
  }

  /* ---------------------------------------------------------------- 键盘 */
  const layerFirstIndex = ui.layers.map((l) => l.firstIndex);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t.isContentEditable) return;
    if ((e.key === ' ' || e.key === 'Enter') && t && /^(button|a)$/i.test(t.tagName)) return;
    if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;

    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      const idx = layerFirstIndex[Number(k) - 1];
      if (idx != null) director.scrollToChapter(idx);
    } else if (k === 'Home') {
      director.engine.smoothTo(0);
    } else if (k === 'End') {
      director.engine.smoothTo(maxY());
    } else if (k === 'ArrowDown' || k === 'PageDown' || k === ' ') {
      scrollByViewport(1);
    } else if (k === 'ArrowUp' || k === 'PageUp') {
      scrollByViewport(-1);
    } else {
      return;
    }
    e.preventDefault();
  });

  /* ------------------------------------------------------------ 调试参数 */
  if (params.get('chapter') !== null) {
    const jump = Number(params.get('chapter'));
    if (!Number.isNaN(jump)) setTimeout(() => director.scrollToChapter(jump, true), 80);
  }
  if (params.get('y') !== null) {
    const yJump = Number(params.get('y'));
    if (!Number.isNaN(yJump)) setTimeout(() => window.scrollTo(0, yJump), 80);
  }

  window.__dev = { composed, timeline, director, stage, ui, i18n, feed, problems, STYLE_VERSION };
}

/* -------------------------------------------------- 没有 WebGL 时的文字版 */

function buildTextMode() {
  const main = document.getElementById('scroll');
  document.querySelector('.hud')?.remove();
  document.querySelector('.rail')?.remove();
  document.getElementById('cards')?.remove();
  document.getElementById('stepper')?.remove();
  document.getElementById('progressBar')?.parentElement?.remove();

  timeline.forEach((entry) => {
    const sec = document.createElement('section');
    sec.className = 'docmode__chapter';
    const h = document.createElement('h2');
    h.textContent = `${entry.module.name.zh} · ${i18n.t(entry.chapter.title)}`;
    sec.appendChild(h);
    i18n.tl(entry.chapter.details).forEach((p) => {
      const el = document.createElement('p');
      el.textContent = p;
      sec.appendChild(el);
    });
    main.appendChild(sec);
  });

  if (problems.length) {
    const warn = document.createElement('section');
    warn.className = 'docmode__chapter';
    warn.textContent = `内容告警：${problems.join('；')}`;
    main.appendChild(warn);
  }
}
