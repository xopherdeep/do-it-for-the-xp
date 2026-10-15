import { Capacitor } from "@capacitor/core";

/** Production builds and native apps route by hash (`/#/path`); `pnpm serve` routes by path. */
export const usesHashHistory = (): boolean =>
  Capacitor.isNativePlatform() || process.env.NODE_ENV === "production";
