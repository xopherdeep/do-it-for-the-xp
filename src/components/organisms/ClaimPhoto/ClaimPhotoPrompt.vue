<template>
  <ion-content class="claim-photo" :scroll-y="true">
    <div class="claim-photo__box" role="dialog" aria-labelledby="claim-photo-title">
      <h2 id="claim-photo-title" class="claim-photo__title">Show the village your proof!</h2>
      <p class="claim-photo__sub">{{ questName }}</p>

      <div class="claim-photo__frame">
        <img v-if="preview" class="claim-photo__img" :src="preview" alt="Your photo" data-test="photo-preview" />
        <i v-else class="fad fa-camera-retro claim-photo__placeholder" aria-hidden="true"></i>
      </div>

      <p v-if="error" class="claim-photo__error" role="alert" data-test="photo-error">{{ error }}</p>
      <p v-else-if="working" class="claim-photo__sub">Shrinking the picture...</p>
      <p v-else class="claim-photo__sub">The Game Master sees it when they check your chore. It stays on this device.</p>

      <!-- The camera on a phone; a file picker on a computer -->
      <input
        ref="fileInput"
        class="claim-photo__input"
        type="file"
        accept="image/*"
        capture="environment"
        data-test="photo-input"
        @change="onPicked"
      />

      <div class="claim-photo__buttons">
        <button
          v-if="!preview"
          type="button"
          class="xp-app-btn claim-photo__btn"
          data-test="photo-take"
          :disabled="working"
          @click="take"
        >
          <i class="fad fa-camera" aria-hidden="true"></i> Take photo
        </button>
        <template v-else>
          <button type="button" class="xp-app-btn xp-app-btn--ghost claim-photo__btn" data-test="photo-retake" @click="take">
            <i class="fad fa-redo" aria-hidden="true"></i> Retake
          </button>
          <button type="button" class="xp-app-btn claim-photo__btn" data-test="photo-send" @click="send">
            <i class="fad fa-paper-plane" aria-hidden="true"></i> Send
          </button>
        </template>
        <button type="button" class="xp-app-btn xp-app-btn--ghost claim-photo__btn" data-test="photo-cancel" @click="cancel">
          Not yet
        </button>
      </div>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { IonContent, modalController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { PhotoRejectedError, photoFromFile } from "@/lib/services/quests/claimPhotoImage";
import debug from "@/lib/utils/debug";

defineOptions({ name: "claim-photo-prompt" });

/**
 * The retro prompt of a photo chore's claim: Take photo opens the camera (a file input with capture), the picture is
 * shrunk on a canvas, and Send hands the data URL back to whoever opened the sheet (claimWithProof). Not yet closes it
 * with nothing: the chore is not claimed.
 */
interface ClaimPhotoPromptProps {
  questName: string;
}

defineProps<ClaimPhotoPromptProps>();

const fileInput = ref<HTMLInputElement | null>(null);
const preview = ref("");
const error = ref("");
const working = ref(false);

const take = () => {
  play$fx("cursor");
  error.value = "";
  fileInput.value?.click();
};

const onPicked = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // The same file can be picked again after a Retake
  input.value = "";
  const isNothingPicked = !file;
  if (isNothingPicked) return;
  working.value = true;
  error.value = "";
  try {
    preview.value = await photoFromFile(file as File);
  } catch (caught) {
    const isRejected = caught instanceof PhotoRejectedError;
    if (!isRejected) debug.warn("[ClaimPhoto] could not read the picture", caught);
    error.value = isRejected ? caught.message : "That picture could not be read. Try again.";
    play$fx("no");
  } finally {
    working.value = false;
  }
};

const send = () => {
  play$fx("yes");
  void modalController.dismiss(preview.value, "send");
};

const cancel = () => {
  void modalController.dismiss(null, "cancel");
};
</script>

<style lang="scss" scoped>
.claim-photo {
  --background: transparent;
}

.claim-photo__box {
  margin: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff8e6;
  color: #2b2118;
  border: 4px solid #2b2118;
  border-radius: 8px;
  box-shadow: 0 0 0 3px #d9b45a inset;
  font-family: "StatusPlz", monospace;
}

.claim-photo__title {
  margin: 0;
  font-size: 1.1rem;
  text-align: center;
}

.claim-photo__sub {
  margin: 0;
  font-size: 0.8rem;
  text-align: center;
}

.claim-photo__error {
  margin: 0;
  font-size: 0.8rem;
  text-align: center;
  color: #b3261e;
}

.claim-photo__frame {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2b2118;
  border-radius: 4px;
  overflow: hidden;
}

.claim-photo__img {
  display: block;
  max-width: 100%;
  max-height: 50vh;
}

.claim-photo__placeholder {
  font-size: 4rem;
  color: #d9b45a;
}

.claim-photo__input {
  display: none;
}

.claim-photo__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.claim-photo__btn {
  min-height: 44px;
  flex: 1 1 120px;
}
</style>
