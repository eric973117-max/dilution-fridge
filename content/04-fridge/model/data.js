/* ==========================================================================
   内容源 · 唯一需要修改的数据文件
   segments.json 的等价物：八段功能拆分、规格、依赖关系
   ========================================================================== */

export const SPECS = {
  title: 'SPECS',
  rows: [
    /* 全部取自 Bluefors LD450 官方规格表，来源见 src/bluefors.js 的 SOURCES */
    ['MODEL', 'Bluefors LD450'],
    ['DIMENSIONS', 'Ø0.60 × 1.77 m'],
    ['BASE TEMP', '10 mK'],
    ['COOLING POWER', '450 µW @ 100 mK'],
    ['COOLING @ 20 mK', '14 µW'],
    ['MXC FLANGE', 'Ø294 mm'],
  ],
};

export const BOOT = [
  ['SYSTEM', 'DILUTION REFRIGERATOR'],
  ['DRAWING', 'DR-001 / SEGMENTED'],
  ['UNIT', 'mm / K'],
  ['SEGMENTS', '08 DETECTED'],
  ['BASE TEMP', '10 mK'],
  ['COOLDOWN', '< 24 h'],
];

/* span  · 这一段在整机里的空间形态：top | bottom | outer | full
   mode  · 分离策略：axial | radial | isolate | spotlight
   side  · 标注卡位置                                                      */

