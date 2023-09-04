<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button
          :default-href="`/game-master/do-this-not-that`"
          @click="dismiss"
        />
        <!-- <ion-icon :icon="medalOutline" size="large" /> -->
      </ion-buttons>
      <ion-title> Add {{ form.type }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-card>
      <ion-card-content>
        <i
          class="fad fa-2x mx-3 ion-float-right"
          :style="{
            color:
              form.type === 'do'
                ? 'var(--ion-color-success)'
                : 'var(--ion-color-danger)',
          }"
          :class="{
            'fa-thumbs-up': form.type === 'do',
            'fa-thumbs-down': form.type === 'dont',
          }"
        ></i>
        To Do or Not to Do?
        <p>Choose between the two.</p>
        <ion-segment mode="ios" v-model="form.type" @ionChange="updatePoints">
          <ion-segment-button value="do" color="success">
            Do
          </ion-segment-button>
          <ion-segment-button value="dont" color="danger">
            Don't
          </ion-segment-button>
        </ion-segment>
      </ion-card-content>
    </ion-card>
    <ion-list>
      <ion-item>
        <ion-avatar slot="start">
          <ion-skeleton-text></ion-skeleton-text>
        </ion-avatar>
        <ion-label>
          What is the
          {{ form.type === "do" ? "Bonus" : "Penalty" }}
          for?
        </ion-label>
        <ion-input v-model="form.whatFor" />
      </ion-item>
      <ion-item>
        <ion-label>
          Amount
          {{ form.type === "do" ? "Awarded" : "Penalized" }}
        </ion-label>
        <i
          slot="end"
          class="fad fa-2x"
          :style="isFibonacci ? { color: 'var(--ion-color-warning)' } : {}"
        />
        <ion-select
          v-model="form.difficulty"
          placeholder="Outside Golden Ratio"
          mode="ios"
        >
          <ion-select-option
            v-for="effort in efforts"
            :key="effort.value"
            :value="effort.value"
          >
            {{ effort.name }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-button
          :disabled="form.difficulty === 1"
          @click="decreaseDifficulty"
          color="danger"
        >
          <i class="fas fa-minus"></i>
        </ion-button>
        <ion-range
          v-model="form.difficulty"
          mode="ios"
          min="0"
          max="13"
          :pin="true"
          step="1"
          :snaps="isFibonacci"
          :ticks="isFibonacci"
          color="warning"
          @ionChange="updatePoints"
        >
          <ion-label slot="start">
            <p>Min</p>
          </ion-label>
          <ion-label slot="end">
            <p>Max</p>
          </ion-label>
        </ion-range>
        <ion-button
          :disabled="form.difficulty === 13"
          @click="increaseDifficulty"
          color="success"
        >
          <i class="fas fa-plus"></i>
        </ion-button>
      </ion-item>
      <ion-list-header>
        Amount of Points to
        {{ form.type === "do" ? "Award" : "Penalize" }}
      </ion-list-header>
      <ion-row>
        <ion-col>
          <ion-item :color="form.awardPoints.ap ? 'danger' : ''">
            <ion-label>
              <i class="fad fa-hand-holding-magic"></i> AP
            </ion-label>
            <ion-checkbox
              v-model="form.awardPoints.ap"
              color="danger"
            ></ion-checkbox>
          </ion-item>
        </ion-col>
        <ion-col>
          <ion-item :color="form.awardPoints.gp ? 'warning' : ''">
            <ion-label> <i class="fad fa-hand-holding-usd"></i> GP </ion-label>
            <ion-checkbox
              v-model="form.awardPoints.gp"
              color="warning"
            ></ion-checkbox>
          </ion-item>
        </ion-col>
        <ion-col>
          <ion-item :color="form.awardPoints.xp ? 'success' : ''">
            <ion-label>
              <i class="fad fa-hand-holding-seedling"></i> XP
            </ion-label>
            <ion-checkbox
              v-model="form.awardPoints.xp"
              color="success"
            ></ion-checkbox>
          </ion-item>
        </ion-col>
      </ion-row>
      <ion-item-sliding v-if="form.awardPoints.ap">
        <ion-item-options side="end">
          <ion-item-option color="danger">
            <i class="fad fa-hand-holding-magic fa-2x" />
            <ion-input
              class="ion-text-right text-xl"
              v-model="form.points.ap"
              type="number"
              placeholder="Enter AP"
            ></ion-input>
            <ion-label slot="end"> AP </ion-label>
          </ion-item-option>
        </ion-item-options>
        <ion-item>
          <i
            class="fad fa-hand-holding-magic fa-2x mr-3"
            slot="start"
            style="color: var(--ion-color-danger)"
          />
          <ion-label>
            Ability Points (AP)
            <p>Unlocks abilities, encourages strategic planning.</p>
          </ion-label>
          <ion-badge
            class="ion-float-right text-sm px-2"
            color="danger"
            slot="end"
          >
            {{ form.points.ap }}
            <i class="fad fa-hand-holding-magic ml-2" />
          </ion-badge>
          <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
        </ion-item>
      </ion-item-sliding>
      <ion-item-sliding v-if="form.awardPoints.gp">
        <ion-item-options side="end">
          <ion-item-option color="warning">
            <i class="fad fa-hand-holding-usd fa-2x" />
            <ion-input
              slot="end"
              v-model="form.points.gp"
              type="number"
              class="ion-text-right text-xl"
              placeholder="Enter GP"
            ></ion-input>
            <ion-label slot="end"> GP </ion-label>
          </ion-item-option>
        </ion-item-options>
        <ion-item>
          <i
            class="fad fa-hand-holding-usd fa-2x mr-3"
            slot="start"
            style="color: var(--ion-color-warning)"
          />
          <ion-label>
            Gold Points (GP)
            <p>In-app currency, teaching financial literacy.</p>
          </ion-label>
          <ion-badge
            class="ion-float-right text-sm px-2"
            color="warning"
            slot="end"
          >
            <xp-gp :gp="form.points.gp" />
            <i class="fad fa-hand-holding-usd ml-2" />
          </ion-badge>
          <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
        </ion-item>
      </ion-item-sliding>
      <ion-item-sliding v-if="form.awardPoints.xp">
        <ion-item-options side="end">
          <ion-item-option color="success">
            <i class="fad fa-hand-holding-seedling fa-2x" slot="end" />
            <ion-input
              slot="end"
              v-model="form.points.xp"
              type="number"
              placeholder="Enter XP"
              class="ion-text-right"
            ></ion-input>
            <ion-label slot="end"> XP </ion-label>
          </ion-item-option>
        </ion-item-options>
        <ion-item>
          <i
            class="fad fa-hand-holding-seedling fa-2x mr-3"
            slot="start"
            style="color: var(--ion-color-success)"
          />
          <ion-label>
            Experience Points (XP)
            <p>Motivates and tracks skill growth.</p>
          </ion-label>
          <ion-badge
            class="ion-float-right text-sm px-2"
            color="success"
            slot="end"
          >
            {{ form.points.xp }}
            <i class="fad fa-hand-holding-seedling ml-2" />
          </ion-badge>
          <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
        </ion-item>
      </ion-item-sliding>
      <ion-item>
        <ion-label position="floating">Notes</ion-label>
        <ion-textarea v-model="form.notes" rows="5"></ion-textarea>
      </ion-item>
    </ion-list>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <i class="fad fa-times fa-lg mx-1" />
        <ion-button @click="dismiss">Cancel</ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button expand="full" @click="submitForm">
          <i class="fad fa-save fa-lg mx-1" />
          Save
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { modalController } from "@ionic/vue";
  import ionic from "@/mixins/ionic";

  import DosDontsDb, { DosDont, dosDontsStorage } from "@/databases/DosDontsDb";
  import EFFORTS from "@/constants/EFFORTS";

  const dosDontsDb = new DosDontsDb(dosDontsStorage);

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
        }
      },
      decreaseDifficulty() {
        const currentIndex = this.fibonacciArray.indexOf(this.form.difficulty);
        if (currentIndex > 0) {
          this.form.difficulty = this.fibonacciArray[currentIndex - 1];
        }
      },
    },
    mounted() {
      this.form = this.doDont || this.form;
    },
  });
</script>
