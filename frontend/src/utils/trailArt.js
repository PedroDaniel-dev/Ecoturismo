// Gera ilustrações de paisagem em SVG (data URI) para as trilhas.
// Usadas quando a trilha não tem foto no banco (tabela TRILHA_IMAGEM) ou quando a foto não carrega.

const PALETTES = [
  { sky: ['#F6C987', '#F3E3C3'], sun: '#FFF1D0', layers: ['#9DB7A6', '#5E8B76', '#2F5D4E', '#173A31'], sea: '#3D7C8C' },
  { sky: ['#8FC6DD', '#E3F1F2'], sun: '#FFFFFF', layers: ['#A9C6C2', '#6E9E8E', '#3E6E5B', '#1F4637'], sea: '#2D7590' },
  { sky: ['#F2A07B', '#F8D8B5'], sun: '#FFE7C2', layers: ['#C69C8F', '#8C6E6A', '#4F4A52', '#28303A'], sea: '#4A6C85' },
  { sky: ['#1F4E5F', '#7FA9B2'], sun: '#F4EBD0', layers: ['#5D8A8F', '#3D6970', '#244B52', '#10313A'], sea: '#163F4B' },
  { sky: ['#B9D8C2', '#F1F0DC'], sun: '#FFFBEA', layers: ['#8DB69A', '#5C9270', '#336C4C', '#16402B'], sea: '#2E8075' },
];

function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function ridge(r, baseY, amp, peaks, w = 800, h = 500, peak) {
  const pts = [];
  const step = w / peaks;
  for (let i = 0; i <= peaks; i++) {
    const x = i * step;
    let y = baseY - r() * amp;
    if (peak && Math.abs(x - peak.x) < step) y = Math.min(y, peak.y);
    pts.push([x, y]);
  }
  let d = `M0 ${h} L0 ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const cx = (px + x) / 2;
    d += ` Q${cx.toFixed(1)} ${(Math.min(py, y) - amp * 0.15).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + ` L${w} ${h} Z`;
}

function trees(r, y, color, count) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = r() * 800;
    const s = 10 + r() * 16;
    const ty = y + r() * 30;
    out += `<path d="M${x} ${ty - s * 2.2} L${x - s * 0.7} ${ty} L${x + s * 0.7} ${ty} Z" fill="${color}"/>`;
  }
  return out;
}

export function trailArt(seed, scene = 'mountain', variant = 0) {
  const r = rng(seed * 7 + variant * 13 + 3);
  const p = PALETTES[(seed + variant) % PALETTES.length];
  const sunX = 120 + r() * 560;
  const sunY = 90 + r() * 80;
  const peakX = 260 + r() * 300;

  let body = '';
  body += `<path d="${ridge(r, 300, 90, 7)}" fill="${p.layers[0]}" opacity=".85"/>`;

  if (scene === 'sea') {
    body += `<rect x="0" y="330" width="800" height="170" fill="${p.sea}"/>`;
    body += `<rect x="0" y="330" width="800" height="3" fill="#ffffff" opacity=".35"/>`;
    // morros isolados no mar (estilo Pão de Açúcar)
    const mx = 420 + r() * 220;
    body += `<path d="M${mx - 70} 335 C${mx - 60} 250 ${mx - 20} 180 ${mx + 5} 180 C${mx + 35} 180 ${mx + 55} 260 ${mx + 75} 335 Z" fill="${p.layers[2]}"/>`;
    body += `<path d="M${mx - 190} 335 C${mx - 175} 290 ${mx - 145} 265 ${mx - 125} 265 C${mx - 105} 265 ${mx - 90} 300 ${mx - 70} 335 Z" fill="${p.layers[2]}" opacity=".9"/>`;
    body += `<path d="${ridge(r, 420, 60, 5)}" fill="${p.layers[3]}"/>`;
    body += trees(r, 400, p.layers[3], 10);
  } else if (scene === 'forest') {
    body += `<path d="${ridge(r, 330, 110, 6)}" fill="${p.layers[1]}"/>`;
    // cachoeira
    const wx = 330 + r() * 140;
    body += `<path d="M${wx} 250 C${wx - 8} 320 ${wx + 8} 380 ${wx - 4} 470 L${wx + 30} 470 C${wx + 22} 380 ${wx + 34} 320 ${wx + 26} 250 Z" fill="#EAF6F7" opacity=".85"/>`;
    body += `<path d="${ridge(r, 410, 70, 8)}" fill="${p.layers[2]}"/>`;
    body += trees(r, 400, p.layers[3], 26);
    body += `<path d="${ridge(r, 480, 30, 10)}" fill="${p.layers[3]}"/>`;
  } else {
    body += `<path d="${ridge(r, 340, 150, 6, 800, 500, { x: peakX, y: 120 + r() * 50 })}" fill="${p.layers[1]}"/>`;
    body += `<path d="${ridge(r, 400, 90, 7)}" fill="${p.layers[2]}"/>`;
    body += trees(r, 410, p.layers[3], 18);
    body += `<path d="${ridge(r, 470, 40, 9)}" fill="${p.layers[3]}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
<rect width="800" height="500" fill="url(#s)"/>
<circle cx="${sunX}" cy="${sunY}" r="38" fill="${p.sun}" opacity=".9"/>
<g fill="#ffffff" opacity=".7"><ellipse cx="${(sunX + 240) % 800}" cy="${sunY - 20}" rx="70" ry="14"/><ellipse cx="${(sunX + 200) % 800}" cy="${sunY - 8}" rx="40" ry="10"/></g>
${body}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function avatarFor(name = '?') {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E3A44"/><stop offset="1" stop-color="#C9A04A"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="41" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
