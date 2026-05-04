# 루나 채팅 진입 UX v112-rev2 — Unni's KakaoTalk

**작성일**: 2026-05-05 (rev2 — 사용자 피드백 후 전면 재설계)
**대상 버전**: v112
**총 분량**: A4 ~12장
**비파괴 원칙**: 기존 mood/whispers · opening.mp4 · ChatInput · 라이브러리(haptic/audio/streak) 그대로. v112-rev1 의 7 카드 컴포넌트는 **언마운트** (파일은 보존, 롤백 가능).

---

## 0. 사용자 피드백 (rev1 의 결정적 실수)

> "내 앱은 언니, 누나한테 상담하는 느낌인데 이런 UI로 클릭하게 시키거나 이런거 너무 딱딱하고 일반적인 상담앱같아 ㅠ. 인터넷 제대로 서치하고 내 앱에 특화된 일상적인 느낌으로 다시 매일 들어가도 안 어색하게 반겨주는 느낌으로 잘 만들어줘"

### 0.1 실수 진단 (현재 화면 분석)

스크린샷 기준:
- 🔴 **LunaRoomGlimpse** — 화면 가로 가득 차고 "탭해서 들어가기" 같은 *기능 안내* 가 카톡 톡방에 X
- 🔴 **DailyGreetingCard** — "루나 · bright" 같은 영어 mood 라벨 노출. *카톡 친구* 가 자기 mood 를 라벨로 안 보여줌
- 🔴 **RelationshipBadge** — "함께한 지 13일" 알림 배지처럼 떠있음. *친구 톡방* 에 게이미피케이션 X
- 🔴 **FirstMessageGuide** — 큰 카드 + chip 4개 + "썸/연애 시작" 같은 *카테고리 라벨*. *진짜 친구* 가 카테고리 분류해서 메뉴 X
- 🔴 **전체** — 모든 게 *상담 서비스 앱 위젯*. 진짜 카톡 톡방 X

→ 결론: **카드 모두 제거. 카톡 메시지 버블 + Smart Reply chip 만**.

### 0.2 진짜 컨셉 — "친한 언니 톡방"

> 사용자가 카톡에서 *진짜 친한 언니* 톡방 들어가면 어떤 화면?

```
[ ← 루나 (조용함 ✨)         ⓘ ]
─────────────────────────────────
                            오늘 ─

  🦊 [opening.mp4]              ← 루나가 보낸 영상
                              오후 3:00
  🦊 ⌨ ...                       ← 잠깐 typing
                              오후 3:01
  🦊 ╭──────────────────╮
     │ 왔어? 나 방금 너  │       ← 친구의 카톡 메시지
     │ 생각하던 참인데  │
     ╰──────────────────╯
                              오후 3:01
  🦊 ⌨ ...
  🦊 ╭──────────────╮
     │ 오늘 어땠어 ㅠ │
     ╰──────────────╯


  [응 잘 지냈어 ㅎ] [좀 힘들어 ㅠ] [그냥 얘기]   ← 답장 chip
─────────────────────────────────
[ 한 줄만 적어봐...    🎤 + ➤ ]
```

여기 *카드는 한 장도 없어*. *알림 배지도 없어*. *카테고리 라벨도 없어*.
그냥 **루나가 보낸 카톡 + 답장 추천**.

---

## 1. 글로벌 사례 종합 (재검색)

| 출처 | 핵심 패턴 |
|------|----------|
| **iMessage / WhatsApp / Telegram** | 보낸 오른쪽 / 받은 왼쪽. **메시지 분리 버블** (한 카드 X). typing indicator. |
| **카카오톡** | 친구 프로필 작게 (헤더), 메시지 좌측 정렬, 시간 작게. 매우 미니멀. |
| **Wysa** | 친근한 페르소나 (펭귄). **여러 짧은 메시지가 연속 도착** + 페이스. |
| **Reppley (한국)** | KakaoTalk 친구 같은 AI. SNS 학습 기반 자연 톡. |
| **Smart Reply** (Google/Apple) | 채팅창 안 가로 chip 작은 버튼. **카드 X**. |
| **Snapchat 13~24세 75%** | 친한 친구 사적 소통. 알림/배지 거의 없는 톡방. |
| **챗봇 모범 사례** | "여러 짧은 메시지 버블 + typing indicator" → 자연스러운 대화 리듬 |

→ 핵심: **카드 0장. 메시지 버블 + 작은 chip. 그게 다.**

---

## 2. 컨셉 — Unni's KakaoTalk

### 2.1 5초 시퀀스 (rev2)

