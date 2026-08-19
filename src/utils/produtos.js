export function chaveProduto(nome = "") {
  return String(nome)
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    const lotesAtivos = grupo.lotes.filter((lote) => Number(lote.quantidade || 0) > 0);
    const marcas = [...new Set(grupo.lotes.map((l) => l.marca).filter(Boolean))];
    return {
      ...grupo,
      lotesAtivos,
      marcas,
      totalLotes: grupo.lotes.length,
      totalLotesAtivos: lotesAtivos.length,
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
    grupo.quantidade += Number(lote.quantidade || 0);
    grupo.estoque_minimo = Math.max(grupo.estoque_minimo, Number(lote.estoque_minimo || 0));
    if (lote.marca) grupo.marcas.add(lote.marca);
    grupo.lotes.push(lote);
  }

  return [...mapa.values()].map((grupo) => ({
    ...grupo,
    marcas: [...grupo.marcas],
    comprar: Math.max(0, grupo.estoque_minimo - grupo.quantidade),
  }));
}
