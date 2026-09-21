/* 03 · 信号链上段（300 K → 4 K）—— 内容层（纯数据） */

export default {
  id: '03',
  key: 'cabling',
  name: { zh: '信号链上段', en: 'Signal Chain · 300 K → 4 K' },
  temperature: '300 K → 4 K',
  accent: '#9ad1ff',
  audience: ['student', 'client'],
  summary: {
    zh: '一根线要走完的六级台阶：热锚、衰减、噪声温度。',
    en: 'Six thermal steps in one cable: anchoring, attenuation, noise temperature.',
  },
  glossary: ['coaxial-cable', 'thermal-anchor', 'attenuator', 'noise-temperature', 'thermal-conductance'],
  chapters: [
    {
      key: 'cabling-thermal',
      label: 'LAYER 03 · WIRING',
      title: { zh: '线也是热桥', en: 'The Cable Is a Heat Bridge' },
      vh: 120,
      pose: { from: { az: -175, el: 8, zoom: 0.96, tx: 0, ty: 0 } },
      stage: { clay: 0, bg: 0, dim: 0, xray: 0 },
      details: {
        zh: [
          '每一条从室温下来的同轴线，同时是电的通路和热的通路：它把 300 K 的热量往下带，而制冷机的冷量是有限的。',
          '所以线要在每一级冷板上"热锚"一次，把热量卸在那一级，而不是全带到最冷的芯片上。',
          '上段（300 K → 4 K）用不锈钢同轴，牺牲一点损耗换低导热；衰减器也在这里开始逐级压噪声。',
        ],
        en: [
          'Every coaxial line coming down from room temperature is both an electrical path and a thermal one: it carries 300 K of heat downwards, and the cooling power available is small.',
          'So each line is thermally anchored at every stage, dumping heat there instead of carrying all of it to the coldest chip.',
          'The upper section (300 K → 4 K) uses stainless-steel coax: a little more loss in exchange for much lower thermal conduction. Attenuators start the staged reduction of noise here.',
        ],
      },
    },
  ],
};
