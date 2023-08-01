<template>
  <ion-card :class="$options.name">
    <ion-card-title v-if="cardTitle">
      {{ cardTitle }}
    </ion-card-title>
    <ion-buttons>
      <ion-grid>
        <ion-row>
          <ion-col
            v-for="action in actions"
            :key="action.id"
            size="6"
          >
            <ion-button
              :id="action.id"
              :router-link="action.link"
              router-direction="root"
              @click="action.click"
              size="large"
              expand="fill"
            >
              <i
                class="fad fa-lg"
                :class="`fa-${action.faIcon.replace('fa-', '')}`"
              ></i>
              {{ action.label }}
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-buttons>
  </ion-card>
</template>

<style>
  .xp-card-menu{
    /* code */ 
  }
</style>

<script lang="js">
  import { defineComponent } from 'vue'
  import ionic from "@/mixins/ionic";
  export default defineComponent({
    name: 'xp-card-menu',
    props: ["cardTitle", "actions"],
    mixins: [ionic],
    setup() {
      //
    },
  })
</script>
@/mixins/ionic@/mixins/ionic