```
시간    | 이벤트                                | 사운드     | 햅틱
--------+--------------------------------------+-----------+------
0.0s    | 진입 페이드인                          | chime soft| .light
0.3s    | 영상 (opening.mp4) 자동 재생          | (영상)    | —
~3.5s   | 영상 종료                             | —         | —
3.8s    | 🦊 ⌨ "..." typing indicator 등장      | tiny tap  | —
4.4s    | 첫 메시지 버블 도착 + 살짝 bounce      | tiny ping | .light
        |  "왔어? 나 방금 너 생각하던 참인데"    |           |
4.9s    | 🦊 ⌨ "..." typing                     | tiny tap  | —
5.5s    | 두 번째 메시지 버블 도착 (선택)         | tiny ping | .light
        |  "오늘 어땠어 ㅠㅠ"                    |           |
6.0s    | SmartReplyBar 페이드인 (ChatInput 위) | sparkle   | —
        |  [답장 chip 4개 작게]                  |           |
6.3s    | placeholder "한 줄만 적어봐 ✨"        | —         | —
```

대화 리듬이 *진짜 친구 카톡* 처럼 typing → 메시지 → typing → 메시지.

### 2.2 4가지 변경 원칙 (rev1 → rev2)

| 항목 | rev1 (잘못) | rev2 (올바름) |
|------|------------|--------------|
| 인사 | DailyGreetingCard (큰 카드) | **LunaGreetingMessage** (카톡 버블 1~2개) |
| 메뉴 | FirstMessageGuide (chip 카드 4개 + 카테고리) | **SmartReplyBar** (작은 chip 가로 스크롤) |
| 룸 | LunaRoomGlimpse (큰 단면) | **제거** (또는 헤더 옆 마이크로 아이콘) |
| 누적 | RelationshipBadge ("13일째") | **제거** (선택: 헤더 옆 ✨13 점) |
| 분위기 | ChatEntryAmbience (mood 그라데이션 + 파티클) | **절제** — 거의 안 보일 정도 |
| 캐릭터 | LunaIdleCharacter (별도 위치) | 카톡 메시지 프로필로 자연 통합 |
| 영상 | opening.mp4 | 그대로 (카톡 영상 메시지처럼) |
| 시퀀스 | EntryRitualOrchestrator | 그대로 (rev2 타이밍으로 갱신) |

→ **카드 0장. 메시지 + chip 만**.

---

## 3. 신규 컴포넌트 2종 (rev2)

### 3.1 `LunaGreetingMessage` 💬 [신규]

**파일**: `src/components/chat/LunaGreetingMessage.tsx`

**역할**: 루나의 인사 카톡 메시지 1~2개 + typing indicator. **카톡 버블 그대로**.

**Props**:
```ts
interface Props {
  mood: LunaMood;
  activity: LunaActivity;
  recentSessionCount24h: number;
  intimacyLevel: number;
  ageDays: number;
  /** 영상 끝나야 시작 */
  startSequence: boolean;
  onAllShown?: () => void;  // 모든 메시지 도착 후 → SmartReplyBar 등장 트리거
}
```

**구조 (한 컴포넌트가 1~2 메시지 도착을 시퀀싱)**:

```
[루나 프로필 (LunaIdleCharacter md)]    [↺ ...]            ← typing 인디케이터
                                        [↻ 메시지1 버블]    ← 도착 (slide-in)
[루나 프로필 (small)]                   [↺ ...]            ← typing 인디케이터
                                        [↻ 메시지2 버블]    ← 도착
```

**시퀀싱**:
1. 0ms: profile + typing dot 등장 (300ms 후 첫 dot)
2. 600ms: 첫 메시지 버블 도착 (페이드인 + slight bounce + tiny ping sound)
3. 1100ms: 두 번째 typing
4. 1700ms: 두 번째 메시지 도착
5. 2000ms: onAllShown 호출

**메시지 픽 로직** (whispers.ts 활용):
- 첫 메시지: `pickGreeting({ mood, recentSessionCount24h, seed })` (이미 있음)
- 두 번째 메시지 (선택, 60% 확률):
  - intimacy 낮음 → `mood/activity` 기반 follow-up ("오늘 어땠어 ㅠ")
  - intimacy 높음 → 친근한 두 번째 ("야 나 너 보고 싶었거든 ㅎ")
  - revisit frequent → "괜찮아? 오늘 자꾸 와서 걱정돼"

**카톡 버블 스타일**:
- 좌측 정렬 (받은 메시지)
- 배경: `#F4EFE6` 또는 mood 별 살짝 다른 부드러운 톤
- 모서리: `rounded-[18px] rounded-tl-[4px]` (카톡 표준)
- 텍스트: 14px 일반체 (손글씨 X — 친구 카톡 폰트와 동일)
- 그림자: 매우 미세 `0 1px 3px rgba(0,0,0,0.05)`
- 시간: 버블 옆 작게 (`오후 3:01` 11px 회색)
- profile 이미지 (LunaIdleCharacter sm) 옆에 (첫 메시지만 — 두 번째 메시지는 같은 시간 그룹)

