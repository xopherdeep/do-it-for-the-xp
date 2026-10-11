<template>
  <ion-item
    :disabled="$attrs.disabled"
    class="quest-list-item"
  >
    <slot
      name="start"
      slot="start"
    ></slot>

    <!-- Avatar with fallback -->
    <ion-avatar
      slot="start"
      class="quest-avatar"
    >
      <!-- Beast Preview -->
      <template v-if="achievement.adventureType === 'beast'">
        <ion-img
          v-if="beastAvatarUrl"
          class="beast-img"
          :src="beastAvatarUrl"
          :alt="activeBeast?.name"
        />
        <div
          v-else
          class="fallback-avatar"
        >
          <i class="fad fa-paw-claws fa-lg" />
        </div>
      </template>

      <!-- Custom Image -->
      <ion-img
        v-else-if="achievement.imageUrl"
        :src="achievement.imageUrl"
      />

      <!-- Combo Icon Fallback -->
      <div
        v-else
        class="fallback-avatar"
      >
        <i :class="comboIcon" />
      </div>
    </ion-avatar>

    <ion-label>
      <!-- Status Icons Row -->
      <div class="status-icons">
        <i
          v-if="achievement.difficulty"
          class="fad"
          :class="difficultyIcon"
          role="img"
          :title="statusLabels.difficulty"
          :aria-label="statusLabels.difficulty"
        />
        <i
          v-if="achievement.basicSchedule"
          class="fad"
          :class="basicScheduleIcon"
          role="img"
          :title="statusLabels.schedule"
          :aria-label="statusLabels.schedule"
        />
        <i
          v-if="achievement.type"
          class="fad"
          :class="achievementTypeIcon"
          role="img"
          :title="statusLabels.assignment"
          :aria-label="statusLabels.assignment"
        />
        <i
          v-if="achievement.requiresApproval"
          class="fad fa-clipboard-check"
          role="img"
          :title="statusLabels.approval"
          :aria-label="statusLabels.approval"
        />
        <i
          v-if="achievement.bonusAchievement"
          class="fad fa-gift"
          role="img"
          :title="statusLabels.bonus"
          :aria-label="statusLabels.bonus"
        />
      </div>

      <!-- Quest Name with placeholder -->
      <h2 class="quest-title">
        <span
          v-if="achievement.achievementName"
          v-html="sanitizeHtml(formatQuestName(achievement.achievementName))"
        />
        <span
          v-else
          class="placeholder-text"
        >Untitled Quest</span>
        <span
          v-if="achievement.draft"
          class="draft-badge"
          title="Draft: heroes don't see this quest until it is finished"
        >Draft</span>
      </h2>

      <!-- Who & When, Rewards Row -->
      <p class="quest-meta">
        <span class="quest-subtitle">{{ subtitle }}</span>

        <!-- Reward Badges -->
        <span
          class="reward-badges"
          v-if="showPoints"
        >
          <ion-badge
            color="danger"
            v-if="achievement.ap > 0"
            :title="`${formatPoints(achievement.ap)} AP`"
            :aria-label="`${formatPoints(achievement.ap)} AP`"
          >
            <i class="fad fa-hand-holding-magic mr-1" />{{ formatPoints(achievement.ap) }}
          </ion-badge>
          <ion-badge
            color="warning"
            v-if="achievement.gp > 0"
            :title="`${formatPoints(achievement.gp)} GP`"
            :aria-label="`${formatPoints(achievement.gp)} GP`"
          >
            <i class="fad fa-hand-holding-usd mr-1" />{{ formatPoints(achievement.gp) }}
          </ion-badge>
          <ion-badge
            color="success"
            v-if="achievement.xp > 0"
            :title="`${formatPoints(achievement.xp)} XP`"
            :aria-label="`${formatPoints(achievement.xp)} XP`"
          >
            <i class="fad fa-hand-holding-seedling mr-1" />{{ formatPoints(achievement.xp) }}
          </ion-badge>
        </span>
      </p>
    </ion-label>

    <slot
      name="end"
      slot="end"
    ></slot>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  DIFFICULTY_ICONS,
  ACHIEVEMENT_TYPE_ICONS,
  BASIC_SCHEDULE_ICONS,
  LORE_COMBO_MATRIX,
} from "@/constants";
import ionic from "@/lib/mixins/ionic";
import { formatQuestName } from "@/lib/utils/format";
import { formatPoints, questSubtitle, statusIconLabels } from "@/lib/services/quests/QuestLabels";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
export default defineComponent({
  // users: the family's profiles, for the hero nicknames; groupBy: the list's grouping, so the subtitle skips what the group header already says
  props: ["achievement", "categories", "showPoints", "beasts", "users", "groupBy"],
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
    comboIcon() {
      const assignment = this.achievement.type || "asNeeded";
      const depth = this.achievement.adventureType || "simple";
      const combo = LORE_COMBO_MATRIX[assignment]?.[depth] || {
        icon: "fa-scroll",
      };
      return `fad ${combo.icon} fa-lg`;
    },
    activeBeast() {
      if (!this.achievement.beastId || !this.beasts) return null;
      return this.beasts.find((b) => b.id === this.achievement.beastId);
    },
    beastAvatarUrl(): string | null {
      if (!this.activeBeast) return null;
      if (this.activeBeast.imageUrl) return this.activeBeast.imageUrl;
      if (this.activeBeast.localImage) return this.activeBeast.localImage;
      if (this.activeBeast.avatar) {
        try {
          const pad = this.activeBeast.avatar.toString().padStart(3, "0");
          return require(`@/assets/images/beasts/${pad}.png`);
        } catch {
          return null;
        }
      }
      return null;
    },
    statusLabels() {
      return statusIconLabels(this.achievement);
    },
    // Who and when; a list grouped by hero already names the hero, so it names the category instead
    subtitle(): string {
      const byAssignee = this.groupBy === "assignee";
      const categoryName = this.category?.name || "Uncategorized";
      return questSubtitle(this.achievement, this.users, categoryName, byAssignee);
    },
  },
  methods: {
    formatQuestName,
    formatPoints,
    sanitizeHtml,
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

    // Beast sprites keep their shape inside the round avatar instead of being cropped
    .beast-img::part(image) {
      object-fit: contain;
    }

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

    // A quest saved while incomplete: heroes don't see it yet
    .draft-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 6px;
      font-family: "StatusPlz", var(--xp-font-heading);
      font-size: 0.7rem;
      letter-spacing: 1px;
      line-height: 1.2;
      text-transform: uppercase;
      color: #280828;
      background: #f7e8a8;
      border: 2px solid #383050;
      border-radius: 2px;
      vertical-align: middle;
    }
  }

  .quest-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 8px;
    margin: 0;
    font-size: 0.85rem;

    .quest-subtitle {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: rgba(255, 255, 255, 0.65);
    }

    .reward-badges {
      display: flex;
      gap: 6px;
      margin-left: auto;

      ion-badge {
        font-size: 0.7rem;
        padding: 4px 8px;
      }
    }
  }
</style>
