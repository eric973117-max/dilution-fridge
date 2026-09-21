/* ==========================================================================
   06 · 量子处理器 —— 行为层

   几何在 ./model/chip.js（自制参数化装配，零件密度对齐稀释制冷机那一层），
   这里负责：挂进舞台、按章推进"拆开"的动作、把名牌挂到零件上。

   三章的动作是递进的：先对半打开磁屏蔽 → 再抬起上盖 → 最后把裸片与阵列托起来看。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import content from './content.js';
import { buildChip } from './model/chip.js';

const smoothstep = (t) => t * t * (3 - 2 * t);

let chip = null;
let labels = null;
let labelItems = null;

/* 每章要挂出来的名牌（id 与 content.js 的 plates 对应） */
const LABEL_IDS = {
  'processor-package': ['shield', 'sma'],
  'processor-chip': ['pcb', 'die'],
  'processor-qubits': ['array', 'feed'],
};

function makeLabels(ctx) {
  const t = (v) => ctx.i18n.t(v);
  const g = chip.groups;
  const P = (obj, x, y, z) => ({ obj, offset: new THREE.Vector3(x, y, z) });
  return [
    {
      id: 'shield',
      name: t({ zh: '磁屏蔽筒', en: 'Cryoperm shield' }),
      en: 'CRYOPERM',
      temp: '10 mK',
      note: t({ zh: '高磁导率合金挡环境磁场，剖开是为了看见里面。', en: 'High-permeability alloy blocks the ambient field; cut open so you can see inside.' }),
      part: P(g.shield, 0, 40, 0),
    },
    {
      id: 'lid',
      name: t({ zh: '封装上盖', en: 'Package lid' }),
      en: 'OFC LID',
      temp: '10 mK',
      note: t({ zh: '挡住红外辐射与杂散微波，四角螺钉固定。', en: 'Blocks infrared radiation and stray microwaves; four screws hold it down.' }),
      part: P(g.lid, 0, 49, 0),
    },
    {
      id: 'sma',
      name: t({ zh: 'SMA 微波接口', en: 'SMA launchers' }),
      en: '16 × SMA',
      temp: '10 mK',
      note: t({ zh: '两侧各 8 个：外壳、螺纹、中心导体，一路送到载板。', en: 'Eight per side: shell, thread, centre conductor — all the way to the carrier.' }),
      part: P(g.sma, 74, 0, 30),
    },
    {
      id: 'pcb',
      name: t({ zh: '微波载板', en: 'Microwave interposer' }),
      en: 'INTERPOSER',
      temp: '10 mK',
      note: t({ zh: '过孔阵列 + 64 个焊盘，把信号从边缘送到中心。', en: 'Via array plus 64 pads carry signals from the edge to the centre.' }),
      part: P(g.pcb, 0, 6, 0),
    },
    {
      id: 'die',
      name: t({ zh: '硅裸片', en: 'Silicon die' }),
      en: 'DIE',
      temp: '10 mK',
      note: t({ zh: '58 × 58 mm 示意尺寸；倒装焊焊球连到载板。', en: '58 × 58 mm as a stand-in; flip-chip bumps connect it to the carrier.' }),
      part: P(g.die, 0, 8, 0),
    },
    {
      id: 'wire',
      name: t({ zh: '铝键合线', en: 'Aluminium wire bonds' }),
      en: 'WIRE BOND',
      temp: '10 mK',
      note: t({ zh: '每边 24 根，走直流偏置与磁通控制。', en: 'Twenty-four per side, carrying DC bias and flux control.' }),
      part: P(g.wire, 30, 10, 0),
    },
    {
      id: 'array',
      name: t({ zh: '量子比特阵列', en: 'Qubit array' }),
      en: '7 × 7 QUBITS',
      temp: '10 mK',
      note: t({ zh: '49 个 Transmon：十字电容 + SQUID。', en: 'Forty-nine transmons: crossed capacitors plus a SQUID.' }),
      /* 名牌统一走左侧，所以锚点也钉在阵列左缘 —— 不然牌子会盖在阵列中间 */
      part: P(g.array, -30, 34, 0),
    },
    {
      id: 'resonator',
      name: t({ zh: '读出谐振腔', en: 'Readout resonator' }),
      en: 'RESONATOR',
      temp: '10 mK',
      note: t({ zh: '每比特一条蜿蜒线，耦合强度决定读出速度。', en: 'One meander per qubit; its coupling sets how fast readout can be.' }),
      part: P(g.array, 1.3, 8, 12),
    },
    {
      id: 'coupler',
      name: t({ zh: '耦合总线', en: 'Coupling bus' }),
      en: 'BUS',
      temp: '10 mK',
      note: t({ zh: '两比特门强度由这条总线的设计参数决定。', en: 'The two-qubit gate strength is a design parameter of this bus.' }),
      part: P(g.array, 3.6, 8, 0),
    },
    {
      id: 'feed',
      name: t({ zh: '读出馈线', en: 'Readout feedline' }),
      en: 'FEEDLINE',
      temp: '10 mK',
      note: t({ zh: '横向蛇形线，全部比特共用。', en: 'The horizontal meander shared by every qubit.' }),
      part: P(g.feed, -34, 34, 0),
    },
  ];
}

