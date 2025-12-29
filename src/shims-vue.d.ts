/* eslint-disable */
import { DefineComponent } from "vue";
import { FXSystem } from "@/lib/types/fx"; // Import our FXSystem interface
import User from "@/lib/utils/User/user"; // Import the User type

// Add global window declaration for $fx
interface Window {
  $fx: FXSystem;
}

declare module "*.vue" {
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Augmenting both to be safe
declare module "vue" {
  interface ComponentCustomProperties {
    $fx: FXSystem;
    $requireAvatar: any;
    $requireImg: any;
    $requireIcon: any;
    $router: any;
    play$fx: (fx?: string) => void;
    $historyCount: number;
    $getUserAvatar: (user: User) => string | undefined;
  }
}

declare module "@vue/runtime-core" {
  // Global properties for Vue component instances
  interface ComponentCustomProperties {
    $fx: FXSystem;
    $requireAvatar: any;
    $requireImg: any;
    $requireIcon: any;
    $router: any;
    play$fx: (fx?: string) => void;
    $historyCount: number;
    $getUserAvatar: (user: User) => string | undefined;
  }
}

export {}; // Important! dont remove this.
