<template>
  <ion-page :class="$options.name">
    <ion-fab 
      slot="fixed"
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button>
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button @click="clickAdd">
          <ion-icon :icon="addSharp" />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon :ios="searchOutline" :md="searchSharp" />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon :ios="thumbsUpOutline" :md="thumbsUpSharp" />
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>

  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from "@/mixins/ionic";

  import {
    addOutline,
    addSharp,
    searchOutline,
    searchSharp,
    thumbsUpOutline,
    thumbsUpSharp
  } from "ionicons/icons"
  import { useRouter } from 'vue-router';

  export default defineComponent({
    name: 'xp-achievements',
    mixins: [ionic],
    methods: {
      
      clickAdd(){
        this.$router.push("/add-achievement")

      }
    },
    setup(){

      const router = useRouter()

      // const clickAdd = () => router.push("/add-achievement")

      return {
        // clickAdd,
        addOutline,
        addSharp,
        searchOutline,
        searchSharp,
        thumbsUpOutline,
        thumbsUpSharp
      }
    },
  })
</script>
<style lang="scss" scoped>
  ion-fab-list{
    ion-fab-button{
      &::before{
        position: absolute;
        right: 53px;
        top: 12px;
      }

      &:nth-child(1)::before {
        content: "Create your Own "; 
      }
      &:nth-child(2)::before {
        content: "Add from Discover"; 
      }
      &:nth-child(3)::before {
        content: "Add from Recommended"; 
      }
    }
  }

</style>