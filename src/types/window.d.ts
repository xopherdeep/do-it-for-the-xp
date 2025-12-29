/**
 * Global Window interface augmentations
 */
interface Window {
  $fx: {
    [soundTheme: string]: {
      [soundType: string]: {
        play: () => void;
      };
    };
  };
  /**
   * Play a sound effect
   * @param effectName Name of the effect to play
   */
  $play$fx: (effectName: string) => void;
}