export const SEGMENTS = [
  {
    id: '01',
    en: 'STRUCTURAL FRAME',
    zh: '结构承载段',
    span: 'full',
    mode: 'isolate',
    side: 'right',
    pos: 'top',
    temp: '全温区',
    role: '三条 G10 支撑杆贯穿全高，把六级安装盘串在同一条中心轴上。',
    why: '八个功能段只是散落的零件，既无法保持同心，也做不到级与级之间的热隔离。',
    short: 'STRUCTURAL',
    specs: [
      ['支撑杆', '3 × G10'],
      ['安装盘', '6 级'],
      ['同心度', '±0.1 mm'],
      ['导热率', '<0.5 W/m·K'],
    ],
    snippet: ['"id": "01",', '"span": "full",', '"mode": "isolate"'],
    /* 锚点全部按参数化模型实测重写过（旧值还是程序化模型的米制坐标，
       引线照旧值找"最近的零件"自然指错）—— 下同。 */
    anchor: [0.220, 0.315, 0.000],        // 中间那块平台的外缘
    accent: '#ffffff',
    flip: null,
    cam:   { az: -6, el: 36, zoom: 0.94, tx: 0.0, ty: 0.08 },
    camTo: { az: 104, el: 54, zoom: 0.84, tx: 0.0, ty: 0.02 },
  },
  {
    id: '02',
    en: 'PRE-COOLING',
    zh: '预冷段',
    span: 'top',
    mode: 'axial',
    side: 'left',
    pos: 'top',
    temp: '50 K / 4 K',
    role: '脉冲管制冷机一级到 50 K、二级到 4 K，靠机械做功完成第一级降温。',
    why: '就只能靠不断消耗液氦来降温，机器无法连续运行。',
    short: 'PRE-COOL',
    specs: [
      ['一级冷头', '50 K'],
      ['二级冷头', '4 K'],
      ['冷却方式', '脉冲管'],
      ['液氦', '不需要'],
    ],
    snippet: ['"id": "02",', '"span": "top",', '"mode": "axial"'],
    anchor: [0.143, 0.674, -0.143],       // 右侧脉冲管冷头
    accent: '#bcd0ff',
    flip: ['y', 0.40],
    cam:   { az: 104, el: 54, zoom: 0.84, tx: 0.0, ty: 0.02 },
    camTo: { az: 216, el: -24, zoom: 1.28, tx: 0.0, ty: 0.46 },
  },
  {
    id: '03',
    en: 'VACUUM & SHIELDING',
    zh: '真空与辐射屏蔽段',
    span: 'outer',
    mode: 'radial',
    side: 'right',
    pos: 'mid',
    temp: '300 K → 4 K',
    role: '真空罩消除气体对流，50 K 与 4 K 两级屏蔽筒逐级挡掉室温黑体辐射。',
    why: '4 K 的冷量会被辐射漏热在几分钟内耗尽。',
    short: 'SHIELDING',
    specs: [
      ['真空度', '10⁻⁶ mbar'],
      ['辐射罩', '4 级 · 50K→MXC'],
      ['外罩', '真空 · 不锈钢'],
      ['主要漏热', '辐射'],
    ],
    snippet: ['"id": "03",', '"span": "outer",', '"mode": "radial"'],
    anchor: [0.350, 0.100, 0.000],        // 真空外罩筒壁（罩子在结尾才逐层出现）
    accent: '#9ab8ff',
    flip: null,
    cam:   { az: 216, el: -24, zoom: 1.02, tx: 0.0, ty: 0.46 },
    camTo: { az: 330, el: 18, zoom: 0.78, tx: 0.0, ty: 0.06 },
  },
  {
    id: '04',
    en: 'DILUTION CIRCUIT',
    zh: '稀释循环段',
    span: 'bottom',
    mode: 'spotlight',
    side: 'left',
    pos: 'mid',
    hero: true,
    core: true,
    temp: '0.9 K → 10 mK',
    role: 'He-3 从浓相穿过相界面进入稀相时吸热，Still、连续热交换器与混合室构成闭环。',
    why: '机器只能停在 4 K；全机只有这一段产生冷量，其余七段都在为它服务。',
    short: 'DILUTION',
    specs: [
      ['基础温度', '10 mK'],
      ['冷却功率', '450 µW @ 100 mK'],
      ['工质', 'He-3 / He-4'],
      ['相分离温度', '0.87 K'],
    ],
    snippet: ['"id": "04",', '"mode": "spotlight",', '"core": true'],
    anchor: [0.040, 0.065, 0.040],        // 中央稀释单元（换热器柱）
    accent: '#3f6dff',
    flip: ['y', 0.5],
    cam:   { az: 330, el: 18, zoom: 0.78, tx: 0.0, ty: 0.06 },
    camTo: { az: 448, el: -30, zoom: 1.55, tx: 0.24, ty: -0.30 },
  },
  {
    id: '05',
    en: 'SIGNAL DISTRIBUTION',
    zh: '信号输入段',
    span: 'full',
    mode: 'isolate',
    side: 'right',
    pos: 'bottom',
    temp: '300 K → 10 mK',
    role: '这一段管的是 300 K 到 4 K 的输入配线：微波控制线与直流偏置线从室温馈通进来，'
      + '沿各级衰减器逐级下行，每到一块冷板就用夹块把热量锚在板上。',
    why: '室温的噪声和漏热会顺着线灌下来，量子比特既收不到干净的指令，也读不出结果。',
    short: 'SIGNAL',
    specs: [
      ['微波线', '输入 / 读出'],
      ['温度跨度', '300 K → 4 K'],
      ['衰减', '分级 ~20 dB'],
      ['热锚', '每级独立夹块'],
    ],
    snippet: ['"id": "05",', '"span": "full",', '"mode": "isolate"'],
    anchor: [0.250, 0.300, 0.000],        // 顶部线束树的外缘
    accent: '#7ea4ff',
    flip: null,
    cam:   { az: 448, el: -30, zoom: 1.12, tx: 0.24, ty: -0.30 },
    camTo: { az: 570, el: 24, zoom: 0.86, tx: 0.0, ty: 0.02 },
  },
  {
    id: '06',
    en: 'SUPERCONDUCTING LINK',
    zh: '超导传输段',
    span: 'bottom',
    mode: 'isolate',
    side: 'left',
    pos: 'mid',
    temp: '4 K 以下',
    role: '这一段是同一串线的下半截：4 K 以下换成 NbTi 超导同轴线，'
      + '从 4 K 冷板一路接到混合室与芯片，让微弱的量子信号几乎零损耗地走完最后一段。',
    why: '普通金属同轴在 mK 温区有电阻，信号会被吃掉、还带进热噪声 —— 读出的信噪比立不起来。',
    short: 'SUPERCOND',
    specs: [
      ['材料', 'NbTi 超导'],
      ['温度跨度', '4 K → 10 mK'],
      ['传输损耗', '趋近于 0'],
      ['结构', '同轴屏蔽'],
    ],
    snippet: ['"id": "06",', '"span": "bottom",', '"mode": "isolate"'],
    anchor: [0.200, -0.160, 0.200],       // 4 K 以下那段超导同轴线束
    accent: '#6f95ff',
    flip: null,
    cam:   { az: 570, el: 24, zoom: 0.86, tx: 0.0, ty: 0.02 },
    camTo: { az: 436, el: 46, zoom: 1.20, tx: 0.0, ty: -0.26 },
  },
  {
    id: '07',
    en: 'ISOLATION & AMPLIFICATION',
    zh: '隔离与放大段',
    span: 'bottom',
    mode: 'spotlight',
    side: 'right',
    pos: 'mid',
    temp: '4 K / 10 mK',
    role: '低温隔离器让信号单向通过、阻止热噪声回流；4 K 与 10 mK 两级放大器把 nW 级读出信号抬到室温设备可读。',
    why: '噪声会顺着信号线爬回量子比特，把相干性毁掉。',
    short: 'ISOLATION',
    specs: [
      ['隔离器', '2 级'],
      ['放大器', '4 K + 10 mK'],
      ['噪声', '近量子极限'],
      ['增益', '~20 dB'],
    ],
    snippet: ['"id": "07",', '"mode": "spotlight",', '"deps": "cooling,signal"'],
    anchor: [-0.013, -0.547, -0.047],     // MXC 下方的四通道读出链
    accent: '#4d7dff',
    flip: ['y', -0.5],
    cam:   { az: 436, el: 46, zoom: 1.00, tx: 0.0, ty: -0.26 },
    camTo: { az: 320, el: -4, zoom: 1.50, tx: -0.10, ty: -0.34 },
  },
  {
    id: '08',
    en: 'MAGNETIC SHIELDING & PROCESSOR',
    zh: '磁屏蔽与量子芯片段',
    span: 'bottom',
    mode: 'axial',
    side: 'left',
    pos: 'bottom',
    hero: true,
    temp: '<10 mK',
    role: 'Cryoperm 高磁导率罩屏蔽地磁场与杂散辐射，超导量子比特芯片在最冷处工作。',
    why: '环境磁场会让量子比特退相干，热激发概率也压不到可忽略。',
    short: 'PROCESSOR',
    specs: [
      ['屏蔽', 'Cryoperm 合金'],
      ['芯片', '超导量子比特'],
      ['热激发', '∝ e^(−ΔE/kT)'],
      ['芯片尺度', '~ mm 级'],
    ],
    snippet: ['"id": "08",', '"span": "bottom",', '"mode": "axial"'],
    anchor: [0.000, -0.509, 0.034],       // 量子芯片封装
    accent: '#2b5bff',
    flip: ['y', 0.5],
    cam:   { az: 320, el: -4, zoom: 1.14, tx: -0.10, ty: -0.34 },
    camTo: { az: 262, el: 78, zoom: 2.80, tx: 0.0, ty: -0.86 },
  },
];

