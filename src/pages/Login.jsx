import { useState } from 'react'
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../firebaseConfig'
import { useNavigate } from 'react-router-dom'
import { Lock, User, AlertCircle, ShoppingBag } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    try {
      // Configura o Firebase para esquecer o login quando o navegador for fechado
      await setPersistence(auth, browserSessionPersistence)
      
      // Realiza a autenticação
      await signInWithEmailAndPassword(auth, email, senha)
      
      // Se a senha estiver correta, redireciona para o painel principal
      navigate('/') 
    } catch (error) {
      console.error(error)
      setErro('Acesso negado. Verifique seu e-mail e senha.')
    } finally {
      setCarregando(false)
    }
  }

  const tema = {
    primaria: '#f472b6',
    textoPrincipal: '#1f2937',
    textoSecundario: '#6b7280',
    fundoBase: '#f9fafb',
    borda: '#e5e7eb'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tema.fundoBase, padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: 'white', padding: '40px', width: '100%', maxWidth: '400px', border: `1px solid ${tema.borda}`, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', borderRadius: '0' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={32} color={tema.primaria} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: tema.textoPrincipal, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Paulinha Variedades
          </h1>
          <p style={{ color: tema.textoSecundario, margin: 0, fontSize: '14px' }}>
            Acesso restrito à administração
          </p>
        </div>

        {erro && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', border: '1px solid #f87171', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            <AlertCircle size={18} />
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: tema.textoPrincipal, textTransform: 'uppercase' }}>
              E-mail de acesso
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite o e-mail cadastrado..."
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${tema.borda}`, outline: 'none', fontSize: '15px', color: tema.textoPrincipal, boxSizing: 'border-box', background: '#f9fafb' }}
              />
              <User size={18} color={tema.textoSecundario} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: tema.textoPrincipal, textTransform: 'uppercase' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha segura"
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1px solid ${tema.borda}`, outline: 'none', fontSize: '15px', color: tema.textoPrincipal, boxSizing: 'border-box', background: '#f9fafb' }}
              />
              <Lock size={18} color={tema.textoSecundario} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ width: '100%', background: carregando ? '#9ca3af' : tema.textoPrincipal, color: 'white', border: 'none', padding: '16px', fontSize: '15px', fontWeight: 'bold', cursor: carregando ? 'not-allowed' : 'pointer', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'background 0.2s' }}
          >
            {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

      </div>
    </div>
  )
}