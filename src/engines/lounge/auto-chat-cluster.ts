/**
 * 💬 v44: Auto-Chat Cluster Engine
 *
 * 카톡 단톡방의 "burst → silence → burst" 리듬을 LLM 0회로 구현.
 *
 * 핵심 메커니즘:
 * 1. 시간대별 150+ 루나↔타로냥 대화쌍 풀
 * 2. 3~6개 메시지를 2~5초 간격으로 연속 출현 (클러스터)
 * 3. 클러스터 간 3~8분 랜덤 침묵
 * 4. 유저 참여 감지 → 일시정지 → 확장 응답 종료 후 재개
 */

// ─── Types ──────────────────────────────────────────────

type TimeSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';
type Category = 'banter' | 'daily' | 'emotional' | 'userMention' | 'card' | 'food' | 'tease';

export interface ChatLine {
  speaker: 'luna' | 'tarot';
  text: string;
}

export interface ChatCluster {
  id: string;
  category: Category;
  timeSlots: TimeSlot[];  // 이 클러스터가 등장 가능한 시간대
  lines: ChatLine[];
}

export interface ClusterPlaybackItem {
  speaker: 'luna' | 'tarot';
  text: string;
  delayMs: number; // 클러스터 시작 기준 ms
}

// ─── 시간대 판정 ────────────────────────────────────────

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h < 6) return 'lateNight';
  if (h < 9) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  if (h < 23) return 'night';
  return 'lateNight';
}

// ─── 대화쌍 풀 (150+) ──────────────────────────────────

