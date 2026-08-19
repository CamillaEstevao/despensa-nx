import { HashRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Vencimentos from "./pages/Vencimentos";
import Compras from "./pages/Compras";
import Configuracoes from "./pages/Configuracoes";
import PrivateRoute from "./components/PrivateRoute";

function Protegida({ children }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protegida><Dashboard /></Protegida>} />
        <Route path="/produtos" element={<Protegida><Produtos /></Protegida>} />
        <Route path="/vencimentos" element={<Protegida><Vencimentos /></Protegida>} />
        <Route path="/compras" element={<Protegida><Compras /></Protegida>} />
        <Route path="/configuracoes" element={<Protegida><Configuracoes /></Protegida>} />
      </Routes>
    </HashRouter>
  );
}
