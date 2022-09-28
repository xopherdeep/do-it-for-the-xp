<template>
  <!-- GOLD POINTS -->
  <ion-fab
    vertical="top"
    horizontal="end"
    class="fab-gp hide"
  >
    <ion-card v-if="user.stats && isUserFabOn">
      <ion-card-title>
      GP
      </ion-card-title>
      <ion-card-content>
          <small>₲</small>
          {{ user.stats.gp.wallet }}
          <small>00</small>
      </ion-card-content>
            <ion-progress-bar
              color="warning"
              v-if="user.stats"
              :value="user.stats.gp.wallet / user.stats.gp.limit"
            ></ion-progress-bar>
    </ion-card>
  </ion-fab>
</template>

<style lang="scss" scoped>
  ion-fab {
    &.fab-gp {
      ion-card-content {
        padding: 0 17px 0 5px;

        small:last-child {
          border-bottom: 1px solid var(--ion-color-primary);
          position: absolute;
          top: 0;
          right: 2px;
          height: 20px;
          text-align: right;
          width: auto;
        }
      }
    }
  }
</style>

<script lang="js">
  import ionic from "@/assets/js/mixins/ionic";
  import { defineComponent } from 'vue'

  export default defineComponent({
    props: ['user', 'isUserFabOn'],
    mixins: [ ionic ],
    setup() {
      //
    },
  })
</script>

