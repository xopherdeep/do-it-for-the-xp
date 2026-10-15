import { SettingsRoutes } from "@/router/SideMenu";
import { ACCOUNT_COMING_SOON } from "@/app/SideMenu/XpSettings/components/comingSoon";
import { FAQ_GROUPS, MANUAL_CHAPTERS } from "@/app/SideMenu/XpSupport/helpContent";

// Account settings need server accounts, which the app doesn't have: the row is parked as Coming soon
describe("Account settings, parked until there's a backend", () => {
  it("has a Settings route that opens the Coming soon page", () => {
    const children = SettingsRoutes[0].children ?? [];
    const account = children.find((r) => r.path === "account");
    expect(account?.name).toBe("xp-settings-account");
  });

  it("lists what the page will hold: sign-in details, password, plan and linked accounts", () => {
    const titles = ACCOUNT_COMING_SOON.map((item) => item.title.toLowerCase()).join(" ");
    for (const word of ["email", "username", "password", "plan", "linked"]) expect(titles).toContain(word);
  });

  it("explains in the Help Desk why the row is greyed out", () => {
    const faq = FAQ_GROUPS.flatMap((g) => g.entries).find((e) => e.question.includes("Account"));
    expect(faq?.answer).toMatch(/server/);
    const data = MANUAL_CHAPTERS.find((c) => c.id === "data");
    expect(data?.steps.some((step) => step.includes("Settings, Account"))).toBe(true);
  });
});
