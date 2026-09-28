// Genera icon-192.svg e icon-512.svg: una corona de laurel circular (estilo Grecia antigua),
// en dorado/bronce sobre fondo oscuro. SVG vectorial puro, sin imágenes externas.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cx = 128, cy = 132, rInner = 62, rOuter = 100;

function leaf(angleDeg, side) {
  // Una hoja de laurel: elipse alargada, orientada tangencialmente a lo largo del arco,
  // apuntando hacia arriba/afuera. `side` es -1 (rama izquierda) o +1 (rama derecha).
  const a = (angleDeg * Math.PI) / 180;
  const r = rInner + (rOuter - rInner) * ((angleDeg - 200) / 160) * 0 + rInner; // radio base
  const rr = rInner + ((rOuter - rInner) * (Math.abs(angleDeg - 270) / 100));
  const x = cx + side * rr * Math.sin(a);
  const y = cy - rr * Math.cos(a);
  const rot = side * (angleDeg - 270) * 0.9 + (side > 0 ? 20 : -20);
  const w = 30, h = 13;
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${w}" ry="${h}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#gold)" stroke="#5b4300" stroke-width="2"/>`;
}

const angles = [200, 218, 236, 254, 270, 286, 302, 318, 336];
const leaves = [];
for (const ang of angles) {
  leaves.push(leaf(ang, -1));
  leaves.push(leaf(ang, 1));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d78b"/>
      <stop offset="55%" stop-color="#c9a24b"/>
      <stop offset="100%" stop-color="#9e7a2e"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="#14110E"/>
  ${leaves.join('\n  ')}
  <circle cx="${cx}" cy="${cy + 6}" r="6" fill="#f5d78b"/>
  <path d="M ${cx - 4} ${cy + 8} Q ${cx} ${cy + 26} ${cx + 4} ${cy + 8}" stroke="#c9a24b" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`;

writeFileSync(join(root, 'icon-192.svg'), svg, 'utf8');
writeFileSync(join(root, 'icon-512.svg'), svg, 'utf8');
console.log('icon-192.svg / icon-512.svg generados (corona de laurel).');
