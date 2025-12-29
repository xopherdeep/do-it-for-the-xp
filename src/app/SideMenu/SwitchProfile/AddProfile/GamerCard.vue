<template>
  <ion-card class="gamer-card">
    <!-- Avatar Section: Centered and Prominent -->
    <div class="avatar-section">
      <ion-avatar
        class="main-avatar cursor-pointer"
        @click="isAvatarSelectorOpen = true"
        id="avatar-trigger"
      >
        <ion-img
          v-if="profile?.avatar"
          :src="currentAvatar"
          class="img-avatar"
        />
      </ion-avatar>
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
      @close="isAvatarSelectorOpen = false"
      trigger="avatar-trigger"
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
  import AvatarSelector from "./components/AvatarSelector.vue";
  import JobClassSelector from "./components/JobClassSelector.vue";
  import FoodSelector from "./components/FoodSelector.vue";

  export default defineComponent({
    components: {
      AvatarSelector,
      JobClassSelector,
      FoodSelector,
    },
    props: {
      profile: {
        type: Object,
        required: true,
      },
    },
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

      // Form values that will be v-modeled from parent
      const avatarIndex = computed({
        get: () => parseInt(props.profile.avatar?.split("-")[0] || "1"),
        set: (value) => emit("update:avatarIndex", value),
      });

      const jobClass = computed({
        get: () => props.profile.jobClass,
        set: (value) => emit("update:jobClass", value),
      });

      const favoriteFood = computed({
        get: () => props.profile.favoriteFood,
        set: (value) => emit("update:favoriteFood", value),
      });

      // Icon computations
      const currentAvatar = computed(() =>
        $requireAvatar(
          `./${avatarIndex.value.toString().padStart(3, "0")}-gamer.svg`
        )
      );

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

  // Avatar Section
  .avatar-section {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
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

  .img-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // Name Section
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

  // Selector Section
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
