import { inviteCodeText, sentWordToast, synergyHint } from "@/app/Console/MyPortal/party/partyWording";

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

/** "Invite a family" in a party with other families: the code a Game Master hands to a friend's Game Master */
describe("inviteCodeText", () => {
  it("gives the code to hand over", () => {
    expect(inviteCodeText("ABCD2345")).toBe("Party code: ABCD2345. Give it to a friend's Game Master.");
  });

  it("sends a Game Master to the leader when the site did not hand out the code", () => {
    expect(inviteCodeText(undefined)).toBe("Ask the party leader for the code.");
    expect(inviteCodeText("")).toBe("Ask the party leader for the code.");
  });

  it("escapes the code, because the toast it goes in renders HTML", () => {
    expect(inviteCodeText("<b>X</b>")).not.toContain("<b>");
  });
});

/** The Synergies tab's line about what powers the strikes up next, for a party of a given size */
describe("synergyHint", () => {
  it("walks a party of three or more up the steps, ending at full power", () => {
    expect(synergyHint(0, 3)).toBe("Two heroes finishing chores today make strikes x1.1");
    expect(synergyHint(1, 3)).toBe("One more hero today makes strikes x1.1");
    expect(synergyHint(2, 3)).toBe("One more hero today makes strikes x1.2");
    expect(synergyHint(3, 3)).toBe("Full party power!");
    expect(synergyHint(5, 6)).toBe("Full party power!");
  });

  it("gives a party of two full power once both have finished, instead of promising a third hero it does not have", () => {
    expect(synergyHint(0, 2)).toBe("Two heroes finishing chores today make strikes x1.1");
    expect(synergyHint(1, 2)).toBe("One more hero today makes strikes x1.1");
    expect(synergyHint(2, 2)).toBe("Full party power!");
  });

  it("says a party of one has no one to power up with", () => {
    expect(synergyHint(0, 1)).toBe("A party needs two heroes to power up.");
    expect(synergyHint(1, 1)).toBe("A party needs two heroes to power up.");
  });
});
