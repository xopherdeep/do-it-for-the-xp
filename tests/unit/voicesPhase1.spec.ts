import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, onMounted, watch } from "vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import type { ActiveRevealPrompt } from "@/components/organisms/RevealPrompt/revealPrompt";
import { emptyBoardLine } from "@/lib/engine/quests/QuestSchedule";
import { CATALOG } from "@/lib/services/copy/catalog";
import { copyFor, formatCopy, wordCount } from "@/lib/services/copy/copy";
import { VOICES } from "@/lib/services/copy/voices";
import type { CopyCatalog } from "@/lib/services/copy/voices";
import { bankReceipt, bankRefusal, storageQuestion, storageReceipt, storageRefusal } from "@/lib/services/gp/bankTeller";
import { amountAsk, atmMenuPrompt, savingsMenuPrompt } from "@/lib/services/gp/bankPrompts";
import { withdrawFromSavings, depositToSavings, payDownBills } from "@/lib/services/gp/wallet";
import { benchReceiptLine, benchRefusalLine, careConfirmPrompt, careReceiptLine, careRefusalLine, clerkMenuPrompt, comingSoonPrompt, nothingOnTheBoard, roomConfirmPrompt, roomReceiptLine, roomRefusalLine } from "@/lib/services/hometown/hometownPrompts";
import { draftProblem, stepGuide, wizardSteps } from "@/lib/services/quests/questWizard";
import { purchaseFailure, purchaseReceipt, walletReceipt, walletRefusal } from "@/lib/services/shop/shopPrompts";
import { cardActions, dueClock, hintLine, stateNote, stateWord, tamedLine } from "@/app/Console/MyPortal/UserHud/MyQuests/beastCard";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
const mockSpeak = jest.fn((_text: string) => true);
const mockStop = jest.fn();
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: (text: string) => mockSpeak(text),
  stop: () => mockStop(),
  speech: { isAvailable: () => true },
}));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const placeholdersOf = (text: string | undefined): string[] => Array.from((text ?? "").matchAll(/\{(\w+)\}/g)).map((match) => match[1]);

describe("the catalogue's voice rules (every line the screens ship)", () => {
  const entries = Object.entries(CATALOG as CopyCatalog);

  it("never asks the simple or classic wording for a placeholder the adventure line lacks", () => {
    const stray = entries.flatMap(([key, entry]) =>
      (["simple", "classic"] as const).flatMap((voice) => {
        const extra = placeholdersOf(entry[voice]).filter((name) => !placeholdersOf(entry.adventure).includes(name));
        return extra.length ? [`${key} (${voice}): ${extra.join(", ")}`] : [];
      })
    );
    expect(stray).toEqual([]);
  });

  it("keeps stage directions (*emotes*) in the adventure voice only", () => {
    const emotes = entries.flatMap(([key, entry]) =>
      (["simple", "classic"] as const).filter((voice) => /\*[^*]+\*/.test(entry[voice] ?? "")).map((voice) => `${key} (${voice})`)
    );
    expect(emotes).toEqual([]);
  });

  it("keeps cheerleading out of the classic voice: no exclamation marks", () => {
    const loud = entries.filter(([, entry]) => (entry.classic ?? "").includes("!")).map(([key]) => key);
    expect(loud).toEqual([]);
  });

  it("writes the simple voice short: at most 10 words, and no stage directions or double sentences of filler", () => {
    const long = entries.filter(([, entry]) => entry.simple && wordCount(entry.simple) > 10).map(([key]) => key);
    expect(long).toEqual([]);
  });

  it("gives each voice its own wording for the quest wizard's guide", () => {
    for (const step of wizardSteps(true)) {
      const lines = VOICES.map((voice) => stepGuide(step, voice));
      expect(new Set(lines).size).toBe(3);
      expect(wordCount(stepGuide(step, "simple"))).toBeLessThanOrEqual(8);
    }
  });
});

describe("the Quest Wizard in three voices", () => {
  it("asks for a chore in the voice of the reader", () => {
    expect(draftProblem({ name: " " }, "simple")).toBe("Pick a chore first.");
    expect(draftProblem({ name: " " })).toBe("Pick a chore or type its name");
    expect(draftProblem({ name: " " }, "classic")).toBe("Select a chore or enter a name.");
    expect(draftProblem({ name: "Dishes" }, "simple")).toBeNull();
  });
});

