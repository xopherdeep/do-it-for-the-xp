<template>
  <!-- BACKDROP TO CLOSE ON CLICK OUTSIDE -->
  <div 
    v-if="fabActive" 
    class="menu-backdrop-overlay" 
    @click="closeMenu"
  ></div>

  <!-- CENTERED MENU -->
  <div v-if="fabActive" class="centered-menu-wrapper">
    <button class="close-menu-btn" @click="closeMenu">
      <i class="fad fa-times-square"></i>
    </button>
    <xp-card-menu
      :cardTitle="pageName"
      :actions="userActions"
      @action-click="closeMenu"
    />
  </div>

  <!-- PAGE MENU BUTTON -->
  <ion-fab
    vertical="center"
    horizontal="center"
    class="fab-page-menu"
    v-if="user.stats"
  >
    <ion-fab-button
      color="light"
      @click="toggleMenu"
    >
      <i
        v-if="pageIcon != 'fort-awesome'"
        class="fad fa-2x"
        :class="`fa-${pageIcon}`"
      />
      <i
        v-else
        class="fab fa-lg"
        :class="`fa-${pageIcon}`"
      />
    </ion-fab-button>
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

.centered-menu-wrapper {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 92vw;
  max-width: 420px;
  z-index: 2500;
  display: flex;
  flex-direction: column;
  align-items: center;

  .close-menu-btn {
    position: absolute;
    top: -15px;
    right: 2px;
    background: transparent;
    border: none;
    color: var(--ion-color-danger);
    font-size: 2.5rem;
    z-index: 2501;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }
}

.fab-page-menu {
  z-index: 1000;
}
</style>

<script lang="ts">
  import { useRoute } from "vue-router";
  import { computed, defineComponent, ref } from 'vue'
  import userActions from "@/mixins/userActions";
  import ionic from "@/mixins/ionic";
  import XpCardMenu from "./XpCardMenu.vue"

  export default defineComponent({
    mixins: [userActions, ionic],
    components: { XpCardMenu },
    props: ["pageName", "user"],
    setup() {
      const route = useRoute();
      const fabActive = ref(false);
      const pageIcon = computed(() => route.meta.faIcon)
      
      const toggleMenu = () => fabActive.value = !fabActive.value;
      const closeMenu = () => fabActive.value = false;

      return {
        pageIcon,
        fabActive,
        toggleMenu,
        closeMenu
      }
    },
  })
</script>