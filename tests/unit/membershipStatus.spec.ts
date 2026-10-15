import { membershipStatus, maskLicenseKey, proMenuIcon } from "@/lib/services/pro/membershipStatus";

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
