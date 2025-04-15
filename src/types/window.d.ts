interface Window {
  $fx: {
    [soundTheme: string]: {
      [soundType: string]: {
        play: () => void;
      }
    }
  }
}