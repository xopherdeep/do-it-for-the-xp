<template>
  <div
    class="nav-box clickable text-center"
    @click="handleClick"
    :class="{ 
      'border-primary': color === 'primary',
      'border-secondary': color === 'secondary',
      'border-tertiary': color === 'tertiary',
      'border-success': color === 'success',
      'border-warning': color === 'warning',
      'border-danger': color === 'danger',
      'border-tardis': color === 'tardis',
      'border-medium': color === 'medium'
    }"
  >
    <div class="icon-container">
      <i :class="`fad ${iconName} fa-3x ${color ? 'text-' + color : ''}`"></i>
    </div>
    <xp-label variant="stat">{{ label }}</xp-label>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import XpLabel from "@/components/atoms/Label/XpLabel.vue";

  export default defineComponent({
    name: "XpNavTile",
    components: {
      XpLabel
    },
    props: {
      label: {
        type: String,
        required: true
      },
      iconName: {
        type: String,
        required: true
      },
      color: {
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
  .nav-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    gap: 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05); /* Match StatBox background */
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    height: 100%;
    width: 100%;

    .icon-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      
      i {
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.3s ease;
      }
    }

    /* Force XpLabel to behave nicely in flex container */
    :deep(.xp-label) {
      margin: 0;
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis;
      max-width: 100%;
    }
  }

  .clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      background: rgba(255, 255, 255, 0.1); /* Match StatBox hover */
      
      .icon-container i {
        transform: scale(1.1);
      }
    }

    &:active {
      transform: translateY(0) scale(0.98);
      background: rgba(255, 255, 255, 0.05);
    }
  }

  /* Theme Borders */
  .border-primary { border-color: rgba(var(--ion-color-primary-rgb), 0.5); }
  .border-secondary { border-color: rgba(var(--ion-color-secondary-rgb), 0.5); }
  .border-tertiary { border-color: rgba(var(--ion-color-tertiary-rgb), 0.5); }
  .border-success { border-color: rgba(var(--ion-color-success-rgb), 0.5); }
  .border-warning { border-color: rgba(var(--ion-color-warning-rgb), 0.5); }
  .border-danger { border-color: rgba(var(--ion-color-danger-rgb), 0.5); }
  .border-tardis { border-color: rgba(0, 59, 111, 0.8); }
  .border-medium { border-color: rgba(var(--ion-color-medium-rgb), 0.5); }

  /* Theme Text */
  .text-primary { color: var(--ion-color-primary); }
  .text-secondary { color: var(--ion-color-secondary); }
  .text-tertiary { color: var(--ion-color-tertiary); }
  .text-success { color: var(--ion-color-success); }
  .text-warning { color: var(--ion-color-warning); }
  .text-danger { color: var(--ion-color-danger); }
  .text-tardis { 
    color: #003b6f; 
    text-shadow: 0 0 10px rgba(0, 59, 111, 0.4);
    
    &.fad {
      --fa-primary-color: #003b6f;
      --fa-secondary-color: #ffffff;
      --fa-secondary-opacity: 0.6;
    }
  }
  .text-medium { color: var(--ion-color-medium); }
</style>
