/* ==========================================================================
   冷盘标签 · 前面各章在"合适的位置"标出：这是哪块盘、多冷、管什么

   和 leaders.js 的引线同一套做法：锚点不写死在世界坐标里，而是挂在最近的
   那个零件上（machine.plates 里给的 part + offset），所以段分离、展开、
   翻面的时候标签始终跟着那块盘走，不会飘到空处。
   ========================================================================== */

export function createPlateLabels(host) {
  const nodes = new Map();   // id -> { el, plate }
  let active = [];
  let side = 'right';        // 文字往哪一侧展开（默认钉在盘边、文字向右）
  let focus = null;          // 当前正在讲的那一块（展开说明，其余只留名字）

  function mount(plate) {
    let rec = nodes.get(plate.id);
    if (!rec) {
      const el = document.createElement('div');
      el.className = 'plate-label';
      el.innerHTML = `
        <i class="plate-label__dot"></i>
        <div class="plate-label__body">
          <b class="plate-label__name">${plate.name}</b>
          <em class="plate-label__meta">${plate.en} · ${plate.temp}</em>
          <span class="plate-label__note">${plate.note}</span>
        </div>`;
      host.appendChild(el);
      rec = { el, plate };
      nodes.set(plate.id, rec);
    }
    return rec;
  }

  /* 一次最多显示三块：再多就压住机器了 */
  function setActive(ids, nextSide, focusId) {
    active = (ids || []).slice(0, 8);
    if (nextSide === 'left' || nextSide === 'right') side = nextSide;
    focus = focusId ?? null;
  }

  function update(camera, plates, chambers = []) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    /* 手机端：一次只讲一块 —— 3D 锚点挤在竖屏上没法读，
       改成固定在左上角下方的一行位置，其余先不显示。 */
    const mobile = w <= 900;
    const list = [];
    [...plates, ...chambers].forEach((plate) => {
      const rec = mount(plate);
      const on = active.includes(plate.id) && (!!plate.part || !!plate.posWorld)
        && (!mobile || focus === plate.id);
      rec.el.classList.toggle('is-on', on);
      rec.el.classList.toggle('is-focus', on && focus === plate.id);
      rec.el.classList.toggle('is-min', on && focus && focus !== plate.id);
      if (!on) return;
      rec.el.classList.toggle('is-left', side === 'left');

      const world = plate.posWorld ? plate.posWorld.clone() : plate.part.obj.localToWorld(plate.offset.clone());
      const p = world.project(camera);
      if (p.z > 1) {                       // 跑到相机背后就别画了
        rec.el.style.opacity = '0';
        return;
      }
      rec.el.style.opacity = '';
      list.push({
        el: rec.el,
        x: (p.x * 0.5 + 0.5) * w,
        y: (-p.y * 0.5 + 0.5) * h,
        focused: focus === plate.id,
      });
    });

    if (mobile) {
      list.forEach((it) => {
        it.el.classList.remove('is-left');
        /* 让开左上角的参数面板（三行 ≈ 105px），落在它下面 */
        it.el.style.transform = 'translate(0, -50%) translate(20px, 186px)';
      });
      return;
    }

    /* 竖直避让：名牌钉在盘沿上，几块盘挨得近时展开的面板会压到上一块。
       从上往下按"净空"排一遍，再整体收进视口 —— 标签之间始终留一道缝。 */
    const H_SMALL = 30;                    // 收起态：一行
    const H_FOCUS = 118;                   // 展开态：名字 + 元信息 + 说明
    const box = (it) => ({
      top: it.y - (it.focused ? H_FOCUS : H_SMALL / 2),
      bottom: it.y + (it.focused ? 0 : H_SMALL / 2),
    });
    list.sort((a, b) => a.y - b.y);
    let prevBottom = -Infinity;
    list.forEach((it) => {
      const b = box(it);
      it.y += Math.max(0, prevBottom + 10 - b.top);
      prevBottom = box(it).bottom;
    });
    const last = list[list.length - 1];
    const overflow = last ? box(last).bottom - (h - 24) : 0;
    if (overflow > 0) list.forEach((it) => { it.y -= overflow; });

    list.forEach((it) => {
      const gap = 14;                      // 从盘沿往外让一点，避开伸出来的线束
      const px = it.x + (side === 'left' ? -gap : gap);
      const anchorY = it.focused ? '-100%' : '-50%';   // 展开的那块往上长，底边贴住盘沿
      it.el.style.transform =
        `translate(${side === 'left' ? '-100%' : '0'}, ${anchorY}) translate(${px.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
    });
  }

  return { setActive, update };
}
