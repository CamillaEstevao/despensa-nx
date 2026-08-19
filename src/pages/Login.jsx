import { useState } from "react";
import { Home, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();

    if (!email || !senha) {
      alert("Preencha e-mail e senha");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      alert("E-mail ou senha inválidos");
      setCarregando(false);
      return;
    }

    navigate("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5B5CE2] p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#5B5CE2] text-white">
            <Home size={40} />
          </div>
          <h1 className="text-3xl font-bold text-[#5B5CE2]">Despensa NX</h1>
          <p className="mt-1 text-gray-500">Estoque, compras e vencimentos do lar</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Mail className="text-gray-400" />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full outline-none"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Lock className="text-gray-400" />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-[#5B5CE2] p-4 font-bold text-white disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">Powered by NexCode Studio</p>
      </div>
    </div>
  );
}
