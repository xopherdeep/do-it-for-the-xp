<template>
  <ion-card>
    <ion-grid>
      <ion-row class="ion-justify-center ion-align-middle">
        <ion-col
          class="ion-text-center"
          size="2"
        >
          <i :class="`${selectedJobIcon} fa-4x`" />
        </ion-col>
        <ion-col
          class="ion-text-center"
          size="2"
        >
          <i :class="`${selectedFoodIcon} fa-4x`" />
        </ion-col>
        <ion-col>
          <ion-label>
            <h1>
              {{ profile?.name.full }}
            </h1>
            <p>
              {{ profile?.favoriteThing }}
            </p>
            <p>
              &nbsp;
              <ion-badge color="success">
                Level {{ profile?.stats.level || 1 }}
              </ion-badge>
              <ion-badge
                color="warning"
                class="ion-float-right"
              >
                <xp-gp :gp="profile?.stats.gp.wallet || 0" />
              </ion-badge>
            </p>
          </ion-label>
        </ion-col>
        <ion-col size="2">
          <ion-avatar size="large">
            <ion-img
              v-if="profile?.avatar"
              :src="currentAvatar"
              class="img-avatar"
            />
          </ion-avatar>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-card>
</template>
<script lang="ts">
  import { defineComponent, computed, ref } from 'vue';
  import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
  import ionic from "@/mixins/ionic";

  import XpGp from "@/components/XpGp/XpGp.vue"

  export default defineComponent({
    props: ['profile'],
    components: { XpGp },
    name: 'GamerCard',
    mixins: [ionic],
    setup(props) {
      const $requireAvatar = require.context(
        "@/assets/images/avatars",
        false,
        /\.svg$/
      );

      const currentAvatar = computed(() =>
        $requireAvatar(`./${props.profile.avatar}.svg`)
      );

      const foodOptions = ref(FOOD_OPTIONS);
      const selectedFoodIcon = computed(() => {
        const findFavoriteFood = (food) => food.value === props.profile?.favoriteFood;
        const selectedFood = foodOptions.value.find(findFavoriteFood);
        return selectedFood ? selectedFood.icon : "fad fa-utensils";
      });

      const jobClassOptions = ref(JOB_CLASS_OPTIONS);
      const selectedJobIcon = computed(() => {
        const findJobClass = (job) => job?.name === props.profile?.jobClass;
        const selectedJob = jobClassOptions.value.find(findJobClass);
        return selectedJob ? selectedJob.icon : "fad fa-question";
      });

      return {
        currentAvatar,
        selectedJobIcon,
        selectedFoodIcon,
      };
    },
  });


</script>
