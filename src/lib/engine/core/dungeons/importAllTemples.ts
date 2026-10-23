/**
 * Import All Temples - copies the nine temples shipped in code into the TempleDb, and keeps those copies
 * fresh without ever overwriting a Game Master's work.
 *
 * Every shipped record carries a `seedSignature`: the signature of the shipped layout it was imported from.
 * - The record's layout still has that signature: nobody edited it, so when the shipped layout changes
 *   (a new room, the master key, the boss room) the record is refreshed to the new layout.
 * - The record's layout differs from its signature: the Game Master edited it, so it is never touched.
 * - A record from before signatures (none stored) whose layout equals the shipped one is unedited too.
 *   If it differs, the temple audit decides: a copy that passes it is a finished temple of the Game Master's
 *   own (a hand-built one) and is kept; a copy that fails it can not be finished, so it is a stale old seed
 *   (missing its Master Room or Boss Key, say) and is refreshed like an unedited one.
 * - Tonight's quests that Quick Start placed in the Wind Temple's copy are no edit (quickStartPlan): the copy is
 *   compared without them, and a refresh places them again in the new layout by Quick Start's own rule.
 * Hero progress lives in another store (`__templeProgress`). It is touched here in one case only: a refresh puts a
 * different temple under the same id, so every hero's run in it starts over on the new entrance (startRunsOver).
 * A refresh also carries the heroes' wake memory over (carryWakeMemory): the beasts the old layout's woken floors held are
 * remembered on each hero before the layout is replaced, so only the rooms that are new wake on the next entry.
 */
import { TempleDb, templeStorage, TempleInterface } from '@/lib/databases/TempleDb';
import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import temples from '@/lib/engine/temples';
import { Room } from './types';
import debug from '@/lib/utils/debug';
import { auditTemple, type AuditableLayout } from '@/lib/services/temples/templeAudit';
import { placeQuickStartQuests, withoutQuickStartQuests } from '@/lib/services/temples/quickStartPlan';
import { startTempleSync } from './templeFreshness';
import { entranceOf, progressForNewLayout } from './templeReset';
import { TempleSystem } from './TempleSystem';
import type { HeroEffectsStore, PlayedLayout } from '@/lib/services/temples/wakeOnEntry';

type SeedLayout = NonNullable<TempleInterface['dungeonLayout']>;

/** A temple as shipped in code: the parts that make up its layout */
export interface ShippedTemple {
  entrance?: unknown;
  maze?: unknown;
  rooms?: unknown;
}

export interface ImportOptions {
  /** The store to sync (default: the app's TempleDb) */
  db?: TempleDb;
  /** The temples shipped in code (default: the nine in src/lib/engine/temples) */
  shipped?: Record<string, ShippedTemple>;
  /** The heroes whose wake memory a refresh carries over (default: the family's user store) */
  heroes?: HeroEffectsStore;
}

/**
 * What the import did with one shipped temple:
 * - create:  no stored layout yet, the shipped one was written
 * - refresh: unedited copy (or an unsigned copy that fails the audit: a stale seed), the shipped layout
 *            changed, the copy now has the new layout
 * - stamp:   an unsigned copy that equals the shipped layout got its signature (nothing else changed)
 * - current: unedited copy that already has the shipped layout, nothing written
 * - edited:  the Game Master's copy, kept as it is
 */
export type SeedAction = 'create' | 'refresh' | 'stamp' | 'current' | 'edited';

export interface SeedPlan {
  action: SeedAction;
  /** The signature of the shipped layout */
  signature: string;
  /** Tonight's quests Quick Start placed in the copy (quickStartPlan): a refresh places them again in the new layout */
  quickStartQuestIds?: string[];
}

export type SeedReport = Record<string, SeedAction>;

const SIGNATURE_VERSION = 'v1';

/** The value as plain JSON with every object's keys in sorted order, so equal layouts stringify equal */
function toStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStable);
  const isObjectValue = value && typeof value === 'object';
  if (isObjectValue) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) sorted[key] = toStable((value as Record<string, unknown>)[key]);
    return sorted;
  }
  return value;
}

/** A 53-bit string hash (cyrb53): plenty to tell one layout from another, and short enough to store beside it */
function hashText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * A stable signature of a layout (entrance, maze and rooms). It reads the layout the way the TempleDb
 * stores it (as JSON, so `undefined` fields do not count) and ignores key order.
 */
export function layoutSignature(layout: Partial<SeedLayout> | ShippedTemple | null | undefined): string {
  const plain = JSON.parse(JSON.stringify({ entrance: layout?.entrance, maze: layout?.maze, rooms: layout?.rooms }));
  return `${SIGNATURE_VERSION}:${hashText(JSON.stringify(toStable(plain)))}`;
}

