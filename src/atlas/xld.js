export const EVIDENCE = {
  target: 'Krinner et al., customized XLD400, 2019; not a current XLDsl replica',
  published: { losPorts: 6, slotWidthMM: 88, adapterWidthMM: 104, coaxDiameterMM: 2.159, drive: 25, flux: 25, readIn: 6, pump: 5, readOut: 4, pulseTubes: 2, thermalClampScrew: 'M3 brass', readoutMountThicknessMM: 2 },
  familyReference: { mxcDiameterMM: 500, source: 'Bluefors XLDsl official specification; historical XLD400 diameter not independently verified' },
  estimated: ['Top/intermediate plate diameters', 'Absolute plate spacing; paper cable lengths are NOT plate spacings', 'Support number and locations', 'Most hole sizes and positions', 'Vessel dimensions and internal flow path', 'Chip package and qubit layout', 'Shell thicknesses'],
  countNote: 'Figure caption and section 3.1 enumerate 65 RF lines. A separate paragraph says 66; this model follows the explicit 25+25+6+5+4 list.',
  temperatures: 'Nominal diagram labels (35 K / 3 K / 900 mK / 100 mK / 10 mK), not live readings. Table 1 unloaded values differ: 35 K / 2.85 K / 882 mK / 82 mK / 6 mK.',
};
export const LOS_SECTORS = [0, 1, 2, 3, 4, 6];
export const PULSE_SECTORS = [5, 7];
export const PLATE_DIAMETERS = [700, 650, 600, 560, 530, 500];
export const PLATE_Y = [630, 450, 180, -50, -270, -390];

export function cableBanks(total) {
  const drive = Math.min(25, Math.ceil((total - 15) / 2));
  const flux = Math.min(25, total - 15 - drive);
  return [{ count: drive, sector: 0, type: 'drive' }, { count: flux, sector: 2, type: 'flux' }, { count: 15, sector: 4, type: 'readout' }, ...(total > 65 ? [{ count: total - 65, sector: 6, type: 'drive' }] : [])];
}
export function cableType(bank, index) {
  return bank.type !== 'readout' ? bank.type : index < 6 ? 'readIn' : index < 11 ? 'pump' : 'readOut';
}
export function cablePoint(radius, sector, index) {
  const a = sector * Math.PI / 4;
  const radial = radius + (Math.floor(index / 5) - 2) * 16;
  const tangent = (index % 5 - 2) * 16;
  return [Math.cos(a) * radial - Math.sin(a) * tangent, Math.sin(a) * radial + Math.cos(a) * tangent];
}
export function attenuation(type, stage) {
  if (type === 'drive' || type === 'readIn') return [0, 0, 20, 0, 20, 20][stage];
  if (type === 'flux') return stage === 2 ? 10 : 0;
  if (type === 'pump') return [0, 0, 20, 0, 10, 0][stage];
  return 0;
}
