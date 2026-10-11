import { toastController } from '@ionic/vue';
import type { ToastOptions } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

export type ToastPosition = 'top' | 'bottom' | 'middle';

/**
 * Every toast in the app is an RPG message box: the dark Earthbound panel (`.rpg-toast` in
 * src/styles/_ionic.scss) with an X to dismiss it. Ionic 7.8 can also swipe a toast away vertically.
 * Kept free of any Ionic call so a spec can assert the options without a DOM.
 */
export const rpgToastOptions = (
  message: string,
  duration: number = 2000,
  position: ToastPosition = 'bottom',
): ToastOptions => ({
  message,
  duration,
  position,
  cssClass: 'rpg-toast',
  swipeGesture: 'vertical',
  buttons: [
    {
      icon: closeOutline,
      role: 'cancel',
      side: 'end',
      htmlAttributes: { 'aria-label': 'Dismiss' },
    },
  ],
});

/**
 * Hook for displaying toast notifications in the application
 */
export const useToast = () => {
  /**
   * Show a toast notification in the RPG message box style
   * @param message The message to display
   * @param duration The duration in milliseconds (default: 2000)
   * @param position The position of the toast (default: 'bottom')
   * @param _color Ignored: every toast uses the RPG box colours (kept so older callers compile)
   */
  const showToast = async (
    message: string,
    duration: number = 2000,
    position: ToastPosition = 'bottom',
    _color: string = 'dark'
  ) => {
    const toast = await toastController.create(rpgToastOptions(message, duration, position));

    await toast.present();
    return toast;
  };

  return {
    showToast,
  };
};
