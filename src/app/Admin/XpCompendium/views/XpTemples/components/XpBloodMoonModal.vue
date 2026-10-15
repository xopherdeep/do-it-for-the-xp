<template>
  <ion-modal
    :is-open="isOpen"
    class="blood-moon-modal"
    @didDismiss="$emit('close')"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>
          <i class="fad fa-moon mr-2"></i>
          Blood Moons
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            @click="$emit('close')"
          >
            <i class="fas fa-times"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="moon-form rpg-box">
        <ion-item lines="none">
          <ion-label position="stacked">Temple</ion-label>
          <ion-select
            v-model="templeId"
            interface="popover"
            placeholder="Choose a temple"
          >
            <ion-select-option
              v-for="temple in temples"
              :key="temple.id"
              :value="temple.id"
            >{{ temple.name }}</ion-select-option>
          </ion-select>
        </ion-item>
        <p class="moon-help">
          A blood moon resets a hero's run through the temple: beasts return, chests of consumables refill,
          small keys and the Boss Key are forgotten, doors re-lock. The map, the compass, the key items and
          the clears stay. A scheduled moon rises when the hero next enters after its time.
          Quest rooms follow their chores; the blood moon brings back beast rooms, chests, keys and doors.
        </p>
      </div>

      <div
        v-if="isLoading"
        class="moon-loading"
      >
        <ion-spinner name="dots"></ion-spinner>
      </div>

      <div
        v-else-if="!templeId"
        class="moon-empty rpg-box"
      >
        Choose a temple to see the heroes in it.
      </div>

      <div
        v-else-if="rows.length === 0"
        class="moon-empty rpg-box"
      >
        No heroes yet. Add heroes in the dashboard first.
      </div>

      <div
        v-for="row in rows"
        :key="row.userId"
        class="hero-row rpg-box"
      >
        <div class="hero-head">
          <img
            v-if="row.avatarImage"
            :src="row.avatarImage"
            class="hero-avatar"
            alt=""
          >
          <i
            v-else
            class="fad fa-user-shield fa-2x hero-avatar-icon"
          ></i>
          <div class="hero-name">
            <strong>{{ row.name }}</strong>
            <span
              v-if="row.progress"
              class="hero-standing"
            >{{ row.progress.currentLevel }} · room {{ row.progress.currentPosition[0] }},{{ row.progress.currentPosition[1] }}</span>
          </div>
        </div>

        <template v-if="row.progress">
          <div class="hero-stats">
            <span title="Rooms cleared"><i class="fad fa-swords"></i> {{ row.clearedRooms }} cleared</span>
            <span title="Small keys"><i class="fad fa-key"></i> {{ row.progress.playerKeys }}</span>
            <span
              title="Boss Key"
              :class="{ dim: !row.progress.hasMasterKey }"
            ><i class="fad fa-key-skeleton"></i> {{ row.progress.hasMasterKey ? "Boss Key" : "no Boss Key" }}</span>
            <span title="Times cleared"><i class="fad fa-trophy"></i> ×{{ row.progress.timesCleared }}</span>
            <span title="Blood moons so far"><i class="fad fa-moon"></i> {{ row.progress.bloodMoons }}</span>
          </div>
          <div
            class="hero-next"
            :class="{ due: row.due }"
          >
            <i class="fad fa-calendar-alt mr-1"></i>{{ describeNextMoon(row.progress, now) }}
          </div>
          <div class="hero-actions">
            <ion-button
              size="small"
              color="rpg"
              :disabled="busy === row.userId"
              @click="openPicker(row)"
            >
              <i class="fad fa-calendar-plus mr-1"></i>
              {{ row.progress.bloodMoonAt ? "Move" : "Schedule" }}
            </ion-button>
            <ion-button
              v-if="row.progress.bloodMoonAt"
              size="small"
              fill="outline"
              color="medium"
              :disabled="busy === row.userId"
              @click="takeBack(row)"
            >
              <i class="fad fa-calendar-times mr-1"></i>
              Take back
            </ion-button>
            <ion-button
              size="small"
              color="danger"
              :disabled="busy === row.userId"
              @click="riseNow(row)"
            >
              <i class="fad fa-moon mr-1"></i>
              Rise now
            </ion-button>
            <ion-item
              lines="none"
              class="weekly-toggle"
            >
              <ion-label>Weekly</ion-label>
              <ion-toggle
                slot="end"
                :checked="row.progress.bloodMoonEvery === 'weekly'"
                :disabled="busy === row.userId"
                @ionChange="setWeekly(row, $event.detail.checked)"
              ></ion-toggle>
            </ion-item>
          </div>
        </template>
        <div
          v-else
          class="hero-none"
        >
          <i class="fad fa-door-closed mr-1"></i>
          Has not entered this temple yet: there is no run to reset, so a blood moon cannot be scheduled.
        </div>
      </div>

      <ion-modal
        :is-open="pickerFor !== null"
        class="date-picker-modal moon-picker"
        @didDismiss="pickerFor = null"
      >
        <ion-datetime
          v-model="pickDate"
          presentation="date-time"
          :min="minPick"
          :show-default-buttons="true"
        >
          <span slot="title">When does the moon rise over {{ pickerFor?.name ?? "the hero" }}?</span>
          <div
            slot="buttons"
            class="picker-buttons"
          >
            <ion-button
              fill="clear"
              @click="pickerFor = null"
            >Cancel</ion-button>
            <ion-button
              fill="clear"
              color="rpg"
              @click="confirmPick"
            >Schedule</ion-button>
          </div>
        </ion-datetime>
      </ion-modal>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { alertController, toastController } from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import type { TempleProgressEntry } from "@/lib/databases/TempleProgressDb";
