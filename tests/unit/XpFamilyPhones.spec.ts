import { defineComponent, h, reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import XpFamilyPhones from "@/app/SideMenu/XpSettings/components/XpFamilyPhones.vue";
import { modalController } from "@ionic/vue";

const mockPush = jest.fn();
jest.mock("vue-router", () => ({ ...jest.requireActual("vue-router"), useRouter: () => ({ push: mockPush }) }));

jest.mock("@ionic/vue", () => ({ ...jest.requireActual("@ionic/vue"), modalController: { create: jest.fn() } }));
jest.mock("@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue", () => ({ __esModule: true, default: { name: "AddProfile", render: () => null } }));

const mockFamily = reactive({
  enabled: true,
  parentAuth: { kind: "basic" } as Record<string, unknown> | null,
  home: "home",
  problem: null as string | null,
  ageGroupPicks: {} as Record<string, string>,
  setAgeGroup: jest.fn(),
  makeHome: jest.fn(),
  registerHeroes: jest.fn(),
});
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

const mockUsers = reactive<Record<string, any>>({});
const mockUserStore = reactive({
  users: mockUsers,
  currentUser: { id: "gm-1" },
  get usersAz() {
    return Object.values(mockUsers);
  },
  loadUsers: jest.fn(),
});
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUserStore }));

/** The clerk's dialog, reduced to its lines and one button per choice */
const PromptStub = defineComponent({
  props: ["prompt"],
  emits: ["respond"],
  setup(props, { emit }) {
    return () =>
      props.prompt
        ? h("div", { "data-cy": "prompt" }, [
            h("p", { "data-cy": "prompt-lines" }, props.prompt.options.lines.join(" ")),
            ...props.prompt.options.choices.map((choice: { id: string; label: string }) =>
              h("button", { "data-cy": `prompt-${choice.id}`, onClick: () => emit("respond", { id: choice.id, amount: null }) }, choice.label)
            ),
          ])
        : null;
  },
});

const kid = (over: Record<string, unknown> = {}) => ({ id: "h-1", name: { nick: "Mia", full: "Mia Pollard", first: "Mia" }, isAdult: false, ...over });
const kidTwo = (over: Record<string, unknown> = {}) => ({ id: "h-2", name: { nick: "Bo", full: "Bo Pollard", first: "Bo" }, isAdult: false, ...over });
const mom = () => ({ id: "gm-1", name: { nick: "Mom", full: "Mom Pollard", first: "Mom" }, isAdult: true });
const nameless = () => ({ id: "h-3", name: { nick: "", full: "Cy Pollard", first: "Cy" }, isAdult: false });

const fill = (...profiles: any[]) => {
  Object.keys(mockUsers).forEach((id) => delete mockUsers[id]);
  profiles.forEach((profile) => {
    mockUsers[profile.id] = profile;
  });
};

const open = async () => {
  const wrapper = mount(XpFamilyPhones, { global: { stubs: { XpRevealPrompt: PromptStub } } });
  await flushPromises();
  return wrapper;
};
type Opened = Awaited<ReturnType<typeof open>>;

const cy = (wrapper: Opened, name: string) => wrapper.find(`[data-cy="${name}"]`);
const rows = (wrapper: Opened) => wrapper.findAll('[data-cy="family-hero"]');
const rowOf = (wrapper: Opened, id: string) => wrapper.find(`[data-hero="${id}"]`);

