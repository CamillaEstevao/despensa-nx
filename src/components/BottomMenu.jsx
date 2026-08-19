import { useEffect, useState } from "react";
import { BellRing, Home, Package, Settings, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "../services/supabase";
import { gruposParaCompra } from "../utils/produtos";
import { diasAlertaSalvos, statusVencimento } from "../utils/vencimento";

export default function BottomMenu() {
  const [alertasVencimento, setAlertasVencimento] = useState(0);
  const [alertasCompras, setAlertasCompras] = useState(0);

  useEffect(() => {
    async function carregarBadges() {
      const { data, error } = await supabase.from("lar_produtos").select("id,nome,quantidade,estoque_minimo,unidade_medida,vencimento");
      if (error) return;
      const diasAlerta = diasAlertaSalvos();
      const lotes = data || [];
      setAlertasVencimento(lotes.filter((lote) => Number(lote.quantidade || 0) > 0 && ["vencido", "hoje", "proximo"].includes(statusVencimento(lote.vencimento, diasAlerta).chave)).length);
      setAlertasCompras(gruposParaCompra(lotes).filter((grupo) => grupo.quantidade <= grupo.estoque_minimo).length);
    }
    carregarBadges();
  }, []);

  const menus = [
    { to: "/", label: "Início", icon: Home, end: true },
    { to: "/produtos", label: "Produtos", icon: Package },
    { to: "/vencimentos", label: "Vencimentos", icon: BellRing, badge: alertasVencimento },
    { to: "/compras", label: "Compras", icon: ShoppingCart, badge: alertasCompras },
    { to: "/configuracoes", label: "Ajustes", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
      <div className="mx-auto flex max-w-2xl justify-between rounded-3xl border border-gray-100 bg-white/95 px-2 py-2 shadow-2xl backdrop-blur">
        {menus.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `relative flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 ${isActive ? "bg-[#5B5CE2] text-white shadow-lg" : "text-gray-400 hover:bg-gray-50 hover:text-[#5B5CE2]"}`}>
              {({ isActive }) => <><div className="relative"><Icon size={21} strokeWidth={isActive ? 2.8 : 2.2} />{Number(item.badge || 0) > 0 && <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">{item.badge > 9 ? "9+" : item.badge}</span>}</div><span className="text-[10px] font-bold leading-none">{item.label}</span></>}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
