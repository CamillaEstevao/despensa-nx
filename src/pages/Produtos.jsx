import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Image,
  Package,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import BottomMenu from "../components/BottomMenu";
import { supabase } from "../services/supabase";
import { agruparProdutos } from "../utils/produtos";
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

function hojeISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default function Produtos() {
  const [lotes, setLotes] = useState([]);
  const [abertos, setAbertos] = useState([]);
  const [abrirForm, setAbrirForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");

  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [quantidadeOriginal, setQuantidadeOriginal] = useState("");
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

  function tratarCodigoLido(codigo) {
    pararScanner();
    setEscaneando(false);
    const encontrado = lotes.find((lote) => String(lote.codigo_barras || "") === String(codigo));
    limparForm(false);
    if (encontrado) {
      setNome(encontrado.nome || "");
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
    setNome(""); setMarca(""); setCodigoBarras(""); setQuantidadeOriginal(""); setQuantidadeAtual("");
    setUnidadeMedida("unidade"); setCategoria("Despensa"); setVencimento(""); setDataCompra(hojeISO());
    setEstoqueMinimo("1"); setObservacao(""); setFoto(""); setArquivo(null); setPreview(""); setEditando(null); setSalvando(false);
    if (fechar) setAbrirForm(false);
  }

  function abrirNovaEntrada(grupo = null) {
    limparForm(false);
    if (grupo) {
      const referencia = grupo.lotes[0];
      setNome(grupo.nome || "");
      setCategoria(referencia?.categoria || "Despensa");
      setUnidadeMedida(referencia?.unidade_medida || "unidade");
      setEstoqueMinimo(String(referencia?.estoque_minimo ?? 1));
      setFoto(referencia?.foto || "");
      setPreview(referencia?.foto || "");
    }
    setAbrirForm(true);
  }

  function editarLote(lote) {
    setEditando(lote);
    setNome(lote.nome || ""); setMarca(lote.marca || ""); setCodigoBarras(lote.codigo_barras || "");
    setQuantidadeOriginal(String(lote.quantidade_original ?? lote.quantidade ?? ""));
    setQuantidadeAtual(String(lote.quantidade ?? "")); setUnidadeMedida(lote.unidade_medida || "unidade");
    setCategoria(lote.categoria || "Despensa"); setVencimento(lote.vencimento || "");
    setDataCompra(lote.data_compra || String(lote.created_at || "").slice(0, 10) || hojeISO());
    setEstoqueMinimo(String(lote.estoque_minimo ?? 1)); setObservacao(lote.observacao || "");
    setFoto(lote.foto || ""); setPreview(lote.foto || ""); setArquivo(null); setAbrirForm(true);
  }

  async function salvarEntrada() {
    if (!nome.trim()) return alert("Digite o nome do produto.");
    if (quantidadeAtual === "" || Number(quantidadeAtual) < 0) return alert("Informe a quantidade que ainda resta.");
    if (quantidadeOriginal === "" || Number(quantidadeOriginal) < 0) return alert("Informe a quantidade comprada.");
    setSalvando(true);

    try {
      const fotoFinal = await enviarFoto();
      const payload = {
        nome: nome.trim(), marca: marca.trim() || null, codigo_barras: codigoBarras.trim() || null,
        quantidade: Number(quantidadeAtual || 0), quantidade_original: Number(quantidadeOriginal || 0),
        unidade_medida: unidadeMedida, categoria, vencimento: vencimento || null, data_compra: dataCompra || hojeISO(),
        estoque_minimo: Number(estoqueMinimo || 0), observacao: observacao.trim() || null,
        foto: fotoFinal || foto || null, updated_at: new Date().toISOString(),
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
      alert(`Não foi possível salvar: ${error.message}\n\nSe o erro citar quantidade_original ou data_compra, execute o arquivo supabase_lotes_setup.sql no Supabase.`);
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
    if (!confirm("Deseja excluir esta entrada/compra?")) return;
    const { error } = await supabase.from("lar_produtos").delete().eq("id", id);
    if (error) return alert(error.message);
    setLotes((lista) => lista.filter((lote) => lote.id !== id));
  }

  function alternarGrupo(chave) {
    setAbertos((atual) => atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]);
  }

  const grupos = agruparProdutos(lotes)
    .filter((grupo) => {
      const termo = busca.trim().toLowerCase();
      const texto = `${grupo.nome} ${grupo.marcas.join(" ")}`.toLowerCase();
      const categoriaOk = categoriaFiltro === "Todos" || grupo.lotes.some((l) => l.categoria === categoriaFiltro);
      return texto.includes(termo) && categoriaOk;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const categoriasFiltro = ["Todos", ...CATEGORIAS];

  return (
    <div className="min-h-screen bg-[#F7F7FC] pb-28">
      <header className="rounded-b-[34px] bg-[#5B5CE2] p-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Package size={30} /></div>
          <div>
            <p className="text-sm text-white/70">Despensa NX</p>
            <h1 className="text-3xl font-bold">Produtos</h1>
            <p className="text-sm text-white/70">{agruparProdutos(lotes).length} produtos • {lotes.length} entradas</p>
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
              const lotesAtivos = grupo.lotes.filter((l) => Number(l.quantidade || 0) > 0);
              return (
                <article key={grupo.chave} className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                  <button onClick={() => alternarGrupo(grupo.chave)} className="flex w-full items-center gap-4 p-4 text-left">
                    <img src={grupo.foto || "/favicon.svg"} alt={grupo.nome} className="h-20 w-20 rounded-2xl bg-gray-100 object-cover" />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xl font-bold">{grupo.nome}</h2>
                      <p className="truncate text-sm text-[#5B5CE2]">{grupo.marcas.length ? grupo.marcas.join(" • ") : "Sem marca"}</p>
                      <p className="mt-1 text-xs text-gray-500">{lotesAtivos.length} entrada(s) com estoque • {grupo.totalLotes} no histórico</p>
                    </div>
                    {expandido ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </button>

                  {expandido && (
                    <div className="border-t bg-[#FAFAFE] p-3">
                      <button onClick={() => abrirNovaEntrada(grupo)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B5CE2] p-3 font-bold text-white"><Plus size={18} /> Nova compra deste produto</button>
                      <div className="space-y-3">
                        {grupo.lotes.map((lote) => {
                          const status = statusVencimento(lote.vencimento, diasAlerta);
                          const original = Number(lote.quantidade_original ?? lote.quantidade ?? 0);
                          const atual = Number(lote.quantidade || 0);
                          return (
                            <div key={lote.id} className="rounded-2xl border bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold">{lote.marca || "Sem marca"}</p>
                                  <p className="text-xs text-gray-500">Comprado em {formatarDataBR(lote.data_compra || String(lote.created_at || "").slice(0, 10))}</p>
                                </div>
                                <span className="rounded-full bg-[#EEEFFF] px-3 py-1 text-xs font-bold text-[#4A4BCB]">Entrada #{lote.id}</span>
                              </div>

                              <div className="mt-3 rounded-2xl bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">Quantidade restante</p>
                                <p className="text-xl font-bold text-[#4A4BCB]">{formatarQuantidade(atual)} {rotuloUnidade(lote.unidade_medida, atual)} <span className="text-sm font-normal text-gray-400">de {formatarQuantidade(original)}</span></p>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <button onClick={() => atualizarQuantidade(lote, atual / 2)} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">Metade</button>
                                  <button onClick={() => atualizarQuantidade(lote, Math.max(0, atual - 1))} className="rounded-xl border bg-white p-2 text-xs font-bold text-gray-600">− 1</button>
                                  <button onClick={() => atualizarQuantidade(lote, 0)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-xs font-bold text-red-600">Acabou</button>
                                </div>
                              </div>

                              <div className={`mt-3 rounded-2xl border p-3 ${status.corFundo} ${status.corBorda}`}>
                                <p className="text-xs text-gray-500">Vencimento: {formatarDataBR(lote.vencimento)}</p>
                                <p className={`font-bold ${status.corTexto}`}>{status.texto}</p>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button onClick={() => editarLote(lote)} className="flex items-center justify-center gap-2 rounded-xl border p-2 font-bold text-[#5B5CE2]"><Pencil size={16} /> Editar</button>
                                <button onClick={() => excluirLote(lote.id)} className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 p-2 font-bold text-red-500"><Trash2 size={16} /> Excluir</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
            <p className="mt-3 text-center text-sm text-gray-500">Se o código já existir, os dados do produto serão preenchidos e uma nova entrada será criada.</p>
          </div>
        </div>
      )}

      {abrirForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{editando ? "Editar entrada" : "Nova compra / entrada"}</h2><p className="text-sm text-gray-500">Cada compra fica separada por marca e vencimento.</p></div>
              <button onClick={() => limparForm()}><X /></button>
            </div>

            <div className="space-y-3">
              {preview && <img src={preview} alt="Prévia" className="h-44 w-full rounded-2xl bg-gray-100 object-cover" />}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 font-semibold"><Camera size={20} /> Câmera<input type="file" accept="image/*" capture="environment" hidden onChange={selecionarFoto} /></label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 font-semibold"><Image size={20} /> Galeria<input type="file" accept="image/*" hidden onChange={selecionarFoto} /></label>
              </div>

              <div><label className="mb-1 block text-sm font-bold text-gray-600">Produto *</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Arroz" className="w-full rounded-xl border p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold text-gray-600">Marca</label><input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex.: Camil" className="w-full rounded-xl border p-3" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Data da compra</label><input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="w-full rounded-xl border p-3" /></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Vencimento</label><input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Qtd. comprada *</label><input type="number" step="any" min="0" value={quantidadeOriginal} onChange={(e) => { setQuantidadeOriginal(e.target.value); if (!editando) setQuantidadeAtual(e.target.value); }} placeholder="Ex.: 5" className="w-full rounded-xl border p-3" /></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Qtd. que resta *</label><input type="number" step="any" min="0" value={quantidadeAtual} onChange={(e) => setQuantidadeAtual(e.target.value)} placeholder="Ex.: 2,5" className="w-full rounded-xl border p-3" /></div>
              </div>

              <div><label className="mb-1 block text-sm font-bold text-gray-600">Unidade</label><select value={unidadeMedida} onChange={(e) => setUnidadeMedida(e.target.value)} className="w-full rounded-xl border p-3">{UNIDADES.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Categoria</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl border p-3">{CATEGORIAS.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-bold text-gray-600">Estoque mínimo</label><input type="number" step="any" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-bold text-gray-600">Código de barras</label><input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="w-full rounded-xl border p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold text-gray-600">Observação</label><textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: pacote já aberto" className="min-h-20 w-full rounded-xl border p-3" /></div>

              <button onClick={salvarEntrada} disabled={salvando} className="w-full rounded-2xl bg-[#5B5CE2] p-4 font-bold text-white disabled:opacity-50">{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar entrada"}</button>
            </div>
          </div>
        </div>
      )}

      <BottomMenu />
    </div>
  );
}
