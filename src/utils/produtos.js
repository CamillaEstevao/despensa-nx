export function chaveProduto(nome = "") {
  return String(nome)
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Compatibilidade: a versão atual usa `quantidade`, mas esta função também
// entende nomes usados em versões intermediárias para não exibir saldo zerado
// por engano durante migrações.
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

export function agruparProdutos(lotes = []) {
  const mapa = new Map();

  for (const lote of lotes) {
    const chave = chaveProduto(lote.nome);
    if (!chave) continue;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        nome: lote.nome,
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
    const lotesAtivos = grupo.lotes.filter((lote) => quantidadeRestante(lote) > 0);
    const lotesHistorico = grupo.lotes.filter((lote) => quantidadeRestante(lote) <= 0);
    const marcas = [...new Set(lotesAtivos.map((l) => l.marca).filter(Boolean))];
    const estoquePorUnidade = new Map();

    for (const lote of lotesAtivos) {
      const unidade = lote.unidade_medida || "unidade";
      estoquePorUnidade.set(unidade, (estoquePorUnidade.get(unidade) || 0) + quantidadeRestante(lote));
    }

    const proximosComData = lotesAtivos
      .filter((l) => l.vencimento)
      .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));

    return {
      ...grupo,
      lotesAtivos,
      lotesHistorico,
      marcas,
      totalLotes: grupo.lotes.length,
      totalLotesAtivos: lotesAtivos.length,
      totalHistorico: lotesHistorico.length,
      estoquePorUnidade: [...estoquePorUnidade.entries()].map(([unidade_medida, quantidade]) => ({ unidade_medida, quantidade })),
      proximoVencimento: proximosComData[0]?.vencimento || null,
    };
  });
}

export function gruposParaCompra(lotes = []) {
  const mapa = new Map();

  for (const lote of lotes) {
    const chave = `${chaveProduto(lote.nome)}::${lote.unidade_medida || "unidade"}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        nome: lote.nome,
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
