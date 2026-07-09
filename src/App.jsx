import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebaseConfig'

// Importando as páginas
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import NovoProduto from './pages/NovoProduto'
import EditarProduto from './pages/EditarProduto'
import Venda from './pages/Venda'
import Historico from './pages/Historico'
import NotFound from './pages/NotFound'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Financeiro from './pages/Financeiro'
import Login from './pages/Login' // NOVA TELA DE LOGIN

import Layout from './components/Layout'

// O "Guarda de Segurança": só deixa passar se tiver um usuário validado
function RotaProtegida({ usuario, children }) {
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Verifica o status do login no servidor do Google assim que o site é aberto
  useEffect(() => {
    const desinscrever = onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      setCarregando(false)
    })
    
    return () => desinscrever()
  }, [])

  // Tela de espera enquanto o Firebase lê a chave digital
  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9fafb', color: '#f472b6', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
        Verificando segurança...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        
        {/* ROTA PÚBLICA: Tela de login livre do menu lateral */}
        <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />

        {/* ROTAS PRIVADAS: Totalmente bloqueadas para desconhecidos */}
        <Route 
          path="*" 
          element={
            <RotaProtegida usuario={usuario}>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/estoque" element={<Estoque />} />
                  <Route path="/estoque/novo" element={<NovoProduto />} />
                  <Route path="/estoque/:id" element={<EditarProduto />} />
                  <Route path="/venda" element={<Venda />} />
                  <Route path="/historico" element={<Historico />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </RotaProtegida>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App