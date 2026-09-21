/* ==========================================================================
   波形显示面板（三维里的"屏幕"）
   一条 BufferGeometry 曲线，每帧按参数重算：脉冲序列 = 高斯包络 × 微波载波。
   参数由页面上的滑杆控制（幅度 / 脉宽 / 重复频率），所以它是"能操控的演示"。
   ========================================================================== */

import * as THREE from '../../../vendor/three.module.js';

export function createWaveform({ w = 0.72, h = 0.26, n = 200 } = {}) {
  const group = new THREE.Group();
  group.name = 'Waveform_panel';

  /* 屏幕底板：半透明，压在机器前面也不挡视线 */
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, .004),
    new THREE.MeshBasicMaterial({ color: 0x0a0c10, transparent: true, opacity: .42 }),
  );
  group.add(plate);

  /* 边框 + 网格 */
  const line = (pts, opacity) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xdfe7f2, transparent: true, opacity }));
  };
  const x0 = -w / 2 + .02; const x1 = w / 2 - .02;
  const y0 = -h / 2 + .02; const y1 = h / 2 - .02;
  group.add(line([
    new THREE.Vector3(x0, y0, .003), new THREE.Vector3(x1, y0, .003),
    new THREE.Vector3(x1, y1, .003), new THREE.Vector3(x0, y1, .003),
    new THREE.Vector3(x0, y0, .003),
  ], .55));
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = y0 + (i / 4) * (y1 - y0);
    grid.push(new THREE.Vector3(x0, y, .003), new THREE.Vector3(x1, y, .003));
  }
  for (let i = 1; i < 8; i++) {
    const x = x0 + (i / 8) * (x1 - x0);
    grid.push(new THREE.Vector3(x, y0, .003), new THREE.Vector3(x, y1, .003));
  }
  group.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(grid),
    new THREE.LineBasicMaterial({ color: 0xdfe7f2, transparent: true, opacity: .13 }),
  ));

  /* 波形曲线 */
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const curve = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
  group.add(curve);

  const inner = { w: x1 - x0, h: y1 - y0, x0, y0, n };

  /* 屏幕能画几种"功能波形"：每台设备用它自己的形状说明它在干什么 ——
       pulse  脉冲序列（AWG / PG）
       sine   连续正弦（参考时钟：时基）
       square 方波（时序 / 触发）
       ramp   阶梯（直流偏置扫点）
       ripple 平直 + 纹波（直流电源）
       noise  调制包络下的载波（射频源）
       packets 数据包串（交换机 / 主控 / 采集）
       bars   功率柱（PDU） */
  function update({ amp = .8, pulseWidth = 1, rate = 2, t = 0, shape = 'pulse' } = {}) {
    const a = inner;
    for (let i = 0; i < a.n; i++) {
      const u = i / (a.n - 1);
      const phase = ((u * rate) % 1 + 1) % 1;
      const sigma = .045 * pulseWidth;
      let y = 0;
      if (shape === 'sine') y = Math.sin(2 * Math.PI * (rate * 2) * u + t * 1.4) * .8;
      else if (shape === 'square') y = (((u * rate * 2) % 1) < .5 ? 1 : -1) * .7;
      else if (shape === 'ramp') y = (((u * rate) % 1) * 1.6 - .8) * .8;
      else if (shape === 'ripple') y = .62 + Math.sin(2 * Math.PI * 34 * u + t) * .06;
      else if (shape === 'noise') {
        const env = Math.exp(-((phase - .5) ** 2) / (2 * (.09 * pulseWidth) ** 2));
        y = env * Math.cos(2 * Math.PI * 14 * phase + t * 2.2) * .85;
      } else if (shape === 'packets') {
        const slot = (u * rate) % 1;
        y = (slot < .42 ? 1 : slot < .52 ? 0 : slot < .72 ? -.55 : 0) * .62;
      } else if (shape === 'bars') {
        const slot = Math.floor(u * 8 * rate) % 8;
        y = ((slot + 1) / 8) * 1.1 - .55;
      } else {
        const env = Math.exp(-((phase - .5) ** 2) / (2 * sigma * sigma));
        y = env * Math.cos(2 * Math.PI * 6 * phase + t * 1.2) * .92;
      }
      y *= amp;
      pos[i * 3] = a.x0 + u * a.w;
      pos[i * 3 + 1] = a.y0 + (0.5 + y * 0.5) * a.h;
      pos[i * 3 + 2] = .006;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeBoundingSphere();
  }
  update();

  return { group, update };
}
