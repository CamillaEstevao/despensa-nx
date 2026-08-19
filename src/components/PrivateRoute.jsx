import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function PrivateRoute({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();

      setSessao(data.session);
      setCarregando(false);
    }

    verificarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessao(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#102d5c] text-white font-bold">
        Carregando...
      </div>
    );
  }

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
