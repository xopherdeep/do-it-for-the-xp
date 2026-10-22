import { reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import SwitchProfile from "@/app/SideMenu/SwitchProfile/SwitchProfile.vue";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("vue-router", () => ({ ...jest.requireActual("vue-router"), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  useIonRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
  onIonViewWillEnter: jest.fn(),
  onIonViewDidLeave: jest.fn(),
  modalController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));

// The screens opened from the picker are not under test
jest.mock("@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue", () => ({ __esModule: true, default: { name: "AddProfile", render: () => null } }));
jest.mock("@/app/SideMenu/SwitchProfile/QuickStart/QuickStart.vue", () => ({ __esModule: true, default: { name: "QuickStart", render: () => null } }));
jest.mock("@/app/SideMenu/SwitchProfile/DialPad.vue", () => ({ __esModule: true, default: { name: "DialPad", render: () => null } }));
jest.mock("@/components/templates/modals/ProfileLoadingModal.vue", () => ({ __esModule: true, default: { name: "ProfileLoadingModal", render: () => null } }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {} }));
jest.mock("@/lib/databases", () => ({
  __esModule: true,
  ProfileDb: class {
    init = jest.fn();
    getProfiles = jest.fn().mockResolvedValue([]);
    restoreProfiles = jest.fn();
  },
}));
jest.mock("@/hooks/useBackupRestore", () => ({
  __esModule: true,
  useBackupRestore: () => ({ isBackupBusy: false, selectRestoreFile: jest.fn() }),
}));
jest.mock("@/hooks/useHeroTurn", () => ({
  __esModule: true,
  useTurnGate: () => ({ prompt: { value: null }, respond: jest.fn(), requestTurn: jest.fn().mockResolvedValue(true) }),
}));

const mockFamily = reactive({
  enabled: true,
  isKidMode: false,
  device: null as { heroId: string; label: string; card: { nickname: string } | null } | null,
});
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

const mockUsers = reactive<Record<string, any>>({});
const mockUserStore = reactive({
  users: mockUsers,
  currentUser: { id: null },
  get usersAz() {
    return Object.values(mockUsers);
  },
  loadUsers: jest.fn(),
  loginUser: jest.fn(),
});
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUserStore }));

const hero = (id: string, nick: string, isAdult = false) => ({ id, name: { nick, full: `${nick} Pollard`, first: nick }, isAdult, stats: { level: 3, gp: { wallet: 5 } } });

const fill = (...profiles: ReturnType<typeof hero>[]) => {
  Object.keys(mockUsers).forEach((id) => delete mockUsers[id]);
  profiles.forEach((profile) => {
    mockUsers[profile.id] = profile;
  });
};

const kidPhoneOf = (heroId: string, nickname: string) => {
  mockFamily.isKidMode = true;
  mockFamily.device = { heroId, label: `${nickname}'s phone`, card: { nickname } };
};

const open = async () => {
  const wrapper = mount(SwitchProfile, {
    global: {
      stubs: {
        XpRpgPage: { template: "<div class='rpg-page-stub'><slot name='start-actions' /><slot /></div>" },
        XpProfileCard: { props: ["user"], template: "<div class='profile-card-stub'>{{ user.name.nick }}</div>" },
        XpRevealPrompt: true,
        XpGp: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};
type Opened = Awaited<ReturnType<typeof open>>;

const cy = (wrapper: Opened, name: string) => wrapper.find(`[data-cy="${name}"]`);
const cardsOf = (wrapper: Opened): string[] => wrapper.findAll(".profile-card-stub").map((card) => card.text());

describe("the profile picker (File Select)", () => {
  beforeEach(() => {
    mockFamily.enabled = true;
    mockFamily.isKidMode = false;
    mockFamily.device = null;
    mockUserStore.loadUsers.mockReset();
    fill(hero("h-1", "Mia"), hero("h-2", "Bo"), hero("gm-1", "Mom", true));
  });

  describe("on a kid phone", () => {
    beforeEach(() => kidPhoneOf("h-1", "Mia"));

    it("the picker in kid mode shows the one hero and no restore door", async () => {
      const wrapper = await open();

      expect(cardsOf(wrapper)).toEqual(["Mia"]);
      expect(wrapper.text()).not.toContain("Bo");
      expect(wrapper.text()).not.toContain("Mom");
      expect(cy(wrapper, "restore-backup-slot").exists()).toBe(false);
      expect(cy(wrapper, "link-phone-slot").exists()).toBe(false);
      expect(cy(wrapper, "quick-start-slot").exists()).toBe(false);
    });

    it("says whose phone it is", async () => {
      const wrapper = await open();

      expect(cy(wrapper, "kid-phone-line").text()).toBe("This is Mia's phone");
    });

    it("offers no way to add another hero", async () => {
      const wrapper = await open();

      expect(wrapper.find(".fab-pulse").exists()).toBe(false);
      expect(wrapper.text()).not.toMatch(/New Profile|Start New Game/);
    });

    it("keeps the doors shut, and still names the phone, while the hero has not arrived", async () => {
      fill();
      const wrapper = await open();

      expect(cy(wrapper, "kid-phone-line").text()).toBe("This is Mia's phone");
      expect(cy(wrapper, "restore-backup-slot").exists()).toBe(false);
      expect(cy(wrapper, "link-phone-slot").exists()).toBe(false);
      expect(wrapper.text()).not.toContain("No Adventurers Yet");
    });
  });

  describe("on a family device", () => {
    it("lists every profile and says nothing about a phone", async () => {
      const wrapper = await open();

      expect(cardsOf(wrapper)).toEqual(["Mia", "Bo", "Mom"]);
      expect(cy(wrapper, "kid-phone-line").exists()).toBe(false);
      expect(wrapper.find(".fab-pulse").exists()).toBe(true);
    });

    it("keeps the restore door on an empty device", async () => {
      fill();
      const wrapper = await open();

      expect(cy(wrapper, "restore-backup-slot").exists()).toBe(true);
      expect(cy(wrapper, "link-phone-slot").exists()).toBe(true);
    });
  });
});
