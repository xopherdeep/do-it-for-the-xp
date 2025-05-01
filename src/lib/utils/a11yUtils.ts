/**
 * Accessibility utilities to fix Ionic aria-hidden focus issues
 */

/**
 * Fix for the "Blocked aria-hidden on an element because its descendant retained focus" warning
 * Replaces aria-hidden with the inert attribute which properly prevents focus on the element and its descendants
 */
export function fixAriaHiddenFocusIssues() {
  if (process.env.NODE_ENV === "development") {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-hidden"
        ) {
          if (mutation.target instanceof HTMLElement) {
            mutation.target.removeAttribute("aria-hidden");
          }
        }
      });
      document.querySelectorAll("[aria-hidden]").forEach((el) => {
        el.removeAttribute("aria-hidden");
      });
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["aria-hidden"],
    });
  }
  // Run after DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Create a MutationObserver to monitor for aria-hidden changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' && 
          mutation.attributeName === 'aria-hidden' &&
          mutation.target instanceof HTMLElement
        ) {
          const element = mutation.target;
          if (element.getAttribute('aria-hidden') === 'true') {
            // Replace aria-hidden with inert
            element.removeAttribute('aria-hidden');
            element.setAttribute('inert', '');
          } else if (element.hasAttribute('inert') && !element.hasAttribute('aria-hidden')) {
            // If aria-hidden was removed, also remove inert
            element.removeAttribute('inert');
          }
        }
      });
    });

    // Target ion-router-outlet and ion-page elements which commonly have aria-hidden issues
    const targetsToObserve = [
      ...Array.from(document.querySelectorAll('ion-router-outlet')),
      ...Array.from(document.querySelectorAll('.ion-page'))
    ];

    // Observe existing elements
    targetsToObserve.forEach(el => {
      // Handle existing aria-hidden attributes
      if (el instanceof HTMLElement && el.getAttribute('aria-hidden') === 'true') {
        el.removeAttribute('aria-hidden');
        el.setAttribute('inert', '');
      }
      
      // Watch for future changes
      observer.observe(el, { attributes: true });
    });

    // Also observe for new ion-page elements that may be added later
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              const newPages = node.querySelectorAll('.ion-page');
              newPages.forEach(page => {
                if (page instanceof HTMLElement) {
                  // Handle existing aria-hidden
                  if (page.getAttribute('aria-hidden') === 'true') {
                    page.removeAttribute('aria-hidden');
                    page.setAttribute('inert', '');
                  }
                  
                  // Observe for future changes
                  observer.observe(page, { attributes: true });
                }
              });
            }
          });
        }
      });
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Prevents iOS zoom behavior on double tap
 * This prevents the app from zooming when users double tap on interactive elements
 */
export function preventIOSZoom() {
  // Add meta tag to prevent zooming
  const viewportMetaTag = document.querySelector('meta[name="viewport"]');
  
  if (viewportMetaTag) {
    // Update existing viewport meta tag to include maximum-scale and user-scalable properties
    viewportMetaTag.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  } else {
    // Create new viewport meta tag if it doesn't exist
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }
  
  // Prevent touchend events from triggering zoom
  document.addEventListener('touchend', (event) => {
    // Prevent double-tap zoom
    if (event.target) {
      const now = Date.now();
      const lastTouch = (event.target as any)._lastTouch || 0;
      
      if (now - lastTouch < 300) {
        event.preventDefault();
      }
      
      (event.target as any)._lastTouch = now;
    }
  }, false);
  
  // Disable double-tap gesture altogether
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}