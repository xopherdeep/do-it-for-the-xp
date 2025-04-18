<template>
  <span>
    ₲{{ formattedGp }}<small>.00</small>
  </span>
</template>

<script lang="ts">
  import { defineComponent, computed } from 'vue';

  const XpGp = defineComponent({
    name: 'XpGp',
    props: {
      gp: {
        type: Number,
      }
    },
    setup(props) {
      // Use a computed property to format the number as currency
      const formattedGp = computed(() => {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Number(props.gp));
      });

      return {
        formattedGp
      };
    }

  })

  export default XpGp 
</script>