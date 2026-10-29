import { Capacitor, registerPlugin } from "@capacitor/core";
import debug from "@/lib/utils/debug";
import type { WidgetSyncPayload } from "./widgetCatalog";

/**
 * What a widget write came to. The reason is for a human reading the log, never for the UI:
 * nothing on screen depends on a home-screen widget having been written.
 */
export type WidgetSyncResult = { ok: true } | { ok: false; reason: string };

/**
 * The browser has no home screen, so every sync there stops here. That is not a failure, and it
 * has to stay quiet: persistUser runs on every stat tick, and an error a tick would bury the log.
 */
const NOT_ANDROID: WidgetSyncResult = { ok: false, reason: "not android" };

export interface XpWidgetPluginNative {
  syncWidgetData(options: { data: string }): Promise<{ success: boolean }>;
  reloadAllWidgets(): Promise<{ success: boolean }>;
  // No heroId yet: XpWidgetPlugin.saveWidgetConfig writes only the theme key, so a hero passed here
  // would be dropped in silence. It lands with the configure Activity that can learn an appWidgetId.
  saveWidgetConfig(options: {
    widgetId: number;
    theme: string;
  }): Promise<{ success: boolean }>;
}

export const XpWidgetPlugin = registerPlugin<XpWidgetPluginNative>("XpWidget", {
  web: {
    async syncWidgetData() {
      debug.log("[WidgetSync:web] syncWidgetData called (no-op in browser)");
      return { success: true };
    },
    async reloadAllWidgets() {
      debug.log("[WidgetSync:web] reloadAllWidgets called (no-op in browser)");
      return { success: true };
    },
    async saveWidgetConfig() {
      debug.log("[WidgetSync:web] saveWidgetConfig called (no-op in browser)");
      return { success: true };
    }
  }
});

/** Widgets are an Android affair. A build with no Capacitor bridge at all reads as the browser. */
export const hasWidgetHost = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
};

export const syncWidgetData = async (
  payload: WidgetSyncPayload
): Promise<WidgetSyncResult> => {
  if (!hasWidgetHost()) return NOT_ANDROID;

  try {
    const serialized = JSON.stringify(payload);
    await XpWidgetPlugin.syncWidgetData({ data: serialized });
    return { ok: true };
  } catch (error) {
    debug.error("[WidgetSync] Failed to sync data to native widgets:", error);
    return { ok: false, reason: "the native widget plugin refused the payload" };
  }
};

export const reloadAllWidgets = async (): Promise<WidgetSyncResult> => {
  if (!hasWidgetHost()) return NOT_ANDROID;

  try {
    await XpWidgetPlugin.reloadAllWidgets();
    return { ok: true };
  } catch (error) {
    debug.error("[WidgetSync] Failed to trigger widget reload:", error);
    return { ok: false, reason: "the native widget plugin refused the reload" };
  }
};
