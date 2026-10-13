<template>
  <ion-toolbar class="text-style-bar">
    <div class="text-style-row">
      <ion-label class="text-style-label">Text style</ion-label>
      <button type="button" class="text-style-pick" data-test="text-style-pick" @click="openChoices">
        <span class="text-style-pick__now">{{ pickedLabel }}</span>
        <i class="fad fa-chevron-down" aria-hidden="true"></i>
      </button>
      <label v-if="isSimpleVoice" class="text-style-autoread" :class="{ 'is-dimmed': !canRead }">
        Read aloud
        <ion-toggle
          :checked="autoReadOn"
          :disabled="!canRead"
          class="text-style-autoread-toggle"
          data-test="autoread-toggle"
          @ionChange="pickAutoRead($event)"
        ></ion-toggle>
      </label>
    </div>
    <!-- Reading aloud needs a voice on the device; with none the switch is dimmed and this says why -->
    <p v-if="isSimpleVoice && !canRead" class="text-style-note" data-test="no-voice-note">{{ noVoiceNote }}</p>
  </ion-toolbar>
</template>

<script setup lang="ts">
/**
 * "Text style" on the profile: Auto (the birthday picks) or one of the three voices the game's words read in
 * (services/copy/voices.ts), and for the simple voice a switch for reading lines aloud on its own. The four choices
 * open as an action sheet at the bottom of the screen, in thumb reach. On a device with no reading voice the switch is
 * dimmed and locked, and a note says so.
 */
import { computed } from "vue";
import { IonLabel, IonToggle, IonToolbar, actionSheetController } from "@ionic/vue";
import { checkmark } from "ionicons/icons";
import { play$fx } from "@/assets/fx";
import { appSheet } from "@/components/organisms/XpApp/useAppSkin";
import { useReadingVoice } from "@/hooks/useVoice";
import { copyFor } from "@/lib/services/copy/copy";
import { useUserStore } from "@/lib/store/stores/user";
import {
  TEXT_STYLE_CHOICES,
  autoReadsFor,
  autoVoiceFor,
  isVoice,
  voiceFor,
  voiceLabel,
  type TextStyleChoice,
  type Voice,
} from "@/lib/services/copy/voices";

const props = defineProps<{ user: { id?: string; [key: string]: any } }>();

const userStore = useUserStore();
const { canRead } = useReadingVoice();
// The store's copy of the hero, so a change shows at once
const hero = computed(() => (props.user?.id && userStore.users[props.user.id]) || props.user);
const textStyle = computed<TextStyleChoice>(() => (isVoice(hero.value?.voice) ? hero.value.voice : "auto"));
const activeVoice = computed(() => voiceFor(hero.value));
const isSimpleVoice = computed(() => activeVoice.value === "simple");
/** The note under a locked switch, in the voice of the hero whose profile this is */
const noVoiceNote = computed(() => copyFor("speech.noVoice", activeVoice.value));
const autoReadOn = computed(() => autoReadsFor(activeVoice.value, hero.value?.autoRead));

/** What the button shows: "Auto: Simple" while the birthday decides, else the voice picked. */
const pickedLabel = computed(() =>
  textStyle.value === "auto" ? `Auto: ${voiceLabel(autoVoiceFor(hero.value))}` : voiceLabel(activeVoice.value)
);

/** Save a choice; Auto clears the pick. Returns whether anything changed. */
const pickTextStyle = (choice: TextStyleChoice): boolean => {
  const isKnownChoice = choice === "auto" || isVoice(choice);
  const isUnchanged = choice === textStyle.value || !isKnownChoice;
  if (isUnchanged) return false;
  play$fx("select");
  return userStore.setVoice(String(props.user.id), choice === "auto" ? null : (choice as Voice));
};

const openChoices = async () => {
  const sheet = await actionSheetController.create({
    header: "Text style",
    ...appSheet(),
    buttons: [
      ...TEXT_STYLE_CHOICES.map((choice) => ({
        text: choice.id === "auto" ? `Auto (${voiceLabel(autoVoiceFor(hero.value))} for this hero)` : choice.label,
        icon: choice.id === textStyle.value ? checkmark : undefined,
        handler: () => {
          pickTextStyle(choice.id);
        },
      })),
      { text: "Cancel", role: "cancel" },
    ],
  });
  play$fx("openMenu");
  await sheet.present();
};

const pickAutoRead = (event: CustomEvent) => {
  const isUnchanged = event.detail.checked === autoReadOn.value;
  if (isUnchanged || !canRead.value) return;
  userStore.setAutoRead(String(props.user.id), event.detail.checked);
};
</script>

<style lang="scss" scoped>
// Under the profile title: the label, the picked style as a button that opens the choices, the read-aloud switch
.text-style-bar {
  --padding-top: 0;
  --padding-bottom: 6px;
  --padding-start: 12px;
  --padding-end: 12px;
}

.text-style-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.text-style-label {
  flex: none;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #e7e6b3;
  opacity: 0.9;
}

.text-style-pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border: 2px solid #f7e8a8;
  border-radius: 4px;
  background: #383050;
  color: #f7e8a8;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.78rem;
  text-transform: uppercase;
  cursor: pointer;

  &:active {
    opacity: 0.7;
  }
}

.text-style-autoread {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.7rem;
  color: #e7e6b3;
  text-transform: uppercase;
}

.text-style-autoread.is-dimmed {
  opacity: 0.45;
}

.text-style-note {
  margin: 2px 0 0;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.68rem;
  color: #e7e6b3;
  opacity: 0.85;
}

.text-style-autoread-toggle {
  --background: #383050;
  --background-checked: #383050;
  --handle-background: #e7e6b3;
  --handle-background-checked: #e7e6b3;
}
</style>
