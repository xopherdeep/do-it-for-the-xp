import { flushPromises, shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/types/abilities";
import { useUserStore } from "@/lib/store/stores/user";
import MyAbilities from "../MyAbilities.vue";

/**
 * The Powers page around a cast: whatever happens after the MP is paid, the hero hears about it. Everything the
 * page leans on is faked; the cast itself (boardCast) is whatever the spec says it is.
 */

const mockToast = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  onIonViewWillEnter: jest.fn(),
  toastController: { create: (options: unknown) => mockToast(options) },
}));

const mockCastWithBoardEffect = jest.fn();
jest.mock("../boardCast", () => ({
  castWithBoardEffect: (...args: unknown[]) => mockCastWithBoardEffect(...args),
}));

const mockPlay = jest.fn();
jest.mock("@/assets/fx", () => ({ play$fx: (key: string) => mockPlay(key) }));

const mockDebugError = jest.fn();
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), info: jest.fn(), error: (...args: unknown[]) => mockDebugError(...args) },
}));

const mockGetForHero = jest.fn();
jest.mock("@/lib/databases/CastLogDb", () => ({
  getCastLogDb: () => ({ getForHero: (id: string) => mockGetForHero(id) }),
  lastCastsOf: () => ({}),
}));

jest.mock("@/hooks/quests/useQuestPicker", () => ({
  useQuestPicker: () => ({ openQuests: jest.fn(), selectQuest: jest.fn() }),
}));

const mockPower = {
  id: "power-1",
  name: "Snooze",
  description: "Move one quest to tomorrow.",
  type: AbilityType.RealLife,
  frequency: "weekly",
  mpCost: 10,
  apRequirement: { amount: 0, period: "weekly" },
  prerequisites: [],
  icon: "alarm-snooze",
  isPreset: true,
  position: { x: 0, y: 0 },
} as unknown as Ability;

jest.mock("@/hooks/abilities/useAbilitySystem", () => {
  const { ref } = jest.requireActual("vue");
  return {
    useAbilitySystem: () => ({
      abilities: ref([mockPower]),
      isLoading: ref(false),
      isReady: ref(true),
      triggerAbility: jest.fn(),
      refresh: jest.fn(),
    }),
  };
});

const HERO = "hero-1";

// The app shell components main.ts registers globally: stand-ins here, the cast is all this spec reads
const Stub = defineComponent({ render: () => h("span") });
const SHELL = Object.fromEntries(
  ["xp-app-header", "xp-app-section", "xp-app-row", "xp-app-chip", "xp-app-empty", "xp-back-button"].map((name) => [name, Stub])
);

const mountPage = () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().users[HERO] = {
    id: HERO,
    name: { nick: "Hero" },
    stats: { level: 1, hp: { now: 50, max: 50 }, mp: { now: 40, max: 40 }, gp: { wallet: 0, debt: 0 } },
  };
  return shallowMount(MyAbilities, { props: { userId: HERO }, global: { plugins: [pinia], components: SHELL } });
};

beforeEach(() => {
  mockToast.mockReset();
  mockToast.mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined) });
  mockCastWithBoardEffect.mockReset();
  mockPlay.mockReset();
  mockDebugError.mockReset();
  mockGetForHero.mockReset();
  mockGetForHero.mockResolvedValue([]);
});

describe("casting on the Powers page", () => {
  it("says something went wrong when the cast fails after it was paid, and reads the casts again", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const readsBefore = mockGetForHero.mock.calls.length;
    const failure = new Error("the board could not be saved");
    mockCastWithBoardEffect.mockRejectedValue(failure);

    await (wrapper.vm as unknown as { cast(id: string): Promise<void> }).cast(mockPower.id);

    expect(mockDebugError).toHaveBeenCalledWith(expect.any(String), failure);
    expect(mockPlay).toHaveBeenCalledWith("no");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Something went wrong. Your Power may still have been cast.",
        cssClass: "rpg-toast",
        position: "top",
      })
    );
    expect(mockGetForHero.mock.calls.length).toBe(readsBefore + 1);
    // The Cast button is free again
    expect((wrapper.vm as unknown as { casting: string }).casting).toBe("");
  });
});
