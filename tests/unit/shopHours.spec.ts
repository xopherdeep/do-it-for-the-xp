import {
  DEFAULT_SHOP_HOURS,
  clockToMinutes,
  formatClock,
  hoursSummary,
  isShopOpen,
  openMinutesPerDay,
  opensAtLabel,
} from "@/lib/services/shops/shopHours";

// Local clock times on a fixed day: the hours are the shop's local time, so no time zone is involved.
const at = (hours: number, minutes = 0) => new Date(2026, 9, 10, hours, minutes);

const DAY = { open: "07:00", close: "21:00" };
const NIGHT = { open: "20:00", close: "02:00" };

describe("clockToMinutes", () => {
  it("reads HH:MM", () => {
    expect(clockToMinutes("00:00")).toBe(0);
    expect(clockToMinutes("07:05")).toBe(425);
    expect(clockToMinutes("7:05")).toBe(425);
    expect(clockToMinutes("23:59")).toBe(1439);
  });

  it("rejects anything that is not a clock time", () => {
    for (const bad of ["24:00", "07:60", "7", "noon", "", "07:00 AM", null, undefined, 700]) {
      expect(clockToMinutes(bad)).toBeNull();
    }
  });
});

describe("formatClock", () => {
  it("writes 12 hour times", () => {
    expect(formatClock("07:00")).toBe("7:00 AM");
    expect(formatClock("21:30")).toBe("9:30 PM");
    expect(formatClock("00:00")).toBe("12:00 AM");
    expect(formatClock("00:15")).toBe("12:15 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
    expect(formatClock("12:30")).toBe("12:30 PM");
    expect(formatClock("23:59")).toBe("11:59 PM");
  });

  it("hands back text it cannot read", () => {
    expect(formatClock("soon")).toBe("soon");
  });
});

describe("isShopOpen", () => {
  it("is always open without hours", () => {
    expect(isShopOpen(null, at(3))).toBe(true);
    expect(isShopOpen(undefined, at(3))).toBe(true);
  });

  it("is open when the hours cannot be read, so bad data never locks a hero out", () => {
    expect(isShopOpen({ open: "soon", close: "21:00" }, at(3))).toBe(true);
    expect(isShopOpen({ open: "07:00", close: "" }, at(3))).toBe(true);
  });

  it("is open round the clock when it opens and closes at the same minute", () => {
    const same = { open: "09:00", close: "09:00" };
    expect(isShopOpen(same, at(2))).toBe(true);
    expect(isShopOpen(same, at(9))).toBe(true);
    expect(isShopOpen(same, at(23, 59))).toBe(true);
  });

  it("opens on the opening minute and is closed on the closing minute", () => {
    expect(isShopOpen(DAY, at(6, 59))).toBe(false);
    expect(isShopOpen(DAY, at(7, 0))).toBe(true);
    expect(isShopOpen(DAY, at(12, 0))).toBe(true);
    expect(isShopOpen(DAY, at(20, 59))).toBe(true);
    expect(isShopOpen(DAY, at(21, 0))).toBe(false);
    expect(isShopOpen(DAY, at(23, 59))).toBe(false);
    expect(isShopOpen(DAY, at(0, 0))).toBe(false);
  });

  it("runs an overnight range through midnight", () => {
    expect(isShopOpen(NIGHT, at(19, 59))).toBe(false);
    expect(isShopOpen(NIGHT, at(20, 0))).toBe(true);
    expect(isShopOpen(NIGHT, at(23, 59))).toBe(true);
    expect(isShopOpen(NIGHT, at(0, 0))).toBe(true);
    expect(isShopOpen(NIGHT, at(1, 59))).toBe(true);
    expect(isShopOpen(NIGHT, at(2, 0))).toBe(false);
    expect(isShopOpen(NIGHT, at(12, 0))).toBe(false);
  });

  it("closes at midnight", () => {
    const untilMidnight = { open: "08:00", close: "00:00" };
    expect(isShopOpen(untilMidnight, at(7, 59))).toBe(false);
    expect(isShopOpen(untilMidnight, at(8, 0))).toBe(true);
    expect(isShopOpen(untilMidnight, at(23, 59))).toBe(true);
    expect(isShopOpen(untilMidnight, at(0, 0))).toBe(false);
  });

  it("opens at midnight", () => {
    const fromMidnight = { open: "00:00", close: "06:00" };
    expect(isShopOpen(fromMidnight, at(23, 59))).toBe(false);
    expect(isShopOpen(fromMidnight, at(0, 0))).toBe(true);
    expect(isShopOpen(fromMidnight, at(5, 59))).toBe(true);
    expect(isShopOpen(fromMidnight, at(6, 0))).toBe(false);
  });

  it("ignores seconds within a minute", () => {
    expect(isShopOpen(DAY, new Date(2026, 9, 10, 20, 59, 59))).toBe(true);
    expect(isShopOpen(DAY, new Date(2026, 9, 10, 21, 0, 0))).toBe(false);
  });
});

describe("opensAtLabel", () => {
  it("says nothing while the shop is open", () => {
    expect(opensAtLabel(DAY, at(12))).toBe("");
    expect(opensAtLabel(NIGHT, at(1))).toBe("");
  });

  it("says nothing without hours", () => {
    expect(opensAtLabel(null, at(3))).toBe("");
    expect(opensAtLabel(undefined, at(3))).toBe("");
  });

  it("names the opening time when it is later today", () => {
    expect(opensAtLabel(DAY, at(3))).toBe("Opens at 7:00 AM");
    expect(opensAtLabel(DAY, at(6, 59))).toBe("Opens at 7:00 AM");
    expect(opensAtLabel({ open: "07:30", close: "21:00" }, at(5))).toBe("Opens at 7:30 AM");
  });

  it("names tomorrow when today's hours are over", () => {
    expect(opensAtLabel(DAY, at(21, 0))).toBe("Opens tomorrow at 7:00 AM");
    expect(opensAtLabel(DAY, at(23, 59))).toBe("Opens tomorrow at 7:00 AM");
  });

  it("counts an overnight shop's daytime as later today", () => {
    expect(opensAtLabel(NIGHT, at(2, 0))).toBe("Opens at 8:00 PM");
    expect(opensAtLabel(NIGHT, at(19, 59))).toBe("Opens at 8:00 PM");
  });

  it("handles the midnight edges", () => {
    const untilMidnight = { open: "08:00", close: "00:00" };
    expect(opensAtLabel(untilMidnight, at(0, 0))).toBe("Opens at 8:00 AM");
    expect(opensAtLabel({ open: "00:00", close: "06:00" }, at(6, 0))).toBe("Opens tomorrow at 12:00 AM");
    expect(opensAtLabel({ open: "12:00", close: "18:00" }, at(9))).toBe("Opens at 12:00 PM");
  });
});

describe("hoursSummary", () => {
  it("reads always open for no hours", () => {
    expect(hoursSummary(null)).toBe("Always open");
    expect(hoursSummary(undefined)).toBe("Always open");
    expect(hoursSummary({ open: "09:00", close: "09:00" })).toBe("Always open");
  });

  it("writes the range", () => {
    expect(hoursSummary(DAY)).toBe("7:00 AM to 9:00 PM");
    expect(hoursSummary(NIGHT)).toBe("8:00 PM to 2:00 AM");
  });
});

describe("openMinutesPerDay", () => {
  it("counts the open window, overnight ranges included", () => {
    expect(openMinutesPerDay(DAY)).toBe(14 * 60);
    expect(openMinutesPerDay(NIGHT)).toBe(6 * 60);
    expect(openMinutesPerDay({ open: "08:00", close: "00:00" })).toBe(16 * 60);
  });

  it("is a whole day without hours", () => {
    expect(openMinutesPerDay(null)).toBe(24 * 60);
  });
});

describe("DEFAULT_SHOP_HOURS", () => {
  it("is a readable, closing-after-opening range", () => {
    expect(isShopOpen(DEFAULT_SHOP_HOURS, at(12))).toBe(true);
    expect(isShopOpen(DEFAULT_SHOP_HOURS, at(3))).toBe(false);
  });
});
