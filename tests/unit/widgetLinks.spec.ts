import { heroPath, listenForWidgetLink, parseWidgetLink } from "@/lib/services/widgets/widgetLinks";

type UrlOpenEvent = { url: string };

let mockHandler: ((event: UrlOpenEvent) => void) | null = null;
const mockRemove = jest.fn();
const mockAddListener = jest.fn(async (_event: string, handler: (event: UrlOpenEvent) => void) => {
  mockHandler = handler;
  return { remove: mockRemove };
});
const mockGetLaunchUrl = jest.fn();

jest.mock("@capacitor/app", () => ({
  __esModule: true,
  App: {
    addListener: (...args: [string, (event: UrlOpenEvent) => void]) => mockAddListener(...args),
    getLaunchUrl: () => mockGetLaunchUrl(),
  },
}));

/** The system hands the running app an address. */
const open = (url: string) => mockHandler?.({ url });

beforeEach(() => {
  mockHandler = null;
  mockAddListener.mockClear();
  mockRemove.mockClear();
  mockGetLaunchUrl.mockReset();
  mockGetLaunchUrl.mockResolvedValue(undefined);
});

describe("parseWidgetLink", () => {
  it("sends the Hero Card to the portal", () => {
    expect(parseWidgetLink("com.forthexp.doit://my-portal")).toEqual({ path: "/my-portal/:userId" });
  });

  it("sends the Gold Vault to the bank", () => {
    expect(parseWidgetLink("com.forthexp.doit://bank")).toEqual({ path: "/bank/:userId" });
  });

  it("sends the Streak Altar to the party", () => {
    expect(parseWidgetLink("com.forthexp.doit://party")).toEqual({ path: "/my-portal/:userId/my-party" });
  });

  it("sends the Dock's chores button to the quest log", () => {
    expect(parseWidgetLink("com.forthexp.doit://chores")).toEqual({ path: "/my-tasks/:userId" });
  });

  it("sends the Dock's dungeon button to the world map, where the temples are", () => {
    expect(parseWidgetLink("com.forthexp.doit://dungeon")).toEqual({ path: "/my-portal/:userId/world-map" });
  });

  it("enters a named temple directly", () => {
    expect(parseWidgetLink("com.forthexp.doit://dungeon/old-house")).toEqual({
      path: "/temple/old-house/:userId",
    });
  });

  it("opens the quick task sheet for the Dock's + button", () => {
    expect(parseWidgetLink("com.forthexp.doit://action/add-task")).toEqual({
      path: "/my-tasks/:userId",
      query: { add: "quick" },
    });
  });

  it("takes a Quest Board row to that quest's card", () => {
    expect(parseWidgetLink("com.forthexp.doit://quest/task-42")).toEqual({
      path: "/my-tasks/:userId/task/task-42",
    });
  });

  it("reads a quest id through the query and the fragment a launcher may add", () => {
    expect(parseWidgetLink("com.forthexp.doit://quest/task-42?from=widget#top")).toEqual({
      path: "/my-tasks/:userId/task/task-42",
    });
  });

  it("keeps a quest id with awkward characters whole", () => {
    expect(parseWidgetLink("com.forthexp.doit://quest/a%2Fb")).toEqual({
      path: "/my-tasks/:userId/task/a%2Fb",
    });
  });

  it("leaves the Town Hall's return address to nativeReturn.ts", () => {
    expect(parseWidgetLink("com.forthexp.doit://town-hall?site_url=https%3A%2F%2Fdoit.forthexp.com")).toBeNull();
  });

  it("owns nothing it does not know", () => {
    expect(parseWidgetLink("com.forthexp.doit://tavern")).toBeNull();
    expect(parseWidgetLink("com.forthexp.doit://action/brew-potion")).toBeNull();
    expect(parseWidgetLink("com.forthexp.doit://quest")).toBeNull();
    expect(parseWidgetLink("com.someone.else://bank")).toBeNull();
    expect(parseWidgetLink("https://doit.forthexp.com/bank")).toBeNull();
  });

  it("does not throw on an address nobody can read", () => {
    expect(parseWidgetLink("")).toBeNull();
    expect(parseWidgetLink("com.forthexp.doit://")).toBeNull();
    expect(parseWidgetLink("com.forthexp.doit://quest/%E0%A4%A")).toBeNull();
    expect(parseWidgetLink("com.forthexp.doit:////")).toBeNull();
  });
});

describe("heroPath", () => {
  it("puts the hero signed in where the widget had nobody", () => {
    expect(heroPath({ path: "/my-portal/:userId/my-party" }, "hero-1")).toEqual({
      path: "/my-portal/hero-1/my-party",
    });
  });

  it("keeps the query the destination carries", () => {
    expect(heroPath({ path: "/my-tasks/:userId", query: { add: "quick" } }, "hero-1")).toEqual({
      path: "/my-tasks/hero-1",
      query: { add: "quick" },
    });
  });
});

describe("listenForWidgetLink", () => {
  it("listens for addresses opened in the app", async () => {
    await listenForWidgetLink(jest.fn());
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0][0]).toBe("appUrlOpen");
  });

  it("follows a tap on a running app", async () => {
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    open("com.forthexp.doit://bank");
    expect(navigate).toHaveBeenCalledWith({ path: "/bank/:userId" });
  });

  it("leaves an address it does not own alone", async () => {
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    open("com.forthexp.doit://town-hall?success=false");
    open("com.forthexp.doit://tavern");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("follows the address that started the app, which never arrives as an event", async () => {
    mockGetLaunchUrl.mockResolvedValue({ url: "com.forthexp.doit://quest/task-7" });
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ path: "/my-tasks/:userId/task/task-7" });
  });

  it("follows a cold start once when the event arrives after the launch address is read", async () => {
    const COLD = "com.forthexp.doit://bank";
    mockGetLaunchUrl.mockResolvedValue({ url: COLD });
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    open(COLD);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("follows a cold start once when the event arrives before the launch address is read", async () => {
    const COLD = "com.forthexp.doit://bank";
    mockGetLaunchUrl.mockImplementation(() => {
      // The system delivers the launching intent as an event while the launch address is still being read
      open(COLD);
      return Promise.resolve({ url: COLD });
    });
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ path: "/bank/:userId" });
  });

  it("still follows a later tap on the widget that started the app", async () => {
    const COLD = "com.forthexp.doit://bank";
    mockGetLaunchUrl.mockResolvedValue({ url: COLD });
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    open(COLD);
    open(COLD);
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it("listens anyway when there is no launch address to read", async () => {
    mockGetLaunchUrl.mockRejectedValue(new Error("not implemented"));
    const navigate = jest.fn();
    await listenForWidgetLink(navigate);
    open("com.forthexp.doit://party");
    expect(navigate).toHaveBeenCalledWith({ path: "/my-portal/:userId/my-party" });
  });

  it("stops listening when the function it hands back is called", async () => {
    const stop = await listenForWidgetLink(jest.fn());
    expect(mockRemove).not.toHaveBeenCalled();
    stop();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
