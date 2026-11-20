// Ilustración genérica de coche (perfil lateral) para ofertas sin foto. No representa ningún modelo concreto.
import { COLORS } from './demo-data.js';

const PROFILES = {
  Berlina: { d: 'M30 132 L40 106 Q60 98 112 95 L152 70 Q172 60 232 60 L272 62 Q296 67 320 92 L360 100 Q380 105 378 128 L372 140 L30 140 Z', w: [100, 300], win: 'M160 74 Q175 66 230 66 L268 68 Q286 72 302 90 L150 92 Z' },
  SUV: { d: 'M28 134 L32 100 Q40 90 90 86 L125 55 Q135 46 262 46 L302 50 Q316 56 332 84 L362 92 Q378 98 376 125 L372 142 L28 142 Z', w: [96, 302], win: 'M132 58 Q140 52 258 52 L296 56 Q308 62 320 82 L120 84 Z' },
  Familiar: { d: 'M30 132 L38 104 Q55 97 105 94 L145 66 Q160 58 302 58 L336 64 Q346 72 350 94 L366 100 Q380 106 377 128 L372 140 L30 140 Z', w: [100, 300], win: 'M152 70 Q164 64 298 64 L330 68 Q338 76 340 90 L142 92 Z' },
  'Coupé': { d: 'M30 132 L40 108 Q60 100 120 96 L165 72 Q185 63 235 64 Q275 67 312 92 L360 100 Q380 106 378 128 L372 140 L30 140 Z', w: [100, 300], win: 'M172 76 Q188 69 234 70 Q266 72 292 90 L160 93 Z' },
  Compacto: { d: 'M50 132 L58 104 Q72 96 110 92 L145 64 Q158 57 252 57 L286 62 Q304 78 315 96 L345 102 Q360 108 357 128 L352 140 L50 140 Z', w: [115, 285], win: 'M152 68 Q162 63 248 63 L280 66 Q292 78 300 92 L140 93 Z' },
  Cabrio: { d: 'M30 132 L40 108 Q60 100 120 96 L170 92 L190 78 L200 92 L310 92 L360 100 Q380 106 378 128 L372 140 L30 140 Z', w: [100, 300], win: '' },
};

const colorHex = (name) => (COLORS.find((c) => c.name === name) || COLORS[2]).hex;
let uid = 0;

export function carArt({ body_type, color }, { label = '' } = {}) {
  const p = PROFILES[body_type] || PROFILES.Berlina;
  const hex = colorHex(color);
  const id = `ca${++uid}`;
  return `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${body_type || 'Coche'} ${color || ''}">
  <defs>
    <radialGradient id="${id}bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#2f3338"/><stop offset="1" stop-color="#141517"/></radialGradient>
    <linearGradient id="${id}bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex}" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
  </defs>
  <rect width="400" height="225" fill="url(#${id}bg)"/>
  <g stroke="#8A8F96" stroke-opacity=".07">${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="225"/>`).join('')}</g>
  <ellipse cx="200" cy="168" rx="175" ry="10" fill="#000" opacity=".55"/>
  <line x1="0" y1="168" x2="400" y2="168" stroke="#D9773F" stroke-opacity=".5"/>
  <g transform="translate(0 26)">
    <path d="${p.d}" fill="${hex}"/>
    <path d="${p.d}" fill="url(#${id}bd)" opacity=".5"/>
    ${p.win ? `<path d="${p.win}" fill="#0d0e10" opacity=".82"/>` : ''}
    <path d="M44 112 Q200 104 368 112" stroke="#fff" stroke-opacity=".18" fill="none"/>
    ${p.w.map((x) => `<circle cx="${x}" cy="140" r="25" fill="#0d0e10"/><circle cx="${x}" cy="140" r="15" fill="#2a2d31" stroke="#8A8F96" stroke-width="2"/><circle cx="${x}" cy="140" r="4" fill="#D9773F"/>`).join('')}
  </g>
  ${label ? `<text x="388" y="214" text-anchor="end" font-family="monospace" font-size="10" letter-spacing="2" fill="#8A8F96">${label}</text>` : ''}
</svg>`;
}
