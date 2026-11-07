import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.noor.quran",
  appName: "Noor",
  webDir: "www",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#050a14",
    // Android 15+ draws the WebView edge-to-edge. Reserve the status and
    // navigation bar insets natively so the existing mobile CSS keeps working.
    adjustMarginsForEdgeToEdge: "force",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#050a14",
      androidSplashResourceName: "splash",
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notify",
      iconColor: "#d4af37",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#050a14",
    },
  },
};

export default config;
