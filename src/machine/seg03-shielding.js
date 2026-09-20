/* ==========================================================================
   段 03 · 屏蔽段（参考图第 ⑦ 号件：Cryoperm Shield）

   包住量子处理器的那只罩子：两节套筒 + 上下法兰 + 中缝卡箍环，
   筒壁上有一圈竖肋。处理器就在罩子里，拆机时整段抬起来把它露出来。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { shell, ring, mergeGeos } from '../parts/index.js';
import { D } from './dims.js';

const TAU = Math.PI * 2;

export function buildShielding() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };

  const h = D.shieldTop - D.shieldBot;
  const midY = (D.shieldTop + D.shieldBot) / 2;

  /* 1. 两节屏蔽筒（半透明，能看见里面的芯片） */
  [0, 1].forEach((i) => {
    const cup = shell({ r: 0.130, h: h / 2 - 0.008 });
    cup.userData.isShell = true;
    cup.userData.baseOpacity = 0.10;
    add(cup, 0, D.shieldTop - (i + 0.5) * (h / 2), 0);
  });

  /* 2. 上下法兰 + 中缝卡箍环 */
  add(ring({ r: 0.138, h: 0.010 }), 0, D.shieldTop, 0);
  add(ring({ r: 0.138, h: 0.010 }), 0, D.shieldBot, 0);
  add(ring({ r: 0.140, h: 0.009 }), 0, midY, 0);

  /* 3. 筒壁竖肋 */
  const ribs = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r = new THREE.BoxGeometry(0.006, h - 0.02, 0.009);
    r.translate(Math.cos(a) * 0.133, 0, Math.sin(a) * 0.133);
    r.rotateY(-a);
    ribs.push(r);
  }
  const ribMesh = new THREE.Mesh(mergeGeos(ribs));
  ribMesh.userData.edgeAngle = 32;
  add(ribMesh, 0, midY, 0);

  return g;
}
