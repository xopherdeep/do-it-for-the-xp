// This file contains declarations for Vue components that TypeScript might have trouble finding

// ATMModal component declaration
declare module '*/ATMModal.vue' {
  import { DefineComponent } from 'vue'
  const ATMModal: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default ATMModal
}