/** One screen in an intro splash sequence. */
export interface SplashScreen {
  image: string;        // Path to image
  text?: string;        // Optional text to display
  alt?: string;         // Alt text for image
  duration?: number;    // How long to display this splash
  soundEffect?: string; // Optional sound effect to play
}
