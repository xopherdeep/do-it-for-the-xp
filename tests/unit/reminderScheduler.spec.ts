import {
  REBOOK_EVERY_MS,
  createReminderScheduler,
  uniqueHeroIds,
} from "@/lib/services/notifications/reminderScheduler";
import type { ReminderSchedulerDeps } from "@/lib/services/notifications/reminderScheduler";

/** The app-level reminder scheduler: which heroes to book, when, and that doing it twice never doubles up. No platform calls. */
const NOON = new Date(2026, 9, 18, 12, 0);

/** Let every queued promise callback run. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

/** A manual clock: `every` hands the tick back so a spec can ring it, and counts what is still running. */
const fakeClock = () => {
  const timers = new Map<number, () => void>();
  let next = 0;
  return {
    every: (_ms: number, tick: () => void) => {
      const id = next++;
      timers.set(id, tick);
      return () => void timers.delete(id);
    },
    ring: () => timers.forEach((tick) => tick()),
    running: () => timers.size,
  };
};

const build = (overrides: Partial<ReminderSchedulerDeps> = {}) => {
  const clock = fakeClock();
  const booked: string[] = [];
  const started: string[] = [];
  const stopped: string[] = [];
  const state = { heroes: ["kid-1", "kid-2", "mom"], gm: null as string | null, device: true };
  const deps: ReminderSchedulerDeps = {
    heroIds: () => state.heroes,
    gameMasterId: () => state.gm,
    canBook: () => state.device,
    bookReminders: async (heroId) => void booked.push(heroId),
    startApprovalWatch: (gmId) => {
      started.push(gmId);
      return () => void stopped.push(gmId);
    },
    now: () => NOON,
    every: clock.every,
    ...overrides,
  };
  return { scheduler: createReminderScheduler(deps), clock, booked, started, stopped, state };
};

describe("uniqueHeroIds", () => {
  it("lists each hero once, as text, and skips blanks", () => {
    expect(uniqueHeroIds(["a", "b", "a", "", null as any, 7 as any])).toEqual(["a", "b", "7"]);
  });
});

describe("reminderScheduler booking", () => {
  it("books every hero on the device, not only the one signed in", async () => {
    const { scheduler, booked } = build();
    await scheduler.wake();
    expect(booked).toEqual(["kid-1", "kid-2", "mom"]);
  });

  it("hands each booking the moment of the wake", async () => {
    const calls: Array<[string, Date]> = [];
    const { scheduler } = build({ bookReminders: async (heroId, now) => void calls.push([heroId, now]) });
    await scheduler.wake();
    expect(calls.map(([, at]) => at)).toEqual([NOON, NOON, NOON]);
  });

  it("goes on with the next hero when one booking fails", async () => {
    const booked: string[] = [];
    const { scheduler } = build({
      bookReminders: async (heroId) => {
        if (heroId === "kid-1") throw new Error("board unreadable");
        booked.push(heroId);
      },
    });
    await scheduler.wake();
    expect(booked).toEqual(["kid-2", "mom"]);
  });

  it("books nobody where reminders cannot reach a device (the browser)", async () => {
    const { scheduler, booked, state } = build();
    state.device = false;
    await scheduler.wake();
    expect(booked).toEqual([]);
  });

  it("books a hero added since the last wake on the next one", async () => {
    const { scheduler, booked, state } = build();
    await scheduler.wake();
    state.heroes = [...state.heroes, "kid-3"];
    booked.length = 0;
    await scheduler.wake();
    expect(booked).toEqual(["kid-1", "kid-2", "mom", "kid-3"]);
  });

  it("never books one hero twice at once: wakes during a pass fold into one more pass", async () => {
    let live = 0;
    let mostAtOnce = 0;
    const release: Array<() => void> = [];
    const booked: string[] = [];
    const { scheduler } = build({
      heroIds: () => ["kid-1"],
      bookReminders: (heroId) => {
        live += 1;
        mostAtOnce = Math.max(mostAtOnce, live);
        return new Promise<void>((resolve) =>
          release.push(() => {
            live -= 1;
            booked.push(heroId);
            resolve();
          })
        );
      },
    });
    const first = scheduler.wake();
    const second = scheduler.wake();
    const third = scheduler.wake();
    await settle();
    expect(release).toHaveLength(1);
    release[0]();
    await settle();
    // the three wakes asked for one pass in flight and one more after it, not three
    expect(release).toHaveLength(2);
    release[1]();
    await Promise.all([first, second, third]);
    expect(booked).toEqual(["kid-1", "kid-1"]);
    expect(mostAtOnce).toBe(1);
  });

  it("books again on the next quiet wake once a pass is over", async () => {
    const { scheduler, booked } = build({ heroIds: () => ["kid-1"] });
    await scheduler.wake();
    await scheduler.wake();
    expect(booked).toEqual(["kid-1", "kid-1"]);
  });
});