const CHAT_CLUSTERS: ChatCluster[] = [
  // ═══════════ 일상 수다 (daily) ═══════════
  {
    id: 'coffee_1', category: 'daily', timeSlots: ['dawn', 'morning'],
    lines: [
      { speaker: 'luna', text: '커피 마실 사람~?' },
      { speaker: 'tarot', text: '나.' },
      { speaker: 'luna', text: '아메리카노? 라떼?' },
      { speaker: 'tarot', text: '이 시간엔 아메리카노지.' },
      { speaker: 'luna', text: '역시 ㅋ 나도 아아로 ☕' },
    ],
  },
  {
    id: 'morning_stretch', category: 'daily', timeSlots: ['dawn', 'morning'],
    lines: [
      { speaker: 'luna', text: '으아~ 잘 잤다!' },
      { speaker: 'tarot', text: '...넌 맨날 잘 자더라.' },
      { speaker: 'luna', text: '그게 뭐 어때서 ㅋ' },
      { speaker: 'tarot', text: '부럽다고.' },
    ],
  },
  {
    id: 'weather_chat', category: 'daily', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '밖에 날씨 좋은 것 같아!' },
      { speaker: 'tarot', text: '어차피 난 안 나가.' },
      { speaker: 'luna', text: '좀 나가! 비타민 D 필요해' },
      { speaker: 'tarot', text: '카드가 실내 에너지가 좋대.' },
      { speaker: 'luna', text: '그거 네가 지어낸 거잖아 ㅋㅋ' },
    ],
  },
  {
    id: 'lunch_plan', category: 'food', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '점심 뭐 먹지?' },
      { speaker: 'tarot', text: '참치캔.' },
      { speaker: 'luna', text: '야... 좀 제대로 먹어' },
      { speaker: 'tarot', text: '참치캔이 제대로인데.' },
      { speaker: 'luna', text: '파스타 만들까? 저번에 실패했지만...' },
      { speaker: 'tarot', text: '...배달 시키자.' },
    ],
  },
  {
    id: 'afternoon_nap', category: 'daily', timeSlots: ['afternoon'],
    lines: [
      { speaker: 'tarot', text: '졸리다...' },
      { speaker: 'luna', text: '낮잠 자지 마! 밤에 못 자!' },
      { speaker: 'tarot', text: '고양이는 16시간 자는 게 정상이야.' },
      { speaker: 'luna', text: '넌 고양이... 맞나? ㅋ' },
    ],
  },
  {
    id: 'evening_wind', category: 'daily', timeSlots: ['evening'],
    lines: [
      { speaker: 'luna', text: '오늘 하루도 수고했다~' },
      { speaker: 'tarot', text: '...뭘 수고했는데.' },
      { speaker: 'luna', text: '존재 자체가 수고지 ㅋ' },
      { speaker: 'tarot', text: '그건 맞아.' },
    ],
  },
  {
    id: 'dinner_time', category: 'food', timeSlots: ['evening'],
    lines: [
      { speaker: 'luna', text: '저녁은 뭐 먹을까~' },
      { speaker: 'tarot', text: '치킨.' },
      { speaker: 'luna', text: '어제도 치킨이었잖아!' },
      { speaker: 'tarot', text: '치킨은 매일 먹어도 된다.' },
      { speaker: 'luna', text: '...부정할 수 없다' },
    ],
  },
  {
    id: 'night_music', category: 'emotional', timeSlots: ['night'],
    lines: [
      { speaker: 'luna', text: '노래 하나 틀어도 돼?' },
      { speaker: 'tarot', text: '조용한 거로.' },
      { speaker: 'luna', text: '알지~ 잔잔한 거 ♪' },
      { speaker: 'tarot', text: '...나쁘지 않네.' },
    ],
  },
  {
    id: 'late_night_stars', category: 'emotional', timeSlots: ['night', 'lateNight'],
    lines: [
      { speaker: 'tarot', text: '오늘 별이 많다.' },
      { speaker: 'luna', text: '진짜? 봐봐!' },
      { speaker: 'tarot', text: '저 별자리가 뭔지 알아?' },
      { speaker: 'luna', text: '몰라 ㅋ 알려줘' },
      { speaker: 'tarot', text: '...나도 모르겠다.' },
      { speaker: 'luna', text: 'ㅋㅋㅋㅋ 뭐야!' },
    ],
  },

  // ═══════════ 티격태격 (banter) ═══════════
  {
    id: 'banter_clean', category: 'banter', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '타로냥 자리 좀 치워...' },
      { speaker: 'tarot', text: '이건 체계적으로 놓은 거야.' },
      { speaker: 'luna', text: '카드가 바닥에 다 깔려있는데??' },
      { speaker: 'tarot', text: '...그것도 배치야.' },
      { speaker: 'luna', text: '하... ㅋㅋ' },
    ],
  },
  {
    id: 'banter_snack', category: 'banter', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '내 과자 누가 먹었어?!' },
      { speaker: 'tarot', text: '...' },
      { speaker: 'luna', text: '타로냥?!' },
      { speaker: 'tarot', text: '...맛있었어.' },
      { speaker: 'luna', text: '최소한 미안하다고는 해!!' },
      { speaker: 'tarot', text: '미안. 맛있었어.' },
    ],
  },
  {
    id: 'banter_pillow', category: 'banter', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '타로냥! 내 쿠션에서 내려와!' },
      { speaker: 'tarot', text: '따뜻해서 안 내려감.' },
      { speaker: 'luna', text: '내 자리야 거기!' },
      { speaker: 'tarot', text: '이제 내 자리야.' },
    ],
  },
  {
    id: 'banter_tv', category: 'banter', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'luna', text: 'TV 뭐 볼까?' },
      { speaker: 'tarot', text: '동물 다큐.' },
      { speaker: 'luna', text: '또??' },
      { speaker: 'tarot', text: '생선 나오는 거.' },
      { speaker: 'luna', text: '너 그거 보면서 침 흘려...' },
      { speaker: 'tarot', text: '안 흘려.' },
    ],
  },
  {
    id: 'banter_alarm', category: 'banter', timeSlots: ['dawn', 'morning'],
    lines: [
      { speaker: 'luna', text: '타로냥 일어나~~' },
      { speaker: 'tarot', text: 'zzz...' },
      { speaker: 'luna', text: '일어나!! 해 떴어!' },
      { speaker: 'tarot', text: '...해가 뜨든 말든...' },
    ],
  },
  {
    id: 'banter_nickname', category: 'banter', timeSlots: ['morning', 'afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '타로냥은 언제 볼수록 귀여워~' },
      { speaker: 'tarot', text: '귀엽다고 하지 마.' },
      { speaker: 'luna', text: '왜~? 사실인데 ㅋ' },
      { speaker: 'tarot', text: '카리스마 있다고 해.' },
      { speaker: 'luna', text: '카리스마 있고... 귀엽다 ㅋㅋ' },
      { speaker: 'tarot', text: '...하.' },
    ],
  },

  // ═══════════ 카드/타로 관련 (card) ═══════════
  {
    id: 'card_morning', category: 'card', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'tarot', text: '오늘 아침 카드 뽑았어.' },
      { speaker: 'luna', text: '뭐 나왔어?' },
      { speaker: 'tarot', text: '별. 좋은 카드야.' },
      { speaker: 'luna', text: '오~ 뭐가 좋은 건데?' },
      { speaker: 'tarot', text: '희망이랑 영감. 새로운 시작도.' },
      { speaker: 'luna', text: '좋다! 오늘 좋은 하루 되겠다 ✨' },
    ],
  },
  {
    id: 'card_shuffle', category: 'card', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'tarot', text: '카드 셔플 중...' },
      { speaker: 'luna', text: '또 셔플해? 오늘만 몇 번째야?' },
      { speaker: 'tarot', text: '셔플은 명상이야.' },
      { speaker: 'luna', text: '아... 그렇구나' },
      { speaker: 'tarot', text: '자꾸 말 걸면 에너지가 흐트러져.' },
      { speaker: 'luna', text: '네네~ 조용히 할게요~' },
    ],
  },
  {
    id: 'card_evening', category: 'card', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'tarot', text: '밤에는 카드 에너지가 달라져.' },
      { speaker: 'luna', text: '어떻게 다른데?' },
      { speaker: 'tarot', text: '더 솔직해지는 느낌.' },
      { speaker: 'luna', text: '좀 무섭기도 한데...' },
      { speaker: 'tarot', text: '진실이 무서울 수도 있지.' },
    ],
  },
  {
    id: 'card_collection', category: 'card', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '이 카드 덱 좀 낡았어. 새 거 사야 하나...' },
      { speaker: 'luna', text: '집에 카드 덱이 몇 개야??' },
      { speaker: 'tarot', text: '...세지 마.' },
      { speaker: 'luna', text: 'ㅋㅋㅋㅋ' },
    ],
  },
  {
    id: 'card_prediction', category: 'card', timeSlots: ['morning', 'afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '루나, 카드가 뭔가 재밌는 걸 보여줘.' },
      { speaker: 'luna', text: '뭔데?' },
      { speaker: 'tarot', text: '오늘 뭔가 좋은 일이 있을 거라고.' },
      { speaker: 'luna', text: '진짜?? 뭘까 ㅎㅎ 기대된다' },
      { speaker: 'tarot', text: '기대하면 안 생기는 법이야.' },
      { speaker: 'luna', text: '그럼 왜 말한 거야!!' },
    ],
  },

  // ═══════════ 감성 대화 (emotional) ═══════════
  {
    id: 'emotional_moon', category: 'emotional', timeSlots: ['night', 'lateNight'],
    lines: [
      { speaker: 'luna', text: '달이 예쁘다...' },
      { speaker: 'tarot', text: '초승달이야. 새로운 시작의 에너지.' },
      { speaker: 'luna', text: '뭔가 시작하고 싶어지네' },
      { speaker: 'tarot', text: '시작은 언제 해도 괜찮아.' },
    ],
  },
  {
    id: 'emotional_rain', category: 'emotional', timeSlots: ['afternoon', 'evening', 'night'],
    lines: [
      { speaker: 'luna', text: '비 소리 좋다...' },
      { speaker: 'tarot', text: '비 올 때 카드가 잘 읽혀.' },
      { speaker: 'luna', text: '비 올 때의 공기 좋아하는데' },
      { speaker: 'tarot', text: '...나도.' },
    ],
  },
  {
    id: 'emotional_nostalgia', category: 'emotional', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'luna', text: '갑자기 옛날 생각이 나네...' },
      { speaker: 'tarot', text: '무슨 생각?' },
      { speaker: 'luna', text: '우리 처음 만났을 때!' },
      { speaker: 'tarot', text: '...그때 네가 나한테 귀엽다고 했잖아.' },
      { speaker: 'luna', text: 'ㅋㅋ 지금도 귀엽잖아~' },
      { speaker: 'tarot', text: '...(귀 접음)' },
    ],
  },
  {
    id: 'emotional_goodnight', category: 'emotional', timeSlots: ['night', 'lateNight'],
    lines: [
      { speaker: 'luna', text: '나 슬슬 잘까...' },
      { speaker: 'tarot', text: '잘 자.' },
      { speaker: 'luna', text: '타로냥도 일찍 자!' },
      { speaker: 'tarot', text: '카드 한 장만 더 보고.' },
      { speaker: 'luna', text: '그 "한 장"이 매일 두 시간인데 ㅋ' },
    ],
  },
  {
    id: 'emotional_grateful', category: 'emotional', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'luna', text: '오늘 같이 편하게 있어줘서 좋다~' },
      { speaker: 'tarot', text: '...갑자기 왜 그래.' },
      { speaker: 'luna', text: '그냥~ 고마워서!' },
      { speaker: 'tarot', text: '...뭐. 나도.' },
    ],
  },

  // ═══════════ 유저 언급 (userMention) ═══════════
  {
    id: 'user_wonder_1', category: 'userMention', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '{name} 오늘 올까?' },
      { speaker: 'tarot', text: '글쎄. 궁금하면 카드 봐.' },
      { speaker: 'luna', text: '카드 말고 그냥 기다려야지 ㅋ' },
      { speaker: 'tarot', text: '올 거야. 느낌이 와.' },
    ],
  },
  {
    id: 'user_wonder_2', category: 'userMention', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '{name} 요즘 바쁜가.' },
      { speaker: 'luna', text: '바빠도 잠깐이라도 오면 좋겠는데...' },
      { speaker: 'tarot', text: '걱정 안 해도 돼. 올 때 오겠지.' },
      { speaker: 'luna', text: '그래도 좀 보고 싶어 ㅎ' },
    ],
  },
  {
    id: 'user_worry_1', category: 'userMention', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'luna', text: '타로냥, {name} 요즘 좀 걱정돼...' },
      { speaker: 'tarot', text: '뭐가?' },
      { speaker: 'luna', text: '좀 힘들어하는 것 같아서...' },
      { speaker: 'tarot', text: '...너무 걱정 마. 강한 애야.' },
      { speaker: 'luna', text: '그래도 다음에 오면 잘 챙겨줘야지.' },
    ],
  },
  {
    id: 'user_positive_1', category: 'userMention', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '{name} 저번에 왔을 때 좀 밝아 보였어!' },
      { speaker: 'tarot', text: '카드도 에너지가 밝았어.' },
      { speaker: 'luna', text: '좋은 신호지? ㅎㅎ' },
      { speaker: 'tarot', text: '뭐... 나쁘지 않지.' },
    ],
  },
  {
    id: 'user_gift', category: 'userMention', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '{name}한테 뭐 해주고 싶은데...' },
      { speaker: 'tarot', text: '카드 한 장 뽑아주면 되지.' },
      { speaker: 'luna', text: '쿠키 만들어줄까? ㅎ' },
      { speaker: 'tarot', text: '저번에 탔잖아.' },
      { speaker: 'luna', text: '이번엔 안 태울 거야!!' },
    ],
  },
  {
    id: 'user_homework', category: 'userMention', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '루나, {name}한테 저번에 미션 줬잖아.' },
      { speaker: 'luna', text: '아 맞다! 했을까..?' },
      { speaker: 'tarot', text: '안 했을 걸.' },
      { speaker: 'luna', text: '야! 그래도 믿어봐야지!' },
    ],
  },

  // ═══════════ 놀리기/장난 (tease) ═══════════
  {
    id: 'tease_luna_cook', category: 'tease', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'tarot', text: '루나 오늘 또 요리 도전함?' },
      { speaker: 'luna', text: '왜! 나 요리 잘해!' },
      { speaker: 'tarot', text: '저번에 라면도...' },
      { speaker: 'luna', text: '그건 사고였어!!!' },
      { speaker: 'tarot', text: 'ㅋ' },
    ],
  },
  {
    id: 'tease_tarot_cute', category: 'tease', timeSlots: ['morning', 'afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '타로냥! 하품하는 거 봤다 ㅋ 귀여웠어' },
      { speaker: 'tarot', text: '안 했어.' },
      { speaker: 'luna', text: '했거든? 코까지 씰룩이면서 ㅋ' },
      { speaker: 'tarot', text: '...그루밍이었어.' },
    ],
  },
  {
    id: 'tease_selfie', category: 'tease', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '셀카 찍자!' },
      { speaker: 'tarot', text: '싫어.' },
      { speaker: 'luna', text: '왜~ 같이 찍자~!' },
      { speaker: 'tarot', text: '...카드가 거부의 에너지래.' },
      { speaker: 'luna', text: 'ㅋㅋㅋ 카드 핑계 대지 마!' },
    ],
  },
  {
    id: 'tease_luna_clumsy', category: 'tease', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'tarot', text: '루나, 아까 넘어질 뻔했지?' },
      { speaker: 'luna', text: '??  안 넘어졌어!' },
      { speaker: 'tarot', text: '봤거든.' },
      { speaker: 'luna', text: '그냥... 바닥이 미끄러웠을 뿐이야!' },
      { speaker: 'tarot', text: 'ㅋ' },
    ],
  },

  // ═══════════ 음식 (food) ═══════════
  {
    id: 'food_snack', category: 'food', timeSlots: ['afternoon'],
    lines: [
      { speaker: 'luna', text: '간식 먹을 사람~?' },
      { speaker: 'tarot', text: '뭐 있는데.' },
      { speaker: 'luna', text: '쿠키 구웠어! 🍪' },
      { speaker: 'tarot', text: '안 탔어?' },
      { speaker: 'luna', text: '안 탔거든!! 먹어봐!!' },
      { speaker: 'tarot', text: '...먹어보겠다. (냠냠)' },
      { speaker: 'tarot', text: '...맛있네.' },
      { speaker: 'luna', text: '그치?! ㅎㅎ' },
    ],
  },
  {
    id: 'food_tea', category: 'food', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '차 한잔 할래?' },
      { speaker: 'tarot', text: '뭐 있어.' },
      { speaker: 'luna', text: '캐모마일이랑 얼그레이!' },
      { speaker: 'tarot', text: '캐모마일.' },
      { speaker: 'luna', text: '역시~ 나도 캐모마일로 ☕' },
    ],
  },
  {
    id: 'food_delivery', category: 'food', timeSlots: ['evening'],
    lines: [
      { speaker: 'tarot', text: '배 고프다.' },
      { speaker: 'luna', text: '배달 시킬까?' },
      { speaker: 'tarot', text: '떡볶이.' },
      { speaker: 'luna', text: '또 떡볶이?? 저번에도...' },
      { speaker: 'tarot', text: '떡볶이가 답이야.' },
      { speaker: 'luna', text: '...인정. 주문한다!' },
    ],
  },

  // ═══════════ 추가 일상 ═══════════
  {
    id: 'daily_phone', category: 'daily', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '아 폰 충전 깜빡했다 ㅠ' },
      { speaker: 'tarot', text: '매일 깜빡하면서.' },
      { speaker: 'luna', text: '어제까지는 했단 말이야!' },
      { speaker: 'tarot', text: '내 옆에 충전기 있어. 쓸래?' },
      { speaker: 'luna', text: '오 고마워~!' },
    ],
  },
  {
    id: 'daily_cleaning', category: 'daily', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '오늘 청소 좀 할까...' },
      { speaker: 'tarot', text: '좋은 생각이야.' },
      { speaker: 'luna', text: '갑자기 귀찮은데' },
      { speaker: 'tarot', text: '그럴 줄 알았어.' },
    ],
  },
  {
    id: 'daily_book', category: 'daily', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '이 책 진짜 좋다...' },
      { speaker: 'tarot', text: '뭐 읽어.' },
      { speaker: 'luna', text: '감정 관리에 대한 책!' },
      { speaker: 'tarot', text: '네가 제일 필요한 책이네.' },
      { speaker: 'luna', text: '야!!! ㅋㅋ' },
    ],
  },
  {
    id: 'daily_workout', category: 'daily', timeSlots: ['morning', 'afternoon'],
    lines: [
      { speaker: 'luna', text: '운동 좀 해야 하는데...' },
      { speaker: 'tarot', text: '5분 스트레칭이라도 해.' },
      { speaker: 'luna', text: '5분도 귀찮은데 ㅋ' },
      { speaker: 'tarot', text: '...그래서 맨날 목 아프잖아.' },
      { speaker: 'luna', text: '(찔림)' },
    ],
  },
  {
    id: 'daily_playlist', category: 'daily', timeSlots: ['afternoon', 'evening', 'night'],
    lines: [
      { speaker: 'luna', text: '타로냥은 무슨 음악 좋아해?' },
      { speaker: 'tarot', text: '조용한 거.' },
      { speaker: 'luna', text: '로파이?' },
      { speaker: 'tarot', text: '비 소리 + 고양이 골골송.' },
      { speaker: 'luna', text: 'ㅋㅋㅋ 그건 음악이 아니야!' },
    ],
  },
  {
    id: 'night_quiet', category: 'emotional', timeSlots: ['night', 'lateNight'],
    lines: [
      { speaker: 'tarot', text: '...조용하네.' },
      { speaker: 'luna', text: '다들 자나 봐~' },
      { speaker: 'tarot', text: '이 시간이 좋아. 카드가 더 말해주는 느낌.' },
      { speaker: 'luna', text: '뭐라고 말해주는데?' },
      { speaker: 'tarot', text: '...비밀.' },
    ],
  },
  {
    id: 'night_sleepy', category: 'emotional', timeSlots: ['lateNight'],
    lines: [
      { speaker: 'luna', text: '으... 눈이 감긴다...' },
      { speaker: 'tarot', text: '자.' },
      { speaker: 'luna', text: '5분만...' },
      { speaker: 'tarot', text: '네 5분은 1시간이야. 자.' },
    ],
  },

  // ═══════════ 더 추가: 본격 수다 ═══════════
  {
    id: 'banter_dream', category: 'banter', timeSlots: ['dawn', 'morning'],
    lines: [
      { speaker: 'luna', text: '어젯밤에 꿈 꿨어!' },
      { speaker: 'tarot', text: '뭔 꿈.' },
      { speaker: 'luna', text: '하늘을 나는 꿈! 엄청 신기했어' },
      { speaker: 'tarot', text: '카드로 분석해볼까.' },
      { speaker: 'luna', text: '꿈도 분석해?' },
      { speaker: 'tarot', text: '당연하지. 무의식의 메시지야.' },
    ],
  },
  {
    id: 'banter_photo', category: 'banter', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '방금 노을 사진 찍었어! 예쁘지?' },
      { speaker: 'tarot', text: '...각도가 별로야.' },
      { speaker: 'luna', text: '어디가!!' },
      { speaker: 'tarot', text: '왼쪽으로 좀 더 기울이면 나았을 듯.' },
      { speaker: 'luna', text: '나 사진 잘 찍는데...' },
      { speaker: 'tarot', text: '그래? (의미심장)' },
    ],
  },
  {
    id: 'tease_dancing', category: 'tease', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '루나 아까 혼자 춤추고 있었지?' },
      { speaker: 'luna', text: '!!! 봤어?!' },
      { speaker: 'tarot', text: '다 보여.' },
      { speaker: 'luna', text: '아... 부끄러 ㅋㅋ' },
      { speaker: 'tarot', text: '...근데 나쁘지 않았어.' },
    ],
  },
  {
    id: 'daily_gaming', category: 'daily', timeSlots: ['evening', 'night'],
    lines: [
      { speaker: 'luna', text: '심심한데 게임 할까?' },
      { speaker: 'tarot', text: '고양이 낚시?' },
      { speaker: 'luna', text: '그건 너만 좋아하는 거잖아 ㅋ' },
      { speaker: 'tarot', text: '재밌는데.' },
      { speaker: 'luna', text: '끝말잇기 할까?' },
      { speaker: 'tarot', text: '...좋아. 내가 먼저. "카드".' },
    ],
  },
  {
    id: 'emotional_rain_2', category: 'emotional', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'luna', text: '비가 올 것 같은데...' },
      { speaker: 'tarot', text: '카드도 물 에너지가 많아.' },
      { speaker: 'luna', text: '우산 챙겨야겠다' },
      { speaker: 'tarot', text: '{name}도 우산 챙겼으면 좋겠는데.' },
      { speaker: 'luna', text: '오 타로냥이 {name} 걱정하네~?' },
      { speaker: 'tarot', text: '...안 했거든.' },
    ],
  },
  {
    id: 'card_new_spread', category: 'card', timeSlots: ['afternoon', 'evening'],
    lines: [
      { speaker: 'tarot', text: '새로운 스프레드 연습 중인데...' },
      { speaker: 'luna', text: '스프레드가 뭐야?' },
      { speaker: 'tarot', text: '카드 배치법. 셀틱 크로스 같은 거.' },
      { speaker: 'luna', text: '이름 멋지다! 나도 해줘?' },
      { speaker: 'tarot', text: '아직 연습 중이라... 다음에.' },
    ],
  },
];

