-- ============================================
-- Fix: handle_new_user 트리거 함수 안전 보호
-- Google OAuth 등 소셜 로그인 시 raw_user_meta_data 구조가
-- 기존 이메일 가입과 다를 수 있어 INSERT 실패 → 전체 유저 생성 롤백 발생
-- EXCEPTION 블록으로 감싸 트리거 실패가 유저 생성을 막지 않도록 수정
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',    -- Google OAuth는 'full_name'
      NEW.raw_user_meta_data->>'name',          -- 기타 프로바이더
      NEW.raw_user_meta_data->>'user_name',     -- GitHub 등
      split_part(NEW.email, '@', 1),            -- 이메일에서 이름 추출
      '익명'                                      -- 최종 폴백
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 이미 프로필이 존재하는 경우 (중복 가입 시도)
    RETURN NEW;
  WHEN OTHERS THEN
    -- 어떤 에러든 유저 생성 자체를 막지 않음
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
