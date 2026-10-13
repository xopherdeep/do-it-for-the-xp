<template>
  <ion-card class="gamer-card">
    <!-- Avatar Section: Centered and Prominent -->
    <div class="avatar-section">
      <ion-avatar
        class="main-avatar cursor-pointer"
        :class="{ 'has-voxel': hasVoxelFace }"
        @click="openAvatarPicker"
        id="avatar-trigger"
      >
        <ion-img
          v-if="currentAvatar"
          :src="currentAvatar"
          class="img-avatar"
        />
      </ion-avatar>
      <p class="avatar-caption">{{ avatarCaption }}</p>
    </div>

    <!-- Name Section: Clear Typography Hierarchy -->
    <div class="name-section">
      <h1 class="profile-name earthbound-title">
        {{ profile?.name.full || "Your Name" }}
      </h1>
      <p
        class="profile-subtitle earthbound-title"
        v-if="profile?.favoriteFood && profile?.jobClass"
      >
        "the {{ profile.favoriteFood }} {{ profile.jobClass }}"
        <span class="loves-text" v-if="profile?.favoriteThing"
          >who loves {{ profile.favoriteThing }}</span
        >
      </p>
      <p class="favorite-thing" v-if="profile?.favoriteThing">
        <i class="fad fa-star mr-1"></i>
        {{ profile?.favoriteThing }}
      </p>
    </div>

    <!-- Icon Selectors: Food and Class (Swapped) with Labels -->
    <div class="selector-section icon-colors">
      <div
        class="selector-card"
        @click="isFoodSelectorOpen = true"
        id="food-trigger"
      >
        <div class="selector-icon food-icon">
          <i :class="`fad ${selectedFoodIcon} fa-3x`" />
        </div>
        <span class="selector-label">Favorite Food</span>
        <span class="selector-value">{{
          profile?.favoriteFood || "Choose"
        }}</span>
      </div>

      <div
        class="selector-card"
        @click="isJobClassSelectorOpen = true"
        id="class-trigger"
      >
        <div class="selector-icon class-icon">
          <i :class="`fad ${selectedJobIcon} fa-3x`" />
        </div>
        <span class="selector-label">Class</span>
        <span class="selector-value">{{ profile?.jobClass || "Choose" }}</span>
      </div>
    </div>

    <!-- Selector Modals/Popovers -->
    <avatar-selector
      v-model="avatarIndex"
      :is-open="isAvatarSelectorOpen"
      :max-avatar-index="maxAvatarIndex"
      :fullscreen="true"
      @close="isAvatarSelectorOpen = false"
      @build="buildHero"
    />

    <xp-hero-builder-modal
      :is-open="isLookOpen"
      :look="profile?.look"
      :equipment="equipment"
      :allow-portrait="true"
      @save="saveLook"
      @portrait="usePortrait"
      @close="isLookOpen = false"
    />

    <job-class-selector
      v-model="jobClass"
      :is-open="isJobClassSelectorOpen"
      @close="isJobClassSelectorOpen = false"
      trigger="class-trigger"
    />

    <food-selector
      v-model="favoriteFood"
      :is-open="isFoodSelectorOpen"
      @close="isFoodSelectorOpen = false"
      trigger="food-trigger"
    />

    <slot></slot>
  </ion-card>
</template>

