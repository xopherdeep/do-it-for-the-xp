import { ref } from 'vue';
import { ComponentPublicInstance } from 'vue';
import debug from '@/lib/utils/debug';

// Define the interface for XpDialog component with its methods
export interface XpDialogInterface {
  show: () => void;
  hide: () => void;
  handleClick: () => void;
}

export function useDialog() {
  const dialogRef = ref<ComponentPublicInstance & XpDialogInterface | null>(null);
  
  // Function to show the dialog using the ref
  const showDialog = (soundEffect = 'select') => {
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
    dialogRef,
    showDialog,
    onDialogComplete,
    onBlockComplete
  };
}