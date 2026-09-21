/* 02 · 室温控制电子学 —— 内容层（纯数据）
   几何在 ./model/rack.js（按客户提供的两张工程图建模，黑白线稿风格）。
   章节结构：机柜总览 → 十台设备各一章（抽出展示）→ 三块自制板卡 → 低温线束。 */

/* 规格表的键：中英对照（值不翻译，都是读数） */
const SPEC_EN = {
  尺寸: 'Size', 分辨率: 'Resolution', 接口: 'Interfaces', 安装: 'Mounting',
  CPU: 'CPU', 内存: 'Memory', 存储: 'Storage', 扩展: 'Expansion',
  端口: 'Ports', 速率: 'Speed', 管理: 'Management', 供电: 'Power',
  频率: 'Frequency', 稳定度: 'Stability', 相位噪声: 'Phase noise', 输出: 'Output',
  通道数: 'Channels', 采样率: 'Sample rate', 垂直分辨率: 'Vertical resolution', 带宽: 'Bandwidth',
  脉冲宽度: 'Pulse width', 重复频率: 'Repetition rate', 上升下降: 'Rise / fall', 输出幅度: 'Amplitude',
  采样: 'Sampling', 分辨率: 'Resolution', 输入范围: 'Input range', 总线: 'Bus',
  电压范围: 'Voltage range', 电流范围: 'Current range', 纹波: 'Ripple',
  频率范围: 'Frequency range', 调制: 'Modulation', 通道: 'Channels',
  输入电压: 'Input voltage', 额定电流: 'Rated current', 保护: 'Protection',
};

const spec = (rows) => rows.map(([k, v]) => ({ k: { zh: k, en: SPEC_EN[k] || '' }, v }));

