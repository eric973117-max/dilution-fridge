/* ==========================================================================
   content · 把各层模块拼成一条时间轴

   注册表 content/_registry.js 由 tools/gen.mjs 生成（加模块 = 加目录），
   这里只做三件事：按 id 排序、算出每章在"全站"和"本层"里各占多少进度、查重复 key。
   ========================================================================== */

import { MODULES } from '../content/_registry.js';

export function composeTimeline(modules = MODULES) {
  const list = [...modules].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const timeline = [];
  const problems = [];
  const seenKeys = new Set();

  const totalVh = list.reduce(
    (sum, m) => sum + (m.chapters || []).reduce((s, c) => s + (c.vh || 0), 0),
    0,
  );

  let accVh = 0;
  const wraps = list.map((module) => {
    const chapters = module.chapters || [];
    if (!chapters.length) problems.push(`层 ${module.id}（${module.key}）没有任何章节`);

    const moduleVh = chapters.reduce((s, c) => s + (c.vh || 0), 0);
    let accLocal = 0;
    const entries = chapters.map((chapter) => {
      if (seenKeys.has(chapter.key)) problems.push(`章节 key 重复：${chapter.key}`);
      seenKeys.add(chapter.key);

      const u0 = accVh / totalVh;
      accVh += chapter.vh || 0;
      const u1 = accVh / totalVh;

      /* 本层内部的 0–1 进度：模块自己的编排（分离窗口、套罩进度…）用它 */
      chapter.u0 = moduleVh ? accLocal / moduleVh : 0;
      accLocal += chapter.vh || 0;
      chapter.u1 = moduleVh ? accLocal / moduleVh : 1;

      const entry = { module, chapter, key: chapter.key, vh: chapter.vh || 0, u0, u1 };
      timeline.push(entry);
      return entry;
    });

    return { module, chapters: entries, totalVh: moduleVh };
  });

  if (problems.length) console.warn('[content] 时间轴有问题：\n  ' + problems.join('\n  '));

  return { timeline, wraps, modules: list, totalVh, problems };
}
