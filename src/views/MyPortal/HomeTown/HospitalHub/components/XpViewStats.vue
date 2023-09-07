<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/hospital/${userId}`"
          ></ion-back-button>
        </ion-buttons>
        <ion-title> My Stats </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide" v-if="user">
      <gamer-card :profile="user">
        <ion-grid class="ion-no-padding">
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-accordion-group>
                <ion-accordion
                  v-for="(area, category) in areas"
                  :key="category"
                  :value="category"
                >
                  <ion-item slot="header">
                    <ion-note slot="start">
                      <ion-icon
                        size="large"
                        :color="area.color"
                        :icon="area.icon"
                      ></ion-icon>
                    </ion-note>
                    <ion-label :color="area.color">
                      <strong>
                        {{ category }}
                      </strong>
                      <ion-note class="ion-float-right" :color="area.color">
                        {{ getCategoryCalcTotal(category) }}
                      </ion-note>
                    </ion-label>
                  </ion-item>
                  <ion-list slot="content">
                    <ion-item v-for="(desc, stat) in area.stats" :key="stat">
                      <ion-label :color="area.color">
                        <strong>
                          {{ stat }}
                        </strong>
                        <p>
                          {{ desc }}
                        </p>
                      </ion-label>
                      <ion-note slot="end" :color="area.color">
                        {{ user.stats.special[stat] }}
                      </ion-note>
                    </ion-item>
                  </ion-list>
                </ion-accordion>
              </ion-accordion-group>
            </ion-col>
          </ion-row>
        </ion-grid>
      </gamer-card>
      <ion-card>
        <ion-card-content>
          <i class="fad fa-shield fa-2x ion-float-right" />
          {{ user.jobClass }} -
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { mapGetters } from "vuex";
  import ionic from "@/mixins/ionic";
  import {
    fitnessOutline,
    colorWand,
    sparklesOutline,
    serverOutline,
  } from "ionicons/icons";

  import GamerCard from "@/views/App/SideMenu/SwitchProfile/AddProfile/GamerCard.vue";
  import User from "@/utils/User";

  export default defineComponent({
    props: ["userId"],
    name: "XpViewStats",
    mixins: [ionic],
    components: {
      GamerCard,
    },
    methods: {
      getCategoryCalcTotal(category: string) {
        switch (category) {
          case "physical":
            return this.calcPhysical;
          case "mental":
            return this.calcMental;
          case "social":
            return this.calcSocial;
          case "misc":
            return this.calcMisc;
        }
      },
      getStat(stat: string) {
        const statistic = this.user.stats.special[stat];
        console.log(statistic);

        return statistic;
      },
    },
    computed: {
      ...mapGetters(["getUserById"]),
      user(): User {
        return this.getUserById(this.userId);
      },

      calcPhysical() {
        const accumulate = (acc, key) => acc + this.getStat(key);
        const stats = this.areas.physical.stats;
        return Object.keys(stats).reduce(accumulate, 0);
      },

      calcMental() {
        const stats = this.areas.mental.stats;
        const accumulate = (acc, key) => acc + this.getStat(key);
        return Object.keys(stats).reduce(accumulate, 0);
      },
      calcSocial() {
        const stats = this.areas.social.stats;
        const accumulate = (acc, key) => acc + this.getStat(key);
        return Object.keys(stats).reduce(accumulate, 0);
      },
      calcMisc() {
        const stats = this.areas.misc.stats;
        const accumulate = (acc, key) => acc + this.getStat(key);
        return Object.keys(stats).reduce(accumulate, 0);
      },
    },
    setup() {
      return {
        areas: {
          physical: {
            open: true,
            color: "danger",
            icon: fitnessOutline,
            stats: {
              strength: "Use less HP when completing a task",
              defense: "Influences max HP",
              endurance: "Influences HP restore rate",
            },
          },
          mental: {
            open: false,
            color: "tertiary",
            icon: colorWand,
            stats: {
              intelligence: "Use less MP when casting abilities",
              perception: "Influences max MP",
              wisdom: "Influences MP restore rate",
            },
          },
          social: {
            color: "warning",
            icon: serverOutline,
            stats: {
              charisma: "Influences GP discounts on items",
              awareness: "Gain more GP when completing tasks",
              presence: "Influences GP to $ conversion rate",
            },
          },
          misc: {
            color: "success",
            icon: sparklesOutline,
            stats: {
              agility: "Gain more AP when completing tasks",
              guts: "Gain more XP when completing tasks",
              luck: "Influence chances of receiving bonus points",
            },
          },
        },
      };
    },
  });
</script>

<style lang="scss" scoped>
  .view-stats {
    ion-label {
      strong {
        text-transform: capitalize !important;
      }
    }
  }
</style>
