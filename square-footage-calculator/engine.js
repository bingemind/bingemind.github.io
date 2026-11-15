// Square footage engine. Pure functions.
export const SQFT_PER_SQM = 10.7639104;
export const SQFT_PER_SQYD = 9;
export const SQFT_PER_ACRE = 43560;

export const SHAPES = {
  rect: { label: 'Rectangle', dims: ['length', 'width'] },
  lshape: { label: 'L-shape', dims: ['length', 'width', 'cutLength', 'cutWidth'] },
  circle: { label: 'Circle', dims: ['diameter'] },
  triangle: { label: 'Triangle', dims: ['base', 'height'] },
  trapezoid: { label: 'Trapezoid', dims: ['top', 'bottom', 'height'] },
};

export const DIM_LABELS = { length: 'Length', width: 'Width', cutLength: 'Cut-out length', cutWidth: 'Cut-out width', diameter: 'Diameter', base: 'Base', height: 'Height', top: 'Top side', bottom: 'Bottom side' };

// A dimension is { ft, in } in imperial or { m } in metric. Returns feet, or NaN if invalid.
export function toFeet(dim, units = 'imperial') {
  if (!dim) return 0;
  if (units === 'metric') {
    const m = dim.m === '' || dim.m === undefined ? 0 : +dim.m;
    return isNaN(m) || m < 0 ? NaN : m * 3.280839895;
  }
  const ft = dim.ft === '' || dim.ft === undefined ? 0 : +dim.ft;
  const inch = dim.in === '' || dim.in === undefined ? 0 : +dim.in;
  if (isNaN(ft) || isNaN(inch) || ft < 0 || inch < 0) return NaN;
  return ft + inch / 12;
}

// Area in square feet for one room. Invalid -> { area: 0, error }.
export function roomArea(room, units = 'imperial') {
  const shape = Object.hasOwn(SHAPES, room.shape) ? room.shape : 'rect';
  const f = {};
  for (const k of SHAPES[shape].dims) {
    f[k] = toFeet(room[k], units);
    if (Number.isNaN(f[k])) return { area: 0, error: `Check the ${DIM_LABELS[k].toLowerCase()}`, shape };
  }
  let area = 0;
  switch (shape) {
    case 'rect': area = f.length * f.width; break;
    case 'lshape': {
      if (f.cutLength > f.length || f.cutWidth > f.width) return { area: 0, error: 'The cut-out must be smaller than the full size', shape };
      area = f.length * f.width - f.cutLength * f.cutWidth; break;
    }
    case 'circle': area = Math.PI * (f.diameter / 2) ** 2; break;
    case 'triangle': area = 0.5 * f.base * f.height; break;
    case 'trapezoid': area = ((f.top + f.bottom) / 2) * f.height; break;
  }
  const qty = Math.max(Math.floor(+room.qty || 1), 1);
  return { area: area * qty, each: area, qty, feet: f, shape };
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateArea({ rooms = [], units = 'imperial', wastePct = 0, pricePerSqft = 0, boxSqft = 0 }) {
  const results = rooms.map((r) => roomArea(r, units));
  const total = results.reduce((a, r) => a + r.area, 0);
  const waste = Math.min(Math.max(+wastePct || 0, 0), 100) / 100;
  const withWaste = total * (1 + waste);
  const price = Math.max(+pricePerSqft || 0, 0);
  const box = Math.max(+boxSqft || 0, 0);
  return {
    rooms: results.map((r) => ({ ...r, area: r2(r.area), each: r2(r.each || 0) })),
    sqft: r2(total),
    sqm: r2(total / SQFT_PER_SQM),
    sqyd: r2(total / SQFT_PER_SQYD),
    acres: Math.round((total / SQFT_PER_ACRE) * 10000) / 10000,
    withWaste: r2(withWaste),
    cost: r2(withWaste * price),
    boxes: box > 0 ? Math.ceil(withWaste / box - 1e-9) : 0,
  };
}

// Points (feet) describing the shape outline, for the drawing. Circle handled separately.
export function outline(shape, f) {
  switch (shape) {
    case 'rect': return [[0, 0], [f.length, 0], [f.length, f.width], [0, f.width]];
    case 'lshape': return [[0, 0], [f.length, 0], [f.length, f.width - f.cutWidth], [f.length - f.cutLength, f.width - f.cutWidth], [f.length - f.cutLength, f.width], [0, f.width]];
    case 'triangle': return [[0, f.height], [f.base, f.height], [f.base / 2, 0]];
    case 'trapezoid': {
      const w = Math.max(f.top, f.bottom), off = (w - f.top) / 2, offB = (w - f.bottom) / 2;
      return [[off, 0], [off + f.top, 0], [offB + f.bottom, f.height], [offB, f.height]];
    }
    default: return [];
  }
}