/* 十台设备：h 是面板高度（mm），ty 是它在机柜里的中心高度（米，给机位用），zoom 是抽出后的取景 */
const DEVICES = [
  {
    key: 'display', label: 'TOUCH PANEL · 19"', zh: '监控显示器（触摸屏）', en: 'Touch panel display',
    h: 356, ty: 0.674, zoom: 3.6,
    specs: spec([['尺寸', '19 英寸'], ['分辨率', '1920 × 1080'], ['接口', 'HDMI / USB / LAN'], ['安装', '机柜嵌入式']]),
    textZh: ['最上面这块 19 英寸触摸屏是机柜的"脸"：本地显示各通道状态、校准进度、报错，也可以直接在上面改参数。',
      '它不参与实时控制回路 —— 时序与波形由下面的仪器和板卡负责，屏幕只负责让人看得见。'],
    textEn: ['The 19-inch touch panel at the top is the rack’s face: it shows per-channel status, calibration progress and faults, and you can change parameters directly on it.',
      'It is not part of the real-time control loop — timing and waveforms belong to the instruments below; the panel is there so a human can see what is going on.'],
  },
  {
    key: 'ipc', label: 'IPC · HOST', zh: '主控计算机（工业 PC）', en: 'Host computer (industrial PC)',
    h: 178, ty: 0.401, zoom: 4.4,
    specs: spec([['CPU', '多核工业级'], ['内存', '32 GB DDR4'], ['存储', '1 TB SSD'], ['扩展', '4 × PCIe'], ['端口', '4 × 1 GbE']]),
    textZh: ['主控计算机跑的是"你说的算的那一层"：编译线路、排队、把波形下发给 AWG 与脉冲发生器，再把采集回来的数据落盘。',
      '它通过 PCIe 与采集/时序卡对接，通过千兆网与上位机和交换机连在一起 —— 实时性要求高的部分不在它身上，但整条链的调度归它管。'],
    textEn: ['The host computer runs the layer you actually talk to: compiling circuits, queueing jobs, pushing waveforms to the AWG and pulse generator, and storing the data that comes back.',
      'It talks to the DAQ and timing cards over PCIe and to the outside world over gigabit Ethernet — the hard real-time work is not here, but the orchestration of the whole chain is.'],
  },
  {
    key: 'switch', label: 'SWITCH · 24×1G', zh: '网络交换机', en: 'Network switch',
    h: 89, ty: 0.262, zoom: 6.2,
    specs: spec([['端口', '24 × 千兆'], ['速率', '10 / 100 / 1000 Mbps'], ['管理', 'Web / CLI'], ['供电', '220 VAC']]),
    textZh: ['交换机把机柜里所有"需要说话"的设备连成一张网：主控计算机、采集机箱、时序卡、上位机。',
      '它与时钟那条链是分开的：网负责数据与命令，时钟负责纳秒级的同步 —— 两件事不能混在一根线上。'],
    textEn: ['The switch ties everything that needs to talk into one network: host computer, DAQ chassis, timing cards, and the control workstation.',
      'It is deliberately separate from the clock chain: the network carries data and commands, the clock carries nanosecond synchronisation — mixing the two on one line is how timing quietly breaks.'],
  },
  {
    key: 'clock', label: 'REF CLOCK · 10 MHz', zh: '10 MHz 参考时钟源', en: '10 MHz reference clock',
    h: 89, ty: 0.167, zoom: 6.2,
    specs: spec([['频率', '10 MHz'], ['稳定度', '≤ 1 × 10⁻¹²'], ['相位噪声', '-140 dBc/Hz @ 1 Hz'], ['输出', '多路 10 MHz']]),
    textZh: ['整柜的时基就是这台 10 MHz 参考时钟：它往下分发到 AWG、脉冲发生器和采集卡，所有通道都对它锁相。',
      '为什么放在这么高的位置？因为分发的线越短、路径越一致，通道之间的偏差就越小 —— 相位差几百皮秒，两个门之间就会算错。'],
    textEn: ['The time base of the whole rack is this 10 MHz reference: it distributes down to the AWG, the pulse generator and the DAQ cards, and every channel locks to it.',
      'Why does it sit so high? Because shorter, more identical distribution paths mean smaller skew between channels — a few hundred picoseconds of phase error is enough to get a two-qubit gate wrong.'],
  },
  {
    key: 'awg', label: 'AWG · 4 CH', zh: '任意波形发生器', en: 'Arbitrary waveform generator',
    h: 178, ty: 0.027, zoom: 4.4,
    specs: spec([['通道数', '4'], ['采样率', '5 GSa/s'], ['垂直分辨率', '16 bit'], ['带宽', '1 GHz'], ['存储', '1 Gpts']]),
    textZh: ['任意波形发生器把"一个门"变成真实的电压包络：I/Q 两路基带信号，靠 IQ 调制搬到量子比特的频率上。',
      '它决定了门有多准：采样率与垂直分辨率越高，包络越接近设计形状；波形存储决定了你能一次下发多长的序列，不必反复中断重载。'],
    textEn: ['The arbitrary waveform generator turns a gate into a real voltage envelope: two baseband channels, I and Q, which IQ modulation then shifts up to the qubit frequency.',
      'It sets how accurate a gate can be: more sample rate and more vertical resolution means the envelope is closer to the designed shape, and the waveform memory decides how long a sequence you can push out before having to reload.'],
  },
  {
    key: 'pg', label: 'PG · 8 CH', zh: '脉冲发生器', en: 'Pulse generator',
    h: 89, ty: -0.113, zoom: 6.2,
    specs: spec([['通道数', '8'], ['脉冲宽度', '1 ns – 10 µs'], ['重复频率', '1 Hz – 100 MHz'], ['上升下降', '< 1 ns'], ['输出幅度', '0 – 5 V']]),
    textZh: ['脉冲发生器管的是"什么时候"：门什么时候开、读出窗口什么时候来、哪一路触发哪一路。',
      '它的指标里最要命的是上升/下降时间与通道间抖动 —— 亚纳秒的边沿，配合 < 1 ns 的通道对齐，才谈得上并行控制多路比特。'],
    textEn: ['The pulse generator is in charge of when: when a gate opens, when the readout window arrives, which channel triggers which.',
      'Its critical specs are rise/fall time and channel-to-channel jitter — sub-nanosecond edges, aligned across channels to under a nanosecond, are what makes parallel control of many qubits possible.'],
  },
  {
    key: 'daq', label: 'DAQ CHASSIS', zh: '采集机箱与采集卡', en: 'DAQ chassis and cards',
    h: 267, ty: -0.297, zoom: 4.0,
    specs: spec([['通道数', '16（模拟 / 数字）'], ['采样率', '1 MSa/s'], ['分辨率', '16 bit'], ['输入范围', '± 10 V'], ['总线', 'PXIe / PCIe']]),
    textZh: ['采集机箱里插的是慢变量监测卡：温度、压力、偏置漂移、电源电流 —— 这些量都不快，但它们是"机器今天和昨天不一样"的原因。',
      '它与读出的高速 ADC 分工明确：高速那条链负责读出量子态，这条链负责看住环境与漂移。'],
    textEn: ['The DAQ chassis holds the slow-variable cards: temperature, pressure, bias drift, supply current — none of them fast, and all of them the reason a machine behaves differently today than it did yesterday.',
      'Its division of labour with the high-speed readout is clean: the fast chain reads out the quantum state, this chain watches the environment and the drift.'],
  },
  {
    key: 'dc', label: 'DC BIAS · 8 CH', zh: '多路直流电源', en: 'Multi-channel DC supply',
    h: 89, ty: -0.481, zoom: 6.2,
    specs: spec([['输出电压', '0 – 30 V'], ['电流范围', '0 – 5 A / 通道'], ['纹波', '< 1 mVrms'], ['接口', 'LAN / USB']]),
    textZh: ['多路直流电源给磁通偏置与低温电子学供电：量子比特的工作点靠一个很小的直流偏置定住，偏置一抖，频率就漂。',
      '所以这一级的指标看的是纹波和长期漂移，而不是功率 —— 毫伏级的噪声落到磁通线上，就是一个退相干源。'],
    textEn: ['The DC supplies power the flux bias and the cryogenic electronics: a qubit’s operating point is set by a very small DC bias, and when that bias moves, the frequency moves with it.',
      'So what matters here is ripple and long-term drift, not wattage — millivolt noise on a flux line is a decoherence source.'],
  },
  {
    key: 'rf', label: 'RF SOURCE · 10 MHz – 26.5 GHz', zh: '射频源（微波）', en: 'RF source (microwave)',
    h: 178, ty: -0.620, zoom: 4.4,
    specs: spec([['频率范围', '10 MHz – 26.5 GHz'], ['输出幅度', '-110 – +20 dBm'], ['相位噪声', '-135 dBc/Hz @ 1 kHz'], ['调制', 'AM / FM / φM / IQ']]),
    textZh: ['射频源提供载波：量子比特工作在 4–20 GHz，所有门都是"把基带包络搬到一个微波频率上"。',
      '它紧挨着机柜出口不是偶然 —— 微波线越长损耗越大，而且要和后面的低温链路共用一套衰减与放大设计。'],
    textEn: ['The RF source provides the carrier: qubits live at 4–20 GHz, and every gate is a baseband envelope shifted up onto one of those frequencies.',
      'Its position next to the rack exit is not accidental — microwave loss grows with cable length, and the attenuation and amplification plan has to be shared with the cryogenic chain that follows.'],
  },
  {
    key: 'pdu', label: 'PDU · 8×C13', zh: '机柜电源分配单元', en: 'Power distribution unit',
    h: 89, ty: -0.760, zoom: 6.2,
    specs: spec([['输入电压', '200 – 240 VAC'], ['输出', '8 × C13 + 2 × C19'], ['额定电流', '32 A'], ['保护', '过载 / 短路 / 浪涌']]),
    textZh: ['电源分配单元在最底下：就近接地、短的供电路径、分区开关。',
      '它可以远程监控每一路的电流 —— 整柜 ≤ 5 kW 的预算就是靠它守住的，哪一路异常它先知道。'],
    textEn: ['The PDU sits at the bottom: close to building ground, short supply paths, and per-outlet switching.',
      'It can meter the current on each outlet — that is how the rack stays inside its ≤5 kW budget, and it is the first thing to notice when one branch misbehaves.'],
  },
];

