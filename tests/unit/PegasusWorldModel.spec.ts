import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import {
  PEGASUS_DEFAULT_PALETTE,
  PEGASUS_LOCKED_PALETTE,
  PEGASUS_PALETTES,
  buildBuildingMeshData,
  getBuildingBoxes,
  getPegasusBoxesById,
} from "@/components/organisms/BuildingModel/voxel/buildingShapes";
import { PEGASI, PEGASUS_LOOK } from "@/lib/services/temples/TemplePegasus";
import XpBuildingModel from "@/components/organisms/BuildingModel/XpBuildingModel.vue";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/components/organisms/BuildingModel/useBuildingScene", () => ({
  __esModule: true,
  useBuildingScene: jest.fn(),
}));

const mockPush = jest.fn();
let mockRouteName = "world-plains";
let mockRouteParams: Record<string, string> = { userId: "hero-1" };

jest.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({
    name: mockRouteName,
    params: mockRouteParams,
  }),
}));

describe("World Pegasus Voxel Palettes", () => {
  it("defines distinct palettes for all 9 sacred Pegasi matching PEGASUS_LOOK", () => {
    PEGASI.forEach((pegasus) => {
      const slug = pegasus.name.toLowerCase();
      const look = PEGASUS_LOOK[pegasus.index];
      const palette = PEGASUS_PALETTES[slug];

      expect(palette).toBeDefined();
      expect(palette.coat.toLowerCase()).toBe(look.color.toLowerCase());
      expect(palette.accent.toLowerCase()).toBe(look.secondaryColor.toLowerCase());
    });
  });

  it("builds unique boxes for each sacred pegasus and a distinct locked palette", () => {
    const defaultBoxes = getPegasusBoxesById("pegasus");
    const auraBoxes = getPegasusBoxesById("pegasus-aura");
    const ignisBoxes = getPegasusBoxesById("pegasus-ignis");
    const lockedBoxes = getPegasusBoxesById("pegasus-aura-locked");

    expect(defaultBoxes.length).toBeGreaterThan(0);
    expect(auraBoxes.length).toBe(defaultBoxes.length);
    expect(ignisBoxes.length).toBe(defaultBoxes.length);
    expect(lockedBoxes.length).toBe(defaultBoxes.length);

    // Aura has spring green coat (#badc58)
    const auraCoatBox = auraBoxes.find((b) => b.color.toLowerCase() === "#badc58");
    expect(auraCoatBox).toBeDefined();

    // Ignis has crimson flame coat (#ff4757) and gold accent (#f1c40f)
    const ignisCoatBox = ignisBoxes.find((b) => b.color.toLowerCase() === "#ff4757");
    const ignisAccentBox = ignisBoxes.find((b) => b.color.toLowerCase() === "#f1c40f");
    expect(ignisCoatBox).toBeDefined();
    expect(ignisAccentBox).toBeDefined();

    // Locked boxes use dormant slate palette
    const lockedCoatBox = lockedBoxes.find((b) => b.color.toLowerCase() === PEGASUS_LOCKED_PALETTE.coat.toLowerCase());
    expect(lockedCoatBox).toBeDefined();
  });

  it("getBuildingBoxes routes all pegasus IDs properly", () => {
    const umbraBoxes = getBuildingBoxes("pegasus-umbra");
    const umbraLockedBoxes = getBuildingBoxes("pegasus-umbra-locked");

    expect(umbraBoxes.some((b) => b.color.toLowerCase() === "#130f40")).toBe(true);
    expect(umbraLockedBoxes.some((b) => b.color.toLowerCase() === PEGASUS_LOCKED_PALETTE.coat.toLowerCase())).toBe(true);
  });

  it("buildBuildingMeshData generates valid 3D geometry for pegasus models", () => {
    const meshData = buildBuildingMeshData("pegasus-ignis");
    expect(meshData.positions.length).toBeGreaterThan(0);
    expect(meshData.normals.length).toBeGreaterThan(0);
    expect(meshData.colors.length).toBeGreaterThan(0);
    expect(meshData.indices.length).toBeGreaterThan(0);
  });
});

describe("XpBuildingModel Pegasus Integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockRouteName = "world-plains";
    mockRouteParams = { userId: "hero-1" };

    const userStore = useUserStore();
    userStore.currentUser = {
      id: "hero-1",
      name: "Arthur",
      stats: {
        pegasi: [false, false, false, false, false, false, false, false, false],
      },
    } as any;
  });

  it("renders locked/faded when the world pegasus is not freed", () => {
    const wrapper = mount(XpBuildingModel, {
      props: {
        buildingId: "pegasus",
        world: "plains",
      },
    });

    expect(wrapper.classes()).toContain("is-locked");
    expect(wrapper.find(".landmark-title").text()).toBe("Travel World");
    expect(wrapper.attributes("title")).toBe("Enter Travel World");
  });

  it("renders unlocked with true name and unfaded style when freed", async () => {
    const userStore = useUserStore();
    // Aura is index 3 in stats.pegasi
    userStore.currentUser.stats.pegasi[3] = true;

    const wrapper = mount(XpBuildingModel, {
      props: {
        buildingId: "pegasus",
        world: "plains",
      },
    });

    expect(wrapper.classes()).not.toContain("is-locked");
    expect(wrapper.find(".landmark-title").text()).toBe("Aura");
    expect(wrapper.attributes("title")).toBe("Enter Aura");
  });

  it("automatically infers world from route.name when world prop is omitted", () => {
    mockRouteName = "world-mountains";
    const userStore = useUserStore();
    // Ignis is index 1
    userStore.currentUser.stats.pegasi[1] = true;

    const wrapper = mount(XpBuildingModel, {
      props: {
        buildingId: "pegasus",
      },
    });

    expect(wrapper.classes()).not.toContain("is-locked");
    expect(wrapper.find(".landmark-title").text()).toBe("Ignis");
  });

  it("clicking the pegasus navigates to the world-map", async () => {
    const wrapper = mount(XpBuildingModel, {
      props: {
        buildingId: "pegasus",
        world: "plains",
      },
    });

    await wrapper.trigger("click");
    expect(mockPush).toHaveBeenCalledWith({
      name: "world-map",
      params: { userId: "hero-1" },
    });
  });

  it("does not mistake pegasus-ranch for a fast travel pegasus statue", async () => {
    const ranchBoxes = getBuildingBoxes("pegasus-ranch");
    const pegasusBoxes = getBuildingBoxes("pegasus");
    // Pegasus Ranch barn uses red barn (#c62828)
    expect(ranchBoxes.some((b) => b.color.toLowerCase() === "#c62828")).toBe(true);
    expect(ranchBoxes.length).not.toBe(pegasusBoxes.length);

    const wrapper = mount(XpBuildingModel, {
      props: {
        buildingId: "pegasus-ranch",
        world: "plains",
      },
    });

    expect(wrapper.classes()).not.toContain("is-locked");
    expect(wrapper.find(".landmark-title").text()).toBe("Pegasus Ranch");

    await wrapper.trigger("click");
    expect(mockPush).toHaveBeenCalledWith({
      name: "shop",
      params: {
        merchant: "pegasus-ranch",
        userId: "hero-1",
      },
    });
  });
});
