import type { Metadata, Viewport } from 'next';
import { Fraunces } from 'next/font/google';
import './globals.css';
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '600', '900'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = {
  title: 'ファントムジェム Phantom Gem — 宝石をめぐる10ターンの心理戦',
  description: '狙う、盗む、裏をかく。1〜4人とCPUで遊ぶ、スマホ対応のボードゲーム。',
  manifest: basePath + '/manifest.webmanifest',
  icons: { apple: basePath + '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Phantom Gem' },
};
export const viewport: Viewport = { themeColor: '#080908', width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja" className={fraunces.variable}><body>{children}</body></html>; }
