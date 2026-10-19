import { createAppRouter } from "@/router";

describe("the catch-all route", () => {
  const router = createAppRouter();

  it("sends an address nothing lives at to the lost-traveller page, without asking for a sign-in", () => {
    const route = router.resolve("/does-not-exist");

    expect(route.name).toBe("not-found");
    expect(route.meta.requiresAuth).toBe(false);
  });

  it("catches deep addresses too", () => {
    expect(router.resolve("/totally/made/up").name).toBe("not-found");
  });

  it("leaves real routes alone", () => {
    expect(router.resolve("/xp-profile").name).toBe("xp-profile");
    expect(router.resolve("/log-in").name).toBe("log-in");
  });
});
