import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
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

// A reload on /xp-settings/account loads the profiles a moment after the page is set up. A Game Master check read once
// at setup said "not a Game Master" for good; behind a computed it follows the store (GitHub issue 133).
describe("Settings: Game Master checks follow the store", () => {
  const componentsDir = resolve(__dirname, "../../src/app/SideMenu/XpSettings/components");
  const sourceOf = (file: string) => readFileSync(resolve(componentsDir, file), "utf8");
  const GUARD_CALLS = /canManageFamily\(|canRestoreHere\(/;
  // `const x = canManageFamily(...)` at the top of a script is a one-time read; the same call inside computed(() => ...) is live
  const readOnceAtSetup = /^\s*const \w+ = (canManageFamily|canRestoreHere)\(/m;

  it("reads the Account page's Game Master check inside a computed", () => {
    const source = sourceOf("AccountSettings.vue");
    expect(source).toMatch(/const isGameMaster = computed\(\(\) => canManageFamily\(/);
    expect(source).not.toMatch(readOnceAtSetup);
  });

  it("loads the family link when the Game Master shows up after the page is open, not only at mount", () => {
    expect(sourceOf("AccountSettings.vue")).toMatch(/watch\(isGameMaster, loadAccount\)/);
  });

  it("has no Settings component that asks the question once at setup", () => {
    const files = readdirSync(componentsDir).filter((file) => file.endsWith(".vue"));
    const askers = files.filter((file) => GUARD_CALLS.test(sourceOf(file)));
    expect(askers.length).toBeGreaterThan(0);
    const readers = askers.filter((file) => readOnceAtSetup.test(sourceOf(file)));
    expect(readers).toEqual([]);
  });
});
