import { SettingsRoutes } from "@/router/SideMenu";
import { ACCOUNT_COMING_SOON } from "@/app/SideMenu/XpSettings/components/comingSoon";
import { FAQ_GROUPS, MANUAL_CHAPTERS } from "@/app/SideMenu/XpSupport/helpContent";
import { ALL_SETTINGS_ITEMS } from "@/app/SideMenu/XpSettings/components/XpSettingsHome/settingsSections";

// Settings, Account is the menu's way to the family's Town Hall link; only social sign-in is still planned
describe("Account settings", () => {
  it("has a Settings route for the Account page", () => {
    const children = SettingsRoutes[0].children ?? [];
    const account = children.find((r) => r.path === "account");
    expect(account?.name).toBe("xp-settings-account");
  });

  it("lists only Google and Apple sign-in as planned", () => {
    const titles = ACCOUNT_COMING_SOON.map((item) => item.title);
    expect(titles).toEqual(["Sign in with Google", "Sign in with Apple"]);
  });

  it("explains in the Help Desk what the page does", () => {
    const faq = FAQ_GROUPS.flatMap((g) => g.entries).find((e) => e.question.includes("Account"));
    expect(faq?.answer).toMatch(/Town Hall/);
    const data = MANUAL_CHAPTERS.find((c) => c.id === "data");
    expect(data?.steps.some((step) => step.includes("Settings, Account"))).toBe(true);
  });

  it("shows the Account tile as a live setting", () => {
    const account = ALL_SETTINGS_ITEMS.find((item) => item.id === "account");
    expect(account?.soon).toBeUndefined();
    expect(account?.route).toBe("/xp-settings/account");
  });
});
