<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ nickname }}'s phones</ion-title>
      <ion-buttons slot="end">
        <ion-button data-cy="close-modal" @click="closeModal">
          <i class="fad fa-times"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding xp-hero-phones-modal">
    <ion-card class="link-phone-card">
      <ion-card-header>
        <ion-card-title>Link a phone</ion-card-title>
      </ion-card-header>
      <ion-card-content class="ion-text-center">
        <!-- When unlinked: prompt to connect to Town Hall -->
        <div v-if="needsTownHall" class="town-hall-notice ion-padding" data-cy="town-hall-required">
          <p class="text-sm text-yellow-600 ion-margin-bottom">
            Town Hall connection required. Connect to Town Hall first to link hero phones across devices.
          </p>
          <ion-button size="default" color="warning" data-cy="connect-town-hall-btn" @click="goToTownHall">
            Connect to Town Hall
          </ion-button>
        </div>

        <div v-else>
          <ion-button
            v-if="!currentCode"
            size="default"
            :disabled="isGenerating"
            data-cy="link-phone"
            @click="createCode"
          >
            <ion-spinner v-if="isGenerating" slot="start" name="crescent" />
            Link a phone
          </ion-button>

          <div v-if="errorMessage" class="error-notice ion-margin-top" data-cy="link-code-error">
            <p class="text-danger text-sm font-semibold">{{ errorMessage }}</p>
            <ion-button v-if="needsTownHall" size="small" color="warning" class="ion-margin-top" @click="goToTownHall">
              Connect to Town Hall
            </ion-button>
          </div>

          <div v-if="hasActiveCode" class="active-code-box">
            <div class="qr-container">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" data-cy="qr-image" class="qr-img mx-auto" />
            </div>
            <p class="link-code-text" data-cy="link-code">{{ formattedCode }}</p>
            <p class="countdown-text" data-cy="countdown">{{ countdownText }}</p>
          </div>

          <div v-if="isExpired" class="expired-box">
            <p class="expired-notice">Code expired</p>
            <ion-button :disabled="isGenerating" data-cy="new-code" @click="createCode">
              <ion-spinner v-if="isGenerating" slot="start" name="crescent" />
              New code
            </ion-button>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-card class="phones-list-card">
      <ion-card-header>
        <ion-card-title>Connected devices</ion-card-title>
      </ion-card-header>
      <ion-list>
        <ion-item v-if="heroPhones.length === 0" lines="none">
          <ion-label class="ion-text-wrap text-gray-400">No phones linked yet</ion-label>
        </ion-item>
        <ion-item v-for="phone in heroPhones" :key="phone.id" :data-cy="`phone-item-${phone.id}`">
          <ion-label class="ion-text-wrap">
            <h2>{{ phone.label }}</h2>
            <p>Linked: {{ formatDateTime(phone.createdAt) }}</p>
            <p>Last seen: {{ formatDateTime(phone.lastSeenAt) }}</p>
          </ion-label>
          <ion-button
            slot="end"
            color="danger"
            size="small"
            :data-cy="`phone-remove-${phone.id}`"
            @click="askRemovePhone(phone)"
          >
            Remove
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-card>

    <xp-reveal-prompt :prompt="prompt" @respond="respond" />
  </ion-content>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import QRCode from "qrcode";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { formatCode, linkUrl } from "@/lib/services/multiplayer/deviceLink";
import { removePhonePrompt } from "@/lib/services/multiplayer/familyPrompts";
import type { HeroPhone } from "@/lib/services/multiplayer/familyServer";
import { useFamilyStore } from "@/lib/store/stores/family";
import { isFamilyRoadClosed, FAMILY_ROAD_CLOSED_LINE } from "@/lib/services/townhall/townHallPrompts";
import { usesHashHistory } from "@/router/historyMode";
import debug from "@/lib/utils/debug";

/** While a link code is live, the phone list is read this often so a phone that just linked gets its sheet */
const PHONES_POLL_MS = 10_000;

interface Props {
  heroId: string;
  nickname: string;
}

const props = defineProps<Props>();

const router = useRouter();
const family = useFamilyStore();
const { voice } = useVoice();
const { prompt, showPrompt: ask, submitAnswer: respond } = useRevealPrompt();

const currentCode = ref<string | null>(null);
const expiresAtMs = ref<number | null>(null);
const qrDataUrl = ref<string | null>(null);
const secondsLeft = ref<number>(0);
const isGenerating = ref(false);
const errorMessage = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
let phonesTimer: ReturnType<typeof setInterval> | null = null;

