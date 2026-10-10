<template>
  <ion-modal
    :is-open="true"
    class="quick-task-modal"
    :initial-breakpoint="0.9"
    :breakpoints="[0, 0.9, 1]"
    @didDismiss="emit('didDismiss')"
  >
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <i class="fad fa-scroll fa-lg" />
        </ion-buttons>
        <ion-title>New Task</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="quick-task">
      <ion-list
        lines="none"
        class="quick-task-form"
      >
        <ion-item class="quick-task-field">
          <ion-input
            v-model="title"
            label="Task"
            label-placement="stacked"
            placeholder="Take out the bins"
            :maxlength="80"
            autofocus
            @keyup.enter="save"
          />
        </ion-item>

        <ion-item class="quick-task-field">
          <ion-select
            v-model="assigneeId"
            label="For"
            label-placement="stacked"
            interface="action-sheet"
            :interface-options="{ header: 'Who takes this task?' }"
          >
            <ion-select-option
              v-for="member in members"
              :key="member.id"
              :value="member.id"
            >{{ member.nick }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item class="quick-task-field quick-task-due">
          <ion-label position="stacked">Due</ion-label>
          <ion-segment
            :value="dueChoice"
            color="success"
            @ionChange="pickDue($event)"
          >
            <ion-segment-button value="today">Today</ion-segment-button>
            <ion-segment-button value="tomorrow">Tomorrow</ion-segment-button>
            <ion-segment-button value="pick">Pick a day</ion-segment-button>
          </ion-segment>
        </ion-item>

        <ion-item
          v-if="dueChoice === 'pick'"
          class="quick-task-field quick-task-calendar"
        >
          <ion-datetime
            v-model="pickedDay"
            presentation="date"
            :min="todayIso"
            :first-day-of-week="1"
          />
        </ion-item>

        <ion-item class="quick-task-field">
          <ion-input
            v-model="dueByTime"
            type="time"
            label="By"
            label-placement="stacked"
            helper-text="Leave blank for any time that day"
          />
        </ion-item>

        <ion-item class="quick-task-field">
          <ion-toggle
            v-model="requiresApproval"
            color="warning"
            justify="space-between"
          >Game Master must approve</ion-toggle>
        </ion-item>

        <ion-item class="quick-task-field quick-task-rewards">
          <ion-label position="stacked">Loot</ion-label>
          <div class="quick-task-loot">
            <ion-input
              v-model="xp"
              type="number"
              inputmode="numeric"
              min="0"
              label="XP"
              label-placement="end"
            />
            <ion-input
              v-model="gp"
              type="number"
              inputmode="numeric"
              min="0"
              label="GP"
              label-placement="end"
            />
            <ion-input
              v-model="ap"
              type="number"
              inputmode="numeric"
              min="0"
              label="AP"
              label-placement="end"
            />
          </div>
        </ion-item>
      </ion-list>

      <p
        v-if="error"
        class="quick-task-error"
      >{{ error }}</p>
    </ion-content>

    <ion-footer>
      <ion-toolbar color="success">
        <ion-button
          expand="block"
          color="dark"
          :disabled="saving"
          @click="save"
        >
          <i
            slot="start"
            class="fad fa-scroll"
          />
          Post the Task
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import { newQuickTask, nickOf, QUICK_TASK_REWARDS, type FamilyMembers } from "@/lib/services/quests/QuestList";
import { play$fx } from "@/assets/fx";

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
const xp = ref(String(QUICK_TASK_REWARDS.xp));
const gp = ref(String(QUICK_TASK_REWARDS.gp));
const ap = ref(String(QUICK_TASK_REWARDS.ap));
const error = ref("");
const saving = ref(false);

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
      rewards: { xp: Number(xp.value), gp: Number(gp.value), ap: Number(ap.value) },
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
.quick-task {
  --background: var(--ion-color-rpg-contrast, #280828);
  --color: var(--ion-color-rpg, #f7e8a8);

  .quick-task-form {
    background: transparent;
    padding: 0.75rem 0.5rem;
  }

  // Each field is a boxed RPG panel, the way My Goods lists its rows
  .quick-task-field {
    --background: rgba(var(--ion-color-rpg-contrast-rgb), 0.85);
    --color: var(--ion-color-rpg);
    --padding-start: 0.75rem;
    --inner-padding-end: 0.75rem;
    margin-bottom: 0.5rem;
    border: 3px solid var(--ion-color-rpg);
    border-radius: 0;
    box-shadow: inset 0 0 0 2px var(--ion-color-rpg-contrast), 4px 4px 0 rgba(0, 0, 0, 0.5);

    ion-label,
    ion-input,
    ion-select,
    ion-toggle {
      font-family: "StatusPlz", monospace;
      letter-spacing: 0.02em;
    }
  }

  .quick-task-due ion-segment {
    width: 100%;
    margin: 0.5rem 0;
  }

  .quick-task-calendar ion-datetime {
    margin: 0.5rem auto;
  }

  .quick-task-loot {
    display: flex;
    gap: 0.75rem;
    width: 100%;
    margin: 0.25rem 0 0.5rem;

    ion-input {
      --padding-start: 0.5rem;
      min-width: 0;
      border: 2px solid var(--ion-color-rpg);
    }
  }

  .quick-task-error {
    margin: 0 1rem 1rem;
    padding: 0.5rem 0.75rem;
    font-family: "StatusPlz", monospace;
    border: 3px solid var(--ion-color-danger);
    color: var(--ion-color-danger);
    background: rgba(var(--ion-color-rpg-contrast-rgb), 0.85);
  }
}
</style>
