import { useEffect, useState } from "react";
import { Bell, BellOff, Home, Info, LogOut, Shield, Smartphone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import { ativarPush, desativarPush, obterStatusPush, pushSuportado } from "../services/push";
import { diasAlertaSalvos } from "../utils/vencimento";

export default function Configuracoes() {
  const navigate = useNavigate();
  const [diasAlerta, setDiasAlerta] = useState(diasAlertaSalvos());
  const [pushStatus, setPushStatus] = useState("loading");
  const [processandoPush, setProcessandoPush] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        const { data } = await supabase.from("lar_config").select("dias_alerta").eq("user_id", user.id).maybeSingle();
        if (data?.dias_alerta) {
          setDiasAlerta(Number(data.dias_alerta));
          localStorage.setItem("despensa_nx_dias_alerta", String(data.dias_alerta));
        }
      }

      try {
        setPushStatus(await obterStatusPush());
      } catch {
        setPushStatus("error");
      }
    }
    carregar();
  }, []);

  async function salvarDias(valor) {
    const dias = Math.max(1, Number(valor || 7));
    setDiasAlerta(dias);
    localStorage.setItem("despensa_nx_dias_alerta", String(dias));

    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    const { error } = await supabase.from("lar_config").upsert({
      user_id: authData.user.id,
      dias_alerta: dias,
      updated_at: new Date().toISOString(),
    });
    if (error) alert("Não foi possível salvar o prazo no servidor. Execute o SQL de notificações no Supabase.");
  }

  async function alternarNotificacoes() {
    setProcessandoPush(true);
    try {
      if (pushStatus === "enabled") {
        await desativarPush();
        setPushStatus("default");
      } else {
        await ativarPush();
        setPushStatus("enabled");
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Despensa NX", {
          body: "Pronto! Agora eu posso avisar sobre vencimentos mesmo com o app fechado.",
          icon: "/icon-192.png",
          tag: "push-ativado",
        });
      }
    } catch (error) {
      alert(error.message || "Não foi possível ativar as notificações.");
      try { setPushStatus(await obterStatusPush()); } catch { setPushStatus("error"); }
    } finally {
      setProcessandoPush(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const indisponivel = !pushSuportado() || pushStatus === "unsupported";
  const bloqueado = pushStatus === "denied";
  const ativo = pushStatus === "enabled";

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow">
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="text-sm text-white/75">Configurações da Despensa NX</p>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Bell /></div>
            <div>
              <h2 className="font-bold">Alerta de vencimento</h2>
              <p className="text-sm text-gray-500">Quantos dias antes você quer ser avisada?</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[3, 7, 15, 30].map((dias) => (
              <button key={dias} onClick={() => salvarDias(dias)} className={`rounded-xl p-3 font-bold ${diasAlerta === dias ? "bg-[#5B5CE2] text-white" : "bg-gray-50 text-gray-600"}`}>
                {dias} dias
              </button>
            ))}
          </div>

          <button
            onClick={alternarNotificacoes}
            disabled={processandoPush || indisponivel || bloqueado}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl p-4 font-bold ${ativo ? "bg-[#EEEFFF] text-[#4A4BCB]" : "bg-[#5B5CE2] text-white"} disabled:opacity-50`}
          >
            {ativo ? <BellOff size={20} /> : <Bell size={20} />}
            {processandoPush ? "Aguarde..." : ativo ? "Desativar alertas no celular" : "Ativar alertas no celular"}
          </button>

          <p className="mt-3 text-xs text-gray-500">
            {ativo && "Ativado. O celular pode receber o aviso diário mesmo com o app fechado."}
            {bloqueado && "As notificações estão bloqueadas nas permissões do navegador/celular."}
            {indisponivel && "Este navegador não oferece Push Notifications para este PWA."}
            {!ativo && !bloqueado && !indisponivel && "Depois de ativar, o app registra este celular para receber os alertas automáticos."}
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b p-4"><User className="text-[#5B5CE2]" /><div><h2 className="font-bold">Usuária</h2><p className="text-sm text-gray-500">Conta protegida pelo Supabase</p></div></div>
          <div className="flex items-center gap-3 border-b p-4"><Smartphone className="text-[#5B5CE2]" /><div><h2 className="font-bold">Aplicativo</h2><p className="text-sm text-gray-500">Despensa NX instalada como PWA</p></div></div>
          <div className="flex items-center gap-3 border-b p-4"><Shield className="text-[#5B5CE2]" /><div><h2 className="font-bold">Separado do Inventário NX</h2><p className="text-sm text-gray-500">Usa tabelas próprias e não altera os produtos do sistema antigo.</p></div></div>
          <div className="flex items-center gap-3 p-4"><Info className="text-[#5B5CE2]" /><div><h2 className="font-bold">Versão</h2><p className="text-sm text-gray-500">1.2.0 • Entradas/lotes + Push</p></div></div>
        </section>

        <section className="rounded-3xl bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#5B5CE2] text-white"><Home size={36} /></div>
          <h2 className="text-2xl font-bold text-[#4A4BCB]">Despensa NX</h2>
          <p className="text-gray-500">Controle doméstico de estoque, compras e vencimentos</p>
          <div className="mt-5 text-sm text-gray-500"><p>Desenvolvido por</p><p className="font-bold text-[#4A4BCB]">NexCode Studio</p><p>nexcodestudio.com.br</p></div>
        </section>

        <button onClick={sair} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 p-4 font-bold text-red-600"><LogOut /> Sair da conta</button>
      </main>

      <BottomMenu />
    </div>
  );
}
