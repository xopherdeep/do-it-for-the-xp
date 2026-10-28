import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { modalController, toastController } from "@ionic/vue";
import XpBeastMakerModal from "@/app/Console/MyPortal/UserHud/MyQuests/components/XpBeastMakerModal.vue";
import XpMyCreations from "@/app/Console/MyPortal/UserHud/MyQuests/components/XpMyCreations.vue";
import { AchievementDb } from "@/lib/databases/AchievementDb";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { deleteQuest } from "@/lib/services/compendium/deleteContent";
import type { Proposal } from "@/lib/services/creations/creations";
import { myCreationRows } from "@/lib/services/creations/myCreations";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Beast Maker's opening list: what a hero already made, by state, newest first. The list on its own (rows, chips,
 * the note, the buttons, what a tap or a swipe asks for), then through the Maker: it opens on the list when there is
 * anything to list, Draw a new beast opens the steps, Fix it and Send again, Delete, and a beast in the game opening
 * its Beast Card. The Ionic frame, the speech engine, the photo picker, the background engine, the fanfare, the Beast
 * Card and the stores are stubs or spies; the store, the shell, the list and the rules are real.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@ionic/vue", () => ({
  __esModule: true,
  ...jest.requireActual("@ionic/vue"),
  modalController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));
jest.mock("@/lib/engine/core/BackgroundManager", () => ({
  __esModule: true,
  backgroundManager: { initBackground: jest.fn(), cleanupBackground: jest.fn(), isActiveFor: jest.fn(() => false) },
}));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  __esModule: true,
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `beast-${avatar}.webp` : null),
}));
jest.mock("@/components/organisms/BeastPhoto/BeastPhotoPicker.vue", () => ({ __esModule: true, default: { name: "BeastPhotoPickerStub" } }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));
jest.mock("@/lib/services/compendium/deleteContent", () => ({ __esModule: true, deleteQuest: jest.fn().mockResolvedValue(undefined) }));

const DRAWING = "data:image/jpeg;base64,AAAA";
const SENT = "2026-10-26T08:00:00.000Z";

const toast = toastController.create as jest.Mock;
const slot = { template: "<div><slot /></div>" };
const selectorStub = { name: "SelectorStub", props: ["initialBg1", "initialBg2", "aspectRatio", "targetRef"], template: "<div class='selector-stub'></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpHeroFanfare: { props: ["open"], emits: ["done"], template: "<div class='fanfare-stub' :data-open='String(open)'></div>" },
  XpBackgroundSelector: selectorStub,
  XpBeastCardModal: {
    props: ["quest", "status", "userId", "lockedNotice"],
    emits: ["didDismiss"],
    template: "<div class='card-stub' :data-quest='quest.id' :data-status='status' :data-notice='lockedNotice' @click=\"$emit('didDismiss')\"></div>",
  },
};

const waiting = (state: Proposal["state"], patch: Partial<Proposal> = {}): Proposal => ({ by: "hero", on: SENT, state, ...patch });

const beastOf = (id: string, state: Proposal["state"], patch: Partial<Beast> = {}, proposal: Partial<Proposal> = {}): Beast => ({
  id,
  name: `Beast ${id}`,
  checklist: ["Sort the socks"],
  avatar: 0,
  localImage: DRAWING,
  bg1: 3,
  bg2: 4,
  aspectRatio: 64,
  madeBy: "hero",
  proposal: waiting(state, proposal),
  ...patch,
});

const questOf = (id: string, state: Proposal["state"], patch: Partial<Achievement> = {}): Achievement =>
  ({ id, achievementName: `Quest ${id}`, assignee: ["hero"], createdBy: "hero", draft: state !== "approved", proposal: waiting(state), ...patch }) as Achievement;

/** A hero ten years old (the adventure voice), signed in */
const signIn = (age = 10) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  const year = new Date().getFullYear();
  store.addUser({ id: "hero", isAdult: false, birthday: `${year - age}-01-01`, name: { first: "Mia", nick: "Mimi" } });
  store.loginUser(store.users.hero);
};

