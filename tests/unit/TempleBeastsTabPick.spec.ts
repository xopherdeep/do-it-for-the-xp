/**
 * Picking a beast for a room in the temple's Beasts tab (XpTempleBeasts over the real selection and creator stores).
 * A room with its own coordinate symbol (M0201, B0401) is edited in place: the picked beast takes the place of the one
 * tapped and the rest of the record (sides, lockOnEnter, difficulty, the other beasts) stays. Only a symbol many cells
 * share (MINI, BOSS, the wall) gives the cell a symbol of its own, and the new record starts as a copy of the shared
 * one. The tab also opens a room's editor with the room's floor in the address.
 */
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { computed, ref } from "vue";
import XpTempleBeasts from "@/app/Admin/XpCompendium/views/XpTemples/components/tabs/XpTempleBeasts.vue";
import { TempleDataInjectionKey } from "@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleData";
import {
  listTempleBeasts,
  type TempleBeast,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/mazeContents";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import type { Room } from "@/lib/engine/core/dungeons/types";

const mockPush = jest.fn();
jest.mock("@ionic/vue", () => {
  const { h } = jest.requireActual("vue");
  const passthrough = (name: string) => ({
    name,
    render(this: { $slots: { default?: () => unknown[] } }) {
      return h("div", { class: name }, this.$slots.default?.());
    },
  });
  return {
    IonPage: passthrough("ion-page"),
    IonContent: passthrough("ion-content"),
    IonIcon: passthrough("ion-icon"),
    IonGrid: passthrough("ion-grid"),
    IonRow: passthrough("ion-row"),
    IonCol: passthrough("ion-col"),
    IonAccordionGroup: passthrough("ion-accordion-group"),
    IonAccordion: passthrough("ion-accordion"),
    IonItem: passthrough("ion-item"),
    IonLabel: passthrough("ion-label"),
    IonFooter: passthrough("ion-footer"),
    useIonRouter: () => ({ push: mockPush }),
    onIonViewDidEnter: jest.fn(),
  };
});
jest.mock("vue-router", () => ({ useRoute: () => ({ params: { templeId: "t1" } }) }));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleQuests", () => {
  const { ref: mockRef } = jest.requireActual("vue");
  return {
    useTempleQuests: () => ({
      view: mockRef({ rows: [], groups: { boss: [], miniboss: [], monster: [] } }),
      themeLabel: mockRef(""),
      choices: mockRef([]),
      sleeping: mockRef([]),
      showWake: mockRef(false),
      covered: mockRef([]),
      heroOptions: mockRef([]),
      pickedHeroes: mockRef([]),
      ticked: mockRef([]),
      report: mockRef(null),
      problem: mockRef(""),
      waking: mockRef(false),
      confirmText: mockRef(""),
      load: jest.fn(),
      openWake: jest.fn(),
      closeWake: jest.fn(),
      toggleHero: jest.fn(),
      toggleTick: jest.fn(),
      setAllTicks: jest.fn(),
      confirmWake: jest.fn(),
    }),
  };
});

const WALL = "_____";

type Maze = string[][] | Record<string, string[][]>;
type Layout = { entrance: number[]; maze: Maze; rooms: Record<string, Room> };

/** A hard locked-door monster room with two beasts: what a pick for one beast must not lose */
const lair = (): Room => ({
  type: "monster",
  sides: { north: "locked", east: "door", south: "door", west: "door" },
  content: { beasts: ["b1", "b2"], lockOnEnter: true, difficulty: "hard", xp: 40, gp: 4, ap: 1 },
});

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** The Beasts tab over a temple layout, and the way to pick a beast for one of its entries */
const openBeastsTab = (layout: Layout) => {
  const temple = ref({ dungeonLayout: layout });
  const saveTemple = jest.fn();
  const injected = {
    temple,
    saveTemple,
    allBeasts: ref([]),
    templeBeastsWithDetails: computed((): TempleBeast[] => listTempleBeasts(temple.value.dungeonLayout as never, [])),
  };
  const wrapper = mount(XpTempleBeasts, {
    global: {
      provide: { [TempleDataInjectionKey as symbol]: injected },
      stubs: {
        XpBeastSelectorItem: true,
        XpCoordBadge: true,
        TempleQuestsHeader: true,
        TempleQuestRowCard: true,
        TempleWakeSheet: true,
      },
    },
  });
  const vm = wrapper.vm as unknown as {
    openBeastSelector: (entry: TempleBeast) => void;
    navigateToRoom: (entry: { floor: string; row: number; col: number }) => void;
  };
  const entries = () => injected.templeBeastsWithDetails.value;

  /** Taps the entry, picks `picked` in the selector, and confirms */
  const pick = (entry: TempleBeast, picked: string[]) => {
    vm.openBeastSelector(entry);
    const selection = useBestiarySelectionStore();
    selection.selectedBeastIds = picked;
    selection.confirmSelection();
  };

  return { temple, saveTemple, entries, pick, vm, creator: useTempleCreatorStore() };
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockPush.mockClear();
});

