import { FAMILY_COMING_SOON } from "@/app/SideMenu/XpSettings/components/comingSoon";

// Nothing locks, warns or blocks at bedtime yet, so the Family page lists it as Coming soon instead of a working switch
describe("Bedtime, parked until something reads it", () => {
  it("is listed as Coming soon on the Family page", () => {
    expect(FAMILY_COMING_SOON.map((item) => item.title)).toContain("Bedtime");
  });
});
