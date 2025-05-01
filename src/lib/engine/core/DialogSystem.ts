/**
 * DialogSystem - A system for managing dialog messages in the application
 * 
 * This provides a unified way to display messages/notifications using either:
 * - XpDialog component (with typing animation)
 * - Toast notifications (fallback)
 * - Console logs (debug mode)
 */
import debug from '@/lib/utils/debug';

// Define types for message display methods
export type MessageDisplayFn = (message: string, options?: DialogOptions) => void;
export type DialogOptions = {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error'; 
  sound?: string;
  autoDismiss?: boolean;
};

/**
 * DialogSystem - Singleton class for managing dialog messages
 */
export class DialogSystem {
  private static instance: DialogSystem;
  private displayFunctions: Map<string, MessageDisplayFn> = new Map();
  private defaultDisplayFn: MessageDisplayFn | null = null;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  /**
   * Get the singleton instance of DialogSystem
   */
  public static getInstance(): DialogSystem {
    if (!DialogSystem.instance) {
      DialogSystem.instance = new DialogSystem();
    }
    return DialogSystem.instance;
  }
  
  /**
   * Register a message display function for a specific context
   * @param context - The context identifier (e.g., 'temple', 'battle', 'shop')
   * @param displayFn - The function that will handle displaying messages
   */
  public registerDisplayFunction(context: string, displayFn: MessageDisplayFn): void {
    this.displayFunctions.set(context, displayFn);
    debug.log(`Registered dialog display function for context: ${context}`);
    
    // Set as default if no default exists yet
    if (this.defaultDisplayFn === null) {
      this.defaultDisplayFn = displayFn;
    }
  }
  
  /**
   * Set a specific display function as the default
   * @param context - The context to use as default
   */
  public setDefaultDisplayFunction(context: string): void {
    if (this.displayFunctions.has(context)) {
      this.defaultDisplayFn = this.displayFunctions.get(context)!;
      debug.log(`Set default dialog display function to context: ${context}`);
    } else {
      debug.warn(`Attempted to set default display function to unknown context: ${context}`);
    }
  }
  
  /**
   * Show a message using the appropriate display function
   * @param message - The message to display
   * @param context - Optional context to use a specific display function
   * @param options - Display options
   */
  public showMessage(message: string, context?: string, options: DialogOptions = {}): void {
    // Set default options
    const defaultOptions: DialogOptions = {
      duration: 2000,
      type: 'info',
      autoDismiss: true
    };
    
    // Merge with provided options
    const finalOptions = { ...defaultOptions, ...options };
    
    // Use the specified context's display function if it exists
    if (context && this.displayFunctions.has(context)) {
      this.displayFunctions.get(context)!(message, finalOptions);
      return;
    }
    
    // Fall back to the default display function if available
    if (this.defaultDisplayFn) {
      this.defaultDisplayFn(message, finalOptions);
      return;
    }
    
    // Ultimate fallback to console if no display functions are registered
    debug.log(`DIALOG: ${message}`);
  }
  
  /**
   * Unregister a display function for a context
   * @param context - The context to unregister
   */
  public unregisterDisplayFunction(context: string): void {
    if (this.displayFunctions.has(context)) {
      this.displayFunctions.delete(context);
      debug.log(`Unregistered dialog display function for context: ${context}`);
      
      // If this was the default, set a new default or null
      if (this.defaultDisplayFn === this.displayFunctions.get(context)) {
        this.defaultDisplayFn = this.displayFunctions.size > 0 
          ? this.displayFunctions.values().next().value || null
          : null;
      }
    }
  }
}

// Export a singleton instance for ease of use
export const dialogSystem = DialogSystem.getInstance();

// Export a convenience hook for Vue components
export function useDialogSystem() {
  return {
    showMessage: dialogSystem.showMessage.bind(dialogSystem),
    registerDisplayFunction: dialogSystem.registerDisplayFunction.bind(dialogSystem),
    setDefaultDisplayFunction: dialogSystem.setDefaultDisplayFunction.bind(dialogSystem),
    unregisterDisplayFunction: dialogSystem.unregisterDisplayFunction.bind(dialogSystem)
  };
}