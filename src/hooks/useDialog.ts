import { ref } from 'vue';
import { ComponentPublicInstance } from 'vue';
import debug from '@/lib/utils/debug';

// Define the interface for XpDialog component with its methods
export interface XpDialogInterface {
  show: () => void;
  hide: () => void;
  handleClick: () => void;
}

export interface DialogOptions {
  speed?: number;
  soundTheme?: any;
  soundType?: string;
  showIndicator?: boolean;
  styleClass?: string;
}

/**
 * Base dialog hook for handling dialog interactions
 * Provides common dialog functionality that can be extended for specific needs
 */
export function useDialog(defaultOptions: DialogOptions = {}) {
  // Reference to dialog component
  const dialogRef = ref<ComponentPublicInstance & XpDialogInterface | null>(null);
  
  // Dialog state
  const isVisible = ref(false);
  const dialogText = ref('');
  const options = ref<DialogOptions>({
    speed: 25,
    soundTheme: null,
    soundType: 'text',
    showIndicator: true,
    styleClass: '',
    ...defaultOptions
  });
  
  /**
   * Show dialog with given type
   */
  const showDialog = (_type: string = 'text', soundEffect = 'select') => {
    isVisible.value = true;
    debug.log(`Showing dialog of type: ${_type}`);
    // Play a sound effect for immersion
    try {
      // This assumes you have access to play$fx from your component
      // If not, you'll need to pass a function to play sounds
      if (typeof window['play$fx'] === 'function') {
        window['play$fx'](soundEffect);
      }
    } catch {
      debug.log('Sound effect not available');
    }
    
    // Show the dialog component if available
    if (dialogRef.value) {
      dialogRef.value.show();
    }
  };
  
  /**
   * Hide dialog
   */
  const hideDialog = () => {
    isVisible.value = false;
  };
  
  /**
   * Set dialog reference
   */
  const setDialogRef = (el: any) => {
    dialogRef.value = el;
  };
  
  // Function to handle dialog completion
  const onDialogComplete = (callback: () => void) => {
    callback();
  };
  
  // Function to handle individual dialog block completions
  const onBlockComplete = (blockIndex: number, callback?: (index: number) => void) => {
    debug.log(`Dialog block ${blockIndex} completed`);
    if (callback) {
      callback(blockIndex);
    }
  };
  
  return {
    // State
    dialogRef,
    isVisible,
    dialogText,
    options,
    
    // Methods
    showDialog,
    hideDialog,
    setDialogRef,
    onDialogComplete,
    onBlockComplete
  };
}