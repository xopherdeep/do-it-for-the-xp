<template>
  <ion-modal
    :is-open="true"
    class="quick-task-modal"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
    @didDismiss="emit('didDismiss')"
  >
    <!-- The sheet wears the Beast Log's own app skin and accent, and is only as tall as the form -->
    <div
      class="quick-task"
      :class="rootClass"
      :style="rootStyle"
    >
      <xp-app-header
        title="New task"
        icon="scroll"
        class="quick-task-header"
      >
        <template #end>
          <button
            type="button"
            class="quick-task-close"
            aria-label="Close"
            @click="close"
          >
            <i class="fad fa-times" />
          </button>
        </template>
      </xp-app-header>

      <form
        class="quick-task-body"
        @submit.prevent="save"
      >
        <section class="quick-task-section">
          <h2 class="quick-task-label">The task</h2>
          <div class="quick-task-group">
            <ion-input
              v-model="title"
              class="quick-task-title"
              aria-label="Task"
              placeholder="Take out the bins"
              :maxlength="80"
              enterkeyhint="done"
              autocapitalize="sentences"
              data-test="quick-task-title"
              @keyup.enter="save"
            />
            <div class="quick-task-row">
              <i class="fad fa-user quick-task-row-icon" />
              <ion-select
                v-model="assigneeId"
                class="quick-task-select"
                label="For"
                justify="space-between"
                interface="action-sheet"
                :interface-options="{ header: 'Who takes this task?' }"
              >
                <ion-select-option
                  v-for="member in members"
                  :key="member.id"
                  :value="member.id"
                >{{ member.nick }}</ion-select-option>
              </ion-select>
            </div>
          </div>
        </section>

        <section class="quick-task-section">
          <h2 class="quick-task-label">Due</h2>
          <div class="quick-task-group">
            <ion-segment
              mode="ios"
              :value="dueChoice"
              class="quick-task-due"
              @ionChange="pickDue($event)"
            >
              <ion-segment-button value="today">
                <ion-label>Today</ion-label>
              </ion-segment-button>
              <ion-segment-button value="tomorrow">
                <ion-label>Tomorrow</ion-label>
              </ion-segment-button>
              <ion-segment-button value="pick">
                <ion-label>Pick a day</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-datetime
              v-if="dueChoice === 'pick'"
              v-model="pickedDay"
              class="quick-task-calendar"
              presentation="date"
              :min="todayIso"
              :first-day-of-week="1"
            />

            <div class="quick-task-row">
              <i class="fad fa-hourglass-half quick-task-row-icon" />
              <span class="quick-task-row-text">
                By
                <small>{{ dueByTime ? "Due at this time" : "Any time that day" }}</small>
              </span>
              <ion-input
                v-model="dueByTime"
                class="quick-task-time"
                type="time"
                aria-label="Due by"
              />
            </div>
          </div>
        </section>

        <section class="quick-task-section">
          <h2 class="quick-task-label">Loot</h2>
          <div class="quick-task-loot">
            <label
              v-for="coin in loot"
              :key="coin.key"
              class="quick-task-coin"
              :class="`coin-${coin.key}`"
            >
              <span class="quick-task-coin-head">
                <i
                  class="fad"
                  :class="coin.icon"
                />
                {{ coin.label }}
              </span>
              <ion-input
                v-model="rewards[coin.key]"
                class="quick-task-coin-input"
                type="number"
                inputmode="numeric"
                min="0"
                :aria-label="coin.name"
              />
            </label>
          </div>
          <div class="quick-task-group">
            <div class="quick-task-row">
              <i class="fad fa-crown quick-task-row-icon" />
              <span
                class="quick-task-row-text"
                @click="toggleApproval"
              >
                Game Master must approve
                <small>{{ approvalNote }}</small>
              </span>
              <ion-toggle
                v-model="requiresApproval"
                :disabled="!isGm"
                class="quick-task-toggle"
                aria-label="Game Master must approve"
              />
            </div>
            <div class="quick-task-row">
              <i class="fad fa-camera quick-task-row-icon" />
              <span
                class="quick-task-row-text"
                @click="requiresPhoto = !requiresPhoto"
              >
                Ask for a photo
                <small>{{ photoNote }}</small>
              </span>
              <ion-toggle
                v-model="requiresPhoto"
                class="quick-task-toggle"
                data-test="quick-task-photo"
                aria-label="Ask for a photo"
              />
            </div>
          </div>
        </section>
      </form>

      <footer class="quick-task-footer">
        <p
          v-if="error"
          class="quick-task-error"
          role="alert"
        >{{ error }}</p>
        <ion-button
          expand="block"
          class="quick-task-post"
          data-test="quick-task-post"
          :disabled="saving"
          @click="save"
        >
          <i
            slot="start"
            class="fad fa-scroll"
          />
          Post the task
        </ion-button>
      </footer>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import {
  IonButton,
  IonDatetime,
  IonInput,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonToggle,
  modalController,
} from "@ionic/vue";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import { newQuickTask, nickOf, QUICK_TASK_REWARDS, type FamilyMembers } from "@/lib/services/quests/QuestList";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import { resolveGmAccess } from "@/router/_Guards/gm.guard";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";

