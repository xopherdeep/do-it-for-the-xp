<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button @click="dismiss" defaultHref="/game-master" />
      </ion-buttons>

      <ion-title> Add Beast </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-card>
      <ion-card-content>
        This is where you can tame your checklists, aka beasts. Name your beasts
        something like: Grease Dragon, Counter Goblins, Dust Bunnies, etc. Then
        add a checklist of todo items for that beast. Clean 10 dishes Clean 10
        Utensils etc.
      </ion-card-content>
    </ion-card>
    <ion-list>
      <ion-item>
        <ion-thumbnail slot="start" class="cursor-pointer" id="beast-avatar">
          <ion-img v-if="beast?.avatar" :src="getAvatar(beast.avatar)" class="w-full p-0 m-0"/>
          <ion-skeleton-text v-else />
        </ion-thumbnail>
        <ion-label position="floating">
          Enter name of Beast
          <p></p>
        </ion-label>
        <ion-input v-model++="updateBeast.name" />
        <ion-buttons slot="end">
          <!-- <ion-button id="beast-avatar">
            <i class="fad fa-paw-claws fa-2x" />
          </ion-button> -->
        </ion-buttons>
      </ion-item>
      <ion-item>
        <ion-label>
          Checklist Items
          <p>Add a checklist of items: Clean 10 Plates, Clean 1o Utentils.</p>
        </ion-label>
        <ion-button slot="end" @click="clickAddItem"> Add Item </ion-button>
      </ion-item>
      <ion-item-sliding v-for="(item, index) in updateBeast.checklist" :key="index">
        <ion-item>
          <i class="fad fa-check fa-lg mr-2" />
          <ion-input v-model="updateBeast.checklist[index]" @onEnterKey="clickAddItem" @keyup="onEnterKey"
            :ref="`item-${index}`" />
          <ion-buttons slot="end">
            <ion-button @click="clickTrash(index)">
              <i class="fad fa-trash fa-lg ml-2" />
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-item-sliding>
    </ion-list>
  </ion-content>
  <ion-modal trigger="beast-avatar" ref="avatarsModal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="cancel">Cancel</ion-button>
        </ion-buttons>
        <ion-title>Choose an Image</ion-title>
        <ion-buttons slot="end">
          <ion-button :strong="true" @click="confirm()" :disabled="!avatar">Confirm</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <ion-radio-group v-model="avatar">
        <ion-grid class="mb-20">
          <ion-row class="sticky top-0 z-10">
            <ion-col>
              <ion-img v-if="avatar" :src="getAvatar(avatar)" />
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col v-for="i in nAvatars" :key="i" size="4">
              <ion-item
                :class="{
                  'opacity-85': avatar !== i
                }"
              >
                <ion-label class="m-0 p-0">
                  <ion-img class="w-full" :src="getAvatar(i)"/>
                </ion-label>
                <ion-radio :value="i">
                  {{ i }}
                </ion-radio>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-radio-group>
    </ion-content>
  </ion-modal>
  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="dismiss">
          <i class="fad fa-times fa-lg mr-2" />
          Cancel
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button @click="clickSave">
          Save
          <i class="fad fa-save fa-lg ml-2" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts">
  import { computed, defineComponent, ref } from "vue";
  import { modalController } from "@ionic/vue";
  import BestiaryDb, { beastStorage, Beast } from "@/databases/BestiaryDb";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    props: {
      beast: {
        type: Object as () => Beast,
      },
    },
    name: "XpAddBeast",
    mixins: [ionic],
    data() {
      return {
        nAvatars: 40,
      };
    },
    methods: {
      getAvatar(id) {
        return require(`@/assets/images/beasts/${id}.png`);
      },
      async dismiss() {
        await modalController.dismiss();
      },
      clickAddItem() {
        this.updateBeast.checklist.push("");
        const index = this.updateBeast.checklist.length - 1;
        const ref = this.$refs[`item-${index}`];
        // if (ref)
        //   ref.focus()
      },
      clickSave() {
        this.bestiary
          .setBeast(this.updateBeast)
          .then(this.dismiss)
          .then(this.showToast);
      },
      clickTrash(index: number) {
        this.updateBeast.checklist.splice(index, 1);
      },
      onEnterKey($event) {
        // if key is enter addItem
        if ($event.key === "Enter") {
          this.clickAddItem();
        }
      },
      async showToast() {
        await this.bestiary.showSuccessToast("Beast Saved");
      },
    },
    setup(props) {
      const avatar = ref(props.beast?.avatar);
      const avatarsModal = ref();
      const bestiary = new BestiaryDb(beastStorage);
      const updateBeast = computed(()=>({
        id: props?.beast?.id,
        name: props?.beast?.name,
        checklist: props?.beast?.checklist || [""],
        avatar: avatar.value || 0,
      } as Beast));


      const cancel = () => {
        avatarsModal.value.$el.dismiss();
      };

      const confirm = () => {
        avatarsModal.value.$el.dismiss();
      };

      return {
        avatar,
        cancel,
        confirm,
        avatarsModal,
        bestiary,
        updateBeast,
      };
    },
  });
</script>

<style lang="scss" scoped>
  ion-content{
    ion-item {
      // background: none;
      // --background: none;
    }
  }
</style>