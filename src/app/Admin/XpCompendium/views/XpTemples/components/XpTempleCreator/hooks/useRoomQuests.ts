/**
 * useRoomQuests: the quest room side of the temple room editor (docs/Quest-Rooms-Spec.md section 9). It loads the
 * family's quests and heroes, works out what the quest picker shows (rows, the temple's theme, the size meter), and
 * does the picking: writing the quest into the room, saving it into the editor's store (which promotes a shared token
 * to a unique symbol), adopting the quest's beast into the bestiary, and creating a quest from a library beast.
 * The rules live in services/temples/questRoomPicker and ./grid/roomQuest; this only wires them to storage.
 */
import { computed, ref, type ComputedRef, type Ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import ProfileDb from "@/lib/databases/ProfileDb";
import { profileStorage } from "@/lib/databases/profileStorage";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { metadataForAsync } from "@/lib/engine/temples/templeRegistry";
import type { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import debug from "@/lib/utils/debug";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import type { FamilyMember } from "@/lib/services/quests/QuestList";
import {
  beastToAdopt,
  buildPickerRows,
  layoutSize,
  pickerRowOf,
  questFromLibraryBeast,
  type LibraryQuestForm,
  type PickerRow,
} from "@/lib/services/temples/questRoomPicker";
import { questBeastId } from "@/lib/services/temples/questRooms";
import { TEMPLE_THEMES, isTempleTheme, type TempleTheme, type TempleThemeInfo } from "@/lib/services/temples/templeThemes";
import {
  applyQuestPick,
  describeRoomQuest,
  heldBeastId,
  heldQuest,
  preselectedQuestId,
  type RoomQuestHolding,
} from "./grid/roomQuest";

export interface UseRoomQuestsOptions {
  templeId: string;
  store: ReturnType<typeof useTempleCreatorStore>;
  roomData: Ref<Room | null>;
  rowIdx: ComputedRef<number>;
  colIdx: ComputedRef<number>;
  /** The editor's copy of the family's bestiary; adopting a beast adds to it */
  allBeasts: Ref<Beast[]>;
  saveToStore: () => Promise<void>;
  /** The room now holds the picked quest and it is saved into the store: the editor shows its config */
  onPicked: () => void;
}

export function useRoomQuests(options: UseRoomQuestsOptions) {
  const { store, roomData, allBeasts } = options;
  const achievementDb = new AchievementDb(achievementStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const profilesDb = new ProfileDb(profileStorage);

  const quests = ref<Achievement[]>([]);
  const heroes = ref<FamilyMember[]>([]);
  const theme = ref<TempleTheme | undefined>(undefined);
  const showPicker = ref(false);

  const themeInfo = computed<TempleThemeInfo | undefined>(() => (theme.value ? TEMPLE_THEMES[theme.value] : undefined));

  /** The family's quests and heroes, and the theme of this temple (its element, when that is one of the nine). */
  const loadQuests = async () => {
    try {
      const [tasks, profiles, meta] = await Promise.all([
        achievementDb.getTasks(),
        profilesDb.getAll(),
        metadataForAsync(options.templeId),
      ]);
      quests.value = tasks;
      heroes.value = profiles as FamilyMember[];
      theme.value = isTempleTheme(meta.element) ? meta.element : undefined;
    } catch (error) {
      // The picker still opens with what it has; the library segment needs no stored quests
      debug.warn("[RoomQuests] could not load the quests", error);
    }
  };

  const rows = computed<PickerRow[]>(() => buildPickerRows(quests.value, allBeasts.value, heroes.value));

  /** The temple as saved, and the part the room being edited makes of it (the size meter's "before") */
  const size = computed(() =>
    layoutSize(store.templeMaze, store.roomsData, quests.value, {
      level: store.currentLevelId,
      row: options.rowIdx.value,
      col: options.colIdx.value,
    })
  );

  const holding = computed<RoomQuestHolding>(() => describeRoomQuest(roomData.value, quests.value));

  /** The room's quest as a card row: the Game Master's pick, or the live quest that fills a shipped template */
  const heldRow = computed<PickerRow | null>(() => {
    const quest = heldQuest(holding.value);
    return quest ? pickerRowOf(quest, allBeasts.value, heroes.value) : null;
  });

  /** The quest the picker opens on: a list room's headline quest, a one-quest room's pick */
  const selectedId = computed<string>(() => preselectedQuestId(roomData.value, quests.value));

  /** A Test fight needs a beast to fight: the quest's, or the template's */
  const canTestFight = computed(() => Boolean(heldBeastId(holding.value)));

  const openPicker = () => {
    showPicker.value = true;
  };
  const closePicker = () => {
    showPicker.value = false;
  };

  /**
   * Puts the library beast into the family's bestiary when it is not there, so a fight can load it. The bestiary is
   * read fresh: an adopted beast the family has already edited is theirs and is never written over.
   */
  const ensureBeast = async (beastId: string | undefined) => {
    if (!beastId) return;
    try {
      const owned = (await bestiaryDb.getBeasts()).map((beast: Beast) => beast.id);
      const adopted = beastToAdopt(beastId, owned);
      if (!adopted) return;
      await bestiaryDb.setBeast(adopted);
      allBeasts.value = [...allBeasts.value, adopted];
      store.cachedBestiary = allBeasts.value;
    } catch (error) {
      // The pick still stands; the fight falls back to a stand-in beast
      debug.warn("[RoomQuests] could not adopt the beast", beastId, error);
    }
  };

  /** Picks the quest for the room: its id, its tier as the room type, saved into the store; then the config shows. */
  const pickQuest = async (questId: string): Promise<boolean> => {
    const quest = quests.value.find((candidate) => String(candidate.id) === String(questId) && !candidate.draft);
    const room = roomData.value;
    const hasNothingToPick = !quest || !room;
    if (hasNothingToPick) return false;
    applyQuestPick(room, quest);
    await ensureBeast(questBeastId(quest));
    await options.saveToStore();
    closePicker();
    options.onPicked();
    return true;
  };

  /** "From the library": makes the quest for a beast, adopts the beast, and returns the new quest's id. */
  const createLibraryQuest = async (beast: LibraryBeast, form: LibraryQuestForm): Promise<string> => {
    const made = questFromLibraryBeast(beast, form, uuidv4(), new Date());
    await ensureBeast(String(beast.id));
    await achievementDb.setTask(made);
    quests.value = [...quests.value, made];
    return String(made.id);
  };

  /** The beasts a Test fight from this room fights: the quest's beast (adopted first), else the template's. */
  const loadTestFightBeastIds = async (): Promise<string[]> => {
    const beastId = heldBeastId(holding.value);
    if (!beastId) return [];
    await ensureBeast(beastId);
    return [beastId];
  };

  return {
    quests,
    heroes,
    theme,
    themeInfo,
    showPicker,
    rows,
    size,
    holding,
    heldRow,
    selectedId,
    canTestFight,
    loadQuests,
    openPicker,
    closePicker,
    pickQuest,
    createLibraryQuest,
    loadTestFightBeastIds,
  };
}

export type UseRoomQuestsReturn = ReturnType<typeof useRoomQuests>;
