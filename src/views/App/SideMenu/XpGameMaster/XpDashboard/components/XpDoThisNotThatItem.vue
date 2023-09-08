<template>
  <ion-item-sliding>
    <ion-item-options side="start">
      <ion-item-option
        color="success"
        expand="block"
        @click="openBonus"
      >
        <i
          class="fad fa-sack-dollar fa-lg my-2"
          slot="bottom"
        ></i>
        Bonus
      </ion-item-option>
      <ion-item-option
        color="danger"
        expand="block"
        @click="openPenalty"
      >
        <i
          class="fad fa-minus-circle fa-lg my-2"
          slot="bottom"
        ></i>
        Penalty
      </ion-item-option>
    </ion-item-options>
    <ion-item
      @click="clickDoThisNotThat(true)"
      button
      detail
    >
      <i
        slot="start"
        class="fad fa-grip-vertical fa-lg mr-4"
      ></i>
      <i
        slot="start"
        class="fad fa-rainbow fa-2x mr-2"
      ></i>
      <ion-label>
        Do this, Not that
        <p>Reward or penalize player's GP</p>
      </ion-label>
      <ion-buttons slot="end">
        <ion-button>
          {{ dos.length }}
          <i class="fad fa-thumbs-up fa-lg mx-1"></i>
        </ion-button>
        <ion-button @click.stop="clickDoThisNotThat(false)">
          {{ donts.length }}
          <i class="fad fa-thumbs-down fa-lg mx-1"></i>
        </ion-button>
      </ion-buttons>
    </ion-item>
  </ion-item-sliding>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, computed } from "vue";
  import ionic from "@/mixins/ionic";
  import { modalController } from "@ionic/vue";
  import XpBonus from "./XpBonus.vue";
  import DosDontsDb, { DosDont, dosDontsStorage } from "@/databases/DosDontsDb";
  export default defineComponent({
    name: "XpDoThisNotThatItem",
    mixins: [ionic],
    methods: {
      clickDoThisNotThat(openDo = true) {
        this.$router.push("/game-master/do-this-not-that?openDo=" + openDo);
      },
      async openBonus() {
        const modal = await modalController.create({
          component: XpBonus,
        });
        modal.present();
      },

      async openPenalty() {
        const modal = await modalController.create({
          component: XpBonus,
          componentProps: {
            isPenalty: true,
          },
        });
        modal.present();
      },
    },
    setup() {
      const dosDontsDb = new DosDontsDb(dosDontsStorage);
      const dosDonts = ref([] as DosDont[]);

      const loadDoDonts = async () => {
      dosDonts.value = await dosDontsDb.getAll();
    };

    const isDo = (doDont) => doDont.type === "do";
    const isDont = (doDont) => doDont.type === "dont";

    const dos = computed(() => dosDonts.value.filter(isDo));
    const donts = computed(() => dosDonts.value.filter(isDont));

    onMounted(loadDoDonts);

    return {
      dos,
      donts,
      dosDontsDb,
      loadDoDonts,
      dosDonts,
    };
  },
});
</script>

<style></style>
