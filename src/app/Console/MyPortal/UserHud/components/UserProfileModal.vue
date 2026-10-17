<template>
  <ion-modal ref="modal" :is-open="isOpen" @didDismiss="$emit('close')" class="user-profile-modal" :breakpoints="[0, 1]"
    :initialBreakpoint="1" :handle="false">
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <div class="header-title-wrapper">
            {{ user?.name?.nick || 'Profile' }}
            <div class="level-badge-pill" v-if="user?.stats">
              <small>LVL</small>{{ user.stats.level }}
            </div>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-label class="toggle-hint">{{ fabStyle === 'modern' ? 'Modern' : 'Retro' }}</ion-label>
          <ion-toggle :checked="fabStyle === 'modern'" @ionChange="onFabStyleToggle($event)"
            class="fab-style-toggle-switch"></ion-toggle>
          <xp-close-button size="lg" color="light" @click="dismiss" />
        </ion-buttons>
      </ion-toolbar>
      <!-- Text style: the voice the game's words read in (Auto picks it from the birthday) -->
      <xp-text-style-bar v-if="user?.id" :user="user" />
    </ion-header>

    <ion-content class="icon-colors bg-slide bg-slide-dark">
      <!-- Profile Card Content -->
      <div v-if="user && user.stats" class="profile-content">

        <!-- Stats Flex Layout -->
        <div class="stats-flex">
          <!-- Row 1: Avatar | Class | Food -->
          <div class="stats-row">
            <div class="stat-box avatar-box" role="button" tabindex="0" @click="openMyLook" @keydown.enter="openMyLook"
              @keydown.space.prevent="openMyLook">
              <div class="avatar-container">
                <ion-avatar class="hero-avatar">
                  <ion-img :src="avatarSrc" />
                </ion-avatar>
                <div class="edit-overlay">
                  <i class="fad fa-tshirt"></i>
                </div>
              </div>
              <span class="my-look-label">My Look</span>
            </div>

            <div class="stat-box class-box" role="button" tabindex="0" @click="openClassSelector" @keydown.enter="openClassSelector"
              @keydown.space.prevent="openClassSelector">
              <div class="stat-icon">
                <i :class="`fad ${getClassIcon(user.jobClass)} fa-3x`"></i>
              </div>
              <div class="stat-details">
                <span class="stat-label">CLASS LVL {{ getClassLevel(user.jobClass) }}</span>
                <span class="stat-value large">{{ user.jobClass || 'Adventurer' }}</span>
              </div>
            </div>

            <div class="stat-box food-box" role="button" tabindex="0" @click="openFoodSelector" @keydown.enter="openFoodSelector"
              @keydown.space.prevent="openFoodSelector">
              <span class="stat-label">FOOD</span>
              <div class="stat-icon">
                <i :class="`fad ${getFoodIcon(user.favoriteFood)} fa-2x`"></i>
              </div>
              <span class="stat-value">{{ user.favoriteFood || 'None' }}</span>
            </div>
          </div>

          <!-- Row 2: HP | MP | XP | GP | AP -->
          <div class="stats-row">
            <xp-profile-stat-box type="hp" :icon="POINT_ICONS.hp.icon" :label="POINT_ICONS.hp.label"
              :color="POINT_ICONS.hp.color" :current="user.stats?.hp?.now || 0" :max="user.stats?.hp?.max || 0"
              :progress="(user.stats?.hp?.now || 0) / (user.stats?.hp?.max || 1)" @click="openAccordion('physical')" />

            <xp-profile-stat-box type="mp" :icon="POINT_ICONS.mp.icon" :label="POINT_ICONS.mp.label"
              :color="POINT_ICONS.mp.color" :current="user.stats?.mp?.now || 0" :max="user.stats?.mp?.max || 0"
              :progress="(user.stats?.mp?.now || 0) / (user.stats?.mp?.max || 1)" @click="openAccordion('mental')" />

            <xp-profile-stat-box type="ap" :icon="POINT_ICONS.ap.icon" :label="POINT_ICONS.ap.label"
              :color="POINT_ICONS.ap.color" :current="apTotal" :progress="apProgress"
              @click="openAccordion('vibrational')" />

            <xp-profile-stat-box type="gp" :icon="POINT_ICONS.gp.icon" :label="POINT_ICONS.gp.label"
              :color="POINT_ICONS.gp.color" :current="user.stats?.gp?.wallet || 0" :max="user.stats?.gp?.max || 1000"
              :progress="gpProgress" @click="openAccordion('relational')" />

            <xp-profile-stat-box type="xp" box-class="level-box" :icon="POINT_ICONS.xp.icon"
              :label="POINT_ICONS.xp.label" :color="POINT_ICONS.xp.color" :current="xpValues.inLevel"
              :max="xpValues.needed" :progress="xpProgress" @click="openAccordion('eternal')" />
          </div>

          <!-- Row 3: Mastery Dice (Fibonacci Unlocks) -->
          <div class="stats-row mastery-dice-row">
            <div v-for="die in dice" :key="die.limit" class="dice-item"
              :class="[die.color, { 'is-locked': !isDieUnlocked(die.limit) }]" @click.stop="showDieInfo(die)">
              <div class="dice-inner">
                <i :class="['fad', die.icon]"></i>
                <div v-if="!isDieUnlocked(die.limit)" class="lock-overlay">
                  <i class="fas fa-lock-alt"></i>
                </div>
              </div>
              <span class="dice-label">
                <span v-if="isDieUnlocked(die.limit)">{{ die.label }}</span>
                <span v-else class="lock-label">LVL {{ die.limit }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Race & Activity Footer -->
        <div class="hero-footer-row" v-if="user.race || user.currentActivity">
          <ion-chip v-if="user.race" color="tertiary" outline size="small">
            <i class="fad fa-dna"></i>
            <ion-label>{{ user.race }}</ion-label>
          </ion-chip>
          <div v-if="user.currentActivity" class="activity-status">
            <ion-badge color="success" class="status-pulse">
              <i class="fad fa-running mr-1"></i>
              {{ user.currentActivity }}
            </ion-badge>
          </div>
        </div>

        <!-- Hero Records: the weekly recap, streak and all-time numbers -->
        <ion-button expand="block" fill="outline" color="warning" class="records-button" data-cy="open-records"
          @click="openRecords">
          <i class="fad fa-scroll-old mr-2" aria-hidden="true"></i>
          Hero Records
        </ion-button>
        <ion-button expand="block" fill="outline" color="warning" class="records-button" data-cy="open-recap"
          @click="openRecap">
          <i class="fad fa-users mr-2" aria-hidden="true"></i>
          This week in the village
        </ion-button>

        <!-- Five Pillars Explanation - shows when no accordion is open -->
        <Transition name="pillars-fade">
          <div v-if="!activeAccordion" class="pillars-explanation">
            <h3 class="pillars-title">The Five Pillars of Heroism</h3>
            <p class="pillars-text">
              A true hero balances Body, Mind, Spirit, Heart, and Legend. Tap a pillar to see what each stat does.
              Every level-up trains a few points; the badge shows your class's start plus what you have trained.
            </p>
          </div>
        </Transition>

        <!-- Stacked Accordions for Stats -->
        <ion-accordion-group class="stats-accordions" ref="accordionGroup" :value="activeAccordion"
          @ionChange="activeAccordion = $event.detail.value">
          <ion-accordion v-for="(area, category) in areas" :key="category" :value="category" :class="{
            'class-boosted': isPillarBoosted(category),
            [`boosted-${area.color}`]: isPillarBoosted(category)
          }">
            <ion-item slot="header" class="stat-header">
              <i slot="start" class="fad fa-lg stat-icon" :class="getAreaFaIcon(category)"
                :style="{ color: `var(--ion-color-${area.color})` }"></i>
              <ion-label :color="area.color">
                <span class="capitalize">{{ area.label }}</span>
                <p class="pillar-desc">{{ area.description }}</p>
              </ion-label>
              <ion-note slot="end" :color="area.color" class="pillar-total">
                <span v-if="isPillarBoosted(category)" class="boost-indicator">+</span>
                {{ getAreaTotal(area, user.stats) }}
              </ion-note>
            </ion-item>
            <ion-list slot="content" class="stat-list">
              <ion-item v-for="(desc, stat) in area.stats" :key="stat" lines="none" class="stat-item"
                :class="{ 'stat-boosted': isStatBoosted(stat) }">
                <ion-label>
                  <h3 class="capitalize" :style="{ color: `var(--ion-color-${area.color})` }">{{ stat }}</h3>
                  <p class="stat-desc">{{ desc }}</p>
                  <p v-if="statEffectLine(stat, user)" class="stat-desc stat-now">{{ statEffectLine(stat, user) }}</p>
                </ion-label>
                <div slot="end" class="stat-value-wrapper">
                  <i v-if="isStatBoosted(stat)" class="fad fa-chevron-double-up stat-boost-arrow"
                    :style="{ color: `var(--ion-color-${area.color})` }"></i>
                  <ion-badge :color="area.color" class="stat-badge">
                    {{ getStatTotal(stat) }}
                  </ion-badge>
                </div>
              </ion-item>
            </ion-list>
          </ion-accordion>
        </ion-accordion-group>
      </div>

      <!-- Loading State -->
      <div v-else class="loading-state">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>

    <!-- My Look: the full-screen hero builder stacks over this sheet -->
    <xp-hero-builder-modal :is-open="isBuilderOpen" :look="builderLook" :equipment="builderEquipment"
      @save="saveBuilderLook" @close="closeBuilder" />

    <!-- Avatar Selector Modal -->
    <avatar-selector v-model="selectedAvatarIndex" :is-open="isAvatarSelectorOpen" :max-avatar-index="maxAvatarIndex"
      @close="isAvatarSelectorOpen = false" @selected="onAvatarSelected" :fullscreen="true" />

    <!-- Custom Stat Selector Modal -->
    <xp-class-codex :is-open="isClassSelectOpen" :user="user" :portrait="avatarSrc"
      @close="isClassSelectOpen = false" @chosen="onClassChosen" />

    <xp-stat-selector-modal :is-open="statSelector.isOpen" :title="statSelector.title" :options="statSelector.options"
      :columns="statSelector.columns" :fullscreen="statSelector.fullscreen" :height="statSelector.height"
      :selected-value="statSelector.selectedValue" @close="statSelector.isOpen = false"
      @select="statSelector.onSelect" />
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonAvatar,
  IonImg,
  IonBadge,
  IonChip,
  IonLabel,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonNote,
  IonList,
  IonSpinner,
  IonToggle,
  alertController
} from "@ionic/vue";
import { JOB_CLASS_OPTIONS, FOOD_OPTIONS, POINT_ICONS, PILLARS, type PillarType } from "@/constants";
import AvatarSelector from "@/app/SideMenu/SwitchProfile/AddProfile/components/AvatarSelector.vue";
import XpStatSelectorModal from "./XpStatSelectorModal.vue";
import XpClassCodex from "./ClassCodex/XpClassCodex.vue";
import XpTextStyleBar from "./XpTextStyleBar.vue";
import XpProfileStatBox from "@/components/molecules/ProfileStatBox/XpProfileStatBox.vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";
import { play$fx } from "@/assets/fx";
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";
import { heroApWindows } from "@/lib/services/abilities/heroAbilityStatus";
import { statEffectLine, statTotal } from "@/lib/services/stats/StatEffects";

