/* ==========================================================================
   04 · 稀释制冷机 —— 内容层（纯数据，Node 可直接 import，供 npm run check 校验）

   几何在 ./model/（从「稀释制冷机-下午版」整段迁移，未改一行尺寸），
   这里只放「讲什么、按什么顺序讲、每一章机位在哪」。

   文案：中文迁自原版，英文为对应译文（同一条技术内容、同一组数字，不另加说法）。
   规格表的键做了一份中英对照（SPEC_KEY_EN），值（`3 × G10` 这类）不翻译。
   ========================================================================== */

import { SEGMENTS } from './model/data.js';

/* 原 main.js 的 camDefault：各章 pose.from 都是"相对取景中心"的绝对姿势（已并入） */
export const CAM_DEFAULT = { az: -186, el: -16, zoom: 0.86, tx: 0, ty: -0.05 };

/* 原 main.js 的 camPerScene（这里只留迁移进时间轴的那几章） */
const CAM = {
  overview: { az: -96, el: 10, zoom: 0.92, tx: 0, ty: 0.00 },
  xray: { az: 262, el: 78, zoom: 1.45, tx: 0, ty: -0.60 },
  signal: { az: 132, el: 6, zoom: 0.74, tx: 0, ty: 0.02 },
  /* 依赖图那一章：机器让到右半边（tx 为负 = 画面里往右），把左边腾给图 */
  deps: { az: 70, el: 30, zoom: 0.46, tx: -1.10, ty: 0.02 },
  assembly: { az: -78, el: 8, zoom: 0.45, tx: -1.10, ty: -0.02 },
  hold: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 },
  shields: { az: -136, el: -16, zoom: 0.78, tx: 0, ty: -0.02 },
  outro: { az: -158, el: 8, zoom: 0.80, tx: 0.22, ty: -0.06 },
};

/* 逐层套罩之后拉过去的近景（原 main.js 的 SHIELDS_CLOSE） */
export const SHIELDS_CLOSE = { ...CAM_DEFAULT, ...CAM.outro };

/* 逐章英文正文（与原版中文一一对应，不增不减） */
const COPY_EN = {
  overview: [
    'A dilution refrigerator does exactly one thing: it keeps a quantum chip at ten millikelvin while still letting room-temperature electronics talk to it.',
    'The next eight sections walk through the machine from the outside in, from room temperature down to the millikelvin — every one of them is a layer it cannot do without.',
  ],
  '01': [
    'Three G10 rods run the full height, threading six mounting plates onto a single centre axis.',
    'Without it the eight sections would be loose parts: no concentricity, and no thermal isolation from one stage to the next.',
  ],
  '02': [
    'The pulse tube cooler takes its first stage to 50 K and its second to 4 K: mechanical work performs the first big temperature drop.',
    'Without it you would have to keep consuming liquid helium, and the machine could never run continuously.',
  ],
  '03': [
    'The vacuum shell removes gas convection, and the 50 K and 4 K shields block room-temperature black-body radiation stage by stage.',
    'The cooling power available at 4 K would otherwise be eaten up by radiative heat leak within minutes.',
  ],
  '04': [
    'Helium-3 absorbs heat as it crosses the phase boundary from the concentrated into the dilute phase; the still, the continuous heat exchanger and the mixing chamber close the loop.',
    'The machine would stop at 4 K. This is the only section that produces cooling — the other seven exist to serve it.',
  ],
  '05': [
    'This section is the input wiring between 300 K and 4 K: microwave control lines and DC bias lines enter through room-temperature feedthroughs, step down through attenuator after attenuator, and are clamped to every plate so their heat is dumped there.',
    'Room-temperature noise and heat leak straight down the wires, and the qubit neither receives clean instructions nor returns a readable answer.',
  ],
  '06': [
    'This is the lower half of the same bundle: below 4 K the lines become superconducting NbTi coax, running from the 4 K plate down to the mixing chamber and the chip, so the faint quantum signal covers the last stretch almost losslessly.',
    'Ordinary metal coax has resistance at millikelvin temperatures — it swallows the signal and brings thermal noise with it, and the readout signal-to-noise never comes up.',
  ],
  '07': [
    'Cryogenic isolators let the signal pass one way only and stop thermal noise travelling back; two stages of amplification, at 4 K and at 10 mK, lift a nanowatt-scale readout signal to something room-temperature equipment can read.',
    'Noise would otherwise creep back up the signal line to the qubit and destroy its coherence.',
  ],
  '08': [
    'A high-permeability Cryoperm shield blocks the Earth field and stray radiation while the superconducting chip operates at the coldest point of the machine.',
    'Ambient magnetic field dephases the qubits, and thermal excitation cannot be pushed to a negligible probability.',
  ],
  xray: [
    'Cut along the centre axis, the eight sections turn out to be one vertical stack: shielding and structure outside, the dilution circuit and the signal path inside.',
    'Each plate is a temperature step: signals travel between the steps, and heat is pumped out between them.',
  ],
  signal: [
    'Starting from a room-temperature SMA connector, a microwave line has to survive six cooling stages before it touches the chip.',
    'Every stage down, the line is anchored once, the noise floor is attenuated once, and the signal is lifted again once.',
  ],
  deps: [
    'The eight sections are not a flat list — they depend on each other: which one cools which, which one feeds signals to which, which one shields which, and which one holds the rest up.',
    'This diagram is the assembly order of the machine, and the script for the re-assembly chapter that follows.',
  ],
  assembly: [
    'The eight sections are not stacked in an arbitrary order: the frame goes up first, then the shielding, then the cold stages from the bottom, and the dilution circuit lands last.',
    'It is the physical version of the dependency diagram you have just seen.',
  ],
  hold: ['Take a look at the complete machine — still without its clothes: no radiation shields and no vacuum shell yet.'],
  shields: ['Layer by layer, from the inside out: MXC, Still, 4 K, 50 K, and finally the outer vacuum chamber.'],
  outro: ['And finally it fades back to line art: the full specification, and where this machine sits in the whole chain.'],
};

