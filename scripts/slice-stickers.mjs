/**
 * 루나 스티커 스프라이트 슬라이싱
 *
 * 원본: public/Chibi_fox_Luna.png (4열 × 2행)
 * 출력: public/stickers/luna-{id}.png (8개 개별 PNG)
 *
 * 사용: node scripts/slice-stickers.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INPUT = path.join(ROOT, 'public', 'Chibi_fox_Luna.png');
const OUT_DIR = path.join(ROOT, 'public', 'stickers');

// 4열 × 2행 → 8개 스티커
const COLS = 4;
const ROWS = 2;

const STICKER_IDS = [
  // Row 0 (top): left → right
  'heart',     // 하트눈
  'cry',       // 울음
  'angry',     // 화남
  'proud',     // 뿌듯
  // Row 1 (bottom): left → right
  'comfort',   // 토닥
  'celebrate', // 축하
  'think',     // 생각
  'fighting',  // 화이팅
];

async function main() {
  const meta = await sharp(INPUT).metadata();
  const { width, height } = meta;

  const cellW = Math.floor(width / COLS);
  const cellH = Math.floor(height / ROWS);

  console.log(`원본: ${width}×${height} → 셀: ${cellW}×${cellH}`);

  for (let i = 0; i < STICKER_IDS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const id = STICKER_IDS[i];

    const left = col * cellW;
    const top = row * cellH;

    const outPath = path.join(OUT_DIR, `luna-${id}.png`);

    await sharp(INPUT)
      .extract({ left, top, width: cellW, height: cellH })
      // 검정 배경(#000000) → 투명 처리
      // 어두운 픽셀(R+G+B < 60)의 알파를 0으로
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        const { width: w, height: h, channels } = info;
        // RGBA 버퍼 생성
        const rgba = Buffer.alloc(w * h * 4);
        for (let p = 0; p < w * h; p++) {
          const r = data[p * channels];
          const g = data[p * channels + 1];
          const b = data[p * channels + 2];
          const a = channels === 4 ? data[p * channels + 3] : 255;

          // 어두운 배경 픽셀 → 투명
          const brightness = r + g + b;
          if (brightness < 60) {
            rgba[p * 4] = 0;
            rgba[p * 4 + 1] = 0;
            rgba[p * 4 + 2] = 0;
            rgba[p * 4 + 3] = 0;
          } else {
            rgba[p * 4] = r;
            rgba[p * 4 + 1] = g;
            rgba[p * 4 + 2] = b;
            rgba[p * 4 + 3] = a;
          }
        }
        return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
          .png()
          .toFile(outPath);
      });

    console.log(`✅ luna-${id}.png (${col},${row})`);
  }

  console.log(`\n🎉 ${STICKER_IDS.length}개 스티커 생성 완료 → public/stickers/`);
}

main().catch(console.error);
