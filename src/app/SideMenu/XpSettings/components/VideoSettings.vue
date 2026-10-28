<template>
  <ion-page class="video-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Video</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="settings-card max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>This device</ion-label>
            </ion-item-divider>

            <ion-item v-for="row in rows" :key="row.key" :data-cy="`device-${row.key}`" lines="none">
              <ion-label class="ion-text-wrap">
                <h2>{{ row.label }}</h2>
                <p>{{ row.value }}</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>
    </ion-content>

    <!-- Controls sit at the bottom of the phone: the Test button and the quality picker land here -->
    <ion-footer>
      <ion-toolbar class="rpg-box">
        <div class="video-settings__footer" data-cy="video-footer-slot"></div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { readDeviceSignals, type DeviceSignals } from "@/lib/services/graphics/deviceSignals";

  const UNKNOWN = "unknown";

  const orUnknown = (value: number | null, format: (n: number) => string = String): string =>
    value === null ? UNKNOWN : format(value);

  const speedHint = (signals: DeviceSignals): string => {
    const isUnreported = signals.majorPerformanceCaveat === null;
    if (isUnreported) return UNKNOWN;
    return signals.majorPerformanceCaveat ? "Slow: this device draws 3D in software" : "Looks fine: the graphics chip draws 3D";
  };

  const rowsFor = (signals: DeviceSignals) => [
    { key: "android", label: "Android", value: orUnknown(signals.androidMajor) },
    { key: "engine", label: "Browser engine", value: orUnknown(signals.chromeMajor, (n) => `Chrome ${n}`) },
    { key: "memory", label: "Memory", value: orUnknown(signals.deviceMemoryGb, (n) => `${n} GB`) },
    { key: "cores", label: "Processor cores", value: orUnknown(signals.cores) },
    { key: "screen", label: "Screen", value: signals.screen ? `${signals.screen.w} x ${signals.screen.h}` : UNKNOWN },
    { key: "webgl", label: "3D drawing", value: signals.webgl2 ? "Yes" : "No" },
    { key: "speed", label: "Speed hint", value: speedHint(signals) },
  ];

  export default defineComponent({
    name: "video-settings",
    mixins: [ionic],
    setup() {
      // Read once: the numbers do not change while the page is open
      const rows = rowsFor(readDeviceSignals());
      return { rows };
    },
  });
</script>

<style scoped>
  .video-settings__footer {
    min-height: 48px;
    padding: 0 16px;
    color: var(--gs-text-dim);
  }
</style>