**typing indicator**:
- 점 3개 통통 튀는 애니메이션
- 카카오톡 / iMessage 표준
- 0.6초마다 점 1개씩 → loop

**메시지 카피 예시** (mood/recent 별):
```ts
// first 진입 (24h 0번)
- bright + morning: "왔어? 오늘 햇빛 좋다"
- warm + afternoon: "잘 지냈어? 차 마시던 참인데"
- wistful: "...오늘 좀 그런 날이야"
- sleepy + night: "아 나 자다 깼어 ㅎ"

// recurring (24h 1~2번)
- "또 왔네 ㅎ"
- "오 빨리 다시 왔다"

// frequent (24h 3+번)
- "오늘 자꾸 오네… 괜찮아?"

// 두 번째 메시지 (follow-up, 50~70% 확률)
- "오늘 어땠어 ㅠㅠ"
- "무슨 일 있어?"
- "편하게 다 말해"
- "나 너 얘기 듣고 싶어"
```

→ 모든 카피는 `whispers.ts` 의 풀 활용 + 신규 follow-up 풀 추가.

### 3.2 `SmartReplyBar` 💬 [신규]

**파일**: `src/components/chat/SmartReplyBar.tsx`

**역할**: ChatInput 바로 위에 작은 답장 chip 가로. **카드 아닌 작은 버튼**.

**Props**:
```ts
interface Props {
  mood: LunaMood;
  ageDays: number;
  intimacyLevel: number;
  recentSessionCount24h: number;
  /** 모든 인사 메시지 도착 후 true */
  visible: boolean;
  onChipSelect: (text: string) => void;
}
```

**시각**:

```
┌──────────────────────────────────────────┐
│ [응 잘 지냈어 ㅎ] [좀 힘들어 ㅠ] [..] [...] │   ← 가로 스크롤
├──────────────────────────────────────────┤
│ [한 줄만 적어봐 ✨...]   🎤  +  ➤        │   ← ChatInput
└──────────────────────────────────────────┘
```

**chip 디자인**:
- 가로 스크롤 (overflow-x-auto)
- 각 chip: 작은 pill 버튼 (높이 32px)
- 배경: `bg-white border border-pink-100/60` 또는 살짝 mood 색상
- 텍스트: 12.5px (12자 이내 권장)
- 그림자 매우 미세
- 카테고리 라벨 **없음** — 그냥 답장 텍스트만
- 최대 5개 (모바일 화면에 3~4개 보임 + 좌우 스크롤)
- 클릭 → ChatInput 으로 텍스트 채우기 (자동 전송 X) + 햅틱 light + pop sound
- 클릭 후 0.3초에 SmartReplyBar 페이드 아웃 (자리 양보)

**chip 풀 — 카테고리 라벨 X, 답장 톤만**:
```ts
// recent_first (오늘 첫 진입, 인사 답장)
- "응 잘 지냈어 ㅎ"
- "오늘 좀 힘들어 ㅠ"
- "그냥 얘기하고 싶어"
- "나 또 그 일이야"
- "잠깐만 누구라도 옆에"

// recent_recurring (재방문)
- "응 또 왔어 ㅎㅎ"
- "할 말 있어"
- "오늘은 좀 다른 일이야"
- "그냥 너 보고 싶어서"

// recent_frequent (자주)
- "응... 오늘 진짜 힘들어"
- "어떻게 해야 할지 모르겠어"
- "잠깐만 안아줘"

// mood 보정 (선택)
- bright + first → "오 나 좋은 일 있었어!"
- wistful + first → "... 그냥 좀 우울해"
- sleepy + first → "잠 안 와서 왔어"

// intimacy 4~5 (절친) — 가벼운 톤
- "야 또 그 일 ㅋㅋ"
- "내 얘기 좀 들어줘"

// intimacy 0~1 (정중) — 무난한 톤
- "오늘 얘기하고 싶어요"
- "고민 좀 있어요"
```

→ chip pool: 16~24개. mood + recent + intimacy 따라 섞어서 4개 픽 (deterministic).

**왜 카테고리 라벨 X**:
- 카톡 답장 추천에 "썸/연애" 같은 라벨 절대 없음
- 진짜 친구 답장은 그냥 답장 자체

---

## 4. ChatContainer 재통합 (rev2)

### 4.1 `messages.length === 0` 분기 재작성

