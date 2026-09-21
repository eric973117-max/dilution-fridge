/* ==========================================================================
   i18n · 中英双语
   内容里的每一段面向用户的文字都是 { zh, en } 对象（见 content/_contract.md），
   这里只负责"现在显示哪一种"和"切换时通知谁"。
   ========================================================================== */

const STORE_KEY = 'qchain.lang';
const LANGS = ['zh', 'en'];

export const LANG_LABEL = { zh: '中文', en: 'EN' };

export function createI18n(forced = null) {
  let lang = forced;
  if (!LANGS.includes(lang)) {
    try { lang = localStorage.getItem(STORE_KEY); } catch (e) { lang = null; }
  }
  if (!LANGS.includes(lang)) {
    lang = String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  const subs = new Set();
  const apply = () => { document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'; };
  apply();

  /** 取一段文字：{zh,en} → 当前语言（缺哪边就退回另一边） */
  function t(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v.zh || v.en || '';
  }

  /** 取一段"多段文字"：{zh:[...],en:[...]} → 当前语言的数组 */
  function tl(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v;
    const pick = v[lang] && v[lang].length ? v[lang] : (v.zh && v.zh.length ? v.zh : (v.en || []));
    return Array.isArray(pick) ? pick : [pick];
  }

  const api = {
    get current() { return lang; },
    get other() { return lang === 'zh' ? 'en' : 'zh'; },
    t, tl,
    toggle() { api.set(lang === 'zh' ? 'en' : 'zh'); },
    set(next) {
      if (!LANGS.includes(next) || next === lang) return;
      lang = next;
      try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* 隐私模式下忽略 */ }
      apply();
      subs.forEach((fn) => fn(lang));
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
  return api;
}