/* 规格表的键：中英对照（值不翻译，像 3 × G10、14 µW 这种都是读数） */
const SPEC_KEY_EN = {
  支撑杆: 'Supports', 安装盘: 'Mounting plates', 同心度: 'Concentricity', 导热率: 'Thermal conductivity',
  一级冷头: 'First stage', 二级冷头: 'Second stage', 冷却方式: 'Cooling method', 液氦: 'Liquid helium',
  真空度: 'Vacuum', 辐射罩: 'Radiation shields', 外罩: 'Outer shell', 主要漏热: 'Main heat leak',
  基础温度: 'Base temperature', 冷却功率: 'Cooling power', 工质: 'Working fluid', 相分离温度: 'Phase separation',
  微波线: 'Microwave lines', 温度跨度: 'Temperature span', 衰减: 'Attenuation', 热锚: 'Thermal anchors',
  材料: 'Material', 传输损耗: 'Transmission loss', 结构: 'Structure', 隔离器: 'Isolators',
  放大器: 'Amplifiers', 噪声: 'Noise', 增益: 'Gain', 屏蔽: 'Shielding', 芯片: 'Chip',
  热激发: 'Thermal excitation', 芯片尺度: 'Chip scale',
};

/* 讲到哪一段时，顺带标出哪几块冷盘（迁自原 data.js 的 PLATE_CHAPTERS） */
const PLATES = {
  '01': ['room'],
  '02': ['50k', '4k'],
  '03': ['50k', '4k'],
  '04': ['still', 'cold', 'mc'],
  '06': ['4k'],
  '07': ['cold'],
  '08': ['mc'],
  xray: ['50k', '4k', 'still', 'mc'],
};

/* 八段：章节名/机位/规格直接取自迁移过来的 model/data.js —— 与原版逐字一致。
   vh 沿用原 SCENES：hero 段（04 / 08）给 140，其余 100。 */
const segChapter = (s) => ({
  key: `fridge-seg${s.id}`,
  seg: s.id,
  label: `SEG ${s.id} · ${s.short}`,
  title: { zh: s.zh, en: s.en },
  vh: s.id === '04' || s.id === '08' ? 140 : 100,
  pose: { from: { ...CAM_DEFAULT, ...s.cam } },
  /* 段章统一保持线稿（原版 clay/bg 全程 0），只有 seg01 要把上一章的白模褪回线稿 */
  stage: s.id === '01'
    ? { clay: [1, 0, 0.35], bg: [1, 0, 0.35], dim: 0, xray: 0 }
    : { clay: 0, bg: 0, dim: 0, xray: 0 },
  plates: PLATES[s.id] || [],
  details: { zh: [s.role, s.why], en: COPY_EN[s.id] || [] },
  specs: (s.specs || []).map(([k, v]) => ({ k: { zh: k, en: SPEC_KEY_EN[k] || '' }, v })),
});

