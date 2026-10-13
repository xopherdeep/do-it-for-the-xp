<template>
  <xp-rpg-modal :is-open="isOpen" title="Moving House" icon="fa-truck-moving" modal-class="moving-house-modal" @close="close">
    <div class="moving-body">
      <template v-if="!summary">
        <p class="moving-intro">
          Build a quest pack for packing and moving your home. It only adds quests and beasts; everything you made stays.
        </p>

        <section class="moving-section">
          <h3>Move day</h3>
          <input v-model="moveDate" type="date" class="moving-date" :min="todayKey" aria-label="Move date" />
        </section>

        <section class="moving-section">
          <h3>Rooms in the home</h3>
          <div v-for="room in rooms" :key="room.id" class="moving-row">
            <template v-if="room.counted">
              <span class="moving-label">{{ room.label }}</span>
              <span class="moving-stepper">
                <button type="button" aria-label="Fewer" :disabled="!(counts[room.id] > 0)" @click="step(room.id, -1)">-</button>
                <span class="moving-count">{{ counts[room.id] || 0 }}</span>
                <button type="button" aria-label="More" :disabled="counts[room.id] >= (room.max || 5)" @click="step(room.id, 1)">+</button>
              </span>
            </template>
            <button
              v-else
              type="button"
              class="moving-check"
              :class="{ 'is-on': counts[room.id] > 0 }"
              role="checkbox"
              :aria-checked="counts[room.id] > 0"
              @click="toggle(room.id)"
            >
              <i :class="['fad', counts[room.id] > 0 ? 'fa-check-square' : 'fa-square']"></i>
              {{ room.label }}
            </button>
          </div>
        </section>

        <section class="moving-section">
          <h3>Floors</h3>
          <span class="moving-bands" role="radiogroup" aria-label="How many floors the home has">
            <button
              type="button"
              role="radio"
              data-cy="moving-floors-1"
              :aria-checked="floors === 1"
              :class="{ 'is-on': floors === 1 }"
              @click="floors = 1"
            >
              1 floor
            </button>
            <button
              type="button"
              role="radio"
              data-cy="moving-floors-2"
              :aria-checked="floors === 2"
              :class="{ 'is-on': floors === 2 }"
              @click="floors = 2"
            >
              2 floors
            </button>
          </span>
          <button
            v-if="hasStorage"
            type="button"
            class="moving-check"
            :class="{ 'is-on': basement }"
            role="checkbox"
            data-cy="moving-basement"
            :aria-checked="basement"
            @click="basement = !basement"
          >
            <i :class="['fad', basement ? 'fa-check-square' : 'fa-square']"></i>
            Storage is a basement
          </button>
        </section>

        <section class="moving-section">
          <h3>Who is playing</h3>
          <p v-if="!heroes.length" class="moving-note">Add heroes to the family first.</p>
          <div v-for="hero in heroes" :key="hero.id" class="moving-hero">
            <span class="moving-label">{{ hero.nick }}</span>
            <span class="moving-bands" role="radiogroup" :aria-label="`How ${hero.nick} plays`">
              <button
                v-for="band in bands"
                :key="band.id"
                type="button"
                role="radio"
                :aria-checked="roles[hero.id] === band.id"
                :class="{ 'is-on': roles[hero.id] === band.id }"
                @click="roles[hero.id] = band.id"
              >
                {{ band.label }}
              </button>
            </span>
          </div>
        </section>

        <section class="moving-section">
          <h3>Moving Day temple</h3>
          <button
            type="button"
            class="moving-check moving-temple-check"
            :class="{ 'is-on': wantsTemple }"
            role="checkbox"
            :aria-checked="wantsTemple"
            @click="wantsTemple = !wantsTemple"
          >
            <i :class="['fad', wantsTemple ? 'fa-check-square' : 'fa-square']"></i>
            Build the Moving Day temple
          </button>
          <p class="moving-note">Walk the old house room by room and fight the packing. Find it in Hometown.</p>
        </section>

        <p class="moving-preview" aria-live="polite">
          <template v-if="canBuild">
            This builds {{ preview.quests.length }} quests and {{ preview.beasts.length }} beasts<template v-if="previewTemple"> and a {{ floorsWord }} house temple with {{ previewTemple.rooms.length }} rooms</template>.
          </template>
          <template v-else>Pick a move date and at least one hero.</template>
        </p>
        <p v-if="canBuild && templeFailed" class="moving-note" role="status">
          The temple could not be laid out for this house. Untick the temple to build the pack.
        </p>
        <p v-if="error" class="moving-error" role="alert">{{ error }}</p>
      </template>

      <template v-else>
        <p class="moving-summary">{{ summary }}</p>
        <p class="moving-note">Everything else you made was kept. Reload the app so every screen shows the new quests.</p>
      </template>
    </div>

    <template #footer>
      <template v-if="!summary">
        <ion-button class="moving-cancel" :disabled="isBusy" @click.stop="close">Cancel</ion-button>
        <ion-button class="moving-build" :disabled="!canBuild || isBusy" @click="build">
          {{ isBusy ? "Building..." : "Build the pack" }}
        </ion-button>
      </template>
      <template v-else>
        <ion-button class="moving-cancel" @click.stop="close">Close</ion-button>
        <ion-button class="moving-build" @click="reload">Reload app</ion-button>
      </template>
    </template>
  </xp-rpg-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { addDays } from "date-fns";
