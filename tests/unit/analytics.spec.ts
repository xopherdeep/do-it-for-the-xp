import { analyticsEnabled, pageViewFor, startAnalytics, GA_MEASUREMENT_ID } from "@/lib/services/analytics/analytics";

const mockLogEvent = jest.fn(() => Promise.resolve());
jest.mock("@capacitor-firebase/analytics", () => ({ FirebaseAnalytics: { logEvent: mockLogEvent } }));

const route = (path: string, name?: string, fullPath = path) =>
  ({ name, fullPath, matched: [{ path: "/" }, { path }] }) as any;

describe("pageViewFor", () => {
  it("reports the route pattern, never the hero or quest ids in the URL", () => {
    const view = pageViewFor(
      route("/battle/:userId/quest/:questId", "battle-quest", "/battle/u-123/quest/q-9?from=map"),
      "https://app.forthexp.com"
    );
    expect(view).toEqual({
      page_location: "https://app.forthexp.com/battle/:userId/quest/:questId",
      page_path: "/battle/:userId/quest/:questId",
      page_title: "battle-quest",
    });
  });

  it("drops the optional marks and the trailing slash so one screen is one row", () => {
    const view = pageViewFor(route("/bank/:userId?/", "gold-bank"), "https://localhost");
    expect(view.page_path).toBe("/bank/:userId");
    expect(view.page_location).toBe("https://localhost/bank/:userId");
  });

  it("names an unnamed route by its path", () => {
    expect(pageViewFor(route("/"), "https://app.forthexp.com").page_title).toBe("/");
  });
});

describe("analyticsEnabled", () => {
  it("stays off outside production builds (jest, pnpm serve, Cypress)", () => {
    expect(analyticsEnabled()).toBe(false);
  });
});

describe("startAnalytics", () => {
  const nodeEnv = process.env.NODE_ENV;
  const fakeRouter = () => {
    const hooks: Array<(to: any, from: any, failure?: unknown) => void> = [];
    return { hooks, router: { afterEach: (hook: any) => hooks.push(hook) } as any };
  };

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
    delete window.dataLayer;
    delete window.gtag;
    document.head.innerHTML = "";
  });

  it("does nothing outside production", () => {
    const { hooks, router } = fakeRouter();
    startAnalytics(router);
    expect(hooks).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
    expect(document.querySelector("script[src*='googletagmanager']")).toBeNull();
  });

  it("in production loads gtag.js for the stream and sends a page_view per navigation", () => {
    process.env.NODE_ENV = "production";
    const { hooks, router } = fakeRouter();
    startAnalytics(router);

    const script = document.querySelector<HTMLScriptElement>("script[src*='googletagmanager']");
    expect(script?.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    const queued = () => window.dataLayer!.map((args) => Array.from(args as ArrayLike<unknown>));
    expect(queued()).toContainEqual([
      "config",
      GA_MEASUREMENT_ID,
      { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false },
    ]);

    hooks[0](route("/hospital/:userId?/", "hospital"), undefined);
    hooks[0](route("/shop/:merchant?/:userId?"), undefined, new Error("aborted"));
    const views = queued().filter(([kind, name]) => kind === "event" && name === "page_view");
    expect(views).toEqual([
      ["event", "page_view", { page_location: "http://localhost/hospital/:userId", page_path: "/hospital/:userId", page_title: "hospital" }],
    ]);
  });

  it("in the Android app sends screen_view through native Firebase instead of loading gtag", async () => {
    process.env.NODE_ENV = "production";
    mockLogEvent.mockClear();
    const { hooks, router } = fakeRouter();
    startAnalytics(router, "android");

    expect(window.gtag).toBeUndefined();
    expect(document.querySelector("script[src*='googletagmanager']")).toBeNull();

    hooks[0](route("/bank/:userId?/", "gold-bank"), undefined);
    hooks[0](route("/shop/:merchant?/:userId?"), undefined, new Error("aborted"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith({
      name: "screen_view",
      params: { screen_class: "/bank/:userId", screen_name: "gold-bank" },
    });
  });
});
