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
const DLC_CACHE_NAME = "xp-dlc-v1";
const DLC_FALLBACKS = [
  "https://pub-89620c9706034c37924bd717c0bc6ea7.r2.dev/dlc",
  "https://doit.forthexp.com/wp-content/uploads/xp-dlc",
  "https://app.forthexp.com",
];

// chemx-allow: LIFECYCLE_ORPHANED_LISTENER a service worker's handlers live as long as the worker itself
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isPrunedAsset = url.pathname.startsWith("/img/") || url.pathname.startsWith("/media/");
  if (!isPrunedAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(DLC_CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      try {
        const localResponse = await fetch(event.request);
        const isLocalOk = Boolean(localResponse && localResponse.ok);
        if (isLocalOk) return localResponse;
      } catch {
        // Local asset missing from APK, proceed to remote fallback
      }

      for (const base of DLC_FALLBACKS) {
        try {
          const remoteUrl = `${base}${url.pathname}`;
          const remoteResponse = await fetch(remoteUrl, { mode: "cors" });
          const isRemoteOk = Boolean(remoteResponse && remoteResponse.ok);
          if (isRemoteOk) {
            cache.put(event.request, remoteResponse.clone());
            return remoteResponse;
          }
        } catch {
          // Continue to next fallback
        }
      }

      return new Response("DLC Asset Not Found", { status: 404 });
    })()
  );
});
