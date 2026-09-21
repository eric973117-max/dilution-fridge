/* ==========================================================================
   yield · 把主线程让出去一次（构建分块用）

   为什么不是一个简单的 `await requestAnimationFrame`：分块构建是**必须**跑完的，
   而 rAF 在后台标签页里会被节流甚至完全暂停 —— 用户把标签页切到后台，
   机器就一直建不完。但 `setTimeout` 在后台同样被节流（能到 1 秒一次），
   14 个分块就白等十几秒。

   所以按可见性选：
     · 页面可见 → 等下一帧（和绘制对齐，浏览器能插空画一帧、响应输入）；
     · 页面隐藏 → 用 MessageChannel 让出（宏任务，不受后台节流影响）。
   两种都额外挂一个定时器兜底，保证一定有 resolve。
   ========================================================================== */

const chan = new MessageChannel();
let pending = null;
chan.port1.onmessage = () => { const fire = pending; pending = null; fire?.(); };

export function yieldToBrowser() {
  return new Promise((resolve) => {
    let done = false;
    const fire = () => { if (done) return; done = true; resolve(); };
    if (document.hidden) {
      pending = fire;
      chan.port2.postMessage(0);
    } else {
      requestAnimationFrame(fire);
      setTimeout(fire, 80);
    }
  });
}