describe("picking a beast in a room with its own coordinate symbol", () => {
  const layout = (): Layout => ({
    entrance: [0, 0],
    maze: [
      [WALL, WALL, WALL],
      [WALL, WALL, "M0201"],
    ],
    rooms: { [WALL]: { type: "wall" }, M0201: lair() },
  });

  it("keeps the room's symbol and its place in the maze, with no second record", () => {
    const { temple, entries, pick } = openBeastsTab(layout());
    const second = entries().find((entry) => entry.beastId === "b2") as TempleBeast;

    pick(second, ["b9"]);

    const { maze, rooms } = temple.value.dungeonLayout;
    expect((maze as string[][])[1][2]).toBe("M0201");
    expect(Object.keys(rooms).sort()).toEqual([WALL, "M0201"].sort());
  });

  it("replaces only the beast tapped, not the list", () => {
    const { temple, entries, pick } = openBeastsTab(layout());

    pick(entries().find((entry) => entry.beastId === "b2") as TempleBeast, ["b9"]);

    expect(temple.value.dungeonLayout.rooms.M0201.content?.beasts).toEqual(["b1", "b9"]);
  });

  it("keeps the sides, lockOnEnter, difficulty and rewards the room had", () => {
    const { temple, entries, pick } = openBeastsTab(layout());

    pick(entries().find((entry) => entry.beastId === "b1") as TempleBeast, ["b9"]);

    expect(temple.value.dungeonLayout.rooms.M0201).toEqual({
      ...lair(),
      content: { ...lair().content, beasts: ["b9", "b2"] },
    });
  });

  it("puts the same record in the creator store, saves the temple and marks the room to scroll back to", () => {
    const { temple, saveTemple, entries, pick, creator } = openBeastsTab(layout());

    pick(entries()[0], ["b9"]);

    expect(creator.roomsData.M0201).toEqual(temple.value.dungeonLayout.rooms.M0201);
    expect(saveTemple).toHaveBeenCalledTimes(1);
    expect(creator.pendingScrollId).toBe("M0201");
  });

  it("fills an empty battle room with the beast picked", () => {
    const empty: Layout = {
      entrance: [0, 0],
      maze: [[WALL, "B0100"]],
      rooms: { [WALL]: { type: "wall" }, B0100: { type: "boss", content: { lockOnEnter: true } } },
    };
    const { temple, entries, pick } = openBeastsTab(empty);

    pick(entries()[0], ["b9"]);

    expect(temple.value.dungeonLayout.rooms.B0100).toEqual({ type: "boss", content: { lockOnEnter: true, beasts: ["b9"] } });
    expect((temple.value.dungeonLayout.maze as string[][])[0][1]).toBe("B0100");
  });

  it("edits the room in place on a multi-floor temple too", () => {
    const stacked: Layout = {
      entrance: [0, 0],
      maze: { "1F": [[WALL, WALL]], "2F": [[WALL, "M0001"]] },
      rooms: { [WALL]: { type: "wall" }, M0001: lair() },
    };
    const { temple, entries, pick } = openBeastsTab(stacked);

    pick(entries()[1], ["b9"]);

    expect((temple.value.dungeonLayout.maze as Record<string, string[][]>)["2F"][0][1]).toBe("M0001");
    expect(temple.value.dungeonLayout.rooms.M0001.content?.beasts).toEqual(["b1", "b9"]);
  });
});

describe("picking a beast in a room on a shared symbol", () => {
  const MINI: Room = {
    type: "miniboss",
    sides: { north: "door", east: "masterlocked", south: "door", west: "door" },
    content: { beasts: ["b1"], lockOnEnter: false, difficulty: "normal" },
  };
  const layout = (): Layout => ({
    entrance: [0, 0],
    maze: [
      ["MINI", WALL, "MINI"],
      [WALL, WALL, WALL],
    ],
    rooms: { [WALL]: { type: "wall" }, MINI: copy(MINI) },
  });

  it("gives that cell a symbol of its own and leaves the other cells on the shared one", () => {
    const { temple, entries, pick } = openBeastsTab(layout());
    const second = entries().find((entry) => entry.col === 2) as TempleBeast;

    pick(second, ["b9"]);

    const row = (temple.value.dungeonLayout.maze as string[][])[0];
    expect(row[0]).toBe("MINI");
    expect(row[2]).not.toBe("MINI");
    expect(row[2]).toMatch(/^m\d{4}$/);
    expect(temple.value.dungeonLayout.rooms.MINI).toEqual(MINI);
  });

  it("starts the cell's record as a copy of the shared one with the pick in the beast's place", () => {
    const { temple, entries, pick, creator } = openBeastsTab(layout());

    pick(entries().find((entry) => entry.col === 2) as TempleBeast, ["b9"]);

    const symbol = (temple.value.dungeonLayout.maze as string[][])[0][2];
    expect(temple.value.dungeonLayout.rooms[symbol]).toEqual({ ...MINI, content: { ...MINI.content, beasts: ["b9"] } });
    expect(creator.roomsData[symbol]).toEqual(temple.value.dungeonLayout.rooms[symbol]);
    expect(creator.pendingScrollId).toBe(symbol);
  });

  it("promotes on the floor the room is on", () => {
    const stacked: Layout = {
      entrance: [0, 0],
      maze: { "1F": [["MINI", WALL]], "2F": [[WALL, "MINI"]] },
      rooms: { [WALL]: { type: "wall" }, MINI: copy(MINI) },
    };
    const { temple, entries, pick } = openBeastsTab(stacked);

    pick(entries().find((entry) => entry.floor === "2F") as TempleBeast, ["b9"]);

    const floors = temple.value.dungeonLayout.maze as Record<string, string[][]>;
    expect(floors["1F"][0][0]).toBe("MINI");
    expect(floors["2F"][0][1]).not.toBe("MINI");
  });
});

describe("opening a room's editor from the Beasts tab", () => {
  it("puts the room's floor in the address", () => {
    const stacked: Layout = {
      entrance: [0, 0],
      maze: { "1F": [[WALL, WALL]], "2F": [[WALL, WALL], [WALL, "M0101"]] },
      rooms: { [WALL]: { type: "wall" }, M0101: lair() },
    };
    const { entries, vm } = openBeastsTab(stacked);

    vm.navigateToRoom(entries()[0]);

    expect(mockPush).toHaveBeenCalledWith({
      name: "xp-temple-room-editor",
      params: { templeId: "t1", floor: "2F", row: "1", col: "1" },
    });
  });
});
