/**
 * "Install App" for the web build: which way this browser installs, and the Chrome-family prompt.
 */
const mockNative = { value: false };
jest.mock("@capacitor/core", () => ({
  __esModule: true,
  Capacitor: { isNativePlatform: () => mockNative.value },
}));

import { installRoute, installSteps, type InstallEnv } from "@/lib/services/pwa/installApp";

const UA = {
  iPhoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iPhoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1",
  // iPadOS asks for the desktop site by default and says it is a Mac; the touch points give it away
  iPadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  macSafari17:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  macSafari16:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  macFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:140.0) Gecko/20100101 Firefox/140.0",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
};

const env = (over: Partial<InstallEnv>): InstallEnv => ({
  standalone: false,
  native: false,
  hasPrompt: false,
  userAgent: UA.androidChrome,
  maxTouchPoints: 0,
  ...over,
});

describe("installRoute", () => {
  it("hides the entry once the app runs installed, in the packaged app, or from the iOS home screen", () => {
    expect(installRoute(env({ standalone: true, hasPrompt: true }))).toBe("installed");
    expect(installRoute(env({ native: true }))).toBe("installed");
    expect(installRoute(env({ standalone: true, userAgent: UA.iPhoneSafari, maxTouchPoints: 5 }))).toBe("installed");
  });

  it("uses the browser's own install prompt when Chrome, Edge or Android offered one", () => {
    expect(installRoute(env({ hasPrompt: true }))).toBe("prompt");
    expect(installRoute(env({ hasPrompt: true, userAgent: UA.macChrome }))).toBe("prompt");
  });

  it("shows the Add to Home Screen steps on an iPhone or iPad, whatever the browser", () => {
    expect(installRoute(env({ userAgent: UA.iPhoneSafari, maxTouchPoints: 5 }))).toBe("ios");
    expect(installRoute(env({ userAgent: UA.iPhoneChrome, maxTouchPoints: 5 }))).toBe("ios");
    expect(installRoute(env({ userAgent: UA.iPadDesktopMode, maxTouchPoints: 5 }))).toBe("ios");
  });

  it("shows the Add to Dock steps in Safari 17 or later on a Mac", () => {
    expect(installRoute(env({ userAgent: UA.macSafari17 }))).toBe("mac-safari");
    expect(installRoute(env({ userAgent: UA.macSafari16 }))).toBe("unsupported");
  });

  it("offers nothing where the browser can't install and gave no prompt", () => {
    expect(installRoute(env({ userAgent: UA.macChrome }))).toBe("unsupported");
    expect(installRoute(env({ userAgent: UA.macFirefox }))).toBe("unsupported");
    expect(installRoute(env({ userAgent: UA.androidChrome }))).toBe("unsupported");
  });
});

describe("installSteps", () => {
  it("walks Safari through its own menus, and has nothing to say where the browser prompts or can't install", () => {
    expect(installSteps("ios")?.message).toContain("Add to Home Screen");
    expect(installSteps("mac-safari")?.message).toContain("Add to Dock");
    expect(installSteps("prompt")).toBeNull();
    expect(installSteps("installed")).toBeNull();
    expect(installSteps("unsupported")).toBeNull();
  });
});

describe("watching for the install prompt", () => {
  type Mod = typeof import("@/lib/services/pwa/installApp");
  const load = (): Promise<Mod> => {
    jest.resetModules();
    return import("@/lib/services/pwa/installApp");
  };

  let standalone: boolean;
  beforeEach(() => {
    standalone = false;
    mockNative.value = false;
    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return standalone;
      },
      addEventListener: jest.fn(),
    }));
  });

  const offerPrompt = (outcome: "accepted" | "dismissed") => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome, platform: "web" }),
    });
    const preventDefault = jest.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    return { event, preventDefault };
  };

  it("keeps Chrome's prompt for the menu instead of letting the browser show its own banner", async () => {
    const { startInstallWatch, installState } = await load();
    startInstallWatch();
    expect(installState.route).not.toBe("prompt");

    const { preventDefault } = offerPrompt("accepted");

    expect(preventDefault).toHaveBeenCalled();
    expect(installState.route).toBe("prompt");
  });

  it("installing through the prompt hides the entry; dismissing it keeps the entry for later", async () => {
    const { startInstallWatch, installState, promptInstall } = await load();
    startInstallWatch();

    const dismissed = offerPrompt("dismissed");
    await expect(promptInstall()).resolves.toBe("dismissed");
    expect(dismissed.event.prompt).toHaveBeenCalledTimes(1);
    // A used prompt can't be shown again; the browser offers a fresh one later
    expect(installState.route).not.toBe("prompt");

    offerPrompt("accepted");
    await expect(promptInstall()).resolves.toBe("accepted");
    window.dispatchEvent(new Event("appinstalled"));
    expect(installState.route).toBe("installed");
  });

  it("does nothing when there is no prompt to show", async () => {
    const { startInstallWatch, promptInstall } = await load();
    startInstallWatch();
    await expect(promptInstall()).resolves.toBe("unavailable");
  });

  it("starts as installed when the page opens from the home screen", async () => {
    standalone = true;
    const { startInstallWatch, installState } = await load();
    startInstallWatch();
    expect(installState.route).toBe("installed");
  });
});
