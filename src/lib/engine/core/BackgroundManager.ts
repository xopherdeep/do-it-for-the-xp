import debug from "@/lib/utils/debug";
import { BackgroundLayer, Engine } from "earthbound-battle-backgrounds";

// Define constants for valid background range
const MIN_BG_INDEX = 0;
const MAX_BG_INDEX = 325; // Based on the library's available backgrounds
/** The SNES frame the earthbound-battle-backgrounds engine renders; CSS scales it to the page. */
const ENGINE_FRAME_WIDTH = 256;
const ENGINE_FRAME_HEIGHT = 224;
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
  private constructor() { }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BackgroundManager {
    const hasInstance = Boolean(BackgroundManager.instance);
    if (!hasInstance) {
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
    const isValidIndex = typeof index === 'number' && !isNaN(index) &&
      index >= MIN_BG_INDEX && index <= MAX_BG_INDEX;
    if (isValidIndex) {
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
    const { canvasElement, canvasSelector } = options;
    if (canvasElement) {
      this.canvasElement = canvasElement;
    } else if (canvasSelector) {
      const el = document.querySelector(canvasSelector);
      const isCanvasElement = el && el instanceof HTMLCanvasElement;
      if (isCanvasElement) {
        this.canvasElement = el;
      }
    } else {
      // Default to .battle-bg if no selector provided
      const el = document.querySelector(".battle-bg");
      const isCanvasElement = el && el instanceof HTMLCanvasElement;
      if (isCanvasElement) {
        this.canvasElement = el;
      }
    }

    // Exit if we don't have a valid canvas
    const canvas = this.canvasElement;
    if (!canvas) {
      debug.error("BackgroundManager: No canvas element found");
      return false;
    }

    // Track active page if provided
    const page = options.page;
    if (page) {
      this.activePage = page;
    }

    const shouldHandleResize = options.handleResize;
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
        canvas,
      });

      // Restore tick state if we have a preserved one and we're likely using the same/similar background
      // Note: We might want to check if bg1/bg2 changed significantly, but usually continuing is smoother.
      const hasPreservedTick = this.lastTick > 0;
      if (hasPreservedTick) {
        (this.backgroundEngine as any).tick = this.lastTick;
      }

      // Start the animation
      this.backgroundEngine.animate();

      // Set up resize handler if requested
      if (shouldHandleResize) {
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
          canvas,
        });

        this.backgroundEngine.animate();

        if (shouldHandleResize) {
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
    const engine = this.backgroundEngine;
    if (engine) {
      // Capture current tick before stopping/destroying
      this.lastTick = (engine as any).tick || 0;

      const canStop = typeof engine.stop === 'function';
      if (canStop) {
        engine.stop();
      }
      this.backgroundEngine = null;
    }

    // Remove resize listener if it exists
    const listener = this.resizeListener;
    if (listener) {
      window.removeEventListener('resize', listener);
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
    const { bg1, bg2, aspectRatio, page } = options;
    const hasBg1 = bg1 !== undefined;
    if (hasBg1) this.bg1 = this.validateBackgroundIndex(bg1, this.bg1);
    const hasBg2 = bg2 !== undefined;
    if (hasBg2) this.bg2 = this.validateBackgroundIndex(bg2, this.bg2);
    const hasAspectRatio = aspectRatio !== undefined;
    if (hasAspectRatio) this.aspectRatio = aspectRatio;
    if (page) this.activePage = page;

    // If we have an active canvas, reinitialize the background with new settings
    const canvas = this.canvasElement;
    if (canvas) {
      const handleResize = !!this.resizeListener;
      return this.initBackground({
        canvasElement: canvas,
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
    this.backgroundEngine?.setAspectRatio(aspectRatio);
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
      const hasEngine = Boolean(this.backgroundEngine);
      if (!hasEngine) {
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
        const isAnimating = progress < 1;
        if (isAnimating) {
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
        const canvas = this.canvasElement;
        const isEngineDrawing = canvas && this.backgroundEngine;
        if (isEngineDrawing) {
          // The engine paints a fixed 256x224 SNES frame and CSS stretches the canvas to the page, so
          // the backing store must keep the engine's size. Resizing it to the window used to leave the
          // frame in the top-left corner and the rest of the arena black after any resize event.
          canvas.width = ENGINE_FRAME_WIDTH;
          canvas.height = ENGINE_FRAME_HEIGHT;
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
    const isStoppable = pooledEngine && typeof pooledEngine.stop === 'function';
    if (isStoppable) {
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
      const hasNewCanvas = options.canvas && (engine as any).canvas !== options.canvas;
      if (hasNewCanvas) {
        (engine as any).canvas = options.canvas;
      }
      const hasAspectRatio = options.aspectRatio !== undefined;
      if (hasAspectRatio) {
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
      const context = canvas.getContext('2d', { willReadFrequently: true });
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