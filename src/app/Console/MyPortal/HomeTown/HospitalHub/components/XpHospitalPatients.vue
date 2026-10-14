<script setup lang="ts">
import { computed, reactive } from "vue";
import { IonButton, IonButtons, IonCard, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import { patientChartOf, type PatientChart } from "@/lib/services/hometown/patientChart";

/**
 * The Hospital's Patients board: one compact chart per hero (avatar, status, HP and MP), a heart monitor that races as
 * HP falls and flattens at 0, and the two things a hero can do from here: read a patient's Vital Statistics, or ask
 * Nurse Joy to treat themselves (the Hospital's paid care is for the hero at the counter, so only their card offers it).
 */
interface Patient {
  id: string;
  name?: { nick?: string; full?: string };
  stats?: Parameters<typeof patientChartOf>[0];
}

const props = defineProps<{ isOpen: boolean; users: Patient[]; currentUserId?: string }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "vitals", userId: string): void;
  (e: "treat"): void;
}>();

/** The hero at the counter first, then everyone else in the order given */
const patients = computed(() =>
  props.users
    .map((user) => ({
      user,
      name: user.name?.nick || user.name?.full || "Hero",
      chart: patientChartOf(user.stats) as PatientChart,
      isYou: user.id === props.currentUserId,
    }))
    .sort((a, b) => Number(b.isYou) - Number(a.isYou))
);

/** Heroes whose portrait failed to load get the patient icon instead of a broken image */
const brokenAvatars = reactive(new Set<string>());

/** One beat of the trace, 100 units wide; the strip draws eight and slides by four, so the loop is seamless */
const BEAT = "l30 0 l6 -14 l6 14 l8 0 l5 6 l6 -26 l6 20 l5 0 l28 0";
const TRACE = `M0 26 ${Array.from({ length: 8 }, () => BEAT).join(" ")}`;
const FLAT = "M0 26 L800 26";

const close = () => {
  play$fx("no");
  emit("close");
};

const pct = (share: number) => `${Math.round(share * 100)}%`;
</script>

<template>
  <ion-modal :is-open="isOpen" class="xp-hospital-patients" data-cy="hospital-patients" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <xp-icon icon="hospital" primary="red" secondary="white" size="2x" />
        </ion-buttons>
        <ion-title>Patients</ion-title>
        <ion-buttons slot="end">
          <ion-button class="patients__close" aria-label="Close" data-cy="patients-close" @click="close">
            <i class="fas fa-times fa-lg" aria-hidden="true"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="patients__content">
      <ion-card
        v-for="{ user, name, chart, isYou } in patients"
        :key="user.id"
        class="patient"
        :class="`is-${chart.status}`"
        data-cy="patient-card"
      >
        <!-- the heart monitor: decoration behind the chart, faster as HP falls, flat at 0 -->
        <svg class="patient__ecg" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
          <path
            :d="chart.beatSeconds ? TRACE : FLAT"
            :style="chart.beatSeconds ? { animationDuration: `${chart.beatSeconds * 4}s` } : undefined"
          />
        </svg>

        <div class="patient__body">
          <div class="patient__avatar">
            <img v-if="!brokenAvatars.has(user.id)" :src="$getUserAvatar(user as any)" :alt="name" @error="brokenAvatars.add(user.id)" />
            <i v-else class="fad fa-user-injured fa-2x" aria-hidden="true"></i>
          </div>

          <div class="patient__chart">
            <div class="patient__head">
              <h3 class="patient__name">
                {{ name }}
                <span v-if="isYou" class="patient__you">You</span>
              </h3>
              <span class="patient__status" data-cy="patient-status">
                <i class="fad fa-heartbeat" aria-hidden="true"></i>
                {{ chart.label }}
              </span>
            </div>

            <div class="vital vital--hp" :aria-label="`HP ${chart.hp.now} of ${chart.hp.max}`">
              <span class="vital__unit">HP</span>
              <div class="vital__track"><div class="vital__fill" :style="{ width: pct(chart.hpShare) }"></div></div>
              <span class="vital__value">{{ chart.hp.now }}<small>/{{ chart.hp.max }}</small></span>
            </div>
            <div class="vital vital--mp" :aria-label="`MP ${chart.mp.now} of ${chart.mp.max}`">
              <span class="vital__unit">MP</span>
              <div class="vital__track"><div class="vital__fill" :style="{ width: pct(chart.mpShare) }"></div></div>
              <span class="vital__value">{{ chart.mp.now }}<small>/{{ chart.mp.max }}</small></span>
            </div>
          </div>
        </div>

        <div class="patient__actions">
          <ion-button size="small" fill="outline" class="patient__btn" data-cy="patient-vitals" @click="emit('vitals', user.id)">
            <i class="fad fa-stethoscope" aria-hidden="true"></i>
            View Vitals
          </ion-button>
          <ion-button
            v-if="isYou && chart.needsCare"
            size="small"
            color="danger"
            class="patient__btn"
            data-cy="patient-treat"
            @click="emit('treat')"
          >
            <i class="fad fa-heartbeat" aria-hidden="true"></i>
            Treat
          </ion-button>
        </div>
      </ion-card>
    </ion-content>
  </ion-modal>
