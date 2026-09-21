/* 由 tools/gen.mjs 生成，不要手改。
   加一个层 = 新建 content/<序号>-<key>/ 目录（放 content.js 与 module.js），然后 npm run gen。 */
import m0 from './01-cloud/module.js';
import m1 from './02-electronics/module.js';
import m2 from './03-cabling/module.js';
import m3 from './04-fridge/module.js';
import m4 from './05-coldchain/module.js';
import m5 from './06-processor/module.js';
import m6 from './07-calibration/module.js';

export const MODULES = [m0, m1, m2, m3, m4, m5, m6];