function build(ctx) {
  chip = buildChip({ qubits: 49 });
  ctx.stage.scene.add(chip.root);

  const box = new THREE.Box3().setFromObject(chip.root);
  ctx.stage.setFraming({
    yMin: box.min.y,
    yMax: box.max.y,
    margin: 0.04,
    ground: null,
    top: null,
    plateYs: [],
    marks: [],
  });

  labels = ctx.overlays.createLabels();
  labelItems = makeLabels(ctx);
  /* 换语言时把名牌重建一遍（文本在建立时就已经取好） */
  ctx.i18n.subscribe(() => { labelItems = null; labels?.reset(); });
}

/** 三章共用的"拆开"状态：磁屏蔽对开、上盖抬起、裸片托起 */
function applyState(state) {
  const g = chip.groups;
  g.shieldR.position.x = 64 * state.open;
  g.shieldL.position.x = -64 * state.open;
  g.lid.position.y = 104 * state.lid;
  const lift = 16 * state.lift;
  [g.die, g.array, g.feed, g.wire].forEach((grp) => { grp.position.y = lift; });
  chip.materials.shell.opacity = 0.28 + 0.24 * state.open;
}

function update(ctx) {
  if (!chip) return;
  const { chapter, local } = ctx;
  const t = smoothstep(Math.min(1, Math.max(0, local)));
  const state = { open: 0, lid: 0, lift: 0 };

  if (chapter.key === 'processor-package') state.open = t;
  else if (chapter.key === 'processor-chip') { state.open = 1; state.lid = t; }
  else if (chapter.key === 'processor-qubits') { state.open = 1; state.lid = 1; state.lift = t; }
  applyState(state);

  if (!labels) return;
  if (!labelItems) labelItems = makeLabels(ctx);
  const ids = LABEL_IDS[chapter.key] || [];
  const focus = ids.length ? ids[Math.min(ids.length - 1, Math.floor(local * ids.length))] : null;
  labels.setActive(ids, ctx.mobile ? 'right' : 'left', focus);
  labels.update(ctx.stage.camera, labelItems, []);
}

const bounds = () => {
  if (!chip) return null;
  const box = new THREE.Box3().setFromObject(chip.root);
  if (box.isEmpty()) return null;
  return {
    yMin: box.min.y,
    yMax: box.max.y,
    height: box.max.y - box.min.y,
    centerY: (box.min.y + box.max.y) / 2,
    width: box.max.x - box.min.x,
  };
};

const setActive = (on) => {
  if (chip) chip.root.visible = on;
  /* 离开这一层时把名牌一起收掉，否则会挂在那儿压住后面几章 */
  if (!on && labels) labels.setActive([], 'left', null);
};

const dispose = () => {
  if (!chip) return;
  chip.root.parent?.remove(chip.root);
  chip = null;
  labels = null;
  labelItems = null;
};

export default { ...content, build, update, bounds, setActive, dispose };
