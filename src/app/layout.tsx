import type { Metadata, Viewport } from 'next';
import { Geist, Gaegu, Nanum_Pen_Script, Gowun_Dodum, Gowun_Batang } from 'next/font/google';
import './globals.css';
import FxRoot from '@/components/fx/FxRoot';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

// 🆕 v87: 손글씨 느낌 한글 폰트 — "언니 쪽지" 톤 UI 전용.
// Gaegu 는 Google Fonts 에서 가장 따뜻한 한글 핸드라이팅 중 하나.
const gaegu = Gaegu({
  variable: '--font-gaegu',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
});

// 🆕 v114: 관계 일지(폴라로이드 스크랩북) 폰트 패밀리.
// 모두 SIL Open Font License — 상업적 이용/앱 내장 100% 안전.
// next/font/google 이 빌드시 자체 호스트 → 런타임 외부 호출 0.
const nanumPenScript = Nanum_Pen_Script({
  variable: '--font-nanum-pen',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});
const gowunDodum = Gowun_Dodum({
  variable: '--font-gowun-dodum',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});
const gowunBatang = Gowun_Batang({
  variable: '--font-gowun-batang',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '루나 연애상담 - AI 심리코치',
  description: '연애 고민, 편하게 얘기해도 괜찮아요. AI 관계 상담 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '루나 연애상담',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#9333ea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} ${gaegu.variable} ${nanumPenScript.variable} ${gowunDodum.variable} ${gowunBatang.variable} h-full`}>
      <body className="h-full bg-[#0B0A1D] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-mystic-700/60 via-mystic-900 to-[#05040B] font-[family-name:var(--font-geist)] antialiased text-white overflow-hidden">
        {/* 🆕 v79: 전역 FX 레이어 (ScreenShake/Particle 등) */}
        <FxRoot />
        {children}
        {/* 서비스 워커 등록 - TWA (APK) 필수 요건 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[SW] registered:', reg.scope); })
                    .catch(function(err) { console.log('[SW] failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
