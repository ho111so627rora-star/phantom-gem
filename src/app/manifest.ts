import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ファントムジェム / Phantom Gem',
    short_name: 'Phantom Gem',
    description: '狙う、盗む、裏をかく。1〜4人とCPUで遊ぶ、宝石を奪い合うボードゲーム。',
    start_url: basePath + '/',
    scope: basePath + '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#080908',
    theme_color: '#080908',
    lang: 'ja',
    icons: [
      { src: basePath + '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: basePath + '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: basePath + '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
