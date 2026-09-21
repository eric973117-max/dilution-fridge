/* ==========================================================================
   标高

   网站现在只有一套几何：cryo-atlas 的 XLD v2 参数化模型（src/atlas/model.js，
   也就是 CodeBuddy 演示页默认显示的那台）。下面 XLD 这一段是它唯一的标高来源：
   六块平台直接读 xld.js 的 PLATE_Y（mm），整机上下端是装配后的实测包围盒。

   D / ref-dims 那套是更早的手绘重建（五块盘、1.88 m 总高），现在只有
   segNN 的旧构建器还在引用，网站不再走那条路。
   ========================================================================== */

import { RD, RD_PLATES, RD_RINGS, W2R } from './ref-dims.js';
import { PLATE_Y } from '../atlas/xld.js';

/* ---------------------------------------------------------------- 当前模型 */
export const XLD = {
  /* 六块平台标高（米）：630 / 450 / 180 / −50 / −270 / −390 mm */
  plates: PLATE_Y.map((y) => y / 1000),

  /* 整机可见范围（米）—— 参数化模型装配完成后的实测包围盒：
       顶 = 脉冲管阀头顶      +0.722
       底 = 四通道读出链最低点 −0.686
     （真空外罩底 −0.817 默认隐藏，不计入取景；顶法兰在 +0.630） */
  top: 0.722,
  bottom: -0.686,

  /* 地面线：机器最低点再往下 6 cm，当制图里的地平线用 */
  ground: -0.746,
};

export const D = {
  /* 顶部脉冲管机头 */
  headTop: RD.head.yTop,
  headBot: RD.head.yBot,

  /* 机器顶法兰（整机最宽的一圈） */
  top: RD.flange.y,

  /* 五块盘：位置按参考图量到的 t 排，等间距 */
  p1: RD_PLATES[0].y,
  p2: RD_PLATES[1].y,
  p3: RD_PLATES[2].y,
  p4: RD_PLATES[3].y,
  p5: RD_PLATES[4].y,

  /* 底部组件（放大器 / 混合室 / 芯片） */
  chassisTop: RD.bottom.yTop,
  chassisBot: RD.bottom.yBot,

  /* Cryoperm 屏蔽罩：底部末端那一段 */
  shieldTop: RD.bottom.yBot + 0.008,
  shieldBot: RD.ground + 0.010,

  ground: RD.ground,
  /* 真实机器的盘是薄板，不是厚盘 */
  plateT: 0.010,
};

/** 五块盘的半径：按参考图每一层量到的宽度 */
export const R = {
  top: RD.flange.r,
  p1: RD_PLATES[0].r,
  p2: RD_PLATES[1].r,
  p3: RD_PLATES[2].r,
  p4: RD_PLATES[3].r,
  p5: RD_PLATES[4].r,
};

/** 盘与盘之间那五层环圈：直径比盘还大，是参考立面里最鼓的一圈 */
export const RINGS = RD_RINGS;

/** 四根立柱的半径：贴着盘缘外面 */
export const POST_R = Math.max(...Object.values(R)) - 0.012;

/** 底部组件从上往下的收窄 */
export const BOTTOM = {
  rTop: RD.bottom.rTop,
  rBot: RD.bottom.rBot,
  headW: W2R(0.490),
};

/** 左侧温度刻度：钉在参数化模型的平台上（50 K / 4 K / 900 mK / 100 mK / 10 mK） */
export const STAGE_MARKS = [
  [XLD.plates[1], '50 K'],
  [XLD.plates[2], '4 K'],
  [XLD.plates[3], '900 mK'],
  [XLD.plates[4], '100 mK'],
  [XLD.plates[5], '10 mK'],
];

export const MODEL_BOUNDS = {
  /* XLD v2 参数化模型 · 装配完成后的实测范围，见上面的 XLD.top / XLD.bottom。
     取景高度（stage.js 的 VIEW_SIZE）与取景中心（CAM_Y）都从这里来，
     以后再换模型／改型号只要更新 XLD 那三个数。 */
  yMin: XLD.bottom,
  yMax: XLD.top,

  /* 取景留白（米）。机位表里最紧的整体机位是 zoom 0.92、俯仰 ±16°，
     而机器有 ±0.35 m 的半径 —— 斜着看时它在屏幕上的竖向占位比自身的 y 跨度更大
     （y 跨度 × cos(el) + 直径 × sin(el)），所以四周再留一点，别把顶盘和屏蔽筒切掉。 */
  margin: 0.16,
};
