import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android APK shell for the archive. The web assets are the static
 * export in out/ (built with STATIC_EXPORT=1 npm run build) — the
 * entire archive ships inside the APK and works fully offline.
 */
const config: CapacitorConfig = {
  appId: 'com.tanayshukla.knowledgearchive',
  appName: 'Knowledge Archive',
  webDir: 'out',
  // matches the archive's page background (oklch(0.07 0 0)) so the
  // WebView never flashes white before the app paints
  backgroundColor: '#0a0a0a',
};

export default config;