/**
 * "Add task": a one-off quest for one family member, posted through AchievementDb like any quest the
 * Game Master authors, so it lands on the assignee's board and in the Compendium alike.
 */
type DueChoice = "today" | "tomorrow" | "pick";

const props = defineProps<{
  userId: string;
  /** useUserStore().users: every family member, keyed by id */
  users: FamilyMembers;
}>();

const emit = defineEmits<{
  (e: "saved", task: Achievement): void;
  (e: "didDismiss"): void;
}>();

const title = ref("");
const assigneeId = ref(String(props.userId));
const dueChoice = ref<DueChoice>("today");
const todayIso = format(new Date(), "yyyy-MM-dd");
const pickedDay = ref(todayIso);
const dueByTime = ref("");
const userStore = useUserStore();
// A Game Master chooses whether the task needs a Game Master's OK; a hero's own task always does
const isGm = computed(() => {
  const access = resolveGmAccess(userStore);
  return access === "game-master" || access === "masquerade";
});
const requiresApproval = ref(!isGm.value);
const approvalNote = computed(() => {
  if (!isGm.value) return "Loot waits for a Game Master's OK";
  return requiresApproval.value ? "Loot waits for a GM's OK" : "Loot pays out when it's done";
});
// A photo is always reviewed, so asking for one puts the Game Master's OK on (a hero's task already has it)
const requiresPhoto = ref(false);
const photoNote = computed(() =>
  requiresPhoto.value ? "A picture goes to the Game Master with the claim" : "No picture needed"
);
const toggleApproval = () => {
  const canToggle = isGm.value && !requiresPhoto.value;
  if (canToggle) requiresApproval.value = !requiresApproval.value;
};
const rewards = reactive({
  xp: String(QUICK_TASK_REWARDS.xp),
  gp: String(QUICK_TASK_REWARDS.gp),
  ap: String(QUICK_TASK_REWARDS.ap),
});
const error = ref("");
const saving = ref(false);

// The Beast Log's skin and accent: the sheet sits outside the page, so it carries its own
const { rootClass, rootStyle } = useAppSkin("quests");

// The three loot tiles, each in its currency's colour
const loot = [
  { key: "xp", label: "XP", name: "Experience points", icon: "fa-hand-holding-seedling" },
  { key: "gp", label: "GP", name: "Gold points", icon: "fa-hand-holding-usd" },
  { key: "ap", label: "AP", name: "Ability points", icon: "fa-hand-holding-magic" },
] as const;

// Every family member by nick, the hero first so the default reads right
const members = computed(() => {
  const list = Object.values(props.users)
    .filter((member): member is NonNullable<typeof member> => Boolean(member?.id))
    .map((member) => ({ id: String(member.id), nick: nickOf(member, String(member.id)) }))
    .sort((a, b) => a.nick.localeCompare(b.nick));
  const me = String(props.userId);
  return [...list.filter((m) => m.id === me), ...list.filter((m) => m.id !== me)];
});

const close = () => modalController.dismiss();

const pickDue = (ev: CustomEvent) => {
  const value = String(ev.detail?.value || "today");
  dueChoice.value = value === "tomorrow" || value === "pick" ? value : "today";
};

const save = async () => {
  if (saving.value) return;
  error.value = "";
  saving.value = true;
  try {
    const task = newQuickTask({
      id: uuidv4(),
      title: title.value,
      assigneeId: assigneeId.value,
      due: dueChoice.value === "pick" ? pickedDay.value : dueChoice.value,
      dueByTime: dueByTime.value,
      requiresApproval: requiresApproval.value,
      requiresPhoto: requiresPhoto.value,
      isGm: isGm.value,
      rewards: { xp: Number(rewards.xp), gp: Number(rewards.gp), ap: Number(rewards.ap) },
    });
    await new AchievementDb(achievementStorage).setTask(task);
    play$fx("select");
    emit("saved", task);
    await close();
  } catch (err) {
    play$fx("no");
    error.value = err instanceof Error ? err.message : "The quest log did not respond. Try again.";
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped src="./_XpQuickTaskModal.scss" />
