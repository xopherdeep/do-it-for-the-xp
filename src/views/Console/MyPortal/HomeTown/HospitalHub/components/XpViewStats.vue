<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="secondary">
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
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
            <ion-card class="stats-overview">
              <ion-card-header>
                <ion-card-title class="flex items-center gap-2">
                  <xp-icon 
                    icon="heartbeat" 
                    primary="red" 
                    secondary="pink"
                  />
                  Current Status
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
                        {{user.stats.hp.now}}/{{user.stats.hp.max}}
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
                        {{user.stats.mp.now}}/{{user.stats.mp.max}}
                      </div>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card v-for="(area, key) in areas" :key="key" class="stat-category">
              <ion-card-header>
                <ion-card-title class="flex items-center gap-2">
                  <xp-icon 
                    :icon="getAreaIcon(key.toString())"
                    :primary="area.color"
                    :secondary="getLighterColor(area.color)"
                  />
                  {{ key.toString().charAt(0).toUpperCase() + key.toString().slice(1) }}
                  <div class="total-score">
                    {{ getAreaTotal(key.toString()) }}
                  </div>
                </ion-card-title>
              </ion-card-header>
              
              <ion-card-content>
                <ion-list>
                  <ion-item v-for="(desc, statKey) in area.stats" :key="statKey">
                    <ion-label>
                      <h3>{{ statKey.toString().charAt(0).toUpperCase() + statKey.toString().slice(1) }}</h3>
                      <p>{{ desc }}</p>
                    </ion-label>
                    <ion-badge 
                      slot="end" 
                      :color="area.color"
                      :class="{ 'stat-badge updated': changedStats.has(statKey.toString()) }"
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
import ionic from "@/mixins/ionic";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import type {  StatAreas } from '../types';

export default defineComponent({
  name: "xp-view-stats",
  components: { XpIcon },
  mixins: [ionic],
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  
  setup(props) {
    const userStore = useUserStore();

    // Get user from props via getUserById
    const user = computed(() => userStore.getUserById(props.userId));

    const areas: StatAreas = {
      physical: {
        color: "danger",
        stats: {
          strength: "Use less HP when completing a task",
          defense: "Influences max HP",
          endurance: "Influences HP restore rate",
        },
      },
      mental: {
        color: "tertiary", 
        stats: {
          intelligence: "Use less MP when casting abilities",
          perception: "Influences max MP",
          wisdom: "Influences MP restore rate",
        },
      },
      social: {
        color: "warning",
        stats: {
          charisma: "Influence success rate of social interactions",
          leadership: "Boost party member stats",
          luck: "Improve random outcomes",
        },
      },
      misc: {
        color: "success",
        stats: {
          agility: "Influences action speed",
          dexterity: "Improves accuracy",
          vitality: "Enhances healing effects",
        },
      },
    };

    const isHpChanged = ref(false);
    const isMpChanged = ref(false);
    const prevHp = ref(0);
    const prevMp = ref(0);
    const changedStats = ref<Set<string>>(new Set());

    // Helper to get icon for each area
    const getAreaIcon = (key: string) => {
      switch (key) {
        case "physical":
          return "dumbbell";
        case "mental":
          return "brain";
        case "social":
          return "users";
        case "misc":
          return "star";
        default:
          return "question";
      }
    };

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

    // Optionally, helper to get area total (stub)
    const getAreaTotal = (key: string) => {
      // Implement your logic here, or return 0 as a placeholder
      return key;
    };

    // Optionally, helper to get stat value (stub)
    const getStat = (stat: string) => {
      // Implement your logic here, or return 0 as a placeholder
      return stat;
    };

    // Track HP/MP changes and trigger animations
    watch(
      () => user.value?.stats?.hp?.now,
      (newVal, oldVal) => {
        if (oldVal !== undefined && newVal !== oldVal) {
          isHpChanged.value = true;
          setTimeout(() => {
            isHpChanged.value = false;
          }, 600);
        }
        prevHp.value = newVal || 0;
      }
    );

    watch(
      () => user.value?.stats?.mp?.now,
      (newVal, oldVal) => {
        if (oldVal !== undefined && newVal !== oldVal) {
          isMpChanged.value = true;
          setTimeout(() => {
            isMpChanged.value = false;
          }, 600);
        }
        prevMp.value = newVal || 0;
      }
    );

    // Watch special stats for changes
    watch(
      () => user.value?.stats?.special,
      (newStats, oldStats) => {
        if (!oldStats) return;
        
        Object.keys(newStats || {}).forEach(stat => {
          if (newStats[stat] !== oldStats[stat]) {
            changedStats.value.add(stat);
            setTimeout(() => {
              changedStats.value.delete(stat);
            }, 500);
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
      getAreaIcon,
      getLighterColor,
      getAreaTotal,
      getStat
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-view-stats {
  ion-content {
    --background: url("@/assets/images/midjourney/hospital.png") center / cover no-repeat;
  }

  ion-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    margin: 1rem;

    ion-card-header {
      border-bottom: 1px solid var(--ion-color-light);
    }

    ion-card-title {
      font-size: 1.2rem;
      color: var(--ion-color-dark);

      .total-score {
        margin-left: auto;
        background: var(--ion-color-light);
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 1rem;
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
          color: var(--ion-color-medium);
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
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  @keyframes progress-flash {
    0%, 100% {
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
