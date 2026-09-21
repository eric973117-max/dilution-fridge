/* 07 · 校准与纠错 —— 行为层（P0 占位构件：脉冲序列波形） */

import content from './content.js';

let group = null;
let b = null;

export default {
  ...content,
  build(ctx) {
    group = ctx.scaffold.pulseTrain({ color: content.accent, n: 7 });
    b = ctx.scaffold.mount(ctx, group, { margin: 0.26 });
  },
  bounds: () => b,
  setActive(on) { if (group) group.visible = on; },
};
