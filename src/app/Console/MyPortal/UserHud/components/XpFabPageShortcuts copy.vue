<template>
  <ion-fab vertical="center" horizontal="end" class="icon-colors">
    <ion-fab-button expand="block" color="light">
      <i :class="`fad fa-${pageIcon} fa-2x`"></i>
    </ion-fab-button>
    <ion-fab-list v-for="side in sides" :key="side" :side="side">
      <ion-fab-button
        v-for="(button, index) in filterShortcutsBySide(side)"
        :key="index"
        @click="button.click"
        class="icon-colors"
      >
        <i :class="`fad fa-${button.faIcon} fa-lg`"></i>
      </ion-fab-button>
    </ion-fab-list>
  </ion-fab>
</template>

<script lang="ts">
  import { computed, defineComponent } from "vue";
  import { useRoute } from "vue-router";
  import ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    props: ["shortcuts"],
    mixins: [ionic],
    setup(props) {
      const route = useRoute();
      const filterShortcutsBySide = (side) =>
        props.shortcuts.filter((s) => s.side == side);
      const pageIcon = computed(() => route.meta.faIcon);

      return {
        pageIcon,
        filterShortcutsBySide,
        sides: ["top", "start", "end", "bottom"],
      };
    },
  });
</script>
