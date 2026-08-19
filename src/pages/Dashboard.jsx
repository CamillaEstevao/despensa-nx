import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, ChevronRight, Layers3, Package, Plus, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import { agruparProdutos, gruposParaCompra } from "../utils/produtos";
import { diasAlertaSalvos, formatarDataBR, formatarQuantidade, rotuloUnidade, statusVencimento } from "../utils/vencimento";

export default function Dashboard() {
  const [lotes, setLotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const diasAlerta = diasAlertaSalvos();

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase.from("lar_produtos").select("*").order("vencimento", { ascending: true, nullsFirst: false });
      if (!error) setLotes(data || []);
      setCarregando(false);
    }
    carregar();
  }, []);

  const grupos = useMemo(() => agruparProdutos(lotes), [lotes]);
  const resumo = useMemo(() => {
    const ativos = lotes.filter((p) => Number(p.quantidade || 0) > 0);
    const vencidos = ativos.filter((p) => statusVencimento(p.vencimento, diasAlerta).chave === "vencido");
    const vencemHoje = ativos.filter((p) => statusVencimento(p.vencimento, diasAlerta).chave === "hoje");
    const proximos = ativos.filter((p) => statusVencimento(p.vencimento, diasAlerta).chave === "proximo");
    const comprar = gruposParaCompra(lotes).filter((g) => g.quantidade <= g.estoque_minimo);
    return { vencidos, vencemHoje, proximos, comprar };
  }, [lotes, diasAlerta]);

  const alertasOrdenados = useMemo(() => lotes
    .filter((p) => Number(p.quantidade || 0) > 0 && p.vencimento)
    .filter((p) => ["vencido", "hoje", "proximo"].includes(statusVencimento(p.vencimento, diasAlerta).chave))
    .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento))).slice(0, 5), [lotes, diasAlerta]);

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow">
        <p className="text-sm font-semibold text-white/70">Despensa NX</p>
        <h1 className="mt-1 text-3xl font-bold">Controle da sua casa</h1>
        <p className="mt-2 max-w-md text-sm text-white/80">Cada compra fica separada por marca, quantidade restante e vencimento.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link to="/produtos" className="flex items-center justify-between rounded-2xl bg-white/12 p-4"><div><p className="text-xs text-white/70">Produtos</p><strong className="text-2xl">{grupos.length}</strong></div><Package /></Link>
          <Link to="/produtos" className="flex items-center justify-between rounded-2xl bg-white/12 p-4"><div><p className="text-xs text-white/70">Entradas/lotes</p><strong className="text-2xl">{lotes.length}</strong></div><Layers3 /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle /></div><p className="mt-3 text-sm text-gray-500">Vencidos</p><strong className="text-3xl text-red-600">{resumo.vencidos.length}</strong></div>
          <div className="rounded-3xl bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><CalendarClock /></div><p className="mt-3 text-sm text-gray-500">Próximos</p><strong className="text-3xl text-orange-600">{resumo.vencemHoje.length + resumo.proximos.length}</strong></div>
          <div className="rounded-3xl bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ShoppingCart /></div><p className="mt-3 text-sm text-gray-500">Para comprar</p><strong className="text-3xl">{resumo.comprar.length}</strong></div>
          <div className="rounded-3xl bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><BellRing /></div><p className="mt-3 text-sm text-gray-500">Alertas</p><strong className="text-3xl">{resumo.vencidos.length + resumo.vencemHoje.length + resumo.proximos.length}</strong></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/produtos" className="flex items-center justify-center gap-2 rounded-2xl bg-[#5B5CE2] p-4 font-bold text-white shadow"><Plus size={20} /> Nova compra</Link>
          <Link to="/compras" className="flex items-center justify-center gap-2 rounded-2xl border border-[#5B5CE2]/15 bg-white p-4 font-bold text-[#5B5CE2] shadow-sm"><ShoppingCart size={20} /> Lista</Link>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Vencimentos importantes</h2><p className="text-sm text-gray-500">Somente entradas que ainda têm produto</p></div><Link to="/vencimentos" className="text-[#5B5CE2]"><ChevronRight /></Link></div>
          {carregando ? <p className="py-5 text-center text-gray-400">Carregando...</p> : alertasOrdenados.length === 0 ? <div className="rounded-2xl bg-blue-50 p-4 text-blue-800">Nenhuma entrada próxima do vencimento.</div> : (
            <div className="space-y-3">{alertasOrdenados.map((lote) => { const status = statusVencimento(lote.vencimento, diasAlerta); return (
              <Link key={lote.id} to="/vencimentos" className={`flex items-center gap-3 rounded-2xl border p-3 ${status.corFundo} ${status.corBorda}`}>
                <img src={lote.foto || "/favicon.svg"} alt={lote.nome} className="h-14 w-14 rounded-xl bg-white object-cover" />
                <div className="min-w-0 flex-1"><h3 className="truncate font-bold">{lote.nome}</h3><p className="truncate text-xs text-gray-500">{lote.marca || "Sem marca"} • restam {formatarQuantidade(lote.quantidade)} {rotuloUnidade(lote.unidade_medida, lote.quantidade)}</p><p className={`mt-1 text-sm font-bold ${status.corTexto}`}>{status.texto} • {formatarDataBR(lote.vencimento)}</p></div>
              </Link>); })}</div>
          )}
        </section>
      </main>
      <BottomMenu />
    </div>
  );
}
