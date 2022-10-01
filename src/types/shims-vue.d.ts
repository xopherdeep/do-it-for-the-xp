/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@vue/runtime-core' {
  // TODO: replace 'any' with actual type
  interface ComponentCustomProperties {
    $fx: any; 
    $requireAvatar: any; 
    $requireImg: any;  
    $router: any; 
    $store: any; 
    play$fx: (fx?: string) => void;
    $historyCount: number;
  }
}

declare module '@/mixins/ionic'{}
export {}  // Important! See note.