```tsx
{messages.length === 0 && activePersona !== 'tarot' && (
  <EntryRitualOrchestrator>
    {/* ── 영상만 (기존 그대로) ── */}
    <div className="flex flex-col px-2 mt-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex justify-start mb-3 relative"
      >
        {/* 프로필 — 카톡 표준 작게 */}
        <div className="relative mr-2 flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-[16px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACbb3]">
            <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col items-start max-w-[75%]">
          <span className="text-[12px] text-[#5D4037] mb-1 ml-1 font-bold">루나</span>

          {/* Video Bubble — 그대로 */}
          <div className="relative rounded-[20px] rounded-tl-[4px] overflow-hidden bg-[#F4EFE6] shadow-sm border border-[#D5C2A5]">
            <video src="/opening.mp4" autoPlay playsInline ... />
          </div>
        </div>
      </motion.div>
    </div>

    {/* ── 인사 메시지 1~2개 (영상 끝나면) ── */}
    <LunaGreetingMessage
      mood={liveState.mood}
      activity={liveState.activity}
      recentSessionCount24h={entry.recentSessionCount24h}
      intimacyLevel={intimacyDerived?.level ?? 0}
      ageDays={lunaAgeDays}
      startSequence={openingVideoEnded}
      onAllShown={() => setReadyForReply(true)}
    />
  </EntryRitualOrchestrator>
)}

{/* ── ChatInput 위 SmartReplyBar (분기 무관, visible 컨디션) ── */}
<SmartReplyBar
  mood={liveState.mood}
  ageDays={lunaAgeDays}
  intimacyLevel={intimacyDerived?.level ?? 0}
  recentSessionCount24h={entry.recentSessionCount24h}
  visible={messages.length === 0 && readyForReply}
  onChipSelect={(text) => setInputDraft(text)}
/>

<ChatInput initialValue={inputDraft} ... />
```

### 4.2 폐기 컴포넌트 처리

- `LunaRoomGlimpse` / `DailyGreetingCard` / `RelationshipBadge` / `FirstMessageGuide` / `ChatEntryAmbience` / `LunaIdleCharacter` (rev1) — **import 제거 + 사용 위치 제거**
- 컴포넌트 파일은 그대로 보존 (롤백 옵션). 또는 별도 PR 에서 정리.

`LunaIdleCharacter` 는 rev2 에서도 살릴 수 있음 — `LunaGreetingMessage` 의 프로필 위치에서 사용 (사이즈 sm).

### 4.3 헤더 마이크로 표시 (선택)

채팅 헤더 우상단 또는 루나 이름 옆에 매우 작은 표시:
- "✨ 13" (작게, 화려하지 않게) — ageDays
- 또는 카톡처럼 친구 상태 메시지: "오늘 ☀️" (mood 이모지)

→ rev2 에선 일단 **빼고**, 다음 라운드에서 결정.

---

## 5. SmartReplyBar 동작 디테일

### 5.1 등장 / 퇴장
- 등장: `LunaGreetingMessage.onAllShown` 콜백 후 0.5초 페이드인
- 퇴장: chip 클릭 시 0.3초 페이드아웃 + ChatInput 으로 텍스트 흡수 anim

### 5.2 가로 스크롤 + 좌우 fade
- `overflow-x-auto`, `-webkit-overflow-scrolling: touch`
- 좌우 끝에 그라데이션 마스크 (스크롤 가능 hint)
- snap 없음 (자유 스크롤)

### 5.3 chip 작성 규칙
- 12자 이내
- 카테고리 / 라벨 X
- 이모지 0~1개
- 답장 톤 (예: "응 잘 지냈어 ㅎ" / "오늘 좀 힘들어 ㅠ")

### 5.4 클릭 후 동작
1. 햅틱 light + chip-pop sound
2. ChatInput 의 `initialValue` 갱신 → textarea 채워짐 + 자동 포커스
3. SmartReplyBar 페이드아웃 (0.3s)
4. 사용자가 텍스트 수정 가능 (자동 전송 X)
5. 사용자가 한 글자 입력 시작하면 — 그대로 진행 (chip 다시 안 나타남)

### 5.5 chip 안 누르고 직접 입력
- ChatInput textarea 에 한 글자라도 입력 → SmartReplyBar 페이드아웃

---

## 6. 데이터 풀 추가 (`whispers.ts`)

### 6.1 신규: `FOLLOWUP_BY_MOOD` (두 번째 인사 메시지)

```ts
export const FOLLOWUP_BY_MOOD: Record<LunaMood, readonly string[]> = {
  bright: ['오늘 뭐 했어?', '좋은 일 있었으면 좋겠어 ㅎ', '얼굴 보여줘'],
  warm: ['오늘 어땠어 ㅠㅠ', '얘기 들어줄게', '편하게 다 말해'],
  playful: ['뭐 재밌는 일 없어?', '나 심심해 ㅋㅋ', '너 얘기 듣고 싶어'],
  wistful: ['오늘은 좀 가라앉았어?', '괜찮아?', '오늘 같은 날엔 같이 있어줄게'],
  sleepy: ['너도 안 자고 있었어?', '뭔 일이야', '편하게 얘기해'],
  thoughtful: ['요즘 어떻게 지내?', '뭐 고민 있어?', '천천히 얘기해도 돼'],
  peaceful: ['편한 날이야?', '뭐 얘기하고 싶어?', '여기 있어'],
};
```

