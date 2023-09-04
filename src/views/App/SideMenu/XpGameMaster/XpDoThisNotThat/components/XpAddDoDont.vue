<template>
  <ion-header>
    <ion-toolbar>
      <ion-title> Add </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <form @submit.prevent="submitForm">
      <ion-item>
        <ion-label>Type</ion-label>
        <ion-select v-model="form.type" placeholder="Select One">
          <ion-select-option value="do">Do</ion-select-option>
          <ion-select-option value="dont">Don't</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-label>XP</ion-label>
        <ion-input v-model.number="form.points.xp" type="number"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>GP</ion-label>
        <ion-input v-model.number="form.points.gp" type="number"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>AP</ion-label>
        <ion-input v-model.number="form.points.ap" type="number"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>Notes</ion-label>
        <ion-textarea v-model="form.notes"></ion-textarea>
      </ion-item>
      <ion-button expand="full" type="submit">Submit</ion-button>
    </form>
  </ion-content>
  <ion-footer>
    <ion-button @click="dismiss">Cancel</ion-button>
  </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { modalController } from "@ionic/vue";

  import DosDontsDb from "@/databases/DosDontsDb";

  const dosDontsDb = new DosDontsDb();

  export default defineComponent({
    name: "XpAddDoDont",
    props: {
      do: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        form: {
          type: this.do ? 'do' : 'dont',
          points: {
            xp: 0,
            gp: 0,
            ap: 0,
          },
          notes: '',
        },
      };
    },
    methods: {
      dismiss() {
        modalController.dismiss();
      },
      async submitForm() {
        await dosDontsDb.setDosDont(this.form);
        this.dismiss();
      },
    },
  });
</script>