const needsTownHall = computed(() => family.parentAuth === null);
const heroPhones = computed(() => family.phones.filter((p) => p.heroId === props.heroId));
const isExpired = computed(() => currentCode.value !== null && secondsLeft.value <= 0);
const hasActiveCode = computed(() => currentCode.value !== null && secondsLeft.value > 0);

const goToTownHall = async (): Promise<void> => {
  await modalController.dismiss();
  const canPushRoute = Boolean(router?.push);
  if (canPushRoute) {
    void router.push("/town-hall");
  }
};

const formattedCode = computed(() => {
  const code = currentCode.value;
  return code ? formatCode(code) : "";
});

const countdownText = computed(() => {
  const total = secondsLeft.value;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const paddedSeconds = seconds.toString().padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
});

function stopPhonesPoll(): void {
  if (phonesTimer) {
    clearInterval(phonesTimer);
    phonesTimer = null;
  }
}

/** Reads the phone list again; a phone that appeared since the last read gets its sheet now, not on the next round */
async function pollPhones(): Promise<void> {
  try {
    const before = family.phones.length;
    await family.loadPhones();
    const hasGrown = family.phones.length > before;
    if (hasGrown) await family.queueSheets();
  } catch (error) {
    debug.warn("Could not refresh the phone list:", error);
  }
}

function updateCountdown(): void {
  const target = expiresAtMs.value;
  if (!target) return;
  const diff = Math.max(0, Math.ceil((target - Date.now()) / 1000));
  secondsLeft.value = diff;
  const isDone = diff <= 0;
  const shouldStop = isDone && Boolean(timer);
  if (shouldStop) {
    clearInterval(timer);
    timer = null;
    stopPhonesPoll();
  }
}

async function createCode(): Promise<void> {
  errorMessage.value = null;
  isGenerating.value = true;
  try {
    const link = await family.linkCode(props.heroId);
    currentCode.value = link.code;
    const targetMs = new Date(link.expiresAt).getTime();
    expiresAtMs.value = targetMs;

    const isHash = usesHashHistory();
    const url = linkUrl(link.code, window.location, isHash);
    qrDataUrl.value = await QRCode.toDataURL(url, { margin: 1, width: 240 });

    updateCountdown();
    const hasTimer = Boolean(timer);
    if (hasTimer) clearInterval(timer as ReturnType<typeof setInterval>);
    timer = setInterval(updateCountdown, 1000);
    stopPhonesPoll();
    phonesTimer = setInterval(pollPhones, PHONES_POLL_MS);
  } catch (error) {
    debug.error("Could not generate link code:", error);
    const auth = family.parentAuth;
    const isUnlinked = auth === null;
    // The family server is not answering (its road to the city is not open yet): say so, never a code or a success
    const isRoadClosed = isFamilyRoadClosed(error);
    if (isUnlinked) {
      errorMessage.value = "Town Hall connection required. Connect to Town Hall first to link hero phones.";
    } else if (isRoadClosed) {
      errorMessage.value = FAMILY_ROAD_CLOSED_LINE;
    } else {
      const message = error instanceof Error ? error.message : "Could not generate link code. Please check your connection.";
      errorMessage.value = message;
    }
  } finally {
    isGenerating.value = false;
  }
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "Never";
  try {
    const date = new Date(iso);
    const isValid = !isNaN(date.getTime());
    return isValid ? date.toLocaleDateString() : iso;
  } catch {
    return iso;
  }
};

async function askRemovePhone(phone: HeroPhone): Promise<void> {
  const answer = await ask(removePhonePrompt(phone.label, voice.value));
  const saidYes = answer === "yes";
  if (saidYes) {
    await family.removePhone(phone.id);
  }
}

function closeModal(): void {
  modalController.dismiss();
}

onMounted(async () => {
  await family.loadPhones();
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopPhonesPoll();
});
</script>

<style lang="scss" scoped>
.xp-hero-phones-modal {
  .link-code-text {
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    font-family: monospace;
    margin: 12px 0 4px;
  }

  .countdown-text {
    font-size: 1.25rem;
    color: var(--ion-color-medium);
    font-variant-numeric: tabular-nums;
  }

  .qr-img {
    max-width: 240px;
    height: auto;
    border-radius: 8px;
  }

  .expired-notice {
    color: var(--ion-color-danger);
    font-weight: bold;
    margin-bottom: 8px;
  }
}
</style>
