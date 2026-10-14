<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
          <xp-icon
            icon="chart-bar"
            primary="blue"
            secondary="lightblue"
            size="2x"
          />
        </ion-buttons>
        <ion-title>Vital Statistics</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col size="12">
            <ion-card v-if="user" class="stats-overview">
              <ion-card-header>
                <ion-card-title class="flex items-center gap-2">
                  <xp-icon icon="heartbeat" primary="red" secondary="pink" />
                  {{ user.name?.nick || user.name?.full || "Current Status" }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="current-stats">
                  <div class="stat-item">
                    <xp-icon
                      icon="heart"
                      primary="red"
                      secondary="darkred"
                      size="lg"
                    />
                    <div class="stat-info">
                      <div class="label">HP</div>
                      <ion-progress-bar
                        :value="user.stats.hp.now / user.stats.hp.max"
                        color="danger"
                        :class="{ changed: isHpChanged }"
                      ></ion-progress-bar>
                      <div class="value" :class="{ changed: isHpChanged }">
                        {{ user.stats.hp.now }}/{{ user.stats.hp.max }}
                      </div>
                    </div>
                  </div>
                  <div class="stat-item">
                    <xp-icon
                      icon="hat-wizard"
                      primary="purple"
                      secondary="blue"
                      size="lg"
                    />
                    <div class="stat-info">
                      <div class="label">MP</div>
                      <ion-progress-bar
                        :value="user.stats.mp.now / user.stats.mp.max"
                        color="tertiary"
                        :class="{ changed: isMpChanged }"
                      ></ion-progress-bar>
                      <div class="value" :class="{ changed: isMpChanged }">
                        {{ user.stats.mp.now }}/{{ user.stats.mp.max }}
                      </div>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card
              v-for="(area, key) in areas"
              :key="key"
              class="stat-category"
            >
              <ion-card-header>
                <ion-card-title class="flex items-center gap-2">
                  <xp-icon
                    :icon="area.icon"
                    :primary="area.color"
                    :secondary="getLighterColor(area.color)"
                  />
                  {{ area.name }}
                  <div class="total-score">
                    {{ getAreaTotal(key.toString()) }}
                  </div>
                </ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <ion-list>
                  <ion-item
                    v-for="(stat, statKey) in area.stats"
                    :key="statKey"
                  >
                    <ion-label class="ion-text-wrap">
                      <h3>{{ stat.name }}</h3>
                      <p>{{ stat.description }}</p>
                    </ion-label>
                    <ion-badge
                      slot="end"
                      :color="area.color"
                      :class="{
                        'stat-badge updated': changedStats.has(
                          statKey.toString()
                        ),
                      }"
                    >
                      {{ getStat(statKey.toString()) }}
                    </ion-badge>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, computed, ref, watch } from "vue";
  import { useUserStore } from "@/lib/store/stores/user";
  import ionic from "@/lib/mixins/ionic";
  import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
  import { PILLARS } from "@/constants";
  import { useTimers } from "@/hooks/useTimers";

  export default defineComponent({
    name: "xp-view-stats",
    components: { XpIcon },
    mixins: [ionic],
    props: {
      userId: {
        type: String,
        required: true,
      },
    },

    setup(props) {
      const userStore = useUserStore();
      const timers = useTimers();

      // Get user from props via getUserById
      const user = computed(() => userStore.getUserById(props.userId));

      // The five pillars and their stats, the same source the profile and the level-up screens read
      const areas = Object.fromEntries(
        Object.entries(PILLARS).map(([key, pillar]) => [
          key,
          { ...pillar, icon: pillar.icon.replace(/^fa-/, "") },
        ])
      );

      const isHpChanged = ref(false);
      const isMpChanged = ref(false);
      const prevHp = ref(0);
      const prevMp = ref(0);
      const changedStats = ref<Set<string>>(new Set());

      // Optionally, helper to get lighter color (stub)
      const getLighterColor = (color: string) => {
        // You can expand this mapping as needed
        switch (color) {
          case "danger":
            return "light";
          case "tertiary":
            return "medium";
          case "warning":
            return "light";
          case "success":
            return "light";
          default:
            return "light";
        }
      };

      // Trained stats live under stats.special; older profiles kept them at the top level
      const getStat = (stat: string): number => {
        const stats = (user.value?.stats || {}) as Record<string, any>;
        return Number(stats.special?.[stat] ?? stats[stat] ?? 0) || 0;
      };

      const getAreaTotal = (key: string): number =>
        Object.keys(areas[key]?.stats || {}).reduce((total, stat) => total + getStat(stat), 0);

      // Track HP/MP changes and trigger animations
      watch(
        () => user.value?.stats?.hp?.now,
        (newVal, oldVal) => {
          const hasHpMoved = oldVal !== undefined && newVal !== oldVal;
          if (hasHpMoved) {
            isHpChanged.value = true;
            timers.startTimeout(600, () => {
              isHpChanged.value = false;
            });
          }
          prevHp.value = newVal || 0;
        }
      );

      watch(
        () => user.value?.stats?.mp?.now,
        (newVal, oldVal) => {
          const hasMpMoved = oldVal !== undefined && newVal !== oldVal;
          if (hasMpMoved) {
            isMpChanged.value = true;
            timers.startTimeout(600, () => {
              isMpChanged.value = false;
            });
          }
          prevMp.value = newVal || 0;
        }
      );

      // Watch special stats for changes
      watch(
        () => user.value?.stats?.special,
        (newStats, oldStats) => {
          if (!oldStats) return;

          Object.keys(newStats || {}).forEach((stat) => {
            if (newStats[stat] !== oldStats[stat]) {
              changedStats.value.add(stat);
              timers.startTimeout(500, () => {
                changedStats.value.delete(stat);
              });
            }
          });
        },
        { deep: true }
      );

      return {
        areas,
        isHpChanged,
        isMpChanged,
        changedStats,
        user,
        getLighterColor,
        getAreaTotal,
        getStat,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-view-stats {
    ion-content {
      --background: url("@/assets/images/midjourney/hospital.webp") center /
        cover no-repeat;
    }

    // The settings pages' spacing: the card's frame is a 16px shadow drawn outside it, so the gap between cards equals
    // the gap around them (the page's 16px ion-padding). The game style's card rule is keyed by the app's id, hence
    // the weight.
    ion-grid,
    ion-col {
      padding: 0;
    }

    ion-card {
      width: calc(100% - 32px) !important;
      margin: 16px auto !important;

      & ~ ion-card {
        margin-top: 48px !important;
      }

      ion-card-header {
        border-bottom: 1px solid rgba(231, 230, 179, 0.25);
      }

      ion-card-title {
        font-size: 1.2rem;

        .total-score {
          margin-left: auto;
          min-width: 2.5rem;
          text-align: center;
          padding: 0.15rem 0.6rem;
          border: 2px solid currentColor;
          border-radius: 2px;
          font-size: 1rem;
        }
      }

      // the game's windows are dark: stat names and their promises in the window's own colours
      ion-item ion-label {
        h3 {
          color: #f7e8a8;
        }

        p {
          color: #e7e6b3;
          opacity: 0.8;
        }
      }
    }

    .current-stats {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 1rem;

        .stat-info {
          flex: 1;

          .label {
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          ion-progress-bar {
            height: 8px;
            border-radius: 4px;
            margin-bottom: 0.25rem;
          }

          .value {
            font-size: 0.875rem;
            color: #e7e6b3;
          }

          .value.changed {
            animation: pulse 0.6s ease-in-out;
          }

          ion-progress-bar.changed {
            animation: progress-flash 0.6s ease-in-out;
          }
        }
      }
    }

    @keyframes pulse {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }

    @keyframes progress-flash {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    // Add transition for smooth stat changes
    ion-badge {
      transition: background-color 0.3s ease;
    }

    // Add hover effect on stat items
    .stat-category ion-item {
      transition: background-color 0.2s ease;

      &:hover {
        --background: rgba(var(--ion-color-light-rgb), 0.1);
      }
    }

    // Add animation for newly updated stats
    .stat-badge {
      &.updated {
        animation: badge-pop 0.5s cubic-bezier(0.26, 0.53, 0.74, 1.48);
      }
    }

    @keyframes badge-pop {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }
  }
</style>
