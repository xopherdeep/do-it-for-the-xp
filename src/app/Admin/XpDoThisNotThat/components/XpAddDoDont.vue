<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button
          :default-href="`/game-master/do-this-not-that`"
          @click="dismiss"
        />
      </ion-buttons>
      <ion-title>Add {{ isDo ? "Do" : "Don't" }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide do-dont">
    <div class="do-dont-form" :class="isDo ? 'is-do' : 'is-dont'">
      <section class="do-dont-panel do-dont-type">
        <div class="do-dont-type-head">
          <div>
            <h2 class="do-dont-title">To Do or Not to Do?</h2>
            <p class="do-dont-hint">
              {{
                isDo
                  ? "A Do pays out when a hero does something good."
                  : "A Don't takes points when a hero slips up."
              }}
            </p>
          </div>
          <i
            class="fad fa-2x do-dont-thumb"
            :class="isDo ? 'fa-thumbs-up' : 'fa-thumbs-down'"
          />
        </div>
        <ion-segment
          mode="ios"
          v-model="form.type"
          @ionChange="updatePoints"
        >
          <ion-segment-button value="do">
            <ion-label>Do</ion-label>
          </ion-segment-button>
          <ion-segment-button value="dont">
            <ion-label>Don't</ion-label>
          </ion-segment-button>
        </ion-segment>
      </section>

      <section class="do-dont-panel">
        <ion-input
          v-model="form.whatFor"
          class="do-dont-input"
          :label="`What is the ${isDo ? 'bonus' : 'penalty'} for?`"
          label-placement="stacked"
          fill="outline"
          :placeholder="
            isDo ? 'Made the bed without being asked' : 'Left dishes on the table'
          "
          :maxlength="80"
        />
      </section>

      <section class="do-dont-panel">
        <div class="do-dont-row">
          <h3 class="do-dont-label">
            Amount {{ isDo ? "Awarded" : "Penalized" }}
          </h3>
          <ion-select
            v-model="form.difficulty"
            class="do-dont-effort"
            aria-label="Effort"
            placeholder="Outside Golden Ratio"
            interface="action-sheet"
            :interface-options="{ header: 'How big is it?' }"
            @ionChange="updatePoints"
          >
            <ion-select-option
              v-for="effort in efforts"
              :key="effort.value"
              :value="effort.value"
            >
              {{ effort.name }}
            </ion-select-option>
          </ion-select>
        </div>
        <div class="do-dont-row do-dont-range">
          <ion-button
            size="small"
            color="danger"
            aria-label="Less"
            :disabled="form.difficulty <= 1"
            @click="decreaseDifficulty"
          >
            <i class="fas fa-minus" />
          </ion-button>
          <ion-range
            v-model="form.difficulty"
            aria-label="Amount"
            mode="ios"
            :min="1"
            :max="13"
            :step="1"
            :pin="true"
            :snaps="isFibonacci"
            :ticks="isFibonacci"
            color="warning"
            @ionChange="updatePoints"
          >
            <span slot="start" class="do-dont-range-end">Min</span>
            <span slot="end" class="do-dont-range-end">Max</span>
          </ion-range>
          <ion-button
            size="small"
            color="success"
            aria-label="More"
            :disabled="form.difficulty >= 13"
            @click="increaseDifficulty"
          >
            <i class="fas fa-plus" />
          </ion-button>
        </div>
      </section>

      <section class="do-dont-panel">
        <h3 class="do-dont-label">
          Points to {{ isDo ? "Award" : "Penalize" }}
        </h3>
        <div class="do-dont-chips">
          <button
            v-for="stat in stats"
            :key="stat.key"
            type="button"
            class="do-dont-chip"
            :class="[`chip-${stat.color}`, { on: form.awardPoints[stat.key] }]"
            :aria-pressed="form.awardPoints[stat.key]"
            @click="form.awardPoints[stat.key] = !form.awardPoints[stat.key]"
          >
            <i class="fad" :class="stat.icon" />
            {{ stat.short }}
            <i
              class="fas do-dont-chip-check"
              :class="form.awardPoints[stat.key] ? 'fa-check' : 'fa-plus'"
            />
          </button>
        </div>

        <template v-for="stat in stats" :key="`${stat.key}-row`">
          <div
            v-if="form.awardPoints[stat.key]"
            class="do-dont-points"
            :class="`chip-${stat.color}`"
          >
            <i class="fad fa-2x do-dont-points-icon" :class="stat.icon" />
            <div class="do-dont-points-text">
              <strong>{{ stat.name }}</strong>
              <span>{{ stat.blurb }}</span>
            </div>
            <ion-input
              v-model="form.points[stat.key]"
              class="do-dont-points-input"
              type="number"
              inputmode="numeric"
              fill="outline"
              :aria-label="stat.name"
            >
              <span slot="end" class="do-dont-points-unit">{{ stat.short }}</span>
            </ion-input>
          </div>
        </template>
        <p v-if="!anyPoints" class="do-dont-hint">
          Pick at least one kind of points.
        </p>
      </section>

      <section class="do-dont-panel">
        <ion-textarea
          v-model="form.notes"
          class="do-dont-input"
          label="Notes"
          label-placement="stacked"
          fill="outline"
          placeholder="Anything the heroes should know (optional)"
          :rows="4"
          :auto-grow="true"
        />
      </section>
    </div>
  </ion-content>
  <ion-footer class="do-dont-footer">
    <ion-toolbar>
      <div class="do-dont-actions">
        <ion-button fill="clear" color="medium" @click="dismiss">
          <i class="fad fa-times fa-lg mr-2" />
          Cancel
        </ion-button>
        <ion-button :color="accent" @click="submitForm">
          <i class="fad fa-save fa-lg mr-2" />
          Save {{ isDo ? "Do" : "Don't" }}
        </ion-button>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { modalController } from "@ionic/vue";
  import ionic from "@/lib/mixins/ionic";

  import DosDontsDb, { DosDont } from "@/lib/databases/DosDontsDb";
  import EFFORTS from "@/constants/EFFORTS";

  const dosDontsDb = new DosDontsDb();

  type StatKey = "ap" | "gp" | "xp";

  interface StatOption {
    key: StatKey;
    short: string;
    name: string;
    blurb: string;
    icon: string;
    color: string;
  }

  // The three kinds of points, in the order the rest of the Admin shows them
  const STATS: StatOption[] = [
    {
      key: "ap",
      short: "AP",
      name: "Ability Points",
      blurb: "Unlocks abilities, encourages planning.",
      icon: "fa-hand-holding-magic",
      color: "danger",
    },
    {
      key: "gp",
      short: "GP",
      name: "Gold Points",
      blurb: "In-app gold, teaches money sense.",
      icon: "fa-hand-holding-usd",
      color: "warning",
    },
    {
      key: "xp",
      short: "XP",
      name: "Experience Points",
      blurb: "Tracks and rewards growth.",
      icon: "fa-hand-holding-seedling",
      color: "success",
    },
  ];

  export default defineComponent({
    name: "XpAddDoDont",
    props: {
      do: {
        type: Boolean,
        default: true,
      },
      doDont: {
        type: Object as () => DosDont,
      },
    },
    mixins: [ionic],
    data() {
      return {
        efforts: EFFORTS,
        stats: STATS,
        form: {
          type: this.do ? "do" : "dont",
          whatFor: "",
          difficulty: 1,
          awardPoints: {
            xp: false,
            gp: true,
            ap: false,
          },
          points: {
            xp: 0,
            gp: 0,
            ap: 0,
          },
          notes: "",
        } as DosDont,
        fibonacciArray: [1, 1, 2, 3, 5, 8, 13],
      };
    },
    computed: {
      isDo(): boolean {
        return this.form.type === "do";
      },

      accent(): string {
        return this.isDo ? "success" : "danger";
      },

      anyPoints(): boolean {
        const { ap, gp, xp } = this.form.awardPoints;
        return ap || gp || xp;
      },

      isFibonacci() {
        return this.fibonacciArray.includes(this.form.difficulty);
      },

      saveRecord() {
        return {
          ...this.form,
          points: {
            xp: this.form.points.xp * Number(this.form.awardPoints.xp),
            gp: this.form.points.gp * Number(this.form.awardPoints.gp),
            ap: this.form.points.ap * Number(this.form.awardPoints.ap),
          },
        };
      },
    },
    methods: {
      dismiss() {
        modalController.dismiss();
      },
      async submitForm() {
        await dosDontsDb.setDosDont(this.saveRecord);
        this.dismiss();
      },

      updatePoints() {
        const { difficulty } = this.form;
        const multiplier = 200;
        const negator = this.form.type === "do" ? 1 : -1;
        this.form.points = {
          xp: difficulty * multiplier * negator,
          gp: difficulty * (multiplier / 10) * negator,
          ap: difficulty * (multiplier / 100) * negator,
        };
      },
      increaseDifficulty() {
        const currentIndex = this.fibonacciArray.indexOf(this.form.difficulty);
        const canIncrease = currentIndex < this.fibonacciArray.length - 1;
        if (canIncrease) {
          this.form.difficulty = this.fibonacciArray[currentIndex + 1];
          this.updatePoints();
        }
      },
      decreaseDifficulty() {
        const currentIndex = this.fibonacciArray.indexOf(this.form.difficulty);
        const canDecrease = currentIndex > 0;
        if (canDecrease) {
          this.form.difficulty = this.fibonacciArray[currentIndex - 1];
          this.updatePoints();
        }
      },
    },
    mounted() {
      this.form = this.doDont || this.form;
    },
  });
</script>

<style lang="scss" scoped src="./_XpAddDoDont.scss" />
