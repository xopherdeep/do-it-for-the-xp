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
    </ion-header>

    <ion-content class="icon-colors bg-slide bg-slide-dark">
      <!-- Profile Card Content -->
      <div v-if="user && user.stats" class="profile-content">

        <!-- Stats Flex Layout -->
        <div class="stats-flex">
          <!-- Row 1: Avatar | Class | Food -->
          <div class="stats-row">
            <div class="stat-box avatar-box" @click="openAvatarSelector">
              <div class="avatar-container">
                <ion-avatar class="hero-avatar">
                  <ion-img :src="$requireAvatar(`./${user.avatar || '001-gamer'}.svg`)" />
                </ion-avatar>
                <div class="edit-overlay">
                  <i class="fad fa-camera"></i>
                </div>
              </div>
            </div>

            <div class="stat-box class-box" @click="openClassSelector">
              <div class="stat-icon">
                <i :class="`fad ${getClassIcon(user.jobClass)} fa-3x`"></i>
              </div>
              <div class="stat-details">
                <span class="stat-label">CLASS LVL {{ getClassLevel(user.jobClass) }}</span>
                <span class="stat-value large">{{ user.jobClass || 'Adventurer' }}</span>
              </div>
            </div>

            <div class="stat-box food-box" @click="openFoodSelector">
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
              :color="POINT_ICONS.ap.color" :current="apPercent" :progress="apProgress" :is-percentage="true"
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

        <!-- Five Pillars Explanation - shows when no accordion is open -->
        <Transition name="pillars-fade">
          <div v-if="!activeAccordion" class="pillars-explanation">
            <h3 class="pillars-title">The Five Pillars of Heroism</h3>
            <p class="pillars-text">
              A true hero balances Body, Mind, Spirit, Heart, and Legend. Tap a pillar to see how your training shapes
              your destiny.
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

    <!-- Avatar Selector Modal -->
    <avatar-selector v-model="selectedAvatarIndex" :is-open="isAvatarSelectorOpen" :max-avatar-index="maxAvatarIndex"
      @close="isAvatarSelectorOpen = false" @selected="onAvatarSelected" :fullscreen="true" />

    <!-- Custom Stat Selector Modal -->
    <xp-stat-selector-modal :is-open="statSelector.isOpen" :title="statSelector.title" :options="statSelector.options"
      :columns="statSelector.columns" :fullscreen="statSelector.fullscreen" :height="statSelector.height"
      :selected-value="statSelector.selectedValue" @close="statSelector.isOpen = false"
      @select="statSelector.onSelect" />
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
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
import { JOB_CLASS_OPTIONS, FOOD_OPTIONS, POINT_ICONS } from "@/constants";
import AvatarSelector from "@/app/SideMenu/SwitchProfile/AddProfile/components/AvatarSelector.vue";
import XpStatSelectorModal from "./XpStatSelectorModal.vue";
import XpProfileStatBox from "@/components/molecules/ProfileStatBox/XpProfileStatBox.vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";
import { play$fx } from "@/assets/fx";
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";