import { TempleSystem, TEMPLE_CLEARED_KEY } from "@/lib/engine/core/dungeons/TempleSystem";
import { bloodMoonLine, isBloodMoonDue } from "@/lib/engine/core/dungeons/templeReset";
import { describeNextMoon, nextWeekly } from "@/lib/engine/core/dungeons/bloodMoonSchedule";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";

interface TempleChoice {
  id: string;
  name: string;
}

interface HeroRow {
  userId: string;
  name: string;
  avatarImage?: string;
  progress: TempleProgressEntry | null;
  /** Combat rooms won this run (the cleared badge is not a room) */
  clearedRooms: number;
  due: boolean;
}

const props = defineProps<{
  isOpen: boolean;
  temples: TempleChoice[];
}>();

defineEmits<{ (e: "close"): void }>();

const userStore = useUserStore();
const templeSystem = TempleSystem.getInstance();

const templeId = ref<string>("");
const rows = ref<HeroRow[]>([]);
const isLoading = ref(false);
const busy = ref<string | null>(null);
const now = ref(new Date());

const pickerFor = ref<HeroRow | null>(null);
const pickDate = ref("");

const templeName = computed(() => props.temples.find((temple) => temple.id === templeId.value)?.name ?? "the temple");

/** ion-datetime reads a local wall-clock ISO string (no offset); this is `iso` in the viewer's zone, to the minute. */
const toLocalInput = (iso: string): string => {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}:00`;
};
const minPick = computed(() => toLocalInput(now.value.toISOString()));

const toRow = (user: any, progress: TempleProgressEntry | null): HeroRow => ({
  userId: String(user.id),
  name: user.name?.nick || user.name?.first || String(user.id),
  avatarImage: user.avatarImage,
  progress,
  clearedRooms: progress ? progress.clearedRooms.filter((room) => room !== TEMPLE_CLEARED_KEY).length : 0,
  due: progress ? isBloodMoonDue(progress) : false,
});

async function load() {
  if (!templeId.value) {
    rows.value = [];
    return;
  }
  isLoading.value = true;
  try {
    // A run open on a hero's screen may hold a save not yet written: let it land first
    await templeSystem.flushProgress();
    const db = getTempleProgressDb();
    const heroes = userStore.usersAz as any[];
    rows.value = await Promise.all(
      heroes.map(async (user) => {
        try {
          return toRow(user, await db.getProgress(String(user.id), templeId.value));
        } catch (err) {
          debug.error(`Could not read ${user.id}'s progress in ${templeId.value}`, err);
          return toRow(user, null);
        }
      })
    );
    now.value = new Date();
  } finally {
    isLoading.value = false;
  }
}

