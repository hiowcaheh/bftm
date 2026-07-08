/**
 * Generuje ikony PWA: litera „B" na czerwonym tle (#CC0000).
 * Docelowo (Etap 2+) można podmienić na logo firmy z Ustawień.
 * Uruchomienie: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const ACCENT = '#CC0000';
const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });

// maskable: bezpieczna strefa 80% — litera mniejsza, pełne tło
const svg = (size, { rounded, letterScale }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${ACCENT}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="bold"
        font-size="${size * letterScale}" fill="#FFFFFF">B</text>
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true, letterScale: 0.58 },
  { file: 'icon-512.png', size: 512, rounded: true, letterScale: 0.58 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, letterScale: 0.46 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, letterScale: 0.58 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t))).png().toFile(`${OUT}/${t.file}`);
  console.log(`✓ ${t.file}`);
}
