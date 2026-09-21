/* ==========================================================================
   AWG（任意波形发生器）· 标杆设备建模

   这一台按"每个零件都真的建"来做，密度对齐稀释制冷机的一个功能段：
     · 前面板：4 路输出各自一套（外导体 + 介质环 + 中心针 + 锁紧螺母 + 通道标签 + 指示灯）、
       旋钮（滚花 24 齿）、12 键键盘（独立键帽）、显示屏、USB、带光环的电源键、
       四角螺钉、下缘散热缝
     · 机箱：上盖（28 道散热槽 + 螺钉 + 提手耳）、两侧板（12 道格栅 + 螺钉）、
       后板（4 路同轴输出 + 10 MHz 参考进/出 + 触发进/出 + LAN + USB + 36 芯 GPIB + IEC 电源入口
       + 保险丝 + 接地柱 + 7 叶风扇 + 铭牌刻线）
     · 内部：4 块通道板（DAC + 滤波 + 运放 + 输出级 + 散热片 + 同轴引线）、
       数字板（FPGA + 64 焊盘 + DDR + 3 个电源模块 + 电感）、电源段（变压器 + 电容 + 散热齿）、
       线束（6 束 + 8 个线夹 + 2 条排线）
   全部自制；面板只用通用功能标识，不含任何厂商名称。
   ========================================================================== */

import * as THREE from '../../../vendor/three.module.js';
import { createMaterials, createKit } from '../../../src/parts/kit.js';

