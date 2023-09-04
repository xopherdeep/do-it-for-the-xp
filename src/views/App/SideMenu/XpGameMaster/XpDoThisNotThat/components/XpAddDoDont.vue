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
        <ion-segment v-model="form.points.xp">
          <ion-segment-button value="100">100</ion-segment-button>
          <ion-segment-button value="250">250</ion-segment-button>
          <ion-segment-button value="500">500</ion-segment-button>
          <ion-segment-button value="1000">1000</ion-segment-button>
        </ion-segment>
      </ion-item>
      <ion-item>
        <ion-label>GP</ion-label>
        <ion-segment v-model="form.points.gp">
          <ion-segment-button value="10">10</ion-segment-button>
          <ion-segment-button value="25">25</ion-segment-button>
          <ion-segment-button value="50">50</ion-segment-button>
          <ion-segment-button value="100">100</ion-segment-button>
        </ion-segment>
      </ion-item>
      <ion-item>
        <ion-label>AP</ion-label>
        <ion-segment v-model="form.points.ap">
          <ion-segment-button value="1">1</ion-segment-button>
          <ion-segment-button value="3">3</ion-segment-button>
          <ion-segment-button value="5">5</ion-segment-button>
          <ion-segment-button value="10">10</ion-segment-button>
        </ion-segment>
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