/** Put a saved record back on its row without reading every hero again. */
function patchRow(userId: string, entry: TempleProgressEntry | null) {
  const user = userStore.getUserById(userId);
  rows.value = rows.value.map((row) => (row.userId === userId && user ? toRow(user, entry) : row));
  now.value = new Date();
}

async function toast(message: string, color?: string) {
  const made = await toastController.create({ message, duration: 3000, position: "top", cssClass: "rpg-toast", color });
  await made.present();
}

/** A failed action says why instead of leaving the row as it was. */
async function act(row: HeroRow, work: () => Promise<TempleProgressEntry | null>, done: (entry: TempleProgressEntry) => string) {
  busy.value = row.userId;
  try {
    const entry = await work();
    if (!entry) {
      play$fx("no");
      await toast(`${row.name} has not entered ${templeName.value}: there is nothing to reset.`, "warning");
      return;
    }
    patchRow(row.userId, entry);
    play$fx("select");
    await toast(done(entry));
  } catch (err: unknown) {
    play$fx("no");
    debug.error("blood moon action failed", err);
    await toast(err instanceof Error ? err.message : "The blood moon would not move.", "danger");
  } finally {
    busy.value = null;
  }
}

function openPicker(row: HeroRow) {
  play$fx("openMenu");
  // Default: a week from the moon already scheduled, or from now, at the same time
  const from = row.progress?.bloodMoonAt && !row.due ? row.progress.bloodMoonAt : new Date().toISOString();
  pickDate.value = toLocalInput(row.progress?.bloodMoonAt && !row.due ? from : nextWeekly(from));
  pickerFor.value = row;
}

async function confirmPick() {
  const row = pickerFor.value;
  pickerFor.value = null;
  const isPickIncomplete = !row || !pickDate.value;
  if (isPickIncomplete) return;
  const when = new Date(pickDate.value); // a local wall-clock string parses in the viewer's zone
  if (Number.isNaN(when.getTime())) return;
  await act(
    row,
    () => templeSystem.scheduleBloodMoon(templeId.value, row.userId, when.toISOString()),
    (entry) => `The blood moon over ${templeName.value} is set for ${row.name}: ${describeNextMoon(entry, new Date())}.`
  );
}

async function takeBack(row: HeroRow) {
  await act(
    row,
    () => templeSystem.scheduleBloodMoon(templeId.value, row.userId, null),
    () => `${row.name}'s blood moon over ${templeName.value} is taken back.`
  );
}

async function setWeekly(row: HeroRow, on: boolean) {
  if ((row.progress?.bloodMoonEvery === "weekly") === on) return;
  await act(
    row,
    () => templeSystem.setBloodMoonEvery(templeId.value, row.userId, on ? "weekly" : null),
    (entry) => (on ? `Weekly for ${row.name}: ${describeNextMoon(entry, new Date())}.` : `${row.name}'s blood moon is a single night again.`)
  );
}

async function riseNow(row: HeroRow) {
  play$fx("openMenu");
  const alert = await alertController.create({
    header: "Rise now?",
    message: `<p>${bloodMoonLine(templeName.value)}</p><p><b>${row.name}</b> loses their keys, opened doors, emptied chests and beaten beasts in it, right away. Map, compass, key items and clears stay.</p>`,
    mode: "ios",
    buttons: [
      { text: "Not tonight", role: "cancel" },
      {
        text: "Let it rise",
        role: "destructive",
        handler: () => {
          void act(
            row,
            () => templeSystem.bloodMoon(templeId.value, row.userId),
            () => `${bloodMoonLine(templeName.value)} ${row.name} will see it when they next stand in the temple.`
          );
        },
      },
    ],
  });
  await alert.present();
}

watch(templeId, () => void load());
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    const shouldPickFirstTemple = !templeId.value && props.temples.length;
    if (shouldPickFirstTemple) templeId.value = props.temples[0].id;
    else void load();
  }
);
</script>

<style lang="scss" scoped src="./_XpBloodMoonModal.scss" />
