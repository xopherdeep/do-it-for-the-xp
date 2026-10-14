import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import MyCalendar from "../MyCalendar.vue";
import { useUserStore } from "@/lib/store/stores/user";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppEmpty from "@/components/organisms/XpApp/XpAppEmpty.vue";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";

/**
 * The Calendar as a phone app on the XpApp kit: the day's quests as agenda rows grouped by time of day, the status
 * chips, the "N due" meta, the search field and the day navigation in the strip above the dock, and the beast card a
 * tap opens. The quest engine is a fake that serves a fixed board; the skin comes from the real game store.
 */

let mockBoard: QuestBoardItem[] = [];
const mockGetBoard = jest.fn(async () => mockBoard);
const mockPush = jest.fn();
const mockSheetCreate = jest.fn();

jest.mock("vue-router", () => ({ useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }) }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  actionSheetController: { create: (...args: unknown[]) => mockSheetCreate(...args) },
}));

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  ...jest.requireActual("@/lib/engine/quests/QuestEngine"),
  getQuestEngine: () => ({
    filterQuests: (quests: unknown[]) => quests,
    getQuestBoardForUser: (...args: unknown[]) => mockGetBoard(...(args as [])),
  }),
}));
jest.mock("@/app/Console/MyPortal/UserHud/MyQuests/components/XpBeastCardModal.vue", () => ({
  __esModule: true,
  default: {
    name: "XpBeastCardModal",
    props: ["quest", "status", "due", "dueLabel", "userId"],
    emits: ["didDismiss"],
    render() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("vue").h("div", { class: "beast-card-stub", "data-status": (this as any).status });
    },
  },
}));

jest.mock("@/app/Console/MyPortal/UserHud/MyQuests/components/XpQuestWizardModal.vue", () => ({
  __esModule: true,
  default: {
    name: "XpQuestWizardModal",
    props: ["open", "prefill"],
    emits: ["close", "saved"],
    render() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("vue").h("div", { class: "quest-wizard-stub", "data-open": String((this as any).open) });
    },
  },
}));

const item = (
  id: string,
  name: string,
  status: QuestBoardItem["status"],
  extra: Record<string, unknown> = {},
  pending = false
): QuestBoardItem =>
  ({ quest: { id, achievementName: name, ...extra }, status, progress: null, pending, overdue: false } as QuestBoardItem);

const StubComponent = defineComponent({ render: () => h("span") });