<script lang="ts">
  import { defineComponent, computed, ref } from "vue";
  import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
  import ionic from "@/lib/mixins/ionic";
  import { heroAvatarSrc } from "@/lib/hero-look/look";
  import type { HeroLook } from "@/lib/hero-look/types";
  import AvatarSelector from "./components/AvatarSelector.vue";
  import XpHeroBuilderModal from "@/components/organisms/HeroModel/XpHeroBuilderModal.vue";
  import JobClassSelector from "./components/JobClassSelector.vue";
  import FoodSelector from "./components/FoodSelector.vue";

  export default defineComponent({
    components: {
      AvatarSelector,
      XpHeroBuilderModal,
      JobClassSelector,
      FoodSelector,
    },
    props: {
      /** The draft profile: `avatar` ("001-gamer"), `look` and `avatarImage` (the voxel face) among the rest */
      profile: {
        type: Object,
        required: true,
      },
      /** What the hero holds (lends the 3D hero its hands); a new profile holds nothing */
      equipment: {
        type: Object,
        default: undefined,
      },
      /** The profile is an existing hero being edited, not one being made */
      editing: {
        type: Boolean,
        default: false,
      },
    },
    emits: [
      "update:avatarIndex",
      "update:jobClass",
      "update:favoriteFood",
      "update:look",
      "update:avatarImage",
    ],
    name: "GamerCard",
    mixins: [ionic],
    setup(props, { emit }) {
      const $requireAvatar = require.context(
        "@/assets/images/avatars",
        false,
        /\.svg$/
      );
      const maxAvatarIndex = $requireAvatar.keys().length;

      // Popover states
      const isAvatarSelectorOpen = ref(false);
      const isJobClassSelectorOpen = ref(false);
      const isFoodSelectorOpen = ref(false);
      const isLookOpen = ref(false);

      // A portrait was picked in this sitting: the hero uses a 2D face from now on
      const portraitPicked = ref(false);

      // Form values that will be v-modeled from parent
      const avatarIndex = computed({
        get: () => parseInt(props.profile.avatar?.split("-")[0] || "1"),
        set: (value) => {
          portraitPicked.value = true;
          emit("update:avatarIndex", value);
          // A portrait picked after a 3D face wins: the voxel picture goes, the look stays to build on
          if (props.profile.avatarImage) emit("update:avatarImage", undefined);
        },
      });

      const jobClass = computed({
        get: () => props.profile.jobClass,
        set: (value) => emit("update:jobClass", value),
      });

      const favoriteFood = computed({
        get: () => props.profile.favoriteFood,
        set: (value) => emit("update:favoriteFood", value),
      });

      // The face on the card: the snapshot of the 3D hero when there is one, else the preset portrait
      const currentAvatar = computed(
        () =>
          heroAvatarSrc(
            { avatar: props.profile.avatar, avatarImage: props.profile.avatarImage },
            (key: string) => $requireAvatar(key)
          ) || undefined
      );
      const hasVoxelFace = computed(() => !!props.profile.avatarImage);

      // Which way the hero is made: a 3D face, or a portrait they picked now, or the only face an existing hero has
      const usesPortrait = computed(() => {
        if (hasVoxelFace.value) return false;
        const storedHeroWithoutLook = props.editing && !props.profile.look;
        return portraitPicked.value || storedHeroWithoutLook;
      });

      // The 3D builder comes first; a hero who already uses a portrait gets the portrait picker (the other way is one tap away)
      const openAvatarPicker = () => {
        if (usesPortrait.value) isAvatarSelectorOpen.value = true;
        else isLookOpen.value = true;
      };

      const avatarCaption = computed(() => {
        const hasMadeAFace = hasVoxelFace.value || usesPortrait.value || !!props.profile.look;
        return hasMadeAFace ? "Tap to change" : "Tap to build your hero";
      });

      // "Build my hero in 3D": the picker gives way to the look builder
      const buildHero = () => {
        isAvatarSelectorOpen.value = false;
        isLookOpen.value = true;
      };

      // "Use a 2D portrait instead": the look builder gives way to the picker
      const usePortrait = () => {
        isLookOpen.value = false;
        isAvatarSelectorOpen.value = true;
      };

      const saveLook = (look: HeroLook, image?: string) => {
        emit("update:look", look);
        emit("update:avatarImage", image);
      };

      const selectedFoodIcon = computed(() => {
        const findFavoriteFood = (food) =>
          food.value === props.profile?.favoriteFood;
        const selectedFood = FOOD_OPTIONS.find(findFavoriteFood);
        return selectedFood ? selectedFood.icon : "fad fa-utensils";
      });

      const selectedJobIcon = computed(() => {
        const findJobClass = (job) => job?.name === props.profile?.jobClass;
        const selectedJob = JOB_CLASS_OPTIONS.find(findJobClass);
        return selectedJob ? selectedJob.icon : "fad fa-question";
      });

      return {
        maxAvatarIndex,
        currentAvatar,
        hasVoxelFace,
        openAvatarPicker,
        avatarCaption,
        buildHero,
        usePortrait,
        saveLook,
        isLookOpen,
        selectedJobIcon,
        selectedFoodIcon,
        isAvatarSelectorOpen,
        isJobClassSelectorOpen,
        isFoodSelectorOpen,
        avatarIndex,
        jobClass,
        favoriteFood,
      };
    },
  });
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound" as eb;

  .gamer-card {
    padding: 1.5rem 1rem;
  }

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .avatar-caption {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 1px;
    color: eb.$eb-color-cream;
    opacity: 0.75;
  }

  .main-avatar {
    width: 100px;
    height: 100px;
    border: 3px solid eb.$eb-color-minty-blue;
    box-shadow: 0 4px 15px rgba(104, 208, 184, 0.3);
    transition: all 0.25s ease;

    &:hover {
      transform: scale(1.08);
      border-color: eb.$eb-color-pale-yellow;
      box-shadow: 0 6px 20px rgba(247, 232, 168, 0.4);
    }
  }

  // A 3D face is a bust on a transparent picture: give it a backdrop
  .main-avatar.has-voxel {
    background: rgba(20, 6, 28, 0.55);
  }

  .img-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .name-section {
    text-align: center;
    margin-bottom: 1.25rem;
  }

  .profile-name {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 0.15rem 0;
    color: eb.$eb-color-pale-yellow;
    text-shadow: 1px 1px 0 eb.$eb-color-slate;
    letter-spacing: 1px;
  }

  .profile-subtitle {
    font-size: 0.95rem;
    color: eb.$eb-color-minty-blue;
    margin: 0 0 0.5rem 0;
    letter-spacing: 0.75px;
    font-weight: 600;
    text-transform: capitalize;
    opacity: 0.9;
    padding: 0 1rem;
    line-height: 1.4;

    .loves-text {
      display: block;
      font-size: 0.85rem;
      color: eb.$eb-color-cream;
      opacity: 0.8;
      margin-top: 2px;
      text-transform: none;
      font-style: italic;
    }
  }

  .favorite-thing {
    font-size: 0.9rem;
    margin: 0;
    color: eb.$eb-color-cream;
    opacity: 0.85;

    i {
      color: eb.$eb-color-pale-yellow;
      font-size: 0.75rem;
    }
  }

  .selector-section {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .selector-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(30, 30, 45, 0.6);
    border-radius: 12px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 110px;

    &:hover {
      transform: translateY(-3px);
      border-color: eb.$eb-color-minty-blue;
      box-shadow: 0 4px 12px rgba(104, 208, 184, 0.25);
    }

    &:active {
      transform: translateY(-1px);
    }
  }

  .selector-icon {
    margin-bottom: 0.5rem;
  }

  .selector-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: eb.$eb-color-cream;
    opacity: 0.7;
    margin-bottom: 0.15rem;
    font-weight: 700;
  }

  .selector-value {
    font-size: 0.8rem;
    font-weight: 600;
    color: eb.$eb-color-pale-yellow;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
  }
</style>
