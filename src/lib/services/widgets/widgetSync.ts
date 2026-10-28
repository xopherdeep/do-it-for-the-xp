import { Capacitor, registerPlugin } from "@capacitor/core";
import debug from "@/lib/utils/debug";
import type { WidgetSyncPayload } from "./widgetCatalog";

export interface XpWidgetPluginNative {
  syncWidgetData(options: { data: string }): Promise<{ success: boolean }>;
  reloadAllWidgets(): Promise<{ success: boolean }>;
  saveWidgetConfig(options: {
    widgetId: number;
    theme: string;
    heroId?: string;
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

export const syncWidgetData = async (
  payload: WidgetSyncPayload
): Promise<boolean> => {
  const isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  if (!isAndroid) {
    return false;
  }

  try {
    const serialized = JSON.stringify(payload);
    await XpWidgetPlugin.syncWidgetData({ data: serialized });
    return true;
  } catch (error) {
    debug.error("[WidgetSync] Failed to sync data to native widgets:", error);
    return false;
  }
};

export const reloadAllWidgets = async (): Promise<boolean> => {
  const isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  if (!isAndroid) {
    return false;
  }

  try {
    await XpWidgetPlugin.reloadAllWidgets();
    return true;
  } catch (error) {
    debug.error("[WidgetSync] Failed to trigger widget reload:", error);
    return false;
  }
};