const mountCalendar = async (): Promise<VueWrapper<any>> => {
  const wrapper = mount(MyCalendar, {
    props: { userId: "hero-1" },
    global: {
      components: {
        "xp-app-header": XpAppHeader,
        "xp-app-section": XpAppSection,
        "xp-app-row": XpAppRow,
        "xp-app-chip": XpAppChip,
        "xp-app-empty": XpAppEmpty,
        "xp-back-button": StubComponent,
        "xp-loading": StubComponent,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const sectionLabels = (wrapper: VueWrapper<any>): string[] =>
  wrapper.findAll(".xp-app-section__label").map((label) => label.text());

/** Who is signed in: a hero on a device with a Game Master, or the Game Master (isAdult). */
const signIn = (who: "hero" | "game-master") => {
  const store = useUserStore();
  store.users["gm-1"] = { id: "gm-1", isAdult: true };
  store.users["hero-1"] = { id: "hero-1", isAdult: false };
  store.currentUser.id = who === "hero" ? "hero-1" : "gm-1";
};

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  mockGetBoard.mockClear();
  mockPush.mockClear();
  mockSheetCreate.mockReset();
  mockSheetCreate.mockResolvedValue({ present: jest.fn() });
  mockBoard = [
    item("q-eve", "wash dishes", "open", { xp: 5, gp: 2, dueByTime: "18:30", timesOfDay: ["evening"] }),
    item("q-morn", "feed the cat", "done", { xp: 3, timesOfDay: ["morning"] }, true),
    item("q-any", "tidy room", "open", { ap: 1 }),
    item("q-off", "mow the lawn", "notDue", { xp: 9, timesOfDay: ["noon"] }),
  ];
});

describe("MyCalendar", () => {
  it("groups the day's quests by time of day as agenda rows, hiding those not due", async () => {
    const wrapper = await mountCalendar();

    expect(sectionLabels(wrapper)).toEqual(["Morning", "Evening", "Anytime"]);
    expect(wrapper.findAll(".xp-app-row__title").map((title) => title.text())).toEqual([
      "Feed The Cat",
      "Wash Dishes",
      "Tidy Room",
    ]);
    expect(wrapper.find("ion-card").exists()).toBe(false);
    expect(wrapper.find(".xp-app-header__title").text()).toBe("Calendar");
  });

  it("shows the reward chips, the due time and the Pending / Tamed status on the rows", async () => {
    const wrapper = await mountCalendar();
    const [feedCat, washDishes, tidyRoom] = wrapper.findAll(".xp-app-row");

    expect(washDishes.find(".xp-app-row__subtitle").text()).toBe("Due 6:30 PM");
    expect(washDishes.findAll(".xp-app-chip").map((chip) => chip.text())).toEqual(["5 XP", "2 GP"]);
    expect(tidyRoom.findAll(".xp-app-chip").map((chip) => chip.text())).toEqual(["1 AP"]);
    expect(feedCat.classes()).toContain("is-pending");
    expect(feedCat.findAll(".xp-app-chip").map((chip) => chip.text())).toEqual(["Pending", "3 XP"]);

    mockBoard = [item("q-done", "set the table", "done", {}, false)];
    const tamed = await mountCalendar();
    expect(tamed.find(".xp-app-row").classes()).toContain("is-tamed");
    expect(tamed.find(".xp-app-chip").text()).toBe("Tamed");
  });

  it("reads how many quests are still due in the app bar", async () => {
    const wrapper = await mountCalendar();

    expect(wrapper.find(".xp-app-header__meta").text()).toBe("2 due");
  });

  it("opens the quest's beast card for the tapped row and closes it when it is dismissed", async () => {
    const wrapper = await mountCalendar();
    expect(wrapper.find(".beast-card-stub").exists()).toBe(false);

    await wrapper.findAll(".xp-app-row")[1].trigger("click");

    const card = wrapper.findComponent({ name: "XpBeastCardModal" });
    expect(card.exists()).toBe(true);
    expect(card.props("quest")).toMatchObject({ id: "q-eve" });
    expect(card.props("status")).toBe("open");
    expect(card.props("userId")).toBe("hero-1");

    card.vm.$emit("didDismiss");
    await flushPromises();

    expect(wrapper.find(".beast-card-stub").exists()).toBe(false);
  });

  it("only lets the card view a quest on another day", async () => {
    const wrapper = await mountCalendar();
    await wrapper.find('button[aria-label="Next day"]').trigger("click");
    await flushPromises();
    await wrapper.findAll(".xp-app-row")[1].trigger("click");

    expect(wrapper.findComponent({ name: "XpBeastCardModal" }).props("status")).toBe("later");
  });

  it("moves to the next and the previous day from the strip above the dock and reloads the board", async () => {
    const wrapper = await mountCalendar();
    expect(wrapper.find(".day-nav .xp-app-chip").text()).toBe("Today");
    expect(mockGetBoard).toHaveBeenCalledTimes(1);

    await wrapper.find('button[aria-label="Next day"]').trigger("click");
    await flushPromises();

    expect(mockGetBoard).toHaveBeenCalledTimes(2);
    expect(wrapper.find(".day-nav .xp-app-chip").exists()).toBe(false);

    await wrapper.find('button[aria-label="Previous day"]').trigger("click");
    await flushPromises();

    expect(mockGetBoard).toHaveBeenCalledTimes(3);
    expect(wrapper.find(".day-nav .xp-app-chip").text()).toBe("Today");
  });

  it("shows only the tab's time of day when the dock selects it", async () => {
    mockBoard = [
      item("q-morn", "feed the cat", "open", { timesOfDay: ["morning"] }),
      item("q-eve", "wash dishes", "open", { timesOfDay: ["evening"] }),
    ];
    const wrapper = await mountCalendar();

    wrapper.findComponent({ name: "XpAppBottomNav" }).vm.$emit("change", "evening");
    await flushPromises();

    expect(sectionLabels(wrapper)).toEqual(["Evening"]);
  });

  it("shows the empty line in the skin when nothing is on the board", async () => {
    mockBoard = [];
    const wrapper = await mountCalendar();

    expect(wrapper.find('[data-test="no-chores"]').text()).toBe("No chores today.");
    expect(wrapper.find(".xp-app-header__meta").exists()).toBe(false);
  });

  it("wears the calendar accent and the modern skin by default", async () => {
    const wrapper = await mountCalendar();

    expect(wrapper.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--modern"]));
    expect(wrapper.element.style.getPropertyValue("--xp-app-accent")).toBe("#3fbf5f");
  });

  describe("adding a quest", () => {
    const wizard = (wrapper: VueWrapper<any>) => wrapper.findComponent({ name: "XpQuestWizardModal" });

    it("shows the + to a Game Master and a hero alike, and opens the wizard on the day and hero on screen", async () => {
      for (const who of ["game-master", "hero"] as const) {
        signIn(who);
        const wrapper = await mountCalendar();
        expect(wizard(wrapper).props("open")).toBe(false);

        const add = wrapper.find('[data-test="add-quest"]');
        expect(add.exists()).toBe(true);
        await add.trigger("click");

        expect(wizard(wrapper).props("open")).toBe(true);
        const prefill = wizard(wrapper).props("prefill");
        expect(prefill.assignee).toEqual(["hero-1"]);
        expect(prefill.startsOn).toEqual(expect.any(String));
        expect(prefill.timesOfDay).toBeUndefined();
        expect(mockPush).not.toHaveBeenCalled();
      }
    });

    it("hands the wizard the tab's part of the day", async () => {
      signIn("hero");
      const wrapper = await mountCalendar();
      wrapper.findComponent({ name: "XpAppBottomNav" }).vm.$emit("change", "evening");
      await flushPromises();

      await wrapper.find('[data-test="add-quest"]').trigger("click");

      expect(wizard(wrapper).props("prefill").timesOfDay).toEqual(["evening"]);
    });

    it("hands the wizard the day it is showing", async () => {
      signIn("hero");
      const wrapper = await mountCalendar();
      await wrapper.find('button[aria-label="Next day"]').trigger("click");
      await flushPromises();

      await wrapper.find('[data-test="add-quest"]').trigger("click");

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const starts = new Date(wizard(wrapper).props("prefill").startsOn);
      expect(starts.getDate()).toBe(tomorrow.getDate());
    });

    it("closes the wizard when it asks to close, and reloads the board when a quest is saved", async () => {
      signIn("hero");
      const wrapper = await mountCalendar();
      await wrapper.find('[data-test="add-quest"]').trigger("click");
      expect(wizard(wrapper).props("open")).toBe(true);
      mockGetBoard.mockClear();

      wizard(wrapper).vm.$emit("saved", { id: "q-new" });
      await flushPromises();
      expect(mockGetBoard).toHaveBeenCalledTimes(1);

      wizard(wrapper).vm.$emit("close");
      await flushPromises();
      expect(wizard(wrapper).props("open")).toBe(false);
    });
  });

  describe("the actions FAB", () => {
    const sheetButtons = () => mockSheetCreate.mock.calls[0][0].buttons as { text: string; handler?: () => void }[];

    it("opens the action sheet from the FAB, with no '...' button in the header", async () => {
      signIn("game-master");
      const wrapper = await mountCalendar();
      expect(wrapper.find(".xp-app-header").find('button[aria-label="Agenda actions"]').exists()).toBe(false);

      await wrapper.find('[data-test="calendar-fab"]').trigger("click");
      await flushPromises();

      expect(mockSheetCreate).toHaveBeenCalledTimes(1);
      expect(sheetButtons().map((button) => button.text)).toEqual(["New Quest", "Open the Beast Log", "Cancel"]);
    });

    it("lists New Quest for a hero too, and no Request Time Off", async () => {
      signIn("hero");
      const wrapper = await mountCalendar();

      await wrapper.find('[data-test="calendar-fab"]').trigger("click");
      await flushPromises();

      const texts = sheetButtons().map((button) => button.text);
      expect(texts).not.toContain("Request Time Off");
      expect(texts).toEqual(["New Quest", "Open the Beast Log", "Cancel"]);
    });

    it("wires each entry: the wizard, the quest log", async () => {
      signIn("hero");
      const wrapper = await mountCalendar();
      await wrapper.find('[data-test="calendar-fab"]').trigger("click");
      await flushPromises();

      sheetButtons()[0].handler?.();
      await flushPromises();
      expect(wrapper.findComponent({ name: "XpQuestWizardModal" }).props("open")).toBe(true);

      sheetButtons()[1].handler?.();
      expect(mockPush.mock.calls[0][0]).toEqual({ name: "my-tasks", params: { userId: "hero-1" } });
    });
  });
});