/* hero = 这一台值得"推近看"（冰箱那层也是这么分的：hero 段给 140vh，其余 100vh）。
   机位沿一个方向连续环绕（az 每章 -32°，整层扫过约 320°），俯仰与远近交替 ——
   整段看下来是一条不断的曲线，而不是"一章一个静止画面"。 */
const HERO = new Set(['display', 'awg', 'daq', 'rf']);
const DEVICE_CHAPTERS = DEVICES.map((d, i) => ({
  key: `electronics-${d.key}`,
  device: d.key,
  label: `LAYER 02 · ${String(i + 1).padStart(2, '0')} ${d.label.split(' · ')[0]}`,
  title: { zh: d.zh, en: d.en },
  vh: HERO.has(d.key) ? 140 : 100,
  /* 设备抽出后落在机柜右侧的展示位（x +700mm），所以机位往右让一点，两边都在画面里 */
  /* 机位要同时装下机柜和抽出来的那台设备，所以比单看一台时远一档 */
  pose: {
    from: {
      /* 正面偏右 35° 起，每章绕 20° —— 抽屉往外拉在这条机位上看得很清楚 */
      az: -325 - i * 20,
      /* 取景硬约束：整柜必须完整在画面里。名义取景 2.208 m、柜高 2 m，
         所以 zoom ≤ 0.95 才装得下 —— hero 章 0.90 取近，其余 0.74。 */
      el: HERO.has(d.key) ? 22 : 12,
      zoom: HERO.has(d.key) ? 0.90 : 0.74,
      tx: -0.05,
      ty: d.ty,
    },
  },
  stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
  plates: [d.key],
  panelHeight: d.h,
  details: { zh: d.textZh, en: d.textEn },
  specs: d.specs,
}));

