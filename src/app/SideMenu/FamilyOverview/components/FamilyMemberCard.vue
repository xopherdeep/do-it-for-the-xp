<template>
  <ion-card class="family-member-card rpg-box" :class="{ 'is-adult': member.isAdult }">
    <ion-card-header class="member-header">
      <ion-item lines="none" class="member-header-item">
        <ion-avatar slot="start" class="member-avatar">
          <ion-img :src="avatarSrc" :alt="member.nick" />
        </ion-avatar>
        <ion-label>
          <ion-text>
            <h2 class="member-name">{{ member.nick }}</h2>
          </ion-text>
          <ion-text color="medium">
            <p class="member-class">
              <i :class="jobClassIconClass"></i>
              {{ member.jobClass }}
            </p>
          </ion-text>
        </ion-label>
        <ion-badge slot="end" color="primary" class="level-badge">
          LV {{ member.level }}
        </ion-badge>
        <ion-badge v-if="member.isAdult" slot="end" color="warning" class="gm-badge">
          GM
        </ion-badge>
      </ion-item>
    </ion-card-header>

    <ion-card-content class="member-content">
      <!-- Vitals Bars -->
      <ion-grid class="ion-no-padding vitals-grid">
        <ion-row class="ion-align-items-center vitals-row">
          <ion-col size="3">
            <ion-text color="danger">
              <span class="vitals-label">HP</span>
            </ion-text>
          </ion-col>
          <ion-col size="6">
            <ion-progress-bar :value="hpFraction" color="danger" class="vitals-bar" />
          </ion-col>
          <ion-col size="3" class="ion-text-end">
            <ion-note class="vitals-numbers">{{ member.hp.now }}/{{ member.hp.max }}</ion-note>
          </ion-col>
        </ion-row>

        <ion-row class="ion-align-items-center vitals-row">
          <ion-col size="3">
            <ion-text color="tertiary">
              <span class="vitals-label">MP</span>
            </ion-text>
          </ion-col>
          <ion-col size="6">
            <ion-progress-bar :value="mpFraction" color="tertiary" class="vitals-bar" />
          </ion-col>
          <ion-col size="3" class="ion-text-end">
            <ion-note class="vitals-numbers">{{ member.mp.now }}/{{ member.mp.max }}</ion-note>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Stats Chips: Wallet GP & Streak -->
      <ion-grid class="ion-no-padding stats-grid">
        <ion-row>
          <ion-col size="6">
            <ion-chip color="warning" class="stat-chip">
              <ion-icon :icon="walletOutline" />
              <ion-label>₲{{ formattedWallet }}</ion-label>
            </ion-chip>
          </ion-col>
          <ion-col size="6">
            <ion-chip :color="streakColor" class="stat-chip">
              <ion-icon :icon="flameOutline" />
              <ion-label>{{ member.streak.current }}d {{ member.streak.tierTitle }}</ion-label>
            </ion-chip>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Today's Chores Progress -->
      <ion-item lines="none" class="chores-summary-item">
        <ion-label>
          <ion-note class="chores-label">Today's Tasks</ion-note>
          <ion-text>
            <p v-if="member.chores.totalAssigned === 0" class="chores-empty">No chores scheduled today</p>
            <p v-else class="chores-counts">
              <ion-badge color="success" class="count-badge">{{ member.chores.doneCount }} done</ion-badge>
              <ion-badge v-if="member.chores.pendingCount > 0" color="warning" class="count-badge">{{ member.chores.pendingCount }} pending</ion-badge>
              <ion-badge v-if="member.chores.openCount > 0" color="medium" class="count-badge">{{ member.chores.openCount }} open</ion-badge>
              <ion-badge v-if="member.chores.overdueCount > 0" color="danger" class="count-badge">{{ member.chores.overdueCount }} late</ion-badge>
            </p>
          </ion-text>
        </ion-label>
      </ion-item>

      <!-- Action Button -->
      <ion-button expand="block" fill="outline" color="primary" class="play-button" @click="$emit('select', member)">
        <ion-icon slot="start" :icon="playOutline" />
        Play as {{ member.nick }}
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from "vue";
import {
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonItem,
  IonAvatar,
  IonImg,
  IonLabel,
  IonText,
  IonNote,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
  IonChip,
  IonIcon,
  IonButton,
} from "@ionic/vue";
import { walletOutline, flameOutline, playOutline } from "ionicons/icons";
import type { FamilyOverviewMember } from "@/lib/services/family/familyOverviewService";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { JOB_CLASS_OPTIONS } from "@/constants/JOB_CLASS_OPTIONS";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

