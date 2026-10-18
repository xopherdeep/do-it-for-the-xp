import { NPC_OPENERS, linesWithNews, npcHintLine } from "@/lib/services/guide/npcHints";

const STEP = { key: "walk-to-temple:wind-temple", hint: "The Wind Temple stands on the Plains." };

describe("npcHintLine", () => {
  it("leads the news with the townsperson's own opener", () => {
    expect(npcHintLine("hotel", STEP, undefined)).toBe(`${NPC_OPENERS.hotel} ${STEP.hint}`);
  });

  it("keeps quiet about news this townsperson already told, but not what another one told", () => {
    const heard = { shop: STEP.key };
    expect(npcHintLine("shop", STEP, heard)).toBeNull();
    expect(npcHintLine("bank", STEP, heard)).toContain(STEP.hint);
  });

  it("speaks again once the step moves on", () => {
    expect(npcHintLine("shop", { ...STEP, key: "first-room:wind-temple" }, { shop: STEP.key })).not.toBeNull();
  });
});

describe("linesWithNews", () => {
  it("slips the news in before the greeting's last line, and leaves it alone with no news", () => {
    expect(linesWithNews(["Welcome!", "What'll it be?"], "News!")).toEqual(["Welcome!", "News!", "What'll it be?"]);
    expect(linesWithNews(["Welcome!"], null)).toEqual(["Welcome!"]);
  });
});