### 6.2 신규: `SMART_REPLIES` (chip 풀)

```ts
export type ReplyTier = 'first' | 'recurring' | 'frequent';

export const SMART_REPLIES: Record<ReplyTier, readonly string[]> = {
  first: [
    '응 잘 지냈어 ㅎ',
    '오늘 좀 힘들어 ㅠ',
    '그냥 얘기하고 싶어',
    '나 또 그 일이야',
    '잠깐만 옆에 있어줘',
    '할 말 있어',
  ],
  recurring: [
    '응 또 왔어 ㅎㅎ',
    '할 말 있어서',
    '오늘은 좀 다른 일',
    '그냥 너 보고 싶어',
    '나 좀 봐줘',
  ],
  frequent: [
    '응… 오늘 진짜 힘들어',
    '어떻게 해야 할지 모르겠어',
    '잠깐만 안아줘',
    '미안 자꾸 와서',
    '괜찮아 옆에 있어줘',
  ],
};

// mood 보정 (선택)
export const SMART_REPLIES_MOOD_OVERRIDE: Partial<Record<LunaMood, string>> = {
  bright: '오 나 좋은 일 있었어!',
  wistful: '... 그냥 좀 우울해',
  sleepy: '잠 안 와서 왔어',
  playful: '심심해서 왔어 ㅋㅋ',
};

export function pickSmartReplies(args: {
  mood: LunaMood;
  recentSessionCount24h: number;
  intimacyLevel: number;
  seed: number;
}): string[] {
  const tier: ReplyTier =
    args.recentSessionCount24h === 0 ? 'first'
    : args.recentSessionCount24h <= 2 ? 'recurring'
    : 'frequent';

  const base = [...SMART_REPLIES[tier]];
  // mood override 1개 추가 (있으면)
  const moodReply = SMART_REPLIES_MOOD_OVERRIDE[args.mood];
  if (moodReply && !base.includes(moodReply)) base.unshift(moodReply);

  // intimacy 4+ 면 친근 톤 1개 추가
  if (args.intimacyLevel >= 4) base.unshift('야 그 일 또 ㅋㅋ');

  // 4~5개 deterministic 픽
  const start = Math.abs(args.seed) % Math.max(1, base.length - 4);
  return base.slice(start, start + 5);
}
```

### 6.3 follow-up 픽 헬퍼

```ts
export function pickFollowup(args: {
  mood: LunaMood;
  recentSessionCount24h: number;
  intimacyLevel: number;
  seed: number;
}): string {
  // recurring/frequent 는 follow-up 별도 톤
  if (args.recentSessionCount24h >= 3) {
    return '괜찮아? 오늘 자꾸 와서 걱정돼';
  }
  if (args.recentSessionCount24h >= 1 && args.intimacyLevel >= 3) {
    return '뭐 또 일 있어?';
  }
  const pool = FOLLOWUP_BY_MOOD[args.mood];
  return pool[Math.abs(args.seed) % pool.length];
}
```

---

## 7. 시각 디자인 가이드 (rev2)

### 7.1 카톡 톡방 톤
- 배경: 카카오톡 표준 베이지 (`#fbe5b3` 또는 살짝 핑크 베이지)
- 받은 메시지 버블: 흰색 또는 `#F4EFE6` 베이지
- 보낸 메시지 버블: 카카오톡 노랑 (`#FFEB3B` 약간 어두운 톤) 또는 핑크 그라데이션
- 시간: 11px `#999`

### 7.2 폰트
- 본문: 시스템 산세리프 (카카오톡 / iOS / Android 표준)
- 손글씨 폰트는 v112-rev1 의 카드들에서만 썼고, rev2 에선 빼기 (카톡 본문 폰트와 자연스러움 유지)

### 7.3 색상 절제
- mood 별 그라데이션은 거의 안 보일 정도로 미세 (`opacity 0.05~0.1`)
- 파티클 X (또는 1~2개 매우 미세)

### 7.4 Smart Reply chip 스타일
- 작고 미니멀 (32px 높이)
- 카톡 답장 추천과 동일한 톤
- 라벨 X / 카테고리 X / 이모지 1개 이내

---

## 8. 파일 변경 명세

### 신규 (2 파일)
- [ ] `src/components/chat/LunaGreetingMessage.tsx` (메시지 버블 시퀀스)
- [ ] `src/components/chat/SmartReplyBar.tsx` (가로 chip)