import { IonButton } from "@ionic/vue";
import XpRpgModal from "@/components/templates/modals/XpRpgModal.vue";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import backupService from "@/lib/services/core/BackupService";
import {
  DEFAULT_MOVING_ROOMS,
  MOVING_BANDS,
  MOVING_ROOMS,
  buildMovingPack,
  dateKey,
  movingBandFor,
  movingPackSummary,
} from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingRole, MovingRoomId } from "@/lib/services/core/packs/movingPack";
import { buildMovingTemple, movingTempleBackup, movingTempleSummary } from "@/lib/services/core/packs/movingTemple";
import type { MovingTemple } from "@/lib/services/core/packs/movingTemple";
import { forgetOldHouseRun, forgetOldHouseWalks } from "@/lib/services/core/packs/movingTempleReset";
import debug from "@/lib/utils/debug";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (event: "close"): void }>();

const userStore = useUserStore();
const bands = MOVING_BANDS;
const rooms = MOVING_ROOMS;

const todayKey = dateKey(new Date());
const moveDate = ref(dateKey(addDays(new Date(), 14)));
const counts = reactive<Record<string, number>>({ ...DEFAULT_MOVING_ROOMS } as Record<string, number>);
const roles = reactive<Record<string, MovingRole>>({});
// The old house goes in with the pack unless the family turns it off
const wantsTemple = ref(true);
const floors = ref<1 | 2>(1);
const basement = ref(false);
const summary = ref("");
const error = ref("");
const isBusy = ref(false);

const heroes = computed(() =>
  userStore.usersAz.map((hero: { id: string; name?: { nick?: string; first?: string; full?: string } }) => ({
    id: String(hero.id),
    nick: hero.name?.nick || hero.name?.first || hero.name?.full || "Hero",
  }))
);

// Each hero starts as what their profile says: an adult is a grown-up, a child's birthday decides little or kid
const prefill = () => {
  for (const hero of userStore.usersAz) {
    if (!roles[hero.id]) roles[hero.id] = movingBandFor(hero);
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    summary.value = "";
    error.value = "";
    prefill();
  },
  { immediate: true }
);

// A basement is a way to read the storage room, so it is asked only while storage is ticked
const hasStorage = computed(() => (counts.storage || 0) > 0);

const answers = computed<MovingAnswers>(() => ({
  moveDate: moveDate.value,
  rooms: { ...counts },
  heroes: heroes.value.map((hero) => ({ id: hero.id, name: hero.nick, band: roles[hero.id] ?? "kid" })),
  floors: floors.value,
  basement: basement.value && hasStorage.value,
}));