// Avatar helper using require.context
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
    XpProfileStatBox,
    XpCloseButton
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

    console.log('UserProfileModal setup running');


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

    // Toggle accordion when clicking stat boxes
    const openAccordion = (category: string) => {
      activeAccordion.value = activeAccordion.value === category ? null : category;
    };

    // Parse current avatar index from user
    const getCurrentAvatarIndex = () => {
      if (!props.user?.avatar) return 1;
      const match = props.user.avatar.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    };

    const openAvatarSelector = () => {
      selectedAvatarIndex.value = getCurrentAvatarIndex();
      isAvatarSelectorOpen.value = true;
    };

    const onAvatarSelected = (index: number) => {
      const paddedIndex = index.toString().padStart(3, "0");
      const newAvatar = `${paddedIndex}-gamer`;

      // Update user in store directly via the users reactive object
      if (props.user?.id && userStore.users[props.user.id]) {
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

    const openClassSelector = () => {
      statSelector.value = {
        isOpen: true,
        title: 'Choose Your Class',
        options: JOB_CLASS_OPTIONS,
        columns: 2,
        fullscreen: false,
        height: '55vh',
        selectedValue: props.user?.jobClass || 'Adventurer',
        onSelect: (val: string) => {
          if (props.user?.id && userStore.users[props.user.id]) {
            userStore.users[props.user.id].jobClass = val;
          }
          statSelector.value.isOpen = false;
        }
      };
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
          if (props.user?.id && userStore.users[props.user.id]) {
            userStore.users[props.user.id].favoriteFood = val;
          }
          statSelector.value.isOpen = false;
        }
      };
    };

    // Areas data for stats accordions
    const areas = ref({
      physical: {
        label: 'Body',
        open: true,
        color: 'danger',
        description: 'Vitality and endurance',
        stats: {
          defense: 'Increases Maximum HP capacity',
          strength: 'Decreases HP loss when taking damage',
          endurance: 'Boosts HP recovery and restoration',
        }
      },
      mental: {
        label: 'Mind',
        open: false,
        color: 'tertiary',
        description: 'Focus and wisdom',
        stats: {
          perception: 'Increases Maximum MP capacity',
          intelligence: 'Decreases MP cost for active abilities',
          wisdom: 'Boosts MP recovery and meditation rate',
        }
      },
      vibrational: {
        label: 'Spirit',
        color: 'secondary',
        description: 'Energy and attention',
        stats: {
          agility: 'Gain more AP when completing tasks',
          focus: 'Influence chances of receiving bonus AP points',
          flow: 'Reduces AP cost for active abilities'
        }
      },
      relational: {
        label: 'Heart',
        color: 'warning',
        description: 'Social presence and trade',
        stats: {
          awareness: 'Influences the amount of GP awarded',
          presence: 'Influences GP to $ conversion and trade rates',
          charisma: 'Reduces the GP cost of items in shops',
        }
      },
      eternal: {
        label: 'Legend',
        color: 'success',
        description: 'Lasting legacy and growth',
        stats: {
          guts: 'Influences the amount of XP awarded',
          luck: 'Influence chances of receiving bonus XP points',
          mastery: 'Reduces the XP threshold required to reach the next Level'
        }
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
      if (!className || !props.user?.stats?.classes) return 1;
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
    const getAreaTotal = (area: any, stats: any) => {
      if (!stats) return 0;
      return Object.keys(area.stats).reduce((total, stat) => {
        return total + (stats[stat] || 0);
      }, 0);
    };

    // XP Calculation Helpers
    const currentLevel = computed(() => props.user?.stats?.level || 1);

    // Calculate progress within current level
    const xpValues = computed(() => {
      const stats = props.user?.stats;
      if (!stats?.xp) return { inLevel: 0, needed: 100 };

      const totalXp = stats.xp.now || stats.xp.current || 0;
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
      if (needed <= 0) return 1; // maxed out
      return Math.min(Math.max(inLevel / needed, 0), 1);
    });

    // GP Progress calculation (wallet vs max)
    const gpProgress = computed(() => {
      const stats = props.user?.stats;
      if (!stats || !stats.gp) return 0;

      const wallet = stats.gp.wallet || 0;
      const max = stats.gp.max || 1000;

      return Math.min(Math.max(wallet / max, 0), 1);
    });

    // AP calculations (today vs week - measuring consistency)
    const apToday = computed(() => {
      const stats = props.user?.stats;
      if (!stats || !stats.ap) return 0;

      if (typeof stats.ap === 'object') {
        return stats.ap.today || 0;
      }
      return 0;
    });

    const apWeek = computed(() => {
      const stats = props.user?.stats;
      if (!stats || !stats.ap) return 0;

      if (typeof stats.ap === 'object') {
        return stats.ap.week || stats.ap.total || 0;
      }
      return stats.ap || 0;
    });

    const apProgress = computed(() => {
      const today = parseFloat(String(apToday.value));
      const week = parseFloat(String(apWeek.value));

      if (isNaN(today) || isNaN(week) || week <= 0) return 0;
      return Math.min(Math.max(today / week, 0), 1);
    });

    // AP as percentage for energy meter display
    const apPercent = computed(() => {
      const progress = apProgress.value;
      return isNaN(progress) ? 0 : Math.round(progress * 100);
    });

    // Check if a pillar is boosted by the user's current class
    const isPillarBoosted = (pillarName: string): boolean => {
      if (!props.user?.jobClass) return false;
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === props.user.jobClass);
      if (!jobClass) return false;
      return (
        jobClass.primaryPillar === pillarName ||
        jobClass.secondaryPillar === pillarName ||
        jobClass.tertiaryPillar === pillarName
      );
    };

    const isStatBoosted = (statName: string): boolean => {
      if (!props.user?.jobClass) return false;
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === props.user.jobClass);
      if (!jobClass || !jobClass.statBoosts) return false;
      return jobClass.statBoosts.some(boost => boost.stat === statName);
    };

    // Calculate total stat value (Base + Bonus)
    const getStatTotal = (statName: string): number => {
      // 1. Get Base Stat for Class
      // Default to Adventurer or generic fallback if class not found
      const jobClassName = props.user?.jobClass || 'Adventurer';
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === jobClassName);

      // Default base stat if not defined is 5
      const base = jobClass?.baseStats?.[statName] || 5;

      // 2. Get Special Stat Bonus (Level Ups)
      // user.stats.special might be undefined
      const special = props.user?.stats?.special?.[statName] || 0;

      return base + special;
    };

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
      openFoodSelector,
      getClassIcon,
      getClassLevel,
      getFoodIcon,
      getAreaFaIcon,
      getAreaTotal,
      isPillarBoosted,
      isStatBoosted,
      getStatTotal,
      onFabStyleToggle,
      dice,
      isDieUnlocked,
      showDieInfo,
      modal,
      dismiss,

      // Computed
      xpProgress,
      xpValues,
      gpProgress,
      apProgress,
      apPercent
    };
  }
});
</script>

