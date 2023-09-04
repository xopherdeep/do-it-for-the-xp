<template>
  <ion-header>
    <ion-toolbar>
      <ion-title> Add </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-list>
      <ion-list-header>
        <ion-label>
          To Do or Not to Do?
          <p>Choose between the two.</p>
        </ion-label>
      </ion-list-header>
      <ion-segment v-model="form.type">
        <ion-segment-button value="do" color="success">Do</ion-segment-button>
        <ion-segment-button value="dont" color="danger">
          Don't
        </ion-segment-button>
      </ion-segment>
      <ion-item>
        <ion-label> Estimated Amount of Effort </ion-label>
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
      <ion-item>
        <ion-label>Notes</ion-label>
        <ion-textarea v-model="form.notes"></ion-textarea>
      </ion-item>
      <ion-list-header> Amount of Points to Award </ion-list-header>
      <ion-item-sliding>
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
            class="ion-float-right text-white px-2"
            color="success"
            slot="end"
          >
            {{ form.points.xp }}
            <i class="fad fa-hand-holding-seedling ml-2" />
          </ion-badge>
          <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
        </ion-item>
      </ion-item-sliding>
      <ion-item-sliding>
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
      <ion-item-sliding>
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
    </ion-list>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <i class="fad fa-times fa-lg mx-1" />
        <ion-button @click="dismiss">Cancel</ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button expand="full" type="submit">
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
    },
    mixins: [ionic],
    data() {
      return {
        efforts: EFFORTS,
        form: {
          type: this.do ? "do" : "dont",
          difficulty: 1,
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
    },
    methods: {
      dismiss() {
        modalController.dismiss();
      },
      async submitForm() {
        await dosDontsDb.setDosDont(this.form);
        this.dismiss();
      },

      updatePoints() {
        const { difficulty } = this.form;
        const multiplier = 200;
        this.form.points = {
          xp: difficulty * multiplier,
          gp: difficulty * (multiplier / 10),
          ap: difficulty * (multiplier / 100),
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
  });
</script>
