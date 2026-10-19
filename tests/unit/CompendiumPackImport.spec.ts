import { readFileSync } from "fs";
import { resolve } from "path";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { CompendiumRoutes } from "@/router/Admin/compendium.routes";
import XpAccessoriesGlobalList from "@/app/Admin/XpCompendium/views/XpAccessories/components/XpAccessoriesGlobalList.vue";
import XpTemples from "@/app/Admin/XpCompendium/views/XpTemples/XpTemples.vue";

/**
 * GitHub issue 138: the Compendium's dead buttons. The accessories list and the temples list each had an import entry
 * that did nothing (or only toasted), and "Discover Accessories" pushed a route that does not exist. Now Import opens
 * the pack import flow Settings > Packs uses (a pack carries rewards, the accessories the shops sell), the discover
 * entry is gone, and the dashboard's "get started" goes to a real route.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
jest.mock("vue-router", () => ({ useRouter: () => ({ push: mockPush }), useRoute: () => ({ params: {} }) }));
jest.mock("@/hooks/useBack", () => ({ useBack: () => ({ stepBack: jest.fn() }) }));

const mockSheet = { present: jest.fn(async () => undefined) };
const mockCreateSheet = jest.fn(async (_options: unknown) => mockSheet);
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  actionSheetController: { create: (options: unknown) => mockCreateSheet(options) },
  onIonViewWillEnter: jest.fn(),
}));

const mockShelf = { added: { value: [] }, isBusy: { value: false }, refreshPacks: jest.fn(async () => undefined) };
const mockImportPackFile = jest.fn(async (_shelf: unknown) => undefined);
jest.mock("@/hooks/usePackLibrary", () => ({
  usePackLibrary: () => mockShelf,
  importPackFile: (shelf: unknown) => mockImportPackFile(shelf),
}));

jest.mock("@/lib/databases/AccessoriesDb", () => ({
  __esModule: true,
  default: class {
    async getAccessories() {
      return [];
    }
  },
  accessoriesStorage: {},
  Rarity: { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 },
}));

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  TempleDb: class {
    async getTempleById() {
      return null;
    }
  },
  templeStorage: { keys: async () => [] },
}));
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({ ensureBuiltInTemples: jest.fn(async () => undefined) }));

interface SheetButton {
  text: string;
  role?: string;
  handler?: () => void | Promise<void>;
}

const passthrough = { template: "<div><slot name='actions' /><slot /></div>" };
const stubs = { XpRpgPage: passthrough, XpTempleGenerateModal: true, XpBloodMoonModal: true };

beforeEach(() => {
  setActivePinia(createPinia());
  mockPush.mockClear();
  mockCreateSheet.mockClear();
  mockSheet.present.mockClear();
  mockShelf.refreshPacks.mockClear();
  mockImportPackFile.mockClear();
});

// Taps the page's FAB and hands back the buttons its action sheet was built with
const openSheet = async (wrapper: VueWrapper<any>): Promise<SheetButton[]> => {
  await flushPromises();
  await wrapper.find("ion-fab-button").trigger("click");
  await flushPromises();
  return (mockCreateSheet.mock.calls[0][0] as { buttons: SheetButton[] }).buttons;
};

const importButton = (buttons: SheetButton[]): SheetButton => {
  const found = buttons.find((button) => /^Import/.test(button.text));
  if (!found) throw new Error("No import button in the action sheet");
  return found;
};

describe("Accessories list actions", () => {
  const mountList = () => mount(XpAccessoriesGlobalList, { global: { stubs } });

  it("offers Create and Import, with no Discover Accessories (its route does not exist)", async () => {
    const buttons = await openSheet(mountList());

    expect(buttons.map((button) => button.text)).toEqual(["Create New Accessory", "Import a pack", "Cancel"]);
  });

  it("opens the pack import flow from Import a pack, after reading the packs already added", async () => {
    const buttons = await openSheet(mountList());

    await importButton(buttons).handler?.();

    expect(mockShelf.refreshPacks).toHaveBeenCalledTimes(1);
    expect(mockImportPackFile).toHaveBeenCalledWith(mockShelf);
    expect(mockShelf.refreshPacks.mock.invocationCallOrder[0]).toBeLessThan(mockImportPackFile.mock.invocationCallOrder[0]);
  });

  it("no longer pushes to a discover route", async () => {
    const buttons = await openSheet(mountList());

    for (const button of buttons) await button.handler?.();

    expect(mockPush.mock.calls.some(([target]) => target?.name === "xp-discover-accessories")).toBe(false);
  });
});

describe("Temples list actions", () => {
  const mountTemples = () => mount(XpTemples, { global: { stubs } });

  it("labels the import entry for what it opens, a pack, without Coming soon", async () => {
    const buttons = await openSheet(mountTemples());

    expect(buttons.map((button) => button.text)).toEqual([
      "Create New Temple",
      "Generate Temple",
      "Import a pack",
      "Cancel",
    ]);
  });

  it("opens the pack import flow from Import a pack instead of a Coming soon toast", async () => {
    const buttons = await openSheet(mountTemples());

    await importButton(buttons).handler?.();

    expect(mockShelf.refreshPacks).toHaveBeenCalledTimes(1);
    expect(mockImportPackFile).toHaveBeenCalledWith(mockShelf);
  });
});

describe("Compendium dashboard", () => {
  const routeNames = (routes: readonly { name?: unknown; children?: readonly any[] }[]): string[] =>
    routes.flatMap((route) => [...(typeof route.name === "string" ? [route.name] : []), ...routeNames(route.children ?? [])]);

  it("sends Get started to a route that exists, not the missing xp-main", () => {
    const source = readFileSync(resolve(__dirname, "../../src/app/Admin/XpCompendium/XpCompendiumDashboard.vue"), "utf8");
    const pushed = /const getStarted = \(\) => \{\s*router\.push\(\{ name: "([^"]+)" \}\);/.exec(source)?.[1];

    expect(pushed).toBeDefined();
    expect(pushed).not.toBe("xp-main");
    expect(routeNames(CompendiumRoutes)).toContain(pushed);
  });
});
