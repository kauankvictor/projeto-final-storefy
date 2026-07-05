import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Importando as páginas
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import NovoProduto from './pages/NovoProduto'
import EditarProduto from './pages/EditarProduto'
import Venda from './pages/Venda'
import Historico from './pages/Historico' // <-- ADICIONE ESTA LINHA
import NotFound from './pages/NotFound'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Financeiro from './pages/Financeiro'

// Importando o componente de Layout que acabamos de criar
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/estoque/:id" element={<EditarProduto />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/venda" element={<Venda />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/novo" element={<NovoProduto />} /> {/* Adicione esta linha! */}
          <Route path="/historico" element={<Historico />} /> { }
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/financeiro" element={<Financeiro />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App