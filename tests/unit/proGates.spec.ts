import { mount } from "@vue/test-utils";
import { ref } from "vue";
import AchievementScheduleTab from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/AchievementScheduleTab.vue";

const mockPro = { isPro: false, requirePro: jest.fn(async () => false) };
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/useAchievementForm", () => ({
  __esModule: true,
  AchievementFormInjectionKey: Symbol.for("mock-achievement-form"),
}));
jest.mock("@/assets/fx", () => ({ __esModule: true, default: {}, play$fx: jest.fn() }));

jest.mock("@ionic/vue", () => {
  const stub = (name: string) => ({ name, template: "<div class='ion-stub'><slot /></div>" });
  return {
    __esModule: true,
    IonCheckbox: stub("IonCheckbox"),
    IonSelect: stub("IonSelect"),
    IonSelectOption: stub("IonSelectOption"),
    IonButton: { name: "IonButton", template: "<button class='ion-button'><slot /></button>" },
  };
});

function mountTab(schedule: Record<string, unknown>) {
  const achievement = ref({ basicSchedule: "daily", scheduleType: "basic", customFrequency: 1, timesOfDay: [], ...schedule });
  const generateScheduleWithAI = jest.fn();
  const wrapper = mount(AchievementScheduleTab, {
    global: {
      provide: {
        [Symbol.for("mock-achievement-form") as unknown as string]: {
          achievement,
          startsModalOpen: ref(false),
          endsModalOpen: ref(false),
          dueModalOpen: ref(false),
          generateScheduleWithAI,
          isGeneratingSchedule: ref(false),
        },
      },
      stubs: { XpGlassCard: { template: "<div class='glass' @click=\"$emit('click')\"><slot /></div>" } },
    },
  });
  return { wrapper, achievement, generateScheduleWithAI };
}

const cardFor = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll(".frequency-card__name").find((n) => n.text().toLowerCase().includes(label))!.element.parentElement!;

describe("advanced schedule gate (not Pro)", () => {
  beforeEach(() => {
    mockPro.isPro = false;
    mockPro.requirePro.mockClear();
    mockPro.requirePro.mockResolvedValue(false);
  });

  it("choosing custom opens the upsell and keeps the old schedule", async () => {
    const { wrapper, achievement } = mountTab({ basicSchedule: "weekly" });
    cardFor(wrapper, "custom").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockPro.requirePro).toHaveBeenCalledWith("advancedSchedule");
    expect(achievement.value.basicSchedule).toBe("weekly");
  });

  it("daily and weekly can still be chosen", async () => {
    const { wrapper, achievement } = mountTab({ basicSchedule: "once" });
    cardFor(wrapper, "daily").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(achievement.value.basicSchedule).toBe("daily");
    cardFor(wrapper, "weekly").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(achievement.value.basicSchedule).toBe("weekly");
    expect(mockPro.requirePro).not.toHaveBeenCalled();
  });

  it("a saved quest with times of day keeps them when opened without Pro", async () => {
    const { wrapper, achievement } = mountTab({ timesOfDay: ["morning", "night"] });
    expect(wrapper.findAll(".time-chip.is-on")).toHaveLength(2);
    await wrapper.findAll(".time-chip")[1].trigger("click"); // tapping a chip is Pro: the upsell, no change
    expect(mockPro.requirePro).toHaveBeenCalledWith("advancedSchedule");
    expect(achievement.value.timesOfDay).toEqual(["morning", "night"]);
  });

  it("times per day above 1 opens the upsell and keeps the old value", async () => {
    const { wrapper, achievement } = mountTab({ basicSchedule: "daily", customFrequency: 1 });
    const input = wrapper.find('[data-cy="times-per-day"]');
    (input.element as HTMLInputElement).value = "3";
    await input.trigger("input");
    expect(mockPro.requirePro).toHaveBeenCalledWith("advancedSchedule");
    expect(achievement.value.customFrequency).toBe(1);
  });

  it("the Oracle (AI) button asks for Pro and does not call the AI", async () => {
    const { wrapper, generateScheduleWithAI } = mountTab({});
    await wrapper.find(".ai-oracle-btn").trigger("click");
    expect(mockPro.requirePro).toHaveBeenCalledWith("aiHelpers");
    expect(generateScheduleWithAI).not.toHaveBeenCalled();
  });
});

describe("advanced schedule gate (Pro)", () => {
  it("lets Pro change chips and call the Oracle", async () => {
    mockPro.isPro = true;
    mockPro.requirePro.mockClear();
    mockPro.requirePro.mockResolvedValue(true);
    const { wrapper, achievement, generateScheduleWithAI } = mountTab({});
    await wrapper.findAll(".time-chip")[0].trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(achievement.value.timesOfDay).toEqual(["morning"]);
    await wrapper.find(".ai-oracle-btn").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(generateScheduleWithAI).toHaveBeenCalled();
  });
});
