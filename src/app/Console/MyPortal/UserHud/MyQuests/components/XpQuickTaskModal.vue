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
                @click="requiresApproval = !requiresApproval"
              >
                Game Master must approve
                <small>{{ requiresApproval ? "Loot waits for a GM's OK" : "Loot pays out when it's done" }}</small>
              </span>
              <ion-toggle
                v-model="requiresApproval"
                class="quick-task-toggle"
                aria-label="Game Master must approve"
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
const requiresApproval = ref(false);
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

<style lang="scss" scoped>
// The sheet is only as tall as the form; past the screen's height the form scrolls and the Post button stays put.
.quick-task-modal {
  --height: auto;
  --max-height: calc(100% - var(--ion-safe-area-top, 0px) - 10px);
  --border-radius: 14px;
  --background: transparent;
}

.quick-task {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--ion-safe-area-top, 0px) - 10px);
  max-height: calc(100dvh - var(--ion-safe-area-top, 0px) - 10px);
  background: var(--xp-app-bg);
}

// The Beast Log's app bar, with room above the title for the sheet's grab handle
.quick-task-header {
  flex: none;
  padding-top: 18px;
}

.quick-task-close {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  background: rgba(0, 0, 0, 0.22);
  border: 0;
  border-radius: var(--xp-app-radius-control);
  color: var(--xp-app-on-accent);
  font-size: 1.1rem;
  cursor: pointer;
  --fa-primary-color: var(--xp-app-on-accent);
  --fa-secondary-color: var(--xp-app-on-accent);
}

.quick-task-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  margin: 0;
  padding: 16px 16px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.quick-task-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

// Section labels match the Beast Log's own (Overdue, Today, ...)
.quick-task-label {
  margin: 0 0 0 4px;
  color: var(--xp-app-text-dim);
  font-family: var(--xp-app-font-title);
  font-size: 0.78rem;
  font-weight: normal;
  letter-spacing: 0.8px;
  line-height: 1.2;
  text-transform: uppercase;
}

.quick-task-group {
  overflow: hidden;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);
}

// The task's name is the one thing every task needs, so it is the biggest field
.quick-task-title {
  --padding-start: 14px;
  --padding-end: 14px;
  --color: var(--xp-app-text);
  --placeholder-color: var(--xp-app-text-dim);
  --placeholder-opacity: 0.7;
  --highlight-color-focused: var(--xp-app-accent);
  min-height: 54px;
  font-family: var(--xp-app-font-title);
  font-size: 1.2rem;
  box-shadow: inset 0 -2px 0 transparent;
  transition: box-shadow 0.15s ease;

  &.has-focus {
    box-shadow: inset 0 -2px 0 var(--xp-app-accent);
  }
}

.quick-task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 6px 14px;
  border-top: 1px solid var(--xp-app-line);

  &:first-child {
    border-top: 0;
  }
}

.quick-task-row-icon {
  flex: 0 0 20px;
  text-align: center;
  color: var(--xp-app-accent);
  --fa-primary-color: var(--xp-app-accent);
  --fa-secondary-color: var(--xp-app-accent);
  --fa-secondary-opacity: 0.5;
}

.quick-task-row-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: var(--xp-app-text);
  font-size: 1rem;
  cursor: pointer;

  small {
    color: var(--xp-app-text-dim);
    font-size: 0.8rem;
  }
}

.quick-task-select {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 40px;
  --padding-start: 0;
  --padding-end: 0;
  color: var(--xp-app-text);
  font-size: 1rem;
}

.quick-task-due {
  width: auto;
  margin: 10px 12px;
  --background: rgba(0, 0, 0, 0.3);
  border-radius: var(--xp-app-radius-control);

  ion-segment-button {
    --color: var(--xp-app-text-dim);
    --color-checked: var(--xp-app-on-accent);
    --indicator-color: var(--xp-app-accent);
    --border-radius: var(--xp-app-radius-control);
    --padding-start: 4px;
    --padding-end: 4px;
    min-height: 40px;
    min-width: 0;
    text-shadow: none;
  }

  // The game style sizes segment labels for wide tabs; three choices need to fit one phone row
  ion-label {
    font-family: var(--xp-app-font-body) !important;
    font-size: 0.95rem !important;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    white-space: nowrap;
  }
}

.quick-task-calendar {
  --background: transparent;
  --ion-color-primary: var(--xp-app-accent);
  --ion-color-primary-rgb: 138, 99, 210;
  --ion-color-primary-contrast: #fff;
  margin: 0 auto 4px;
  color: var(--xp-app-text);
}

.quick-task-time {
  flex: none;
  width: 7.5rem;
  min-height: 40px;
  --padding-start: 0;
  --padding-end: 0;
  --color: var(--xp-app-text);
  color-scheme: dark;
  text-align: right;
}

// One tile per currency, in the game's XP / GP / AP colours
.quick-task-loot {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.coin-xp {
  --coin: var(--xp-color-xp, #1fa627);
}
.coin-gp {
  --coin: var(--xp-color-gp, #f5c518);
}
.coin-ap {
  --coin: var(--xp-color-ap, #5ec8ff);
}

.quick-task-coin {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px 2px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-top: 3px solid var(--coin);
  border-radius: var(--xp-app-radius-section);
  cursor: text;

  &:focus-within {
    box-shadow: 0 0 0 2px var(--coin);
  }
}

.quick-task-coin-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--coin);
  font-family: var(--xp-app-font-title);
  font-size: 0.85rem;
  letter-spacing: 0.5px;

  .fad {
    --fa-primary-color: var(--coin);
    --fa-secondary-color: var(--coin);
    --fa-secondary-opacity: 0.5;
  }
}

.quick-task-coin-input {
  --padding-start: 0;
  --padding-end: 0;
  --color: var(--xp-app-text);
  min-height: 40px;
  font-family: var(--xp-app-font-title);
  font-size: 1.35rem;
}

.quick-task-toggle {
  flex: none;
  --track-background: rgba(255, 255, 255, 0.2);
  --track-background-checked: var(--xp-app-accent);
}

// The Post button stays in reach, under the form, whatever the form's length or the keyboard
.quick-task-footer {
  flex: none;
  padding: 10px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
  background: var(--xp-app-bg);
  border-top: 1px solid var(--xp-app-line);
}

.quick-task-error {
  margin: 0 0 8px;
  color: var(--ion-color-danger);
  font-size: 0.9rem;
}

.quick-task-post {
  --background: var(--xp-app-accent);
  --background-activated: var(--xp-app-accent);
  --background-hover: var(--xp-app-accent);
  --color: var(--xp-app-on-accent);
  --border-radius: var(--xp-app-radius-control);
  --box-shadow: none;
  height: 52px;
  margin: 0;
  font-family: var(--xp-app-font-title);
  font-size: 1.1rem;
  letter-spacing: 0.3px;
  text-transform: none;
  text-shadow: var(--xp-app-on-accent-shadow);

  .fad {
    margin-right: 8px;
    --fa-primary-color: var(--xp-app-on-accent);
    --fa-secondary-color: var(--xp-app-on-accent);
  }
}
</style>