export default defineComponent({
  name: "FamilyMemberCard",
  components: {
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonItem,
    IonAvatar,
    IonImg,
    IonLabel,
    IonText,
    IonNote,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonProgressBar,
    IonChip,
    IonIcon,
    IonButton,
  },
  props: {
    member: {
      type: Object as PropType<FamilyOverviewMember>,
      required: true,
    },
  },
  emits: ["select"],
  setup(props) {
    const avatarSrc = computed(() => {
      const src = heroAvatarSrc(props.member.rawUser, requireAvatar);
      return src || requireAvatar("./001-gamer.svg");
    });

    const jobClassIconClass = computed(() => {
      const selectedJob = JOB_CLASS_OPTIONS.find((job) => job?.name === props.member.jobClass);
      const icon = selectedJob ? selectedJob.icon : "fad fa-user-ninja";
      return icon;
    });

    const hpFraction = computed(() => {
      const max = Math.max(1, props.member.hp.max);
      return Math.min(1, Math.max(0, props.member.hp.now / max));
    });

    const mpFraction = computed(() => {
      const max = Math.max(1, props.member.mp.max);
      return Math.min(1, Math.max(0, props.member.mp.now / max));
    });

    const formattedWallet = computed(() => {
      const wallet = props.member.gp.wallet;
      const isThousands = wallet >= 1000;
      if (isThousands) {
        return `${(wallet / 1000).toFixed(1)}k`;
      }
      return wallet.toString();
    });

    const streakColor = computed(() => {
      const tier = props.member.streak.tier;
      const isInfernoOrLegend = tier === "inferno" || tier === "legend";
      if (isInfernoOrLegend) return "danger";
      const isBlazeOrFlame = tier === "blaze" || tier === "flame";
      if (isBlazeOrFlame) return "warning";
      return "medium";
    });

    return {
      avatarSrc,
      jobClassIconClass,
      hpFraction,
      mpFraction,
      formattedWallet,
      streakColor,
      walletOutline,
      flameOutline,
      playOutline,
    };
  },
});
</script>

<style lang="scss" scoped>
.family-member-card {
  margin: 0 0 16px 0;
  border-radius: 12px;
}
.member-header {
  padding: 8px 8px 4px 8px;
}
.member-header-item {
  --background: transparent;
  --padding-start: 0;
}
.member-avatar {
  width: 48px;
  height: 48px;
}
.member-name {
  font-weight: bold;
  font-size: 18px;
  margin: 0;
}
.member-class {
  font-size: 13px;
  margin: 2px 0 0 0;
}
.level-badge {
  margin-left: 6px;
}
.gm-badge {
  margin-left: 4px;
}
.member-content {
  padding: 8px 12px 12px 12px;
}
.vitals-grid {
  margin-bottom: 8px;
}
.vitals-row {
  margin: 2px 0;
}
.vitals-label {
  font-size: 11px;
  font-weight: bold;
}
.vitals-bar {
  height: 6px;
  border-radius: 3px;
}
.vitals-numbers {
  font-size: 11px;
}
.stats-grid {
  margin-bottom: 8px;
}
.stat-chip {
  width: 100%;
  margin: 2px 0;
  justify-content: center;
  font-size: 12px;
}
.chores-summary-item {
  --background: transparent;
  --padding-start: 0;
  margin-bottom: 8px;
}
.chores-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  display: block;
}
.chores-counts {
  margin: 4px 0 0 0;
}
.count-badge {
  margin-right: 4px;
  font-size: 11px;
}
.chores-empty {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 4px 0 0 0;
}
.play-button {
  margin-top: 8px;
  font-weight: 600;
}
</style>