export function buildAwgUnit({ mono = true, panelW = 482, front = 380, height = 178, y = 0, unitD = 440 } = {}) {
  const materials = createMaterials({ mono });
  const kit = createKit(materials, { outlineThreshold: 26 });
  const { group, box, cyl, cone, ring, pipe, sphere, bag, instanced } = kit;

  const g = new THREE.Group();
  g.name = 'Unit_awg';
  const yc = y;
  const back = front + 2 - unitD;
  const parts = {};

  /* ------------------------------------------------------------------ 前面板 */
  const panel = group(g, 'AWG · 前面板');
  box(panel, [panelW, height - 6, 4], [0, yc, front + 2], 'white', 'AWG 面板');

  /* 显示屏：外框 + 内屏 + 4 条刻度线 */
  box(panel, [196, 46, 3], [-78, yc + height * 0.16, front + 4.4], 'dark', 'AWG 显示屏');
  box(panel, [204, 52, 2], [-78, yc + height * 0.16, front + 3.6], 'silver', '显示屏外框');
  const ticks = bag('屏幕刻度线');
  const tickGeo = new THREE.BoxGeometry(70, 1, 1);
  for (let i = 0; i < 4; i++) ticks.add(tickGeo, [-78, yc + height * 0.16 - 12 + i * 8, front + 5.6]);
  ticks.flush(panel, 'bright', { outlineIt: false });

  /* 四路输出：每路一套完整同轴结构 */
  const outPorts = group(panel, 'AWG · 四路输出');
  for (let ch = 0; ch < 4; ch++) {
    const x = -150 + ch * 46;
    const yy = yc - 46;
    cyl(outPorts, 6.4, 20, [x, yy, front + 10], 'silver', 28, `通道 ${ch + 1} 外导体`, [Math.PI / 2, 0, 0]);
    cyl(outPorts, 7.6, 3, [x, yy, front + 19], 'bright', 28, `通道 ${ch + 1} 锁紧螺母`, [Math.PI / 2, 0, 0]);
    cyl(outPorts, 4.4, 6, [x, yy, front + 16], 'dark', 20, `通道 ${ch + 1} 介质环`, [Math.PI / 2, 0, 0]);
    cyl(outPorts, 1.4, 22, [x, yy, front + 12], 'bright', 14, `通道 ${ch + 1} 中心针`, [Math.PI / 2, 0, 0]);
    box(outPorts, [34, 9, 1.4], [x, yy - 13, front + 4.6], 'dark', `通道 ${ch + 1} 标签`);
    const led = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 12), materials.cyan);
    led.rotation.x = Math.PI / 2;
    led.position.set(x, yy + 13, front + 4.6);
    led.name = `通道 ${ch + 1} 指示灯`;
    outPorts.add(led);
  }
  parts.outputs = outPorts;

  /* 旋钮：滚花 24 齿 + 指针 */
  const knob = group(panel, 'AWG · 旋钮');
  cyl(knob, 13, 12, [panelW / 2 - 44, yc - 30, front + 9], 'dark', 40, '旋钮主体', [Math.PI / 2, 0, 0]);
  cyl(knob, 15, 4, [panelW / 2 - 44, yc - 30, front + 14], 'silver', 40, '旋钮压圈', [Math.PI / 2, 0, 0]);
  const knurl = bag('旋钮滚花齿');
  const knurlGeo = new THREE.BoxGeometry(2, 11, 2);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    knurl.add(knurlGeo, [panelW / 2 - 44 + Math.cos(a) * 13.6, yc - 30 + Math.sin(a) * 13.6, front + 10]);
  }
  knurl.flush(knob, 'dark', { outlineIt: false });
  box(knob, [16, 2, 2], [panelW / 2 - 44, yc - 30, front + 16], 'bright', '旋钮指针');

  /* 12 键键盘：独立键帽 + 键圈 */
  const keys = group(panel, 'AWG · 键盘');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 40 + c * 22;
      const yy = yc + height * 0.16 - 14 + r * 18;
      box(keys, [17, 13, 3.2], [x, yy, front + 5], 'dark', `键 ${r * 4 + c + 1}`);
      box(keys, [19, 15, 1.2], [x, yy, front + 3.6], 'silver', `键圈 ${r * 4 + c + 1}`);
    }
  }

  /* USB、电源键、四角螺钉、下缘散热缝 */
  box(panel, [16, 9, 4], [panelW / 2 - 44, yc + 34, front + 5], 'dark', 'USB 接口');
  cyl(panel, 7, 5, [panelW / 2 - 44, yc + 8, front + 5], 'bright', 20, '电源键', [Math.PI / 2, 0, 0]);
  ring(panel, 9, 1.2, [panelW / 2 - 44, yc + 8, front + 6], 'cyan', [0, 0, 0], '电源键光环');
  const faceScrews = bag('面板螺钉');
  const screwGeo = new THREE.CylinderGeometry(3, 3, 3, 16);
  screwGeo.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    faceScrews.add(screwGeo, [sx * (panelW / 2 - 16), yc + sy * (height / 2 - 14), front + 4.6]);
  }
  faceScrews.flush(panel, 'silver', { outlineIt: false });
  const slits = bag('面板散热缝');
  const slitGeo = new THREE.BoxGeometry(22, 2, 2.4);
  for (let i = 0; i < 14; i++) slits.add(slitGeo, [-panelW / 2 + 30 + i * 26, yc - height / 2 + 7, front + 4.6]);
  slits.flush(panel, 'dark', { outlineIt: false });

  /* ------------------------------------------------ 上盖 / 侧板（可抬起） */
  const cover = group(g, 'AWG · 上盖');
  box(cover, [panelW - 10, 6, unitD * 0.96], [0, yc + height / 2 - 4, front + 2 - unitD / 2], 'white', 'AWG 上盖');
  const vents = bag('上盖散热槽');
  const ventGeo = new THREE.BoxGeometry(28, 2, unitD * 0.86);
  for (let i = 0; i < 28; i++) vents.add(ventGeo, [-panelW / 2 + 26 + i * 15.4, yc + height / 2 - 1, front + 2 - unitD / 2]);
  vents.flush(cover, 'dark', { outlineIt: false });
  const coverScrews = bag('上盖螺钉');
  const csGeo = new THREE.CylinderGeometry(2.6, 2.6, 3, 14);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    csGeo.rotateX(Math.PI / 2);
    coverScrews.add(csGeo, [sx * (panelW / 2 - 18), yc + height / 2 - 1, front - 20 - i * (unitD / 6)]);
  }
  coverScrews.flush(cover, 'silver', { outlineIt: false });
  for (const s of [-1, 1]) box(cover, [18, 10, 26], [s * (panelW / 2 - 6), yc, front + 6], 'silver', '提手耳');

  const sides = group(g, 'AWG · 侧板');
  for (const s of [-1, 1]) {
    box(sides, [5, height - 12, unitD * 0.94], [s * (panelW / 2 + 4), yc, front + 2 - unitD / 2], 'white', '侧板');
    const grille = bag('侧板格栅');
    const grGeo = new THREE.BoxGeometry(2, 3, 22);
    for (let i = 0; i < 12; i++) grille.add(grGeo, [s * (panelW / 2 + 6.6), yc - height * 0.3 + i * 8, front - 40]);
    grille.flush(sides, 'dark', { outlineIt: false });
  }

  /* ------------------------------------------------------------- 后面板 */
  const rear = group(g, 'AWG · 后面板');
  box(rear, [panelW, height - 6, 4], [0, yc, back], 'white', 'AWG 后面板');
  const rearCoax = group(rear, 'AWG · 后部同轴输出');
  for (let ch = 0; ch < 4; ch++) {
    const x = -190 + ch * 42;
    cyl(rearCoax, 6, 16, [x, yc - 30, back - 8], 'silver', 24, `后部通道 ${ch + 1}`, [Math.PI / 2, 0, 0]);
    cyl(rearCoax, 1.3, 20, [x, yc - 30, back - 8], 'bright', 12, `后部通道 ${ch + 1} 中心针`, [Math.PI / 2, 0, 0]);
  }
  const rearBnc = group(rear, 'AWG · 参考与触发');
  for (let i = 0; i < 4; i++) {
    const x = -30 + i * 40;
    cyl(rearBnc, 5.6, 16, [x, yc + 34, back - 8], 'silver', 22, `BNC ${i + 1}`, [Math.PI / 2, 0, 0]);
    cyl(rearBnc, 1.2, 18, [x, yc + 34, back - 8], 'bright', 12, `BNC ${i + 1} 中心针`, [Math.PI / 2, 0, 0]);
  }
  box(rear, [44, 26, 12], [130, yc + 30, back - 6], 'dark', 'GPIB 接口');
  const gpib = bag('GPIB 触点');
  const pinGeo = new THREE.BoxGeometry(1.4, 1.4, 6);
  for (let i = 0; i < 36; i++) gpib.add(pinGeo, [112 + (i % 12) * 3, yc + 22 + Math.floor(i / 12) * 5, back - 12]);
  gpib.flush(rear, 'bright', { outlineIt: false });
  box(rear, [30, 16, 10], [186, yc - 34, back - 6], 'dark', 'LAN 接口');
  box(rear, [40, 26, 14], [-206, yc - 30, back - 6], 'dark', 'IEC 电源入口');
  box(rear, [14, 10, 8], [-206, yc + 6, back - 5], 'silver', '保险丝座');
  cyl(rear, 5, 12, [-150, yc - 52, back - 6], 'bright', 14, '接地柱', [Math.PI / 2, 0, 0]);
  const fan = group(rear, 'AWG · 散热风扇');
  ring(fan, 27, 3.4, [150, yc - 40, back - 6], 'dark', [0, 0, 0], '风扇外圈');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const blade = box(fan, [22, 1.6, 8], [150 + Math.cos(a) * 14, yc - 40 + Math.sin(a) * 14, back - 8], 'dark', '风扇叶片');
    blade.rotation.z = a + 0.4;
  }
  cyl(fan, 6, 6, [150, yc - 40, back - 10], 'bright', 18, '风扇电机', [Math.PI / 2, 0, 0]);
  box(rear, [64, 16, 1.2], [40, yc - 62, back - 4], 'silver', '铭牌底板');
  for (let i = 0; i < 5; i++) box(rear, [46 - i * 4, 1.2, .8], [28, yc - 68 + i * 3, back - 5], 'dark', '铭牌刻线');

  /* ---------------------------------------------------------------- 内部 */
  const board = group(g, 'AWG · 内部');
  /* 4 块通道板：DAC + 滤波 + 运放 + 输出级 + 散热片 + 同轴引线 */
  for (let ch = 0; ch < 4; ch++) {
    const x = -150 + ch * 46;
    const cb = group(board, `通道板 ${ch + 1}`);
    box(cb, [38, 2.4, 200], [x, yc + 6, front - 220], 'ceramic', `通道 ${ch + 1} 基板`);
    box(cb, [18, 4, 18], [x, yc + 9, front - 150], 'dark', `通道 ${ch + 1} DAC`);
    const pins = bag(`通道 ${ch + 1} DAC 引脚`);
    const pinS = new THREE.BoxGeometry(1, 1.6, 1);
    for (let i = 0; i < 16; i++) {
      pins.add(pinS, [x - 8 + (i % 8) * 2.3, yc + 7.5, front - 150 - 10 + Math.floor(i / 8) * 20]);
      pins.add(pinS, [x - 8 + (i % 8) * 2.3, yc + 7.5, front - 150 + 10 - Math.floor(i / 8) * 20]);
    }
    pins.flush(cb, 'bright', { outlineIt: false });
    for (let i = 0; i < 6; i++) {
      box(cb, [4, 2, 6], [x - 12 + i * 5, yc + 8, front - 210], 'silver', `通道 ${ch + 1} 滤波件`);
    }
    box(cb, [12, 3, 10], [x, yc + 9, front - 250], 'dark', `通道 ${ch + 1} 运放`);
    box(cb, [20, 6, 16], [x, yc + 11, front - 300], 'silver', `通道 ${ch + 1} 输出级`);
    const fins = bag(`通道 ${ch + 1} 散热片`);
    const finGeo = new THREE.BoxGeometry(18, 5, 1.4);
    for (let i = 0; i < 6; i++) fins.add(finGeo, [x, yc + 16, front - 336 + i * 4]);
    fins.flush(cb, 'silver', { outlineIt: false });
    /* 输出引线：从通道板沿侧壁走到前面板 —— 真实设备就是这么绕的 */
    pipe(cb, [[x, yc + 8, front - 190], [x + 26, yc + 14, front - 90], [x + 30, yc + 10, front - 16], [x, yc - 46, front + 10]], 1.6, 'bright', `通道 ${ch + 1} 同轴引线`, 26);
  }
  /* 数字板：FPGA + DDR + 电源模块 + 电感 */
  const dig = group(board, '数字板');
  box(dig, [300, 2.4, 150], [0, yc - 40, front - 200], 'ceramic', '数字板基板');
  box(dig, [44, 4, 44], [-90, yc - 37, front - 200], 'dark', 'FPGA');
  const fpgaPins = bag('FPGA 焊盘阵列');
  const fpgaPin = new THREE.BoxGeometry(1.2, 1.6, 1.2);
  for (let i = 0; i < 22; i++) for (let j = 0; j < 2; j++) {
    fpgaPins.add(fpgaPin, [-111 + i * 2, yc - 39, front - 200 - 25 + j * 50]);
    fpgaPins.add(fpgaPin, [-90 - 25 + j * 50, yc - 39, front - 221 + i * 2]);
  }
  fpgaPins.flush(dig, 'bright', { outlineIt: false });
  box(dig, [26, 3, 14], [-20, yc - 38, front - 230], 'dark', 'DDR');
  for (let i = 0; i < 3; i++) {
    box(dig, [22, 5, 16], [30 + i * 30, yc - 36, front - 190], 'dark', `电源模块 ${i + 1}`);
    cyl(dig, 5, 6, [30 + i * 30, yc - 33, front - 168], 'silver', 18, `电感 ${i + 1}`, [Math.PI / 2, 0, 0]);
  }
  pipe(dig, [[-70, yc - 34, front - 160], [0, yc - 20, front - 120], [70, yc - 34, front - 160]], 3, 'bright', '内部排线 1', 24);
  /* 电源段：变压器 + 电容 + 散热齿 */
  const psu = group(board, '电源段');
  cyl(psu, 34, 52, [-150, yc - 44, front - 330], 'dark', 28, '变压器');
  for (let i = 0; i < 4; i++) cyl(psu, 9, 30, [-90 + i * 24, yc - 40, front - 330], 'silver', 20, `滤波电容 ${i + 1}`);
  const psuFins = bag('电源散热齿');
  const psuFin = new THREE.BoxGeometry(26, 16, 2);
  for (let i = 0; i < 10; i++) psuFins.add(psuFin, [40 + i * 3.4, yc - 34, front - 330]);
  psuFins.flush(psu, 'silver', { outlineIt: false });
  /* 线束与线夹 */
  const harness = group(board, '内部线束');
  for (let i = 0; i < 6; i++) {
    pipe(harness, [[-210 + i * 8, yc - 50, front - 300], [-200 + i * 8, yc - 20, front - 180], [-190 + i * 8, yc - 10, front - 40]],
      2.2, 'dark', `内部线束 ${i + 1}`, 22);
  }
  const clamps = bag('线夹');
  const clampGeo = new THREE.BoxGeometry(28, 6, 5);
  for (let i = 0; i < 8; i++) clamps.add(clampGeo, [-190, yc - 40 + i * 11, front - 120]);
  clamps.flush(harness, 'silver', { outlineIt: false });

  parts.fpga = dig;
  parts.dac = board;
  parts.psu = psu;
  parts.fan = fan;
  parts.harness = harness;

  /* 材质独立化（供"当前设备实、其余压暗"用） */
  const mats = [];
  g.traverse((o) => {
    if (!o.material) return;
    o.material = o.material.clone();
    o.material.userData.base = o.material.color.clone();
    o.material.userData.baseOpacity = o.material.opacity ?? 1;
    mats.push(o.material);
  });

  return { group: g, cover, board, rear: rearPanelGroup(rear), parts, mats, stats: { ...kit.stats } };
}

/* 后面板组（模块要让它"让开"）—— 直接返回刚才那个组 */
function rearPanelGroup(rear) { return rear; }
