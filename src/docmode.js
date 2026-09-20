/* ==========================================================================
   文档模式 · 无 WebGL 时的白纸图纸形态
   与主站共用同一份数据，内容无损
   ========================================================================== */

import { SEGMENTS, SPECS } from './data.js';

export function buildDocMode(host) {
  host.hidden = false;
  host.innerHTML = `
    <div class="doc">
      <div class="doc__eyebrow">DR-001 · REV.A · UNIT mm / K</div>
      <h1 class="doc__title">DILUTION REFRIGERATOR</h1>
      <p class="doc__sub">稀释制冷机 · 八段功能拆解 —— 从 300 K 室温法兰到 15 mK 量子芯片</p>

      ${SEGMENTS.map((s) => `
        <section class="doc__sec">
          <i>SEG ${s.id}</i>
          <div>
            <div class="doc__en">${s.en}</div>
            <h2 class="doc__zh">${s.zh}${s.core ? ' · 核心段' : ''}</h2>
            <p class="doc__role">${s.role}</p>
            <p class="doc__why">没有它 —— ${s.why}</p>
            <div class="doc__kv">
              ${s.specs.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}
            </div>
            <div class="doc__kv" style="margin-top:6px"><span>温区</span><b>${s.temp}</b></div>
          </div>
        </section>`).join('')}

      <section class="doc__sec">
        <i>SPEC</i>
        <div>
          <div class="doc__en">MACHINE SPECIFICATION</div>
          <h2 class="doc__zh">整机规格</h2>
          <div class="doc__kv">
            ${SPECS.rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}
          </div>
        </div>
      </section>
    </div>`;
}
