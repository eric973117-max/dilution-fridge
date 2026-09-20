/* ==========================================================================
   outlines · CAD 轮廓线与几何合并
   —— 由 src/parts.js 拆分而来，函数体逐字未改。
   ========================================================================== */

import * as THREE from '../../vendor/three.module.js';
import { V } from './utilities.js';

/* ------------------------------------------------------------ edge pass */

/** 从一个 Mesh 生成 CAD 轮廓线（双线宽规范里的「结构线」层） */
export function edgesOf(mesh) {
  const angle = mesh.userData.edgeAngle ?? 20;
  const eg = new THREE.EdgesGeometry(mesh.geometry, angle);
  return new THREE.LineSegments(eg);
}

export const V3 = V;

/* ==========================================================================
   对照组：以下配方来自对资料图的逐部位比对
   参考特征 —— 安装盘边缘的密集螺栓孔环 / 盘面上的成簇圆柱元件 /
   像瀑布一样成束下垂的线缆 / 盘面和线束比支撑杆更抢眼
   ========================================================================== */

/** 合并多个几何体为一个（避免 InstancedMesh 无法生成轮廓线的问题） */
export function mergeGeos(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  list.forEach((g) => { total += g.attributes.position.count; });
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let off = 0;
  list.forEach((g) => {
    pos.set(g.attributes.position.array, off * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
    off += g.attributes.position.count;
    g.dispose?.();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/** 一圈/一组圆孔的轮廓线（螺栓孔环、盘面气孔阵） */
