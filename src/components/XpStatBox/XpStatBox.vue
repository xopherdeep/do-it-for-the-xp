<template>
  <div
    button
    class="stat-box clickable text-center"
    @click="handleClick"
  >
    <div class="stat-value">{{ value.toLocaleString() }}</div>
    <i :class="`fad ${iconName} fa-2x ${iconColor ? 'text-' + iconColor : ''}`"></i>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<script lang="ts">
  import Ionic from "@/mixins/ionic";
  import { defineComponent } from "vue";

  export default defineComponent({
    name: "XpStatBox",
    mixins: [Ionic],
    props: {
      value: {
        type: [Number, String],
        default: 0
      },
      label: {
        type: String,
        required: true
      },
      iconName: {
        type: String,
        required: true
      },
      iconColor: {
        type: String,
        default: ""
      },
      onClick: {
        type: Function,
        default: () => { }
      }
    },
    methods: {
      handleClick() {
        this.onClick();
      }
    }
  });
</script>

<style lang="scss" scoped>
  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-radius: 8px;
    background-color: var(--ion-color-light);
    transition: all 0.2s ease-in-out;

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      margin: 8px 0;
    }

    .stat-label {
      font-size: 14px;
      color: var(--ion-color-medium);
    }

    i {
      margin-bottom: 8px;
    }
  }

  .clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background-color: var(--ion-color-light-tint);
    }

    &:active {
      transform: translateY(0);
      background-color: var(--ion-color-light-shade);
    }
  }

  .text-success {
    color: var(--ion-color-success);
  }

  .text-primary {
    color: var(--ion-color-primary);
  }

  .text-danger {
    color: var(--ion-color-danger);
  }

  .text-warning {
    color: var(--ion-color-warning);
  }

  .text-tertiary {
    color: var(--ion-color-tertiary);
  }
</style>