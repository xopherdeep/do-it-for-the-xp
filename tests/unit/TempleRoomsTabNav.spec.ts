/**
 * Opening a room's editor from the temple's Rooms tab. The room list shows every floor, so the address it opens
 * carries the room's floor (rooms/2F/1/2); without it the editor read the cell at the same row and column of whatever
 * floor the creator store was on, and Save wrote onto that cell. The route takes the floor first and still answers the
 * old two-part address (rooms/1/2).
 */
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { ref } from "vue";
import XpTempleRooms from "@/app/Admin/XpCompendium/views/XpTemples/components/tabs/XpTempleRooms.vue";
import { TempleDataInjectionKey } from "@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleData";
import { TempleRoutes } from "@/router/Admin/temples.routes";

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
    IonAccordionGroup: passthrough("ion-accordion-group"),
    IonAccordion: passthrough("ion-accordion"),
    IonItem: passthrough("ion-item"),
    IonLabel: passthrough("ion-label"),
    useIonRouter: () => ({ push: mockPush }),
  };
});
jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRoute: () => ({ params: { templeId: "t1" } }),
}));

const WALL = "_____";
const BASE = "/game-master/compendium/temples/t1";

/** The Rooms tab over a temple: a monster room on 1F at row 1, col 1 and a loot room on 2F at row 1, col 2 */
const openRoomsTab = (maze: string[][] | Record<string, string[][]>) => {
  const temple = ref({
    dungeonLayout: {
      entrance: [0, 0],
      maze,
      rooms: {
        [WALL]: { type: "wall" },
        M0101: { type: "monster", content: { beasts: ["b1"] } },
        L0201: { type: "loot" },
      },
    },
  });
  const injected = {
    temple,
    composition: ref({ monsters: [], keyItems: [] }),
    getRoomTypeIcon: () => "fa-door-open",
    getMonsterIcon: () => "fa-skull",
    isLoading: ref(false),
  };
  return mount(XpTempleRooms, {
    global: {
      provide: { [TempleDataInjectionKey as symbol]: injected },
      stubs: { XpCoordBadge: true, XpLoading: true },
    },
  });
};

const twoFloors = () => ({
  "1F": [
    [WALL, WALL, WALL],
    [WALL, "M0101", WALL],
  ],
  "2F": [
    [WALL, WALL, WALL],
    [WALL, WALL, "L0201"],
  ],
});

beforeEach(() => {
  mockPush.mockClear();
});

describe("the Rooms tab", () => {
  it("opens a room on another floor with that floor in the address", () => {
    const wrapper = openRoomsTab(twoFloors());

    wrapper.get(".room-type-loot").trigger("click");

    expect(mockPush).toHaveBeenCalledWith(`${BASE}/rooms/2F/1/2`);
  });

  it("opens a room on the ground floor with its floor too", () => {
    const wrapper = openRoomsTab(twoFloors());

    wrapper.get(".room-type-monster").trigger("click");

    expect(mockPush).toHaveBeenCalledWith(`${BASE}/rooms/1F/1/1`);
  });

  it("names the ground floor for a single-floor temple", () => {
    const wrapper = openRoomsTab([
      [WALL, WALL, WALL],
      [WALL, "M0101", WALL],
    ]);

    wrapper.get(".room-type-monster").trigger("click");

    expect(mockPush).toHaveBeenCalledWith(`${BASE}/rooms/1F/1/1`);
  });
});

describe("the room editor's address", () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/game-master/compendium", children: TempleRoutes }],
  });

  it("carries the floor, then the row and the column", () => {
    const resolved = router.resolve(`${BASE}/rooms/2F/1/2`);

    expect(resolved.name).toBe("xp-temple-room-editor");
    expect(resolved.params).toMatchObject({ templeId: "t1", floor: "2F", row: "1", col: "2" });
  });

  it("still answers an old two-part address, with no floor", () => {
    const resolved = router.resolve(`${BASE}/rooms/1/2`);

    expect(resolved.name).toBe("xp-temple-room-editor");
    expect(resolved.params).toMatchObject({ templeId: "t1", row: "1", col: "2" });
    expect(resolved.params.floor || "").toBe("");
  });

  it("builds both addresses from the route's name", () => {
    const named = (params: Record<string, string>) => router.resolve({ name: "xp-temple-room-editor", params }).path;

    expect(named({ templeId: "t1", floor: "B1", row: "3", col: "0" })).toBe(`${BASE}/rooms/B1/3/0`);
    expect(named({ templeId: "t1", row: "3", col: "0" })).toBe(`${BASE}/rooms/3/0`);
  });

  it("is the same for the creator's own room route", () => {
    const resolved = router.resolve("/game-master/compendium/temples/creator/t1/rooms/2F/1/2");
    expect(resolved.name).toBe("xp-room-editor");
    expect(resolved.params).toMatchObject({ templeId: "t1", floor: "2F", row: "1", col: "2" });

    const legacy = router.resolve("/game-master/compendium/temples/creator/t1/rooms/1/2");
    expect(legacy.name).toBe("xp-room-editor");
    expect(legacy.params).toMatchObject({ templeId: "t1", row: "1", col: "2" });

    expect(router.resolve({ name: "xp-room-editor", params: { templeId: "t1", floor: "2F", row: "1", col: "2" } }).path).toBe(
      "/game-master/compendium/temples/creator/t1/rooms/2F/1/2"
    );
  });

  it("leaves the temple's tabs where they were", () => {
    expect(router.resolve(`${BASE}/rooms`).name).toBe("xp-temple-rooms");
    expect(router.resolve(`${BASE}/beasts`).name).toBe("xp-temple-beasts");
  });
});
