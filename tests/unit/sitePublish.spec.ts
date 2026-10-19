import { pickAuth, parseEnvFile, statusQuery, planFrontPage, linksToCheck, SCREENSHOTS } from "../../tools/site/publishPlan";

describe("parseEnvFile", () => {
  it("reads keys, ignores comments, keeps spaces, strips quotes", () => {
    expect(parseEnvFile('# c\nA=1\nB="two words"\nC=x y z\n\n')).toEqual({ A: "1", B: "two words", C: "x y z" });
  });
});
describe("pickAuth", () => {
  const env = { DOIT_WP_USER: "d", DOIT_WP_APP_PASSWORD: "dp", LOCAL_WP_USER: "l", LOCAL_WP_APP_PASSWORD: "lp" };
  it("uses the local pair for mycompass and the doit pair otherwise", () => {
    expect(pickAuth("http://mycompass", env)).toEqual({ user: "l", password: "lp" });
    expect(pickAuth("https://doit.forthexp.com", env)).toEqual({ user: "d", password: "dp" });
  });
  it("names the missing key", () => {
    expect(() => pickAuth("https://doit.forthexp.com", { DOIT_WP_USER: "d" })).toThrow("Missing DOIT_WP_APP_PASSWORD in env file");
  });
});
describe("planFrontPage", () => {
  it("drafts the previous page only when it differs", () => {
    expect(planFrontPage(1141369, 5)).toEqual({ draftPrevious: 1141369 });
    expect(planFrontPage(5, 5)).toEqual({ draftPrevious: null });
    expect(planFrontPage(0, 5)).toEqual({ draftPrevious: null });
  });
});
describe("linksToCheck", () => {
  it("resolves site-relative links, drops anchors, dedupes", () => {
    expect(linksToCheck(["#how-it-works", "/blog/", "https://a/", "/blog/"], "https://doit.forthexp.com"))
      .toEqual(["https://doit.forthexp.com/blog/", "https://a/"]);
  });
});
it("statusQuery includes trash", () => { expect(statusQuery()).toBe("publish,draft,pending,private,future,trash"); });
it("SCREENSHOTS lists the eight agreed names with files and alt text", () => {
  expect(SCREENSHOTS.map((s) => s.name)).toEqual(["hometown", "battle", "victory", "temple-map", "beast-log", "boss", "small-key", "my-home"]);
  expect(SCREENSHOTS.every((s) => s.file === `.github/readme/${s.name}.jpg` && s.alt.length > 0)).toBe(true);
});
