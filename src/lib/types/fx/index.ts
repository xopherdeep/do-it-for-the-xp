// FX System type definitions
export interface SoundEffect {
  play: () => void;
  pause: () => void;
  currentTime: number;
}

export interface ThemeUI {
  ui: string;
  rpg: string;
}

export interface FXSystem {
  ui: {
    [key: string]: {
      openPage: SoundEffect;
      [key: string]: SoundEffect;
    }
  };
  rpg: {
    [key: string]: {
      text: SoundEffect;
      [key: string]: SoundEffect;
    }
  };
  theme: ThemeUI;
  play$fx: (sound: string) => void;
}