export const chapters = [
  {
    key: 'fridge-overview',
    label: 'FRIDGE · OVERVIEW',
    title: { zh: '整机总览', en: 'Machine Overview' },
    vh: 120,
    pose: { from: { ...CAM_DEFAULT, ...CAM.overview } },
    /* 线稿 → 白模：整机先看清形体，再开始拆 */
    stage: { clay: [0, 1], bg: [0, 1], dim: 0, xray: 0 },
    details: {
      zh: [
        '一台稀释制冷机做的只有一件事：把量子芯片泡在 10 毫开尔文的环境里，并且让 300 K 的电子学还能跟它说话。',
        '下面八段按"从外到内、从室温到毫开"的顺序走一遍，每一段都是这台机器缺一不可的一层。',
      ],
      en: COPY_EN.overview,
    },
  },
  ...SEGMENTS.map(segChapter),
  {
    key: 'fridge-xray',
    label: 'CROSS SECTION',
    title: { zh: '沿 Z 轴剖开', en: 'Cross Section' },
    vh: 110,
    pose: { from: { ...CAM_DEFAULT, ...CAM.xray } },
    /* 剖面按章节前 45% 推到位（原版 localOf(iXray)/0.45） */
    stage: { clay: 0, bg: 0, dim: 0, xray: [0, 1, 0.45] },
    plates: PLATES.xray,
    details: {
      zh: [
        '把整机沿中轴剖开，八段其实是同一条竖直的堆叠：外圈是屏蔽与结构，内圈是稀释回路与信号。',
        '每一级冷板都是一道温度台阶，信号在台阶之间走线，热量在台阶之间被抽走。',
      ],
      en: COPY_EN.xray,
    },
  },
  {
    key: 'fridge-signal',
    label: 'SIGNAL PATH TRACE',
    title: { zh: '微波信号链路', en: 'Signal Path Trace' },
    vh: 130,
    pose: { from: { ...CAM_DEFAULT, ...CAM.signal } },
    /* 这一章只看那串发亮的线，其余压暗（原版 dim 0.9、xray 1） */
    stage: { clay: 0, bg: 0, dim: 0.9, xray: 1 },
    details: {
      zh: [
        '从室温 SMA 接口出发，一条微波线要走完六级冷板才能碰到芯片。',
        '每下一级：线被热锚固定一次、被衰减器压一次噪声、被放大器再抬起来一次。',
      ],
      en: COPY_EN.signal,
    },
  },
  {
    key: 'fridge-deps',
    label: 'SYSTEM DEPENDENCY',
    title: { zh: '系统依赖关系', en: 'System Dependency' },
    vh: 130,
    pose: { from: { ...CAM_DEFAULT, ...CAM.deps } },
    /* 只看图，机器压暗；底部有说明块，手机端要给它留出 UI 带 */
    stage: { clay: 0, bg: 0, dim: 0.86, xray: 0 },
    overlay: true,
    details: {
      zh: [
        '八段不是并列的清单，它们之间有依赖：谁给谁供冷、谁给谁供信号、谁给谁做屏蔽、谁把谁撑住。',
        '这张图是整台机器的装配顺序，也是下一章按顺序合体的依据。',
      ],
      en: COPY_EN.deps,
    },
  },
  {
    key: 'fridge-assembly',
    label: 'RE-ASSEMBLY',
    title: { zh: '按依赖合体', en: 'Re-Assembly' },
    vh: 100,
    pose: { from: { ...CAM_DEFAULT, ...CAM.assembly } },
    stage: { clay: [0, 0.92], bg: [0, 1], dim: 0, xray: 0 },
    details: {
      zh: [
        '八段不是随便堆在一起的：结构先立骨，屏蔽随后，冷头从下往上装，最后落位的是稀释回路。',
        '这就是上一章那张依赖图的物理版本。',
      ],
      en: COPY_EN.assembly,
    },
  },
  {
    key: 'fridge-hold',
    label: 'RE-ASSEMBLED',
    title: { zh: '整机定格', en: 'Re-Assembled' },
    vh: 85,
    pose: { from: { ...CAM_DEFAULT, ...CAM.hold } },
    pin: true,
    stage: { clay: 0.92, bg: 1, dim: 0.34, xray: 0 },
    details: {
      zh: ['先看清一台完整的机器：此刻它还没穿衣服 —— 没有辐射罩，也还没套上真空外罩。'],
      en: COPY_EN.hold,
    },
  },
  {
    key: 'fridge-shields',
    label: 'SHIELDING STACK',
    title: { zh: '逐层套罩', en: 'Shielding Stack' },
    vh: 130,
    pose: { from: { ...CAM_DEFAULT, ...CAM.shields } },
    stage: { clay: 0.92, bg: 1, dim: 0.20, xray: 0 },
    details: {
      zh: [
        '从里往外，一层一层套上：MXC、Still、4 K、50 K，最后是真空外罩。',
      ],
      en: COPY_EN.shields,
    },
  },
  {
    key: 'fridge-outro',
    label: 'SPEC SHEET',
    title: { zh: '总规格', en: 'Spec Sheet' },
    vh: 130,
    /* 最后一章的 pose.to 是整条相机曲线的终点 */
    pose: { from: { ...CAM_DEFAULT, ...CAM.outro }, to: { az: -164, el: 9, zoom: 0.86, tx: 0.16, ty: -0.05 } },
    stage: { clay: [0.92, 0], bg: [1, 0], dim: 0.34, xray: 0 },
    details: {
      zh: ['最后褪回线稿：这台机器的全部参数，以及它在整条链路里的位置。'],
      en: COPY_EN.outro,
    },
  },
];

export default {
  id: '04',
  key: 'fridge',
  name: { zh: '稀释制冷机', en: 'Dilution Refrigerator' },
  temperature: '300 K → 10 mK',
  accent: '#6fc7ff',
  audience: ['student', 'client'],
  summary: {
    zh: '把 300 K 的室温信号一路降到 10 mK：预冷、稀释、屏蔽、布线。',
    en: 'Brings room-temperature signals down to 10 mK: pre-cooling, dilution, shielding, wiring.',
  },
  glossary: ['dilution-refrigerator', 'mixing-chamber', 'still', 'pulse-tube', 'radiation-shield', 'thermal-anchor', 'twpa', 'hemt', 'circulator', 'attenuator'],
  chapters,
};
