/// <reference types="@capacitor/background-runner" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viale.app',
  appName: 'VIALE',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
  },
  plugins: {
    BackgroundRunner: {
      label: 'com.viale.background.location',
      src: 'native-ready/background/runner.js',
      event: 'trackLocation',
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
};

export default config;