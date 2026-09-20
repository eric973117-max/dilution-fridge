/* ==========================================================================
   程序化几何配方 · 零外部模型资产
   所有构件在运行时由参数生成，改一段数据即改模型
   ========================================================================== */

/* 入口清单：每个几何配方都在 parts/ 下单独一个文件。
   加一个新配方：写一个小文件，然后在下面补一行 export。 */

export * from './utilities.js';
export * from './solids.js';
export * from './wires.js';
export * from './outlines.js';
export * from './holes.js';
export * from './details.js';
export * from './cables.js';
export * from './discs.js';
export * from './modules.js';
export * from './pins.js';
export * from './cage.js';
