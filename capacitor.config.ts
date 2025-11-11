import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hmorgan.app',
  appName: 'HMorgan',
  webDir: 'public',
  server: {
    url: 'https://hmorgan.vercel.app', // 👈 tu URL en Vercel
    cleartext: true
  }
};

export default config;
