import { defineComponent, h, reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import XpFamilyPhones from "@/app/SideMenu/XpSettings/components/XpFamilyPhones.vue";
import { modalController } from "@ionic/vue";
import { FAMILY_ROAD_CLOSED_LINE } from "@/lib/services/townhall/townHallPrompts";

const mockPush = jest.fn();
jest.mock("vue-router", () => ({ ...jest.requireActual("vue-router"), useRouter: () => ({ push: mockPush }) }));

jest.mock("@ionic/vue", () => ({ ...jest.requireActual("@ionic/vue"), modalController: { create: jest.fn() } }));
jest.mock("@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue", () => ({ __esModule: true, default: { name: "AddProfile", render: () => null } }));
jest.mock("@/app/SideMenu/XpSettings/components/XpHeroPhonesModal.vue", () => ({ __esModule: true, default: { name: "XpHeroPhonesModal", render: () => null } }));

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
        ? h(
            "div",
            {
              "data-cy": "prompt",
              "data-speaker": props.prompt.options.speaker,
              "data-accent": props.prompt.options.accent,
              "data-sprite": props.prompt.options.sprite,
            },
            [
              h("p", { "data-cy": "prompt-lines" }, props.prompt.options.lines.join(" ")),
              ...props.prompt.options.choices.map((choice: { id: string; label: string }) =>
                h("button", { "data-cy": `prompt-${choice.id}`, onClick: () => emit("respond", { id: choice.id, amount: null }) }, choice.label)
              ),
            ]
          )
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
      expect(cy(await open(), "family-phones-connect").exists()).toBe(true);
    });
  });

  describe("the heroes", () => {
    it("two hero rows rendered when two heroes exist", async () => {
      fill(kid(), kidTwo());
      const wrapper = await open();
      expect(rows(wrapper)).toHaveLength(2);
      expect(rowOf(wrapper, "h-1").text()).toContain("Mia");
      expect(rowOf(wrapper, "h-2").text()).toContain("Bo");
    });

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

    it("hero with no nickname shows the needs-nickname line and no Phones button", async () => {
      fill(kid(), nameless());
      const wrapper = await open();
      const row = rowOf(wrapper, "h-3");
      expect(row.find('[data-cy="family-needs-nickname"]').text()).toBe("Cy needs a nickname first. Friends will see it, so not their full name.");
      expect(row.find('[data-cy="family-edit"]').exists()).toBe(true);
      expect(row.find('[data-cy="family-phones-open"]').exists()).toBe(false);
      expect(rowOf(wrapper, "h-1").find('[data-cy="family-needs-nickname"]').exists()).toBe(false);
      expect(rowOf(wrapper, "h-1").find('[data-cy="family-phones-open"]').exists()).toBe(true);
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
    it("age picker shows for a kid without birthday, and not for a Game Master", async () => {
      const wrapper = await open();
      expect(rowOf(wrapper, "h-1").find(".fp-ages").exists()).toBe(true);
      expect(rowOf(wrapper, "h-1").find('[data-cy="age-h-1-teen"]').exists()).toBe(true);
      expect(rowOf(wrapper, "h-2").find(".fp-ages").exists()).toBe(true);
      expect(rowOf(wrapper, "h-2").find('[data-cy="age-h-2-teen"]').exists()).toBe(true);
      expect(rowOf(wrapper, "gm-1").find(".fp-ages").exists()).toBe(false);
      expect(rowOf(wrapper, "gm-1").find('[data-cy="age-gm-1-teen"]').exists()).toBe(false);
    });

    it("does not ask for a kid whose birthday says it", async () => {
      fill(kid({ birthday: `${new Date().getFullYear() - 8}-01-01` }));
      const wrapper = await open();
      expect(wrapper.find('[data-cy="age-h-1-teen"]').exists()).toBe(false);
      expect(wrapper.find(".fp-ages").exists()).toBe(false);
    });

    it("picking an age group (e.g. 'teen') calls family.setAgeGroup(heroId, 'teen')", async () => {
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
    it("opens the Link a phone modal", async () => {
      const modal = { present: jest.fn(), onDidDismiss: jest.fn() };
      (modalController.create as jest.Mock).mockResolvedValue(modal);
      const wrapper = await open();
      expect((cy(wrapper, "family-phones-open").element as HTMLElement & { disabled?: boolean }).disabled).toBe(false);
      await cy(wrapper, "family-phones-open").trigger("click");
      await flushPromises();
      expect(modalController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          componentProps: { heroId: "h-1", nickname: "Mia" },
        })
      );
      expect(modal.present).toHaveBeenCalled();
    });
  });

  describe("banners", () => {
    it("says nothing when all is well", async () => {
      expect(cy(await open(), "family-banner").exists()).toBe(false);
    });

    it("home: 'home-elsewhere' banner with Make this home button (homeQuestionPrompt, then makeHome())", async () => {
      mockFamily.home = "home-elsewhere";
      const wrapper = await open();
      const banner = cy(wrapper, "family-banner");
      expect(banner.exists()).toBe(true);
      expect(banner.find("ion-label").text()).toBe("This family's home is another device. Make this one home?");
      const button = cy(wrapper, "family-make-home");
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe("Make this home");

      await button.trigger("click");
      await flushPromises();

      const promptEl = cy(wrapper, "prompt");
      expect(promptEl.exists()).toBe(true);
      expect(promptEl.attributes("data-speaker")).toBe("Town Clerk");
      expect(promptEl.attributes("data-accent")).toBe("townHall");
      expect(promptEl.attributes("data-sprite")).toBe("tablet");
      expect(cy(wrapper, "prompt-lines").text()).toBe("This family's home is another device. Make this one home?");
      expect(cy(wrapper, "prompt-yes").text()).toBe("Make it home");
      expect(cy(wrapper, "prompt-no").text()).toBe("Not now");

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

    describe("when the family server cannot be reached", () => {
      const COURIER_LINE = "The courier hasn't arrived. I'll keep trying.";

      it.each(["offline", "server"])("problem '%s': the courier line, then that the family's road to the city is not open yet", async (problem) => {
        mockFamily.problem = problem;
        const wrapper = await open();
        const banners = wrapper.findAll('[data-cy="family-banner"]');
        expect(banners).toHaveLength(1);
        expect(banners[0].find("ion-label").text()).toBe(`${COURIER_LINE} ${FAMILY_ROAD_CLOSED_LINE}`);
        expect(banners[0].find("ion-label").text()).toContain("nothing will reach a second phone");
        expect(cy(wrapper, "family-make-home").exists()).toBe(false);
        expect(cy(wrapper, "family-register").exists()).toBe(false);
      });

      it("still lets the Game Master open Phones, where Link a phone says the same", async () => {
        mockFamily.problem = "offline";
        const wrapper = await open();
        expect(cy(wrapper, "family-phones-open").exists()).toBe(true);
      });

      it("says nothing about the road when the site refused for a reason of its own", async () => {
        mockFamily.problem = "taken";
        const wrapper = await open();
        expect(cy(wrapper, "family-banner").find("ion-label").text()).toBe("This family is registered to another account.");
        expect(wrapper.text()).not.toContain("road to the city");
      });

      it("says nothing about the road when all is well", async () => {
        const wrapper = await open();
        expect(wrapper.text()).not.toContain("road to the city");
      });
    });

    describe("other-family, taken, not-member banners with their respective clerk lines", () => {
      it("shows other-family banner with clerk line", async () => {
        mockFamily.home = "other-family";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe(
          "This account already runs another family. Bring it here with a backup file, or link this phone as a hero's phone with a code from the family's device."
        );
        expect(cy(wrapper, "family-make-home").exists()).toBe(false);
      });

      it("shows other-family banner when problem is other-family", async () => {
        mockFamily.problem = "other-family";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe(
          "This account already runs another family. Bring it here with a backup file, or link this phone as a hero's phone with a code from the family's device."
        );
      });

      it("shows taken banner with clerk line", async () => {
        mockFamily.problem = "taken";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe("This family is registered to another account.");
        expect(cy(wrapper, "family-make-home").exists()).toBe(false);
      });

      it("shows taken banner when home status is taken", async () => {
        mockFamily.home = "taken";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe("This family is registered to another account.");
      });

      it("shows not-member banner with clerk line and link to Town Hall registration", async () => {
        mockFamily.problem = "not-member";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe(
          "The site doesn't know your family yet. Register the family with me first."
        );
        const registerButton = cy(wrapper, "family-register");
        expect(registerButton.exists()).toBe(true);
        expect(registerButton.text()).toBe("Go to the Town Hall");
        await registerButton.trigger("click");
        expect(mockPush).toHaveBeenCalledWith({ name: "town-hall", params: { userId: "gm-1" } });
      });

      it("shows not-member banner when home status is not-member", async () => {
        mockFamily.home = "not-member";
        const wrapper = await open();
        const banner = cy(wrapper, "family-banner");
        expect(banner.exists()).toBe(true);
        expect(banner.find("ion-label").text()).toBe(
          "The site doesn't know your family yet. Register the family with me first."
        );
      });
    });
  });
});
