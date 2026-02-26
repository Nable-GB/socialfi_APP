import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.socialfi.app',
  appName: 'SocialFi',
  webDir: 'dist',
  server: {
    // For testing: point to your backend API
    // Change this to your production URL when deploying
    androidScheme: 'https',
    // allowNavigation: ['your-api-domain.com'],
  },
  android: {
    backgroundColor: '#0f172a',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
