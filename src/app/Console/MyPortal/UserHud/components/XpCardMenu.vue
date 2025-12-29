<template>
  <xp-rpg-menu
    :title="cardTitle"
    :actions="actions"
    @action-click="$emit('action-click', $event)"
  />
</template>

<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import XpRpgMenu, { RpgMenuAction } from "@/components/molecules/RpgMenu/XpRpgMenu.vue"

  export default defineComponent({
    name: 'xp-card-menu',
    components: { XpRpgMenu },
    emits: ['action-click'],
    props: {
      cardTitle: String,
      actions: {
        type: Array as PropType<RpgMenuAction[]>,
        required: true
      }
    }
  })
</script>

<style scoped>
  /* Styles are handled by XpRpgMenu */
</style>