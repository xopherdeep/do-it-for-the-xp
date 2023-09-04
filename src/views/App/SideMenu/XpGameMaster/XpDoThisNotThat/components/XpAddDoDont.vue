<template>
  <ion-header>
    <ion-toolbar>
      <ion-title> Add </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-list>
      <ion-segment v-model="form.type">
        <ion-segment-button value="do">Do</ion-segment-button>
        <ion-segment-button value="dont">Don't</ion-segment-button>
      </ion-segment>
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
    </ion-list>
  </ion-content>
  <ion-footer>
    <ion-button @click="dismiss">Cancel</ion-button>
  </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { modalController } from "@ionic/vue";
  import ionic from "@/mixins/ionic";

  import DosDontsDb, { dosDontsStorage } from "@/databases/DosDontsDb";

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
        form: {
          type: this.do ? "do" : "dont",
          points: {
            xp: 0,
            gp: 0,
            ap: 0,
          },
          notes: "",
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
