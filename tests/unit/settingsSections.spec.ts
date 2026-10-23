import { ALL_SETTINGS_ITEMS, SETTINGS_SECTIONS, sectionsFor } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/settingsSections";
import settingsRoutes from "@/router/SideMenu/settings.routes";

/** The Settings page lists every page under /xp-settings once, grouped. */
describe("the Settings page sections", () => {
  const items = ALL_SETTINGS_ITEMS;
  const pathsOf = (): string[] => {
    const root = Array.isArray(settingsRoutes) ? settingsRoutes[0] : (settingsRoutes as any);
    return (root.children ?? []).map((child: any) => child.path).filter((path: string) => path !== "");
  };

  it("lists no page twice and gives every row a title, a description and an icon", () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const routes = items.map((item) => item.route);
    expect(new Set(routes).size).toBe(routes.length);
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(typeof item.icon).toBe("string"); // an image path in the app, an empty stub under jest
    }
  });

  it("opens only pages that exist, and leaves none out", () => {
    const paths = pathsOf();
    expect(paths.length).toBeGreaterThan(0);
    const listed = items.map((item) => item.route.replace("/xp-settings/", ""));
    for (const route of listed) expect(paths).toContain(route);
    for (const path of paths) expect(listed).toContain(path);
  });

  it("groups the pages by the question they answer, with no empty group", () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual(["family", "game", "device", "account"]);
    for (const section of SETTINGS_SECTIONS) expect(section.items.length).toBeGreaterThan(0);
  });

  it("closes the page with XP Pro, outside the groups", () => {
    expect(ALL_SETTINGS_ITEMS[ALL_SETTINGS_ITEMS.length - 1].id).toBe("pro");
    expect(SETTINGS_SECTIONS.flatMap((section) => section.items).some((item) => item.id === "pro")).toBe(false);
  });
});

/** A hero's own phone (family sync, section 7): no Game Master pages, no backup, and a way to unlink the phone. */
describe("the Settings page on a kid phone", () => {
  const kidItems = () => sectionsFor({ isKidMode: true }).flatMap((section) => section.items);
  const idsOf = (list: { id: string }[]): string[] => list.map((entry) => entry.id);

  it("is the grown-up page unchanged when the phone is not a kid phone", () => {
    expect(sectionsFor({ isKidMode: false })).toEqual(SETTINGS_SECTIONS);
  });

  it("kid mode hides family, packs, general backup and account, and shows Unlink this phone", () => {
    const sections = sectionsFor({ isKidMode: true });
    expect(idsOf(sections)).toEqual(["game", "device"]);

    const ids = idsOf(kidItems());
    for (const hidden of ["family", "party", "packs", "account"]) expect(ids).not.toContain(hidden);
    expect(ids).toEqual(expect.arrayContaining(["chore", "reward", "notifications", "sound", "theme", "general"]));

    const general = kidItems().find((item) => item.id === "general");
    expect(general?.description).not.toMatch(/backup/i);

    const device = sections.find((section) => section.id === "device");
    const unlink = device?.items[device.items.length - 1];
    expect(unlink?.id).toBe("unlink-phone");
    expect(unlink?.title).toBe("Unlink this phone");
    expect(unlink?.action).toBe("unlink-phone");
  });

  it("offers Unlink this phone only on a kid phone", () => {
    const grownUp = sectionsFor({ isKidMode: false }).flatMap((section) => section.items);
    expect(idsOf(grownUp)).not.toContain("unlink-phone");
  });

  it("opens only pages that exist, apart from the row that unlinks", () => {
    const root = Array.isArray(settingsRoutes) ? settingsRoutes[0] : (settingsRoutes as any);
    const paths = (root.children ?? []).map((child: any) => child.path);
    for (const item of kidItems().filter((entry) => !entry.action)) {
      expect(paths).toContain(item.route.replace("/xp-settings/", ""));
    }
  });

  it("leaves the shared page untouched while building the kid one", () => {
    const before = JSON.stringify(SETTINGS_SECTIONS);
    sectionsFor({ isKidMode: true });
    expect(JSON.stringify(SETTINGS_SECTIONS)).toBe(before);
  });
});
