<template>
  <ion-item :disabled="$attrs.disabled" class="quest-list-item">
    <slot name="start" slot="start"></slot>

    <!-- Avatar with fallback -->
    <ion-avatar slot="start" class="quest-avatar">
      <ion-img v-if="achievement.imageUrl" :src="achievement.imageUrl" />
      <div v-else class="fallback-avatar">
        <i :class="fallbackIcon" />
      </div>
    </ion-avatar>

    <ion-label>
      <!-- Status Icons Row -->
      <div class="status-icons">
        <i
          v-if="achievement.difficulty"
          class="fad"
          :class="difficultyIcon"
          :title="`Difficulty: ${achievement.difficulty}`"
        />
        <i
          v-if="achievement.basicSchedule"
          class="fad"
          :class="basicScheduleIcon"
          :title="achievement.basicSchedule"
        />
        <i
          v-if="achievement.type"
          class="fad"
          :class="achievementTypeIcon"
          :title="achievement.type"
        />
        <i
          v-if="achievement.requiresApproval"
          class="fad fa-clipboard-check"
          title="Requires Approval"
        />
        <i
          v-if="achievement.bonusAchievement"
          class="fad fa-gift"
          title="Bonus Quest"
        />
      </div>

      <!-- Quest Name with placeholder -->
      <h2 class="quest-title">
        <span
          v-if="achievement.achievementName"
          v-html="achievement.achievementName"
        />
        <span v-else class="placeholder-text">Untitled Quest</span>
      </h2>

      <!-- Category & Rewards Row -->
      <p class="quest-meta">
        <span class="category-name">
          {{ category?.name || "Uncategorized" }}
        </span>

        <!-- Reward Badges -->
        <span class="reward-badges" v-if="showPoints">
          <ion-badge color="danger" v-if="achievement.ap > 0">
            <i class="fad fa-hand-holding-magic mr-1" />{{ achievement.ap }}
          </ion-badge>
          <ion-badge color="warning" v-if="achievement.gp > 0">
            <i class="fad fa-hand-holding-usd mr-1" /><xp-gp
              :gp="achievement.gp"
            />
          </ion-badge>
          <ion-badge color="success" v-if="achievement.xp > 0">
            <i class="fad fa-hand-holding-seedling mr-1" />{{ achievement.xp }}
          </ion-badge>
        </span>
      </p>
    </ion-label>

    <slot name="end" slot="end"></slot>
  </ion-item>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import {
    DIFFICULTY_ICONS,
    ACHIEVEMENT_TYPE_ICONS,
    BASIC_SCHEDULE_ICONS,
  } from "@/constants";
  import ionic from "@/lib/mixins/ionic";
  export default defineComponent({
    props: ["achievement", "categories", "showPoints"],
    name: "XpAchievementItem",
    mixins: [ionic],
    computed: {
      category() {
        const findCatById = (cat) => cat.id === this.achievement.categoryId;
        return this.categories?.find(findCatById);
      },
      achievementTypeIcon() {
        return ACHIEVEMENT_TYPE_ICONS[this.achievement.type];
      },

      basicScheduleIcon() {
        return BASIC_SCHEDULE_ICONS[this.achievement.basicSchedule];
      },

      difficultyIcon() {
        const icon = DIFFICULTY_ICONS[this.achievement.difficulty];
        return icon || "fa-dice";
      },

      fallbackIcon() {
        const icon = ACHIEVEMENT_TYPE_ICONS[this.achievement.type];
        return `fad ${icon || "fa-scroll"} fa-lg`;
      },
    },
  });
</script>

<style lang="scss" scoped>
  .quest-list-item {
    --background: rgba(25, 27, 46, 0.6);
    --border-color: rgba(255, 255, 255, 0.05);
    margin-bottom: 4px;
    border-radius: 12px;
    backdrop-filter: blur(8px);
  }

  .quest-avatar {
    width: 48px;
    height: 48px;

    .fallback-avatar {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .status-icons {
    float: right;
    display: flex;
    gap: 8px;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.6);

    i {
      cursor: help;
    }
  }

  .quest-title {
    font-family: var(--xp-font-heading);
    font-size: 1rem;
    margin: 0 0 4px;
    color: white;

    .placeholder-text {
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }
  }

  .quest-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    font-size: 0.85rem;

    .category-name {
      color: rgba(255, 255, 255, 0.5);
    }

    .reward-badges {
      display: flex;
      gap: 6px;

      ion-badge {
        font-size: 0.7rem;
        padding: 4px 8px;
      }
    }
  }
</style>
