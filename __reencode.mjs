import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const dir = 'public/splite';
const files = (await readdir(dir)).filter(f => f.endsWith('_x2.webp'));

for (const f of files) {
  const inp = path.join(dir, f);
  const out = path.join(dir, f.replace('_x2.webp', '_x2q85.webp'));
  const before = (await stat(inp)).size;
  await sharp(inp).webp({ quality: 85, effort: 6, alphaQuality: 90 }).toFile(out);
  const after = (await stat(out)).size;
  console.log(`${f}: ${(before/1048576).toFixed(1)}MB -> ${(after/1048576).toFixed(1)}MB (${Math.round(after/before*100)}%)`);
}
