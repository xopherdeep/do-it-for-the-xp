import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  pickAuth, parseEnvFile, statusQuery, planFrontPage, linksToCheck, SCREENSHOTS, WpError, isMissingTemplate, frontPageKept,
  SITE_LINKS, planMenu,
} from "../../tools/site/publishPlan";
import { checkMarkup, collectHrefs, renderMarkup } from "../../tools/site/markup";

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

describe("isMissingTemplate", () => {
  it("is true only for a 404 rest_template_not_found from the site", () => {
    expect(isMissingTemplate(new WpError(404, "rest_template_not_found", "Template not found."))).toBe(true);
    expect(isMissingTemplate(new WpError(404, "rest_no_route", "No route."))).toBe(false);
    expect(isMissingTemplate(new WpError(403, "rest_template_not_found", "Nope."))).toBe(false);
    expect(isMissingTemplate(new Error("404 rest_template_not_found: Template not found."))).toBe(false);
  });
  it("keeps the site's message and carries the status and code", () => {
    const error = new WpError(404, "rest_template_not_found", "Template not found.");
    expect([error.message, error.status, error.code]).toEqual(["404 rest_template_not_found: Template not found.", 404, "rest_template_not_found"]);
  });
});
describe("frontPageKept", () => {
  it("needs show_on_front page and the home id back from the site", () => {
    expect(frontPageKept({ show_on_front: "page", page_on_front: 5 }, 5)).toBe(true);
    expect(frontPageKept({ show_on_front: "posts", page_on_front: 5 }, 5)).toBe(false);
    expect(frontPageKept({ show_on_front: "page", page_on_front: 6 }, 5)).toBe(false);
  });
});

describe("SITE_LINKS", () => {
  it("lists the four site links in order", () => {
    expect(SITE_LINKS).toEqual([
      { label: "Play now", href: "https://app.doit.forthexp.com" },
      { label: "Blog", href: "/blog/" },
      { label: "Boards", href: "/cafeteria-board/feature-requests/" },
      { label: "GitHub", href: "https://github.com/xopherdeep/do-it-for-the-xp" },
    ]);
  });
});

describe("planMenu", () => {
  const [play, blog, boards, github] = SITE_LINKS;
  it("creates all four links, in order, when the menu is empty", () => {
    expect(planMenu([], SITE_LINKS)).toEqual({
      update: [],
      create: [{ link: play, order: 1 }, { link: blog, order: 2 }, { link: boards, order: 3 }, { link: github, order: 4 }],
      draft: [],
    });
  });
  it("rewrites four existing items in menu_order order", () => {
    const existing = [{ id: 847, menu_order: 4 }, { id: 835, menu_order: 1 }, { id: 843, menu_order: 3 }, { id: 839, menu_order: 2 }];
    expect(planMenu(existing, SITE_LINKS)).toEqual({
      update: [
        { id: 835, link: play, order: 1 }, { id: 839, link: blog, order: 2 },
        { id: 843, link: boards, order: 3 }, { id: 847, link: github, order: 4 },
      ],
      create: [],
      draft: [],
    });
  });
  it("updates the first four of six items and drafts the other two, never deleting", () => {
    const existing = [1, 2, 3, 4, 5, 6].map((n) => ({ id: 100 + n, menu_order: n }));
    const plan = planMenu(existing, SITE_LINKS);
    expect(plan.update.map((u) => u.id)).toEqual([101, 102, 103, 104]);
    expect(plan.create).toEqual([]);
    expect(plan.draft).toEqual([105, 106]);
  });
  it("creates the missing links when fewer items exist than links", () => {
    const plan = planMenu([{ id: 7, menu_order: 1 }, { id: 8, menu_order: 2 }], SITE_LINKS);
    expect(plan.update).toEqual([{ id: 7, link: play, order: 1 }, { id: 8, link: blog, order: 2 }]);
    expect(plan.create).toEqual([{ link: boards, order: 3 }, { link: github, order: 4 }]);
    expect(plan.draft).toEqual([]);
  });
  it("breaks menu_order ties by id and leaves its input alone", () => {
    const existing = [{ id: 9, menu_order: 0 }, { id: 3, menu_order: 0 }];
    const plan = planMenu(existing, SITE_LINKS.slice(0, 2));
    expect(plan.update.map((u) => u.id)).toEqual([3, 9]);
    expect(existing.map((e) => e.id)).toEqual([9, 3]);
  });
});

describe("footer-part.html", () => {
  const raw = readFileSync(join(__dirname, "../../tools/site/footer-part.html"), "utf8");
  const html = renderMarkup(raw, { year: "2026" });
  it("renders clean markup with only the year placeholder", () => {
    expect(checkMarkup(html)).toEqual([]);
    expect(() => renderMarkup(raw, {})).toThrow("Unknown placeholder: {{year}}");
  });
  it("carries the brand, the four site links and the copyright, and nothing of the theme's terminal block", () => {
    const text = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("&copy; 2026 Do It For The XP.");
    expect(text).not.toContain("!");
    expect(html).not.toMatch(/chemx|mh-terminal-card|mh-cli|About|Services|Portfolio|Team/);
    const hrefs = collectHrefs(html);
    expect(hrefs).toEqual(["/", ...SITE_LINKS.map((link) => link.href)]);
    for (const link of SITE_LINKS) {
      expect(html).toMatch(new RegExp(`<a href="${link.href.replace(/[./]/g, "\\$&")}"[^>]*>${link.label}</a>`));
    }
  });
});
