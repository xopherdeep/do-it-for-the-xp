import { dialogMessage } from "@/lib/utils/dialogMessage";

describe("dialogMessage", () => {
  it("lays out a lead, titled lists by tone and a note", () => {
    const html = dialogMessage({
      lead: "Adds a world.",
      groups: [{ title: "Adds", tone: "add", lines: ["Quests", "Beasts"] }],
      note: "Careful.",
    });
    expect(html).toBe(
      '<p class="rpg-alert__lead">Adds a world.</p>' +
        '<p class="rpg-alert__title">Adds</p>' +
        '<ul class="rpg-alert__list rpg-alert__list--add"><li>Quests</li><li>Beasts</li></ul>' +
        '<p class="rpg-alert__note">Careful.</p>'
    );
  });

  it("drops empty groups so no lone heading shows", () => {
    const html = dialogMessage({ lead: "Done.", groups: [{ title: "Left as they were", lines: [] }] });
    expect(html).toBe('<p class="rpg-alert__lead">Done.</p>');
  });

  it("escapes text, since alerts render it as HTML", () => {
    const html = dialogMessage({ lead: "<b>x</b>", groups: [{ lines: ["Dos & Don'ts"] }] });
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("Dos &amp; Don&#39;ts");
    expect(html).toContain("rpg-alert__list--info");
  });
});