### 수정 (3 파일)
- [ ] `src/lib/luna-life/whispers.ts`
  - `FOLLOWUP_BY_MOOD` 추가
  - `SMART_REPLIES` + `SMART_REPLIES_MOOD_OVERRIDE` 추가
  - `pickFollowup` / `pickSmartReplies` 헬퍼
  - **`CHIP_POOLS_BY_MOOD_DAY`** 는 제거하지 말고 보존 (다른 곳 활용 여지)
- [ ] `src/components/chat/ChatContainer.tsx`
  - rev1 의 7 컴포넌트 import 제거
  - rev1 의 7 컴포넌트 render 블록 제거
  - 신규 2 컴포넌트 마운트
  - `setReadyForReply` state 추가 (LunaGreetingMessage onAllShown 트리거)
  - SmartReplyBar 를 ChatInput 바로 위에 배치
- [ ] `src/components/chat/EntryRitualOrchestrator.tsx`
  - `ambienceMood`/`ambienceStage` props 제거 (또는 유지하되 default `undefined`)
  - 시퀀스 timing 갱신 (영상 끝→3.8s 부터)

### 보존 (rev1 컴포넌트, 사용 안 함)
- `LunaRoomGlimpse.tsx` (보존, unmount)
- `DailyGreetingCard.tsx` (보존, unmount)
- `RelationshipBadge.tsx` (보존, unmount)
- `FirstMessageGuide.tsx` (보존, unmount)
- `ChatEntryAmbience.tsx` (보존, unmount)
- `LunaIdleCharacter.tsx` (rev2 에선 LunaGreetingMessage 안에서 sm 으로 활용 가능 — 또는 단순 정적 이미지 사용)

→ 다음 PR 에서 정리 / 또는 즉시 삭제. 일단 이 PR 에선 보존.

### 그대로 유지
- `src/lib/haptic.ts` — 활용
- `src/lib/audio.ts` — 활용
- `src/hooks/useStreakDays.ts` — 활용
- `src/app/api/luna-room/streak/route.ts` — 활용
- `src/components/chat/ChatInput.tsx` (initialValue prop) — 활용
- `opening.mp4` — 그대로

---

## 9. Phase 별 구현 순서 (총 ~2.5시간)

### Phase A — 데이터 풀 추가 (`whispers.ts`)
- FOLLOWUP_BY_MOOD (7 mood × 3개 = 21개)
- SMART_REPLIES (3 tier × 5개 + mood override 4개 = 19개)
- pickFollowup / pickSmartReplies 헬퍼
- tsc 0

### Phase B — `LunaGreetingMessage` 작성
- 카톡 버블 스타일 (왼쪽 정렬, rounded, 시간)
- typing indicator (점 3개 통통)
- 시퀀스 (typing → 메시지 → typing → 메시지)
- onAllShown 콜백
- mood/recent 별 카피 픽

### Phase C — `SmartReplyBar` 작성
- 가로 스크롤 chip
- pickSmartReplies 활용
- 클릭 → onChipSelect + 햅틱/사운드
- 자동 페이드아웃

### Phase D — ChatContainer 재통합
- rev1 컴포넌트 import / render 모두 제거
- LunaGreetingMessage + SmartReplyBar 추가
- readyForReply state
- ChatInput 위 위치 조정

### Phase E — EntryRitualOrchestrator 정리
- ambience props 제거 (또는 default off)
- 시퀀스 timing 갱신

### Phase F — 검증
- tsc 0 / lint 0 errors
- 5세션 수동 테스트 (시간대 / 요일 / 친밀도 다양)
- 같은 날 2~3번 진입 차이 확인 (인사 + chip 변화)
- chip 클릭 → ChatInput 채워짐
- 직접 입력 → chip 사라짐
- 모바일 가로 스크롤
- typing indicator 자연스러움

### 종합
- [ ] MEMORY.md 갱신 (rev2 정보)
- [ ] git commit (rev2 스코프)
- [ ] 사용자 검수

---

## 10. UI 스케치 (rev2)

### 10.1 영상 재생 중 (~3초)

```
┌──────────────────────────────────────┐
│ ← 루나                            ⓘ  │
├──────────────────────────────────────┤
│                            오늘 ──── │
│                                      │
│  🦊 [opening.mp4]                    │
│       (영상 재생 중)                  │
│                                      │
├──────────────────────────────────────┤
│ [한 줄만 적어봐 ✨]      🎤  +  ➤   │
└──────────────────────────────────────┘
```

### 10.2 영상 끝나고 typing (4.0s)

```
┌──────────────────────────────────────┐
│ ← 루나                            ⓘ  │
├──────────────────────────────────────┤
│                            오늘 ──── │
│                                      │
│  🦊 [opening.mp4]                    │
│                            오후 3:00 │
│  🦊 ╭──────╮                        │
│     │ ●●● │                          │
│     ╰──────╯                        │
│                                      │
├──────────────────────────────────────┤
│ [한 줄만 적어봐 ✨]      🎤  +  ➤   │
└──────────────────────────────────────┘
```

