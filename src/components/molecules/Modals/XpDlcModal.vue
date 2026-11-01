<template>
  <xp-rpg-modal
    :is-open="isOpen"
    title="Game Asset Pack"
    modal-class="dlc-modal"
    :show-close-button="!isDownloading"
    @close="handleClose"
  >
    <template #icon>
      <i class="fad fa-box-open dlc-header-icon"></i>
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
        <div class="dlc-status-icon is-ready">
          <i class="fad fa-check-circle"></i>
        </div>
        <p class="dlc-headline">Assets Ready!</p>
        <p class="dlc-subtext">All beasts, dungeon floors, and soundtrack loops are saved locally.</p>
      </div>

      <div v-else-if="hasError" class="dlc-error-section">
        <div class="dlc-status-icon is-error">
          <i class="fad fa-exclamation-triangle"></i>
        </div>
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
          <i class="fad fa-spinner-third fa-spin btn-icon"></i>
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
.dlc-header-icon {
  font-size: 3rem;
  color: var(--gs-accent, rgb(247, 232, 168));
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
}

.dlc-content {
  text-align: center;
  padding: 4px 8px 12px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  font-family: "Apple Kid", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  letter-spacing: normal !important;
  font-size-adjust: none !important;

  .dlc-status-icon {
    font-size: 2.2rem;
    margin: 0 auto 10px;
    display: inline-flex;
    justify-content: center;
    align-items: center;

    &.is-ready {
      color: var(--gs-good, rgb(72, 187, 120));
      filter: drop-shadow(0 0 8px rgba(72, 187, 120, 0.5));
    }

    &.is-error {
      color: var(--gs-danger, rgb(255, 110, 110));
      filter: drop-shadow(0 0 8px rgba(255, 110, 110, 0.5));
    }
  }

  .dlc-headline {
    font-family: var(--gs-font-title, "Silkscreen", "Apple Kid", sans-serif) !important;
    font-size: 1.25rem !important;
    font-weight: bold;
    letter-spacing: 0.5px !important;
    font-size-adjust: none !important;
    color: var(--gs-accent, rgb(247, 232, 168)) !important;
    text-shadow: var(--gs-text-shadow, 1px 1px 2px rgba(0, 0, 0, 0.8));
    margin: 0 0 10px 0;
    line-height: 1.3;
  }

  .dlc-subtext {
    font-family: "Apple Kid", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 1.2rem !important;
    line-height: 1.45 !important;
    letter-spacing: normal !important;
    font-size-adjust: none !important;
    color: var(--gs-text, rgb(255, 255, 255)) !important;
    text-shadow: var(--gs-text-shadow, 1px 1px 2px rgba(0, 0, 0, 0.8));
    margin: 0 0 16px 0;
    opacity: 0.95;
  }

  .dlc-error-text {
    font-family: "Apple Kid", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 1.15rem !important;
    line-height: 1.4 !important;
    letter-spacing: normal !important;
    font-size-adjust: none !important;
    color: var(--gs-danger, rgb(255, 110, 110)) !important;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    margin: 0 0 16px 0;
  }

  .progress-bar-track {
    width: 100%;
    height: 18px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid var(--gs-divider, rgba(255, 255, 255, 0.35));
    border-radius: 9px;
    overflow: hidden;
    margin: 14px 0 10px 0;
    padding: 2px;
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
  }

  .progress-bar-fill {
    height: 100%;
    width: var(--progress-percent, 0%);
    background: linear-gradient(90deg, var(--gs-good, rgb(72, 176, 72)), var(--gs-accent, rgb(248, 208, 48)));
    border-radius: 6px;
    box-shadow: 0 0 10px rgba(72, 176, 72, 0.5);
    transition: width 0.25s ease-in-out;
  }

  .progress-stats {
    font-family: "StatusPlz", "Apple Kid", monospace !important;
    font-size: 1.15rem !important;
    letter-spacing: 0.5px !important;
    font-size-adjust: none !important;
    color: var(--gs-accent, rgb(247, 232, 168)) !important;
    text-shadow: var(--gs-text-shadow, 1px 1px 2px rgba(0, 0, 0, 0.9));
    margin: 6px 0 0 0;
    font-weight: bold;
  }
}

.btn-icon {
  margin-right: 8px;
}

.cancel-button {
  --border-radius: 12px;
  --background: rgba(255, 255, 255, 0.14);
  --color: var(--gs-text, rgb(255, 255, 255));
  font-family: var(--gs-font-title, "Silkscreen", "Apple Kid", sans-serif) !important;
  font-size: 0.95rem !important;
  letter-spacing: 0.5px !important;
  font-size-adjust: none !important;
  height: 46px;
  min-width: 120px;
  flex: 1;
  transition: transform 0.2s ease, --background 0.2s ease;

  &:hover {
    --background: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
  }
}

.confirm-button {
  --border-radius: 12px;
  --background: var(--gs-button, var(--ion-color-primary, rgb(66, 153, 225)));
  --color: rgb(255, 255, 255);
  font-family: var(--gs-font-title, "Silkscreen", "Apple Kid", sans-serif) !important;
  font-size: 0.95rem !important;
  letter-spacing: 0.5px !important;
  font-size-adjust: none !important;
  font-weight: bold;
  height: 46px;
  min-width: 130px;
  flex: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

.download-button {
  --border-radius: 12px;
  --background: var(--gs-button, var(--ion-color-primary, rgb(66, 153, 225)));
  --color: rgb(255, 255, 255) !important;
  --opacity: 1 !important;
  opacity: 1 !important;
  font-family: var(--gs-font-title, "Silkscreen", "Apple Kid", sans-serif) !important;
  font-size: 0.95rem !important;
  letter-spacing: 0.5px !important;
  font-size-adjust: none !important;
  font-weight: bold;
  height: 46px;
  width: 100%;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: default;
}
</style>
