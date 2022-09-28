<template>
  <ion-fab vertical="bottom" horizontal="center">
    <ion-fab-button expand="block" color="light">
      <i :class="`fad fa-${pageIcon} fa-2x`"></i>
    </ion-fab-button>
    <ion-fab-list v-for="side in sides" :key="side" :side="side">
      <ion-fab-button 
        v-for="(button, index) in filterShortcutsBySide(side)"
        :key="index"
        @click="button.click"
      >
        <i :class="`fa fa-${button.faIcon} fa-lg`"></i>
      </ion-fab-button>
    </ion-fab-list>
  </ion-fab>
</template>

<style>

</style>

<script lang="js">
  import { computed, defineComponent } from 'vue'
  import { useRoute } from "vue-router";
  import ionic from "@/assets/js/mixins/ionic";

  export default defineComponent({
    props: ["shortcuts"],
    mixins: [ionic],
    setup(props) {
      const route = useRoute();
      const filterShortcutsBySide = side => props.shortcuts.filter( s => s.side == side )
      const pageIcon = computed( () => route.meta.faIcon )

      return {
        pageIcon,
        filterShortcutsBySide,
        sides: ["top", "start", "end"]
      }
    },
  })
</script>

