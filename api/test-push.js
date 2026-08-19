import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return res.status(500).json({ error: `Missing env: ${missing.join(", ")}` });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sessão não encontrada. Faça login novamente." });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("lar_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", authData.user.id);

  if (subscriptionError) return res.status(500).json({ error: subscriptionError.message });
  if (!subscriptions?.length) return res.status(404).json({ error: "Nenhum celular está registrado para receber alertas." });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@nexcodestudio.com.br",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const payload = JSON.stringify({
    title: "🔔 Despensa NX — Teste",
    body: "Funcionou! Seu celular está pronto para receber alertas de vencimento mesmo com o app fechado.",
    url: "/#/vencimentos",
    tag: `teste-push-${Date.now()}`,
  });

  let sent = 0;
  let removed = 0;
  let lastError = null;

  for (const subscription of subscriptions) {
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
        lastError = error.body || error.message || "Falha ao enviar push.";
        console.error("Test push error", error.statusCode, lastError);
      }
    }
  }

  if (!sent) {
    return res.status(500).json({
      error: lastError || "Não foi possível enviar a notificação. Desative e ative os alertas novamente.",
      removed,
    });
  }

  return res.status(200).json({ sent, removed });
}
