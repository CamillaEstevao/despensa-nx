import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || "Você tem um alerta na Despensa NX." };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Despensa NX", {
      body: data.body || "Há produtos próximos do vencimento.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "despensa-nx-vencimentos",
      renotify: true,
      data: { url: data.url || "/#/vencimentos" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/#/vencimentos";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    }),
  );
});
