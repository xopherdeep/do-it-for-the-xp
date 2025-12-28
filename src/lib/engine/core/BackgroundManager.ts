import debug from "@/lib/utils/debug";
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
  private activePage: string | null = null; // Track which page/component is using the background
  private lastTick: number = 0; // Preserve animation state for seamless resuming
  private enginePool: Map<string, Engine> = new Map();
  private stateRegistry: Map<string, { tick: number, bg1?: number, bg2?: number }> = new Map();

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
    
    debug.warn(`Invalid background index: ${index}, using default: ${defaultValue}`);
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
    page?: string; // Identifier for the page/component using this background
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
      debug.error("BackgroundManager: No canvas element found");
      return false;
    }

    // Track active page if provided
    if (options.page) {
      this.activePage = options.page;
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

      // Restore tick state if we have a preserved one and we're likely using the same/similar background
      // Note: We might want to check if bg1/bg2 changed significantly, but usually continuing is smoother.
      if (this.lastTick > 0) {
        (this.backgroundEngine as any).tick = this.lastTick;
      }

      // Start the animation
      this.backgroundEngine.animate();

      // Set up resize handler if requested
      if (options.handleResize) {
        this.setupResizeHandler();
      }

      return true;
    } catch (error) {
      debug.error("BackgroundManager: Error initializing background:", error);
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
        debug.error("BackgroundManager: Critical error, even fallback backgrounds failed:", fallbackError);
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
      // Capture current tick before stopping/destroying
      this.lastTick = (this.backgroundEngine as any).tick || 0;
      
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
    
    // Clear active page reference
    this.activePage = null;
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
    page?: string;
  } = {}): boolean {
    // Update the settings with validation
    if (options.bg1 !== undefined) this.bg1 = this.validateBackgroundIndex(options.bg1, this.bg1);
    if (options.bg2 !== undefined) this.bg2 = this.validateBackgroundIndex(options.bg2, this.bg2);
    if (options.aspectRatio !== undefined) this.aspectRatio = options.aspectRatio;
    if (options.page) this.activePage = options.page;

    // If we have an active canvas, reinitialize the background with new settings
    if (this.canvasElement) {
      const handleResize = !!this.resizeListener;
      return this.initBackground({
        canvasElement: this.canvasElement,
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio,
        handleResize,
        page: this.activePage || undefined
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
      isActive: !!this.backgroundEngine,
      activePage: this.activePage
    };
  }

  /**
   * Get the current aspect ratio value
   */
  public getCurrentAspectRatio(): number | null {
    return this.backgroundEngine ? this.aspectRatio : null;
  }

  /**
   * Set the aspect ratio immediately
   * @param aspectRatio The new aspect ratio value
   */
  public setAspectRatio(aspectRatio: number): void {
    this.aspectRatio = aspectRatio;
    if (this.backgroundEngine) {
      this.backgroundEngine.setAspectRatio(aspectRatio);
    }
  }

  /**
   * Smoothly animate the aspect ratio from current value to target value
   * 
   * @param targetAspectRatio Target aspect ratio value (0 for full screen)
   * @param duration Animation duration in milliseconds
   * @param callback Optional callback function to call when animation completes
   * @returns Promise that resolves when the animation is complete
   */
  public animateAspectRatio(targetAspectRatio: number, duration: number = 1500, callback?: () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      // If no background engine is active, just resolve immediately
      if (!this.backgroundEngine) {
        if (callback) callback();
        resolve();
        return;
      }

      const startValue = this.aspectRatio;
      const startTime = performance.now();
      const change = targetAspectRatio - startValue;
      
      // Easing function for smooth animation (easeInOutQuad)
      const easeInOutQuad = (t: number): number => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      };
      
      // Animation frame function
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutQuad(progress);
        
        // Calculate current value based on progress
        const currentValue = startValue + change * easedProgress;
        
        // Set the new aspect ratio
        this.aspectRatio = currentValue;
        this.backgroundEngine.aspectRatio = currentValue; 
        
        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete
          if (callback) callback();
          resolve();
        }
      };
      
      // Start the animation
      requestAnimationFrame(animate);
    });
  }

  /**
   * Check if the manager is currently active for a specific page
   * @param page The page identifier to check
   */
  public isActiveFor(page: string): boolean {
    return this.activePage === page && !!this.backgroundEngine;
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

  /**
   * Save the state (tick and optionally layout) for a specific ID
   */
  public saveState(id: string, state: { tick: number, bg1?: number, bg2?: number }): void {
    if (!id) return;
    const existing = this.stateRegistry.get(id) || { tick: 0 };
    this.stateRegistry.set(id, { ...existing, ...state });
  }

  /**
   * Get the saved state for a specific ID
   */
  public getState(id: string): { tick: number, bg1?: number, bg2?: number } | undefined {
    return this.stateRegistry.get(id);
  }

  /**
   * Clear state for a specific ID
   */
  public clearState(id: string): void {
    this.stateRegistry.delete(id);
    const pooledEngine = this.enginePool.get(id);
    if (pooledEngine && typeof pooledEngine.stop === 'function') {
      pooledEngine.stop();
    }
    this.enginePool.delete(id);
  }

  /**
   * Get or create a pooled engine for a specific component
   */
  public getOrCreateEngine(id: string, layers: any[], options: any): Engine {
    let engine = this.enginePool.get(id);
    
    if (!engine) {
      engine = new Engine(layers, options);
      this.enginePool.set(id, engine);
    } else {
      // Update canvas and other properties if they differ
      if (options.canvas && (engine as any).canvas !== options.canvas) {
        (engine as any).canvas = options.canvas;
      }
      if (options.aspectRatio !== undefined) {
        (engine as any).aspectRatio = options.aspectRatio;
      }
    }
    
    return engine;
  }

  /**
   * Synchronously render a single frame into a canvas
   */
  public renderFrame(id: string, canvas: HTMLCanvasElement | null): void {
    if (!canvas) return;
    const engine = this.enginePool.get(id) as any;
    if (!engine) return;

    try {
      const layers = engine.layers;
      const pixels = engine.pixels;
      const tick = engine.tick;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Force a single frame calculation
      engine.overlayFrame(pixels, layers, tick, 1, true);
      
      // Draw to canvas immediately
      // Use ImageData to transfer pixels. The typed array conversion 
      // is for safety across different build versions of the library.
      let imageData;
      try {
        imageData = new ImageData(pixels, 256, 256);
      } catch {
        const clamped = new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
        imageData = new ImageData(clamped, 256, 256);
      }
      context.putImageData(imageData, 0, 0);
    } catch (err) {
      debug.error(`BackgroundManager: Failed to render sync frame for ${id}:`, err);
    }
  }
}

// Export the singleton instance
export const backgroundManager = BackgroundManager.getInstance();

// Also export the class for testing purposes
export default BackgroundManager;