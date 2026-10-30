// Rebuilds src/img/face/faces.webp from the 8x5 portrait sheets in src/img/face.
// Each face is cut just inside its pink ring (the game draws a team-coloured ring instead).
// Duplicate portraits (the same character re-drawn on another sheet) are detected and dropped.
// Usage: npm i puppeteer-core && node tools/cut-faces.js   (uses Microsoft Edge to do the image work)
// The script updates FACES / FACE_MAP_V1 in js/league.js and FACE_ROWS in js/ui.js to match.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'src', 'img', 'face') + '/';
// the original three sheets keep their place at the front so existing saves keep their faces
const OLD = ['Forty Football Player Portraits.png', 'Hot-Pink Football Avatar Icon Sheet.png', 'Magenta Football Portrait Grid.png'];
const SHEETS = OLD.filter(f => fs.existsSync(DIR + f)).concat(fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.png') && !OLD.includes(f)).sort());
const DUP = +(process.env.DUP || 1.25); // lower = keep more look-alikes
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  const urls = SHEETS.map(f => 'data:image/png;base64,' + fs.readFileSync(DIR + f).toString('base64'));
  const out = await page.evaluate(async (urls, DUP, nOld) => {
    const S = 128, COLS = 12, tiles = [];
    for (const url of urls) {
      const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
      const pink = k => d[k] > 140 && d[k + 1] < 75 && d[k + 2] > 70 && d[k + 2] > d[k + 1] * 2;
      const cw = W / 8, ch = H / 5;
      for (let r = 0; r < 5; r++) for (let q = 0; q < 8; q++) {
        let sx0 = 0, sy0 = 0, cnt = 0;
        for (let j = Math.floor(r * ch); j < Math.floor((r + 1) * ch); j++) for (let i = Math.floor(q * cw); i < Math.floor((q + 1) * cw); i++) {
          const k = (j * W + i) * 4; if (d[k + 3] > 245 && !pink(k)) { sx0 += i; sy0 += j; cnt++; }
        }
        const cx = sx0 / cnt, cy = sy0 / cnt, ri = Math.sqrt(cnt / Math.PI) * 0.94;
        const cut = (x0, y0, rad) => {
          const tc = document.createElement('canvas'); tc.width = tc.height = S;
          const tx = tc.getContext('2d');
          tx.drawImage(c, x0 - rad, y0 - rad, rad * 2, rad * 2, 0, 0, S, S);
          const id = tx.getImageData(0, 0, S, S), q2 = id.data;
          // leftover ring glow / see-through edge: fold into a dark backdrop
          for (let k = 0; k < q2.length; k += 4) {
            const mag = q2[k] > 120 && q2[k + 1] < 80 && q2[k + 2] > 60 && q2[k + 2] > q2[k + 1] * 1.8;
            const a = q2[k + 3] / 255, w = mag ? 0 : a;
            q2[k] = q2[k] * w + 21 * (1 - w); q2[k + 1] = q2[k + 1] * w + 26 * (1 - w); q2[k + 2] = q2[k + 2] * w + 38 * (1 - w); q2[k + 3] = 255;
          }
          tx.putImageData(id, 0, 0);
          return tc;
        };
        // the pixel-mass centre above drifts on sheets with a solid backdrop, red glow or uneven rows, so the sprite
        // tile is centred on the portrait's own ring: scan 16 ways out to the hot-pink ring, re-centre, repeat
        const ring = (i, j) => { i = Math.round(i); j = Math.round(j); if (i < 0 || j < 0 || i >= W || j >= H) return true; const k = (j * W + i) * 4; return d[k] > 185 && d[k + 1] < 95 && d[k + 2] > 85 && d[k + 2] > d[k + 1] * 1.6; };
        const DIRS = Array.from({ length: 16 }, (_, n) => [Math.cos(n * Math.PI / 8), Math.sin(n * Math.PI / 8)]);
        let rx = cx, ry = cy, hits = [];
        for (let it = 0; it < 5; it++) {
          hits = DIRS.map(([ux, uy]) => { let run = 0; for (let t = 8; t < 160; t++) { if (ring(rx + ux * t, ry + uy * t)) { if (++run >= 3) return t - 2; } else run = 0; } return 160; });
          DIRS.forEach(([ux, uy], n) => { rx += ux * hits[n] / DIRS.length; ry += uy * hits[n] / DIRS.length; });
        }
        const med = hits.slice().sort((p, q) => p - q)[8], agree = hits.filter(h => Math.abs(h - med) / med < 0.08).length;
        const ringOk = agree >= 13 && med > Math.min(cw, ch) * 0.25 && med < 150;
        // fingerprints keep using the original cut, so duplicate detection (and the face order) never changes
        const fpc = cut(cx, cy, ri), tc = ringOk ? cut(rx, ry, med * 0.8) : fpc;
        // fingerprint (at 96px): grayscale layout, hair silhouette, edges, hair colour and skin tone
        const F = 96, fc = document.createElement('canvas'); fc.width = fc.height = F;
        const fcx = fc.getContext('2d'); fcx.drawImage(fpc, 0, 0, F, F);
        const G = 20, fp = document.createElement('canvas'); fp.width = fp.height = G;
        const fx = fp.getContext('2d'); fx.drawImage(fc, F * 0.1, F * 0.05, F * 0.8, F * 0.8, 0, 0, G, G);
        const px = fx.getImageData(0, 0, G, G).data, gray = [];
        for (let i = 0; i < G * G; i++) gray.push(0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2]);
        const ed = [];
        for (let yy = 0; yy < G - 1; yy++) for (let xx = 0; xx < G - 1; xx++) { const k = yy * G + xx; ed.push(gray[k + 1] - gray[k], gray[k + G] - gray[k]); }
        const nrm = a => { const m = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) || 1; return a.map(v => (v - m) / sd); };
        const meanRGB = (x0, y0, x1, y1) => { const dd = fcx.getImageData(x0, y0, x1 - x0, y1 - y0).data; let r0 = 0, g0 = 0, b0 = 0, n = 0; for (let k = 0; k < dd.length; k += 4) { r0 += dd[k]; g0 += dd[k + 1]; b0 += dd[k + 2]; n++; } return [r0 / n, g0 / n, b0 / n]; };
        tiles.push({ tc, g: nrm(gray), h: nrm(gray.slice(0, G * 8)), e: nrm(ed), hc: meanRGB(F * 0.3, F * 0.06, F * 0.7, F * 0.2), sk: meanRGB(F * 0.38, F * 0.5, F * 0.62, F * 0.62) });
      }
    }
    const dv = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s / a.length); };
    const cd = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const dist = (A, B) => dv(A.g, B.g) * 0.5 + dv(A.h, B.h) * 0.35 + dv(A.e, B.e) * 0.25 + cd(A.hc, B.hc) / 45 + cd(A.sk, B.sk) / 45;
    // greedy: keep a face only if it isn't too close to one already kept (original sheets come first)
    const keep = [];
    for (let i = 0; i < tiles.length; i++) if (keep.every(k => dist(tiles[i], tiles[k]) > DUP)) keep.push(i);
    // old sprite index -> new index (a dropped duplicate maps to the kept face it matched)
    const map = [];
    for (let i = 0; i < nOld; i++) {
      const at = keep.indexOf(i);
      if (at >= 0) { map.push(at); continue; }
      let best = 0, bd = 1e9;
      keep.forEach((k, n) => { const v = dist(tiles[i], tiles[k]); if (v < bd) { bd = v; best = n; } });
      map.push(best);
    }
    const sprite = document.createElement('canvas');
    sprite.width = S * COLS; sprite.height = S * Math.ceil(keep.length / COLS);
    const sx = sprite.getContext('2d');
    keep.forEach((i, n) => {
      const ox = (n % COLS) * S, oy = Math.floor(n / COLS) * S;
      sx.save(); sx.beginPath(); sx.arc(ox + S / 2, oy + S / 2, S / 2, 0, Math.PI * 2); sx.clip();
      sx.drawImage(tiles[i].tc, ox, oy);
      sx.restore();
    });
    return { webp: sprite.toDataURL('image/webp', 0.86), total: tiles.length, count: keep.length, rows: Math.ceil(keep.length / COLS), map };
  }, urls, DUP, OLD.filter(f => fs.existsSync(DIR + f)).length * 40);
  fs.writeFileSync(DIR + 'faces.webp', Buffer.from(out.webp.split(',')[1], 'base64'));
  // keep the game's constants in step with the sprite
  const lf = path.join(ROOT, 'js', 'league.js'), uf = path.join(ROOT, 'js', 'ui.js');
  let ls = fs.readFileSync(lf, 'utf8'), us = fs.readFileSync(uf, 'utf8');
  ls = ls.replace(/const FACES = \d+;/, `const FACES = ${out.count};`);
  ls = ls.replace(/const FACE_MAP_V1 = \[[^\]]*\];/, `const FACE_MAP_V1 = [${out.map.join(',')}];`);
  us = us.replace(/const FACE_COLS = 12, FACE_ROWS = \d+;/, `const FACE_COLS = 12, FACE_ROWS = ${out.rows};`);
  fs.writeFileSync(lf, ls); fs.writeFileSync(uf, us);
  console.log(`${SHEETS.length} sheets · ${out.total} portraits · ${out.total - out.count} duplicates dropped · ${out.count} faces (${out.rows} rows)`);
  console.log('webp KB', Math.round(fs.statSync(DIR + 'faces.webp').size / 1024));
  await browser.close();
})();
