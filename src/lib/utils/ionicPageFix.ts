/**
 * Utility functions to fix issues with ion-page visibility
 * Ensures proper handling of ion-page-hidden attribute on page transitions
 */

/**
 * Fix for pages not properly getting the ion-page-hidden attribute
 * This can happen during certain navigation flows, especially from modals
 */
export function fixPageTransitions() {
  // Small timeout to ensure we run after the current navigation cycle
  setTimeout(() => {
    const pages = document.querySelectorAll('#main-content > div.ion-page');
    const currentPages = document.querySelectorAll(
      "#main-content > div.ion-page:not(.ion-page-hidden)"
    );
    
    // If we have multiple visible pages, we need to fix it
    if (currentPages.length > 1) {
      // Get the top-most page (the one that should be visible)
      const lastPage = pages[pages.length - 1];
      
      // Hide all pages except the top one
      pages.forEach(page => {
        if (page !== lastPage) {
          page.classList.add('ion-page-hidden');
        } else {
          page.classList.remove('ion-page-hidden');
        }
      });
    }
  }, 100); // Small delay to ensure DOM is updated
}

/**
 * Should be called when a page is about to be entered
 * This helps ensure the page transition works correctly
 */
export function preparePageTransition() {
  // Force a check for multiple visible pages and fix if needed
  fixPageTransitions();
}