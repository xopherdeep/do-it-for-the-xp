<template>
  <ion-card>
    <ion-grid>
      <ion-row class="ion-justify-center ion-align-middle">
        <ion-col size="2">
          <ion-avatar 
            size="large" 
            class="cursor-pointer hover:opacity-80" 
            @click="isAvatarSelectorOpen = true"
            id="avatar-trigger"
          >
            <ion-img
              v-if="profile?.avatar"
              :src="currentAvatar"
              class="img-avatar"
            />
          </ion-avatar>
        </ion-col>
        <ion-col>
          <ion-label>
            <h1>{{ profile?.name.full }}</h1>
            <p>{{ profile?.favoriteThing }}</p>
          </ion-label>
        </ion-col>
        <ion-col class="ion-text-center" size="2">
          <div 
            class="class-icon cursor-pointer hover:opacity-80" 
            @click="isJobClassSelectorOpen = true"
            id="class-trigger"
          >
            <i :class="`fad ${selectedJobIcon} fa-4x`" />
          </div>
        </ion-col>
        <ion-col class="ion-text-center" size="2">
          <div 
            class="food-icon cursor-pointer hover:opacity-80" 
            @click="isFoodSelectorOpen = true"
            id="food-trigger"
          >
            <i :class="`fad ${selectedFoodIcon} fa-4x`" />
          </div>
        </ion-col>
      </ion-row>
    </ion-grid>

    <!-- Selector Popovers -->
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
import ionic from "@/mixins/ionic";
import AvatarSelector from "./components/AvatarSelector.vue";
import JobClassSelector from "./components/JobClassSelector.vue";
import FoodSelector from "./components/FoodSelector.vue";

export default defineComponent({
  components: {
    AvatarSelector,
    JobClassSelector,
    FoodSelector
  },
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  name: "GamerCard",
  mixins: [ionic],
  setup(props, { emit }) {
    const $requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);
    const maxAvatarIndex = $requireAvatar.keys().length;

    // Popover states
    const isAvatarSelectorOpen = ref(false);
    const isJobClassSelectorOpen = ref(false);
    const isFoodSelectorOpen = ref(false);

    // Form values that will be v-modeled from parent
    const avatarIndex = computed({
      get: () => parseInt(props.profile.avatar?.split("-")[0] || "1"),
      set: (value) => emit('update:avatarIndex', value)
    });

    const jobClass = computed({
      get: () => props.profile.jobClass,
      set: (value) => emit('update:jobClass', value)
    });

    const favoriteFood = computed({
      get: () => props.profile.favoriteFood,
      set: (value) => emit('update:favoriteFood', value)
    });

    // Icon computations
    const currentAvatar = computed(() => 
      $requireAvatar(`./${avatarIndex.value.toString().padStart(3, "0")}-gamer.svg`)
    );

    const selectedFoodIcon = computed(() => {
      const findFavoriteFood = (food) => food.value === props.profile?.favoriteFood;
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
      favoriteFood
    };
  },
});
</script>

<style lang="scss" scoped>
.class-icon, .food-icon {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

ion-avatar {
  width: 80px;
  height: 80px;
  margin: auto;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.img-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
