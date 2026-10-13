<template>
  <ion-toolbar class="text-style-bar">
    <div class="text-style-row">
      <ion-label class="text-style-label">Text style</ion-label>
      <ion-segment class="text-style-segment" :value="textStyle" aria-label="Text style" @ionChange="pickTextStyle($event)">
        <ion-segment-button v-for="choice in TEXT_STYLE_CHOICES" :key="choice.id" :value="choice.id" :data-text-style="choice.id">
          <ion-label>{{ choice.label }}</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>
    <div class="text-style-note">
      <span class="text-style-reads">{{ note }}</span>
      <label v-if="isSimpleVoice" class="text-style-autoread">
        Read aloud
        <ion-toggle :checked="autoReadOn" class="text-style-autoread-toggle" @ionChange="pickAutoRead($event)"></ion-toggle>
      </label>
    </div>
  </ion-toolbar>
</template>

<script setup lang="ts">
/**
 * "Text style" on the profile: Auto (the birthday picks) or one of the three voices the game's words read in
 * (services/copy/voices.ts), and for the simple voice a switch for reading lines aloud on their own.
 */
import { computed } from "vue";
import { IonLabel, IonSegment, IonSegmentButton, IonToggle, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
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
// The store's copy of the hero, so a change shows at once
const hero = computed(() => (props.user?.id && userStore.users[props.user.id]) || props.user);
const textStyle = computed<TextStyleChoice>(() => (isVoice(hero.value?.voice) ? hero.value.voice : "auto"));
const activeVoice = computed(() => voiceFor(hero.value));
const isSimpleVoice = computed(() => activeVoice.value === "simple");
const autoReadOn = computed(() => autoReadsFor(activeVoice.value, hero.value?.autoRead));
const note = computed(() =>
  textStyle.value === "auto"
    ? `Auto: ${voiceLabel(autoVoiceFor(hero.value))} for this hero`
    : `${voiceLabel(activeVoice.value)} words for this hero`
);

const pickTextStyle = (event: CustomEvent) => {
  const choice = String(event.detail.value);
  const isKnownChoice = choice === "auto" || isVoice(choice);
  const isUnchanged = choice === textStyle.value || !isKnownChoice;
  if (isUnchanged) return;
  play$fx("select");
  userStore.setVoice(String(props.user.id), choice === "auto" ? null : (choice as Voice));
};

const pickAutoRead = (event: CustomEvent) => {
  const isUnchanged = event.detail.checked === autoReadOn.value;
  if (isUnchanged) return;
  userStore.setAutoRead(String(props.user.id), event.detail.checked);
};
</script>

<style lang="scss" scoped>
// The row under the profile title: label + four-way choice, then the note and the read-aloud switch
.text-style-bar {
  --padding-top: 0;
  --padding-bottom: 6px;
  --padding-start: 12px;
  --padding-end: 12px;
}

.text-style-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-style-label {
  flex: none;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #e7e6b3;
  opacity: 0.9;
}

.text-style-segment {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  --background: #383050;

  ion-segment-button {
    --color: #e7e6b3;
    --color-checked: #280828;
    --indicator-color: #f7e8a8;
    --padding-start: 2px;
    --padding-end: 2px;
    min-height: 32px;
    min-width: 0;
    font-size: 0.7rem;
    text-transform: none;
  }
}

.text-style-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.7rem;
  color: #e7e6b3;
  opacity: 0.85;
}

.text-style-autoread {
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
}

.text-style-autoread-toggle {
  --background: #383050;
  --background-checked: #383050;
  --handle-background: #e7e6b3;
  --handle-background-checked: #e7e6b3;
}
</style>
