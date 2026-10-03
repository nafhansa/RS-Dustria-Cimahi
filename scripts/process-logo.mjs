import sharp from 'sharp';
const src = 'logodustira_new.png';
const meta = await sharp(src).metadata();
console.log(meta.width, meta.height, meta.hasAlpha);
// sample brand colors
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i+1], data[i+2]]; };
console.log('cross', px(1200, 300), 'ring', px(300, 1300), 'text', px(2500, 1200));
// full logo
await sharp(src).trim().resize({ width: 1200 }).png().toFile('src/assets/images/logo.png');
await sharp(src).trim().resize({ width: 640 }).webp({ quality: 90 }).toFile('public/logo.webp');
// symbol: left ~ 0..1760 px
const symW = 1760;
const sym = await sharp(src).extract({ left: 0, top: 0, width: symW, height: meta.height }).png().toBuffer();
await sharp(sym).trim().resize({ width: 256 }).png().toFile('public/logo-symbol.png');
await sharp(sym).trim().resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile('public/favicon.png');
await sharp(sym).trim().resize(180, 180, { fit: 'contain', background: '#ffffff' }).png().toFile('public/apple-touch-icon.png');
// OG image
const logoBuf = await sharp(src).trim().resize({ width: 820 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#ffffff' } })
  .composite([{ input: logoBuf, gravity: 'center' },
    { input: Buffer.from('<svg width="1200" height="630"><rect y="600" width="1200" height="30" fill="#C8102E"/></svg>'), top: 0, left: 0 }])
  .png().toFile('public/og-image.png');