describe("the beast card in three voices", () => {
  it("words the note, chip and hint", () => {
    expect(stateNote("done", "simple")).toBe("Done! The beast is calm.");
    expect(stateNote("done", "classic")).toBe("Tamed.");
    expect(stateNote("open", "simple")).toBe("");
    expect(stateWord("pending", "simple")).toBe("Waiting");
    expect(stateWord("pending")).toBe("Pending");
    expect(stateWord("open")).toBe("");
    expect(hintLine(true, "simple")).toBe("All steps done! Tap Claim.");
    expect(hintLine(false, "classic")).toBe("Hunt, or check every step to claim.");
    expect(cardActions("later", [], "simple").note).toBe("Not time yet.");
  });

  it("counts the kills and reads the clock", () => {
    expect(tamedLine(0, "simple")).toBe("Not done yet");
    expect(tamedLine(1, "simple")).toBe("Done 1 time");
    expect(tamedLine(7, "classic")).toBe("Tamed: 7");
    expect(tamedLine(7)).toBe("Tamed 7 times");
    const now = new Date(2026, 9, 13, 16, 0, 0);
    expect(dueClock("open", new Date(2026, 9, 13, 18, 10, 0), "6:10pm", now, "simple")).toBe("Due 6:10pm");
    expect(dueClock("overdue", new Date(2026, 9, 13, 9, 0, 0), "9:00am", now, "simple")).toBe("Late! Due 9:00am");
    expect(dueClock("open", null, "Anytime", now, "simple")).toBe("Do it any time today.");
    expect(dueClock("open", new Date(2026, 9, 13, 18, 10, 0), "6:10pm", now, "classic")).toBe("Due 6:10pm · 2h 10m left");
  });

  it("names the empty calendar the same in every voice until someone words it differently", () => {
    expect(emptyBoardLine("morning", "simple")).toBe("No chores this morning.");
    expect(emptyBoardLine("night", "classic")).toBe("No chores tonight.");
  });
});

describe("the Gold Bank in three voices", () => {
  const purse = (over: Record<string, number> = {}) => ({ wallet: 40, savings: 100, debt: 0, hospitalBill: 0, limit: 300, ...over });

  it("turns a refusal and a receipt into the reader's words", () => {
    const empty = withdrawFromSavings(purse({ savings: 0 }), 10);
    expect(bankRefusal("withdraw", purse({ savings: 0 }), empty, "simple")).toBe("You have no savings yet.");
    expect(bankRefusal("withdraw", purse({ savings: 0 }), empty)).toBe("You have nothing saved. Your savings are empty!");
    expect(bankRefusal("withdraw", purse({ savings: 0 }), empty, "classic")).toBe("Savings are empty.");

    const out = withdrawFromSavings(purse(), 25);
    expect(bankReceipt("withdraw", purse(), out, "simple")).toBe("You took out ₲25. Wallet: ₲65");
    expect(bankReceipt("withdraw", purse(), out, "classic")).toBe("Withdrew ₲25. Wallet: ₲65 | Savings: ₲75.");
    const saved = depositToSavings(purse(), 15);
    expect(bankReceipt("deposit", purse(), saved)).toBe("₲15 deposited. Wallet: ₲25 | Savings: ₲115.");
    const paid = payDownBills(purse({ debt: 30 }), 30);
    expect(bankReceipt("payDebt", purse({ debt: 30 }), paid, "simple")).toContain("You paid ₲30");
  });

  it("asks how much, and answers storage questions, in each voice", () => {
    const ask = amountAsk("withdraw", purse(), undefined, "simple");
    expect("prompt" in ask && ask.prompt.lines[0]).toBe("How much to take out? You have ₲100.");
    expect(atmMenuPrompt(purse(), "classic").lines).toEqual(["Select a transaction."]);
    expect(savingsMenuPrompt(purse(), "simple").lines).toEqual(["Savings: ₲100. Wallet: ₲40."]);
    const next = { tier: 1, slots: 10, price: 100 } as never;
    expect(storageQuestion(next, "simple")).toBe("A Storage Box holds 10 things. Buy for 100 GP?");
    expect(storageQuestion(next)).toBe("A Storage Box holds 10 things. 100 GP?");
    expect(storageQuestion(next, "classic")).toBe("A Storage Box: 10 slots for 100 GP. Purchase?");
    expect(storageRefusal({ ok: false, reason: "max" }, "classic")).toBe("Storage is at its maximum size.");
    expect(storageReceipt({ ok: true, tier: 1, slots: 10, price: 100, fromWallet: 100, fromSavings: 20 } as never, "simple")).toBe(
      "You got a Storage Box! 10 slots. (20 GP came from savings.)"
    );
  });
});

