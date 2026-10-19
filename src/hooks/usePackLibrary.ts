import { computed, ref } from "vue";
import type { Ref } from "vue";
import { alertController, loadingController, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { getPackLibraryDb } from "@/lib/databases/PackLibraryDb";
import { BUILT_IN_PACKS } from "@/lib/services/core/packs/catalog";
import { packToJson, parsePack } from "@/lib/services/core/packs/packFormat";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { buildOwnPack, hasOwnContent, newPackId, packFileName } from "@/lib/services/core/packs/packExport";
import type { PackDetails } from "@/lib/services/core/packs/packExport";
import { addProblem, isAdded, packTag, withAdded, withoutAdded } from "@/lib/services/core/packs/packLibrary";
import { emptySnapshot, loadPack, packStatus, packSummary, planRemoval, readSnapshot, removePack } from "@/lib/services/core/packs/packService";
import type { PackSnapshot, PackStatus } from "@/lib/services/core/packs/packService";
import { canManageFamily, RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import { pickTextFile, readFileAsText } from "@/lib/utils/downloadFile";
import { saveTextFile, savedFileLine, type SavedBackupFile } from "@/lib/services/core/backupFile";
import debug from "@/lib/utils/debug";

const RPG_ALERT = "rpg-alert";
const KEEPS = ["Everything you made yourself", "Profiles, temples, logs and chat"];

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const showPackFailed = async (header: string, error: unknown) => {
  const alert = await alertController.create({ header, cssClass: RPG_ALERT, message: errorMessage(error), buttons: ["OK"] });
  await alert.present();
};

/** Caches and open screens still hold the old Compendium, so the only button reloads the app */
const showDone = async (header: string, lead: string) => {
  const alert = await alertController.create({
    header,
    cssClass: RPG_ALERT,
    message: dialogMessage({ lead, note: "Reload so every screen shows the change." }),
    backdropDismiss: false,
    buttons: [{ text: "Reload app", handler: () => window.location.reload() }],
  });
  await alert.present();
};

/** Packs change everyone's Compendium, so a hero who taps one is told to ask a Game Master */
export const allowedToManagePacks = async (): Promise<boolean> => {
  if (canManageFamily()) return true;
  play$fx("no");
  const toast = await toastController.create({
    message: RESTORE_GM_ONLY_MESSAGE,
    duration: 2500,
    position: "middle",
    cssClass: "rpg-toast",
    buttons: [{ text: "OK", role: "cancel" }],
  });
  await toast.present();
  return false;
};

/** What the dialogs below need from the page: the packs it added, and a flag to hold the buttons while one works */
export interface PackShelf {
  added: Ref<XpPack[]>;
  isBusy: Ref<boolean>;
}

/**
 * Every pack the family can load (the built-ins and the ones it added from a file or the Town Hall) and how loaded
 * each one is. Settings > Packs and the Town Hall's Packs tab share it, and the dialogs below act on it, so a pack
 * loads the same way wherever it came from.
 */
export function usePackLibrary() {
  const added = ref<XpPack[]>([]);
  const snapshot = ref<PackSnapshot>(emptySnapshot());
  const isBusy = ref(false);

  /** Each pack's load state, by pack id */
  const statuses = computed<Record<string, PackStatus>>(() => {
    const packs = [...BUILT_IN_PACKS, ...added.value];
    return Object.fromEntries(packs.map((pack) => [pack.id, packStatus(pack, packs, snapshot.value)]));
  });

  const refreshPacks = async () => {
    try {
      const [stored, read] = await Promise.all([getPackLibraryDb().getAdded(), readSnapshot()]);
      added.value = stored;
      snapshot.value = read;
    } catch (error) {
      debug.error("Packs: reading the Compendium failed", error);
    }
  };

  return { added, isBusy, statuses, refreshPacks };
}

const allPacks = (shelf: PackShelf): XpPack[] => [...BUILT_IN_PACKS, ...shelf.added.value];

const isBuiltIn = (pack: XpPack) => BUILT_IN_PACKS.some((builtIn) => builtIn.id === pack.id);

const withLoading = async <T>(shelf: PackShelf, message: string, task: () => Promise<T>): Promise<T> => {
  shelf.isBusy.value = true;
  let loading: Awaited<ReturnType<typeof loadingController.create>> | undefined;
  try {
    loading = await loadingController.create({ message });
    await loading.present();
    return await task();
  } finally {
    shelf.isBusy.value = false;
    await loading?.dismiss();
  }
};

const runLoad = async (shelf: PackShelf, pack: XpPack) => {
  try {
    const result = await withLoading(shelf, "Adding the pack...", async () => {
      const loaded = await loadPack(pack);
      // A pack from a file or the Town Hall is kept, so it is listed (and can be removed) like a built-in
      if (!isBuiltIn(pack)) await getPackLibraryDb().saveAdded(withAdded(shelf.added.value, pack));
      return loaded;
    });
    await showDone(`${pack.name} pack loaded`, `Added ${result.total} entries from the ${pack.name} pack.`);
  } catch (error) {
    await showPackFailed("Loading the pack failed", error);
  }
};

/** The same confirm for every pack. One from outside the app says who made it and that it replaces an older copy. */
export const confirmLoadPack = async (shelf: PackShelf, pack: XpPack) => {
  const isPermitted = await allowedToManagePacks();
  if (!isPermitted) return;
  const problem = addProblem(pack, isBuiltIn(pack) ? [] : BUILT_IN_PACKS);
  if (problem) {
    play$fx("no");
    await showPackFailed("This pack can't be added", new Error(problem));
    return;
  }
  play$fx("select");
  const packs = allPacks(shelf);
  const again = packStatus(pack, packs, await readSnapshot()).state !== "none";
  const replacesOlder = !isBuiltIn(pack) && isAdded(shelf.added.value, pack.id) && !again;
  const alert = await alertController.create({
    header: `Load the ${pack.name} pack?`,
    ...(pack.author ? { subHeader: `Made by ${pack.author}` } : {}),
    cssClass: RPG_ALERT,
    message: dialogMessage({
      lead: pack.description,
      groups: [
        { title: "Adds", tone: "add", lines: [packSummary(pack) || "Nothing yet"] },
        { title: "Keeps", tone: "keep", lines: KEEPS },
      ],
      note: again || replacesOlder ? "Pack entries you edited go back to the pack's version." : undefined,
    }),
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: again ? "Load again" : "Load pack", handler: () => { runLoad(shelf, pack); } },
    ],
  });
  await alert.present();
};

