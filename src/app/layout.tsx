import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Love AI - 마음이',
  description: '연애 고민, 편하게 얘기해도 괜찮아요. AI 관계 상담 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Love AI',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B0A1D',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="h-full bg-[#0B0A1D] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-mystic-700/60 via-mystic-900 to-[#05040B] font-[family-name:var(--font-geist)] antialiased text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
