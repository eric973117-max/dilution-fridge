/* 01 · 云端与编排 —— 内容层（纯数据）
   P0：章节骨架 + 中英双语首稿；3D 还是占位构件（见 module.js），技术审校待做。 */

export default {
  id: '01',
  key: 'cloud',
  name: { zh: '云端与编排', en: 'Cloud & Orchestration' },
  temperature: '软件层 · 300 K',
  accent: '#ffd479',
  audience: ['investor', 'client', 'student'],
  summary: {
    zh: '你按下"运行"之后的那几百毫秒。',
    en: 'The few hundred milliseconds after you press Run.',
  },
  glossary: ['quantum-circuit', 'transpiler', 'pulse-schedule', 'job-queue', 'shot'],
  chapters: [
    {
      key: 'cloud-job',
      label: 'LAYER 01 · JOB',
      title: { zh: '按一下"运行"之后', en: 'After You Press Run' },
      vh: 120,
      pose: { from: { az: -330, el: 14, zoom: 1.00, tx: 0, ty: 0.02 } },
      stage: { clay: 0, bg: 0, dim: 0, xray: 0 },
      details: {
        zh: [
          '你提交的不是一段代码，而是一个任务：一条线路、一种测量方式、要跑多少次。',
          '接下来的几百毫秒里，它要被编译成脉冲级的时序（逻辑门 → 物理门 → 每一条通道上的波形），排队，校验参数，最后交给控制电子学。',
          '这一层决定的是"你想算什么"；下面所有层只回答一件事：怎么把它变成电信号。',
        ],
        en: [
          'What you submit is not code but a job: a circuit, a measurement, and a number of shots.',
          'Over the next few hundred milliseconds it is compiled down to pulse-level schedules (logical gates → physical gates → waveforms on each channel), queued, validated, and handed to the control electronics.',
          'This layer decides what you want to compute; every layer below answers one question — how to turn that into electrical signals.',
        ],
      },
    },
  ],
};
