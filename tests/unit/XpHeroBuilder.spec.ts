import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import XpHeroBuilder from "@/components/organisms/HeroModel/XpHeroBuilder.vue";
import XpBuilderNav from "@/components/organisms/HeroModel/builder/XpBuilderNav.vue";
import XpBuilderStage from "@/components/organisms/HeroModel/builder/XpBuilderStage.vue";
import XpBuilderTray from "@/components/organisms/HeroModel/builder/XpBuilderTray.vue";
import { starterLineup, type Rng } from "@/components/organisms/HeroModel/lookEditor";
import { play$fx } from "@/assets/fx";
import { DEFAULT_LOOK, type HeroLook } from "@/lib/hero-look/types";

/**
 * The hero builder screen in jsdom: it owns the draft, the undo history, the phases (lineup, then editor), the
 * sounds and the Done sequence, and composes the four parts around them. The voxel hero is stubbed (no WebGL), the
 * thumbnailer is faked, the leave alert is a spy and the clock is fake. The ion-modal shell is not mounted here.
 */

const mockSnapshot = jest.fn((size?: number) => `data:image/png;snapshot-${size}`);
const mockFlick = jest.fn();
const mockAlertCreate = jest.fn();

jest.mock("@/components/organisms/HeroModel/XpHeroModel.vue", () => {
  const { defineComponent, h } = jest.requireActual("vue");
  return {
    __esModule: true,
    default: defineComponent({
      name: "xp-hero-model",
      props: {
        look: { type: Object, default: () => ({}) },
        animation: { type: String, default: "idle" },
        interactive: Boolean,
        focus: { type: String, default: "full" },
      },
      setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
        expose({ snapshot: (size?: number) => mockSnapshot(size), flick: () => mockFlick() });
        return () => h("div", { class: "hero-stub" });
      },
    }),
  };
});

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

jest.mock("@/components/organisms/HeroModel/useLookThumbnails", () => {
  const { ref: vueRef } = jest.requireActual("vue");
  return {
    __esModule: true,
    useLookThumbnails: () => ({ supported: vueRef(true), get: () => "", dispose: jest.fn() }),
  };
});

jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  alertController: { create: (...args: unknown[]) => mockAlertCreate(...args) },
}));

const sounds = play$fx as jest.Mock;

/** A small seeded random source (mulberry32): the same seed deals the same heroes */
const seeded = (seed: number): Rng => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const mounted: VueWrapper[] = [];

/** The builder, attached to the document so focus can be read */
const show = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(XpHeroBuilder, { props: { allowPortrait: false, ...props }, attachTo: document.body });
  mounted.push(wrapper as unknown as VueWrapper);
  return wrapper;
};

type Builder = ReturnType<typeof show>;

/** A hero that already has a look: the builder opens straight into the editor */
const withLook = (extra: Partial<HeroLook> = {}): HeroLook => ({ ...DEFAULT_LOOK, ...extra });

const stage = (wrapper: Builder) => wrapper.findComponent(XpBuilderStage);
const tray = (wrapper: Builder) => wrapper.findComponent(XpBuilderTray);
const draft = (wrapper: Builder) => tray(wrapper).props("modelValue") as HeroLook;
const stageLook = (wrapper: Builder) => stage(wrapper).props("look") as HeroLook;
const heroes = (wrapper: Builder) => wrapper.findAll("[data-cy=starter-hero]");
const title = (wrapper: Builder) => wrapper.find("[data-cy=builder-title]").text();
const tab = (wrapper: Builder, label: string) => wrapper.findAll("[role=tab]").find((el) => el.text() === label)!;
const tile = (wrapper: Builder, option: string) => wrapper.find(`[data-cy=look-tile][data-option="${option}"]`);
const done = (wrapper: Builder) => wrapper.find("[data-cy=builder-done]");
const leave = (wrapper: Builder) => (wrapper.vm as unknown as { confirmLeave: () => Promise<boolean> }).confirmLeave();

/** Lets the builder's own timers run: the clock moves, then Vue paints what changed */
const tick = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await nextTick();
};

/** Lets promises chained on an alert settle (no timers involved, so it is safe under the fake clock) */
const settle = async () => {
  for (let turn = 0; turn < 10; turn++) await Promise.resolve();
  await nextTick();
};

