export const DIAS_ALERTA_PADRAO = 7;

export function inicioDoDia(valor = new Date()) {
  const data = valor instanceof Date ? new Date(valor) : new Date(valor);
  data.setHours(0, 0, 0, 0);
  return data;
}

export function diasParaVencer(vencimento) {
  if (!vencimento) return null;

  const hoje = inicioDoDia();
  const dataVencimento = inicioDoDia(`${vencimento}T12:00:00`);
  const diff = dataVencimento.getTime() - hoje.getTime();

  return Math.round(diff / 86400000);
}

export function formatarDataBR(vencimento) {
  if (!vencimento) return "Sem vencimento";

  return new Date(`${vencimento}T12:00:00`).toLocaleDateString("pt-BR");
}

export function statusVencimento(vencimento, diasAlerta = DIAS_ALERTA_PADRAO) {
  if (!vencimento) {
    return {
      chave: "sem-data",
      texto: "Sem vencimento informado",
      dias: null,
      corTexto: "text-gray-500",
      corFundo: "bg-gray-100",
      corBorda: "border-gray-200",
    };
  }

  const dias = diasParaVencer(vencimento);

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      chave: "vencido",
      texto: atraso === 1 ? "Venceu há 1 dia" : `Venceu há ${atraso} dias`,
      dias,
      corTexto: "text-red-700",
      corFundo: "bg-red-50",
      corBorda: "border-red-200",
    };
  }

  if (dias === 0) {
    return {
      chave: "hoje",
      texto: "Vence hoje",
      dias,
      corTexto: "text-red-700",
      corFundo: "bg-red-50",
      corBorda: "border-red-200",
    };
  }

  if (dias <= diasAlerta) {
    return {
      chave: "proximo",
      texto: dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias`,
      dias,
      corTexto: "text-orange-700",
      corFundo: "bg-orange-50",
      corBorda: "border-orange-200",
    };
  }

  return {
    chave: "ok",
    texto: `Vence em ${dias} dias`,
    dias,
    corTexto: "text-blue-700",
    corFundo: "bg-blue-50",
    corBorda: "border-blue-200",
  };
}

export function diasAlertaSalvos() {
  const salvo = Number(localStorage.getItem("despensa_nx_dias_alerta"));
  return Number.isFinite(salvo) && salvo >= 1 ? salvo : DIAS_ALERTA_PADRAO;
}

export function rotuloUnidade(unidade, quantidade = 0) {
  const plural = Number(quantidade) !== 1;

  const mapa = {
    unidade: plural ? "unidades" : "unidade",
    pacote: plural ? "pacotes" : "pacote",
    kit: plural ? "kits" : "kit",
    kg: "kg",
    g: "g",
    litro: plural ? "litros" : "litro",
    ml: "ml",
    caixa: plural ? "caixas" : "caixa",
    duzia: plural ? "dúzias" : "dúzia",
  };

  return mapa[unidade] || unidade || "unidade";
}

export function formatarQuantidade(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
