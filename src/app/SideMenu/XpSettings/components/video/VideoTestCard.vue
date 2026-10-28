<template>
  <div ref="root">
    <!-- Always in the page, so screen readers announce text that changes inside it -->
    <div class="video-test-card__live" aria-live="polite" data-cy="test-live">{{ liveText }}</div>
    <ion-card v-if="hasStarted" class="settings-card video-test-card max-w-2xl" data-cy="video-test-card">
      <ion-list>
        <ion-item-group>
          <ion-item-divider>
            <ion-label>Test this device</ion-label>
          </ion-item-divider>

          <ion-item v-if="isRunning" lines="none" data-cy="test-progress">
            <ion-label class="ion-text-wrap">
              <h2>Test {{ step }} of {{ stepCount }}</h2>
              <p>{{ stepLabel }}</p>
            </ion-label>
          </ion-item>

          <template v-if="result">
            <ion-item v-if="cannotDrawHero" lines="none" data-cy="test-unsupported">
              <ion-label class="ion-text-wrap">This device cannot draw the 3D hero at all.</ion-label>
            </ion-item>

            <div class="video-test-card__scroll">
              <table class="video-test-card__table" data-cy="test-table">
                <thead>
                  <tr>
                    <th>Setup</th>
                    <th>Renderer</th>
                    <th>Build</th>
                    <th>First render</th>
                    <th>Work median</th>
                    <th>Work p95</th>
                    <th>fps</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.id">
                    <th scope="row">{{ row.label }}</th>
                    <template v-if="row.supported">
                      <td>{{ row.renderer }}</td>
                      <td>{{ row.build }}</td>
                      <td>{{ row.firstRender }}</td>
                      <td>{{ row.median }}</td>
                      <td>{{ row.p95 }}</td>
                      <td>{{ row.fps }}</td>
                    </template>
                    <td v-else colspan="6">cannot draw 3D</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ion-item v-if="fastestLabel" lines="none" data-cy="test-fastest">
              <ion-label class="ion-text-wrap">Fastest here: {{ fastestLabel }}.</ion-label>
            </ion-item>

            <ion-item v-if="!isRunning" lines="none">
              <div class="video-test-card__actions">
                <ion-button size="small" data-cy="test-share" @click="onShare">Share report</ion-button>
                <ion-button size="small" fill="outline" data-cy="test-copy" @click="onCopy">Copy</ion-button>
              </div>
            </ion-item>
          </template>
          <ion-item v-if="notice" lines="none">
            <ion-label class="ion-text-wrap" data-cy="test-notice">{{ notice }}</ion-label>
          </ion-item>
        </ion-item-group>
      </ion-list>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref } from "vue";
  import { IonButton, IonCard, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList } from "@ionic/vue";
  import { Share } from "@capacitor/share";
  import { runDeviceTest, type DeviceTestProgress } from "@/lib/services/graphics/deviceTest";
  import { runDeviceExtras } from "@/lib/services/graphics/deviceTestExtras";
  import { fastestConfig, formatReport } from "@/lib/services/graphics/deviceReport";
  import type { DeviceSignals } from "@/lib/services/graphics/deviceSignals";
  import type { DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";
  import { copyTextToClipboard } from "@/lib/utils/clipboard";

  const props = defineProps<{ signals: DeviceSignals }>();
  const emit = defineEmits<{ (e: "running", value: boolean): void }>();

  // The four render configs plus the extras (tiles, town, canvases) as the last step
  const CONFIG_STEPS = 4;
  const REPORT_TITLE = "Do It For The XP: video test";

  const hasStarted = ref(false);
  const isRunning = ref(false);
  const step = ref(1);
  const stepCount = ref(CONFIG_STEPS + 1);
  const stepLabel = ref("Getting ready");
  const result = ref<DeviceTestResult | null>(null);
  const notice = ref("");
  const root = ref<HTMLElement | null>(null);

  let controller: AbortController | null = null;

  const ms = (value: number | null): string => (value === null ? "unknown" : `${value.toFixed(1)} ms`);

  const rows = computed(() =>
    (result.value?.configs ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      supported: c.supported,
      renderer: ms(c.rendererMs),
      build: ms(c.buildMs),
      firstRender: ms(c.firstRenderMs),
      median: ms(c.work.medianMs),
      p95: ms(c.work.p95Ms),
      fps: c.fps === null ? "unknown" : c.fps.toFixed(0),
    })),
  );

  const cannotDrawHero = computed(() => result.value?.configs[0]?.supported === false);

  const fastestLabel = computed(() => {
    const current = result.value;
    const id = current ? fastestConfig(current) : null;
    return current?.configs.find((c) => c.id === id)?.label ?? "";
  });

  // What a screen reader hears: the running step while a test runs, otherwise the latest notice
  const liveText = computed(() => {
    if (isRunning.value) return `Test ${step.value} of ${stepCount.value}: ${stepLabel.value}`;
    return notice.value;
  });

  /** On a small phone the card starts below the fold, so bring it up when a run begins. */
  const bringIntoView = async () => {
    await nextTick();
    const element = root.value;
    const canScroll = element !== null && typeof element.scrollIntoView === "function";
    if (canScroll) element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const onProgress = (progress: DeviceTestProgress) => {
    step.value = progress.index + 1;
    stepCount.value = progress.count + 1;
    stepLabel.value = progress.label;
  };

  /** Run the whole test, one at a time. The page footer button calls this. */
  const run = async (): Promise<void> => {
    if (isRunning.value) return;
    controller = new AbortController();
    const { signal } = controller;
    hasStarted.value = true;
    isRunning.value = true;
    emit("running", true);
    result.value = null;
    notice.value = "";
    step.value = 1;
    stepCount.value = CONFIG_STEPS + 1;
    stepLabel.value = "Getting ready";
    void bringIntoView();
    try {
      const base = await runDeviceTest({ signal, onProgress });
      const stoppedEarly = base.aborted && !signal.aborted;
      if (stoppedEarly) {
        // The page went hidden mid-run: keep what was measured and say so, the extras would only stall too
        result.value = base;
        notice.value = "The test stopped early because the app left the screen.";
        isRunning.value = false;
        emit("running", false);
        return;
      }
      step.value = stepCount.value;
      stepLabel.value = "Drawing tiles and the town";
      const extras = await runDeviceExtras({ signal });
      if (!signal.aborted) result.value = { ...base, ...extras };
    } catch {
      // chemx-allow: a failed run is shown as a plain message, never thrown into the page
      if (!signal.aborted) notice.value = "The test could not finish on this device.";
    }
    if (signal.aborted) return;
    isRunning.value = false;
    emit("running", false);
  };

  const reportText = (): string => (result.value ? formatReport(props.signals, result.value) : "");

  const isDismissal = (error: unknown): boolean => {
    const text = `${(error as { name?: string })?.name || ""} ${(error as { message?: string })?.message || ""}`;
    return /abort|cancel/i.test(text);
  };

  const copy = async (text: string) => {
    notice.value = "";
    notice.value = (await copyTextToClipboard(text)) ? "Report copied." : "Could not copy the report.";
  };

  const onCopy = () => copy(reportText());

  const onShare = async () => {
    notice.value = "";
    const text = reportText();
    try {
      const { value: canShareNatively } = await Share.canShare();
      if (canShareNatively) {
        await Share.share({ title: REPORT_TITLE, text, dialogTitle: REPORT_TITLE });
        notice.value = "Report shared.";
        return;
      }
    } catch (error) {
      // Closing the share sheet is a choice, not a failure: copy nothing behind the person's back
      if (isDismissal(error)) return;
    }
    await copy(text);
  };

  onBeforeUnmount(() => {
    controller?.abort();
  });

  defineExpose({ run, isRunning });
</script>

<style scoped>
  .video-test-card__live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .video-test-card__scroll {
    overflow-x: auto;
    padding: 0 16px;
  }

  .video-test-card__table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
    color: var(--gs-text);
  }

  .video-test-card__table th,
  .video-test-card__table td {
    padding: 4px 8px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid var(--gs-divider);
  }

  .video-test-card__actions {
    display: flex;
    gap: 8px;
    padding: 8px 0;
  }
</style>
