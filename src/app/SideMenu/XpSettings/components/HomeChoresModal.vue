<template>
  <xp-rpg-modal :is-open="isOpen" title="Home Chores" icon="fa-home" modal-class="home-chores-modal" @close="close">
    <div class="home-body">
      <template v-if="!summary">
        <p class="home-intro">
          Add a curated set of everyday chores for your home, sized for each hero. It only adds quests and beasts; everything you made stays.
        </p>

        <section class="home-section">
          <h3>First day</h3>
          <input v-model="startDate" type="date" class="home-date" :min="todayKey" aria-label="First day of the chores" />
        </section>

        <section class="home-section">
          <h3>Rooms in the home</h3>
          <div v-for="room in homeRooms" :key="room.id" class="home-row">
            <template v-if="room.counted">
              <span class="home-label">{{ room.label }}</span>
              <span class="home-stepper">
                <button type="button" aria-label="Fewer" :disabled="!(counts[room.id] > 0)" @click="step(room.id, -1)">-</button>
                <span class="home-count">{{ counts[room.id] || 0 }}</span>
                <button type="button" aria-label="More" :disabled="counts[room.id] >= (room.max || 5)" @click="step(room.id, 1)">+</button>
              </span>
            </template>
            <button
              v-else
              type="button"
              class="home-check"
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

        <section class="home-section">
          <h3>Pets</h3>
          <div v-for="room in petRooms" :key="room.id" class="home-row">
            <button
              type="button"
              class="home-check"
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

        <section class="home-section">
          <h3>Who is playing</h3>
          <p v-if="!heroes.length" class="home-note">Add heroes to the family first.</p>
          <div v-for="hero in heroes" :key="hero.id" class="home-hero">
            <span class="home-label">{{ hero.nick }}</span>
            <span class="home-bands" role="radiogroup" :aria-label="`How ${hero.nick} plays`">
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

        <p class="home-preview" aria-live="polite">
          <template v-if="canBuild">This builds {{ preview.quests.length }} quests and {{ preview.beasts.length }} beasts.</template>
          <template v-else>Pick a first day, a room and at least one hero.</template>
        </p>
        <p v-if="error" class="home-error" role="alert">{{ error }}</p>
      </template>

      <template v-else>
        <p class="home-summary">{{ summary }}</p>
        <p class="home-note">Everything else you made was kept. Reload the app so every screen shows the new quests.</p>
      </template>
    </div>

    <template #footer>
      <template v-if="!summary">
        <ion-button class="home-cancel" :disabled="isBusy" @click.stop="close">Cancel</ion-button>
        <ion-button class="home-build" :disabled="!canBuild || isBusy" @click="build">
          {{ isBusy ? "Building..." : "Build the pack" }}
        </ion-button>
      </template>
      <template v-else>
        <ion-button class="home-cancel" @click.stop="close">Close</ion-button>
        <ion-button class="home-build" @click="reload">Reload app</ion-button>
      </template>
    </template>
  </xp-rpg-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { IonButton } from "@ionic/vue";
import XpRpgModal from "@/components/templates/modals/XpRpgModal.vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { useUserStore } from "@/lib/store/stores/user";
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import backupService from "@/lib/services/core/BackupService";
import {
  DEFAULT_HOME_ROOMS,
  HOME_BANDS,
  HOME_ROOMS,
  MOVE_DAY_QUEST_ID,
  buildHomePack,
  dateKey,
  homeBandFor,
  homePackBackup,
  homePackSummary,
  homeStartDate,
} from "@/lib/services/core/packs/homePack";
import type { HomeAnswers, HomeRole, HomeRoomId } from "@/lib/services/core/packs/homePack";

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (event: "close"): void }>();

const userStore = useUserStore();
const bands = HOME_BANDS;
const homeRooms = HOME_ROOMS.filter((room) => !room.pet);
const petRooms = HOME_ROOMS.filter((room) => room.pet);

