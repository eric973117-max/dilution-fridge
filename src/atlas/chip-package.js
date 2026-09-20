import * as THREE from '../../vendor/three.module.js';

export function buildChipPackage({ stage, params, group, box, cyl, pipe, rod, chipPieces, mechanical }) {
  const chipRoot = group(stage, 'chip', 'Quantum_processor_package');
  chipRoot.position.set(0, -200, 34);
  const chipPiece = (name, y, direction = [0, -1, 0], distance = 0) => {
    const g = group(chipRoot, 'chip', name);
    g.position.y = y;
    chipPieces.push({ group: g, base: g.position.clone(), direction: new THREE.Vector3(...direction), distance });
    return g;
  };
  const mount = chipPiece('01_Thermal_mount', 13, [0, 1, 0], 55);
  box(mount, [126, 13, 120], [0, 0, 0], 'gold', '混合室芯片热沉');
  for (const x of [-56, 56]) for (const z of [-52, 52]) {
    cyl(mount, 4, 176.5, [x, 94.75, z], 'copper', 18, '芯片热沉支撑柱');
    cyl(mount, 6, 4, [x, -8.5, z], 'bright', 6, '热沉紧固件');
    mechanical.contacts.push({ kind: 'chip-support', upperMM: -4, upperPlateMM: -4, x, z: z + 34 });
  }
  mechanical.chipStack = { heatSinkTop: 19.5, baseBottom: 19.5, baseTop: 32.5, adhesiveTop: 32.6, pcbBottom: 32.6, pcbTop: 35.4, dieAttachTop: 35.6, dieBottom: 35.6, wallTop: 40.5, lidBottom: 40.5 };
  const base = chipPiece('02_OFC_package_base', 26, [0, -1, 0], 4);
  box(base, [102, 13, 96], [0, 0, 0], 'white', '芯片铜封装基座');
  for (const z of [-43, 43]) box(base, [98, 9, 5], [0, 10, z], 'silver', '封装密封边');
  for (const x of [-46, 46]) box(base, [5, 9, 87], [x, 10, 0], 'silver', '封装侧壁');
  for (const x of [-40, 40]) for (const z of [-35, 35]) {
    cyl(base, 3.5, 3, [x, 9, z], 'dark', 6, '封装安装螺孔');
  }
  box(base, [75, .1, 69], [0, 6.55, 0], 'silver', '载板接合层（厚度估算）');
  const pcb = chipPiece('03_Microwave_interposer', 34, [0, -1, 0], 54);
  box(pcb, [75, 2.8, 69], [0, 0, 0], 'ceramic', '微波介质载板');
  box(pcb, [39, .2, 39], [0, 1.5, 0], 'silver', '裸片贴装层（厚度估算）');
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2;
    for (let j = 0; j < 12; j++) {
      const d = (j - 5.5) * 4.7;
      const xx = Math.cos(a) * 30 + Math.sin(a) * d;
      const zz = Math.sin(a) * 30 + Math.cos(a) * d;
      const pad = box(pcb, [10, .24, .85], [xx, 1.65, zz], 'bright', '微波载板焊盘');
      pad.rotation.y = -a;
      pipe(pcb, [[Math.cos(a) * 37 + Math.sin(a) * d, 1.7, Math.sin(a) * 33 + Math.cos(a) * d], [xx, 1.7, zz], [Math.cos(a) * 21 + Math.sin(a) * d * .7, 1.7, Math.sin(a) * 21 + Math.cos(a) * d * .7]], .25, 'silver', '载板微波走线', 8);
    }
  }
  const die = chipPiece('04_Quantum_die_and_wirebonds', 36.2, [0, -1, 0], 107);
  box(die, [39, 1.2, 39], [0, 0, 0], 'chip', '超导量子处理器硅裸片');
  const grid = Math.sqrt(params.qubits), cell = 31 / grid;
  for (let row = 0; row < grid; row++) for (let col = 0; col < grid; col++) {
    const x = (col - (grid - 1) / 2) * cell, z = (row - (grid - 1) / 2) * cell;
    box(die, [cell * .54, .07, cell * .13], [x, .67, z], 'cyan', 'Transmon 电容示意');
    box(die, [cell * .13, .07, cell * .54], [x, .67, z], 'cyan', 'Transmon 电容示意');
    box(die, [.21, .10, .28], [x + cell * .28, .69, z], 'bright', 'Josephson 结位置示意（非制造图）');
    const pts = [];
    for (let k = 0; k < 8; k++) pts.push([x - cell * .30 + k * cell * .075, .72, z + cell * .34 + (k % 2) * cell * .1]);
    pipe(die, pts, .065, 'bright', '微波读出谐振器图案', 16);
    if (col < grid - 1) rod(die, [x + cell * .29, .72, z], [x + cell * .71, .72, z], .07, 'silver', '比特耦合示意');
  }
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2;
    for (let j = 0; j < 24; j++) {
      const d = (j - 11.5) * 1.43;
      const x1 = Math.cos(a) * 18.8 + Math.sin(a) * d, z1 = Math.sin(a) * 18.8 + Math.cos(a) * d;
      const x2 = Math.cos(a) * 24 + Math.sin(a) * d, z2 = Math.sin(a) * 24 + Math.cos(a) * d;
      pipe(die, [[x1, .75, z1], [(x1 + x2) / 2, 2.8, (z1 + z2) / 2], [x2, -.74, z2]], .06, 'bright', '铝键合线（可视化加粗）', 10);
      box(die, [.6, .12, .6], [x1, .77, z1], 'silver', '芯片边缘键合焊盘');
      box(pcb, [.8, .12, .8], [x2, 1.46, z2], 'silver', '载板键合着落焊盘');
    }
  }
  const lid = chipPiece('05_RF_package_lid', 43, [1, .35, 0], 144);
  box(lid, [103, 5, 97], [0, 0, 0], 'white', '微波封装上盖');
  box(lid, [58, 1.1, 29], [0, 3.1, 0], 'silver', '芯片封装铭牌');
  for (const x of [-42, 42]) for (const z of [-37, 37]) {
    cyl(lid, 3.5, 2.2, [x, 4.3, z], 'silver', 6, '封装上盖螺钉');
  }
  for (let i = 0; i < 6; i++) box(lid, [28 - i * 2.4, .4, .7], [-8, 3.9, -8 + i * 3], 'dark', '封装铭牌刻线');
  for (const side of [-1, 1]) for (let j = 0; j < 8; j++) {
    const z = (j - 3.5) * 9;
    const c = cyl(base, 3.1, 13, [side * 54, 4, z], 'silver', 6, '芯片封装 SMA 接口');
    c.rotation.z = Math.PI / 2;
    cyl(base, 1.8, 4, [side * 61, 4, z], 'bright', 14, 'SMA 中心接口', [0, 0, Math.PI / 2]);
  }
  return { root: chipRoot, pieces: chipPieces, mount, base, pcb, die, lid };
}
