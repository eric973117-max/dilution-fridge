/* 06 · 量子处理器 —— 内容层（纯数据）
   几何在 ./model/（自制参数化模型，零件密度对齐稀释制冷机那一层）。 */

export default {
  id: '06',
  key: 'processor',
  name: { zh: '量子处理器', en: 'Quantum Processor' },
  temperature: '10 mK',
  accent: '#c9a6ff',
  audience: ['investor', 'client', 'student'],
  summary: {
    zh: '芯片、载板、封装、磁屏蔽：四层结构，以及 49 个量子比特怎么排在一颗芯片上。',
    en: 'Chip, carrier, package, shield: four layers, and how 49 qubits fit on one die.',
  },
  glossary: ['qubit', 'transmon', 'josephson-junction', 'coupler', 'readout-resonator', 'flip-chip', 'wire-bond', 'magnetic-shielding'],
  chapters: [
    {
      key: 'processor-package',
      label: 'LAYER 06 · PACKAGE',
      title: { zh: '先看封装', en: 'Start With the Package' },
      vh: 130,
      pose: { from: { az: 6, el: 18, zoom: 0.82, tx: 0, ty: 0.00 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['shield', 'sma', 'lid'],
      details: {
        zh: [
          '量子处理器不是一颗裸芯片，它是四层：芯片、载板、封装、磁屏蔽，一层都不能少。',
          '外面三层各管一件事：Cryoperm 磁屏蔽挡环境磁场，铜封装挡住红外辐射与杂散微波，两侧 16 个 SMA 接口把微波送进最里面。',
        ],
        en: [
          'A quantum processor is not a bare chip. It is four layers — chip, carrier, package, magnetic shield — and none of them is optional.',
          'The outer three each do one job: the Cryoperm shield blocks the ambient magnetic field, the copper package blocks infrared radiation and stray microwaves, and 16 SMA launchers on the sides carry the microwaves in.',
        ],
      },
      specs: [
        { k: { zh: '封装', en: 'Package' }, v: '无氧铜 · OFC' },
        { k: { zh: '磁屏蔽', en: 'Magnetic shield' }, v: 'Cryoperm · 高磁导率' },
        { k: { zh: '微波接口', en: 'RF launchers' }, v: '16 × SMA' },
        { k: { zh: '工作温度', en: 'Operating temperature' }, v: '10 mK' },
      ],
    },
    {
      key: 'processor-chip',
      label: 'LAYER 06 · CHIP',
      title: { zh: '载板与裸片', en: 'Interposer and Die' },
      vh: 130,
      pose: { from: { az: 58, el: 24, zoom: 1.55, tx: 0, ty: 0.01 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['lid', 'pcb', 'die', 'wire'],
      details: {
        zh: [
          '掀开上盖，里面是一块微波载板：过孔阵列把接地做成一个完整平面，64 个焊盘把信号从边缘一路送到中心。',
          '载板中央是硅裸片。倒装焊焊球在几百微米的高度上把芯片和载板连起来 —— 每一颗焊球的电感都要算进微波设计里。',
          '四边的铝键合线把直流偏置与磁通控制引到载板上，它们是这条链上最细的零件。',
        ],
        en: [
          'Lift the lid and you find a microwave interposer: a via array that turns the ground into one continuous plane, and 64 pads that carry signals from the edge all the way to the centre.',
          'At the centre of the carrier sits the silicon die. Flip-chip bumps connect it to the carrier across a few hundred micrometres — the inductance of every single bump has to be designed for.',
          'Aluminium wire bonds around all four edges route DC bias and flux control onto the carrier; they are the finest parts in this chain.',
        ],
      },
      specs: [
        { k: { zh: '载板', en: 'Interposer' }, v: '微波介质 · 64 焊盘' },
        { k: { zh: '互连', en: 'Interconnect' }, v: '倒装焊 + 铝键合' },
        { k: { zh: '裸片', en: 'Die' }, v: '硅 · 58 × 58 mm（示意）' },
        { k: { zh: '接地', en: 'Grounding' }, v: '过孔阵列' },
      ],
    },
    {
      key: 'processor-qubits',
      label: 'LAYER 06 · QUBITS',
      title: { zh: '49 个量子比特', en: 'Forty-Nine Qubits' },
      vh: 150,
      pose: { from: { az: 108, el: 54, zoom: 5.60, tx: 0, ty: -0.004 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['array', 'resonator', 'feed', 'coupler'],
      details: {
        zh: [
          '49 个超导量子比特排成 7×7。每个比特是一对十字电容；中间那个小环是 SQUID，它的非线性来自两个约瑟夫森结。',
          '每个比特旁边有一条蜿蜒的读出谐振腔 —— 它与比特的耦合强度决定了读出有多快。横向那条蛇形线是所有比特共用的读出馈线。',
          '比特之间用耦合总线相连：两比特门的强度，就是这条总线的设计参数。',
        ],
        en: [
          'Forty-nine superconducting qubits in a 7×7 array. Each qubit is a pair of crossed capacitors; the small loop at its centre is a SQUID, and its nonlinearity comes from two Josephson junctions.',
          'Beside every qubit runs a meandering readout resonator — how strongly it couples to the qubit sets how fast that qubit can be read out. The horizontal meander is the shared readout feedline.',
          'Qubits are joined by coupling buses: the strength of the two-qubit gate is a design parameter of that bus.',
        ],
      },
      specs: [
        { k: { zh: '比特数', en: 'Qubits' }, v: '49（7 × 7）' },
        { k: { zh: '比特类型', en: 'Qubit type' }, v: 'Transmon' },
        { k: { zh: '耦合', en: 'Coupling' }, v: '近邻总线' },
        { k: { zh: '读出', en: 'Readout' }, v: '每比特一条谐振腔' },
      ],
    },
  ],
};
