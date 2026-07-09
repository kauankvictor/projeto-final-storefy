import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Users, History, Settings, TrendingUp, Menu, X, LogOut } from 'lucide-react'

// Importações do Firebase para o Logout
import { signOut } from 'firebase/auth'
import { auth } from '../firebaseConfig'

export default function Layout({ children }) {
  const location = useLocation()
  
  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  // =====================================================

  const isActive = (path) => location.pathname === path

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/estoque', label: 'Estoque', icon: <Package size={20} /> },
    { path: '/venda', label: 'Frente de Caixa', icon: <ShoppingCart size={20} /> },
    { path: '/clientes', label: 'Clientes / Fiado', icon: <Users size={20} /> },
    { path: '/historico', label: 'Histórico', icon: <History size={20} /> },
    { path: '/financeiro', label: 'Financeiro', icon: <TrendingUp size={20} /> }, 
    { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> }, 
  ]

  // Função para fechar o menu ao clicar em um link (apenas no celular)
  const fecharMenuMobile = () => {
    if (isMobile) setMenuAberto(false)
  }

  // Função de Logout
  const fazerLogout = async () => {
    try {
      await signOut(auth)
      // O App.jsx vai detectar a saída e redirecionar para a tela de login
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: isMobile ? 'column' : 'row' }}>
      
      {/* ================= CABEÇALHO MOBILE ================= */}
      {isMobile && (
        <header style={{
          background: '#1e1b4b',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          boxSizing: 'border-box',
          zIndex: 40,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Storefy<span style={{ color: '#10b981' }}>.</span>
          </h2>
          <button 
            onClick={() => setMenuAberto(true)} 
            style={{ background: 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
          >
            <Menu size={28} />
          </button>
        </header>
      )}

      {/* ================= OVERLAY DO MENU MOBILE ================= */}
      {isMobile && menuAberto && (
        <div 
          onClick={() => setMenuAberto(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', zIndex: 45 }}
        />
      )}

      {/* ================= MENU LATERAL (SIDEBAR) ================= */}
      <aside style={{
        width: '260px',
        background: '#1e1b4b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        height: '100vh',
        boxSizing: 'border-box',
        zIndex: 50,
        transition: 'transform 0.3s ease-in-out',
        // Lógica: se for mobile e estiver fechado, esconde para a esquerda (-100%). Se não, mostra (0).
        transform: isMobile ? (menuAberto ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        top: 0,
        left: 0,
        boxShadow: isMobile && menuAberto ? '4px 0 15px rgba(0,0,0,0.3)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingLeft: '8px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>
              Storefy<span style={{ color: '#10b981' }}>.</span>
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Painel de Controle</p>
          </div>
          {isMobile && (
            <button onClick={() => setMenuAberto(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={24} />
            </button>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={fecharMenuMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'all 0.2s',
                textDecoration: 'none',
                background: isActive(item.path) ? '#4f46e5' : 'transparent',
                color: isActive(item.path) ? '#ffffff' : '#cbd5e1',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ================= BOTÃO DE LOGOUT ================= */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #334155' }}>
          <button
            onClick={fazerLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '16px',
              width: '100%',
              background: 'transparent',
              color: '#f87171',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ================= ÁREA DE CONTEÚDO PRINCIPAL ================= */}
      <main style={{
        flexGrow: 1,
        // No PC, empurra o conteúdo 260px para a direita. No celular, fica 0.
        marginLeft: isMobile ? '0' : '260px',
        // No celular, empurra o conteúdo para baixo para não ficar atrás do cabeçalho fixo.
        marginTop: isMobile ? '60px' : '0', 
        padding: isMobile ? '16px' : '40px',
        backgroundColor: '#f8fafc',
        minHeight: isMobile ? 'calc(100vh - 60px)' : '100vh',
        width: isMobile ? '100%' : 'calc(100% - 260px)',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>

    </div>
  )
}