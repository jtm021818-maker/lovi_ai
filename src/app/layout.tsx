import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import FxRoot from '@/components/fx/FxRoot';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
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
    <html lang="ko" className={`${geist.variable} h-full`}>
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
