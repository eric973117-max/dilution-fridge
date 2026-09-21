/* 05 · 低温信号链（4 K → 10 mK）—— 内容层（纯数据） */

export default {
  id: '05',
  key: 'coldchain',
  name: { zh: '低温信号链', en: 'Cryogenic Signal Chain · 4 K → 10 mK' },
  temperature: '4 K → 10 mK',
  accent: '#7fe3d4',
  audience: ['student', 'client'],
  summary: {
    zh: '最精细的活发生在最冷的地方：环行器、参量放大器、超导传输线。',
    en: 'The most delicate work happens at the coldest point: circulators, parametric amplifiers, superconducting lines.',
  },
  glossary: ['circulator', 'isolator', 'twpa', 'hemt', 'nbTi', 'quantum-limited-amplifier', 'readout-resonator'],
  chapters: [
    {
      key: 'coldchain-amp',
      label: 'LAYER 05 · COLD READOUT',
      title: { zh: '在最冷的地方做最精细的活', en: 'The Most Delicate Work Is at the Coldest Point' },
      vh: 120,
      pose: { from: { az: -70, el: 6, zoom: 1.05, tx: 0, ty: 0 } },
      stage: { clay: 0, bg: 0, dim: 0, xray: 0 },
      details: {
        zh: [
          '芯片读出的信号只有几个光子量级，任何一级放大器的噪声都会直接盖住它。',
          '所以放大要分三步：先用噪声最低的参量放大器（TWPA/JPA）在 10 mK 抬一次，再用环行器把信号与反射隔开，最后才交给 4 K 的 HEMT 继续放大。',
          '线材也换了一副：4 K 以下用超导 NbTi，直流电阻归零，代价是它有一条自己的临界温度线，绝不能超过。',
        ],
        en: [
          'The signal coming out of the chip is only a few photons strong; the noise of any single amplifier stage would bury it.',
          'So amplification happens in steps: a quantum-limited parametric amplifier (TWPA/JPA) lifts it first at 10 mK, circulators and isolators separate the outgoing signal from reflections, and a 4 K HEMT finishes the job.',
          'The wiring changes too: below 4 K the lines become superconducting NbTi with zero DC resistance — at the price of a critical temperature that must never be exceeded.',
        ],
      },
    },
  ],
};