### 10.3 첫 메시지 도착 (4.4s)

```
┌──────────────────────────────────────┐
│ ← 루나                            ⓘ  │
├──────────────────────────────────────┤
│                            오늘 ──── │
│                                      │
│  🦊 [opening.mp4]                    │
│                            오후 3:00 │
│  🦊 ╭────────────────────╮          │
│     │ 왔어? 나 방금 너   │          │
│     │ 생각하던 참인데    │          │
│     ╰────────────────────╯          │
│                            오후 3:01 │
│                                      │
├──────────────────────────────────────┤
│ [한 줄만 적어봐 ✨]      🎤  +  ➤   │
└──────────────────────────────────────┘
```

### 10.4 두 번째 메시지 + SmartReplyBar (6.0s)

```
┌──────────────────────────────────────┐
│ ← 루나                            ⓘ  │
├──────────────────────────────────────┤
│                            오늘 ──── │
│                                      │
│  🦊 [opening.mp4]                    │
│                            오후 3:00 │
│  🦊 ╭────────────────────╮          │
│     │ 왔어? 나 방금 너   │          │
│     │ 생각하던 참인데    │          │
│     ╰────────────────────╯          │
│  🦊 ╭───────────╮                   │
│     │ 오늘 어땠 │                    │
│     │ 어 ㅠㅠ   │                    │
│     ╰───────────╯                   │
│                            오후 3:01 │
│                                      │
│ [응 잘 지냈어 ㅎ] [좀 힘들어ㅠ] [..] │ ← Smart Reply
├──────────────────────────────────────┤
│ [한 줄만 적어봐 ✨]      🎤  +  ➤   │
└──────────────────────────────────────┘
```

### 10.5 chip 클릭 후

```
┌──────────────────────────────────────┐
│ (위 카톡 메시지 그대로 — 분위기 유지)│
├──────────────────────────────────────┤
│                                      │
│  (SmartReplyBar 페이드아웃)           │
│                                      │
├──────────────────────────────────────┤
│ [좀 힘들어 ㅠ |                ]  ➤  │ ← 채워짐 + 포커스
└──────────────────────────────────────┘
```

---

## 11. 디자인 결정 (Why) — rev1 vs rev2

### Q1. 왜 rev1 의 카드를 다 빼나?

A. rev1 은 *상담 서비스 앱* 위젯들 (룸 단면 / 인사 카드 / 배지 / chip 카드). *카톡 친구 톡방* 에 카드 위젯은 없음. *진짜 친구* 가 카드로 인사하지 않음 — 그냥 카톡 메시지 보냄.

### Q2. 왜 rev2 가 더 *적은 게 더 강하다*?

A. *진짜 친구 톡방* 의 미덕은 **부재의 미학**. 알림 X, 배지 X, 카드 X, 카테고리 X. 그저 **친구가 카톡 보냈고, 나는 답장한다**. 그게 다.

### Q3. 왜 typing indicator 가 핵심?

A. *Wysa, Replika, ChatGPT 모범 사례* — typing indicator 가 대화 리듬을 *살아있게* 만듦. 메시지가 한 번에 다 떠있는 카드 X, *친구가 지금 적고 있다* 는 감각.

### Q4. 왜 Smart Reply chip 은 작게?

A. *카카오톡 답장 추천* / *iOS 18 Smart Reply* / *Gmail 답장 추천* 모두 ChatInput 위 작은 가로 버튼. *카드 형태* 의 chip 은 결정 부담을 키움. 작은 chip 은 *부담 없는 시작점*.

### Q5. 왜 카테고리 라벨 ("썸/연애 시작") 빼나?

A. *진짜 친구* 가 답장 추천에 "썸/연애 시작" 같은 라벨 안 달음. 카테고리 라벨은 *서비스 메뉴* 느낌. *답장 텍스트 자체* 만 보여주기.

### Q6. 왜 룸 / 배지 / mood 라벨 빼나?

A.
- **룸** — 카톡 톡방 안에 친구 방 구조도 X
- **배지** — Snapchat streak 도 톡방 안 작은 표시이지 *큰 알림 배지* X
- **mood 라벨** ("루나 · bright") — 진짜 친구가 자기 mood 영어로 표시 X

→ 이 모든 게 *데이터 의미는 있지만 UI 노출은 X*. 데이터는 그대로 활용 (인사 / chip 톤 변화) — 단지 *라벨로 노출 안 함*.

### Q7. ageDays / streak 데이터는 어디서 활용?

