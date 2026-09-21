/* 03 · 信号链上段 —— 行为层（P0 占位构件：下垂线束） */

import content from './content.js';

let group = null;
let b = null;

export default {
  ...content,
  build(ctx) {
    group = ctx.scaffold.cableLoom({ color: content.accent, n: 11 });
    b = ctx.scaffold.mount(ctx, group, { margin: 0.22 });
  },
  bounds: () => b,
  setActive(on) { if (group) group.visible = on; },
};
