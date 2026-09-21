/* 05 · 低温信号链 —— 行为层（P0 占位构件：冷板叠层 + 挂在板边的器件） */

import content from './content.js';

let group = null;
let b = null;

export default {
  ...content,
  build(ctx) {
    group = ctx.scaffold.coldLadder({ color: content.accent, n: 6 });
    b = ctx.scaffold.mount(ctx, group, { margin: 0.24 });
  },
  bounds: () => b,
  setActive(on) { if (group) group.visible = on; },
};
