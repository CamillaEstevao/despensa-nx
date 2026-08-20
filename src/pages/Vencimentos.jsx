import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarDays, Search } from "lucide-react";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import { nomePrincipal, descricaoLote } from "../utils/produtos";
import { diasAlertaSalvos, formatarDataBR, formatarQuantidade, rotuloUnidade, statusVencimento } from "../utils/vencimento";

export default function Vencimentos() {
  const [lotes, setLotes] = useState([]);
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const diasAlerta = diasAlertaSalvos();

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase.from("lar_produtos").select("*").not("vencimento", "is", null).gt("quantidade", 0).order("vencimento", { ascending: true });
      if (!error) setLotes(data || []);
    }
    carregar();
  }, []);

  const contagens = useMemo(() => {
    const status = lotes.map((p) => statusVencimento(p.vencimento, diasAlerta).chave);
    return { vencidos: status.filter((s) => s === "vencido").length, proximos: status.filter((s) => ["hoje", "proximo"].includes(s)).length, ok: status.filter((s) => s === "ok").length };
  }, [lotes, diasAlerta]);

  const filtrados = lotes.filter((lote) => {
    const status = statusVencimento(lote.vencimento, diasAlerta).chave;
    const textoOk = `${nomePrincipal(lote)} ${descricaoLote(lote)} ${lote.marca || ""}`.toLowerCase().includes(busca.toLowerCase());
    const filtroOk = filtro === "Todos" || (filtro === "Vencidos" && status === "vencido") || (filtro === "Próximos" && ["hoje", "proximo"].includes(status)) || (filtro === "Em dia" && status === "ok");
    return textoOk && filtroOk;
  });

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><BellRing size={30} /></div><div><p className="text-sm text-white/70">Despensa NX</p><h1 className="text-3xl font-bold">Vencimentos</h1><p className="text-sm text-white/70">Cada entrada é avisada separadamente</p></div></div></header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-red-50 p-3 text-center"><strong className="text-2xl text-red-600">{contagens.vencidos}</strong><p className="text-xs text-red-700">Vencidos</p></div><div className="rounded-2xl bg-orange-50 p-3 text-center"><strong className="text-2xl text-orange-600">{contagens.proximos}</strong><p className="text-xs text-orange-700">Próximos</p></div><div className="rounded-2xl bg-blue-50 p-3 text-center"><strong className="text-2xl text-blue-700">{contagens.ok}</strong><p className="text-xs text-blue-700">Em dia</p></div></div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><Search className="text-gray-400" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou marca..." className="w-full outline-none" /></div>
        <div className="flex gap-2 overflow-x-auto">{["Todos", "Vencidos", "Próximos", "Em dia"].map((item) => <button key={item} onClick={() => setFiltro(item)} className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-bold ${filtro === item ? "bg-[#5B5CE2] text-white" : "bg-white text-gray-600 shadow-sm"}`}>{item}</button>)}</div>
        {filtrados.length === 0 ? <div className="rounded-3xl bg-white p-8 text-center shadow-sm"><CalendarDays className="mx-auto mb-3 text-gray-300" size={44} /><h2 className="font-bold">Nenhuma entrada neste filtro</h2><p className="text-sm text-gray-500">Entradas zeradas não aparecem nos vencimentos.</p></div> : (
          <div className="space-y-3">{filtrados.map((lote) => { const status = statusVencimento(lote.vencimento, diasAlerta); return (
            <article key={lote.id} className={`rounded-3xl border bg-white p-4 shadow-sm ${status.corBorda}`}><div className="flex gap-4"><img src={lote.foto || "/favicon.svg"} alt={nomePrincipal(lote)} className="h-20 w-20 rounded-2xl bg-gray-100 object-cover" /><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{nomePrincipal(lote)}</h2>{descricaoLote(lote) && <p className="truncate text-xs text-gray-500">{descricaoLote(lote)}</p>}<p className="truncate text-sm font-semibold text-[#5B5CE2]">{lote.marca || "Sem marca"}</p><p className="mt-1 text-xs text-gray-500">Restam {formatarQuantidade(lote.quantidade)} {rotuloUnidade(lote.unidade_medida, lote.quantidade)}</p><p className="text-xs text-gray-400">Compra: {formatarDataBR(lote.data_compra || String(lote.created_at || "").slice(0,10))}</p></div></div><div className={`mt-3 rounded-2xl p-3 ${status.corFundo}`}><p className="text-xs text-gray-500">Vencimento</p><div className="flex items-center justify-between gap-3"><strong>{formatarDataBR(lote.vencimento)}</strong><span className={`text-sm font-bold ${status.corTexto}`}>{status.texto}</span></div></div></article>
          ); })}</div>
        )}
      </main><BottomMenu />
    </div>
  );
}
