/* ==========================================================================
   stats · 现场诊断（网址加 `?stats=1` 打开）

   "客户说卡"这种反馈，没有数字就只能猜。这个小角标把最要紧的四个数
   显示在左下角：实测帧时间 / 帧率、当前画质档、渲染倍率、每帧三角形。
   让客户截一张图，就能判断是分辨率问题、几何问题，还是单纯机器老。
   默认不开，不影响任何正常观感。
   ========================================================================== */

export function createStats(stage) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position:fixed', 'left:10px', 'bottom:10px', 'z-index:99',
    'padding:6px 9px', 'border-radius:6px',
    'background:rgba(0,0,0,.62)', 'color:#e9edf5',
    'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
    'letter-spacing:.02em', 'pointer-events:none', 'white-space:pre',
  ].join(';');
  document.body.appendChild(el);

  let acc = [];
  let lastPaint = performance.now();

  function tick(dtSec) {
    if (dtSec > 0 && dtSec < 1.2) acc.push(dtSec * 1000);
    const now = performance.now();
    if (now - lastPaint < 400 || acc.length < 5) return;
    const a = [...acc].sort((x, y) => x - y);
    const med = a[a.length >> 1];
    acc = [];
    lastPaint = now;
    const info = stage.renderer.info;
    el.textContent = [
      `${med.toFixed(1)} ms/帧   ${(1000 / med).toFixed(0)} fps`,
      `画质 ${document.documentElement.dataset.quality || '?'}   dpr ${stage.renderer.getPixelRatio()}`,
      `三角 ${info.render.triangles.toLocaleString('en-US')}   draw ${info.render.calls}`,
    ].join('\n');
  }

  return { tick, el };
}