const preview = computed(() => buildMovingPack(answers.value));
// The matrix says every setup lays out, but a setup it missed throws: the preview then counts no temple and says so
const previewBuild = computed((): { temple: MovingTemple | null; failed: boolean } => {
  if (!wantsTemple.value) return { temple: null, failed: false };
  try {
    return { temple: buildMovingTemple(preview.value, answers.value), failed: false };
  } catch (error) {
    debug.warn("[MovingHouse] the temple could not be laid out for this house", error);
    return { temple: null, failed: true };
  }
});
const previewTemple = computed(() => previewBuild.value.temple);
const templeFailed = computed(() => previewBuild.value.failed);
const floorsWord = computed(() => (previewTemple.value?.floors.includes("2F") ? "two-floor" : "one-floor"));
const canBuild = computed(() => /^\d{4}-\d{2}-\d{2}$/.test(moveDate.value) && preview.value.heroCount > 0);

const step = (room: MovingRoomId, by: number) => {
  counts[room] = Math.max(0, (counts[room] || 0) + by);
};
const toggle = (room: MovingRoomId) => {
  counts[room] = counts[room] > 0 ? 0 : 1;
};

const close = () => emit("close");
const reload = () => window.location.reload();

const build = async () => {
  if (!canBuild.value || isBusy.value) return;
  isBusy.value = true;
  error.value = "";
  try {
    const pack = buildMovingPack(answers.value);
    // A setup that cannot be laid out throws here, before anything is forgotten or loaded, and shows in the error line
    const temple = wantsTemple.value ? buildMovingTemple(pack, answers.value) : null;
    // The rooms of a rebuilt house moved, so no hero resumes a walk through the old plan
    if (temple) await forgetOldHouseWalks(userStore.usersAz.map((hero) => String(hero.id)));
    await backupService.restoreBackup(movingTempleBackup(pack, temple), { mode: "merge" });
    // The run a hero left in memory is on the old plan too: once the new house is in, it goes, so nobody resumes it
    if (temple) forgetOldHouseRun();
    play$fx("select");
    summary.value = temple ? [movingPackSummary(pack), movingTempleSummary(temple)].join("\n") : movingPackSummary(pack);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    isBusy.value = false;
  }
};
</script>

<style lang="scss" scoped>
.moving-body {
  max-height: 58vh;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.92);
  text-align: left;
}

.moving-intro,
.moving-note,
.moving-summary {
  margin: 0 0 12px;
  line-height: 1.45;
}

.moving-summary {
  font-size: 1.1rem;
  text-align: center;
  white-space: pre-line;
}

.moving-note {
  font-size: 0.9rem;
  opacity: 0.7;
}

.moving-section {
  margin: 0 0 16px;

  h3 {
    margin: 0 0 8px;
    font-family: "StatusPlz", monospace;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    color: #f7e8a8;
  }
}

.moving-date {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  font-size: 1rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(247, 232, 168, 0.6);
  border-radius: 8px;
  color-scheme: dark;
}

.moving-row,
.moving-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  margin-bottom: 4px;
}

.moving-hero {
  flex-wrap: wrap;
}

.moving-label {
  flex: 1 1 auto;
}

.moving-stepper {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  button {
    width: 44px;
    height: 44px;
    font-size: 1.3rem;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-radius: 8px;

    &:disabled {
      opacity: 0.35;
    }
  }
}

.moving-count {
  min-width: 24px;
  text-align: center;
  font-family: "StatusPlz", monospace;
}

.moving-check {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 0 4px;
  font-size: 1rem;
  color: inherit;
  text-align: left;
  background: none;
  border: 0;

  &.is-on {
    color: #f7e8a8;
  }
}

.moving-bands {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;

  button {
    min-height: 44px;
    padding: 0 10px;
    font-size: 0.9rem;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;

    &.is-on {
      color: #280828;
      background: #f7e8a8;
      border-color: #f7e8a8;
    }
  }
}

.moving-bands + .moving-check {
  margin-top: 4px;
}

.moving-preview {
  margin: 8px 0 0;
  text-align: center;
  font-family: "StatusPlz", monospace;
  color: #f7e8a8;
}

.moving-error {
  margin: 8px 0 0;
  color: #ff8a8a;
}

.moving-cancel,
.moving-build {
  flex: 1;
  height: 48px;
  font-weight: 600;
  --border-radius: 12px;
}

.moving-cancel {
  --background: rgba(255, 255, 255, 0.15);
  --color: #fff;
}

.moving-build {
  --background: #f7e8a8;
  --color: #280828;
}
</style>
