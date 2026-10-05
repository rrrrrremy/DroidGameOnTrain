// The Droid "D": a 5x5 board with the letter drawn in tiles, gold corner
// tile like a locked hint letter. Generates every icon from one drawing:
//
//   NODE_PATH=$(npm root -g) node tools/make-icons.js   (needs Playwright)
//
// then copy from tools/icons-out/:
//   AppIcon-512@2x.png  -> droid-game-ios/ios/App/App/Assets.xcassets/AppIcon.appiconset/
//                          (must stay opaque RGB: App Store rejects alpha)
//   favicon.svg, favicon-32.png, apple-touch-icon.png, logo192.png,
//   logo512.png         -> droid-game/public/  (bump ?v= in both index.html)
// favicon.ico is the 16 and 32 px PNGs packed into one file.
// The in-game wordmark draws the same D in components/TileD.js.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'icons-out');
fs.mkdirSync(OUT, { recursive: true });

const D = ['XXXX.', 'X...X', 'X...X', 'X...X', 'XXXX.'];
const GOLD = '0,0'; // the corner tile, like a locked hint letter

// opts: size of canvas, grid span, background (null = transparent), rounded bg, show empty cells
function svg({ size = 1024, pad = 192, bg = '#111213', bgRadius = 0, empties = true, gapRatio = 0.18 }) {
  const span = size - pad * 2;
  const tile = span / (5 + 4 * gapRatio);
  const gap = tile * gapRatio;
  const r = tile * 0.16;
  let cells = '';
  D.forEach((row, y) => row.split('').forEach((c, x) => {
    const px = (pad + x * (tile + gap)).toFixed(2);
    const py = (pad + y * (tile + gap)).toFixed(2);
    const t = tile.toFixed(2);
    if (c === 'X') {
      const fill = `${x},${y}` === GOLD ? 'url(#gold)' : 'url(#green)';
      cells += `<rect x="${px}" y="${py}" width="${t}" height="${t}" rx="${r.toFixed(2)}" fill="${fill}"/>`;
      // a light top edge, like the game's tiles
      cells += `<rect x="${px}" y="${py}" width="${t}" height="${t}" rx="${r.toFixed(2)}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="${(tile * 0.035).toFixed(2)}"/>`;
    } else if (empties) {
      cells += `<rect x="${px}" y="${py}" width="${t}" height="${t}" rx="${r.toFixed(2)}" fill="#1a201c" stroke="#2c3a31" stroke-width="${(tile * 0.03).toFixed(2)}"/>`;
    }
  }));
  const bgRect = bg ? `<rect width="${size}" height="${size}" rx="${bgRadius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>
<linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee07f"/><stop offset="1" stop-color="#16a34a"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3cd6a"/><stop offset="1" stop-color="#a88f2c"/></linearGradient>
</defs>
${bgRect}${cells}
</svg>`;
}

async function png(page, svgText, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svgText.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

(async () => {
  // App icon: full bleed, square (iOS rounds the corners itself), no transparency.
  const app = svg({ pad: 150 });
  // Browser icons: rounded dark tile, tighter padding, no empty cells at tiny sizes.
  const fav = svg({ size: 64, pad: 9, bgRadius: 13, empties: false, gapRatio: 0.14 });
  const touch = svg({ size: 1024, pad: 150 });
  fs.writeFileSync(path.join(OUT, 'app-icon.svg'), app);
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), fav);
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  await png(p, app, 1024, 'AppIcon-512@2x.png');
  await png(p, touch, 180, 'apple-touch-icon.png');
  await png(p, touch, 192, 'logo192.png');
  await png(p, touch, 512, 'logo512.png');
  await png(p, fav, 32, 'favicon-32.png');
  await png(p, fav, 16, 'favicon-16.png');
  await b.close();

  // favicon.ico: the 16 and 32 px PNGs packed into one ICO.
  const pngs = [16, 32].map((s) => [s, fs.readFileSync(path.join(OUT, `favicon-${s}.png`))]);
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(([s, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s, e); head.writeUInt8(s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head, ...pngs.map(([, buf]) => buf)]));
})();
