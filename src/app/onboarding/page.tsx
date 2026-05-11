import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <>
      {/* Luna 스프라이트 프리로드 — 페이지 진입 즉시 후광 ring 안에 등장하도록 */}
      <link
        rel="preload"
        as="image"
        href="/splite/luna_sprite_setting_1.webp"
        fetchPriority="high"
      />
      <OnboardingFlow />
    </>
  );
}
