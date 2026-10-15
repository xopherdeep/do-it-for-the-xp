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
        if (currentIndex < this.fibonacciArray.length - 1) {
          this.form.difficulty = this.fibonacciArray[currentIndex + 1];
          this.updatePoints();
        }
      },
      decreaseDifficulty() {
        const currentIndex = this.fibonacciArray.indexOf(this.form.difficulty);
        if (currentIndex > 0) {
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

<style lang="scss" scoped>
// Boxed RPG panels on the slide pattern, same frame as the quick task modal.
// The gap between panels equals the padding around them.
$pad: 1rem;

.do-dont-form {
  --accent: var(--ion-color-success);
  display: flex;
  flex-direction: column;
  gap: $pad;
  max-width: 40rem;
  margin: 0 auto;
  padding: $pad $pad calc(#{$pad} + env(safe-area-inset-bottom));
  color: var(--ion-color-rpg, #f7e8a8);

  &.is-dont {
    --accent: var(--ion-color-danger);
  }
}

.do-dont-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: $pad;
  background: rgba(var(--ion-color-rpg-contrast-rgb, 40, 8, 40), 0.92);
  border: 3px solid var(--ion-color-rpg, #f7e8a8);
  box-shadow: inset 0 0 0 2px var(--ion-color-rpg-contrast, #280828),
    4px 4px 0 rgba(0, 0, 0, 0.5);
}

// Readable titles: Orange Kid, sentence case, never forced caps
.do-dont-title,
.do-dont-label {
  margin: 0;
  font-family: "Orange Kid", "StatusPlz", monospace;
  font-weight: normal;
  text-transform: none;
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.do-dont-title {
  font-size: 1.75rem;
}

.do-dont-label {
  font-size: 1.4rem;
}

.do-dont-hint {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.do-dont-type-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $pad;
}

.do-dont-thumb {
  color: var(--accent);
}

.do-dont-type ion-segment {
  --background: rgba(0, 0, 0, 0.35);
  font-family: "StatusPlz", monospace;

  ion-segment-button {
    --color: var(--ion-color-rpg, #f7e8a8);
    --color-checked: #fff;
    --indicator-color: var(--accent);
    min-height: 2.75rem;
  }
}

// Stacked label above an outlined box, so the field is obvious
.do-dont-input {
  --color: var(--ion-color-rpg, #f7e8a8);
  --placeholder-color: var(--ion-color-rpg, #f7e8a8);
  --placeholder-opacity: 0.45;
  --border-color: rgba(247, 232, 168, 0.55);
  --highlight-color-focused: var(--accent);
  --background: rgba(0, 0, 0, 0.3);
  --border-radius: 0;
  font-size: 1rem;

  &::part(label),
  :deep(.label-text) {
    font-family: "Orange Kid", "StatusPlz", monospace;
    font-size: 1.4rem;
    text-transform: none;
  }
}

.do-dont-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.do-dont-row .do-dont-label {
  flex: none;
  white-space: nowrap;
}

.do-dont-effort {
  flex: 1 1 11rem;
  min-width: 0;
  --placeholder-color: var(--ion-color-rpg, #f7e8a8);
  min-height: 2.5rem;
  padding: 0 0.75rem;
  border: 2px solid rgba(247, 232, 168, 0.55);
  background: rgba(0, 0, 0, 0.3);
  font-family: "StatusPlz", monospace;
}

.do-dont-range {
  flex-wrap: nowrap;

  ion-range {
    flex: 1;
    min-width: 0;
    padding: 0;
    --bar-background: rgba(247, 232, 168, 0.25);
  }

  ion-button {
    --padding-start: 0.6rem;
    --padding-end: 0.6rem;
    margin: 0;
  }
}

.do-dont-range-end {
  font-size: 0.85rem;
  opacity: 0.8;
}

.do-dont-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.chip-danger {
  --chip: var(--ion-color-danger);
  --chip-ink: var(--ion-color-danger-contrast);
}
.chip-warning {
  --chip: var(--ion-color-warning);
  --chip-ink: var(--ion-color-warning-contrast);
}
.chip-success {
  --chip: var(--ion-color-success);
  --chip-ink: var(--ion-color-success-contrast);
}

.do-dont-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0 0.5rem;
  border: 2px solid var(--chip);
  background: transparent;
  color: var(--ion-color-rpg, #f7e8a8);
  font-family: "StatusPlz", monospace;
  font-size: 1rem;
  cursor: pointer;

  .fad {
    color: var(--chip);
  }

  &.on {
    background: var(--chip);
    color: var(--chip-ink);

    .fad {
      color: inherit;
    }
  }
}

.do-dont-chip-check {
  font-size: 0.75rem;
  opacity: 0.85;
}

.do-dont-points {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-left: 4px solid var(--chip);
  background: rgba(0, 0, 0, 0.3);
}

.do-dont-points-icon {
  flex: none;
  color: var(--chip);
}

.do-dont-points-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;

  strong {
    font-family: "Orange Kid", "StatusPlz", monospace;
    font-size: 1.25rem;
    font-weight: normal;
  }

  span {
    font-size: 0.8rem;
    opacity: 0.75;
  }
}

.do-dont-points-input {
  flex: none;
  width: 6.5rem;
  --color: var(--ion-color-rpg, #f7e8a8);
  --border-color: var(--chip);
  --highlight-color-focused: var(--chip);
  --border-radius: 0;
  --padding-start: 0.5rem;
  min-height: 2.5rem;
  text-align: right;
  font-family: "StatusPlz", monospace;
}

.do-dont-points-unit {
  margin-left: 0.25rem;
  color: var(--chip);
  font-size: 0.8rem;
}

.do-dont-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $pad;
  padding: 0 0.5rem;

  ion-button:last-child {
    flex: 1;
    max-width: 14rem;
  }
}
</style>
