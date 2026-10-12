import { v4 as uuidv4 } from "uuid";
import { getProDb, ProState } from "@/lib/databases/ProDb";

const newFamilyId = () => uuidv4().toLowerCase();
/** 16 characters of [A-Za-z0-9] (hex from a v4 UUID is a subset). */
const newDeviceId = () => uuidv4().replace(/-/g, "").slice(0, 16);

let pending: Promise<ProState> | null = null;

async function loadOrCreate(): Promise<ProState> {
  const db = getProDb();
  const stored = await db.getState();
  if (stored?.familyId && stored?.deviceId) return stored;
  const state: ProState = {
    familyId: stored?.familyId || newFamilyId(),
    deviceId: stored?.deviceId || newDeviceId(),
    license: stored?.license ?? null,
  };
  await db.saveState(state);
  return state;
}

/** The family and device ids for this install; created once on first use and stable after. */
export async function ensureIdentity(): Promise<{ familyId: string; deviceId: string }> {
  if (!pending) {
    pending = loadOrCreate().catch((e) => {
      pending = null;
      throw e;
    });
  }
  const { familyId, deviceId } = await pending;
  return { familyId, deviceId };
}

/** Join an existing family after a restore: new familyId, same deviceId, license untouched. */
export async function adoptFamily(familyId: string): Promise<void> {
  const current = await (pending ?? loadOrCreate());
  const next: ProState = { ...current, familyId: familyId.toLowerCase() };
  await getProDb().saveState(next);
  pending = Promise.resolve(next);
}

/** Test seam: forget the in-memory identity. */
export function resetIdentityCache(): void {
  pending = null;
}