const tap = async (wrapper: ReturnType<typeof mount>, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

describe("the list of creations", () => {
  const mountList = (rows = myCreationRows([], [], "hero"), full = false) => {
    signIn();
    return mount(XpMyCreations, { props: { rows, full }, global: { stubs } });
  };

  const sample = () =>
    myCreationRows(
      [
        beastOf("b1", "proposed"),
        beastOf("b2", "returned", {}, { note: "Add a chore" }),
        beastOf("b3", "approved", {}, { questId: "q3" }),
        beastOf("b4", "approved"),
      ],
      [questOf("q1", "returned", {}), questOf("q3", "approved", { beastId: "b3" })],
      "hero"
    );

  it("lists the rows in the order given, each with its name and a chip in the hero's voice", () => {
    const wrapper = mountList(sample());

    expect(wrapper.findAll("[data-key]").map((row) => row.attributes("data-key"))).toEqual(sample().map((row) => row.key));
    const chipOf = (key: string) => wrapper.get(`[data-key="${key}"] [data-test="chip"]`).text();
    expect(chipOf("beast:b1")).toBe("Waiting");
    expect(chipOf("beast:b2")).toBe("Came back");
    expect(chipOf("beast:b3")).toBe("In the game");
    expect(wrapper.get('[data-key="beast:b1"]').text()).toContain("Beast b1");
  });

  it("draws the beast's picture, else an icon", () => {
    const wrapper = mountList(myCreationRows([beastOf("b1", "proposed"), beastOf("b2", "proposed", { localImage: undefined })], [questOf("q1", "proposed")], "hero"));

    expect(wrapper.get('[data-key="beast:b1"] img').attributes("src")).toBe(DRAWING);
    expect(wrapper.find('[data-key="beast:b2"] img').exists()).toBe(false);
    expect(wrapper.find('[data-key="beast:b2"] .fa-dragon').exists()).toBe(true);
    expect(wrapper.find('[data-key="quest:q1"] .fa-scroll').exists()).toBe(true);
  });

  it("shows the Game Master's note with Fix it and Send again on a beast that came back, and nothing of the kind on the rest", () => {
    const wrapper = mountList(sample());

    const back = wrapper.get('[data-key="beast:b2"]');
    expect(back.get('[data-test="note"]').text()).toBe("Add a chore");
    expect(back.get('[data-test="fix"]').text()).toBe("Fix it");
    expect(back.get('[data-test="resend"]').text()).toBe("Send again");
    for (const key of ["beast:b1", "beast:b3"]) {
      const row = wrapper.get(`[data-key="${key}"]`);
      expect(row.find('[data-test="note"]').exists()).toBe(false);
      expect(row.find('[data-test="fix"]').exists()).toBe(false);
      expect(row.find('[data-test="resend"]').exists()).toBe(false);
    }
  });

  it("offers a quest that came back only Send again: there is no Fix it for a quest", () => {
    const wrapper = mountList(myCreationRows([], [questOf("q1", "returned")], "hero"));

    expect(wrapper.find('[data-test="resend"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="fix"]').exists()).toBe(false);
  });

  it("asks for Fix it with the beast, Send again and Delete with the row, and Draw a new beast", async () => {
    const rows = sample();
    const wrapper = mountList(rows);
    const back = wrapper.get('[data-key="beast:b2"]');

    await back.get('[data-test="fix"]').trigger("click");
    await back.get('[data-test="resend"]').trigger("click");
    await back.get('[data-test="delete"]').trigger("click");
    await tap(wrapper, "new");

    expect(wrapper.emitted("fix")?.[0]).toEqual([rows.find((row) => row.key === "beast:b2")?.beast]);
    expect(wrapper.emitted("resend")?.[0]).toEqual([rows.find((row) => row.key === "beast:b2")]);
    expect(wrapper.emitted("delete")?.[0]).toEqual([rows.find((row) => row.key === "beast:b2")]);
    expect(wrapper.emitted("new")).toHaveLength(1);
  });

  it("offers Delete on a waiting row and a row that came back, and not on one in the game", () => {
    const wrapper = mountList(sample());

    expect(wrapper.find('[data-key="beast:b1"] [data-test="delete"]').exists()).toBe(true);
    expect(wrapper.find('[data-key="beast:b2"] [data-test="delete"]').exists()).toBe(true);
    expect(wrapper.find('[data-key="beast:b3"] [data-test="delete"]').exists()).toBe(false);
  });

  it("opens only a beast in the game that has a quest to open its card on: the rest of the rows are plain", async () => {
    const rows = sample();
    const wrapper = mountList(rows);

    for (const key of ["beast:b1", "beast:b2", "beast:b4", "quest:q3"]) await wrapper.get(`[data-key="${key}"] [data-test="row"]`).trigger("click");
    expect(wrapper.emitted("open")).toBeUndefined();

    await wrapper.get('[data-key="beast:b3"] [data-test="row"]').trigger("click");
    expect(wrapper.emitted("open")?.[0]).toEqual([rows.find((row) => row.key === "beast:b3")]);
  });

  it("shuts Draw a new beast and says why at the cap", () => {
    const wrapper = mountList(sample(), true);

    expect(wrapper.get('[data-test="new"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="full"]').text()).toBe("Ask a Game Master to look at your creations first.");
    expect(mountList(sample(), false).find('[data-test="full"]').exists()).toBe(false);
  });

  it("closes from the header", async () => {
    const wrapper = mountList(sample());

    await tap(wrapper, "list-close");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

describe("the Beast Maker opening on the list", () => {
  let saved: jest.SpyInstance;
  let read: jest.SpyInstance;
  let removed: jest.SpyInstance;
  let readQuests: jest.SpyInstance;

  beforeEach(() => {
    toast.mockReset();
    toast.mockResolvedValue({ present: jest.fn() });
    (modalController.create as jest.Mock).mockReset();
    (deleteQuest as jest.Mock).mockClear();
    saved = jest.spyOn(BestiaryDb.prototype, "setBeast").mockResolvedValue(undefined);
    read = jest.spyOn(BestiaryDb.prototype, "getBeasts").mockResolvedValue([]);
    removed = jest.spyOn(BestiaryDb.prototype, "deleteBeast").mockResolvedValue([]);
    readQuests = jest.spyOn(AchievementDb.prototype, "getTasks").mockResolvedValue([]);
  });

  afterEach(() => {
    for (const spy of [saved, read, removed, readQuests]) spy.mockRestore();
  });

  const mountMaker = async (beasts: Array<Beast | null>, quests: Array<Achievement | null> = [], age = 10) => {
    signIn(age);
    read.mockResolvedValue(beasts as never);
    readQuests.mockResolvedValue(quests as never);
    const wrapper = mount(XpBeastMakerModal, { props: { open: true, heroId: "hero" }, global: { stubs } });
    await flushPromises();
    return wrapper;
  };

  it("opens on the list with Draw a new beast at the bottom, not on the first step", async () => {
    const wrapper = await mountMaker([beastOf("b1", "proposed")]);

    expect(wrapper.find('[data-test="my-creations"]').exists()).toBe(true);
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Your creations");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="guide"]').exists()).toBe(false);
  });

  it("calls the list Your beasts for a little one", async () => {
    const wrapper = await mountMaker([beastOf("b1", "proposed")], [], 6);

    expect(wrapper.get(".xp-app-header__title").text()).toBe("Your beasts");
  });

  it("opens on the steps for a hero who has made nothing, and for one whose creations are another hero's", async () => {
    const mine = await mountMaker([]);
    expect(mine.find('[data-test="step-look"]').exists()).toBe(true);
    expect(mine.find('[data-test="my-creations"]').exists()).toBe(false);

    const other = await mountMaker([beastOf("b1", "proposed", { madeBy: "mia" }, { by: "mia" })]);
    expect(other.find('[data-test="step-look"]').exists()).toBe(true);
  });

  it("opens on the steps when the stores cannot be read: the Maker is still there", async () => {
    signIn();
    read.mockRejectedValue(new Error("storage"));
    const wrapper = mount(XpBeastMakerModal, { props: { open: true, heroId: "hero" }, global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
  });

  it("starts a fresh beast from Draw a new beast", async () => {
    const wrapper = await mountMaker([beastOf("b1", "proposed")]);

    await tap(wrapper, "new");

    expect(wrapper.find('[data-test="my-creations"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="stage"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
  });

  it("shuts Draw a new beast at the cap: ten creations still with the Game Master, beasts and quests together", async () => {
    const beasts = Array.from({ length: 5 }, (_, n) => beastOf(`b${n}`, n % 2 ? "proposed" : "returned"));
    const quests = Array.from({ length: 5 }, (_, n) => questOf(`q${n}`, n % 2 ? "proposed" : "returned"));
    const wrapper = await mountMaker(beasts, quests);

    expect(wrapper.get('[data-test="new"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="full"]').text()).toBe("Ask a Game Master to look at your creations first.");
  });

  it("fixes a beast that came back: the steps open on it, the Game Master's note is said, and Send writes it again", async () => {
    const wrapper = await mountMaker([beastOf("b1", "returned", { name: "Sock Goblin" }, { note: "Add a chore", reviewedBy: "mom", questId: "q1" })]);

    await tap(wrapper, "fix");
    expect(toast.mock.calls[0][0].message).toBe("Add a chore");
    expect(wrapper.get('[data-test="stage-portrait"]').attributes("src")).toBe(DRAWING);
    await tap(wrapper, "next");
    expect((wrapper.get('[data-test="name-input"]').element as HTMLInputElement).value).toBe("Sock Goblin");
    await wrapper.get('[data-test="name-input"]').setValue("Sock Goblin Prime");
    await tap(wrapper, "next");
    expect(wrapper.findAll('[data-test="chore-row"]')).toHaveLength(1);
    await tap(wrapper, "next");
    await tap(wrapper, "submit");

    expect(saved).toHaveBeenCalledTimes(1);
    const sent = saved.mock.calls[0][0] as Beast;
    expect(sent).toMatchObject({ id: "b1", name: "Sock Goblin Prime", madeBy: "hero", localImage: DRAWING });
    expect(sent.proposal).toMatchObject({ by: "hero", state: "proposed", reviewedBy: "mom", questId: "q1" });
    expect(sent.proposal?.note).toBeUndefined();
    expect(wrapper.emitted("saved")).toHaveLength(1);
    expect(wrapper.find('[data-test="sent"]').exists()).toBe(true);
  });

  it("sends a fixed beast even at the cap: it is among the ten already", async () => {
    const beasts = [beastOf("b1", "returned", {}, { note: "Name it" }), ...Array.from({ length: 4 }, (_, n) => beastOf(`w${n}`, "proposed"))];
    const quests = Array.from({ length: 5 }, (_, n) => questOf(`q${n}`, "proposed"));
    const wrapper = await mountMaker(beasts, quests);

    await tap(wrapper, "fix");
    for (let n = 0; n < 3; n++) await tap(wrapper, "next");
    await tap(wrapper, "submit");

    expect(saved).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls.map((call) => call[0].message)).not.toContain("Ask a Game Master to look at your creations first.");
  });

  it("writes nothing when the Game Master settled the beast while it was being fixed, and shows the list as it is now", async () => {
    const wrapper = await mountMaker([beastOf("b1", "returned", {}, { note: "Name it" })]);
    await tap(wrapper, "fix");
    for (let n = 0; n < 3; n++) await tap(wrapper, "next");
    read.mockResolvedValue([beastOf("b1", "approved")] as never);

    await tap(wrapper, "submit");

    expect(saved).not.toHaveBeenCalled();
    expect(toast.mock.calls.at(-1)?.[0].message).toBe("That did not work. Try again.");
    expect(wrapper.get('[data-key="beast:b1"] [data-test="chip"]').text()).toBe("In the game");
    expect(wrapper.find('[data-test="sent"]').exists()).toBe(false);
  });

  it("sends a creation that came back again as it is, and says so", async () => {
    const wrapper = await mountMaker([beastOf("b1", "returned", {}, { note: "Name it" })]);

    await tap(wrapper, "resend");

    expect(saved).toHaveBeenCalledTimes(1);
    const sent = saved.mock.calls[0][0] as Beast;
    expect(sent.proposal).toMatchObject({ state: "proposed", by: "hero" });
    expect(sent.proposal?.note).toBeUndefined();
    expect(sent.name).toBe("Beast b1");
    expect(toast.mock.calls[0][0].message).toBe("Sent to the Game Master!");
  });

  it("deletes a waiting beast with the quest sent with it, then shows the list again", async () => {
    const wrapper = await mountMaker([beastOf("b1", "proposed", {}, { questId: "q1" })], [questOf("q1", "proposed")]);
    // Once the beast is deleted the stores are empty
    removed.mockImplementation(async () => {
      read.mockResolvedValue([] as never);
      readQuests.mockResolvedValue([] as never);
      return [];
    });

    await tap(wrapper, "delete");

    expect(removed).toHaveBeenCalledWith(expect.objectContaining({ id: "b1" }));
    expect(deleteQuest).toHaveBeenCalledWith(expect.objectContaining({ id: "q1" }));
    // Nothing is left to list: the Maker goes on to its steps
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
  });

  it("says it did not work when a delete fails, and keeps the row", async () => {
    removed.mockRejectedValue(new Error("storage"));
    const wrapper = await mountMaker([beastOf("b1", "proposed")]);

    await tap(wrapper, "delete");

    expect(toast.mock.calls[0][0].message).toBe("That did not work. Try again.");
    expect(wrapper.find('[data-key="beast:b1"]').exists()).toBe(true);
  });

  it("opens the Beast Card of a beast in the game on its quest, to look at, and closes it", async () => {
    const wrapper = await mountMaker([beastOf("b1", "approved", {}, { questId: "q1" })], [questOf("q1", "approved", { beastId: "b1" })]);
    expect(wrapper.find(".card-stub").exists()).toBe(false);

    await wrapper.get('[data-key="beast:b1"] [data-test="row"]').trigger("click");

    const card = wrapper.get(".card-stub");
    expect(card.attributes("data-quest")).toBe("q1");
    expect(card.attributes("data-status")).toBe("open");
    expect(card.attributes("data-notice")).toBe("Hunt this beast from the Beast Log.");

    await card.trigger("click");
    expect(wrapper.find(".card-stub").exists()).toBe(false);
  });

  it("reads the list again each time the Maker opens, so a new beast shows at once", async () => {
    const wrapper = await mountMaker([]);
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);

    read.mockResolvedValue([beastOf("b1", "proposed")] as never);
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(wrapper.find('[data-key="beast:b1"]').exists()).toBe(true);
  });
});
