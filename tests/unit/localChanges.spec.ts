import { createLocalChanges } from "@/lib/services/sync/localChanges";

describe("createLocalChanges", () => {
  it("knows a record from the moment it is touched, by store and key", () => {
    const changes = createLocalChanges();
    changes.touch("__beasts", "b1");

    expect(changes.has("__beasts", "b1")).toBe(true);
    expect(changes.has("__chat", "b1")).toBe(false);
    expect(changes.has("__beasts", "b2")).toBe(false);
  });

  it("forgets a record the site settled as it was when it was read for the put", () => {
    const changes = createLocalChanges();
    changes.touch("__beasts", "b1");
    const mark = changes.markOf("__beasts", "b1");

    changes.settled("__beasts", "b1", mark);

    expect(changes.has("__beasts", "b1")).toBe(false);
  });

  it("keeps a record changed again after it was read: that change is not on the site yet", () => {
    const changes = createLocalChanges();
    changes.touch("__beasts", "b1");
    const mark = changes.markOf("__beasts", "b1");
    changes.touch("__beasts", "b1");

    changes.settled("__beasts", "b1", mark);

    expect(changes.has("__beasts", "b1")).toBe(true);
  });

  it("a record that was never touched has no mark, and settling it changes nothing", () => {
    const changes = createLocalChanges();
    expect(changes.markOf("__beasts", "b1")).toBeUndefined();
    changes.settled("__beasts", "b1", undefined);
    expect(changes.has("__beasts", "b1")).toBe(false);
  });

  it("clear forgets every record", () => {
    const changes = createLocalChanges();
    changes.touch("__beasts", "b1");
    changes.touch("__chat", "c1");
    changes.clear();
    expect(changes.has("__beasts", "b1")).toBe(false);
    expect(changes.has("__chat", "c1")).toBe(false);
  });
});
