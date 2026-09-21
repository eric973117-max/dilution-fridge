/* ==========================================================================
   fx · 一点点文字动效（别多用）
   扰码入场：把一段文字先打乱再逐字落定，HUD 换层时用一下。
   ========================================================================== */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—';
const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrambleIn(el, text, { duration = 620, delay = 0 } = {}) {
  if (!el) return null;
  if (REDUCED) { el.textContent = text; return null; }
  const start = performance.now() + delay;
  let raf = 0;
  const step = (now) => {
    const t = Math.max(0, Math.min(1, (now - start) / duration));
    const settled = Math.floor(t * text.length);
    let out = text.slice(0, settled);
    for (let i = settled; i < text.length; i++) {
      out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (t < 1) raf = requestAnimationFrame(step);
    else el.textContent = text;
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function splitIn(el, { delay = 0, gap = 26, duration = 620 } = {}) {
  if (!el) return;
  if (REDUCED) return;
  const text = el.textContent || '';
  el.textContent = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    span.style.transform = 'translateY(.4em)';
    span.style.transition = `opacity ${duration}ms ease ${delay + i * gap}ms, transform ${duration}ms ease ${delay + i * gap}ms`;
    el.appendChild(span);
    requestAnimationFrame(() => {
      span.style.opacity = '1';
      span.style.transform = 'translateY(0)';
    });
  });
}
