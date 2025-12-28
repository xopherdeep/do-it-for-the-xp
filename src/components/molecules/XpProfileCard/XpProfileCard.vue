<template>
  <ion-card
    class="xp-profile-card"
    :class="{ selected }"
    button
    @click="$emit('select', user)"
  >
    <ion-card-header class="ion-text-center">
      <ion-card-title class="earthbound-title profile-nickname">
        {{ user.name.nick }}
      </ion-card-title>
      <ion-avatar class="profile-avatar">
        <img
          :src="avatarSrc"
          alt="Avatar"
        />
      </ion-avatar>
    </ion-card-header>

    <ion-card-content>
      <p class="profile-fullname">
        {{ user.name.full }}
      </p>

      <!-- Stats Row: Level + GP -->
      <div class="stats-row">
        <div class="level-box">
          <span class="stat-label">LVL</span>
          <span class="stat-value">{{ user?.stats?.level || 1 }}</span>
        </div>
        <div class="gp-box">
          <i class="fad fa-coins" />
          <span class="stat-value">{{ formattedGp }}</span>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue";
import User from "@/lib/utils/User";

const requireAvatar = require.context("@/assets/images/avatars/");

export default defineComponent({
  name: "XpProfileCard",
  props: {
    user: {
      type: Object as PropType<User>,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["select"],
  setup(props) {
    const avatarSrc = computed(() => {
      if (props.user?.avatar) {
        try {
          return requireAvatar(`./${props.user.avatar}.svg`);
        } catch {
          return requireAvatar("./001-gamer.svg");
        }
      }
      return requireAvatar("./001-gamer.svg");
    });

    const formattedGp = computed(() => {
      const gp = props.user?.stats?.gp?.wallet || 0;
      if (gp >= 1000) {
        return `${(gp / 1000).toFixed(1)}k`;
      }
      return gp.toString();
    });

    return {
      avatarSrc,
      formattedGp,
    };
  },
});
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound" as eb;

  .xp-profile-card {
    position: relative;
    height: 220px;
    display: flex;
    flex-direction: column;
    transition: all 0.25s ease;
    overflow: visible;

    // Hover glow effect
    &:hover {
      transform: translateY(-4px);
      box-shadow:
        0 0 0 5px eb.$eb-color-medium-purple,
        0 0 0 10px eb.$eb-color-minty-blue,
        0 0 0 12px eb.$eb-color-pale-yellow,
        0 0 0 16px eb.$eb-color-slate,
        0 8px 25px rgba(104, 208, 184, 0.4);
    }

    &:active {
      transform: translateY(-2px) scale(0.98);
    }

    &.selected {
      box-shadow:
        0 0 0 5px eb.$eb-color-medium-purple,
        0 0 0 10px var(--ion-color-success),
        0 0 0 12px eb.$eb-color-pale-yellow,
        0 0 0 16px eb.$eb-color-slate,
        0 0 20px rgba(var(--ion-color-success-rgb), 0.5);
    }
  }

  // Card Header
  ion-card-header {
    padding-bottom: 0.5rem;
  }

  .profile-nickname {
    font-size: 1rem !important;
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    margin: 0 auto;
    border: 3px solid eb.$eb-color-minty-blue;
    transition: all 0.2s ease;

    .xp-profile-card:hover & {
      border-color: eb.$eb-color-pale-yellow;
      transform: scale(1.05);
    }

    img {
      width: 100%;
      height: 100%;
    }
  }

  // Card Content
  ion-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-top: 0.5rem;
  }

  .profile-fullname {
    font-size: 0.75rem;
    color: eb.$eb-color-cream;
    text-align: center;
    margin: 0;
    // Truncate long names to 2 lines
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
    min-height: 2.6em;
  }

  // Stats Row: Level + GP on same line
  .stats-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .level-box {
    flex: 0 0 30%; // Level takes 30%
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: linear-gradient(135deg, rgba(80, 250, 123, 0.25), rgba(61, 216, 103, 0.15));
    border-radius: 6px;
    border: 1px solid rgba(80, 250, 123, 0.3);

    .stat-label {
      font-size: 0.5rem;
      font-weight: 700;
      color: #50fa7b;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 0.9rem;
      font-weight: 900;
      color: #50fa7b;
    }
  }

  .gp-box {
    flex: 1; // GP takes remaining space
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 193, 7, 0.15);
    border-radius: 6px;
    border: 1px solid rgba(255, 193, 7, 0.2);

    i {
      color: var(--ion-color-warning);
      font-size: 0.9rem;
    }

    .stat-value {
      color: var(--ion-color-warning);
      font-weight: 700;
      font-size: 0.85rem;
      font-family: "Twoson", sans-serif;
    }
  }
</style>