/**
 * What to do with a stored record given the layout now shipped for it. Pure. The quests Quick Start placed in the Wind
 * Temple's copy are no edit of the Game Master's: the copy is compared with its seed without them (withoutQuickStartQuests),
 * and a refresh hands them on to be placed again.
 */
export function planSeedSync(existing: TempleInterface | null | undefined, shipped: ShippedTemple): SeedPlan {
  const signature = layoutSignature(shipped);
  if (!existing) return { action: 'create', signature };
  const layout = existing.dungeonLayout;
  if (!layout) return { action: 'create', signature };

  const quickStart = withoutQuickStartQuests(existing.id, layout);
  const current = layoutSignature(quickStart.layout);
  const seeded = existing.seedSignature;
  if (seeded) {
    const isEditedSinceSeed = current !== seeded;
    if (isEditedSinceSeed) return { action: 'edited', signature };
    const isShippedChanged = seeded !== signature;
    return isShippedChanged ? { action: 'refresh', signature, quickStartQuestIds: quickStart.questIds } : { action: 'current', signature };
  }
  // Nothing says what this copy was imported from (it predates signatures). The shipped layout: untouched.
  const isShippedLayout = current === signature;
  if (isShippedLayout) return { action: 'stamp', signature };
  // Another layout: kept when the temple can be finished (the Game Master built it), else it is a stale old seed
  const finishable = auditTemple({ dungeonLayout: layout as AuditableLayout }).passed;
  return { action: finishable ? 'edited' : 'refresh', signature };
}

const templeNames: Record<string, string> = {
  'wind-temple': 'Wind Temple',
  'earth-temple': 'Earth Temple',
  'water-temple': 'Water Temple',
  'fire-temple': 'Fire Temple',
  'ice-temple': 'Ice Temple',
  'light-temple': 'Light Temple',
  'shadow-temple': 'Shadow Temple',
  'storm-temple': 'Storm Temple',
  'moon-temple': 'Moon Temple',
};

const templeDescriptions: Record<string, string> = {
  'wind-temple': 'Masters of aerial magic and swift techniques',
  'earth-temple': 'Guardians of nature and earthen powers',
  'water-temple': 'Wielders of healing and fluid combat',
  'fire-temple': 'Home to powerful offensive spells',
  'ice-temple': 'Specialists in ice magic and defense',
  'light-temple': 'Light magic and restoration abilities',
  'shadow-temple': 'Dark magic and mysterious arts',
  'storm-temple': 'Masters of lightning and thunder',
  'moon-temple': 'Mysterious powers of the night sky',
};

// Temples whose edited copy was already reported this session, so the log says it once
const reportedEdited = new Set<string>();

/**
 * A refresh puts a different temple under the same id (the design's "Rollout to families"): every hero's run in it
 * starts over on the new entrance (progressForNewLayout), and a run the engine still holds on the old rooms is dropped
 * before the new layout registers, so refreshRun cannot carry it over and no queued save writes it back. A failure here
 * is warned about and never keeps the layout from being written.
 */
async function startRunsOver(templeId: string, layout: SeedLayout): Promise<void> {
  const engine = TempleSystem.getInstance();
  const isRunGoing = Boolean(engine.getTempleState(templeId));
  if (isRunGoing) engine.forgetTempleRun(templeId);
  try {
    const progressDb = getTempleProgressDb();
    const entrance = entranceOf(layout);
    for (const saved of await progressDb.getProgressForTemple(templeId)) {
      await progressDb.saveProgress(progressForNewLayout(saved, entrance));
    }
  } catch (error) {
    debug.warn(`Could not start the runs in ${templeId} over for its new layout:`, error);
  }
}

/**
 * Before a refresh replaces the old layout, each hero's woken floors of it are swapped for the beasts those floors held
 * (rememberWokenBeastsForHeroes), so the next arrival wakes only the beasts that are new. wakeOnEntry is loaded here
 * and not at the top: a refresh is rare, and the import should not pull the stores in for the temples that did not change.
 * A failure is warned about and never keeps the layout from being written.
 */
async function carryWakeMemory(templeId: string, oldLayout: TempleInterface['dungeonLayout'], heroes: HeroEffectsStore | undefined): Promise<void> {
  if (!oldLayout) return;
  try {
    const wake = await import('@/lib/services/temples/wakeOnEntry');
    await wake.rememberWokenBeastsForHeroes(templeId, oldLayout as PlayedLayout, heroes ?? wake.familyHeroEffects());
  } catch (error) {
    debug.warn(`Could not carry the heroes' woken beasts in ${templeId} to its new layout:`, error);
  }
}

