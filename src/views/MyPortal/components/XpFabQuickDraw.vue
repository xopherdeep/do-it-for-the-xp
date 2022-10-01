<template>
  <!-- EQUIPPED MENU -->
  <ion-fab vertical="center" horizontal="end" v-if="user.stats">
    <ion-fab-button color="tertiary">
      <i class="fad fa-hand-sparkles fa-2x"></i>
    </ion-fab-button>
    <ion-fab-list side="start">
      <ion-fab-button color="dark" @click="$emit('openHud')">
        <i class="fad fa-compass fa-lg"></i>
      </ion-fab-button>
      <ion-fab-button color="dark" id="world-map">
        <i class="fad fa-map fa-lg"></i>
      </ion-fab-button>
    </ion-fab-list>
    <ion-fab-list side="top" class="items">
      <ion-fab-button v-for="item in equipment" :key="item.faIcon" color="dark" @click="item.click">
        <i class="fad fa-2x "
          :class="`fa-${item.faIcon}`"
          ></i>
      </ion-fab-button>
    </ion-fab-list>
    <ion-menu-toggle>
      <ion-fab-list side="bottom">
          <ion-fab-button>
            <ion-menu-button color="primary"></ion-menu-button>
          </ion-fab-button>
      </ion-fab-list>
    </ion-menu-toggle>
  </ion-fab>
</template>


<style lang="scss" scoped>

</style>

<script lang="js">
  import { defineComponent } from 'vue'
  import ionic from "@/assets/js/mixins/ionic";

  export default defineComponent({
    props: ['user', 'equipment'],
    mixins: [ ionic ],
    setup() {
    //
      
    },
  })
</script>




