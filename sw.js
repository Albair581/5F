self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // Control all pages
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request, { cache: "no-store" }) // Always go to the network
    );
});