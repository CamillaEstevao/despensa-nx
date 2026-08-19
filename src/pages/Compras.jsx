import { useEffect, useMemo, useState } from "react";
import { CheckCircle, MessageCircle, ShoppingCart } from "lucide-react";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import { gruposParaCompra } from "../utils/produtos";
import { formatarQuantidade, rotuloUnidade } from "../utils/vencimento";

export default function Compras() {
  const [lotes, setLotes] = useState([]);
  const [marcados, setMarcados] = useState([]);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("lar_produtos")
        .select("*")
        .order("nome", { ascending: true });
      if (!error) setLotes(data || []);
    }
    carregar();
  }, []);

  const lista = useMemo(
    () => gruposParaCompra(lotes).filter((g) => g.quantidade <= g.estoque_minimo),
    [lotes],
  );

  function alternarMarcado(chave) {
    setMarcados((atual) => atual.includes(chave) ? atual.filter((item) => item !== chave) : [...atual, chave]);
  }

  function compartilharWhatsApp() {
    if (!lista.length) return;
    const linhas = lista.map((item) => {
      const qtd = item.comprar > 0 ? item.comprar : 1;
      return `• ${item.nome} — comprar ${formatarQuantidade(qtd)} ${rotuloUnidade(item.unidade_medida, qtd)}`;
    });
    const texto = encodeURIComponent(`🛒 Lista de compras — Despensa NX\n\n${linhas.join("\n")}\n\nTotal: ${lista.length} item(ns)`);
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><ShoppingCart size={30} /></div>
          <div>
            <p className="text-sm text-white/70">Despensa NX</p>
            <h1 className="text-3xl font-bold">Compras</h1>
            <p className="text-sm text-white/70">{lista.length} produto(s) abaixo do mínimo</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {lista.length > 0 && (
          <button onClick={compartilharWhatsApp} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] p-4 font-bold text-white shadow">
            <MessageCircle /> Enviar lista pelo WhatsApp
          </button>
        )}

        {lista.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <CheckCircle className="mx-auto mb-3 text-[#5B5CE2]" size={44} />
            <h2 className="text-xl font-bold">Tudo em dia</h2>
            <p className="text-gray-500">Nenhum produto está abaixo da quantidade mínima.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((item) => {
              const marcado = marcados.includes(item.chave);
              return (
                <button
                  key={item.chave}
                  onClick={() => alternarMarcado(item.chave)}
                  className={`w-full rounded-3xl border bg-white p-4 text-left shadow-sm ${marcado ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className={`text-lg font-bold ${marcado ? "line-through" : ""}`}>{item.nome}</h2>
                      <p className="text-sm text-gray-500">
                        Em casa: {formatarQuantidade(item.quantidade)} {rotuloUnidade(item.unidade_medida, item.quantidade)}
                      </p>
                      <p className="mt-1 font-bold text-[#5B5CE2]">
                        Comprar: {formatarQuantidade(item.comprar > 0 ? item.comprar : 1)} {rotuloUnidade(item.unidade_medida, item.comprar > 0 ? item.comprar : 1)}
                      </p>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${marcado ? "border-[#5B5CE2] bg-[#5B5CE2] text-white" : "border-gray-200"}`}>
                      {marcado && <CheckCircle size={20} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <BottomMenu />
    </div>
  );
}
