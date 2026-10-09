import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.testsagar.app',
  appName: 'Test Sagar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'tncnursing.site'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;