/* 依赖图：三类关系 + 承载总线
   type: support | cooling | signal | shield                                        */

export const DEPS = [
  { from: '01', to: '02', type: 'support' },
  { from: '01', to: '04', type: 'support' },
  { from: '01', to: '05', type: 'support' },
  { from: '01', to: '08', type: 'support' },
  { from: '02', to: '03', type: 'cooling' },
  { from: '02', to: '04', type: 'cooling' },
  { from: '04', to: '08', type: 'cooling' },
  { from: '05', to: '06', type: 'signal' },
  { from: '06', to: '07', type: 'signal' },
  { from: '07', to: '08', type: 'signal' },
  { from: '03', to: '08', type: 'shield' },
];

/* 信号链路追踪：从 300 K 接头一路走到量子芯片上的节点                            */

export const SIGNAL_NODES = [
  { t: 0.0, label: 'INPUT', temp: '300 K' },
  { t: 0.22, label: 'ATT', temp: '50 K' },
  { t: 0.42, label: 'ATT + AMP', temp: '4 K' },
  { t: 0.62, label: 'ISO', temp: '100 mK' },
  { t: 0.82, label: 'TWPA', temp: '10 mK' },
  { t: 1.0, label: 'QUBIT', temp: '10 mK' },
];

export const SEGMENT_BY_ID = SEGMENTS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

