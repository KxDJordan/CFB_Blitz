// Rebuilds src/img/face/faces.webp from the 8x5 portrait sheets in src/img/face.
// Each face is cut just inside its pink ring (the game draws a team-coloured ring instead).
// Usage: npm i puppeteer-core && node tools/cut-faces.js   (uses Microsoft Edge to do the image work)
// If you add or remove sheets, update FACES in js/league.js and FACE_ROWS in js/ui.js to match.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const DIR = require('path').join(__dirname, '..', 'src', 'img', 'face') + '/';
const SHEETS = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.png')).sort();
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  const urls = SHEETS.map(f => 'data:image/png;base64,' + fs.readFileSync(DIR + f).toString('base64'));
  const out = await page.evaluate(async urls => {
    const S = 128, COLS = 12, sprite = document.createElement('canvas');
    sprite.width = S * COLS; sprite.height = S * Math.ceil(urls.length * 40 / COLS);
    const sx = sprite.getContext('2d');
    const log = [];
    let n = 0;
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
        const cx = sx0 / cnt, cy = sy0 / cnt, R = Math.sqrt(cnt / Math.PI);
        const t = 0, ri = R * 0.94;
        const ox = (n % COLS) * S, oy = Math.floor(n / COLS) * S;
        const tc = document.createElement('canvas'); tc.width = tc.height = S;
        const tx = tc.getContext('2d');
        tx.drawImage(c, cx - ri, cy - ri, ri * 2, ri * 2, 0, 0, S, S);
        const id = tx.getImageData(0, 0, S, S), q2 = id.data;
        // leftover ring glow / see-through edge: fold into a dark backdrop
        for (let k = 0; k < q2.length; k += 4) {
          const mag = q2[k] > 120 && q2[k + 1] < 80 && q2[k + 2] > 60 && q2[k + 2] > q2[k + 1] * 1.8;
          const a = q2[k + 3] / 255, w = mag ? 0 : a;
          q2[k] = q2[k] * w + 21 * (1 - w); q2[k + 1] = q2[k + 1] * w + 26 * (1 - w); q2[k + 2] = q2[k + 2] * w + 38 * (1 - w); q2[k + 3] = 255;
        }
        tx.putImageData(id, 0, 0);
        sx.save(); sx.beginPath(); sx.arc(ox + S / 2, oy + S / 2, S / 2, 0, Math.PI * 2); sx.clip();
        sx.drawImage(tc, ox, oy);
        sx.restore();
        log.push(`${n}: c(${cx.toFixed(0)},${cy.toFixed(0)}) R${R.toFixed(1)} t${t} ri${ri.toFixed(1)}`);
        n++;
      }
    }
    return { webp: sprite.toDataURL('image/webp', 0.86), log };
  }, urls);
  fs.writeFileSync(DIR + 'faces.webp', Buffer.from(out.webp.split(',')[1], 'base64'));
  console.log(out.log.filter((_, i) => i % 7 === 0).join('\n'));
  console.log('webp KB', Math.round(fs.statSync(DIR + 'faces.webp').size / 1024));
  await browser.close();
})();