// Avatar helper using require.context
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { useHeroBuilder } from "@/hooks/useHeroBuilder";
import XpHeroBuilderModal from "@/components/organisms/HeroModel/XpHeroBuilderModal.vue";
const $requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

export default defineComponent({
  name: 'UserProfileModal',
  components: {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonAvatar,
    IonImg,
    IonBadge,
    IonChip,
    IonLabel,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonNote,
    IonList,
    IonSpinner,
    IonToggle,
    AvatarSelector,
    XpStatSelectorModal,
    XpClassCodex,
    XpTextStyleBar,
    XpProfileStatBox,
    XpCloseButton,
    XpHeroBuilderModal
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    user: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['close'],
  setup(props) {
    const userStore = useUserStore();
    const gameStore = useGameStore();
    const modal = ref<any>(null);
    const maxAvatarIndex = $requireAvatar.keys().length;

    // Avatar selector state
    const isAvatarSelectorOpen = ref(false);
    const selectedAvatarIndex = ref(1);

    // Accordion state
    const activeAccordion = ref<string | null>(null);

    // FAB Style
    const fabStyle = computed(() => gameStore.fabStyle);
    const onFabStyleToggle = (event: CustomEvent) => {
      const isModern = event.detail.checked;
      gameStore.setFabStyle(isModern ? 'modern' : 'retro');
    };

    const dismiss = async () => {
      play$fx('no');
      await modal.value?.$el?.dismiss();
    };

    const router = useRouter();
    const openRecords = async () => {
      play$fx('select');
      await modal.value?.$el?.dismiss();
      await router.push({ name: 'my-records', params: { userId: String(props.user?.id || '') } });
    };

    const openRecap = async () => {
      play$fx('select');
      await modal.value?.$el?.dismiss();
      await router.push({ name: 'my-recap', params: { userId: String(props.user?.id || '') } });
    };

    // Toggle accordion when clicking stat boxes
    const openAccordion = (category: string) => {
      activeAccordion.value = activeAccordion.value === category ? null : category;
    };

    // Parse current avatar index from user
    const getCurrentAvatarIndex = () => {
      const avatar = props.user?.avatar;
      if (!avatar) return 1;
      const match = avatar.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    };

    // The hero's picture: the saved voxel snapshot when there is one, else the chosen SVG
    const avatarSrc = computed(() => heroAvatarSrc(props.user, (key: string) => $requireAvatar(key)));

    // My Look: the hero builder stacks over this sheet (destructured so the template sees the refs unwrapped)
    const {
      isOpen: isBuilderOpen,
      open: openMyLook,
      close: closeBuilder,
      look: builderLook,
      equipment: builderEquipment,
      save: saveBuilderLook,
    } = useHeroBuilder(computed(() => props.user?.id));

    const openAvatarSelector = () => {
      selectedAvatarIndex.value = getCurrentAvatarIndex();
      isAvatarSelectorOpen.value = true;
    };

    // True once the hero this modal shows is held by the store, so edits have somewhere to land
    const isHeroInStore = () => Boolean(props.user?.id && userStore.users[props.user.id]);

    const onAvatarSelected = (index: number) => {
      const paddedIndex = index.toString().padStart(3, "0");
      const newAvatar = `${paddedIndex}-gamer`;

      // Update user in store directly via the users reactive object
      if (isHeroInStore()) {
        userStore.users[props.user.id].avatar = newAvatar;
      }
    };

    // Stat selector state
    interface StatSelectorState {
      isOpen: boolean;
      title: string;
      options: any[];
      columns: number;
      fullscreen: boolean;
      height: string;
      selectedValue: string;
      onSelect: (val: string) => void;
    }

    const statSelector = ref<StatSelectorState>({
      isOpen: false,
      title: '',
      options: [],
      columns: 3,
      fullscreen: false,
      height: 'auto',
      selectedValue: '',
      onSelect: () => { } // No parameter here = No ESLint error
    });

    // Choose Your Class: the full-screen class select (XpClassCodex); setJobClass refuses a sealed class
    const isClassSelectOpen = ref(false);
    const openClassSelector = () => {
      play$fx('openMenu');
      isClassSelectOpen.value = true;
    };
    const onClassChosen = (name: string) => {
      if (isHeroInStore()) userStore.setJobClass(props.user.id, name);
    };

    const openFoodSelector = () => {
      statSelector.value = {
        isOpen: true,
        title: 'Favorite Food',
        options: FOOD_OPTIONS,
        columns: 3,
        fullscreen: true,
        height: 'auto',
        selectedValue: props.user?.favoriteFood || 'None',
        onSelect: (val: string) => {
          if (isHeroInStore()) {
            userStore.users[props.user.id].favoriteFood = val;
          }
          statSelector.value.isOpen = false;
        }
      };
    };

    // The stat lines come from PILLARS, the one copy the code keeps true (docs/Stats-Contract.md)
    const pillarStats = (pillar: PillarType): Record<string, string> =>
      Object.fromEntries(Object.entries(PILLARS[pillar].stats).map(([stat, info]) => [stat, info.description]));

    // Areas data for stats accordions
    const areas = ref({
      physical: {
        label: 'Body',
        open: true,
        color: 'danger',
        description: 'Vitality and endurance',
        stats: pillarStats('physical'),
      },
      mental: {
        label: 'Mind',
        open: false,
        color: 'tertiary',
        description: 'Focus and wisdom',
        stats: pillarStats('mental'),
      },
      vibrational: {
        label: 'Spirit',
        color: 'secondary',
        description: 'Energy and attention',
        stats: pillarStats('vibrational'),
      },
      relational: {
        label: 'Heart',
        color: 'warning',
        description: 'Social presence and trade',
        stats: pillarStats('relational'),
      },
      eternal: {
        label: 'Legend',
        color: 'success',
        description: 'Lasting legacy and growth',
        stats: pillarStats('eternal'),
      }
    });

    // Helper to get class icon
    const getClassIcon = (className: string) => {
      if (!className) return 'fa-shield-alt';
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === className);
      return jobClass?.icon || 'fa-shield-alt';
    };

    // Helper to get food icon
    const getFoodIcon = (foodName: string) => {
      if (!foodName) return 'fa-utensils';
      const food = FOOD_OPTIONS.find(f => f.value === foodName);
      return food?.icon || 'fa-utensils';
    };

    // Helper to get Class Level
    const getClassLevel = (className: string) => {
      const hasNoClassLevels = !className || !props.user?.stats?.classes;
      if (hasNoClassLevels) return 1;
      return props.user.stats.classes[className]?.level || 1;
    };

    // Helper to get area icon (Font Awesome class)
    const getAreaFaIcon = (category: string) => {
      const iconMap: Record<string, string> = {
        physical: 'fa-heartbeat',
        mental: 'fa-brain',
        vibrational: 'fa-waveform',
        eternal: 'fa-atom',
        relational: 'fa-handshake-alt'
      };
      return iconMap[category] || 'fa-chart-bar';
    };

    // Helper to calculate area total
    // The area header sums the same numbers the badges show (base plus special, see getStatTotal)
    const getAreaTotal = (area: any, stats: any) => {
      if (!stats) return 0;
      return Object.keys(area.stats).reduce((total, stat) => total + getStatTotal(stat), 0);
    };

    // XP Calculation Helpers
    const currentLevel = computed(() => props.user?.stats?.level || 1);

    // Calculate progress within current level
    const xpValues = computed(() => {
      const stats = props.user?.stats;
      const xp = stats?.xp;
      if (!xp) return { inLevel: 0, needed: 100 };

      const totalXp = xp.now || xp.current || 0;
      const level = currentLevel.value;
      const xpForCurrent = getXpForLevel(level);
      const xpForNext = getXpForLevel(level + 1);

      return {
        // Amount of XP gained into this level
        inLevel: Math.max(0, totalXp - xpForCurrent),
        // Total XP needed for this level (delta)
        needed: xpForNext - xpForCurrent
      };
    });

    // Experience Progress calculation
    const xpProgress = computed(() => {
      const { inLevel, needed } = xpValues.value;
      const isMaxedOut = needed <= 0;
      if (isMaxedOut) return 1; // maxed out

      return Math.min(Math.max(inLevel / needed, 0), 1);
    });

    // GP Progress calculation (wallet vs max)
    const gpProgress = computed(() => {
      const stats = props.user?.stats;
      const hasNoWallet = !stats || !stats.gp;
      if (hasNoWallet) return 0;

      const wallet = stats.gp.wallet || 0;
      const max = stats.gp.max || 1000;

      return Math.min(Math.max(wallet / max, 0), 1);
    });

    // AP is logged as stats.ap = { total, history }; the windows are summed from the history.
    const apWindows = computed(() => heroApWindows(props.user?.stats?.ap));
    const apTotal = computed(() => apWindows.value.total);

    // Bar fill: today's AP against this week's daily average, capped at 1.
    const apProgress = computed(() => {
      const { daily, weekly } = apWindows.value;
      return weekly > 0 ? Math.min(daily / (weekly / 7), 1) : 0;
    });

    // Check if a pillar is boosted by the user's current class
    const isPillarBoosted = (pillarName: string): boolean => {
      const className = props.user?.jobClass;
      if (!className) return false;
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === className);
      if (!jobClass) return false;
      return (
        jobClass.primaryPillar === pillarName ||
        jobClass.secondaryPillar === pillarName ||
        jobClass.tertiaryPillar === pillarName
      );
    };

    const isStatBoosted = (statName: string): boolean => {
      const className = props.user?.jobClass;
      if (!className) return false;
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === className);
      const hasNoStatBoosts = !jobClass || !jobClass.statBoosts;
      if (hasNoStatBoosts) return false;
      return jobClass.statBoosts.some(boost => boost.stat === statName);
    };

    // The badge: the class's starting number (5 without a class) plus the points trained at level-ups.
    // StatEffects reads the same profile, so the "Trained N" line under a stat matches the badge.
    const getStatTotal = (statName: string): number => statTotal(props.user, statName);

    // Mastery Dice Configuration (Fibonacci Levels)
    const dice = [
      {
        icon: "fa-dice-d4",
        label: "D4",
        limit: 1,
        color: "red",
        title: "Trivial Task Mastery",
        desc: "You can handle simple, quick tasks with ease. Perfect for quick wins!"
      },
      {
        icon: "fa-dice-d6",
        label: "D6",
        limit: 5,
        color: "orange",
        title: "Moderate Task Mastery",
        desc: "You are ready for tasks requiring focus and effort. Household chores are no match for you."
      },
      {
        icon: "fa-dice-d8",
        label: "D8",
        limit: 13,
        color: "yellow",
        title: "Difficult Task Mastery",
        desc: "You can plan and execute complex tasks. Organization is your superpower."
      },
      {
        icon: "fa-dice-d10",
        label: "D10",
        limit: 21,
        color: "green",
        title: "Very Difficult Mastery",
        desc: "Major tasks with multiple parts are within your grasp. You are a project manager in training!"
      },
      {
        icon: "fa-dice-d12",
        label: "D12",
        limit: 34,
        color: "blue",
        title: "Extremely Difficult Mastery",
        desc: "You tackle complex projects with dependencies. Nothing stands in your way."
      },
      {
        icon: "fa-dice-d20",
        label: "D20",
        limit: 55,
        color: "purple",
        title: "Insane Difficulty Mastery",
        desc: "You are a legend capable of massive undertakings. You change the world around you."
      }
    ];

    const isDieUnlocked = (limit: number) => {
      const currentLevel = props.user?.stats?.level || 1;
      return currentLevel >= limit;
    };

    const showDieInfo = async (die: any) => {
      const unlocked = isDieUnlocked(die.limit);
      const header = unlocked ? die.title : `Locked (Lvl ${die.limit})`;
      const message = unlocked
        ? die.desc
        : `Reach Level ${die.limit} to unlock the power of <strong>${die.title}</strong>!`;

      const alert = await alertController.create({
        header,
        message,
        cssClass: 'rpg-alert',
        buttons: ['OK']
      });
      await alert.present();
    };

    return {
      avatarSrc,
      isBuilderOpen,
      openMyLook,
      closeBuilder,
      builderLook,
      builderEquipment,
      saveBuilderLook,
      // Constants
      POINT_ICONS,
      maxAvatarIndex,

      // State
      isAvatarSelectorOpen,
      selectedAvatarIndex,
      activeAccordion,
      statSelector,
      areas,
      fabStyle,

      // Methods
      openAccordion,
      openAvatarSelector,
      onAvatarSelected,
      openClassSelector,
      isClassSelectOpen,
      onClassChosen,
      openFoodSelector,
      getClassIcon,
      getClassLevel,
      getFoodIcon,
      getAreaFaIcon,
      getAreaTotal,
      isPillarBoosted,
      isStatBoosted,
      getStatTotal,
      statEffectLine,
      onFabStyleToggle,
      dice,
      isDieUnlocked,
      showDieInfo,
      modal,
      dismiss,
      openRecords,
      openRecap,

      // Computed
      xpProgress,
      xpValues,
      gpProgress,
      apProgress,
      apTotal
    };
  }
});
</script>

<style lang="scss" src="./_UserProfileModal.scss" />
