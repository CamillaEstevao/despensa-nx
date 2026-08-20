export function chaveProduto(nome = "") {
  return String(nome)
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nomePrincipal(lote = {}) {
  return String(lote.produto_base || lote.nome || "").trim();
}

export function descricaoLote(lote = {}) {
  const principal = nomePrincipal(lote);
  const descricao = String(lote.nome || "").trim();
  return descricao && chaveProduto(descricao) !== chaveProduto(principal) ? descricao : "";
}

// Compatibilidade com versões anteriores do app.
export function quantidadeRestante(lote = {}) {
  const candidatos = [lote.quantidade, lote.quantidade_restante, lote.quantidade_atual];
  for (const valor of candidatos) {
    if (valor !== null && valor !== undefined && valor !== "") {
      const numero = Number(valor);
      if (Number.isFinite(numero)) return Math.max(0, numero);
    }
  }
  return 0;
}

export function quantidadeOriginal(lote = {}) {
  const valor = lote.quantidade_original ?? lote.quantidade_comprada ?? quantidadeRestante(lote);
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

function compararValidade(a, b) {
  const va = a.vencimento || "9999-12-31";
  const vb = b.vencimento || "9999-12-31";
  const cmp = String(va).localeCompare(String(vb));
  if (cmp !== 0) return cmp;
  return String(a.data_compra || a.created_at || "").localeCompare(String(b.data_compra || b.created_at || ""));
}

export function agruparProdutos(lotes = []) {
  const mapa = new Map();

  for (const lote of lotes) {
    const principal = nomePrincipal(lote);
    const chave = chaveProduto(principal);
    if (!chave) continue;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        nome: principal,
        categoria: lote.categoria,
        foto: lote.foto,
        lotes: [],
      });
    }

    const grupo = mapa.get(chave);
    grupo.lotes.push(lote);
    if (!grupo.foto && lote.foto) grupo.foto = lote.foto;
  }

  return [...mapa.values()].map((grupo) => {
    const lotesAtivos = grupo.lotes.filter((lote) => quantidadeRestante(lote) > 0).sort(compararValidade);
    const lotesHistorico = grupo.lotes.filter((lote) => quantidadeRestante(lote) <= 0)
      .sort((a, b) => String(b.data_compra || b.created_at || "").localeCompare(String(a.data_compra || a.created_at || "")));
    const marcas = [...new Set(lotesAtivos.map((l) => l.marca).filter(Boolean))];
    const estoquePorUnidade = new Map();

    for (const lote of lotesAtivos) {
      const unidade = lote.unidade_medida || "unidade";
      estoquePorUnidade.set(unidade, (estoquePorUnidade.get(unidade) || 0) + quantidadeRestante(lote));
    }

    return {
      ...grupo,
      lotesAtivos,
      lotesHistorico,
      marcas,
      totalLotes: grupo.lotes.length,
      totalLotesAtivos: lotesAtivos.length,
      totalHistorico: lotesHistorico.length,
      estoquePorUnidade: [...estoquePorUnidade.entries()].map(([unidade_medida, quantidade]) => ({ unidade_medida, quantidade })),
      proximoVencimento: lotesAtivos.find((l) => l.vencimento)?.vencimento || null,
      loteUsarPrimeiroId: lotesAtivos.find((l) => l.vencimento)?.id || null,
    };
  });
}

export function gruposParaCompra(lotes = []) {
  const mapa = new Map();

  for (const lote of lotes) {
    const principal = nomePrincipal(lote);
    const chave = `${chaveProduto(principal)}::${lote.unidade_medida || "unidade"}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        nome: principal,
        unidade_medida: lote.unidade_medida || "unidade",
        estoque_minimo: 0,
        quantidade: 0,
        marcas: new Set(),
        lotes: [],
      });
    }

    const grupo = mapa.get(chave);
    grupo.quantidade += quantidadeRestante(lote);
    grupo.estoque_minimo = Math.max(grupo.estoque_minimo, Number(lote.estoque_minimo || 0));
    if (lote.marca && quantidadeRestante(lote) > 0) grupo.marcas.add(lote.marca);
    grupo.lotes.push(lote);
  }

  return [...mapa.values()].map((grupo) => ({
    ...grupo,
    marcas: [...grupo.marcas],
    comprar: Math.max(0, grupo.estoque_minimo - grupo.quantidade),
  }));
}

const PALAVRAS_EMBALAGEM = new Set([
  "bandeja", "pacote", "caixa", "lata", "garrafa", "pote", "saco", "sache", "unidade", "kit",
  "de", "da", "do", "das", "dos", "com", "sem", "tipo", "marca"
]);

export function similaridadeProduto(a = "", b = "") {
  const tokens = (texto) => chaveProduto(texto)
    .split(" ")
    .filter((t) => t.length > 2 && !PALAVRAS_EMBALAGEM.has(t));
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const token of ta) if (tb.has(token)) inter += 1;
  return inter / Math.min(ta.size, tb.size);
}
