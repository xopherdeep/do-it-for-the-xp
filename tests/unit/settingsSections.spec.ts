import { SETTINGS_SECTIONS } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/settingsSections";
import settingsRoutes from "@/router/SideMenu/settings.routes";

/** The Settings page lists every page under /xp-settings once, grouped. */
describe("the Settings page sections", () => {
  const items = SETTINGS_SECTIONS.flatMap((section) => section.items);
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
});
