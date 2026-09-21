/* 01 · 云端与编排 —— 行为层
   P0 用的是占位构件（一排机柜）。以后换正式模型，只改这个文件的 build()。 */

import content from './content.js';

let group = null;
let b = null;

export default {
  ...content,
  build(ctx) {
    group = ctx.scaffold.rackRow({ color: content.accent, n: 5 });
    b = ctx.scaffold.mount(ctx, group, { margin: 0.32 });
  },
  bounds: () => b,
  setActive(on) { if (group) group.visible = on; },
};
