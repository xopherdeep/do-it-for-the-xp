/**
 * The hint under the quest form's due time (#1262): shown only while a hero the quest names would meet nothing but free
 * fights, naming them. The rule itself is covered in questAmbush.spec.ts; this checks the form feeds it and shows it.
 */
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import QuestAmbushHint from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/QuestAmbushHint.vue";

jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/useAchievementForm", () => ({
  __esModule: true,
  AchievementFormInjectionKey: Symbol.for("mock-achievement-form"),
}));

const quest = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  achievementName: `Chore ${id}`,
  type: "individual",
  assignee: ["hero-1"],
  beastId: "beast-dish-goblin",
  dueByTime: "08:00",
  ...overrides,
});

const heroes = [
  { id: "hero-1", name: { first: "Amelia", nick: "Mia" } },
  { id: "hero-2", name: { first: "Sam" } },
];

function mountHint(draft: Record<string, unknown>, saved: Record<string, unknown>[] = []) {
  const achievement = ref(draft);
  const wrapper = mount(QuestAmbushHint, {
    global: {
      provide: {
        [Symbol.for("mock-achievement-form") as unknown as string]: {
          achievement,
          achievements: ref(saved),
          users: ref(heroes),
        },
      },
    },
  });
  return { wrapper, achievement };
}

describe("QuestAmbushHint", () => {
  it("names the hero (nickname first) when a timed quest leaves them with only free fights", () => {
    const { wrapper } = mountHint(quest("new"));

    const hint = wrapper.find("[data-test='ambush-hint']");
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toMatch(/^Mia has no anytime quest with a beast, so their ambushes are free fights \(AP only\)/);
    expect(hint.text()).toContain("Make this one anytime, with a beast, to send them real fights.");
  });

  it("names every hero the quest is shared with", () => {
    const { wrapper } = mountHint(quest("new", { type: "collaborate", assignee: ["hero-1", "hero-2"] }));

    expect(wrapper.text()).toMatch(/^Mia and Sam have no anytime quest/);
  });

  it("is not there when the quest is itself anytime with a beast", () => {
    const { wrapper } = mountHint(quest("new", { dueByTime: "" }));

    expect(wrapper.find("[data-test='ambush-hint']").exists()).toBe(false);
  });

  it("is not there when another saved quest already gives the hero real fights", () => {
    const { wrapper } = mountHint(quest("new"), [quest("old", { dueByTime: "" })]);

    expect(wrapper.find("[data-test='ambush-hint']").exists()).toBe(false);
  });

  it("follows the form: it goes away when the due time is cleared and comes back when one is set", async () => {
    const { wrapper, achievement } = mountHint(quest("new"));
    expect(wrapper.find("[data-test='ambush-hint']").exists()).toBe(true);

    achievement.value = { ...achievement.value, dueByTime: "" };
    await nextTick();
    expect(wrapper.find("[data-test='ambush-hint']").exists()).toBe(false);

    achievement.value = { ...achievement.value, dueByTime: "17:30" };
    await nextTick();
    expect(wrapper.find("[data-test='ambush-hint']").exists()).toBe(true);
  });

  it("is not there for an Open Bounty, or before any hero is picked", () => {
    expect(mountHint(quest("new", { type: "asNeeded", assignee: [] })).wrapper.find("[data-test='ambush-hint']").exists()).toBe(false);
    expect(mountHint(quest("new", { assignee: [] })).wrapper.find("[data-test='ambush-hint']").exists()).toBe(false);
  });
});
