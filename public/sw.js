// Minimal service worker — installability only, no offline caching yet.
// A caching/offline strategy is a deliberate future decision (see
// docs/technical-recommendations.md): a naive cache here could serve stale
// prices/stock on an e-commerce site if done carelessly.

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// No `fetch` handler: all requests continue to hit the network normally.