/* ============================================================== 步数刻度 ====
   HUD 上那个数字的总量。100 太挤：每一"步"摊到的滚动行程太短，
   结尾几段（定格 / 套罩 / 收尾）和 3–9 步那轮冷盘讲解都被赶着播完。
   这里放开到 160 步 —— 步数只是刻度，改它不会动动画本身，
   真正决定每段有多长的是 motion.js 里各章的 vh（见 README 的时间轴表）。 */
export const TOTAL_STEPS = 160;

/* ============================================================== 屏蔽层 ====
   结尾「逐层套罩」用。order 决定套上的先后（由内到外）；
   stage 负责把这层说明认领到参数化模型里对应的那块罩子上 ——
   四级辐射罩分别锚在 50 K / 4 K / Still / MXC 冷板上，真空外罩锚在室温顶法兰上。
   （Cryoperm 磁屏蔽是芯片级的，属于 08 段，不算这一叠。） */
export const SHIELD_LAYERS = [
  {
    component: 'magnetic',
    order: 0,
    name: 'Cryoperm 磁屏蔽',
    en: 'CRYOPERM MAGNETIC SHIELD',
    temp: '10 mK 级',
    material: '高磁导率合金',
    note: '最里一层，直接套在芯片封装外面：把环境磁场挡在超导比特之外，抑制磁通噪声。它不属于四级辐射罩那一叠，是芯片级屏蔽。',
  },
  {
    component: 'radiation',
    stage: 'mc',
    order: 1,
    name: 'MXC 辐射罩',
    en: 'MXC RADIATION SHIELD',
    temp: '10 mK 级',
    material: '铜',
    note: '最内一层：罩住混合室与量子芯片，挡住 4 K 罩自身发出的辐射。芯片外层另有 Cryoperm 磁屏蔽。',
  },
  {
    component: 'radiation',
    stage: 'still',
    order: 2,
    name: 'Still 辐射罩',
    en: 'STILL RADIATION SHIELD',
    temp: '0.9 K 级',
    material: '铜',
    note: '接在蒸馏室温级上：100 mK 以下的器件靠它挡住来自 4 K 罩的热辐射。',
  },
  {
    component: 'radiation',
    stage: '4k',
    order: 3,
    name: '4 K 辐射罩',
    en: '4 K RADIATION SHIELD',
    temp: '3 K 级',
    material: '铝',
    note: '锚在 4 K 冷板上：HEMT 与各级衰减器都在它里面，往外才是 50 K 那一层。',
  },
  {
    component: 'radiation',
    stage: '50k',
    order: 4,
    name: '50 K 辐射罩',
    en: '50 K RADIATION SHIELD',
    temp: '35 K 级',
    material: '铝',
    note: '最外一道辐射边界：先把室温壁的黑体辐射压到 50 K 量级，里面的几层才挡得住。',
  },
  {
    component: 'vacuum',
    stage: 'room',
    order: 5,
    name: '真空外罩',
    en: 'OUTER VACUUM CHAMBER',
    temp: '300 K',
    material: '不锈钢',
    note: '抽真空消除气体对流。它与四级辐射罩合起来，构成整机对外的隔热边界。',
  },
];

