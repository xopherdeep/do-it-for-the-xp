import { renderMarkup, findPlaceholders, collectHrefs, checkMarkup } from "../../tools/site/markup";

describe("renderMarkup", () => {
  it("replaces media, media-id and app placeholders", () => {
    const out = renderMarkup('<img src="{{media:hometown}}" data-id="{{media-id:hometown}}"><a href="{{app}}">', {
      "media:hometown": "https://s/h.jpg", "media-id:hometown": "12", app: "https://app.doit.forthexp.com" });
    expect(out).toBe('<img src="https://s/h.jpg" data-id="12"><a href="https://app.doit.forthexp.com">');
  });
  it("throws on an unknown placeholder", () => {
    expect(() => renderMarkup("{{media:nope}}", {})).toThrow("Unknown placeholder: {{media:nope}}");
  });
});
describe("findPlaceholders", () => {
  it("lists distinct keys in order", () => {
    expect(findPlaceholders("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});
describe("collectHrefs", () => {
  it("returns distinct hrefs in order", () => {
    expect(collectHrefs('<a href="/x"><a href="#y"><a href="/x">')).toEqual(["/x", "#y"]);
  });
});
describe("checkMarkup", () => {
  it("is empty for clean markup", () => {
    expect(checkMarkup('<a href="https://a/"><img src="/i.jpg" alt="Hometown">')).toEqual([]);
  });
  it("flags invented numbers, relative hrefs, missing alt and placeholders", () => {
    const problems = checkMarkup('<p>Over 5000 achievements unlocked</p><a href="page"><img src="/i.jpg" alt="">{{app}}');
    expect(problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/^invented number: /), "relative href: page", "img without alt: /i.jpg", "placeholder {{app}}" ]));
    expect(problems).toHaveLength(4);
  });
});
