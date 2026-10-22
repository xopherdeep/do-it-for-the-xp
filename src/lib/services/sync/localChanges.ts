/**
 * The records changed on this device that the site has not settled yet, known from the moment of the write. The outbox
 * says the same once its save lands, but that save is a few awaits later: a download checks both, record by record, so a
 * write made while a page is landing is never overwritten by the site's older copy.
 *
 * Each change gets a mark. The upload notes the mark when it reads a record, and the record is forgotten only if the site
 * settled it and nothing changed it since (a change made while the put was out has not been sent).
 */
export interface LocalChanges {
  /** A write: called synchronously, before anything awaits */
  touch(store: string, key: string): void;
  /** The mark of the record's newest change, or undefined when it has none */
  markOf(store: string, key: string): number | undefined;
  /** The site settled the record as it was at `mark` (accepted, refused, or dropped for its size) */
  settled(store: string, key: string, mark: number | undefined): void;
  has(store: string, key: string): boolean;
  clear(): void;
}

const idOf = (store: string, key: string): string => JSON.stringify([store, key]);

export const createLocalChanges = (): LocalChanges => {
  const marks = new Map<string, number>();
  let lastMark = 0;
  return {
    touch: (store, key) => {
      lastMark += 1;
      marks.set(idOf(store, key), lastMark);
    },
    markOf: (store, key) => marks.get(idOf(store, key)),
    settled: (store, key, mark) => {
      const id = idOf(store, key);
      const isUnchanged = marks.get(id) === mark;
      if (isUnchanged) marks.delete(id);
    },
    has: (store, key) => marks.has(idOf(store, key)),
    clear: () => marks.clear(),
  };
};
