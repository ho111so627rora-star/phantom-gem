import type { CapacitorConfig } from '@capacitor/cli';

// appId is a placeholder — replace with the identifier registered in your own
// Apple Developer account / App Store Connect before archiving for submission.
const config: CapacitorConfig = {
  appId: 'com.phantomgem.app',
  appName: 'Phantom Gem',
  webDir: 'mobile/www',
  server: {
    // Loads the live, already-deployed site instead of bundling a local copy —
    // the game needs a live connection to play anyway, so this avoids keeping
    // a second, easy-to-forget build of the site inside the native app.
    url: 'https://ho111so627rora-star.github.io/phantom-gem/',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};
export default config;