describe("the shops, the hospital, the hotel and the Town Hall in three voices", () => {
  const shop = { shopkeeper: "Clerk", accent: "plains" };

  it("words the receipts and refusals", () => {
    expect(purchaseReceipt(shop, "Apple", "simple").lines).toEqual(["Here is your Apple! The Game Master brings it."]);
    expect(purchaseReceipt(shop, "Apple").lines).toEqual(["Here you go: Apple! The Game Master will bring it to you."]);
    expect(purchaseFailure(shop, "Apple", 5, "classic").lines).toEqual(["Apple: short by ₲5."]);
    expect(purchaseFailure(shop, "Apple", null, "simple").lines).toEqual(["The till is stuck. Nothing was bought."]);
    expect(walletReceipt(shop, 300, "classic").lines).toEqual(["Wallet capacity: ₲300."]);
    expect(walletRefusal({ ok: false, reason: "poor", short: 40 } as never, "simple")).toBe("You need ₲40 more. Come back later.");
  });

  it("speaks as Nurse Joy, the concierge and the clerk would", () => {
    expect(careConfirmPrompt("heal", "simple").lines).toEqual(["Healing costs 50 GP. Heal now?"]);
    expect(careRefusalLine({ reason: "healthy" } as never, "classic")).toBe("You are already at full health.");
    expect(careReceiptLine("heal", 20, { now: 30, max: 40 }, null, "classic")).toBe("Healed. ₲20 paid. HP 30/40");
    expect(careReceiptLine("revive", 50, { now: 10, max: 40 }, { now: 5, max: 9 }, "simple")).toBe("Revived! You paid ₲50. HP 10/40 MP 5/9");
    expect(benchRefusalLine({ reason: "napped" } as never, "simple")).toBe("You napped today. Come back tomorrow.");
    expect(benchReceiptLine(8, { now: 20, max: 40 }, "simple")).toBe("You nap on the bench. +8 HP. HP 20/40");
    expect(roomConfirmPrompt("classic").lines[0]).toMatch(/^Room: \d+ GP\. Full restoration\. Check in\?$/);
    expect(roomRefusalLine({ reason: "healthy" } as never, "simple")).toBe("You look rested! Come back when you are tired.");
    expect(roomReceiptLine(30, { now: 40, max: 40 }, null, "classic")).toBe("Morning. ₲30 paid. HP 40/40");
    expect(nothingOnTheBoard("classic")).toBe("The board is empty.");
    expect(clerkMenuPrompt("simple").lines).toEqual(["Hi! What goes on the board?"]);
    expect(comingSoonPrompt("Bug reports", "classic").lines).toEqual(["Bug reports: not yet available."]);
  });
});

describe("read-aloud on the RPG prompt", () => {
  const typingStub = defineComponent({
    props: ["text"],
    emits: ["typing-complete"],
    setup(props, { emit }) {
      onMounted(() => emit("typing-complete"));
      watch(() => props.text, () => emit("typing-complete"));
      return () => h("span", { class: "typing-stub" }, props.text);
    },
  });
  const prompt = (lines: string[]): ActiveRevealPrompt => ({
    key: 1,
    options: { speaker: "Bank Manager", lines, choices: [{ id: "ok", label: "OK" }], cancelId: "ok" },
  });
  const mountPrompt = async (birthYearsAgo: number, lines: string[]) => {
    setActivePinia(createPinia());
    const store = useUserStore();
    const born = `${new Date().getFullYear() - birthYearsAgo}-01-01`;
    store.addUser({ id: "hero", birthday: born });
    store.loginUser(store.users.hero);
    const wrapper = mount(XpRevealPrompt, {
      props: { prompt: prompt(lines), inline: true },
      global: { stubs: { XpTypingText: typingStub, transition: true } },
    });
    await nextTick();
    return wrapper;
  };

  beforeEach(() => {
    mockSpeak.mockClear();
    mockStop.mockClear();
  });

  it("reads the first line aloud for a first grader, then the next as it is turned to", async () => {
    const wrapper = await mountPrompt(6, ["Hello there.", "How are you?"]);
    expect(mockSpeak).toHaveBeenCalledWith("Hello there.");
    await wrapper.find('[data-cy="reveal-text"]').trigger("click");
    await nextTick();
    expect(mockSpeak).toHaveBeenLastCalledWith("How are you?");
  });

  it("offers the speaker button to everyone and stops the voice when a choice is made", async () => {
    const wrapper = await mountPrompt(12, ["Hello there.", "How are you?"]);
    expect(mockSpeak).not.toHaveBeenCalled();
    await wrapper.find(".xp-speak-button").trigger("click");
    expect(mockSpeak).toHaveBeenCalledWith("Hello there. How are you?");
    await wrapper.find('[data-cy="reveal-skip"]').trigger("click");
    await nextTick();
    await wrapper.find('[data-cy="reveal-choice-ok"]').trigger("click");
    expect(mockStop).toHaveBeenCalled();
  });

  it("formats placeholders the way every key promises", () => {
    expect(formatCopy(copyFor("shop.buy.short", "simple"), { short: "₲5", item: "Apple" })).toBe("You need ₲5 more for Apple.");
  });
});

