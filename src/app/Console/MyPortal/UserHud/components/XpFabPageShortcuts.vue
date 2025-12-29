<template>
  <!-- BACKDROP TO CLOSE ON CLICK OUTSIDE -->
  <div 
    v-if="fabActive" 
    class="menu-backdrop-overlay" 
    @click="closeAndDeactivate"
  ></div>

  <ion-fab 
    ref="fabContainer"
    vertical="center" 
    horizontal="center" 
    class="icon-colors fab-page-shortcuts"
  >
    <ion-fab-button expand="block" color="light" @click="syncToggle">
      <i :class="`fad fa-${pageIcon} fa-2x`"></i>
    </ion-fab-button>
    <ion-fab-list v-for="side in sides" :key="side" :side="side">
      <ion-fab-button 
        v-for="(button, index) in filterShortcutsBySide(side)"
        :key="index"
        @click="handleButtonClick(button)"
        class="icon-colors"
      >
        <i :class="`fad fa-${button.faIcon} fa-lg`"></i>
      </ion-fab-button>
    </ion-fab-list>
  </ion-fab>
</template>

<style lang="scss" scoped>
.menu-backdrop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  z-index: 2000;
}

.fab-page-shortcuts {
  z-index: 2500;
}
</style>

<script lang="ts">
  import { computed, defineComponent, ref } from 'vue'
  import { useRoute } from "vue-router";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    props: ["shortcuts"],
    mixins: [ionic],
    setup(props) {
      const route = useRoute();
      const fabContainer = ref(null);
      const fabActive = ref(false);

      const filterShortcutsBySide = (side: string) => props.shortcuts.filter( s => s.side == side )
      const pageIcon = computed( () => route.meta.faIcon )

      const syncToggle = () => {
        // Toggle the blur. Ionic handles the FAB list internally.
        fabActive.value = !fabActive.value;
      };

      const closeAndDeactivate = () => {
        fabActive.value = false;
        // Imperatively close the Ionic FAB
        const fabEl = (fabContainer.value as any)?.$el;
        if (fabEl) fabEl.activated = false;
      };

      const handleButtonClick = (button: any) => {
        button.click();
        closeAndDeactivate();
      };

      return {
        fabContainer,
        pageIcon,
        fabActive,
        filterShortcutsBySide,
        syncToggle,
        closeAndDeactivate,
        handleButtonClick,
        sides: ["top", "start", "end", "bottom"]
      }
    },
  })
</script>