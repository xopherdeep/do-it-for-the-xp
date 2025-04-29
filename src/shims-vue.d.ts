/* eslint-disable */
import User from '@/lib/utils/User/user'; // Import the User type
import { FXSystem } from '@/lib/types/fx'; // Import our FXSystem interface

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Add global window declaration for $fx
interface Window {
  $fx: FXSystem;
}

declare module '@vue/runtime-core' {
  // Global properties for Vue component instances
  interface ComponentCustomProperties {
    $fx: FXSystem;
    $requireAvatar: any;
    $requireImg: any;
    $router: any;
    $store: any;
    play$fx: (fx?: string) => void;
    $historyCount: number;
    $getUserAvatar: (user: User) => string; 
  }
}

// Make sure global methods are available on Vue component instances
declare module 'vue' {
  import type { defineComponent } from 'vue'
  interface ComponentCustomProperties {
    $requireAvatar: any;
    play$fx: (fx?: string) => void;
  }

  const component: defaultComponent<object, object, unknown>
  export default component
  
  // import Vue from 'vue'
  // export default Vue
}

declare module '@/mixins/ionic' { }
export { }  // Important! See note.