describe("reminderScheduler rebooking clock", () => {
  it("rebooks on a timer so a finished chore's reminder is taken back, with one timer however many wakes", async () => {
    const { scheduler, clock, booked } = build({ heroIds: () => ["kid-1"] });
    await scheduler.wake();
    await scheduler.wake();
    await scheduler.wake();
    expect(clock.running()).toBe(1);
    booked.length = 0;
    clock.ring();
    await settle();
    expect(booked).toEqual(["kid-1"]);
  });

  it("asks for the five-minute beat the quest watch always kept", () => {
    const seen: number[] = [];
    const { scheduler } = build({
      every: (ms) => {
        seen.push(ms);
        return () => undefined;
      },
    });
    void scheduler.wake();
    expect(seen).toEqual([REBOOK_EVERY_MS]);
    expect(REBOOK_EVERY_MS).toBe(5 * 60 * 1000);
  });

  it("starts no timer in the browser, where there is nothing to rebook", async () => {
    const { scheduler, clock, state } = build();
    state.device = false;
    await scheduler.wake();
    expect(clock.running()).toBe(0);
  });

  it("stop() ends the timer and the approval watch", async () => {
    const { scheduler, clock, state, stopped } = build();
    state.gm = "dad";
    await scheduler.wake();
    scheduler.stop();
    expect(clock.running()).toBe(0);
    expect(stopped).toEqual(["dad"]);
  });

  it("can be woken again after stop()", async () => {
    const { scheduler, clock, booked, state } = build({ heroIds: () => ["kid-1"] });
    await scheduler.wake();
    scheduler.stop();
    booked.length = 0;
    state.gm = "dad";
    await scheduler.wake();
    expect(booked).toEqual(["kid-1"]);
    expect(clock.running()).toBe(1);
  });
});

describe("reminderScheduler approval watch", () => {
  it("starts when a Game Master is signed in, wherever they stand in the app", async () => {
    const { scheduler, started, state } = build();
    state.gm = "dad";
    await scheduler.wake();
    expect(started).toEqual(["dad"]);
  });

  it("starts in the browser too: the watch rings the feed there", async () => {
    const { scheduler, started, state } = build();
    state.gm = "dad";
    state.device = false;
    await scheduler.wake();
    expect(started).toEqual(["dad"]);
  });

  it("does not start for a hero, or for nobody", async () => {
    const { scheduler, started } = build();
    await scheduler.wake();
    expect(started).toEqual([]);
  });

  it("starts once for the same Game Master however many wakes come (a portal mounting, a resume)", async () => {
    const { scheduler, started, stopped, state } = build();
    state.gm = "dad";
    await scheduler.wake();
    await scheduler.wake();
    await scheduler.wake();
    expect(started).toEqual(["dad"]);
    expect(stopped).toEqual([]);
  });

  it("stops when the Game Master signs out", async () => {
    const { scheduler, started, stopped, state } = build();
    state.gm = "dad";
    await scheduler.wake();
    state.gm = null;
    await scheduler.wake();
    expect(started).toEqual(["dad"]);
    expect(stopped).toEqual(["dad"]);
  });

  it("swaps the watch when a different Game Master signs in", async () => {
    const { scheduler, started, stopped, state } = build();
    state.gm = "dad";
    await scheduler.wake();
    state.gm = "mom";
    await scheduler.wake();
    expect(started).toEqual(["dad", "mom"]);
    expect(stopped).toEqual(["dad"]);
  });

  it("starts the watch again after a sign out and back in", async () => {
    const { scheduler, started, state } = build();
    state.gm = "dad";
    await scheduler.wake();
    state.gm = null;
    await scheduler.wake();
    state.gm = "dad";
    await scheduler.wake();
    expect(started).toEqual(["dad", "dad"]);
  });

  it("keeps booking heroes when the approval watch cannot start", async () => {
    const { scheduler, booked, state } = build({
      startApprovalWatch: () => {
        throw new Error("no storage");
      },
    });
    state.gm = "dad";
    await scheduler.wake();
    expect(booked).toEqual(["kid-1", "kid-2", "mom"]);
  });
});
