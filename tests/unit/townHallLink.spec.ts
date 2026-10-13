import { TOWN_HALL_APP_ID } from "@/lib/services/townhall/townHallSite";
import {
  NATIVE_RETURN_URL,
  authorizeUrl,
  captureLinkReturn,
  readLinkReturn,
  searchOf,
  strippedState,
  townHallReturnUrl,
} from "@/lib/services/townhall/townHallLink";

const loc = { origin: "https://app.forthexp.com", pathname: "/" };

describe("townHallReturnUrl", () => {
  it("returns to the Town Hall in hash mode", () => {
    expect(townHallReturnUrl("gm-1", loc, true)).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("returns to the Town Hall in path mode", () => {
    expect(townHallReturnUrl("gm-1", loc, false)).toBe("https://app.forthexp.com/town-hall/gm-1");
  });

  it("keeps the page the app is served from in hash mode", () => {
    const nested = { origin: "https://www.forthexp.com", pathname: "/wp-content/plugins/xophz-compass-xp/public/dist/index.html" };
    expect(townHallReturnUrl("gm-1", nested, true)).toBe(
      "https://www.forthexp.com/wp-content/plugins/xophz-compass-xp/public/dist/index.html#/town-hall/gm-1"
    );
  });

  it("encodes the hero id so it stays one path segment", () => {
    expect(townHallReturnUrl("a b/c?d#e", loc, true)).toBe("https://app.forthexp.com/#/town-hall/a%20b%2Fc%3Fd%23e");
    expect(townHallReturnUrl("a b/c?d#e", loc, false)).toBe("https://app.forthexp.com/town-hall/a%20b%2Fc%3Fd%23e");
  });
});

describe("authorizeUrl", () => {
  const returnUrl = "https://app.forthexp.com/#/town-hall/gm-1";

  it("builds the authorize URL", () => {
    const u = new URL(authorizeUrl({ site: "https://doit.forthexp.com", appName: "Do It For The XP – Chrome on Android", returnUrl }));
    expect(u.origin + u.pathname).toBe("https://doit.forthexp.com/wp-admin/authorize-application.php");
    expect(u.searchParams.get("app_name")).toBe("Do It For The XP – Chrome on Android");
    expect(u.searchParams.get("app_id")).toBe(TOWN_HALL_APP_ID);
    expect(u.searchParams.get("success_url")).toBe("https://app.forthexp.com/#/town-hall/gm-1");
    expect(u.searchParams.get("reject_url")).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("does not double the slash when the site ends with one", () => {
    const u = new URL(authorizeUrl({ site: "https://doit.forthexp.com/", appName: "x", returnUrl }));
    expect(u.origin + u.pathname).toBe("https://doit.forthexp.com/wp-admin/authorize-application.php");
  });

  it("keeps a site that lives in a sub-directory", () => {
    const u = new URL(authorizeUrl({ site: "https://www.forthexp.com/doit", appName: "x", returnUrl }));
    expect(u.origin + u.pathname).toBe("https://www.forthexp.com/doit/wp-admin/authorize-application.php");
  });
});

describe("readLinkReturn", () => {
  it("reads a link, decoding + as a space", () => {
    expect(
      readLinkReturn("?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom%40example.com&password=abcd+efgh+ijkl+mnop")
    ).toEqual({ kind: "linked", siteUrl: "https://doit.forthexp.com", userLogin: "mom@example.com", appPassword: "abcd efgh ijkl mnop" });
  });

  it("reads a login with accents", () => {
    expect(readLinkReturn("?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=jos%C3%A9&password=abcd+efgh")).toEqual({
      kind: "linked",
      siteUrl: "https://doit.forthexp.com",
      userLogin: "josé",
      appPassword: "abcd efgh",
    });
  });

  it("reads a rejection", () => {
    expect(readLinkReturn("?success=false")).toEqual({ kind: "rejected" });
  });

  it("ignores a partial or unrelated query", () => {
    expect(readLinkReturn("")).toEqual({ kind: "none" });
    expect(readLinkReturn("?user_login=mom")).toEqual({ kind: "none" });
    expect(readLinkReturn("?foo=1")).toEqual({ kind: "none" });
  });

  it("ignores a link with an empty part", () => {
    expect(readLinkReturn("?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=")).toEqual({ kind: "none" });
  });

  it("does not take success=true for a rejection", () => {
    expect(readLinkReturn("?success=true")).toEqual({ kind: "none" });
  });
});

describe("strippedState", () => {
  // vue-router 4 keeps the page's own address in history.state.current and writes it back to the entry when the app navigates on
  const pathModeState = {
    back: "/home",
    current: "/town-hall/gm-1?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=abcd+efgh",
    forward: null,
    position: 3,
    replaced: true,
    scroll: { left: 0, top: 12 },
  };

  it("takes the query out of the route vue-router remembers, and keeps the rest of the state", () => {
    expect(strippedState(pathModeState)).toEqual({ ...pathModeState, current: "/town-hall/gm-1" });
  });

  it("keeps the fragment when the route has one", () => {
    expect(strippedState({ ...pathModeState, current: "/town-hall/gm-1?password=abcd+efgh#top" })).toMatchObject({
      current: "/town-hall/gm-1#top",
    });
  });

  it("leaves a route without a query alone", () => {
    const hashModeState = { ...pathModeState, current: "/town-hall/gm-1" };
    expect(strippedState(hashModeState)).toEqual(hashModeState);
  });

  it("does not change the state it was given", () => {
    const before = JSON.stringify(pathModeState);
    strippedState(pathModeState);
    expect(JSON.stringify(pathModeState)).toBe(before);
  });

  it("passes through a state it does not know (none, or no route text)", () => {
    expect(strippedState(null)).toBeNull();
    expect(strippedState("a state")).toBe("a state");
    const unknown = { position: 2 };
    expect(strippedState(unknown)).toEqual(unknown);
    expect(strippedState({ current: 7 })).toEqual({ current: 7 });
  });
});

describe("NATIVE_RETURN_URL", () => {
  it("is the phone apps' own address, which the system hands back to the app", () => {
    expect(NATIVE_RETURN_URL).toBe("com.forthexp.doit://town-hall");
  });

  it("is what WordPress is asked to send the parent back to from a phone app", () => {
    const u = new URL(authorizeUrl({ site: "https://doit.forthexp.com", appName: "Do It For The XP – Android app", returnUrl: NATIVE_RETURN_URL }));
    expect(u.searchParams.get("success_url")).toBe("com.forthexp.doit://town-hall");
    expect(u.searchParams.get("reject_url")).toBe("com.forthexp.doit://town-hall");
  });
});

describe("searchOf", () => {
  it("reads a link out of the app's own address, decoding + as a space", () => {
    const url = "com.forthexp.doit://town-hall?site_url=https%3A%2F%2Fdoit.forthexp.com&user_login=mom&password=a+b";
    expect(readLinkReturn(searchOf(url))).toEqual({ kind: "linked", siteUrl: "https://doit.forthexp.com", userLogin: "mom", appPassword: "a b" });
  });

  it("reads a rejection", () => {
    expect(readLinkReturn(searchOf("com.forthexp.doit://town-hall?success=false"))).toEqual({ kind: "rejected" });
  });

  it("keeps the query up to a fragment and leaves the fragment out", () => {
    expect(searchOf("com.forthexp.doit://town-hall?success=false#top")).toBe("?success=false");
  });

  it("is empty for an address with no query", () => {
    expect(searchOf("com.forthexp.doit://town-hall")).toBe("");
    expect(searchOf("com.forthexp.doit://town-hall#?success=false")).toBe("");
    expect(readLinkReturn(searchOf("com.forthexp.doit://town-hall"))).toEqual({ kind: "none" });
  });
});

/**
 * WordPress's approve button (wp-admin/js/auth-app.js, 7.1.3): plain concatenation onto the END of success_url, so in a
 * hash-routed build the answer lands after the route, inside the fragment. encodeURIComponent: spaces are %20.
 */
const authAppReturn = (successUrl: string, siteUrl: string, userLogin: string, password: string) =>
  successUrl +
  (-1 === successUrl.indexOf("?") ? "?" : "&") +
  "site_url=" +
  encodeURIComponent(siteUrl) +
  "&user_login=" +
  encodeURIComponent(userLogin) +
  "&password=" +
  encodeURIComponent(password);

/** The no-JS fallback (authorize-application.php): add_query_arg puts the query before the fragment; urlencode: spaces are +. */
const phpReturn = (base: string, fragment: string, siteUrl: string, userLogin: string, password: string) => {
  const urlencode = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  return `${base}?site_url=${urlencode(siteUrl)}&user_login=${urlencode(userLogin)}&password=${urlencode(password)}${fragment}`;
};

const at = (href: string) => {
  const u = new URL(href);
  return { origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash };
};

describe("captureLinkReturn", () => {
  const PASSWORD = "AbCd EfGh IjKl MnOp QrSt UvWx";
  const linked = (state?: string) => ({
    kind: "linked",
    siteUrl: "https://doit.forthexp.com",
    userLogin: "mom+xp@example.com",
    appPassword: PASSWORD,
    ...(state ? { state } : {}),
  });

  it("finds WordPress's answer after the route of a hash-routed build, and keeps only the route", () => {
    const back = authAppReturn("https://app.forthexp.com/#/town-hall/gm-1?th_state=s-1", "https://doit.forthexp.com", "mom+xp@example.com", PASSWORD);
    expect(back).toContain("#/town-hall/gm-1?th_state=s-1&site_url=");
    expect(back).toContain("password=AbCd%20EfGh");

    const captured = captureLinkReturn(at(back));

    expect(captured).not.toBeNull();
    expect(readLinkReturn(captured!.search)).toEqual(linked("s-1"));
    expect(captured!.url).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("finds it in a build served from a nested page", () => {
    const page = "https://www.forthexp.com/wp-content/plugins/xophz-compass-xp/public/dist/index.html";
    const back = authAppReturn(`${page}#/town-hall/gm-1?th_state=s-1`, "https://doit.forthexp.com", "mom+xp@example.com", PASSWORD);

    const captured = captureLinkReturn(at(back));

    expect(readLinkReturn(captured!.search)).toEqual(linked("s-1"));
    expect(captured!.url).toBe(`${page}#/town-hall/gm-1`);
  });

  it("finds it in the query of a path-routed build", () => {
    const back = authAppReturn("https://app.forthexp.com/town-hall/gm-1?th_state=s-1", "https://doit.forthexp.com", "mom+xp@example.com", PASSWORD);

    const captured = captureLinkReturn(at(back));

    expect(readLinkReturn(captured!.search)).toEqual(linked("s-1"));
    expect(captured!.url).toBe("https://app.forthexp.com/town-hall/gm-1");
  });

  it("reads the no-JS fallback's shape too: the answer before the fragment, the state inside it", () => {
    const back = phpReturn("https://app.forthexp.com/", "#/town-hall/gm-1?th_state=s-1", "https://doit.forthexp.com", "mom+xp@example.com", PASSWORD);
    expect(back).toContain("password=AbCd+EfGh");

    const captured = captureLinkReturn(at(back));

    expect(readLinkReturn(captured!.search)).toEqual(linked("s-1"));
    expect(captured!.url).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("finds a refusal that came back to the reject address the app built", () => {
    const captured = captureLinkReturn(at("https://app.forthexp.com/#/town-hall/gm-1?th_state=s-1&success=false"));

    expect(readLinkReturn(captured!.search)).toEqual({ kind: "rejected", state: "s-1" });
    expect(captured!.url).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("takes a return without a state out of the address too, so a stray password never stays there", () => {
    const back = authAppReturn("https://app.forthexp.com/#/town-hall/gm-1", "https://doit.forthexp.com", "mom+xp@example.com", PASSWORD);

    const captured = captureLinkReturn(at(back));

    expect(readLinkReturn(captured!.search)).toEqual(linked());
    expect(captured!.url).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("leaves an ordinary address alone", () => {
    expect(captureLinkReturn(at("https://app.forthexp.com/#/town-hall/gm-1"))).toBeNull();
    expect(captureLinkReturn(at("https://app.forthexp.com/#/intro?nosplash"))).toBeNull();
    expect(captureLinkReturn(at("https://app.forthexp.com/town-hall/gm-1?success=true"))).toBeNull();
    expect(captureLinkReturn(at("https://app.forthexp.com/"))).toBeNull();
  });
});