const runRemove = async (shelf: PackShelf, pack: XpPack) => {
  try {
    const removed = await withLoading(shelf, "Removing the pack...", async () => {
      const count = await removePack(pack, allPacks(shelf));
      if (!isBuiltIn(pack)) await getPackLibraryDb().saveAdded(withoutAdded(shelf.added.value, pack.id));
      return count;
    });
    await showDone(`${pack.name} pack removed`, `Took out ${removed} entries from the ${pack.name} pack.`);
  } catch (error) {
    await showPackFailed("Removing the pack failed", error);
  }
};

export const confirmRemovePack = async (shelf: PackShelf, pack: XpPack) => {
  const isPermitted = await allowedToManagePacks();
  if (!isPermitted) return;
  play$fx("select");
  const plan = planRemoval(pack, allPacks(shelf), await readSnapshot());
  const alert = await alertController.create({
    header: `Remove the ${pack.name} pack?`,
    cssClass: [RPG_ALERT, "rpg-alert--danger"],
    message: dialogMessage({
      lead: `Takes ${plan.total} of this pack's entries back out.`,
      groups: [
        {
          title: "Keeps",
          tone: "keep",
          lines: ["Everything you made yourself", "Anything another loaded pack uses", "Beasts and categories your quests use"],
        },
      ],
      note: isBuiltIn(pack)
        ? "Pack entries you edited go too. This can't be undone."
        : "Pack entries you edited go too, and the pack leaves this list. Load its file again to get it back.",
    }),
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Remove pack", role: "destructive", handler: () => { runRemove(shelf, pack); } },
    ],
  });
  await alert.present();
};

