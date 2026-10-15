import { listenForTownHallReturn } from "@/lib/services/townhall/nativeReturn";

type UrlOpenEvent = { url: string };

let mockHandler: ((event: UrlOpenEvent) => void) | null = null;
const mockRemove = jest.fn();
const mockAddListener = jest.fn(async (_event: string, handler: (event: UrlOpenEvent) => void) => {
  mockHandler = handler;
  return { remove: mockRemove };
});
const mockClose = jest.fn();

jest.mock("@capacitor/app", () => ({
  __esModule: true,
  App: { addListener: (...args: [string, (event: UrlOpenEvent) => void]) => mockAddListener(...args) },
}));
jest.mock("@capacitor/browser", () => ({
  __esModule: true,
  Browser: { close: (...args: unknown[]) => mockClose(...args) },
}));

const RETURN = "com.forthexp.doit://town-hall?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=a+b";

/** The system hands the app an address. */
const open = (url: string) => mockHandler?.({ url });

beforeEach(() => {
  mockHandler = null;
  mockAddListener.mockClear();
  mockRemove.mockClear();
  mockClose.mockReset();
  mockClose.mockResolvedValue(undefined);
});

describe("listenForTownHallReturn", () => {
  it("listens for addresses opened in the app", async () => {
    await listenForTownHallReturn(jest.fn());
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener.mock.calls[0][0]).toBe("appUrlOpen");
  });

  it("hands the query of the Town Hall's address on, and closes the in-app browser", async () => {
    const onReturn = jest.fn();
    await listenForTownHallReturn(onReturn);
    open(RETURN);
    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(onReturn).toHaveBeenCalledWith("?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=a+b");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("hands on a rejection too", async () => {
    const onReturn = jest.fn();
    await listenForTownHallReturn(onReturn);
    open("com.forthexp.doit://town-hall?success=false");
    expect(onReturn).toHaveBeenCalledWith("?success=false");
  });

  it("ignores any other address and leaves the browser open", async () => {
    const onReturn = jest.fn();
    await listenForTownHallReturn(onReturn);
    open("https://example.com/?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=a+b");
    open("com.forthexp.doit://battle?success=false");
    open("com.forthexp.doit://town-hall-extra?success=false");
    open("com.someone.else://town-hall?success=false");
    open("");
    expect(onReturn).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("still hands the query on when the in-app browser cannot be closed (Android has no way to close it)", async () => {
    mockClose.mockRejectedValue(new Error("not implemented"));
    const onReturn = jest.fn();
    await listenForTownHallReturn(onReturn);
    open(RETURN);
    await Promise.resolve();
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("still hands the query on when closing the browser throws", async () => {
    mockClose.mockImplementation(() => {
      throw new Error("no plugin");
    });
    const onReturn = jest.fn();
    await listenForTownHallReturn(onReturn);
    expect(() => open(RETURN)).not.toThrow();
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("stops listening when the function it hands back is called", async () => {
    const stop = await listenForTownHallReturn(jest.fn());
    expect(mockRemove).not.toHaveBeenCalled();
    stop();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
