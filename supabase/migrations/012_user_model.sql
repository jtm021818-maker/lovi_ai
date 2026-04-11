-- 012: Project Luna v2 — 유저 모델 (성격 학습 + 관계 맵)

-- 유저 프로필에 유저 모델 추가
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_model jsonb DEFAULT '{}';

COMMENT ON COLUMN user_profiles.user_model IS 'Project Luna v2: 유저 성격/패턴/관계 학습 데이터';

-- user_model JSONB 구조:
-- {
--   "communicationStyle": {
--     "prefersDirect": 0.5,       // 0=돌려말하기 1=직설 선호
--     "prefersHumor": 0.5,        // 유머 선호도
--     "prefersAdvice": 0.5,       // 조언 vs 공감만
--     "avgMessageLength": 30,     // 평균 메시지 길이
--     "emojiFrequency": 0.3       // 이모지 사용 빈도
--   },
--   "emotionalPatterns": {
--     "topTriggers": ["읽씹", "비교"],  // 자주 감정적인 주제
--     "copingStyle": "express",          // express|suppress|mixed
--     "recoverySpeed": "moderate"        // fast|moderate|slow
--   },
--   "relationships": [                   // 관계 맵
--     {
--       "name": "민수",
--       "role": "partner",
--       "status": "active",
--       "keyEvents": [{"event": "바람 발각", "date": "2026-04-01"}]
--     }
--   ],
--   "lunaRelationship": {
--     "intimacyScore": 35,
--     "sharedLanguage": [{"term": "읽씹남", "meaning": "현 남친"}],
--     "trustLevel": 0.6
--   }
-- }
