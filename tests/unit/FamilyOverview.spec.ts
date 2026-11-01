import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FamilyOverview from "@/app/SideMenu/FamilyOverview/FamilyOverview.vue";

const mockUsers: Record<string, any> = {
  "hero-1": {
    id: "hero-1",
    name: { nick: "Lucas" },
    isAdult: false,
    stats: { level: 2, hp: { now: 20, max: 20 }, mp: { now: 5, max: 5 }, gp: { wallet: 50, bank: 0 } },
  },
};

const mockLoadUsers = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/store/stores/user", () => ({
  __esModule: true,
  useUserStore: () => ({
    currentUser: { id: "hero-1" },
    users: mockUsers,
    loadUsers: mockLoadUsers,
    loginUser: jest.fn(),
  }),
}));

jest.mock("@/lib/databases/QuestLogDb", () => ({
  __esModule: true,
  getQuestLogDb: () => ({
    getEntries: jest.fn().mockResolvedValue([]),
    getPending: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getQuestBoardForUser: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("vue-router", () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn() }),
  useRoute: () => ({ query: { from: "/xp-profile" } }),
}));

describe("FamilyOverview.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it("loads family overview and displays segment tabs and member cards", async () => {
    const wrapper = mount(FamilyOverview, {
      global: {
        stubs: {
          "xp-rpg-page": {
            template: "<div><slot name='actions'/><slot /></div>",
          },
          "family-summary-banner": {
            template: "<div class='mock-banner'/>",
          },
          "family-member-card": {
            template: "<div class='mock-member-card' />",
          },
          "family-today-chores": {
            template: "<div class='mock-today-chores' />",
          },
        },
      },
    });

    await flushPromises();

    expect(mockLoadUsers).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Party Roster");
    expect(wrapper.text()).toContain("Today's Quests");
    expect(wrapper.findAll(".mock-member-card").length).toBe(1);

    // Switch tab to chores
    const vm = wrapper.vm as unknown as { activeTab: string };
    vm.activeTab = "chores";
    await flushPromises();

    expect(wrapper.find(".mock-today-chores").exists()).toBe(true);
  });
});
