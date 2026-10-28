'use strict';
// ── TEAM LOGOS & JERSEYS (pure SVG) ───────────────────────────────

const Logo = (() => {
  let uid = 0;

  const SHAPES = {
    shield:  { label: 'Shield',  d: 'M50 4 L90 15 V47 C90 73 73 89 50 97 C27 89 10 73 10 47 V15 Z', ic: [50, 47, 0.62] },
    circle:  { label: 'Roundel', circle: true, ic: [50, 50, 0.64] },
    hex:     { label: 'Hex',     d: 'M50 3 L91 26 V74 L50 97 L9 74 V26 Z', ic: [50, 50, 0.62] },
    diamond: { label: 'Diamond', d: 'M50 2 L97 50 L50 98 L3 50 Z', ic: [50, 50, 0.52] },
    crest:   { label: 'Crest',   d: 'M28 6 H72 Q94 6 94 28 V72 Q94 94 72 94 H28 Q6 94 6 72 V28 Q6 6 28 6 Z', ic: [50, 50, 0.66] },
    pennant: { label: 'Banner',  d: 'M10 6 H90 V68 L50 96 L10 68 Z', ic: [50, 44, 0.6] },
  };

  function star(cx, cy, R, r, n = 5) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
      pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  // Each icon draws in a 100×100 box. c = fill, k = outline, l = letter.
  const ICONS = {
    bolt: { label: 'Bolt', draw: (c, k) => `<path d="M60 8 L26 56 H46 L36 92 L76 40 H55 L66 8 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/>` },
    star: { label: 'Star', draw: (c, k) => `<polygon points="${star(50, 53, 42, 18)}" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/>` },
    flame: { label: 'Flame', draw: (c, k) => `<path d="M50 6 C60 26 80 36 77 62 C75 80 63 92 50 92 C35 92 23 81 23 64 C23 50 32 42 35 30 C42 40 42 48 46 52 C48 38 43 22 50 6 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/><path d="M50 50 C56 60 64 66 62 76 C61 84 56 88 50 88 C43 88 38 83 38 76 C38 68 44 64 46 58 C48 62 49 64 50 50 Z" fill="${k}" opacity=".55"/>` },
    crown: { label: 'Crown', draw: (c, k) => `<path d="M16 72 L12 30 L33 48 L50 20 L67 48 L88 30 L84 72 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/><rect x="16" y="76" width="68" height="10" rx="3" fill="${c}" stroke="${k}" stroke-width="4"/><circle cx="50" cy="56" r="6" fill="${k}"/>` },
    claw: { label: 'Claws', draw: (c, k) => [0, 17, 34].map(dx => `<path d="M${20 + dx} 10 C${40 + dx} 32 ${44 + dx} 58 ${34 + dx} 90 C${50 + dx} 66 ${50 + dx} 36 ${30 + dx} 10 Z" fill="${c}" stroke="${k}" stroke-width="3.5" stroke-linejoin="round"/>`).join('') },
    horns: { label: 'Horns', draw: (c, k) => `<path d="M8 20 C10 42 26 50 38 46 C34 56 36 74 50 90 C64 74 66 56 62 46 C74 50 90 42 92 20 C84 34 72 36 62 34 C58 30 42 30 38 34 C28 36 16 34 8 20 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/><circle cx="42" cy="54" r="4" fill="${k}"/><circle cx="58" cy="54" r="4" fill="${k}"/>` },
    wing: { label: 'Wing', draw: (c, k) => `<path d="M8 28 C36 24 72 34 92 74 C78 64 62 62 48 66 C56 58 54 54 42 52 C50 46 46 42 34 42 C40 38 30 34 18 36 C22 32 16 30 8 28 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/>` },
    anchor: { label: 'Anchor', draw: (c, k) => `<g fill="none" stroke="${k}" stroke-width="15" stroke-linecap="round"><circle cx="50" cy="18" r="8"/><path d="M50 26 V84 M32 40 H68 M20 60 C22 82 78 82 80 60"/></g><g fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"><circle cx="50" cy="18" r="8"/><path d="M50 26 V84 M32 40 H68 M20 60 C22 82 78 82 80 60"/></g>` },
    paw: { label: 'Paw', draw: (c, k) => `<g fill="${c}" stroke="${k}" stroke-width="4"><ellipse cx="50" cy="66" rx="20" ry="17"/><ellipse cx="24" cy="44" rx="9" ry="11"/><ellipse cx="40" cy="27" rx="9" ry="11"/><ellipse cx="60" cy="27" rx="9" ry="11"/><ellipse cx="76" cy="44" rx="9" ry="11"/></g>` },
    mountain: { label: 'Peaks', draw: (c, k) => `<path d="M4 82 L36 34 L50 52 L64 22 L96 82 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/><path d="M64 22 L74 40 L67 37 L61 42 L57 37 Z" fill="${k}" opacity=".6"/>` },
    football: { label: 'Football', draw: (c, k) => `<g transform="rotate(-35 50 50)"><ellipse cx="50" cy="50" rx="42" ry="24" fill="${c}" stroke="${k}" stroke-width="4"/><path d="M30 50 H70" stroke="${k}" stroke-width="4" stroke-linecap="round"/>${[38, 44, 50, 56, 62].map(x => `<path d="M${x} 44 V56" stroke="${k}" stroke-width="3.5" stroke-linecap="round"/>`).join('')}<path d="M16 38 C19 44 19 56 16 62 M84 38 C81 44 81 56 84 62" stroke="${k}" stroke-width="3.5" fill="none"/></g>` },
    helmet: { label: 'Helmet', draw: (c, k) => `<path d="M12 58 C12 30 34 14 58 16 C78 18 90 34 88 54 L88 60 H66 L62 70 H48 C44 80 30 84 20 76 C14 72 12 66 12 58 Z" fill="${c}" stroke="${k}" stroke-width="4" stroke-linejoin="round"/><path d="M30 22 C40 34 44 46 46 60" stroke="${k}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M66 60 H94 M74 52 V80 M86 54 V78 M66 72 H92" stroke="${k}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="40" cy="56" r="5" fill="${k}"/>` },
    monogram: { label: 'Letter', draw: (c, k, l) => `<text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-family="Oswald, 'Arial Narrow', Impact, sans-serif" font-weight="700" font-size="82" fill="${c}" stroke="${k}" stroke-width="4" paint-order="stroke">${U.esc(l || 'B')}</text>` },
  };

  function shapeEl(key, attrs) {
    const s = SHAPES[key] || SHAPES.shield;
    return s.circle ? `<circle cx="50" cy="50" r="46" ${attrs}/>` : `<path d="${s.d}" ${attrs}/>`;
  }

  function svg(logo, size = 64, letter) {
    const id = 'lg' + (uid++);
    const s = SHAPES[logo.shape] || SHAPES.shield;
    const icon = ICONS[logo.icon] || ICONS.star;
    const pri = logo.primary, sec = logo.secondary;
    const dark = U.mix(pri, '#000000', 0.55);
    const [ix, iy, isc] = s.ic;
    const l = letter || logo.letter || 'B';
    return `<svg class="logo-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>
${shapeEl(logo.shape, `fill="${sec}"`)}
<g transform="translate(50 50) scale(.86) translate(-50 -50)">${shapeEl(logo.shape, `fill="${pri}"`)}</g>
<g transform="translate(50 50) scale(.78) translate(-50 -50)">${shapeEl(logo.shape, `fill="none" stroke="${sec}" stroke-opacity=".35" stroke-width="1.6"`)}</g>
<g transform="translate(${ix} ${iy}) scale(${isc}) translate(-50 -50)">${icon.draw(sec, dark, l)}</g>
${shapeEl(logo.shape, `fill="url(#${id})"`)}
</svg>`;
  }

  function jersey(num, primary, secondary, size = 40) {
    const txt = U.onColor(primary) === '#ffffff' ? '#ffffff' : '#0b0f17';
    return `<svg class="jersey-svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
<path d="M21 6 L28 9 Q32 12 36 9 L43 6 L58 14 L54 29 L47 27 V58 H17 V27 L10 29 L6 14 Z" fill="${primary}" stroke="${secondary}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M8 20 L14 22 M56 20 L50 22" stroke="${secondary}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M28 9 Q32 15 36 9" fill="none" stroke="${secondary}" stroke-width="2.4"/>
<text x="32" y="44" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-weight="700" font-size="${num >= 10 ? 19 : 22}" fill="${txt}" stroke="${secondary}" stroke-width="1.2" paint-order="stroke">${num}</text>
</svg>`;
  }

  return { SHAPES, ICONS, svg, jersey };
})();
