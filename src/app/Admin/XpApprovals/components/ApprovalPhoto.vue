<template>
  <div v-if="entry.requiresPhoto" class="approval-photo">
    <button v-if="photo" type="button" class="approval-photo__thumb" data-test="photo-thumb" aria-label="Open the photo" @click.stop="isViewerOpen = true">
      <img :src="photo" alt="Photo proof" />
    </button>
    <p v-else-if="loaded && !hideWhenMissing" class="approval-photo__none" data-test="photo-none">
      <i class="fad fa-camera-slash" aria-hidden="true"></i> No photo sent
    </p>

    <ion-modal :is-open="isViewerOpen" class="approval-photo-modal" @didDismiss="isViewerOpen = false">
      <ion-header class="approval-photo__bar">
        <ion-toolbar>
          <ion-title>{{ entry.questName }}</ion-title>
          <ion-buttons slot="end">
            <ion-button class="approval-photo__close" aria-label="Close the photo" @click="isViewerOpen = false">
              <i class="fad fa-times fa-lg" aria-hidden="true"></i>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="approval-photo__viewer" @click="isViewerOpen = false">
        <div class="approval-photo__stage">
          <img v-if="photo" class="approval-photo__full" :src="photo" alt="Photo proof, full size. Tap to close." data-test="photo-full" />
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from "@ionic/vue";
import { getClaimPhotoDb } from "@/lib/databases/ClaimPhotoDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import debug from "@/lib/utils/debug";

defineOptions({ name: "approval-photo" });

/**
 * The photo proof on a claim in the Approvals list: a thumbnail that opens full size, or "No photo sent" when the chore
 * asked for one and none came (a won fight has no camera). Draws nothing for a chore that never asked. The photo is read
 * from this device (ClaimPhotoDb); it stays after the claim is settled until the retention purge deletes it.
 */
interface ApprovalPhotoProps {
  entry: Pick<QuestLogEntry, "id" | "questName" | "requiresPhoto">;
  /** The History tab: draw nothing at all when the photo is gone (purged after 7 days), not "No photo sent" */
  hideWhenMissing?: boolean;
}

const props = withDefaults(defineProps<ApprovalPhotoProps>(), { hideWhenMissing: false });

const photo = ref("");
const loaded = ref(false);
const isViewerOpen = ref(false);

const load = async () => {
  loaded.value = false;
  photo.value = "";
  const asksForNoPhoto = !props.entry.requiresPhoto;
  if (asksForNoPhoto) return;
  try {
    photo.value = (await getClaimPhotoDb().getPhoto(props.entry.id))?.dataUrl ?? "";
  } catch (error) {
    debug.warn("[ApprovalPhoto] could not read the photo", error);
  } finally {
    loaded.value = true;
  }
};

onMounted(load);
watch(() => props.entry.id, load);
</script>

<style lang="scss" scoped>
.approval-photo {
  margin-top: 6px;
}

.approval-photo__thumb {
  padding: 0;
  width: 72px;
  height: 72px;
  border: 3px solid #2b2118;
  border-radius: 4px;
  background: #2b2118;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.approval-photo__none {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.approval-photo__bar ion-toolbar {
  --background: #14100b;
  --color: #f7e8a8;
  --border-width: 0 0 2px 0;
  --border-color: #f7e8a8;
}

.approval-photo__bar ion-title {
  font-family: "StatusPlz", sans-serif;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #f7e8a8;
}

.approval-photo__close {
  --color: #f7e8a8;
  --fa-primary-color: #f7e8a8;
  --fa-secondary-color: #f7e8a8;
  min-width: 44px;
  min-height: 44px;
}

.approval-photo__viewer {
  --background: #14100b;
  cursor: zoom-out;
}

.approval-photo__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
}

.approval-photo__full {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 3px solid #2b2118;
}
</style>
