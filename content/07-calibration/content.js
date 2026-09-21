/* 07 · 校准与纠错 —— 内容层（纯数据） */

export default {
  id: '07',
  key: 'calibration',
  name: { zh: '校准、纠错与应用', en: 'Calibration, Error Correction & Applications' },
  temperature: '10 mK + 软件层',
  accent: '#b8f0a0',
  audience: ['investor', 'student'],
  summary: {
    zh: '从一台噪声很大的机器，到一台能算的机器。',
    en: 'From a very noisy machine to a useful one.',
  },
  glossary: ['rabi', 't1-t2', 'randomized-benchmarking', 'gate-fidelity', 'quantum-error-correction', 'surface-code', 'error-mitigation'],
  chapters: [
    {
      key: 'calibration-cycle',
      label: 'LAYER 07 · CALIBRATION',
      title: { zh: '把它校准成一台能算的机器', en: 'Calibrating a Machine You Can Compute With' },
      vh: 130,
      pose: { from: { az: 80, el: 12, zoom: 1.00, tx: 0, ty: 0.02 } },
      stage: { clay: 0, bg: 0, dim: 0, xray: 0 },
      details: {
        zh: [
          '校准是一圈一圈往回收的：先找到共振频率，再定 π 脉冲的幅度，再测能量弛豫 T1、相位退相干 T2，最后用随机基准测试给每一类门打一个保真度分数。',
          '得到的不是一个"完美的量子比特"，而是一组随时会漂移的参数 —— 所以真实的量子计算机，每天都要重新校准一遍。',
          '再往上才是纠错与应用：把许多物理比特编码成一个逻辑比特，用测量换稳定；或者先在含噪声的机器上跑一个化学、材料、优化的问题，用它换一个现在算不动的答案。',
        ],
        en: [
          'Calibration works inwards in layers: find the resonance, fix the amplitude of the π pulse, measure energy relaxation T1 and phase decoherence T2, then score each class of gate with randomized benchmarking.',
          'What you end up with is not a perfect qubit but a set of parameters that drift — which is why a real quantum computer is recalibrated every day.',
          'Above that comes error correction and applications: encoding many physical qubits into one logical qubit and trading measurement for stability, or running chemistry, materials and optimisation problems on a noisy machine today in exchange for an answer classical hardware cannot reach.',
        ],
      },
    },
  ],
};