describe("XpFamilyPhones", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFamily.enabled = true;
    mockFamily.parentAuth = { kind: "basic" };
    mockFamily.home = "home";
    mockFamily.problem = null;
    mockFamily.ageGroupPicks = {};
    mockFamily.setAgeGroup.mockResolvedValue(undefined);
    mockFamily.makeHome.mockResolvedValue(undefined);
    mockFamily.registerHeroes.mockResolvedValue(undefined);
    mockUserStore.loadUsers.mockResolvedValue(undefined);
    fill(kid(), kidTwo(), mom());
  });

  describe("who sees the card", () => {
    it("shows it for a linked family with the flag on", async () => {
      expect(cy(await open(), "family-phones").exists()).toBe(true);
    });

    it("shows nothing with the flag off", async () => {
      mockFamily.enabled = false;
      expect(cy(await open(), "family-phones").exists()).toBe(false);
    });

    it("shows nothing while the family is not linked", async () => {
      mockFamily.parentAuth = null;
      expect(cy(await open(), "family-phones").exists()).toBe(false);
    });
  });

  describe("the heroes", () => {
    it("has a row for each hero, Game Masters included, under their nickname", async () => {
      const wrapper = await open();
      expect(rows(wrapper)).toHaveLength(3);
      expect(rowOf(wrapper, "h-1").text()).toContain("Mia");
      expect(rowOf(wrapper, "h-2").text()).toContain("Bo");
      expect(rowOf(wrapper, "gm-1").text()).toContain("Mom");
    });

    it("a hero with a nickname has a Phones button", async () => {
      const wrapper = await open();
      expect(rowOf(wrapper, "h-1").find('[data-cy="family-phones-open"]').exists()).toBe(true);
    });

    it("a hero without a nickname gets the clerk's line and an Edit button, and no Phones button", async () => {
      fill(kid(), nameless());
      const wrapper = await open();
      const row = rowOf(wrapper, "h-3");
      expect(row.find('[data-cy="family-needs-nickname"]').text()).toBe("Cy needs a nickname first. Friends will see it, so not their full name.");
      expect(row.find('[data-cy="family-edit"]').exists()).toBe(true);
      expect(row.find('[data-cy="family-phones-open"]').exists()).toBe(false);
      expect(rowOf(wrapper, "h-1").find('[data-cy="family-needs-nickname"]').exists()).toBe(false);
    });

    it("Edit opens the profile form for that hero, and the site hears of the new nickname after it closes", async () => {
      fill(nameless());
      let closed!: () => void;
      const modal = { present: jest.fn(), onDidDismiss: () => new Promise<void>((resolve) => (closed = resolve)) };
      (modalController.create as jest.Mock).mockResolvedValue(modal);
      const wrapper = await open();
      await cy(wrapper, "family-edit").trigger("click");
      await flushPromises();
      expect(modalController.create).toHaveBeenCalledWith(expect.objectContaining({ cssClass: "fullscreen", componentProps: { profile: mockUsers["h-3"] } }));
      expect(modal.present).toHaveBeenCalled();
      expect(mockFamily.registerHeroes).not.toHaveBeenCalled();
      closed();
      await flushPromises();
      expect(mockUserStore.loadUsers).toHaveBeenCalled();
      expect(mockFamily.registerHeroes).toHaveBeenCalled();
    });
  });

  describe("age groups", () => {
    it("asks for a kid with no birthday, not for a Game Master", async () => {
      const wrapper = await open();
      expect(rowOf(wrapper, "h-2").find('[data-cy="age-h-2-teen"]').exists()).toBe(true);
      expect(rowOf(wrapper, "gm-1").find('[data-cy="age-gm-1-teen"]').exists()).toBe(false);
    });

    it("does not ask for a kid whose birthday says it", async () => {
      fill(kid({ birthday: `${new Date().getFullYear() - 8}-01-01` }));
      const wrapper = await open();
      expect(wrapper.find('[data-cy="age-h-1-teen"]').exists()).toBe(false);
    });

    it("picking teen calls setAgeGroup", async () => {
      const wrapper = await open();
      await cy(wrapper, "age-h-2-teen").trigger("click");
      expect(mockFamily.setAgeGroup).toHaveBeenCalledWith("h-2", "teen");
    });

    it("shows the child group until the Game Master picks, then the pick", async () => {
      const wrapper = await open();
      expect(cy(wrapper, "age-h-2-child").attributes("aria-pressed")).toBe("true");
      expect(cy(wrapper, "age-h-2-teen").attributes("aria-pressed")).toBe("false");
      mockFamily.ageGroupPicks = { "h-2": "teen" };
      await flushPromises();
      expect(cy(wrapper, "age-h-2-teen").attributes("aria-pressed")).toBe("true");
      expect(cy(wrapper, "age-h-2-child").attributes("aria-pressed")).toBe("false");
    });
  });

  describe("the Phones button", () => {
    it("waits for the Link a phone modal", async () => {
      const wrapper = await open();
      expect((cy(wrapper, "family-phones-open").element as HTMLElement & { disabled?: boolean }).disabled).toBe(true);
    });
  });

  describe("banners", () => {
    it("says nothing when all is well", async () => {
      expect(cy(await open(), "family-banner").exists()).toBe(false);
    });

    it("home elsewhere: the banner, and Yes to the clerk's question makes this device home", async () => {
      mockFamily.home = "home-elsewhere";
      const wrapper = await open();
      expect(cy(wrapper, "family-banner").text()).toContain("This family's home is another device.");
      await cy(wrapper, "family-make-home").trigger("click");
      await flushPromises();
      expect(cy(wrapper, "prompt-lines").text()).toBe("This family's home is another device. Make this one home?");
      await cy(wrapper, "prompt-yes").trigger("click");
      await flushPromises();
      expect(mockFamily.makeHome).toHaveBeenCalledTimes(1);
    });

    it("home elsewhere: No leaves home where it is", async () => {
      mockFamily.home = "home-elsewhere";
      const wrapper = await open();
      await cy(wrapper, "family-make-home").trigger("click");
      await flushPromises();
      await cy(wrapper, "prompt-no").trigger("click");
      await flushPromises();
      expect(mockFamily.makeHome).not.toHaveBeenCalled();
    });

    it("another family on this account", async () => {
      mockFamily.home = "other-family";
      const wrapper = await open();
      expect(cy(wrapper, "family-banner").text()).toContain("This account already runs another family.");
      expect(cy(wrapper, "family-make-home").exists()).toBe(false);
    });

    it("a family that belongs to another account", async () => {
      mockFamily.problem = "taken";
      expect(cy(await open(), "family-banner").text()).toContain("This family is registered to another account.");
    });

    it("an account the site does not know yet: the line and a way to the Town Hall's registration", async () => {
      mockFamily.problem = "not-member";
      const wrapper = await open();
      expect(cy(wrapper, "family-banner").text()).toContain("The site doesn't know your family yet.");
      await cy(wrapper, "family-register").trigger("click");
      expect(mockPush).toHaveBeenCalledWith({ name: "town-hall", params: { userId: "gm-1" } });
    });

    it("no connection: the courier line", async () => {
      mockFamily.problem = "offline";
      expect(cy(await open(), "family-banner").text()).toContain("The courier hasn't arrived.");
    });
  });
});
