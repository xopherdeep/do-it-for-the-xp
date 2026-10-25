import {
  membershipStatus,
  maskLicenseKey,
  proMenuIcon,
  keyInactiveMessage,
  membershipOf,
  KEY_INACTIVE_MESSAGE,
} from "@/lib/services/pro/membershipStatus";
import { PRO_PLANS } from "@/lib/services/pro/proPlans";

const KEY = "XP-PRO-AAAA-BBBB-CCCC";

describe("membershipStatus", () => {
  it("is Free with no license", () => {
    const s = membershipStatus({ isPro: false, plan: null, expiresAt: null, licenseKey: "" });
    expect(s).toMatchObject({ state: "free", label: "Free", planName: "", dateLine: "", maskedKey: "", canManage: false });
  });

  it("is Active on a monthly subscription, with the renew date and the masked key", () => {
    const s = membershipStatus({ isPro: true, plan: "monthly", expiresAt: "2099-03-15T12:00:00Z", licenseKey: KEY });
    expect(s.state).toBe("active");
    expect(s.label).toBe("Active");
    expect(s.planName).toBe("Monthly");
    expect(s.dateLine).toBe("Renews Mar 15, 2099");
    expect(s.maskedKey).toBe("XP-PRO-****-****-CCCC");
    expect(s.canManage).toBe(true);
  });

  it("names the yearly plan", () => {
    const s = membershipStatus({ isPro: true, plan: "yearly", expiresAt: "2099-01-01T12:00:00Z", licenseKey: KEY });
    expect(s.planName).toBe("Yearly");
  });

  it("is Lifetime with no date and nothing to manage, even when the server sent a date", () => {
    const s = membershipStatus({ isPro: true, plan: "lifetime", expiresAt: "2099-01-01T12:00:00Z", licenseKey: KEY });
    expect(s).toMatchObject({ state: "lifetime", label: "Lifetime", planName: "Founder's Lifetime", dateLine: "", canManage: false });
  });

  it("is Expired when a license is on file but Pro is off", () => {
    const s = membershipStatus({ isPro: false, plan: "yearly", expiresAt: "2020-06-01T12:00:00Z", licenseKey: KEY });
    expect(s).toMatchObject({ state: "expired", label: "Expired", planName: "Yearly", dateLine: "Ended Jun 1, 2020", canManage: false });
  });

  it("ignores an unreadable date", () => {
    const s = membershipStatus({ isPro: true, plan: "monthly", expiresAt: "nonsense", licenseKey: KEY });
    expect(s.dateLine).toBe("");
  });
});

describe("maskLicenseKey and proMenuIcon", () => {
  it("shows only the last group", () => {
    expect(maskLicenseKey(KEY)).toBe("XP-PRO-****-****-CCCC");
    expect(maskLicenseKey("")).toBe("");
  });

  it("picks sun, moon or ribbon", () => {
    expect(proMenuIcon(true, "yearly")).toBe("sun");
    expect(proMenuIcon(true, "lifetime")).toBe("sun");
    expect(proMenuIcon(true, "monthly")).toBe("moon");
    expect(proMenuIcon(false, "monthly")).toBe("ribbon");
    expect(proMenuIcon(false, null)).toBe("ribbon");
  });
});

