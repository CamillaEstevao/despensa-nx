import { supabase } from "./supabase";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSuportado() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function obterStatusPush() {
  if (!pushSuportado()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : Notification.permission;
}

export async function ativarPush() {
  if (!pushSuportado()) {
    throw new Error("Este celular/navegador não oferece Push Notifications para este PWA.");
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("A chave VITE_VAPID_PUBLIC_KEY ainda não foi configurada na Vercel.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("A permissão para notificações não foi concedida.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error("Faça login novamente para ativar as notificações.");

  const json = subscription.toJSON();
  const { error } = await supabase.from("lar_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) throw error;
  return subscription;
}

export async function desativarPush() {
  if (!pushSuportado()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from("lar_push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
