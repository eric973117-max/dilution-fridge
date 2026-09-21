/* ==========================================================================
   density · 网格密度系数（"轻量化"的总闸）

   实测：整机 786,400 三角形里，最大的一块不是零件数量而是**管线的分段数** ——
   每根电缆都是一根 TubeGeometry（环向 5、纵向 32），65 路 × 6 层的线束
   加起来就占掉一半以上。这些管子最细处直径 2.16 mm，画在 1.77 m 的整机上
   只有几个像素宽，分段砍一半肉眼几乎看不出来，但三角形数近似按平方下降。

   实测（430×932，整机）：
     den = 1    → 786,400 三角形
     den = 0.7  → 482,832（−39%）
     den = 0.55 → 350,946（−55%）  ← 手机端默认
     den = 0.45 → 308,942（−61%）
   0.55 这一档在整机总览和线束特写下都看不出差别（对照图见 docs/verify/density-*.png）。

   默认值：**手机端 0.55、桌面端 1（不动）**；网址加 `?den=1` / `?den=0.45` 可覆盖。
   必须在 createMachine() **之前**定好 —— 模型是建好就固定的（不会每帧重建）。
   ========================================================================== */

const q = new URLSearchParams(window.location.search).get('den');
const isNarrow = window.matchMedia('(max-width: 900px)').matches;
const parsed = q == null ? (isNarrow ? 0.55 : 1) : Number(q);
const K = Number.isFinite(parsed) ? Math.min(1, Math.max(0.3, parsed)) : 1;

export const DENSITY = K;

/** 把某个分段数按密度系数缩放（留一个最小值，别把圆压成三角片） */
export function seg(n, min = 4) {
  return Math.max(min, Math.round(n * K));
}

/* ---------------------------------------------------------- 轮廓线预算 --
   每个零件除了实体，还会挂一份 EdgesGeometry 轮廓线 —— **每个都是一次 draw call**。
   实测整机 158 个线段对象，其中一大半挂在小零件上（螺栓、接头、小卡箍…），
   那些零件在手机上只有几个像素，线根本看不清，但 draw call 一次不少。
   所以给轮廓线设一条门槛：三角形数低于 EDGE_MIN_TRIS 的零件不生成轮廓线。

   门槛的实测效果（整机 174 个 mesh / 158 个线段对象）：
     门槛 0    → 158 个线段对象（原样）
     门槛 300  → 92
     门槛 600  → 75
   默认：手机端 300（draw call 约 −70），桌面端 0（一条线都不少）。

   —— 至于"把零件合并成更少的对象"：量过了，不划算。158 个零件的
      径向方向 / 分层 rank / 自转各不相同，按"运动完全一致"合并只能省 18 个对象；
      真要把 draw call 压到 100 出头，必须把动画从 158 种运动压到 ~40 种，
      那会明显改变拆机时"一件件错开"的观感，所以没做。 */
const edgeParam = new URLSearchParams(window.location.search).get('edge');
export const EDGE_MIN_TRIS = edgeParam != null
  ? Math.max(0, Number(edgeParam) || 0)
  : (isNarrow ? 300 : 0);
