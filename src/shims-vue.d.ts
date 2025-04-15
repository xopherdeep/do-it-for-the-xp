/* eslint-disable */
import User from '@/utils/User/user'; // Import the User type

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Add global window declaration for $fx
interface Window {
  $fx: any;
}

declare module '@vue/runtime-core' {
  // Global properties for Vue component instances
  interface ComponentCustomProperties {
    $fx: any;
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
  interface ComponentCustomProperties {
    $requireAvatar: any;
    play$fx: (fx?: string) => void;
  }
}

declare module '@/mixins/ionic' { }
export { }  // Important! See note.
