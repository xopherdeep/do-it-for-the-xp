<template>
  <ion-row v-if="stats" :class="$options.name">
    <ion-col size="12" class="ion-no-margin ion-no-padding">
      <ion-badge class="hp-badge">
        <ion-progress-bar
          color="danger"
          v-if="stats"
          :value="stats.hp.now / stats.hp.max"
        >
        </ion-progress-bar>
        <ion-badge>
          <p>
            HP:
            {{ stats.hp.now }}
            /
            {{ stats.hp.max }}
          </p>
          <ion-icon :icon="fitnessOutline" size="small" />
        </ion-badge>
      </ion-badge>
      <ion-badge class="mp-badge">
        <ion-progress-bar
          color=""
          v-if="stats"
          :value="stats.mp.now / stats.mp.max"
        ></ion-progress-bar>
        <ion-badge>
          <p>
            MP:
            {{ stats.mp.now }}
            /
            {{ stats.mp.max }}
          </p>
          <ion-icon :icon="colorWand" size="small" />
        </ion-badge>
      </ion-badge>
      <ion-badge class="gp-badge">
        <ion-progress-bar
          color="warning"
          v-if="stats"
          :value="stats.gp.wallet / stats.gp.limit"
        ></ion-progress-bar>
        <ion-badge>
          <p>₲P
            {{ stats.gp.wallet }}
            <small>00</small>
          </p>
          <ion-icon :icon="walletOutline" size="small" />
        </ion-badge>
      </ion-badge>
      <ion-badge class="xp-badge">
        <ion-progress-bar
          color="success"
          v-if="stats"
          :value="stats.xp.now / stats.xp.next_level"
        ></ion-progress-bar>
        <ion-badge>
          <!-- <ion-icon :icon="sparklesOutline" size="small" /> -->
          <p>
            XP: ({{ stats.xp.now }} / {{ stats.xp.next_level }})
          </p>
          <p>
            <small>
              Level 
            </small>
            {{ stats.level }}
          </p>
        </ion-badge>
      </ion-badge>
    </ion-col>
  </ion-row>
</template>

<script lang="ts">
  import { walletOutline, colorWand, fitnessOutline } from "ionicons/icons";
  import { defineComponent } from "vue";
  import ionic from '@/mixins/ionic'

  export default defineComponent({
    name: "xp-user-points-hud",
    props: ["stats"],
    mixins: [ionic],

    setup() {
      return {
        walletOutline,
        colorWand,
        fitnessOutline,
      };
    },
  });
</script>

<style lang="scss">
  .xp-user-points-hud {
    position: absolute;
    z-index: 1;
    right: .5em;
    top: 1em;
    width: 20vw;
    min-width: 200px;

    ion-badge {
      width: 100%;
      height: 27px;
      background-color: transparent;

      ion-badge {
        font-size: x-small;
        display: flex;
        align-items: center;
        justify-content: start;
        position: absolute;
        height: 23px;
        text-align: left;
        padding: .24em .75em;

        ion-icon {
          float: right;
        }

        p {
          margin-right: 1em;
        }
      }

      i {
        margin: 0.1em 0.5em 0.25em 0.15em;
      }

      &.hp-badge,
      &.mp-badge,
      &.gp-badge,
      &.xp-badge {
        margin: 0;
        display: flex;
        align-content: center;

        ion-progress-bar {
          border-radius: 5px 2px 1em 5px;
          box-shadow: 1px 2px 4px rgba(var(--ion-color-tertinary-rgb), 0.5);
          height: 23px;
          .progress-buffer-bar {
            background: rgba(var(--ion-color-base-rgb), 0.9) !important;
          }
        }

        ion-badge {
          ion-icon {
            border-radius: 5px;
          }
          margin: 0 0.5em 0 0;
          justify-content: space-between;
        }
      }

      &.hp-badge {
        ion-progress-bar {
          .progress {
            border-right: 4px solid var(--xp-color-red);
            border-left: 4px solid var(--xp-color-red);
          }
        }

        ion-badge {
          color: var(--ion-color-danger-contrast);
          text-shadow: 0 0px 5px var(--xp-color-red);
          ion-icon {
            border-radius: 5px;
          }
          margin: 0 0.5em 0 0;
          justify-content: space-between;
        }
      }
      &.mp-badge {
        ion-badge {
          color: var(--ion-color-danger-contrast);
          text-shadow: 0 0px 5px blue;
          ion-icon {
            border-radius: 5px;
          }
          justify-content: space-between;
        }
      }
      &.gp-badge2 {
        display: flex;
        display: none;
        align-content: center;

        ion-progress-bar {
          border-radius: 5px 2px 1em 5px;
          box-shadow: 1px 2px 4px rgba(var(--ion-color-warning-rgb), 0.5);
        }

        ion-badge {
          color: var(--ion-color-warning-contrast);
          text-shadow: 0 0px 5px var(--xp-color-blue);

          ion-icon {
            border-radius: 5px;
          }
          justify-content: space-between;
        }
      }
      i {
        color: var(--xp-color-white);
      }

      &.gp-badge {
        ion-badge {
          color: var(--ion-color-danger-contrast);
          text-shadow: 0 0px 5px var(--xp-color-red);
          ion-icon {
            border-radius: 5px;
          }
          margin: 0 0.5em 0 0;
          justify-content: space-between;
        }
        // ion-badge {
        //   overflow: visible;
        //   max-width: 100%;
        //   top: -2.5px;
        //   left: 0;
        //   font-size: small;
        //   font-family: "Courier New", Courier, monospace;
        //   background-color: rgba(0, 0, 0, 0.25);
        //   text-shadow: 0 0 2px black;
        //   height: 15px;
        //   position: relative;
        //   justify-content: space-between;
        //   p {
        //     margin: 0;
        //     letter-spacing: -1.5px;
        //     word-spacing: -5px;
        //   }
        // }

        // i {
        //   margin: 0;
        // }
      }

      &.xp-badge{

          text-shadow: 0 0px 4px var(--xp-color-red);
      }
      ion-progress-bar {
        height: 100%;
        border-radius: 5px 5px 10px 10px;
      }
    }
    ion-card-content {
      margin: 0;
      padding: 0;
    }
  }
</style>
