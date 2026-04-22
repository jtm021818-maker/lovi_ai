# 정령 스프라이트 시트 규격 (v85.4)

정령 이미지는 **단일 PNG 스프라이트 시트** 한 장에 모든 애니메이션 상태를 담는 구조입니다.

## 📐 시트 규격

| 항목 | 값 |
|------|-----|
| 포맷 | PNG (투명 배경 권장) 또는 WebP |
| 전체 크기 | **1024 × 320 px** |
| 프레임 크기 | **64 × 64 px** |
| 격자 | 16열 × 5행 |
| 파일명 | `spirit-sprites.ts`에 등록된 이름. 예: 달빛토끼 = `moon_rabit_sprite_myroom.png` |

## 🎞️ 행 레이아웃

모든 행은 **왼쪽 정렬**. 해당 상태 프레임이 다 끝난 이후 칸은 비워둬도 됨.

| 행 (y) | 상태 | 프레임 수 | FPS | 루프 | 비고 |
|--------|------|-----------|-----|------|------|
| Row 0 (y: 0)   | `idle`   | 12 | 8  | 무한 | 숨쉬기/부유. 가장 풍부하게 |
| Row 1 (y: 64)  | `walk`   | 16 | 12 | 무한 | **오른쪽 바라봄**. 왼쪽 이동은 코드에서 flip |
| Row 2 (y: 128) | `react`  | 10 | 14 | 1회  | 유저 메시지/탭 반응 |
| Row 3 (y: 192) | `arrive` | 6  | 12 | 1회  | 목표점 도착 후 착지 |
| Row 4 (y: 256) | `sleep`  | 5  | 6  | 무한 | 장시간 idle 후 sleep |

총 **49프레임**.

## 🎨 디자인 가이드

- **캐릭터 중심 배치**: 프레임 64×64의 중앙에 캐릭터를 배치. 여백 포함 가능.
- **일관된 크기**: 모든 프레임에서 캐릭터 크기가 과도하게 변하지 않도록.
- **투명 배경 필수**: 방 배경 위에 올라가므로 배경 투명 유지.
- **그림자**: 런타임에서 `drop-shadow(themeColor)` 적용되므로, 시트 자체엔 그림자 빼는 것이 깔끔함.
- **walk 방향**: 반드시 **오른쪽을 보는 프레임**으로. 왼쪽 이동은 `scaleX(-1)` 자동 처리.
- **픽셀아트**: 픽셀아트면 `spirit-sprites.ts`에서 `pixelated: true` 설정.

## 📂 등록 방법

1. 이미지를 `/public/spirits/{spirit_id}.png`에 저장
2. `src/data/spirit-sprites.ts`의 `SPIRIT_SPRITES` 객체에 항목 추가:

```typescript
moon_rabbit: {
  src: '/spirits/moon_rabbit.png',
  frameWidth: 64,
  frameHeight: 64,
  displayScale: 0.75,   // 방에서 48px 크기 (64 × 0.75)
  pixelated: false,
  states: {
    idle:   { row: 0, frames: 12, fps: 8 },
    walk:   { row: 1, frames: 16, fps: 12 },
    react:  { row: 2, frames: 10, fps: 14, once: true },
    arrive: { row: 3, frames: 6,  fps: 12, once: true },
    sleep:  { row: 4, frames: 5,  fps: 6 },
  },
},
```

3. 등록 즉시 마음의방에서 배회, 도감에서 idle 애니메이션 자동 적용.

## ⚡ 폴백 동작

- 이미지 로드 실패 → 자동으로 이모지 표시
- 스프라이트 등록 안 된 정령 → 기존 이모지 + Framer Motion idle 그대로

## 🎯 AI 생성 프롬프트 예시 (달빛토끼)

달빛토끼는 `R` 등급, 테마색 `#A78BFA` (연보라), 새벽형 위로 토끼.

```
Soft pastel purple moonlit rabbit sprite sheet, 1024x320 pixels,
16 columns x 5 rows grid of 64x64 frames, transparent background,
cute chibi style, glowing crescent moon accent.

Row 0 (idle): 12 frames of gentle floating/breathing
Row 1 (walk): 16 frames of smooth walking cycle, facing right
Row 2 (react): 10 frames of perked ears + happy hop
Row 3 (arrive): 6 frames of landing softly
Row 4 (sleep): 5 frames of curled sleeping with Zzz

Style: soft watercolor, dreamy, pastel purple and lavender,
white fur, pink inner ears, tiny glowing stars around,
consistent character size in all frames.
```
