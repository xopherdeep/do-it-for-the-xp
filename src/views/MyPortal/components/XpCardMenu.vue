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
              class="ion-justify-content-left"
            >
              <i
                class="fad fa-lg"
                :class="`fa-${(action.faIcon || action.icon || '').replace('fa-', '')}`"
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

<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import ionic from "@/mixins/ionic";

  interface Action {
    id: string;
    label: string;
    faIcon?: string;
    icon?: string;
    link?: string;
    click?: () => void;
    primary?: string;
    secondary?: string;
  }

  export default defineComponent({
    name: 'xp-card-menu',
    props: {
      cardTitle: String,
      actions: {
        type: Array as PropType<Action[]>,
        required: true
      }
    },
    mixins: [ionic]
  })
</script>