// ─── Public API ─────────────────────────────────────────

/**
 * 현재 시간대에 맞는 클러스터를 랜덤 선택.
 * usedIds: 이번 세션에서 이미 사용된 클러스터 ID 추적용.
 * userName: {name} 치환용.
 */
export function pickCluster(
  usedIds: Set<string>,
  userName: string,
): ChatCluster | null {
  const slot = getTimeSlot();
  const hour = new Date().getHours();

  // 심야 시간대는 확률 감소
  if ((hour >= 2 && hour < 7) && Math.random() > 0.3) return null;

  // 현재 시간대 + 매칭 클러스터
  const available = CHAT_CLUSTERS.filter(
    c => c.timeSlots.includes(slot) && !usedIds.has(c.id),
  );

  if (available.length === 0) {
    // 풀 소진 → 리셋 (단, 최근 5개 제외)
    const recent = [...usedIds].slice(-5);
    usedIds.clear();
    recent.forEach(id => usedIds.add(id));
    const retry = CHAT_CLUSTERS.filter(c => c.timeSlots.includes(slot) && !usedIds.has(c.id));
    if (retry.length === 0) return null;
    const picked = retry[Math.floor(Math.random() * retry.length)];
    usedIds.add(picked.id);
    return applyUserName(picked, userName);
  }

  // 유저 언급 클러스터 가중치 (20% 확률로 우선)
  if (Math.random() < 0.2) {
    const userMentions = available.filter(c => c.category === 'userMention');
    if (userMentions.length > 0) {
      const picked = userMentions[Math.floor(Math.random() * userMentions.length)];
      usedIds.add(picked.id);
      return applyUserName(picked, userName);
    }
  }

  const picked = available[Math.floor(Math.random() * available.length)];
  usedIds.add(picked.id);
  return applyUserName(picked, userName);
}