A. **라벨로 노출 X**, 하지만 **인사 / chip 톤** 에 녹임:
- ageDays >= 100 → 100일 모드 카피 활성
- streak >= 5 → "오늘도 와줘서 고마워 🥹" 같은 톤
- recent24h >= 3 → "괜찮아? 오늘 자꾸 와서" 톤

→ *데이터는 백엔드에서 톤을 결정*. *프론트에 ageDays 숫자 노출 X*.

### Q8. 사운드 / 햅틱 그대로?

A. 그대로. 단 *훨씬 절제*:
- 진입 chime → tiny `.light` 한 번
- 메시지 도착 → tiny ping (카톡 알림음 같은 느낌, 아주 작게)
- chip 클릭 → soft pop
- 실제 카톡 보다 *50% 작은 볼륨*

---

## 12. 측정 지표 (rev2)

| 지표 | rev1 (지금) | rev2 (목표) |
|------|-----------|-----------|
| 진입~첫 메시지 시간 | 측정 X | <12초 |
| 1분 무입력 이탈 | 추정 ~15% | <6% |
| Smart Reply 사용률 | (rev1 chip ≈ 0%) | >35% |
| 첫 메시지 길이 평균 | ~12자 | ~22자 (chip 영향) |
| "친구 같다" 피드백 | 가끔 | 자주 |
| "AI 같다" 피드백 | 자주 (rev1) | 드물게 |
| "예쁘다" / "퀄리티" 피드백 | (rev1 답답함) | 자주 |

---

## 13. 비파괴 / 롤백

### 비파괴
- opening.mp4 그대로
- 기존 ChatInput / 헤더 / 메시지 영역 그대로
- mood/whispers 시스템 그대로
- haptic / audio / streak 라이브러리 그대로

### 롤백
- 환경변수 `NEXT_PUBLIC_V112_REV2=0` 토글로 rev1 복귀 (선택)
- rev1 의 7 컴포넌트 파일 보존 — 다음 라운드에서 import 부활 가능
- 이번 PR 의 변경은 ChatContainer 분기 + 신규 2 컴포넌트 + whispers 풀 추가만 → revert 단순

---

## 14. 외부 출처 (재검색 종합)

- iMessage / WhatsApp / Telegram / KakaoTalk: 메시지 버블 표준 (rounded-tl-[4px] 등)
- Reppley (한국): "카톡 친구 같은 AI" 컨셉
- Wysa: 펭귄 페르소나 + 여러 짧은 메시지 + typing
- Replika / Pi: 친구 톤 + 부드러운 음성
- Snapchat: 13~24 75% / 친한 친구 사적 톡
- Smart Reply (Google/Apple): ChatInput 위 작은 가로 chip
- 챗봇 환영 메시지 모범사례: 짧은 메시지 + typing indicator + 명확한 다음 단계

---

## 15. 체크리스트

### Phase A
- [ ] FOLLOWUP_BY_MOOD (7 × 3 = 21)
- [ ] SMART_REPLIES (3 tier × 5)
- [ ] SMART_REPLIES_MOOD_OVERRIDE
- [ ] pickFollowup / pickSmartReplies
- [ ] tsc 0

### Phase B (LunaGreetingMessage)
- [ ] 카톡 버블 스타일
- [ ] typing indicator
- [ ] 메시지 시퀀스 (1~2개)
- [ ] mood/recent 카피 픽
- [ ] onAllShown 콜백

### Phase C (SmartReplyBar)
- [ ] 가로 스크롤 chip
- [ ] pickSmartReplies 활용
- [ ] 클릭 → onChipSelect + 햅틱 + pop
- [ ] 자동 페이드아웃

### Phase D (ChatContainer)
- [ ] rev1 7 컴포넌트 import 제거
- [ ] rev1 7 컴포넌트 render 블록 제거
- [ ] 영상 분기 단순화
- [ ] LunaGreetingMessage 마운트
- [ ] SmartReplyBar 마운트 (ChatInput 위)
- [ ] readyForReply state

### Phase E
- [ ] EntryRitualOrchestrator 시퀀스 timing 갱신
- [ ] ambience props 제거

### Phase F (검증)
- [ ] tsc 0 / lint 0 errors
- [ ] 5세션 수동 테스트
- [ ] 모바일 / 데스크톱
- [ ] 사운드 / 햅틱 동작
- [ ] 가로 스크롤
- [ ] typing 자연스러움

### 종합
- [ ] MEMORY.md 갱신
- [ ] git commit
- [ ] 사용자 검수

---

**작성자**: Claude (Opus 4.7 1M)
**rev2 핵심**: 카드 → 메시지 버블 / chip 카드 → Smart Reply 작은 chip / 룸·배지·라벨 → 제거
**검수**: 사용자 컨펌 대기 → 컨펌 후 Phase A~F 순차 구현
