import { FAQ_GROUPS, MANUAL_CHAPTERS } from "@/app/SideMenu/XpSupport/helpContent";
import { ALL_SETTINGS_ITEMS } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/settingsSections";

/*
 * The Help Desk's words must match the game as built (GitHub issue 145). The lines are checked for the names the
 * screens really carry, for the old wording that went stale, and for an entry on every feature a family now asks about.
 */
// Built from its code so this file carries no em dash itself
const EM_DASH = String.fromCharCode(0x2014);
const faqEntries = FAQ_GROUPS.flatMap((group) => group.entries);
const allEntryText = [
  ...MANUAL_CHAPTERS.flatMap((chapter) => [chapter.title, chapter.intro, ...chapter.steps]),
  ...FAQ_GROUPS.flatMap((group) => group.entries.flatMap((entry) => [entry.question, entry.answer])),
];

const entryAbout = (question: RegExp) => {
  const found = faqEntries.find((entry) => question.test(entry.question));
  if (!found) throw new Error(`No FAQ entry asks ${question}`);
  return found;
};

const sentencesIn = (text: string): number => text.split(/[.!?](?:\s|$)/).filter((part) => part.trim().length > 0).length;

describe("Help Desk copy", () => {
  it("never uses an em dash", () => {
    const withDash = allEntryText.filter((line) => line.includes(EM_DASH));
    expect(withDash).toEqual([]);
  });

  it("gives every chapter a unique id and some steps", () => {
    const ids = MANUAL_CHAPTERS.map((chapter) => chapter.id);
    expect(new Set(ids).size).toBe(ids.length);
    MANUAL_CHAPTERS.forEach((chapter) => expect(chapter.steps.length).toBeGreaterThan(0));
  });

  it("only points at Settings pages that exist", () => {
    const titles = ALL_SETTINGS_ITEMS.map((item) => item.title);
    const mentions = allEntryText.flatMap((line) => Array.from(line.matchAll(/Settings, (XP Pro|[A-Z][a-z]+)/g), (match) => match[1]));
    expect(mentions.length).toBeGreaterThan(10);
    mentions.forEach((page) => expect(titles).toContain(page));
  });

  describe("old wording that went stale", () => {
    it("has no Settings, Backup: backups live in Settings, General", () => {
      expect(allEntryText.filter((line) => line.includes("Settings, Backup"))).toEqual([]);
    });

    it("no longer says late chores cost nothing", () => {
      expect(allEntryText.filter((line) => line.includes("Nothing is taken away"))).toEqual([]);
    });

    it("says Send back and the buttons, not Reject and swiping", () => {
      const approve = MANUAL_CHAPTERS.find((chapter) => chapter.id === "approvals");
      expect(approve?.steps.join(" ")).toMatch(/Send back/);
      expect(approve?.steps.join(" ")).not.toMatch(/\bReject\b/);
      const howTo = entryAbout(/approve a chore/i);
      expect(howTo.answer).toMatch(/Send back/);
      expect(howTo.answer).not.toMatch(/\bReject\b/);
    });

    it("no longer says there is no account to sign in to", () => {
      const data = MANUAL_CHAPTERS.find((chapter) => chapter.id === "data");
      expect(data?.intro).not.toMatch(/no account to sign in/i);
      expect(data?.intro).toMatch(/Town Hall/);
    });
  });

  describe("late chores", () => {
    it("names the three late rules and says they start off", () => {
      const { answer } = entryAbout(/chore is late/i);
      expect(answer).toMatch(/Settings, Chores/);
      expect(answer).toMatch(/Late chores/);
      expect(answer).toMatch(/lock/i);
      expect(answer).toMatch(/penalty/i);
      expect(answer).toMatch(/off until/i);
    });
  });

  describe("backups and restoring", () => {
    it("puts backing up and restoring in Settings, General", () => {
      const data = MANUAL_CHAPTERS.find((chapter) => chapter.id === "data");
      const steps = data?.steps.join(" ") ?? "";
      expect(steps).toMatch(/Settings, General/);
      expect(steps).toMatch(/Back up everything/);
      expect(steps).toMatch(/Restore from backup/);
    });

    it("tells a new device how to restore from the empty profile screen", () => {
      const { answer } = entryAbout(/new device/i);
      expect(answer).toMatch(/Restore a backup/);
      expect(answer).toMatch(/Choose A Profile/);
      expect(answer).toMatch(/Settings, General/);
    });

    it("says where the file goes on a phone", () => {
      const { answer } = entryAbout(/back up/i);
      expect(answer).toMatch(/share sheet/);
    });
  });

  describe("the PIN recovery code", () => {
    it("says it shows until I wrote it down is tapped, and that Settings, Family makes a new one", () => {
      const { answer } = entryAbout(/recovery code/i);
      expect(answer).toMatch(/I wrote it down/);
      expect(answer).toMatch(/Settings, Family/);
      expect(answer).toMatch(/New code/);
    });

    it("matches the getting started step", () => {
      const start = MANUAL_CHAPTERS.find((chapter) => chapter.id === "start");
      const pinStep = start?.steps.find((step) => step.includes("Forgot PIN"));
      expect(pinStep).toMatch(/I wrote it down/);
      expect(pinStep).not.toMatch(/first unlock/);
    });
  });

  describe("Quick Start", () => {
    it("explains the three quests that wait for approval", () => {
      const { answer } = entryAbout(/quick start/i);
      expect(answer).toMatch(/Choose A Profile/);
      expect(answer).toMatch(/three/);
      expect(answer).toMatch(/approval|Approvals/);
    });
  });

  describe("cash out and savings", () => {
    it("says cash out is off until a Game Master turns it on in Settings, Rewards", () => {
      const { answer } = entryAbout(/cash out/i);
      expect(answer).toMatch(/off until/i);
      expect(answer).toMatch(/Settings, Rewards/);
      expect(answer).toMatch(/Approvals/);
    });

    it("explains the weekly savings interest toggle", () => {
      const { answer } = entryAbout(/interest/i);
      expect(answer).toMatch(/Settings, Rewards/);
      expect(answer).toMatch(/week/);
      expect(answer).toMatch(/off/i);
    });
  });

  describe("photo proof and approvals", () => {
    it("explains photo proof and where the picture stays", () => {
      const { answer } = entryAbout(/photo/i);
      expect(answer).toMatch(/Photo proof/);
      expect(answer).toMatch(/Approvals/);
      expect(answer).toMatch(/this device|stays/i);
    });

    it("covers Fulfil and Refund for purchases", () => {
      const approvals = MANUAL_CHAPTERS.find((chapter) => chapter.id === "approvals");
      expect(approvals?.steps.join(" ")).toMatch(/Fulfil/);
      expect(approvals?.steps.join(" ")).toMatch(/Refund/);
    });

    it("explains the approval and chore reminders in Settings, Alerts", () => {
      const { answer } = entryAbout(/remind/i);
      expect(answer).toMatch(/Settings, Alerts/);
      expect(answer).toMatch(/Approval reminders/);
      expect(answer).toMatch(/Chore reminders/);
    });
  });

  describe("quest drafts", () => {
    it("says a new quest is a Draft until Ready is tapped", () => {
      const quests = MANUAL_CHAPTERS.find((chapter) => chapter.id === "quests");
      const steps = quests?.steps.join(" ") ?? "";
      expect(steps).toMatch(/Draft/);
      expect(steps).toMatch(/Ready/);
    });
  });

  describe("packs", () => {
    it("covers saving your own, importing a file and the Town Hall exchange", () => {
      const { answer } = entryAbout(/share .*pack|pack.*share/i);
      expect(answer).toMatch(/Save as a file/);
      expect(answer).toMatch(/Import a pack file/);
      expect(answer).toMatch(/Pack Exchange/);
    });

    it("lists the Town Hall's Packs tab", () => {
      const townHall = MANUAL_CHAPTERS.find((chapter) => chapter.id === "town-hall");
      expect(townHall?.steps.join(" ")).toMatch(/Packs/);
    });
  });

  describe("the family server", () => {
    it("says the road to the city is not open yet, in the hero phones chapter", () => {
      const phones = MANUAL_CHAPTERS.find((chapter) => chapter.id === "phones");
      expect(phones?.steps.join(" ")).toMatch(/isn't open yet/);
    });
  });

  it("keeps each FAQ answer short", () => {
    const tooLong = faqEntries.filter((entry) => sentencesIn(entry.answer) > 5).map((entry) => entry.question);
    expect(tooLong).toEqual([]);
  });
});