const todayKey = dateKey(new Date());
const startDate = ref(todayKey);
const counts = reactive<Record<string, number>>({ ...DEFAULT_HOME_ROOMS } as Record<string, number>);
const roles = reactive<Record<string, HomeRole>>({});
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
    const isUnset = !roles[hero.id];
    if (isUnset) roles[hero.id] = homeBandFor(hero);
  }
};

// The day after the move when the Moving House pack is loaded and the move is still ahead, else today
const loadStartDate = async () => {
  try {
    const moveDay = await new AchievementDb(achievementStorage).get(MOVE_DAY_QUEST_ID);
    startDate.value = homeStartDate(moveDay?.startsOn);
  } catch (caught) {
    // No quest book to read: today is a fine first day
    debug.warn("[HomeChores] could not read the move day", caught);
    startDate.value = todayKey;
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    summary.value = "";
    error.value = "";
    prefill();
    loadStartDate();
  },
  { immediate: true }
);

const answers = computed<HomeAnswers>(() => ({
  startDate: startDate.value,
  rooms: { ...counts },
  heroes: heroes.value.map((hero) => ({ id: hero.id, name: hero.nick, band: roles[hero.id] ?? "kid" })),
}));

const preview = computed(() => buildHomePack(answers.value));
const canBuild = computed(
  () => /^\d{4}-\d{2}-\d{2}$/.test(startDate.value) && preview.value.heroCount > 0 && preview.value.quests.length > 0
);

const step = (room: HomeRoomId, by: number) => {
  counts[room] = Math.max(0, (counts[room] || 0) + by);
};
const toggle = (room: HomeRoomId) => {
  counts[room] = counts[room] > 0 ? 0 : 1;
};

const close = () => emit("close");
const reload = () => window.location.reload();

const build = async () => {
  const isBlocked = !canBuild.value || isBusy.value;
  if (isBlocked) return;
  isBusy.value = true;
  error.value = "";
  try {
    const pack = buildHomePack(answers.value);
    // A library beast the family already owns keeps their copy; the pack only sets its strike clock
    const owned = (await new BestiaryDb(beastStorage).getBeasts()).filter(Boolean);
    await backupService.restoreBackup(homePackBackup(pack, owned), { mode: "merge" });
    play$fx("select");
    summary.value = homePackSummary(pack);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    isBusy.value = false;
  }
};
</script>

<style lang="scss" scoped>
.home-body {
  max-height: 58vh;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.92);
  text-align: left;
}

.home-intro,
.home-note,
.home-summary {
  margin: 0 0 12px;
  line-height: 1.45;
}

.home-summary {
  font-size: 1.1rem;
  text-align: center;
}

.home-note {
  font-size: 0.9rem;
  opacity: 0.7;
}

.home-section {
  margin: 0 0 16px;

  h3 {
    margin: 0 0 8px;
    font-family: "StatusPlz", monospace;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    color: #f7e8a8;
  }
}

.home-date {
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

.home-row,
.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  margin-bottom: 4px;
}

.home-hero {
  flex-wrap: wrap;
}

.home-label {
  flex: 1 1 auto;
}

.home-stepper {
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

.home-count {
  min-width: 24px;
  text-align: center;
  font-family: "StatusPlz", monospace;
}

.home-check {
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

.home-bands {
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

.home-preview {
  margin: 8px 0 0;
  text-align: center;
  font-family: "StatusPlz", monospace;
  color: #f7e8a8;
}

.home-error {
  margin: 8px 0 0;
  color: #ff8a8a;
}

.home-cancel,
.home-build {
  flex: 1;
  height: 48px;
  font-weight: 600;
  --border-radius: 12px;
}

.home-cancel {
  --background: rgba(255, 255, 255, 0.15);
  --color: #fff;
}

.home-build {
  --background: #f7e8a8;
  --color: #280828;
}
</style>