<style lang="scss">
// Styles are in earthbound.scss for the .user-profile-modal class
.user-profile-modal {
  .mastery-dice-row {
    display: flex !important;
    justify-content: space-between;
    gap: 0.5rem;

    .dice-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      min-height: 80px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;

      // Colors
      &.red i {
        color: #ff5252;
      }

      &.orange i {
        color: #ffa726;
      }

      &.yellow i {
        color: #ffd740;
      }

      &.green i {
        color: #69f0ae;
      }

      &.blue i {
        color: #40c4ff;
      }

      &.purple i {
        color: #b388ff;
      }

      .dice-inner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;

        i {
          font-size: 2rem;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
        }

        .lock-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
          z-index: 2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        }
      }

      .dice-label {
        font-family: "Apple Kid", sans-serif;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.9);
        text-transform: uppercase;
        letter-spacing: 1px;
        z-index: 2;

        .lock-label {
          font-size: 0.6rem;
          opacity: 0.6;
          font-family: "StatusPlz", serif;
        }
      }

      // Locked State
      &.is-locked {
        background: rgba(0, 0, 0, 0.2);
        border-style: dashed;
        opacity: 0.7;

        i {
          color: #555 !important; // Grayscale base
          filter: grayscale(100%) !important;
          opacity: 0.3;
          transform: scale(0.9);
        }
      }

      // Hover Effect (Unlocked)
      &:not(.is-locked):hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);

        i {
          transform: scale(1.15) rotate(5deg);
          filter: drop-shadow(0 0 8px currentColor); // Glow in its own color
        }
      }
    }
  }
}
</style>