/** An alert that is answered with `role` when it is dismissed */
const answerAlertWith = (role: string) => {
  const present = jest.fn().mockResolvedValue(undefined);
  mockAlertCreate.mockResolvedValue({ present, onDidDismiss: () => Promise.resolve({ role }) });
  return present;
};

describe("XpHeroBuilder", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sounds.mockClear();
    mockSnapshot.mockClear();
    mockSnapshot.mockImplementation((size?: number) => `data:image/png;snapshot-${size}`);
    mockFlick.mockClear();
    mockAlertCreate.mockReset();
  });

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("opens on the lineup for a hero with no look and on Body after a pick", async () => {
    // The lineup draws from Math.random, so a seeded one tells which look the tap picked
    jest.spyOn(Math, "random").mockImplementation(seeded(7));
    const expected = starterLineup(9, seeded(7));
    const wrapper = show();

    expect(title(wrapper)).toBe("Pick a starting hero");
    expect(heroes(wrapper)).toHaveLength(9);
    expect(stage(wrapper).exists()).toBe(false);
    expect(wrapper.findComponent(XpBuilderNav).exists()).toBe(false);
    expect(sounds).not.toHaveBeenCalled();

    await heroes(wrapper)[3].trigger("click");

    expect(title(wrapper)).toBe("Build your hero");
    expect(heroes(wrapper)).toHaveLength(0);
    expect(wrapper.findComponent(XpBuilderNav).props("modelValue")).toBe("body");
    expect(tab(wrapper, "Body").attributes("aria-selected")).toBe("true");
    expect(tray(wrapper).props("tab")).toMatchObject({ id: "body" });
    expect(draft(wrapper)).toEqual(expected[3]);
    expect(stage(wrapper).props("focus")).toBe("full");
    expect(stage(wrapper).props("animation")).toBe("hop");
    expect(stage(wrapper).props("canUndo")).toBe(false);
    expect(sounds.mock.calls).toEqual([["select"]]);
  });

  it("opens straight into the editor for a hero with a look", () => {
    const look = withLook({ hair: "mohawk", outfit: "robe" });
    const wrapper = show({ look });

    expect(title(wrapper)).toBe("Build your hero");
    expect(heroes(wrapper)).toHaveLength(0);
    expect(draft(wrapper)).toEqual(look);
    expect(tray(wrapper).props("tab")).toMatchObject({ id: "body" });
    expect(tray(wrapper).props("mode")).toBe("style");
    expect(wrapper.findComponent(XpBuilderNav).exists()).toBe(true);
    expect(stage(wrapper).props("animation")).toBe("idle");
    expect(stage(wrapper).props("canUndo")).toBe(false);
    expect(sounds).not.toHaveBeenCalled();
  });

  it("opens an old look clean", async () => {
    // An older save: no hat colour, and a sword the profile's equipment now supplies
    const { hatColor: _hatColor, ...older } = DEFAULT_LOOK;
    const wrapper = show({ look: { ...older, hair: "bun", leftHand: "fa-sword" } });

    expect(draft(wrapper).hatColor).toBe(DEFAULT_LOOK.hatColor);
    expect(draft(wrapper).hair).toBe("bun");
    expect("leftHand" in draft(wrapper)).toBe(false);

    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it("takes the hat off on the stage while on Hair, but saves it", async () => {
    const wrapper = show({
      look: withLook({ hat: "crown" }),
      equipment: { leftHand: [{ faIcon: "fa-sword" }], rightHand: [] },
    });

    // On Body the hero wears it, and carries what the profile equips
    expect(stageLook(wrapper).hat).toBe("crown");
    expect(stageLook(wrapper).leftHand).toBe("fa-sword");

    await tab(wrapper, "Hair").trigger("click");
    expect(stageLook(wrapper).hat).toBe("none");
    expect(stage(wrapper).props("focus")).toBe("bust");
    expect(draft(wrapper).hat).toBe("crown");

    await done(wrapper).trigger("click");
    await tick(800);

    const saved = wrapper.emitted("save")![0][0] as HeroLook;
    expect(saved.hat).toBe("crown");
    expect("leftHand" in saved).toBe(false);
    expect("rightHand" in saved).toBe(false);
  });

  it("keeps the stage look when only the tab changes", async () => {
    const wrapper = show({ look: withLook(), equipment: { leftHand: [{ faIcon: "fa-sword" }], rightHand: [] } });
    const onBody = stageLook(wrapper);
    expect(stage(wrapper).props("focus")).toBe("full");

    // No hat to take off: the same hero is drawn, so the live hero is not rebuilt and the camera can ease
    await tab(wrapper, "Face").trigger("click");
    expect(stage(wrapper).props("focus")).toBe("bust");
    expect(stageLook(wrapper)).toBe(onBody);

    await tab(wrapper, "Hair").trigger("click");
    expect(stageLook(wrapper)).toBe(onBody);
    await tab(wrapper, "Outfit").trigger("click");
    expect(stage(wrapper).props("focus")).toBe("full");
    expect(stageLook(wrapper)).toBe(onBody);

    // A pick is a new hero, and the new one keeps its identity through the next tab change
    await tile(wrapper, "robe").trigger("click");
    const picked = stageLook(wrapper);
    expect(picked).not.toBe(onBody);
    expect(picked.outfit).toBe("robe");
    expect(picked.leftHand).toBe("fa-sword");
    await tab(wrapper, "Face").trigger("click");
    expect(stageLook(wrapper)).toBe(picked);

    // New equipment changes the hands, so that is a new hero too
    await wrapper.setProps({ equipment: { leftHand: [], rightHand: [{ faIcon: "fa-shield" }] } });
    expect(stageLook(wrapper)).not.toBe(picked);
    expect(stageLook(wrapper).rightHand).toBe("fa-shield");
    expect(stageLook(wrapper).leftHand).toBeUndefined();
  });

  it("makes a new stage look when the hat comes off for Hair and goes back on", async () => {
    const wrapper = show({ look: withLook({ hat: "crown" }) });
    const wearing = stageLook(wrapper);

    await tab(wrapper, "Hair").trigger("click");
    const bare = stageLook(wrapper);
    expect(bare).not.toBe(wearing);
    expect(bare.hat).toBe("none");

    await tab(wrapper, "Body").trigger("click");
    expect(stageLook(wrapper)).not.toBe(bare);
    expect(stageLook(wrapper).hat).toBe("crown");
  });

  it("undoes the last pick, and plays no when there is nothing left", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");
    sounds.mockClear();

    // Nothing to undo yet
    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    expect(sounds.mock.calls).toEqual([["no"]]);
    sounds.mockClear();

    // Tapping the tile that is already chosen changes nothing: no history, no sound
    await tile(wrapper, DEFAULT_LOOK.hair).trigger("click");
    expect(sounds).not.toHaveBeenCalled();
    expect(stage(wrapper).props("canUndo")).toBe(false);

    await tile(wrapper, "bob").trigger("click");
    await tile(wrapper, "spiky").trigger("click");
    expect(draft(wrapper).hair).toBe("spiky");
    expect(stage(wrapper).props("canUndo")).toBe(true);
    expect(sounds.mock.calls).toEqual([["select"], ["select"]]);
    sounds.mockClear();

    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    expect(draft(wrapper).hair).toBe("bob");
    expect(stage(wrapper).props("animation")).toBe("hop");
    expect(sounds.mock.calls).toEqual([["cursor"]]);

    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    expect(draft(wrapper)).toEqual(withLook());
    expect(stage(wrapper).props("canUndo")).toBe(false);

    sounds.mockClear();
    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    expect(draft(wrapper)).toEqual(withLook());
    expect(sounds.mock.calls).toEqual([["no"]]);
  });

  it("hops for 450ms after a pick", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");

    // The hero holds a pose; the hop is on top of it
    await wrapper.find("[data-cy=builder-pose]").trigger("click");
    expect(stage(wrapper).props("animation")).toBe("wave");

    await tile(wrapper, "bob").trigger("click");
    expect(stage(wrapper).props("animation")).toBe("hop");

    await tick(449);
    expect(stage(wrapper).props("animation")).toBe("hop");

    await tick(1);
    expect(stage(wrapper).props("animation")).toBe("wave");
  });

  it("saves once", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");
    sounds.mockClear();

    await done(wrapper).trigger("click");
    expect(stage(wrapper).props("animation")).toBe("victory");
    expect(sounds.mock.calls).toEqual([["yes"]]);

    // From here the screen takes no more input: Done again, a tile, a tab, undo, random and pose all do nothing
    await done(wrapper).trigger("click");
    await tile(wrapper, "bob").trigger("click");
    await tab(wrapper, "Hat").trigger("click");
    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    await wrapper.find("[data-cy=builder-random]").trigger("click");
    await wrapper.find("[data-cy=builder-pose]").trigger("click");
    expect(wrapper.emitted("save")).toBeUndefined();
    expect(draft(wrapper)).toEqual(withLook());
    expect(tray(wrapper).props("tab")).toMatchObject({ id: "hair" });
    expect(stage(wrapper).props("animation")).toBe("victory");
    expect(mockFlick).not.toHaveBeenCalled();

    await tick(799);
    expect(wrapper.emitted("save")).toBeUndefined();

    await tick(1);
    await done(wrapper).trigger("click");
    await tick(2000);

    expect(wrapper.emitted("save")).toHaveLength(1);
    expect(wrapper.emitted("save")![0]).toEqual([withLook(), "data:image/png;snapshot-256"]);
    expect(sounds.mock.calls).toEqual([["yes"]]);
  });

  it("saves without a picture when the snapshot fails", async () => {
    // A hero that cannot be drawn throws; one that is not mounted answers with an empty string
    const failures: Array<() => string> = [
      () => {
        throw new Error("no WebGL");
      },
      () => "",
    ];

    for (const fail of failures) {
      mockSnapshot.mockImplementation(fail);
      const wrapper = show({ look: withLook({ hair: "bun" }) });

      await done(wrapper).trigger("click");
      await tick(800);

      const [saved, image] = wrapper.emitted("save")![0] as [HeroLook, string | undefined];
      expect(saved.hair).toBe("bun");
      expect(image).toBeUndefined();
      expect(wrapper.emitted("save")).toHaveLength(1);
    }
  });

  it("asks before leaving with changes and not after Done", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");

    // Untouched, a hero with a look can leave at once
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(sounds).toHaveBeenLastCalledWith("closeMenu");

    // A pick that is undone leaves nothing to lose
    await tile(wrapper, "bob").trigger("click");
    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();

    await tile(wrapper, "bob").trigger("click");
    sounds.mockClear();

    // Keep building
    const present = answerAlertWith("cancel");
    await expect(leave(wrapper)).resolves.toBe(false);
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    expect(mockAlertCreate.mock.calls[0][0]).toMatchObject({
      header: "Leave without saving?",
      buttons: [
        { text: "Keep building", role: "cancel" },
        { text: "Leave", role: "destructive" },
      ],
    });
    expect(present).toHaveBeenCalledTimes(1);
    expect(sounds).not.toHaveBeenCalled();

    // Leave
    answerAlertWith("destructive");
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).toHaveBeenCalledTimes(2);
    expect(sounds.mock.calls).toEqual([["closeMenu"]]);

    // Done is the way out with no questions
    await done(wrapper).trigger("click");
    await tick(800);
    expect(wrapper.emitted("save")).toHaveLength(1);
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).toHaveBeenCalledTimes(2);
  });

  it("asks once when close is requested twice quickly", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");
    await tile(wrapper, "bob").trigger("click");
    sounds.mockClear();

    // X and Android back, one after the other, before the alert has been answered
    let answer!: (result: { role: string }) => void;
    const dismissed = new Promise<{ role: string }>((resolve) => {
      answer = resolve;
    });
    const present = jest.fn().mockResolvedValue(undefined);
    mockAlertCreate.mockResolvedValue({ present, onDidDismiss: () => dismissed });

    const first = leave(wrapper);
    const second = leave(wrapper);
    await settle();
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    expect(present).toHaveBeenCalledTimes(1);

    answer({ role: "destructive" });
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    // One question, one click of the sound
    expect(sounds.mock.calls).toEqual([["closeMenu"]]);

    // Once the answer is in, the next request is a new question
    answerAlertWith("cancel");
    await expect(leave(wrapper)).resolves.toBe(false);
    expect(mockAlertCreate).toHaveBeenCalledTimes(2);
  });

  it("cannot be closed while saving", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");
    await tile(wrapper, "bob").trigger("click");

    await done(wrapper).trigger("click");
    sounds.mockClear();

    // X, Android back and a swipe all ask here: during the cheer the answer is no, with no alert and no sound
    await expect(leave(wrapper)).resolves.toBe(false);
    await tick(799);
    await expect(leave(wrapper)).resolves.toBe(false);
    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(sounds).not.toHaveBeenCalled();
    expect(wrapper.emitted("save")).toBeUndefined();

    // Once the look is handed back, the modal may close
    await tick(1);
    expect(wrapper.emitted("save")).toHaveLength(1);
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(sounds).not.toHaveBeenCalled();
  });

  it("counts a lineup pick as a change", async () => {
    const wrapper = show();

    // Nothing picked yet: nothing to lose
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();

    await heroes(wrapper)[0].trigger("click");
    answerAlertWith("cancel");
    await expect(leave(wrapper)).resolves.toBe(false);
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
  });

  it("shows the 2D link only when portraits are allowed", async () => {
    // Lineup
    const lineupOff = show({ allowPortrait: false });
    expect(lineupOff.find("[data-cy=look-use-portrait]").exists()).toBe(false);
    const lineupOn = show({ allowPortrait: true });
    expect(lineupOn.find("[data-cy=look-use-portrait]").text()).toBe("Use a 2D portrait instead");

    // Editor
    const editorOff = show({ look: withLook(), allowPortrait: false });
    expect(editorOff.find("[data-cy=look-use-portrait]").exists()).toBe(false);

    const editorOn = show({ look: withLook(), allowPortrait: true });
    const link = editorOn.find("[data-cy=look-use-portrait]");
    expect(link.text()).toBe("2D");
    expect(link.attributes("aria-label")).toBe("Use a 2D portrait instead");

    sounds.mockClear();
    await link.trigger("click");
    expect(editorOn.emitted("portrait")).toHaveLength(1);
    expect(sounds.mock.calls).toEqual([["select"]]);

    // Handing off to the portrait picker is not a loss: no alert
    await expect(leave(editorOn)).resolves.toBe(true);
    expect(mockAlertCreate).not.toHaveBeenCalled();

    // The lineup's own link does the same
    await lineupOn.find("[data-cy=look-use-portrait]").trigger("click");
    expect(lineupOn.emitted("portrait")).toHaveLength(1);
  });

  it("asks before swapping a changed hero for a portrait", async () => {
    const wrapper = show({ look: withLook(), allowPortrait: true });
    await tab(wrapper, "Hair").trigger("click");
    await tile(wrapper, "bob").trigger("click");
    sounds.mockClear();
    const link = () => wrapper.find("[data-cy=look-use-portrait]");

    // Keep building: the build stays and the portrait picker does not open
    const present = answerAlertWith("cancel");
    await link().trigger("click");
    await settle();
    expect(mockAlertCreate).toHaveBeenCalledTimes(1);
    expect(mockAlertCreate.mock.calls[0][0]).toMatchObject({
      header: "Leave without saving?",
      buttons: [
        { text: "Keep building", role: "cancel" },
        { text: "Leave", role: "destructive" },
      ],
    });
    expect(present).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("portrait")).toBeUndefined();
    expect(sounds).not.toHaveBeenCalled();
    expect(draft(wrapper).hair).toBe("bob");

    // Two quick taps share one question
    let answer!: (result: { role: string }) => void;
    const dismissed = new Promise<{ role: string }>((resolve) => {
      answer = resolve;
    });
    mockAlertCreate.mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined), onDidDismiss: () => dismissed });
    await link().trigger("click");
    await link().trigger("click");
    await settle();
    expect(mockAlertCreate).toHaveBeenCalledTimes(2);

    // Leave: only now does the portrait picker open, once
    answer({ role: "destructive" });
    await settle();
    expect(wrapper.emitted("portrait")).toHaveLength(1);
    expect(sounds.mock.calls).toEqual([["select"]]);

    // The look was handed off, so closing the screen asks nothing more
    await expect(leave(wrapper)).resolves.toBe(true);
    expect(mockAlertCreate).toHaveBeenCalledTimes(2);
  });

  it("hands a clean hero to the portrait picker without asking", async () => {
    const wrapper = show({ look: withLook(), allowPortrait: true });
    sounds.mockClear();

    await wrapper.find("[data-cy=look-use-portrait]").trigger("click");

    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(wrapper.emitted("portrait")).toHaveLength(1);
    expect(sounds.mock.calls).toEqual([["select"]]);
  });

  it("ignores the 2D link while saving", async () => {
    const wrapper = show({ look: withLook(), allowPortrait: true });
    await tab(wrapper, "Hair").trigger("click");
    await tile(wrapper, "bob").trigger("click");
    await done(wrapper).trigger("click");
    sounds.mockClear();

    await wrapper.find("[data-cy=look-use-portrait]").trigger("click");
    await settle();

    expect(mockAlertCreate).not.toHaveBeenCalled();
    expect(wrapper.emitted("portrait")).toBeUndefined();
    expect(sounds).not.toHaveBeenCalled();
  });

  it("plays cursor when the lineup re-deals", async () => {
    const wrapper = show();
    sounds.mockClear();

    await wrapper.find("[data-cy=starter-roll]").trigger("click");

    expect(sounds.mock.calls).toEqual([["cursor"]]);
    expect(heroes(wrapper)).toHaveLength(9);
  });

  it("moves focus to the tray when the tab changes", async () => {
    const wrapper = show({ look: withLook() });
    sounds.mockClear();

    await tab(wrapper, "Hair").trigger("click");
    await wrapper.vm.$nextTick();
    expect(sounds.mock.calls).toEqual([["cursor"]]);
    expect(document.activeElement).toBe(tray(wrapper).find("button").element);
    expect(document.activeElement?.getAttribute("data-cy")).toBe("look-tile");

    // The same tab again is not a change
    sounds.mockClear();
    await tab(wrapper, "Hair").trigger("click");
    expect(sounds).not.toHaveBeenCalled();

    await tab(wrapper, "Body").trigger("click");
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(tray(wrapper).find("button").element);
    expect(tray(wrapper).props("tab")).toMatchObject({ id: "body" });
  });

  it("plays cursor for the Style and Colour switch", async () => {
    const wrapper = show({ look: withLook() });
    await tab(wrapper, "Hair").trigger("click");
    sounds.mockClear();

    const colour = wrapper.findAll("[data-cy=tray-mode]").find((button) => button.text() === "Colour")!;
    await colour.trigger("click");

    expect(tray(wrapper).props("mode")).toBe("colour");
    expect(sounds.mock.calls).toEqual([["cursor"]]);
  });

  it("rolls a random hero, turns the pose and keeps undo for both", async () => {
    jest.spyOn(Math, "random").mockImplementation(seeded(3));
    const wrapper = show({ look: withLook() });
    sounds.mockClear();

    await wrapper.find("[data-cy=builder-random]").trigger("click");
    expect(mockFlick).toHaveBeenCalledTimes(1);
    expect(sounds.mock.calls).toEqual([["select"]]);
    expect(draft(wrapper)).not.toEqual(withLook());
    expect(stage(wrapper).props("canUndo")).toBe(true);

    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    expect(draft(wrapper)).toEqual(withLook());

    // The undo made the hero hop; the pose shows once it has landed
    await tick(450);
    sounds.mockClear();
    const poses: string[] = [];
    for (let turn = 0; turn < 5; turn++) {
      await wrapper.find("[data-cy=builder-pose]").trigger("click");
      poses.push(stage(wrapper).props("animation") as string);
    }
    expect(poses).toEqual(["wave", "dance", "victory", "idle", "wave"]);
    expect(sounds.mock.calls).toEqual(Array.from({ length: 5 }, () => ["cursor"]));
  });

  it("asks the page to close from X without a sound of its own", async () => {
    const wrapper = show({ look: withLook() });

    await wrapper.find(".xp-close-button").trigger("click");

    expect(wrapper.emitted("close-request")).toHaveLength(1);
    // The leave question plays the sound, so the button itself stays quiet
    expect(sounds).not.toHaveBeenCalled();
  });
});