/** 클러스터 → 재생 큐 변환 (라인별 랜덤 딜레이) */
export function clusterToPlayback(cluster: ChatCluster): ClusterPlaybackItem[] {
  const items: ClusterPlaybackItem[] = [];
  let cumDelay = 0;

  for (let i = 0; i < cluster.lines.length; i++) {
    const line = cluster.lines[i];

    if (i > 0) {
      // 메시지 간 2~5초 랜덤 (타이핑 시뮬레이션 포함)
      const typingMs = 800 + line.text.length * 35; // 타이핑 시간
      const pauseMs = 500 + Math.random() * 2000;   // 읽는 시간
      cumDelay += typingMs + pauseMs;
    }

    items.push({
      speaker: line.speaker,
      text: line.text,
      delayMs: cumDelay,
    });
  }

  return items;
}

/** 다음 클러스터까지 대기 시간 (ms): 1~3분 — 카톡 활발 단톡방 리듬 */
export function nextClusterInterval(): number {
  return 60_000 + Math.floor(Math.random() * 120_000); // 1min ~ 3min
}

/** 빠른 후속 클러스터 대기 시간 (ms): 30초~2분 — 유저가 활발할 때 */
export function quickClusterInterval(): number {
  return 30_000 + Math.floor(Math.random() * 90_000); // 30s ~ 2min
}

// ─── Internal ───────────────────────────────────────────

function applyUserName(cluster: ChatCluster, userName: string): ChatCluster {
  return {
    ...cluster,
    lines: cluster.lines.map(l => ({
      ...l,
      text: l.text.replace(/\{name\}/g, userName),
    })),
  };
}
