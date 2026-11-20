import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.terraindustries.game",
  appName: "Terra Industries",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    CapacitorUpdater: {
      autoUpdate: "atBackground",
      version: "1.0.0"
    }
  }
};

export default config;
