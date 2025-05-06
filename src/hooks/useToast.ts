import { toastController } from '@ionic/vue';

/**
 * Hook for displaying toast notifications in the application
 */
export const useToast = () => {
  /**
   * Show a toast notification
   * @param message The message to display
   * @param duration The duration in milliseconds (default: 2000)
   * @param position The position of the toast (default: 'bottom')
   * @param color The color of the toast (default: 'dark')
   */
  const showToast = async (
    message: string, 
    duration: number = 2000, 
    position: 'top' | 'bottom' | 'middle' = 'bottom',
    color: string = 'dark'
  ) => {
    const toast = await toastController.create({
      message,
      duration,
      position,
      color,
      cssClass: 'app-toast',
    });

    await toast.present();
    return toast;
  };

  return {
    showToast,
  };
};