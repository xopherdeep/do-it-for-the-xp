import { createWorkLane, mergeWork, type Work } from "@/lib/services/sync/workLane";

/** A step the test lets go when it wants */
const held = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
};

const drain = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe("mergeWork", () => {
  it("keeps the same work, and makes a round of any two different ones", () => {
    expect(mergeWork("upload", "upload")).toBe("upload");
    expect(mergeWork("download", "download")).toBe("download");
    expect(mergeWork("upload", "download")).toBe("round");
    expect(mergeWork("download", "upload")).toBe("round");
    expect(mergeWork("round", "upload")).toBe("round");
    expect(mergeWork("download", "round")).toBe("round");
  });
});

describe("createWorkLane", () => {
  it("runs one job at a time, in the order asked", async () => {
    const log: string[] = [];
    const steps: Record<string, ReturnType<typeof held>> = { upload: held(), download: held() };
    const lane = createWorkLane(async (work: Work) => {
      log.push(`start ${work}`);
      await steps[work]?.promise;
      log.push(`end ${work}`);
    });

    const upload = lane.request("upload");
    await drain();
    const download = lane.request("download");
    await drain();
    expect(log).toEqual(["start upload"]);

    steps.upload.release();
    await drain();
    expect(log).toEqual(["start upload", "end upload", "start download"]);
    steps.download.release();
    await Promise.all([upload, download]);
    expect(log).toEqual(["start upload", "end upload", "start download", "end download"]);
  });

  it("a request while a job waits to start joins it, and widens it to a round when it asks for other work", async () => {
    const ran: Work[] = [];
    const first = held();
    const lane = createWorkLane(async (work: Work) => {
      ran.push(work);
      if (ran.length === 1) await first.promise;
    });

    const running = lane.request("upload");
    await drain();
    const waiting = lane.request("download");
    const joined = lane.request("upload");
    expect(joined).toBe(waiting);

    first.release();
    await Promise.all([running, waiting, joined]);
    expect(ran).toEqual(["upload", "round"]);
  });

  it("a request after the waiting job started is a job of its own", async () => {
    const ran: Work[] = [];
    const second = held();
    const lane = createWorkLane(async (work: Work) => {
      ran.push(work);
      if (ran.length === 2) await second.promise;
    });

    await lane.request("upload");
    const started = lane.request("download");
    await drain();
    const after = lane.request("download");
    expect(after).not.toBe(started);

    second.release();
    await Promise.all([started, after]);
    expect(ran).toEqual(["upload", "download", "download"]);
  });

  it("a job that rejects does not stop the ones after it", async () => {
    const ran: Work[] = [];
    const lane = createWorkLane(async (work: Work) => {
      ran.push(work);
      if (ran.length === 1) throw new Error("offline");
    });

    await expect(lane.request("upload")).rejects.toThrow("offline");
    await lane.request("download");
    expect(ran).toEqual(["upload", "download"]);
  });
});
