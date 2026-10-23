/**
 * The device's signals the sync store runs on (section 4 of the family sync spec, "Uploading" and "Downloading"): the
 * connection back (`online`), the app coming to the front or going to the background, and the minute tick. Each is wired
 * once; the answer stops them all (the store's dispose).
 */
export interface DeviceSignals {
  /** The browser says the connection is back */
  online(): void;
  /** The app came to the front (true) or went to the background (false) */
  visibility(isInFront: boolean): void;
  /** The minute round */
  tick(): void;
}

export const listenToDevice = (on: DeviceSignals, tickMs: number): (() => void) => {
  const stops: (() => void)[] = [];
  const onOnline = (): void => on.online();
  const onVisibility = (): void => on.visibility(document.visibilityState === "visible");
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    window.addEventListener("online", onOnline);
    stops.push(() => window.removeEventListener("online", onOnline));
  }
  const hasDocument = typeof document !== "undefined";
  if (hasDocument) {
    document.addEventListener("visibilitychange", onVisibility);
    stops.push(() => document.removeEventListener("visibilitychange", onVisibility));
  }
  const interval = setInterval(() => on.tick(), tickMs);
  stops.push(() => clearInterval(interval));
  return () => stops.splice(0).forEach((stop) => stop());
};
