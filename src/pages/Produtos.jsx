import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Camera,
  ChevronDown,
  ChevronUp,
  Image,
  Layers3,
  Link2,
  Package,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import {
  agruparProdutos,
  descricaoLote,
  quantidadeOriginal,
  quantidadeRestante,
  similaridadeProduto,
} from "../utils/produtos";
import {
  diasAlertaSalvos,
  formatarDataBR,
  formatarQuantidade,
  rotuloUnidade,
  statusVencimento,
} from "../utils/vencimento";

const CATEGORIAS = ["Despensa", "Geladeira", "Freezer", "Bebidas", "Higiene", "Limpeza", "Outros"];
const UNIDADES = [
  ["unidade", "Unidade"], ["pacote", "Pacote"], ["kit", "Kit"], ["kg", "Kg"],
  ["g", "Gramas"], ["litro", "Litro"], ["ml", "mL"], ["caixa", "Caixa"], ["duzia", "Dúzia"],
];
const UNIDADES_INTEIRAS = new Set(["unidade", "kit", "caixa", "duzia"]);

function passoQuantidade(unidade) {
  if (unidade === "g") return 50;
  if (unidade === "ml") return 100;
  if (unidade === "kg" || unidade === "litro") return 0.1;
  if (unidade === "pacote") return 0.5;
  return 1;
}

function hojeISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function resumoEstoque(grupo) {
  if (!grupo.estoquePorUnidade?.length) return "Sem estoque";
  return grupo.estoquePorUnidade
    .map(({ quantidade, unidade_medida }) => `${formatarQuantidade(quantidade)} ${rotuloUnidade(unidade_medida, quantidade)}`)
    .join(" + ");
}

