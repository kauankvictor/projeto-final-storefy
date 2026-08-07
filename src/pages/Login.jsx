import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebaseConfig'
import { Mail, Lock, AlertCircle, LayoutDashboard, ChevronRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  
  // Estados para efeitos visuais modernos (foco nos inputs)
  const [emailFocado, setEmailFocado] = useState(false)
  const [senhaFocada, setSenhaFocada] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')

    if (!email || !senha) {
      setErro('Por favor, preencha o e-mail e a senha.')
      return
    }

    setCarregando(true)

    try {
      await signInWithEmailAndPassword(auth, email, senha)
      navigate('/')
    } catch (error) {
      console.error(error)
      setErro('E-mail ou senha incorretos. Verifique as credenciais.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* COLUNA ESQUERDA: PAINEL ABSTRATO E MODERNO (Oculto no Mobile) */}
      {!isMobile && (
        <div style={{ flex: 1.2, backgroundColor: '#0f0e26', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          
          {/* Luzes desfocadas no fundo (Glow Effects) */}
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '500px', height: '500px', background: '#2e2b6b', filter: 'blur(120px)', borderRadius: '50%', opacity: 0.6 }}></div>
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', background: '#0a7a53', filter: 'blur(150px)', borderRadius: '50%', opacity: 0.5 }}></div>

          <div style={{ maxWidth: '480px', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>

            {/* Cartão de Vidro Fosco (Glassmorphism) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', display: 'inline-flex', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <LayoutDashboard size={32} color="#10b981" />
              </div>
              
              <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', lineHeight: '1.1', color: '#f8fafc', letterSpacing: '-0.5px' }}>
                Acelere a gestão <br />da sua loja.
              </h2>
              <p style={{ fontSize: '18px', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '400', margin: 0 }}>
                Tenha total controle sobre suas vendas, estoque e finanças em uma interface desenhada para resultados.
              </p>
            </div>
            
          </div>
        </div>
      )}

      {/* COLUNA DIREITA: FORMULÁRIO DE LOGIN LIMPO E MODERNO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '32px 24px' : '40px', backgroundColor: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          
          {/* Logo reposicionada para o topo do formulário */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 8px 0', letterSpacing: '-1.5px', color: '#1c1b3b', display: 'flex', alignItems: 'baseline' }}>
              Storefy<span style={{ color: '#10b981', fontSize: '48px', marginLeft: '2px' }}>.</span>
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Insira suas credenciais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                E-mail de acesso
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                border: emailFocado ? '2px solid #10b981' : '2px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '0 16px', 
                backgroundColor: emailFocado ? '#ffffff' : '#f8fafc', 
                transition: 'all 0.2s ease',
                boxShadow: emailFocado ? '0 0 0 4px rgba(16, 185, 129, 0.1)' : 'none'
              }}>
                <Mail size={20} color={emailFocado ? '#10b981' : '#94a3b8'} style={{ transition: 'color 0.2s' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocado(true)}
                  onBlur={() => setEmailFocado(false)}
                  placeholder="Digite seu e-mail" 
                  style={{ width: '100%', border: 'none', padding: '16px 12px', backgroundColor: 'transparent', outline: 'none', color: '#0f172a', fontSize: '15px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                Senha
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                border: senhaFocada ? '2px solid #10b981' : '2px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '0 16px', 
                backgroundColor: senhaFocada ? '#ffffff' : '#f8fafc', 
                transition: 'all 0.2s ease',
                boxShadow: senhaFocada ? '0 0 0 4px rgba(16, 185, 129, 0.1)' : 'none'
              }}>
                <Lock size={20} color={senhaFocada ? '#10b981' : '#94a3b8'} style={{ transition: 'color 0.2s' }} />
                <input 
                  type="password" 
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setSenhaFocada(true)}
                  onBlur={() => setSenhaFocada(false)}
                  placeholder="Digite sua senha" 
                  style={{ width: '100%', border: 'none', padding: '16px 12px', backgroundColor: 'transparent', outline: 'none', color: '#0f172a', fontSize: '15px', letterSpacing: senha ? '2px' : 'normal' }}
                  required
                />
              </div>
            </div>

            {erro && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', animation: 'fadeIn 0.3s ease' }}>
                <AlertCircle size={20} />
                {erro}
              </div>
            )}

            <button 
              type="submit" 
              disabled={carregando}
              style={{ 
                width: '100%', 
                backgroundColor: '#1c1b3b', 
                color: 'white', 
                border: 'none', 
                padding: '18px', 
                borderRadius: '12px', 
                fontSize: '16px', 
                fontWeight: '700', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: carregando ? 'not-allowed' : 'pointer', 
                marginTop: '16px', 
                opacity: carregando ? 0.7 : 1, 
                transition: 'transform 0.1s, opacity 0.2s, box-shadow 0.2s', 
                boxShadow: '0 10px 25px -5px rgba(28, 27, 59, 0.3)'
              }}
              onMouseOver={(e) => { if(!carregando) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(28, 27, 59, 0.4)' }}
              onMouseOut={(e) => { if(!carregando) e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(28, 27, 59, 0.3)' }}
            >
              <span>{carregando ? 'Verificando acesso...' : 'Acessar Painel'}</span>
              {!carregando && <ChevronRight size={22} />}
            </button>
          </form>

        </div>
      </div>

    </div>
  )
}