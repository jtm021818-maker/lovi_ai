-- 009: 유저 메모리 프로필 — 크로스세션 장기 기억 시스템
-- 세션 종료 시 AI가 유저에 대해 기억할 것을 추출하여 축적
-- 다음 세션 시작 시 프롬프트에 주입하여 "이전 기억" 제공

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS memory_profile JSONB DEFAULT '{}';

-- memory_profile 구조:
-- {
--   "basicInfo": { "age": "20대", "occupation": "대학생" },
--   "relationshipContext": { "status": "여친 있음", "mainIssues": ["읽씹", "바람"] },
--   "emotionPatterns": { "dominantEmotions": ["불안"], "triggers": ["연락 안 올 때"] },
--   "sessionHighlights": [{ "date": "2026-04-01", "keyTopic": "바람 의심", "insight": "..." }],
--   "communicationPrefs": { "preferredTone": "짧게", "whatWorks": ["감정 인정"] },
--   "tarotMemory": { "frequentCards": ["major_17"], "significantReadings": [] },
--   "lastUpdated": "2026-04-06T12:00:00Z",
--   "totalSessions": 5
-- }

COMMENT ON COLUMN user_profiles.memory_profile IS '크로스세션 장기 기억 프로필 (AI가 자동 추출/축적)';
