// Code 128 (set B) barcode and a decorative dummy QR, rendered as SVG strings.
const PATTERNS =
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(
    ' ',
  );

/** Returns module widths (bar, space, bar, ...) for a Code 128-B symbol. */
export function code128Widths(text: string): number[] {
  const values = [...text].map((ch) => {
    const c = ch.charCodeAt(0) - 32;
    return c >= 0 && c < 95 ? c : 0;
  });
  let sum = 104;
  values.forEach((v, i) => (sum += v * (i + 1)));
  const codes = [104, ...values, sum % 103, 106];
  return codes.flatMap((c) => PATTERNS[c].split('').map(Number));
}

export function code128Svg(text: string, height = 48): string {
  const widths = code128Widths(text);
  const quiet = 10;
  const total = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  let x = quiet;
  let rects = '';
  widths.forEach((w, i) => {
    if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="${height}"/>`;
    x += w;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" preserveAspectRatio="none" role="img" aria-label="Barcode ${text}" fill="#000">${rects}</svg>`;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Visual-only QR-like matrix (not decodable). Used for the QRIS simulation and patient card. */
export function dummyQrSvg(text: string, size = 25): string {
  let seed = hash(text) || 1;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
  let cells = '';
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (!inFinder(x, y) && rand() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  const finder = (fx: number, fy: number) =>
    `<rect x="${fx}" y="${fy}" width="7" height="7"/><rect x="${fx + 1}" y="${fy + 1}" width="5" height="5" fill="#fff"/><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${size + 2} ${size + 2}" shape-rendering="crispEdges" role="img" aria-label="Kode QR ${text}"><rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="#fff"/><g fill="#101828">${cells}${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}</g></svg>`;
}
