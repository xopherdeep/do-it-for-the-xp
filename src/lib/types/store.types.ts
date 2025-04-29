// Type definitions for the Vuex store

// Root state type definition
export interface RootState {
  theme: {
    rpg: string;
    ui: string;
  };
  bgm: {
    $fx?: {
      rpg?: {
        [theme: string]: {
          BGM: {
            startScreen: any[];
            chooseFile: any[];
            home: any[];
            world: any[];
            battle: any[];
            shop: any[];
            [key: string]: any[];
          };
        };
      };
    };
  };
  battle?: {
    bgmWaitToStart: number;
    active?: boolean;
  };
  // Add other state properties as needed
}

// Type for BGM change payload
export interface ChangeBGMPayload {
  tracks: any[];
  track: number;
  startDelay?: number;
  saveBookmark?: boolean;
}

// Alert button handler type
export type AlertButtonHandler = ((value: any) => any | Promise<any>) | undefined;