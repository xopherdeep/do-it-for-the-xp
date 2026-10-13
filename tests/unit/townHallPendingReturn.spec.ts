import { captureTownHallReturn, stashLinkReturn, takeLinkReturn } from "@/lib/services/townhall/pendingReturn";
import { readLinkReturn } from "@/lib/services/townhall/townHallLink";

const PASSWORD = "AbCd EfGh IjKl";

/** What WordPress's approve button (auth-app.js) makes of success_url: the answer appended after the route, %20 for spaces. */
const answer = `site_url=${encodeURIComponent("https://doit.forthexp.com")}&user_login=mom&password=${encodeURIComponent(PASSWORD)}`;

/** Put the page at an address, as the browser does when WordPress sends the parent back. */
const arriveAt = (path: string, state: unknown = null) => window.history.replaceState(state, "", path);

describe("pendingReturn", () => {
  beforeEach(() => {
    takeLinkReturn();
    arriveAt("/");
  });

  it("hands a stashed return over once", () => {
    stashLinkReturn("?success=false&th_state=s-1");
    expect(takeLinkReturn()).toBe("?success=false&th_state=s-1");
    expect(takeLinkReturn()).toBeNull();
  });

  it("has nothing to hand over on an ordinary start", () => {
    arriveAt("/#/town-hall/gm-1");
    captureTownHallReturn();
    expect(takeLinkReturn()).toBeNull();
    expect(window.location.href).toBe("http://localhost/#/town-hall/gm-1");
  });

  describe("captureTownHallReturn (the boot step, before the router reads the address)", () => {
    it("takes WordPress's answer out of a hash route: the address and the history entry keep only the route", () => {
      arriveAt(`/#/town-hall/gm-1?th_state=s-1&${answer}`);

      captureTownHallReturn();

      expect(window.location.href).toBe("http://localhost/#/town-hall/gm-1");
      expect(window.location.href).not.toContain("password");
      expect(JSON.stringify(window.history.state ?? null)).not.toContain("password");
      const search = takeLinkReturn();
      expect(readLinkReturn(search ?? "")).toEqual({
        kind: "linked",
        siteUrl: "https://doit.forthexp.com",
        userLogin: "mom",
        appPassword: PASSWORD,
        state: "s-1",
      });
    });

    it("takes it out of a path route's query", () => {
      arriveAt(`/town-hall/gm-1?th_state=s-1&${answer}`);

      captureTownHallReturn();

      expect(window.location.href).toBe("http://localhost/town-hall/gm-1");
      expect(readLinkReturn(takeLinkReturn() ?? "")).toMatchObject({ kind: "linked", state: "s-1" });
    });

    it("takes the no-JS fallback's shape apart too (answer before the fragment, state inside it)", () => {
      arriveAt(`/?${answer.replace(/%20/g, "+")}#/town-hall/gm-1?th_state=s-1`);

      captureTownHallReturn();

      expect(window.location.href).toBe("http://localhost/#/town-hall/gm-1");
      expect(readLinkReturn(takeLinkReturn() ?? "")).toMatchObject({ kind: "linked", appPassword: PASSWORD, state: "s-1" });
    });

    it("strips a route vue-router remembered in the entry's state, keeping the rest of it", () => {
      arriveAt(`/town-hall/gm-1?th_state=s-1&${answer}`, { current: `/town-hall/gm-1?th_state=s-1&${answer}`, position: 2 });

      captureTownHallReturn();

      expect(window.history.state).toEqual({ current: "/town-hall/gm-1", position: 2 });
    });

    it("hands a refusal over too", () => {
      arriveAt("/#/town-hall/gm-1?th_state=s-1&success=false");

      captureTownHallReturn();

      expect(window.location.href).toBe("http://localhost/#/town-hall/gm-1");
      expect(readLinkReturn(takeLinkReturn() ?? "")).toEqual({ kind: "rejected", state: "s-1" });
    });
  });
});
