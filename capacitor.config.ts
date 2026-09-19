import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hasebo.pos',
  appName: 'حاسبو | HĀSEBO',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#07111F',
  },
  plugins: {
    SplashScreen: {
      // ⭐ زيادة مدة عرض الشاشة الافتتاحية لضمان تحميل الـ WebView بالكامل
      // (منع ظهور الشاشة الداكنة أثناء الفجوة بين إخفاء الـ SplashScreen وبدء تحميل React)
      launchShowDuration: 4000,
      launchAutoHide: true,
      backgroundColor: '#07111F',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#D4A72C',
      splashFullScreen: true,
      splashImmersive: true,
      // ⭐ إعدادات إضافية لضمان انتقال سلس بدون وميض
      splashShowSpinner: true,
      showAndroidSplashScreen: true,
      androidPostPromptColor: '#07111F',
    },
    NativeBiometric: {
      enabled: true,
    },
  },
};

export default config;