/** Pick a pack file first: a file that is not a pack is turned away before anyone is asked to confirm */
export const importPackFile = async (shelf: PackShelf) => {
  const isPermitted = await allowedToManagePacks();
  if (!isPermitted) return;
  play$fx("select");
  const file = await pickTextFile();
  if (!file) return;
  let pack: XpPack;
  try {
    pack = parsePack(await readFileAsText(file));
  } catch (error) {
    play$fx("no");
    await showPackFailed("That file isn't a pack", new Error(`${errorMessage(error)} Nothing was changed.`));
    return;
  }
  await confirmLoadPack(shelf, pack);
};

/** What the Game Master calls the family's pack: asked each time, filled with what they wrote last time */
const askDetails = async (header: string, action: string): Promise<PackDetails | null> => {
  const last = await getPackLibraryDb().getOwnDetails();
  return new Promise((resolve) => {
    alertController
      .create({
        header,
        cssClass: RPG_ALERT,
        message: dialogMessage({ lead: "Your own quests, Powers, rewards and house rules, with the beasts your quests use." }),
        inputs: [
          { name: "name", placeholder: "Pack name, like The Smiths' Chores", value: last?.name ?? "", attributes: { maxlength: 60 } },
          {
            name: "description",
            type: "textarea",
            placeholder: "One or two lines about it",
            value: last?.description ?? "",
            attributes: { maxlength: 200 },
          },
        ],
        buttons: [
          { text: "Cancel", role: "cancel", handler: () => resolve(null) },
          {
            text: action,
            handler: (data: { name?: string; description?: string }) => {
              const name = (data.name ?? "").trim();
              if (!name) {
                play$fx("no");
                return false;
              }
              // The same name keeps the same id, so the pack replaces itself wherever it was loaded
              const id = last && last.name.trim() === name ? last.id : undefined;
              resolve({ name, description: (data.description ?? "").trim(), ...(id ? { id } : {}) });
              return true;
            },
          },
        ],
      })
      .then(async (alert) => {
        // Closed some other way (the backdrop, the back button): nothing was asked for
        void alert.onDidDismiss().then(() => resolve(null));
        await alert.present();
      });
  });
};

/**
 * The family's own content as a pack, named by the Game Master; null when they cancel or there is nothing of their
 * own yet (they are told so). The name and id are remembered for next time.
 */
export const buildOwnPackFor = async (shelf: PackShelf, header: string, action: string): Promise<XpPack | null> => {
  const isPermitted = await allowedToManagePacks();
  if (!isPermitted) return null;
  play$fx("select");
  const details = await askDetails(header, action);
  if (!details) return null;
  const pack = buildOwnPack(await readSnapshot(), allPacks(shelf), details, newPackId(details.name, packTag()));
  if (!hasOwnContent(pack.content)) {
    play$fx("no");
    await showPackFailed(
      "Nothing of your own yet",
      new Error("Make a quest, Power, reward or house rule in the Compendium first. What came in a pack isn't counted as your own.")
    );
    return null;
  }
  await getPackLibraryDb().saveOwnDetails({ name: pack.name, description: details.description, id: pack.id });
  return pack;
};

/** Settings > Packs: save the family's pack as a file to send to anyone or keep */
export const exportPackFile = async (shelf: PackShelf) => {
  const pack = await buildOwnPackFor(shelf, "Save your own pack", "Save file");
  if (!pack) return;
  let saved: SavedBackupFile;
  try {
    saved = await saveTextFile(packFileName(pack), packToJson(pack), { label: "pack" });
  } catch (error) {
    play$fx("no");
    await showPackFailed("The pack wasn't saved", error);
    return;
  }
  const alert = await alertController.create({
    header: "Pack saved",
    cssClass: RPG_ALERT,
    message: dialogMessage({
      lead: savedFileLine(saved),
      groups: [{ title: "Holds", tone: "info", lines: [packSummary(pack)] }],
      note: "Another family loads it with Import a pack file. No heroes, logs or passcodes are in it.",
    }),
    buttons: ["OK"],
  });
  await alert.present();
};