</template>

<style lang="scss" scoped>
$good: #6ee07a;
$warn: #f5b942;
$bad: #ff5a5a;
$cream: #e7e6b3;
$pale-yellow: #f7e8a8;

.patients__close {
  --color: currentColor;
}

// The settings pages' spacing: the card's frame is a 16px shadow drawn outside it, so the gap between cards equals the
// gap around them
.patients__content {
  // the hospital itself, dimmed, so the board reads as being in the building
  --background: linear-gradient(rgba(16, 12, 28, 0.78), rgba(16, 12, 28, 0.78)),
    url("@/assets/images/midjourney/hospital.webp") center / cover no-repeat;
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.patient {
  --tone: #{$good};
  // the game style's card rule is keyed by the app's id, so the spacing needs the weight to win
  width: calc(100% - 32px) !important;
  max-width: 560px;
  margin: 16px auto !important;
  padding: 12px;
  overflow: hidden;

  & ~ .patient {
    margin-top: 48px !important;
  }

  &.is-hurt {
    --tone: #{$warn};
  }
  &.is-critical,
  &.is-down {
    --tone: #{$bad};
  }
}

.patient__ecg {
  position: absolute;
  inset: auto 0 0 0;
  width: 100%;
  height: 40px;
  opacity: 0.22;
  pointer-events: none;

  path {
    fill: none;
    stroke: var(--tone);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    transform-box: view-box;
    animation: ecg-scroll 9.6s linear infinite;
  }
}

// The trace is 800 wide in a 400 view: sliding it by 400 lands on an identical frame
@keyframes ecg-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-400px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .patient__ecg path {
    animation: none;
  }
}

.patient__body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.patient__avatar {
  flex: 0 0 auto;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 2px var(--tone);

  i {
    color: var(--tone);
  }

  img {
    width: 88%;
    height: 88%;
    object-fit: contain;
  }
}

.patient__chart {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.patient__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.patient__name {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Orange Kid", "StatusPlz", sans-serif;
  font-size: 24px;
  line-height: 1;
  color: $pale-yellow;
}

.patient__you {
  margin-left: 4px;
  padding: 1px 5px;
  font-family: "StatusPlz", sans-serif;
  font-size: 11px;
  vertical-align: middle;
  color: #280828;
  background: $pale-yellow;
  border-radius: 2px;
}

.patient__status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-family: "StatusPlz", sans-serif;
  font-size: 13px;
  color: var(--tone);
  border: 2px solid var(--tone);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
}

.vital {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 8px;
  font-family: "StatusPlz", sans-serif;
  color: $cream;
}

.vital__unit {
  font-size: 12px;
}

.vital__track {
  height: 14px;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: inset 0 0 0 2px rgba(231, 230, 179, 0.35);
  border-radius: 2px;
  overflow: hidden;
}

.vital__fill {
  height: 100%;
  background: var(--tone);
  // a pixel highlight along the top so the bar reads as a game gauge
  box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.3);
  transition: width 0.4s ease;
}

.vital__value {
  min-width: 52px;
  text-align: right;
  font-size: 16px;

  small {
    font-size: 12px;
    opacity: 0.75;
  }
}

.vital--mp {
  .vital__track {
    height: 8px;
  }
  .vital__fill {
    background: #8fa8ff;
    box-shadow: none;
  }
  .vital__value {
    font-size: 13px;
  }
}

.patient__actions {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.patient__btn {
  margin: 0;
  font-family: "StatusPlz", sans-serif;
  text-transform: none;

  &[fill="outline"] {
    --color: #{$pale-yellow};
    --border-color: #{$pale-yellow};
    // solid, so the heart monitor passes behind it and not through the label
    --background: #280828;
  }

  i {
    margin-right: 6px;
  }
}
</style>
