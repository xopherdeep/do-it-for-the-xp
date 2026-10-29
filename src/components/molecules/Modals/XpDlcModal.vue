<template>
  <xp-rpg-modal :is-open="isOpen" title="Game Asset Pack" modal-class="dlc-modal" @close="handleClose">
    <template #icon>
      <i class="fad fa-box-open"></i>
    </template>

    <div class="dlc-content">
      <div v-if="isDownloading" class="dlc-progress-section">
        <p class="dlc-headline">Downloading Game Data...</p>
        <p class="dlc-subtext">Caching monsters, dungeon art, and music for offline play.</p>

        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ '--progress-percent': `${progress.percent}%` }"></div>
        </div>

        <p class="progress-stats">
          {{ progress.percent }}% &bull; {{ downloadedMb }} / {{ totalMb }} MB
        </p>
      </div>

      <div v-else-if="isReady" class="dlc-ready-section">
        <p class="dlc-headline">Assets Ready!</p>
        <p class="dlc-subtext">All beasts, dungeon floors, and soundtrack loops are saved locally.</p>
      </div>

      <div v-else-if="hasError" class="dlc-error-section">
        <p class="dlc-headline">Download Interrupted</p>
        <p class="dlc-error-text">{{ progress.errorMessage || "Could not complete the download." }}</p>
      </div>

      <div v-else class="dlc-prompt-section">
        <p class="dlc-headline">Optional Download (~82 MB)</p>
        <p class="dlc-subtext">
          Download the complete art and audio package now for zero-lag offline gameplay, or stream them on-demand as you play.
        </p>
      </div>
    </div>

    <template #footer>
      <template v-if="isDownloading">
        <ion-button disabled class="download-button">
          Downloading ({{ progress.percent }}%)...
        </ion-button>
      </template>

      <template v-else-if="isReady">
        <ion-button @click.stop="handleClose" class="confirm-button">
          <i class="fad fa-check btn-icon"></i>
          Continue
        </ion-button>
      </template>

      <template v-else-if="hasError">
        <ion-button @click.stop="handleClose" class="cancel-button">
          Skip for Now
        </ion-button>
        <ion-button @click.stop="startDownload" class="confirm-button">
          <i class="fad fa-redo btn-icon"></i>
          Retry
        </ion-button>
      </template>

      <template v-else>
        <ion-button @click.stop="handleClose" class="cancel-button">
          Stream Later
        </ion-button>
        <ion-button @click.stop="startDownload" class="confirm-button">
          <i class="fad fa-cloud-download-alt btn-icon"></i>
          Download All
        </ion-button>
      </template>
    </template>
  </xp-rpg-modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { IonButton } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpRpgModal from "@/components/templates/modals/XpRpgModal.vue";
import { dlcService, type DlcProgress } from "@/lib/services/dlc/assetDlcService";

export default defineComponent({
  name: "xp-dlc-modal",
  components: {
    IonButton,
    XpRpgModal,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "completed"],
  setup(_props, { emit }) {
    const progress = ref<DlcProgress>({ ...dlcService.progress });

    const isDownloading = computed(() => progress.value.status === "downloading");
    const isReady = computed(() => progress.value.status === "ready");
    const hasError = computed(() => progress.value.status === "error");

    const toMb = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1);
    const downloadedMb = computed(() => toMb(progress.value.downloadedBytes));
    const totalMb = computed(() => toMb(progress.value.totalBytes || 94696734));

    const handleProgressUpdate = (updated: DlcProgress) => {
      progress.value = { ...updated };
    };

    const startDownload = async () => {
      play$fx("select");
      const success = await dlcService.startDownload(handleProgressUpdate);
      if (success) {
        play$fx("reward");
        emit("completed");
      }
    };

    const handleClose = () => {
      const canClose = !isDownloading.value;
      if (canClose) {
        play$fx("no");
        emit("close");
      }
    };

    return {
      progress,
      isDownloading,
      isReady,
      hasError,
      downloadedMb,
      totalMb,
      startDownload,
      handleClose,
    };
  },
});
</script>

<style lang="scss" scoped>
.dlc-content {
  text-align: center;
  padding: 12px 8px;

  .dlc-headline {
    font-size: 1.15rem;
    font-weight: bold;
    color: var(--ion-color-light, #ffffff);
    margin: 0 0 8px 0;
  }

  .dlc-subtext {
    font-size: 0.9rem;
    color: var(--ion-color-medium, #a0aec0);
    margin: 0 0 16px 0;
    line-height: 1.4;
  }

  .dlc-error-text {
    font-size: 0.9rem;
    color: var(--ion-color-danger, #e53e3e);
    margin: 0 0 16px 0;
  }

  .progress-bar-track {
    width: 100%;
    height: 14px;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid var(--ion-color-medium, #718096);
    border-radius: 4px;
    overflow: hidden;
    margin: 12px 0 8px 0;
  }

  .progress-bar-fill {
    height: 100%;
    width: var(--progress-percent, 0%);
    background: linear-gradient(90deg, #48bb78, #38a169);
    transition: width 0.2s ease-in-out;
  }

  .progress-stats {
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--ion-color-light, #edf2f7);
    margin: 4px 0 0 0;
  }
}

.btn-icon {
  margin-right: 8px;
}

.cancel-button {
  --background: transparent;
  --color: var(--ion-color-medium, #a0aec0);
}

.confirm-button,
.download-button {
  --background: var(--ion-color-primary, #4299e1);
  --color: #ffffff;
  font-weight: bold;
}
</style>