describe("membershipStatus: why Pro is off", () => {
  const NOW = new Date("2026-10-25T12:00:00Z");
  const off = (over: Record<string, unknown> = {}) =>
    membershipStatus({ isPro: false, plan: "monthly", expiresAt: null, licenseKey: KEY, now: NOW, ...over } as any);

  it("has no reason while Pro is on, even after a failed check", () => {
    const s = membershipStatus({
      isPro: true,
      plan: "yearly",
      expiresAt: "2099-01-01T12:00:00Z",
      licenseKey: KEY,
      lastError: "network",
      now: NOW,
    });
    expect(s.reason).toBeNull();
    expect(s.reasonLine).toBe("");
  });

  it("has no reason for a family that never had a license", () => {
    const s = membershipStatus({ isPro: false, plan: null, expiresAt: null, licenseKey: "", now: NOW });
    expect(s.reason).toBeNull();
    expect(s.reasonLine).toBe("");
  });

  it("says the trial ended when the first period was no longer than the plan's trial", () => {
    const s = off({ memberSince: "2026-10-13T12:00:00Z", expiresAt: "2026-10-20T12:00:00Z" });
    expect(s.reason).toBe("trial-ended");
    expect(s.reasonLine).toBe("Your trial ended Oct 20, 2026");
  });

  it("reads the trial length from the plan table: exactly trial_days is a trial, a day more is a paid period", () => {
    const days = PRO_PLANS.yearly.trialDays;
    expect(days).toBe(7);
    const start = new Date("2026-09-01T12:00:00Z").getTime();
    const endAfter = (n: number) => new Date(start + n * 86400000).toISOString();
    const since = new Date(start).toISOString();
    expect(off({ plan: "yearly", memberSince: since, expiresAt: endAfter(days) }).reason).toBe("trial-ended");
    expect(off({ plan: "yearly", memberSince: since, expiresAt: endAfter(days + 1) }).reason).toBe("period-ended");
  });

  it("says the plan ended for a paid period, and when the start of the key is not known", () => {
    const paid = off({ plan: "yearly", memberSince: "2025-10-20T12:00:00Z", expiresAt: "2026-10-20T12:00:00Z" });
    expect(paid.reason).toBe("period-ended");
    expect(paid.reasonLine).toBe("Your plan ended Oct 20, 2026");
    const unknownStart = off({ expiresAt: "2026-10-20T12:00:00Z" });
    expect(unknownStart.reason).toBe("period-ended");
    expect(unknownStart.reasonLine).toBe("Your plan ended Oct 20, 2026");
  });

  it("never calls a lifetime plan a trial", () => {
    const s = off({ plan: "lifetime", memberSince: "2026-10-18T12:00:00Z", expiresAt: "2026-10-20T12:00:00Z" });
    expect(s.reason).toBe("period-ended");
  });

  it("has no date reason when the period has not ended or the date is unreadable", () => {
    expect(off({ expiresAt: "2026-11-20T12:00:00Z" }).reason).toBeNull();
    expect(off({ expiresAt: "nonsense" }).reason).toBeNull();
    expect(off({ expiresAt: null }).reason).toBeNull();
  });

  it("explains a test-mode license on a production build, ahead of any date", () => {
    const s = off({ env: "sandbox", productionBuild: true, expiresAt: "2026-10-20T12:00:00Z" });
    expect(s.reason).toBe("sandbox-in-production");
    expect(s.reasonLine).toBe("This is a test-mode license; it only works in development builds");
  });

  it("does not blame the sandbox on a development build or a production license", () => {
    expect(off({ env: "sandbox", productionBuild: false }).reason).toBeNull();
    expect(off({ env: "production", productionBuild: true }).reason).toBeNull();
    const noKey = membershipStatus({ isPro: false, plan: null, expiresAt: null, licenseKey: "", env: "sandbox", productionBuild: true });
    expect(noKey.reason).toBeNull();
  });

  it("explains the device limit, with or without a license on file", () => {
    const withKey = off({ lastError: "device_limit" });
    expect(withKey.reason).toBe("device-limit");
    expect(withKey.reasonLine).toBe("This key is already on 10 devices");
    const free = membershipStatus({ isPro: false, plan: null, expiresAt: null, licenseKey: "", lastError: "device_limit" });
    expect(free.reason).toBe("device-limit");
    expect(free.state).toBe("free");
  });

  it("says the shopkeeper could not be reached when the last check failed and nothing else explains it", () => {
    for (const lastError of ["network", "server", "rate_limited"] as const) {
      const s = off({ lastError });
      expect(s.reason).toBe("unreachable");
      expect(s.reasonLine).toBe("The shopkeeper could not be reached; showing the last known state");
    }
    const free = membershipStatus({ isPro: false, plan: null, expiresAt: null, licenseKey: "", lastError: "network" });
    expect(free.reason).toBe("unreachable");
  });

  it("keeps a known lapse ahead of unreachable, and the device limit ahead of a lapse", () => {
    const lapsed = { memberSince: "2026-10-13T12:00:00Z", expiresAt: "2026-10-20T12:00:00Z" };
    expect(off({ ...lapsed, lastError: "network" }).reason).toBe("trial-ended");
    expect(off({ ...lapsed, lastError: "device_limit" }).reason).toBe("device-limit");
  });

  it("ignores errors that do not say why Pro is off", () => {
    for (const lastError of ["invalid_input", "pro_required", "daily_limit", null] as const) {
      expect(off({ lastError }).reason).toBeNull();
    }
  });

  it("uses no em dashes in any reason line", () => {
    const lines = [
      off({ memberSince: "2026-10-13T12:00:00Z", expiresAt: "2026-10-20T12:00:00Z" }),
      off({ expiresAt: "2026-10-20T12:00:00Z" }),
      off({ env: "sandbox", productionBuild: true }),
      off({ lastError: "device_limit" }),
      off({ lastError: "network" }),
    ].map((s) => s.reasonLine);
    lines.forEach((line) => {
      expect(line).not.toBe("");
      expect(line).not.toContain("\u2014");
    });
  });
});

describe("keyInactiveMessage", () => {
  it("keeps the plain message when there is no reason", () => {
    expect(KEY_INACTIVE_MESSAGE).toBe("That key is not active right now.");
    expect(keyInactiveMessage("")).toBe("That key is not active right now.");
  });

  it("appends the reason as a second sentence", () => {
    expect(keyInactiveMessage("Your trial ended Oct 20, 2026")).toBe(
      "That key is not active right now. Your trial ended Oct 20, 2026."
    );
  });
});

describe("membershipOf", () => {
  const sandboxKey = { isPro: false, plan: "monthly", expiresAt: null, licenseKey: KEY, env: "sandbox" } as const;
  const withNodeEnv = (value: string, run: () => void) => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = value;
    try {
      run();
    } finally {
      process.env.NODE_ENV = original;
    }
  };

  it("reads the build: a test-mode license is the reason on a production build only", () => {
    withNodeEnv("production", () => expect(membershipOf(sandboxKey).reason).toBe("sandbox-in-production"));
    withNodeEnv("development", () => expect(membershipOf(sandboxKey).reason).toBeNull());
  });

  it("works with just the four fields the store always has", () => {
    const s = membershipOf({ isPro: false, plan: null, expiresAt: null, licenseKey: "" });
    expect(s).toMatchObject({ state: "free", reason: null, reasonLine: "" });
  });

  it("passes the clock, the last error and the first-seen date through", () => {
    const s = membershipOf(
      {
        isPro: false,
        plan: "monthly",
        expiresAt: "2026-10-20T12:00:00Z",
        licenseKey: KEY,
        memberSince: "2026-10-14T12:00:00Z",
        lastError: "network",
      },
      new Date("2026-10-25T12:00:00Z")
    );
    expect(s.reason).toBe("trial-ended");
  });
});