async function syncSeeds(options: ImportOptions): Promise<SeedReport> {
  const report: SeedReport = {};
  try {
    const db = options.db ?? new TempleDb(templeStorage);
    await (options.db ? options.db.init() : templeStorage.create());
    const shipped = options.shipped ?? (temples as unknown as Record<string, ShippedTemple>);

    for (const [templeId, templeData] of Object.entries(shipped)) {
      try {
        const existing = await db.getTempleById(templeId);
        const { action, signature, quickStartQuestIds = [] } = planSeedSync(existing, templeData);
        report[templeId] = action;

        const isEdited = action === 'edited';
        if (isEdited) {
          const isAlreadyReported = reportedEdited.has(templeId);
          if (!isAlreadyReported) {
            reportedEdited.add(templeId);
            debug.log(`Temple ${templeId} was edited by the Game Master, keeping their layout.`);
          }
          continue;
        }
        const isCurrent = action === 'current';
        if (isCurrent) continue;

        const shouldOnlyStamp = action === 'stamp' && existing;
        if (shouldOnlyStamp) {
          // The layout is already the shipped one: only remember where it came from
          await db.setTemple({ ...existing, seedSignature: signature });
          continue;
        }

        // create or refresh: the layout is the shipped one. A record without a layout (settings saved before
        // the layout was ever imported) and a refreshed copy keep their own fields: name, icon, description.
        const baseName = templeNames[templeId] || templeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const seedLayout: SeedLayout = {
          entrance: templeData.entrance as number[],
          maze: templeData.maze as string[][] | Record<string, string[][]>,
          rooms: templeData.rooms as Record<string, Room>,
        };
        // Tonight's quests Quick Start had placed in the old copy go into the new layout by Quick Start's own rule
        const dungeonLayout = placeQuickStartQuests(seedLayout, quickStartQuestIds);
        const base: TempleInterface = {
          id: templeId,
          customName: baseName,
          customDescription: templeDescriptions[templeId] || `A mysterious temple of ${templeId.split('-')[0]} magic.`,
          categoryIds: ['dungeon', templeId.split('-')[0]],
          level: getTempleLevel(templeId),
          dungeonLayout,
        };
        debug.log(`${action === 'create' ? 'Importing' : 'Refreshing'} ${templeId} layout in TempleDb...`);
        // The rooms a hero was in are gone with the old layout: their runs start over before it is replaced
        const isLayoutSwitch = action === 'refresh';
        if (isLayoutSwitch) {
          await carryWakeMemory(templeId, existing?.dungeonLayout, options.heroes);
          await startRunsOver(templeId, dungeonLayout);
        }
        await db.setTemple({ ...base, ...existing, dungeonLayout, seedSignature: signature });
      } catch (error) {
        // One broken record must not keep the other temples from syncing
        debug.error(`Failed to sync ${templeId} to TempleDb:`, error);
      }
    }

    debug.log('All temple layouts synced with TempleDb');
  } catch (error) {
    debug.error('Failed to import temple layouts to TempleDb:', error);
  }
  return report;
}

let running: Promise<SeedReport> | null = null;

/**
 * Sync the shipped temples into the TempleDb (see the top of this file). Safe to call as often as you
 * like: it writes only what changed, and calls made while one is running share it.
 */
export function importAllTempleLayouts(options: ImportOptions = {}): Promise<SeedReport> {
  const hasInjectedSource = options.db || options.shipped;
  if (hasInjectedSource) return syncSeeds(options);
  if (!running) {
    running = syncSeeds(options).finally(() => {
      running = null;
    });
  }
  return running;
}

let builtInImport: Promise<void> | null = null;

/**
 * The nine shipped temples are only copied into the TempleDb on demand. Every Compendium temple screen
 * awaits this before reading the TempleDb, so a Game Master never sees a shipped temple as empty
 * (and never offers to "Create Layout" over one). Runs the import once per session.
 *
 * The first call is at app start (main.ts), so it also starts the engine following the TempleDb: from then on a
 * temple saved in the editor is played as saved, without a reload (templeFreshness).
 */
export function ensureBuiltInTemples(): Promise<void> {
  if (!builtInImport) {
    startTempleSync();
    builtInImport = importAllTempleLayouts().then(() => undefined);
  }
  return builtInImport;
}

/**
 * Get a default level for each temple type
 */
function getTempleLevel(templeId: string): number {
  const levels: Record<string, number> = {
    'wind-temple': 1,
    'water-temple': 2,
    'earth-temple': 3,
    'moon-temple': 4,
    'fire-temple': 5,
    'light-temple': 6,
    'ice-temple': 7,
    'storm-temple': 8,
    'shadow-temple': 9,
  };

  return levels[templeId] || Math.floor(Math.random() * 5) + 1; // Default to random level 1-5
}