export default function Produtos() {
  const [lotes, setLotes] = useState([]);
  const [abertos, setAbertos] = useState([]);
  const [historicosAbertos, setHistoricosAbertos] = useState([]);
  const [abrirForm, setAbrirForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");

  const [produtoBase, setProdutoBase] = useState("");
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [quantidadeOriginalForm, setQuantidadeOriginalForm] = useState("");
  const [quantidadeAtual, setQuantidadeAtual] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("unidade");
  const [categoria, setCategoria] = useState("Despensa");
  const [vencimento, setVencimento] = useState("");
  const [dataCompra, setDataCompra] = useState(hojeISO());
  const [estoqueMinimo, setEstoqueMinimo] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState("");

  const [grupoOrganizando, setGrupoOrganizando] = useState(null);
  const [grupoDestinoChave, setGrupoDestinoChave] = useState("");
  const [nomeFinalAgrupado, setNomeFinalAgrupado] = useState("");
  const [salvandoAgrupamento, setSalvandoAgrupamento] = useState(false);

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const diasAlerta = diasAlertaSalvos();

  async function buscarProdutos() {
    const { data, error } = await supabase.from("lar_produtos").select("*").order("created_at", { ascending: false });
    if (error) return alert(`Erro ao carregar produtos: ${error.message}`);
    setLotes(data || []);
  }

  useEffect(() => { buscarProdutos(); }, []);

  useEffect(() => {
    if (!escaneando) return;
    async function iniciarScanner() {
      try {
        const leitor = new BrowserMultiFormatReader();
        scannerRef.current = await leitor.decodeFromVideoDevice(undefined, videoRef.current, (resultado) => {
          if (resultado) tratarCodigoLido(resultado.getText());
        });
      } catch (error) {
        console.log(error);
        alert("Não foi possível abrir a câmera.");
        setEscaneando(false);
      }
    }
    iniciarScanner();
    return () => pararScanner();
  }, [escaneando]);

  function pararScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
  }

  function preencherPeloGrupo(grupo, preencherVariacao = false) {
    const referencia = grupo?.lotesAtivos?.[0] || grupo?.lotes?.[0];
    if (!grupo || !referencia) return;
    setProdutoBase(grupo.nome || "");
    setNome(preencherVariacao ? descricaoLote(referencia) : "");
    setCategoria(referencia.categoria || "Despensa");
    setUnidadeMedida(referencia.unidade_medida || "unidade");
    setEstoqueMinimo(String(referencia.estoque_minimo ?? 1));
    setFoto(referencia.foto || "");
    setPreview(referencia.foto || "");
  }

  function tratarCodigoLido(codigo) {
    pararScanner();
    setEscaneando(false);
    const encontrado = lotes.find((lote) => String(lote.codigo_barras || "") === String(codigo));
    limparForm(false);
    if (encontrado) {
      setProdutoBase(encontrado.produto_base || encontrado.nome || "");
      setNome(descricaoLote(encontrado));
      setMarca(encontrado.marca || "");
      setCategoria(encontrado.categoria || "Despensa");
      setUnidadeMedida(encontrado.unidade_medida || "unidade");
      setEstoqueMinimo(String(encontrado.estoque_minimo ?? 1));
      setFoto(encontrado.foto || "");
      setPreview(encontrado.foto || "");
    }
    setCodigoBarras(codigo);
    setAbrirForm(true);
  }

  function selecionarFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
  }

  async function enviarFoto() {
    if (!arquivo) return foto || "";
    const extensao = arquivo.name.split(".").pop() || "jpg";
    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`;
    const { error } = await supabase.storage.from("lar-produtos").upload(nomeArquivo, arquivo, { upsert: false, contentType: arquivo.type });
    if (error) throw error;
    return supabase.storage.from("lar-produtos").getPublicUrl(nomeArquivo).data.publicUrl;
  }

  function limparForm(fechar = true) {
    setProdutoBase(""); setNome(""); setMarca(""); setCodigoBarras(""); setQuantidadeOriginalForm(""); setQuantidadeAtual("");
    setUnidadeMedida("unidade"); setCategoria("Despensa"); setVencimento(""); setDataCompra(hojeISO());
    setEstoqueMinimo("1"); setObservacao(""); setFoto(""); setArquivo(null); setPreview(""); setEditando(null); setSalvando(false);
    if (fechar) setAbrirForm(false);
  }

  function abrirNovaEntrada(grupo = null) {
    limparForm(false);
    if (grupo) preencherPeloGrupo(grupo, true);
    setAbrirForm(true);
  }

  function editarLote(lote) {
    setEditando(lote);
    const atual = quantidadeRestante(lote);
    const original = quantidadeOriginal(lote);
    setProdutoBase(lote.produto_base || lote.nome || "");
    setNome(descricaoLote(lote));
    setMarca(lote.marca || ""); setCodigoBarras(lote.codigo_barras || "");
    setQuantidadeOriginalForm(String(original)); setQuantidadeAtual(String(atual));
    setUnidadeMedida(lote.unidade_medida || "unidade"); setCategoria(lote.categoria || "Despensa");
    setVencimento(lote.vencimento || ""); setDataCompra(lote.data_compra || String(lote.created_at || "").slice(0, 10) || hojeISO());
    setEstoqueMinimo(String(lote.estoque_minimo ?? 1)); setObservacao(lote.observacao || "");
    setFoto(lote.foto || ""); setPreview(lote.foto || ""); setArquivo(null); setAbrirForm(true);
  }

  async function salvarEntrada() {
    if (!produtoBase.trim()) return alert("Digite o produto principal.");
    if (quantidadeAtual === "" || Number(quantidadeAtual) < 0) return alert("Informe a quantidade que ainda resta.");
    if (quantidadeOriginalForm === "" || Number(quantidadeOriginalForm) < 0) return alert("Informe a quantidade comprada.");
    setSalvando(true);

    try {
      const fotoFinal = await enviarFoto();
      const nomeLote = nome.trim() || produtoBase.trim();
      const payload = {
        produto_base: produtoBase.trim(),
        nome: nomeLote,
        marca: marca.trim() || null,
        codigo_barras: codigoBarras.trim() || null,
        quantidade: Number(quantidadeAtual || 0),
        quantidade_original: Number(quantidadeOriginalForm || 0),
        unidade_medida: unidadeMedida,
        categoria,
        vencimento: vencimento || null,
        data_compra: dataCompra || hojeISO(),
        estoque_minimo: Number(estoqueMinimo || 0),
        observacao: observacao.trim() || null,
        foto: fotoFinal || foto || null,
        updated_at: new Date().toISOString(),
      };

      if (editando?.id) {
        const { data, error } = await supabase.from("lar_produtos").update(payload).eq("id", editando.id).select("*").single();
        if (error) throw error;
        setLotes((lista) => lista.map((p) => (p.id === data.id ? data : p)));
      } else {
        const { data, error } = await supabase.from("lar_produtos").insert(payload).select("*").single();
        if (error) throw error;
        setLotes((lista) => [data, ...lista]);
      }
      limparForm();
    } catch (error) {
      alert(`Não foi possível salvar: ${error.message}\n\nSe o erro citar produto_base, execute supabase_produto_principal_setup.sql no Supabase.`);
      setSalvando(false);
    }
  }

  async function atualizarQuantidade(lote, novaQuantidade) {
    const valor = Math.max(0, Number(novaQuantidade || 0));
    const { data, error } = await supabase.from("lar_produtos").update({ quantidade: valor, updated_at: new Date().toISOString() }).eq("id", lote.id).select("*").single();
    if (error) return alert(error.message);
    setLotes((lista) => lista.map((item) => item.id === lote.id ? data : item));
  }

  async function excluirLote(id) {
    if (!confirm("Deseja excluir esta compra do histórico?")) return;
    const { error } = await supabase.from("lar_produtos").delete().eq("id", id);
    if (error) return alert(error.message);
    setLotes((lista) => lista.filter((lote) => lote.id !== id));
  }

  function alternarGrupo(chave) {
    setAbertos((atual) => atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]);
  }

  function alternarHistorico(chave) {
    setHistoricosAbertos((atual) => atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]);
  }

  const todosGrupos = useMemo(() => agruparProdutos(lotes), [lotes]);

  const sugestoesProdutos = useMemo(() => {
    const q = produtoBase.trim();
    if (q.length < 2) return [];
    return todosGrupos
      .map((grupo) => {
        const nomeGrupo = grupo.nome.toLocaleLowerCase("pt-BR");
        const buscaLower = q.toLocaleLowerCase("pt-BR");
        const score = nomeGrupo.includes(buscaLower) || buscaLower.includes(nomeGrupo)
          ? 2
          : similaridadeProduto(q, grupo.nome);
        return { grupo, score };
      })
      .filter(({ grupo, score }) => score >= 0.5 && grupo.nome.toLocaleLowerCase("pt-BR") !== q.toLocaleLowerCase("pt-BR"))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ grupo }) => grupo);
  }, [produtoBase, todosGrupos]);

  const grupos = todosGrupos
    .filter((grupo) => {
      const termo = busca.trim().toLowerCase();
      const texto = `${grupo.nome} ${grupo.marcas.join(" ")} ${grupo.lotes.map((l) => `${l.nome || ""} ${l.marca || ""}`).join(" ")}`.toLowerCase();
      const categoriaOk = categoriaFiltro === "Todos" || grupo.lotes.some((l) => l.categoria === categoriaFiltro);
      return texto.includes(termo) && categoriaOk;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const categoriasFiltro = ["Todos", ...CATEGORIAS];

  function abrirOrganizador(grupo) {
    const primeiroDestino = todosGrupos.find((g) => g.chave !== grupo.chave);
    if (!primeiroDestino) return alert("Cadastre outro produto antes de usar o agrupamento.");
    setGrupoOrganizando(grupo);
    setGrupoDestinoChave(primeiroDestino.chave);
    setNomeFinalAgrupado(primeiroDestino.nome);
  }

  function mudarDestinoAgrupamento(chave) {
    setGrupoDestinoChave(chave);
    const destino = todosGrupos.find((g) => g.chave === chave);
    if (destino) setNomeFinalAgrupado(destino.nome);
  }

  async function salvarAgrupamento() {
    const destino = todosGrupos.find((g) => g.chave === grupoDestinoChave);
    const nomeFinal = nomeFinalAgrupado.trim();
    if (!grupoOrganizando || !destino) return;
    if (!nomeFinal) return alert("Digite o nome que ficará no card.");
    setSalvandoAgrupamento(true);
    const ids = [...grupoOrganizando.lotes, ...destino.lotes].map((l) => l.id);
    const { data, error } = await supabase
      .from("lar_produtos")
      .update({ produto_base: nomeFinal, updated_at: new Date().toISOString() })
      .in("id", ids)
      .select("*");
    if (error) {
      setSalvandoAgrupamento(false);
      return alert(`Não foi possível agrupar: ${error.message}`);
    }
    const atualizados = new Map((data || []).map((l) => [l.id, l]));
    setLotes((lista) => lista.map((l) => atualizados.get(l.id) || l));
    setGrupoOrganizando(null);
    setSalvandoAgrupamento(false);
  }

  function renderLote(lote, historico = false, usarPrimeiro = false) {
    const status = statusVencimento(lote.vencimento, diasAlerta);
    const original = quantidadeOriginal(lote);
    const atual = quantidadeRestante(lote);
    const descricao = descricaoLote(lote);
    return (
      <div key={lote.id} className={`rounded-2xl border p-3 ${historico ? "bg-gray-50 opacity-80" : usarPrimeiro ? "border-amber-200 bg-amber-50/40" : "bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">{lote.marca || "Sem marca"}</p>
            {descricao && <p className="truncate text-xs font-semibold text-gray-600">{descricao}</p>}
            <p className="text-xs text-gray-500">Compra de {formatarDataBR(lote.data_compra || String(lote.created_at || "").slice(0, 10))}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${historico ? "bg-gray-200 text-gray-600" : usarPrimeiro ? "bg-amber-100 text-amber-700" : "bg-[#EEEFFF] text-[#4A4BCB]"}`}>
            {historico ? "Finalizado" : usarPrimeiro ? "Usar primeiro" : "Em estoque"}
          </span>
        </div>

        <div className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="text-xs text-gray-500">{historico ? "Quantidade ao finalizar" : "Quantidade restante"}</p>
          <p className="text-xl font-bold text-[#4A4BCB]">
            {formatarQuantidade(atual)} {rotuloUnidade(lote.unidade_medida, atual)}
            <span className="text-sm font-normal text-gray-400"> de {formatarQuantidade(original)}</span>
          </p>
          {!historico && (
            UNIDADES_INTEIRAS.has(lote.unidade_medida) ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={() => atualizarQuantidade(lote, Math.max(0, atual - 1))} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">− 1</button>
                <button onClick={() => atualizarQuantidade(lote, atual + 1)} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">+ 1</button>
                <button onClick={() => atualizarQuantidade(lote, 0)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-xs font-bold text-red-600">Acabou</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-4 gap-2">
                <button onClick={() => atualizarQuantidade(lote, atual / 2)} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">Metade</button>
                <button onClick={() => atualizarQuantidade(lote, Math.max(0, atual - passoQuantidade(lote.unidade_medida)))} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">−</button>
                <button onClick={() => atualizarQuantidade(lote, atual + passoQuantidade(lote.unidade_medida))} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">+</button>
                <button onClick={() => atualizarQuantidade(lote, 0)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-xs font-bold text-red-600">Acabou</button>
              </div>
            )
          )}
        </div>

        {lote.vencimento && (
          <div className={`mt-3 rounded-2xl border p-3 ${status.corFundo} ${status.corBorda}`}>
            <p className="text-xs text-gray-500">Vencimento: {formatarDataBR(lote.vencimento)}</p>
            <p className={`font-bold ${status.corTexto}`}>{status.texto}</p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => editarLote(lote)} className="flex items-center justify-center gap-2 rounded-xl border p-2 font-bold text-[#5B5CE2]"><Pencil size={16} /> Editar</button>
          <button onClick={() => excluirLote(lote.id)} className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 p-2 font-bold text-red-500"><Trash2 size={16} /> Excluir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Package size={30} /></div>
          <div>
            <p className="text-sm text-white/70">Despensa NX</p>
            <h1 className="text-3xl font-bold">Produtos</h1>
            <p className="text-sm text-white/70">{todosGrupos.length} produtos • {lotes.filter((l) => quantidadeRestante(l) > 0).length} compras em estoque</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <Search className="text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou marca..." className="w-full bg-transparent outline-none" />
          </div>
          <button onClick={() => setEscaneando(true)} className="rounded-2xl bg-[#5B5CE2] px-4 text-white shadow"><ScanLine /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoriasFiltro.map((item) => (
            <button key={item} onClick={() => setCategoriaFiltro(item)} className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-bold ${categoriaFiltro === item ? "bg-[#5B5CE2] text-white" : "bg-white text-gray-600 shadow-sm"}`}>{item}</button>
          ))}
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm"><Package className="mx-auto mb-3 text-gray-300" size={44} /><h2 className="font-bold">Nenhum produto</h2><p className="text-sm text-gray-500">Cadastre sua primeira compra.</p></div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => {
              const expandido = abertos.includes(grupo.chave);
              const historicoExpandido = historicosAbertos.includes(grupo.chave);
              return (
                <article key={grupo.chave} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <img src={grupo.foto || "/favicon.svg"} alt={grupo.nome} className="h-20 w-20 rounded-2xl bg-gray-100 object-cover" />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-xl font-bold">{grupo.nome}</h2>
                        <p className="truncate text-sm text-[#5B5CE2]">{grupo.marcas.length ? grupo.marcas.join(" • ") : "Sem marca no estoque atual"}</p>
                        <p className="mt-2 font-bold text-gray-800">Em casa: {resumoEstoque(grupo)}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span>{grupo.totalLotesAtivos} {grupo.totalLotesAtivos === 1 ? "compra ativa" : "compras ativas"}</span>
                          {grupo.proximoVencimento && <span>Próx. venc.: {formatarDataBR(grupo.proximoVencimento)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button onClick={() => alternarGrupo(grupo.chave)} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#5B5CE2] p-3 font-bold text-[#4A4BCB]">
                        <Layers3 size={18} /> {expandido ? "Ocultar estoque" : "Ver estoque"} {expandido ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      </button>
                      <button onClick={() => abrirNovaEntrada(grupo)} className="flex items-center justify-center gap-2 rounded-2xl bg-[#5B5CE2] p-3 font-bold text-white"><Plus size={18} /> Nova compra</button>
                    </div>
                  </div>

                  {expandido && (
                    <div className="border-t bg-[#FAFAFE] p-3">
                      {grupo.lotesAtivos.length > 1 && (
                        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
                          <Sparkles size={17} className="mt-0.5 shrink-0" />
                          <span>As compras estão ordenadas por validade. A marcada como <strong>Usar primeiro</strong> é a que vence antes.</span>
                        </div>
                      )}

                      {grupo.lotesAtivos.length === 0 ? (
                        <div className="rounded-2xl bg-white p-4 text-center text-sm text-gray-500">Nenhuma compra com estoque. Use “Nova compra” para adicionar.</div>
                      ) : (
                        <div className="space-y-3">{grupo.lotesAtivos.map((lote) => renderLote(lote, false, lote.id === grupo.loteUsarPrimeiroId))}</div>
                      )}

                      {todosGrupos.length > 1 && (
                        <button onClick={() => abrirOrganizador(grupo)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#5B5CE2] bg-white p-3 text-sm font-bold text-[#4A4BCB]">
                          <Link2 size={17} /> Unir com outro produto
                        </button>
                      )}

                      {grupo.totalHistorico > 0 && (
                        <div className="mt-3">
                          <button onClick={() => alternarHistorico(grupo.chave)} className="flex w-full items-center justify-between rounded-2xl bg-white p-3 text-left font-bold text-gray-600 shadow-sm">
                            <span className="flex items-center gap-2"><Archive size={18} /> Histórico ({grupo.totalHistorico})</span>
                            {historicoExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          {historicoExpandido && <div className="mt-3 space-y-3">{grupo.lotesHistorico.map((lote) => renderLote(lote, true, false))}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => abrirNovaEntrada()} className="fixed bottom-24 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[#5B5CE2] text-white shadow-xl"><Plus size={32} /></button>

      {escaneando && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-md rounded-3xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Ler código de barras</h2><button onClick={() => { pararScanner(); setEscaneando(false); }}><X /></button></div>
            <video ref={videoRef} className="h-72 w-full rounded-2xl bg-black object-cover" muted playsInline />
            <p className="mt-3 text-center text-sm text-gray-500">Se o código já existir, o produto principal será reconhecido e uma nova compra será criada.</p>
          </div>
        </div>
      )}

      {abrirForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{editando ? "Editar compra" : "Nova compra"}</h2><p className="text-sm text-gray-500">Um produto pode ter várias compras, marcas e validades.</p></div>
              <button onClick={() => limparForm()}><X /></button>
            </div>

            <div className="space-y-3">
              {preview && <img src={preview} alt="Prévia" className="h-44 w-full rounded-2xl bg-gray-100 object-cover" />}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 font-semibold"><Camera size={20} /> Câmera<input type="file" accept="image/*" capture="environment" hidden onChange={selecionarFoto} /></label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 font-semibold"><Image size={20} /> Galeria<input type="file" accept="image/*" hidden onChange={selecionarFoto} /></label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-600">Produto principal *</label>
                <input value={produtoBase} onChange={(e) => setProdutoBase(e.target.value)} placeholder="Ex.: Peito de frango" className="w-full rounded-xl border p-3" />
                <p className="mt-1 text-xs text-gray-400">É o nome que aparecerá no card principal.</p>
                {sugestoesProdutos.length > 0 && !editando && (
                  <div className="mt-2 rounded-2xl border border-[#DCDDFE] bg-[#F7F7FF] p-2">
                    <p className="mb-2 flex items-center gap-1 text-xs font-bold text-[#4A4BCB]"><Sparkles size={14} /> Já existe algo parecido?</p>
                    <div className="space-y-1">
                      {sugestoesProdutos.map((grupo) => (
                        <button key={grupo.chave} type="button" onClick={() => preencherPeloGrupo(grupo, false)} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm shadow-sm">
                          <span className="font-semibold">{grupo.nome}</span><span className="text-xs font-bold text-[#5B5CE2]">Usar este</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-600">Variação / embalagem <span className="font-normal text-gray-400">(opcional)</span></label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Filé em bandeja 1 kg" className="w-full rounded-xl border p-3" />
                <p className="mt-1 text-xs text-gray-400">Use só quando precisar diferenciar a embalagem ou o tipo.</p>
              </div>

              <div><label className="mb-1 block text-sm font-bold text-gray-600">Marca</label><input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex.: Seara" className="w-full rounded-xl border p-3" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Data da compra</label><input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="w-full rounded-xl border p-3" /></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Vencimento</label><input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Qtd. comprada *</label><input type="number" step="any" min="0" value={quantidadeOriginalForm} onChange={(e) => { setQuantidadeOriginalForm(e.target.value); if (!editando) setQuantidadeAtual(e.target.value); }} placeholder="Ex.: 5" className="w-full rounded-xl border p-3" /></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Qtd. que resta *</label><input type="number" step="any" min="0" value={quantidadeAtual} onChange={(e) => setQuantidadeAtual(e.target.value)} placeholder="Ex.: 2,5" className="w-full rounded-xl border p-3" /></div>
              </div>

              <div><label className="mb-1 block text-sm font-bold text-gray-600">Unidade</label><select value={unidadeMedida} onChange={(e) => setUnidadeMedida(e.target.value)} className="w-full rounded-xl border p-3">{UNIDADES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Categoria</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl border p-3">{CATEGORIAS.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Estoque mínimo</label><input type="number" step="any" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-bold text-gray-600">Código de barras</label><input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold text-gray-600">Observação</label><textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Ex.: 1 pacote aberto" className="w-full rounded-xl border p-3" /></div>

              <button onClick={salvarEntrada} disabled={salvando} className="w-full rounded-2xl bg-[#5B5CE2] p-4 font-bold text-white disabled:opacity-50">{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar compra"}</button>
            </div>
          </div>
        </div>
      )}

      {grupoOrganizando && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">Unir produtos</h2><p className="text-sm text-gray-500">Junte nomes diferentes que representam o mesmo alimento.</p></div>
              <button onClick={() => setGrupoOrganizando(null)}><X /></button>
            </div>

            <div className="rounded-2xl bg-[#F7F7FF] p-3 text-sm">
              <span className="text-gray-500">Você está organizando:</span>
              <p className="font-bold text-[#4A4BCB]">{grupoOrganizando.nome}</p>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-bold text-gray-600">Unir com</label>
              <select value={grupoDestinoChave} onChange={(e) => mudarDestinoAgrupamento(e.target.value)} className="w-full rounded-xl border p-3">
                {todosGrupos.filter((g) => g.chave !== grupoOrganizando.chave).map((g) => <option key={g.chave} value={g.chave}>{g.nome}</option>)}
              </select>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-bold text-gray-600">Nome que ficará no card</label>
              <input value={nomeFinalAgrupado} onChange={(e) => setNomeFinalAgrupado(e.target.value)} placeholder="Ex.: Peito de frango" className="w-full rounded-xl border p-3" />
              <p className="mt-1 text-xs text-gray-400">As marcas, quantidades, fotos e validades continuam separadas dentro do estoque.</p>
            </div>

            <button onClick={salvarAgrupamento} disabled={salvandoAgrupamento} className="mt-5 w-full rounded-2xl bg-[#5B5CE2] p-4 font-bold text-white disabled:opacity-50">
              {salvandoAgrupamento ? "Unindo..." : "Unir produtos"}
            </button>
          </div>
        </div>
      )}

      <BottomMenu />
    </div>
  );
}
