<template>
  <ion-item>
    <slot
      name="start"
      slot="start"
    ></slot>
    <ion-label>
      <i
        v-if="achievement.difficulty"
        class="fad ion-float-right text-xl ml-2"
        :class="difficultyIcon"
      />

      <i
        class="fad ion-float-right text-xl mx-2"
        v-if="achievement.basicSchedule"
        :class="basicScheduleIcon"
      />
      <i
        v-if="achievement.type"
        class="fad ion-float-right text-xl mx-2"
        :class="achievementTypeIcon"
        slot="end"
      ></i>
      <i
        v-if="achievement.requiresApproval"
        class="fad fa-clipboard-check ion-float-right text-xl mx-2"
      ></i>
      <i
        v-if="achievement.bonusAchievement"
        class="fad fa-gift ion-float-right text-xl mx-2"
        slot="end"
      ></i>
      <h1>
        {{ achievement.achievementName }}
      </h1>
      <p>
        {{ category?.name }}
        <ion-badge
          color="success"
          class="ion-float-right"
          v-if="achievement.xp > 0"
        >
          <i class="fad fa-hand-holding-seedling mr-2" />
          {{ achievement.xp }}
        </ion-badge>
        <ion-badge
          color="warning"
          class="ion-float-right mx-2"
          v-if="achievement.gp > 0"
        >
          <i class="fad fa-hand-holding-usd mr-2" />
          <xp-gp
            xp-gp
            :gp="achievement.gp"
          ></xp-gp>
        </ion-badge>
        <ion-badge
          color="danger"
          class="ion-float-right"
          v-if="achievement.ap > 0"
        >
          <i class="fad fa-hand-holding-magic mr-2" />
          {{ achievement.ap }}
        </ion-badge>
      </p>
    </ion-label>
    <slot
      name="end"
      slot="end"
    ></slot>
  </ion-item>
</template>

<script lang="ts">
  import { defineComponent } from 'vue';
  import { DIFFICULTY_ICONS, ACHIEVEMENT_TYPE_ICONS, BASIC_SCHEDULE_ICONS } from "@/constants"
  import ionic from "@/mixins/ionic"
  export default defineComponent({
    props: ["achievement", "categories"],
    name: 'XpAchievementItem',
    mixins: [ionic],
    computed: {
      category() {
        const findCatById = cat => cat.id === this.achievement.categoryId
        return this.categories?.find(findCatById)
      },
      achievementTypeIcon() {
        return ACHIEVEMENT_TYPE_ICONS[this.achievement.type]
      },

      basicScheduleIcon() {
        return BASIC_SCHEDULE_ICONS[this.achievement.basicSchedule]
      },

      difficultyIcon() {
        const icon = DIFFICULTY_ICONS[this.achievement.difficulty]
        return icon || 'fa-dice'
      },
    }
  })
</script>