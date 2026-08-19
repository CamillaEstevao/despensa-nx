import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function diffDays(dateString, todayString) {
  return Math.round((Date.parse(`${dateString}T12:00:00Z`) - Date.parse(`${todayString}T12:00:00Z`)) / 86400000);
}

function notificationBody(items, alertDays) {
  if (items.length === 1) {
    const item = items[0];
    const nome = item.marca ? `${item.nome} (${item.marca})` : item.nome;
    if (item.days < 0) return `${nome} já venceu.`;
    if (item.days === 0) return `${nome} vence hoje.`;
    if (item.days === 1) return `${nome} vence amanhã.`;
    return `${nome} vence em ${item.days} dias.`;
  }

  const expired = items.filter((p) => p.days < 0).length;
  const today = items.filter((p) => p.days === 0).length;
  const soon = items.filter((p) => p.days > 0 && p.days <= alertDays).length;
  const parts = [];
  if (expired) parts.push(`${expired} vencido${expired > 1 ? "s" : ""}`);
  if (today) parts.push(`${today} vence hoje`);
  if (soon) parts.push(`${soon} próximo${soon > 1 ? "s" : ""} do vencimento`);
  return `Atenção: ${parts.join(", ")}. Abra o app para conferir.`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return res.status(500).json({ error: `Missing env: ${missing.join(", ")}` });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@nexcodestudio.com.br",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = todaySaoPaulo();
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("lar_push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");
  if (subscriptionError) return res.status(500).json({ error: subscriptionError.message });
  if (!subscriptions?.length) return res.status(200).json({ sent: 0, message: "No subscriptions" });

  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];
  const { data: configs, error: configError } = await supabase
    .from("lar_config")
    .select("user_id,dias_alerta")
    .in("user_id", userIds);
  if (configError) return res.status(500).json({ error: configError.message });

  const configByUser = new Map((configs || []).map((c) => [c.user_id, Number(c.dias_alerta || 7)]));
  const maxDays = Math.max(7, ...[...configByUser.values()]);
  const endDate = new Date(`${today}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + maxDays);

  const { data: products, error: productError } = await supabase
    .from("lar_produtos")
    .select("id,user_id,nome,marca,quantidade,vencimento")
    .not("vencimento", "is", null)
    .gt("quantidade", 0)
    .lte("vencimento", endDate.toISOString().slice(0, 10));
  if (productError) return res.status(500).json({ error: productError.message });

  let sent = 0;
  let removed = 0;

  for (const userId of userIds) {
    const alertDays = configByUser.get(userId) || 7;
    const items = (products || [])
      .filter((p) => p.user_id === userId)
      .map((p) => ({ ...p, days: diffDays(p.vencimento, today) }))
      .filter((p) => p.days <= alertDays)
      .sort((a, b) => a.days - b.days);
    if (!items.length) continue;

    const payload = JSON.stringify({
      title: "⚠️ Despensa NX — Vencimentos",
      body: notificationBody(items, alertDays),
      url: "/#/vencimentos",
      tag: `vencimentos-${today}`,
    });

    for (const subscription of subscriptions.filter((s) => s.user_id === userId)) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload);
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase.from("lar_push_subscriptions").delete().eq("id", subscription.id);
          removed += 1;
        } else {
          console.error("Push error", error.statusCode, error.body || error.message);
        }
      }
    }
  }

  return res.status(200).json({ sent, removed, date: today });
}
