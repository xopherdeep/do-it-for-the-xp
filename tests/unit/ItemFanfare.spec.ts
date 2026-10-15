import { FANFARE_MS, useItemFanfare } from "@/app/Console/TempleGrounds/templeGrounds/useItemFanfare";

describe("holding a found item overhead", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the item with its line, then lets play go on", () => {
    const { fanfare, showFanfare } = useItemFanfare();
    showFanfare({ kind: "key", title: "Small Key" }, "You take Coral Key.");
    expect(fanfare.value).toEqual({ kind: "key", title: "Small Key", line: "You take Coral Key.", key: 1 });
    jest.advanceTimersByTime(FANFARE_MS);
    expect(fanfare.value).toBeNull();
  });

  it("ends on a tap", () => {
    const { fanfare, showFanfare, dismissFanfare } = useItemFanfare();
    showFanfare({ kind: "map", title: "Dungeon Map" });
    dismissFanfare();
    expect(fanfare.value).toBeNull();
  });

  it("replays for a second pickup and keeps it up for the full time", () => {
    const { fanfare, showFanfare } = useItemFanfare();
    showFanfare({ kind: "key", title: "Small Key" });
    jest.advanceTimersByTime(FANFARE_MS - 100);
    showFanfare({ kind: "boss-key", title: "Boss Key" });
    expect(fanfare.value?.key).toBe(2);
    jest.advanceTimersByTime(200);
    expect(fanfare.value?.kind).toBe("boss-key");
  });
});