/* ============================================================ 冷盘标签 ====
   前面各章在"合适的位置"标出：这是第几级冷盘、多冷、管什么。
   盘名与温度取自参数化模型自己的六块平台，这里只补一句"特点"。 */
export const PLATE_NOTES = {
  room: '65 路 RF 馈通与双脉冲管接口都装在这里；室温真空边界。',
  '50k': '一级预冷：脉冲管一级用铜编织带热锚，线缆先在这里降到 35 K。',
  '4k': '二级预冷：4 个 HEMT 与驱动 / 磁通 / 泵浦衰减器都装在这一级。',
  still: '抽走氦-3 蒸气：稀释制冷的"泵"就是它，下面接连续换热器。',
  cold: '100 mK：环行器与中段衰减所在，四通道读出链在这里换段。',
  mc: '10 mK：混合室容器与芯片，整机最冷处，也是全机冷量的来源。',
};

/* 章 → 要标出来的冷盘（只在该章讲得到它们的时候出现） */
export const PLATE_CHAPTERS = {
  seg01: ['room'],
  seg02: ['50k', '4k'],
  seg03: ['50k', '4k'],
  seg04: ['still', 'cold', 'mc'],
  seg07: ['cold'],
  seg08: ['mc'],
  /* 06 讲的是这串线的下半截，所以把 4 K 冷板标出来 —— 它就是那条分界线 */
  seg06: ['4k'],
  xray: ['50k', '4k', 'still', 'mc'],
};

/* 冷盘 / 腔室的温度色（沿用页面那条"300 K 白 → 10 mK 深蓝"的色阶：
   变色本身就是"这块盘有多冷"的读数，不是装饰） */
export const PLATE_COLORS = {
  room: '#ffffff',
  '50k': '#cfe0ff',
  '4k': '#9ab8ff',
  still: '#6f95ff',
  cold: '#4d7dff',
  mc: '#2b5bff',
};

/* 3–9 步的"冷盘与腔室通览"。
   这一段机位是俯视整体（boot 尾 → overview），六块盘和两个腔体分得最开，
   所以把冷盘/腔室在这里依次交待清楚：每块轮到时高亮 + 变色 + 展开一句特点。 */
export const PLATE_TOUR = {
  from: 5,
  to: 19,
  order: ['room', '50k', '4k', 'still', 'cold', 'mc', 'mxcvessel', 'vacuum'],
};

/* 两个腔体（不是冷盘，所以单独给位置与半径；单位 mm，和参数化模型同坐标系）：
   · 混合室腔：MXC 板上方的容器，芯片在里面；
   · 真空腔：真空外罩包出来的那个空间 —— 罩子默认不画，但腔体边界一直在。 */
export const CHAMBERS = [
  {
    id: 'mxcvessel',
    name: '混合室腔',
    en: 'MIXING CHAMBER VESSEL',
    temp: '10 mK',
    note: '浓相与稀相的相界面就在里面：氦-3 穿过界面吸热，这是整台机器唯一的冷源。',
    yMM: -430,
    radiusMM: 150,
  },
  {
    id: 'vacuum',
    name: '真空腔',
    en: 'VACUUM CHAMBER',
    temp: '300 K 外壁',
    note: '外罩内抽到 10⁻⁶ mbar：没有气体就没有对流，剩下只有辐射，才轮到四级辐射罩去挡。',
    yMM: 120,
    radiusMM: 348,
  },
];

/* 结尾「逐层套罩」那章的抬头文案 */
export const SHIELD_HUD = {
  en: 'SHIELDING STACK',
  zh: '四级辐射罩由内向外依次套上，最外面是真空外罩',
};
