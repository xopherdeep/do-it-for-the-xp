import { patientChartOf, patientStatusOf } from "@/lib/services/hometown/patientChart";

/** The Hospital's Patients board reads each hero's chart from here: pure, so no store and no Ionic. */

describe("patientStatusOf", () => {
  it.each([
    [1, "healthy"],
    [0.75, "healthy"],
    [0.74, "hurt"],
    [0.26, "hurt"],
    [0.25, "critical"],
    [0.01, "critical"],
    [0, "down"],
  ])("an HP share of %p reads %p", (share, status) => {
    expect(patientStatusOf(share)).toBe(status);
  });
});

describe("patientChartOf", () => {
  it("reads a hurt hero's pools, share and label", () => {
    const chart = patientChartOf({ hp: { now: 15, max: 30 }, mp: { now: 10, max: 10 } });
    expect(chart.hp).toEqual({ now: 15, max: 30 });
    expect(chart.hpShare).toBe(0.5);
    expect(chart.status).toBe("hurt");
    expect(chart.label).toBe("Hurt");
    expect(chart.needsCare).toBe(true);
  });

  it("races the heart monitor as HP falls and flattens it at 0 HP", () => {
    const healthy = patientChartOf({ hp: { now: 30, max: 30 } }).beatSeconds;
    const hurt = patientChartOf({ hp: { now: 15, max: 30 } }).beatSeconds;
    const critical = patientChartOf({ hp: { now: 3, max: 30 } }).beatSeconds;
    expect(healthy).toBeGreaterThan(hurt);
    expect(hurt).toBeGreaterThan(critical);
    expect(critical).toBeGreaterThan(0);
    expect(patientChartOf({ hp: { now: 0, max: 30 } })).toMatchObject({ status: "down", beatSeconds: 0 });
  });

  it("needs no care at full HP and MP, and some when only MP is spent", () => {
    expect(patientChartOf({ hp: { now: 41, max: 41 }, mp: { now: 5, max: 5 } }).needsCare).toBe(false);
    expect(patientChartOf({ hp: { now: 41, max: 41 }, mp: { now: 1, max: 5 } }).needsCare).toBe(true);
  });

  it("clamps an overfull pool and survives an old save with no stats", () => {
    expect(patientChartOf({ hp: { now: 99, max: 30 } }).hpShare).toBe(1);
    expect(() => patientChartOf(undefined)).not.toThrow();
    expect(patientChartOf({ hp: { now: 5, max: 0 } })).toMatchObject({ hpShare: 0, status: "down" });
  });
});