export default {
  id: '02',
  key: 'electronics',
  name: { zh: '室温控制电子学', en: 'Room-Temperature Control Electronics' },
  temperature: '300 K',
  accent: '#ffb066',
  audience: ['client', 'student'],
  summary: {
    zh: '一台 2 米机柜、十台设备逐个抽出来看，外加三块自制板卡与一卷 3 米低温线束。',
    en: 'A two-metre rack: ten instruments pulled out one by one, plus three in-house boards and a three-metre cryogenic loom.',
  },
  glossary: ['awg', 'fpga', 'dac', 'iq-modulation', 'lo', 'room-temperature-electronics', 'coaxial-cable', 'attenuator', 'nbTi'],
  chapters: [
    {
      key: 'electronics-rack',
      label: 'LAYER 02 · RACK',
      title: { zh: '机柜与设备布局', en: 'Rack and Equipment Layout' },
      vh: 130,
      /* 起点几乎是正面（az −352 ≈ 正面偏右 8°）：先让观众看到"一台关着的机柜"，
         后面各章再一圈圈绕过去。tx 为负 = 画面里把机柜往右让，左边留给名牌与说明。 */
      pose: { from: { az: -352, el: 5, zoom: 0.62, tx: -0.18, ty: 0.05 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['display', 'awg', 'daq', 'rf', 'pdu'],
      details: {
        zh: [
          '一台 19 英寸机柜，2000 × 600 × 1000 mm，前面从上到下装十台设备。顺序不是随便排的：时钟在最上面往下分发，因为所有通道的时序都要对齐到它；射频源紧挨着出口，微波线越短越好；电源分配单元在最底下，就近接地。',
          '往下每一次滚动，就有一台设备从机柜里抽出来，单独讲它在这条链里管什么、指标卡在哪。',
        ],
        en: [
          'One 19-inch rack, 2000 × 600 × 1000 mm, with ten instruments from top to bottom. The order is not arbitrary: the clock sits up top so it can distribute downwards, because every channel is timed against it; the RF source sits next to the exit because microwave lines should be short; the PDU sits at the bottom, close to building ground.',
          'Every time you scroll on, one more instrument slides out of the rack and gets explained on its own: what it does in the chain, and which specification actually matters.',
        ],
      },
      specs: spec([['尺寸', '2000 × 600 × 1000 mm'], ['设备数量', '10'], ['通道数', '≥ 1024'], ['供电', '≤ 5 kW']]),
    },
    ...DEVICE_CHAPTERS,
    {
      key: 'electronics-boards',
      label: 'LAYER 02 · BOARDS',
      title: { zh: '三块自制板卡', en: 'Three In-House Boards' },
      vh: 140,
      pose: { from: { az: -300, el: 24, zoom: 3.20, tx: 0, ty: 0.06 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['fpga', 'bias', 'rf'],
      details: {
        zh: [
          '买来的仪器只解决"标准信号"；这一层要控 1024 路，多通道扩展只能自己做板卡。',
          '控制主板（160 × 100 mm）以 FPGA 为核心：DDR 缓存波形、光口与网口回传、SMA 收发时钟；多通道直流偏置板（180 × 120 × 25 mm）把 8 路 DAC 与运放做在一块板上；射频/微波模块（200 × 100 × 80 mm）是一个金属屏蔽腔，功放、IQ 调制器、混频器都关在里面。',
        ],
        en: [
          'Bought instruments only cover standard signals; this layer controls 1024 channels, and multi-channel scaling has to be built in house.',
          'The control board (160 × 100 mm) is built around an FPGA: DDR buffers waveforms, optical and Ethernet links send data back, SMA ports carry clock; the DC bias board (180 × 120 × 25 mm) puts eight DACs and their op-amps on one board; the RF/microwave module (200 × 100 × 80 mm) is a milled shield cavity holding the power amplifier, IQ modulator and mixer.',
        ],
      },
      specs: spec([['控制主板', '160 × 100 mm · FPGA'], ['直流偏置板', '180 × 120 × 25 mm · 8 通道'], ['射频模块', '200 × 100 × 80 mm'], ['采样率', '≥ 10 GSa/s']]),
    },
    {
      key: 'electronics-wiring',
      label: 'LAYER 02 · WIRING',
      title: { zh: '三米低温线束', en: 'The Three-Metre Cryogenic Loom' },
      vh: 140,
      pose: { from: { az: -270, el: 10, zoom: 0.60, tx: 0.30, ty: -0.02 } },
      stage: { clay: 1, bg: 1, dim: 0, xray: 0 },
      plates: ['coax', 'nbti', 'block'],
      details: {
        zh: [
          '机柜与稀释制冷机之间是这段线束（L = 3000 mm，可按设备定制）：8 路低温同轴线、2 路超导线、1 组双绞控制线、2 路光纤。',
          '每 500 mm 一个低温固定胶块，把线束绑在支撑上；两端都是 SMA 法兰：机柜端接室温电子学，另一端接制冷机的室温法兰，进了制冷机之后才逐级换线、逐级衰减。',
        ],
        en: [
          'Between the rack and the dilution refrigerator runs this loom (L = 3000 mm, made to order): eight cryogenic coax lines, two superconducting lines, one twisted-pair control bundle and two optical fibres.',
          'A cryogenic clamp every 500 mm ties the loom to its support, and both ends are SMA flanges: the rack end meets room-temperature electronics, the far end meets the refrigerator’s room-temperature flange. Only inside the cryostat do the lines change type and get attenuated stage by stage.',
        ],
      },
      specs: spec([['线束长度', '3000 mm（可定制）'], ['低温同轴', '8 路'], ['超导线', '2 路（4 K 以下）'], ['光纤', '2 路']]),
    },
  ],
};
