import {
  appVersion,
  connectionName,
  DEFAULT_TOWN_HALL_SITE,
  hostNonce,
  passwordResetUrl,
  profileUrl,
  SITE_OVERRIDE_KEY,
  townHallRestRoot,
  townHallSiteUrl,
  TOWN_HALL_APP_ID,
  TOWN_HALL_BOARDS,
  TOWN_HALL_TIMEOUT_MS,
  PATCH_NOTES_SLUG,
  SIGNUP_URL,
} from "@/lib/services/townhall/townHallSite";

describe("townHallSite constants", () => {
  it("pins the values the plugin and the app share", () => {
    expect(TOWN_HALL_APP_ID).toBe("7606ce60-29c7-43b6-9533-2063ee726df4");
    expect(DEFAULT_TOWN_HALL_SITE).toBe("https://doit.forthexp.com");
    expect(SITE_OVERRIDE_KEY).toBe("xp:townHallSite");
    expect(SIGNUP_URL).toBe("https://www.forthexp.com/wp-signup.php");
    expect(TOWN_HALL_BOARDS).toEqual(["feature-requests", "ideas-suggestions", "comments-feedback", "suggestion-box"]);
    expect(PATCH_NOTES_SLUG).toBe("patch-notes");
    expect(TOWN_HALL_TIMEOUT_MS).toBe(8000);
  });
});

describe("townHallSiteUrl", () => {
  afterEach(() => localStorage.clear());

  it("defaults to doit.forthexp.com", () => expect(townHallSiteUrl({ env: undefined, override: null, production: false })).toBe("https://doit.forthexp.com"));
  it("trims a trailing slash from the build setting", () => expect(townHallSiteUrl({ env: "https://example.test/", override: null, production: true })).toBe("https://example.test"));
  it("takes the localStorage override in development", () => expect(townHallSiteUrl({ override: "http://localhost:8090/doit/", production: false })).toBe("http://localhost:8090/doit"));
  it("ignores the override in production", () => expect(townHallSiteUrl({ override: "http://localhost:8090/doit", production: true })).toBe("https://doit.forthexp.com"));

  it("prefers the override to the build setting in development", () =>
    expect(townHallSiteUrl({ env: "https://example.test", override: "http://localhost:8090", production: false })).toBe("http://localhost:8090"));

  it("reads the override from localStorage when none is passed", () => {
    localStorage.setItem(SITE_OVERRIDE_KEY, "http://localhost:8090/doit/");
    expect(townHallSiteUrl({ production: false })).toBe("http://localhost:8090/doit");
  });

  it("falls back to the default when localStorage throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(townHallSiteUrl({ env: undefined, production: false })).toBe("https://doit.forthexp.com");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("townHallRestRoot", () => {
  it("adds /wp-json to the site", () => expect(townHallRestRoot("https://example.test")).toBe("https://example.test/wp-json"));
  it("uses the configured site when none is passed", () => expect(townHallRestRoot()).toBe(`${townHallSiteUrl()}/wp-json`));
});

describe("hostNonce", () => {
  const site = "https://doit.forthexp.com";
  it("uses the host page's nonce when it serves the Town Hall site", () => expect(hostNonce({ root: "https://doit.forthexp.com/wp-json/", nonce: "n1" }, site)).toBe("n1"));
  it("ignores another site's nonce", () => expect(hostNonce({ root: "https://www.forthexp.com/wp-json/", nonce: "n1" }, site)).toBeNull());
  it("is null with no host page", () => expect(hostNonce(undefined, site)).toBeNull());

  it("is null when the host page carries no nonce", () => expect(hostNonce({ root: "https://doit.forthexp.com/wp-json/" }, site)).toBeNull());
  it("matches a site installed in a sub-folder", () =>
    expect(hostNonce({ root: "http://localhost:8090/doit/wp-json/", nonce: "n2" }, "http://localhost:8090/doit")).toBe("n2"));
});

describe("connectionName", () => {
  const chromeAndroid = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
  const safariIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  it("names the browser and device", () => expect(connectionName(chromeAndroid, "web")).toBe("Do It For The XP – Chrome on Android"));
  it("names Safari on an iPhone", () => expect(connectionName(safariIphone, "web")).toBe("Do It For The XP – Safari on iPhone"));
  it("names the phone apps by platform", () => {
    expect(connectionName(chromeAndroid, "android")).toBe("Do It For The XP – Android app");
    expect(connectionName(safariIphone, "ios")).toBe("Do It For The XP – iPhone app");
  });
  it("falls back for unknown agents", () => expect(connectionName("curl/8", "web")).toBe("Do It For The XP – Browser on this device"));

  it("tells Edge, Firefox and Chrome apart on desktop", () => {
    const edge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0";
    const firefox = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
    const chromeMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
    const chromeIos = "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
    expect(connectionName(edge, "web")).toBe("Do It For The XP – Edge on Windows");
    expect(connectionName(firefox, "web")).toBe("Do It For The XP – Firefox on Linux");
    expect(connectionName(chromeMac, "web")).toBe("Do It For The XP – Chrome on Mac");
    expect(connectionName(chromeIos, "web")).toBe("Do It For The XP – Chrome on iPad");
  });
});

it("appVersion reads the build's version", () => {
  process.env.VUE_APP_VERSION = "0.3.0";
  expect(appVersion()).toBe("0.3.0");
  delete process.env.VUE_APP_VERSION;
  expect(appVersion()).toBe("dev");
});

describe("profileUrl and passwordResetUrl", () => {
  it("point at the default site's profile and reset pages", () => {
    expect(profileUrl()).toBe("https://doit.forthexp.com/wp-admin/profile.php");
    expect(passwordResetUrl()).toBe("https://doit.forthexp.com/wp-login.php?action=lostpassword");
  });

  it("strip trailing slashes from a given site", () => {
    expect(profileUrl("https://example.test//")).toBe("https://example.test/wp-admin/profile.php");
    expect(passwordResetUrl("https://example.test/")).toBe("https://example.test/wp-login.php?action=lostpassword");
  });
});
