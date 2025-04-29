import { BackgroundLayer, Engine } from "earthbound-battle-backgrounds";

// Define constants for valid background range
const MIN_BG_INDEX = 0;
const MAX_BG_INDEX = 325; // Based on the library's available backgrounds
const DEFAULT_BG1 = 219; // Default background 1 (Starman Junior)
const DEFAULT_BG2 = 218; // Default background 2

/**
 * BackgroundManager
 * 
 * A singleton service to manage Earthbound battle backgrounds across the application.
 * Ensures only one instance of the animation engine is running at any time.
 */
class BackgroundManager {
  private static instance: BackgroundManager;
  private backgroundEngine: Engine | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private bg1: number = DEFAULT_BG1;
  private bg2: number = DEFAULT_BG2;
  private aspectRatio: number = 0; // Default aspect ratio (full screen)
  private resizeListener: (() => void) | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  /**
   * Validate a background index to ensure it's within the valid range
   * @param index The background index to validate
   * @param defaultValue Default value to use if invalid
   * @returns A valid background index
   */
  private validateBackgroundIndex(index: number | undefined, defaultValue: number): number {
    // Check if index is a number and within valid range
    if (typeof index === 'number' && !isNaN(index) && 
        index >= MIN_BG_INDEX && index <= MAX_BG_INDEX) {
      return index;
    }
    
    console.warn(`Invalid background index: ${index}, using default: ${defaultValue}`);
    return defaultValue;
  }

  /**
   * Initialize the battle background
   * 
   * @param options Configuration options
   * @returns boolean indicating success
   */
  public initBackground(options: {
    canvasSelector?: string;
    canvasElement?: HTMLCanvasElement;
    bg1?: number;
    bg2?: number;
    aspectRatio?: number;
    handleResize?: boolean;
  } = {}): boolean {
    // Clean up any existing background first
    this.cleanupBackground();

    // Get canvas element either from selector or direct element reference
    if (options.canvasElement) {
      this.canvasElement = options.canvasElement;
    } else if (options.canvasSelector) {
      const el = document.querySelector(options.canvasSelector);
      if (el && el instanceof HTMLCanvasElement) {
        this.canvasElement = el;
      }
    } else {
      // Default to .battle-bg if no selector provided
      const el = document.querySelector(".battle-bg");
      if (el && el instanceof HTMLCanvasElement) {
        this.canvasElement = el;
      }
    }

    // Exit if we don't have a valid canvas
    if (!this.canvasElement) {
      console.error("BackgroundManager: No canvas element found");
      return false;
    }

    try {
      // Update background settings with validation
      this.bg1 = this.validateBackgroundIndex(options.bg1, this.bg1);
      this.bg2 = this.validateBackgroundIndex(options.bg2, this.bg2);
      this.aspectRatio = options.aspectRatio !== undefined ? options.aspectRatio : this.aspectRatio;

      // Create two layers with validated indices
      const layer1 = new BackgroundLayer(this.bg1);
      const layer2 = new BackgroundLayer(this.bg2);

      // Create animation engine
      this.backgroundEngine = new Engine([layer1, layer2], {
        aspectRatio: this.aspectRatio,
        canvas: this.canvasElement,
      });

      // Start the animation
      this.backgroundEngine.animate();

      // Set up resize handler if requested
      if (options.handleResize) {
        this.setupResizeHandler();
      }

      return true;
    } catch (error) {
      console.error("BackgroundManager: Error initializing background:", error);
      // Fall back to known good background indices if initialization fails
      this.bg1 = DEFAULT_BG1;
      this.bg2 = DEFAULT_BG2;
      
      try {
        // Attempt again with the default values
        const layer1 = new BackgroundLayer(this.bg1);
        const layer2 = new BackgroundLayer(this.bg2);
        
        this.backgroundEngine = new Engine([layer1, layer2], {
          aspectRatio: this.aspectRatio,
          canvas: this.canvasElement,
        });
        
        this.backgroundEngine.animate();
        
        if (options.handleResize) {
          this.setupResizeHandler();
        }
        
        return true;
      } catch (fallbackError) {
        console.error("BackgroundManager: Critical error, even fallback backgrounds failed:", fallbackError);
        return false;
      }
    }
  }

  /**
   * Clean up the background engine and event listeners
   */
  public cleanupBackground(): void {
    // Stop the animation engine if it exists
    if (this.backgroundEngine) {
      if (typeof this.backgroundEngine.stop === 'function') {
        this.backgroundEngine.stop();
      }
      this.backgroundEngine = null;
    }

    // Remove resize listener if it exists
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }

    // Clear canvas reference
    this.canvasElement = null;
  }

  /**
   * Update the background settings
   * 
   * @param options New background options
   * @returns boolean indicating success
   */
  public updateBackground(options: {
    bg1?: number;
    bg2?: number;
    aspectRatio?: number;
  } = {}): boolean {
    // Update the settings with validation
    if (options.bg1 !== undefined) this.bg1 = this.validateBackgroundIndex(options.bg1, this.bg1);
    if (options.bg2 !== undefined) this.bg2 = this.validateBackgroundIndex(options.bg2, this.bg2);
    if (options.aspectRatio !== undefined) this.aspectRatio = options.aspectRatio;

    // If we have an active canvas, reinitialize the background with new settings
    if (this.canvasElement) {
      const handleResize = !!this.resizeListener;
      return this.initBackground({
        canvasElement: this.canvasElement,
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio,
        handleResize
      });
    }
    
    return false;
  }

  /**
   * Get current background settings
   */
  public getBackgroundSettings() {
    return {
      bg1: this.bg1,
      bg2: this.bg2,
      aspectRatio: this.aspectRatio,
      isActive: !!this.backgroundEngine
    };
  }

  /**
   * Set up a resize handler for the canvas
   */
  private setupResizeHandler(): void {
    // Remove any existing handler
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }

    // Create and add debounced resize handler
    let timeout: ReturnType<typeof setTimeout> | null = null;
    this.resizeListener = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        if (this.canvasElement && this.backgroundEngine) {
          // Update canvas dimensions
          this.canvasElement.width = window.innerWidth;
          this.canvasElement.height = window.innerHeight;
          // The engine will adapt automatically to the new canvas size
        }
      }, 250);
    };

    window.addEventListener('resize', this.resizeListener);
  }

  /**
   * Generate random background settings
   * 
   * @returns object with random bg1, bg2 values
   */
  public getRandomBackground() {
    return {
      bg1: Math.floor(Math.random() * (MAX_BG_INDEX + 1)),
      bg2: Math.floor(Math.random() * (MAX_BG_INDEX + 1)),
    };
  }
}

// Export the singleton instance
export const backgroundManager = BackgroundManager.getInstance();

// Also export the class for testing purposes
export default BackgroundManager;