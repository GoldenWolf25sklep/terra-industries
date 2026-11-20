import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.terraindustries.game",
  appName: "Terra Industries",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    CapacitorUpdater: {
      appId: "com.terraindustries.game",
      autoUpdate: "off",
      version: "1.0.0"
    }
  }
};

export default config;
