/**
 * One lane for every Family Sync transfer, so no two ever overlap: an upload, a download, a round (upload, then
 * download, or the first push or pull while one is owed) and a catch-up (a round that reads on to the newest record, for
 * a hero's turn just taken) run one after another, in the order they were asked for. A page read while a put is out
 * could otherwise be checked against an outbox the put has just emptied, and land a copy older than the change the put
 * carried.
 *
 * A request made while a job waits to start joins that job (it has not read the outbox yet, so it carries the newest
 * changes too); asking for other work than it was asked for makes it a round, or a catch-up when either is one. A
 * request made while a job runs waits for the next one.
 */
export type Work = "upload" | "download" | "round" | "catchUp";

/** What one waiting job does when a second request joins it: the same work, a catch-up when either is one, else a round */
export const mergeWork = (a: Work, b: Work): Work => {
  const isSame = a === b;
  if (isSame) return a;
  const isCatchUp = a === "catchUp" || b === "catchUp";
  return isCatchUp ? "catchUp" : "round";
};

export interface WorkLane {
  /** Runs the work after the job that is running; resolves or rejects as the job does */
  request(work: Work): Promise<void>;
}

interface Job {
  work: Work;
  done: Promise<void>;
}

export const createWorkLane = (run: (work: Work) => Promise<void>): WorkLane => {
  let tail: Promise<void> = Promise.resolve();
  let waiting: Job | null = null;

  const request = (work: Work): Promise<void> => {
    if (waiting) {
      waiting.work = mergeWork(waiting.work, work);
      return waiting.done;
    }
    const job = { work } as Job;
    job.done = tail.then(() => {
      // It starts now: a request from here on is a job of its own
      waiting = null;
      return run(job.work);
    });
    waiting = job;
    tail = job.done.catch(() => undefined);
    return job.done;
  };

  return { request };
};
