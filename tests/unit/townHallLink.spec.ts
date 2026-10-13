import { TOWN_HALL_APP_ID } from "@/lib/services/townhall/townHallSite";
import { authorizeUrl, readLinkReturn, strippedUrl, townHallReturnUrl } from "@/lib/services/townhall/townHallLink";

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

describe("strippedUrl", () => {
  it("strips the query and keeps the route", () => {
    expect(strippedUrl({ ...loc, hash: "#/town-hall/gm-1" })).toBe("https://app.forthexp.com/#/town-hall/gm-1");
  });

  it("works with no route", () => {
    expect(strippedUrl({ ...loc, hash: "" })).toBe("https://app.forthexp.com/");
  });
});
