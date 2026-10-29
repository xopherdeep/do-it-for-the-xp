import { sentWordToast } from "@/app/Console/MyPortal/party/partyWording";

/**
 * The toast after a cheer or a poke. Ionic toasts render their message as HTML, and in a party with other families the
 * name in it is another family's text, so it must never reach the toast as markup (a picture in a nickname would be
 * fetched from the address it names, from a kid's device).
 */
describe("sentWordToast", () => {
  it("words a cheer and a poke, with the colors the toast has always used", () => {
    expect(sentWordToast("cheer", "Ben")).toEqual({ text: "💚 Sent encouragement to Ben!", color: "success" });
    expect(sentWordToast("poke", "Ben")).toEqual({ text: "👋 Nudged Ben!", color: "warning" });
  });

  it("falls back to Hero for a hero with no nickname", () => {
    expect(sentWordToast("cheer", "").text).toBe("💚 Sent encouragement to Hero!");
  });

  it("turns markup in a nickname into plain text", () => {
    const { text } = sentWordToast("cheer", '<img src="https://tracker.example/p.png" onerror="alert(1)">');
    expect(text).not.toContain("<");
    expect(text).toContain("&lt;img src=&quot;https://tracker.example/p.png&quot; onerror=&quot;alert(1)&quot;&gt;");
  });
});
