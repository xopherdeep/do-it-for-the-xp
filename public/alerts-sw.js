// The hero's alert bell: lets the browser ring an OS notification while the game tab sits in the background,
// and brings the game back when it is tapped. It only does this: no fetch handler, nothing is ever cached.
// chemx-allow: LIFECYCLE_ORPHANED_LISTENER a service worker's handlers live as long as the worker itself
self.addEventListener("install", () => self.skipWaiting());

// chemx-allow: LIFECYCLE_ORPHANED_LISTENER a service worker's handlers live as long as the worker itself
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// chemx-allow: LIFECYCLE_ORPHANED_LISTENER a service worker's handlers live as long as the worker itself
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Prefer a tab of this game (inside the worker's scope), else any open tab, else open the game anew.
      const home = windows.find((client) => client.url.startsWith(self.registration.scope)) || windows[0];
      if (home) return home.focus();
      return self.clients.openWindow(event.notification.data?.url || self.registration.scope);
    })
  );
});
