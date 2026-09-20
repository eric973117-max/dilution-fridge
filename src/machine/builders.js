/* ==========================================================================
   段 id → 构建函数
   加一段只改这里。
   —— 由 src/machine.js 拆分而来，几何与数值逻辑与拆分前逐字一致。
   ========================================================================== */

import { buildStructuralFrame } from './seg01-structure.js';
import { buildPreCooling } from './seg02-precooling.js';
import { buildShielding } from './seg03-shielding.js';
import { buildDilutionCircuit } from './seg04-dilution.js';
import { buildSignalDistribution } from './seg05-signal.js';
import { buildSuperconductingLink } from './seg06-superconducting.js';
import { buildIsolation } from './seg07-isolation.js';
import { buildProcessor } from './seg08-processor.js';

export const BUILDERS = {
  '01': buildStructuralFrame,
  '02': buildPreCooling,
  '03': buildShielding,
  '04': buildDilutionCircuit,
  '05': buildSignalDistribution,
  '06': buildSuperconductingLink,
  '07': buildIsolation,
  '08': buildProcessor,
};
