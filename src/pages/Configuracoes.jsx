import { useState, useEffect } from 'react'
import { ShieldCheck, Download, UploadCloud, AlertTriangle, Store, Trash2, User, MapPin, Phone, Mail, Key, Save, Lock, X, ClipboardList } from 'lucide-react'

// Importações cruciais do Firebase
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Configuracoes() {
  const [status, setStatus] = useState({ tipo: '', msg: '' })
  
  // ================= ESTADOS DOS DADOS DA LOJA =================
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: '', endereco: '', ceo: '', telefone: '', email: '', chavePix: '', comandos: ''
  })

  // ================= ESTADOS DE AUTENTICAÇÃO =================
  const [authModal, setAuthModal] = useState({ isOpen: false, acao: null, titulo: '', payload: null })
  const [credenciais, setCredenciais] = useState({ login: '', senha: '' })

  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    const dadosSalvos = JSON.parse(localStorage.getItem('storefy_dados_loja'))
    if (dadosSalvos) setDadosLoja(dadosSalvos)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const mostrarAlerta = (tipo, msg) => {
    setStatus({ tipo, msg })
    setTimeout(() => setStatus({ tipo: '', msg: '' }), 3000)
  }

  const handleSalvarLoja = (e) => {
    e.preventDefault()
    localStorage.setItem('storefy_dados_loja', JSON.stringify(dadosLoja))
    mostrarAlerta('sucesso', 'Dados da loja atualizados com sucesso!')
  }

  // ================= EXPORTAR BACKUP PUXANDO DO FIREBASE =================
  const exportarBackup = async () => {
    setStatus({ tipo: 'info', msg: 'A aceder à nuvem para gerar cópia de segurança...' })
    try {
      const queryProdutos = await getDocs(collection(db, "produtos"))
      const produtos = queryProdutos.docs.map(d => d.data())

      const queryHistorico = await getDocs(collection(db, "historico"))
      const historico = queryHistorico.docs.map(d => d.data())

      const queryClientes = await getDocs(collection(db, "clientes"))
      const clientes = queryClientes.docs.map(d => d.data())

      const dadosBackup = {
        storefy_produtos: produtos,
        storefy_historico: historico,
        storefy_clientes: clientes,
        storefy_links: JSON.parse(localStorage.getItem('storefy_links')) || [],
        storefy_lembretes: localStorage.getItem('storefy_lembretes') || '',
        storefy_dados_loja: JSON.parse(localStorage.getItem('storefy_dados_loja')) || {}
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup, null, 2))
      const downloadAnchor = document.createElement('a')
      const dataAtual = new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `backup_storefy_${dataAtual}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      
      mostrarAlerta('sucesso', 'Cópia de segurança descarregada com sucesso!')
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Erro ao obter dados do servidor para gerar cópia de segurança.')
    }
  }

  // ================= INTERCEPTADORES DE SEGURANÇA =================
  const tentarImportarBackup = (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setAuthModal({
      isOpen: true,
      acao: 'importar',
      titulo: 'Autorização: Restaurar Sistema',
      payload: arquivo
    })
    e.target.value = null
  }

  const tentarResetSeletivo = (tipo, chave, nomeAmigavel) => {
    setAuthModal({
      isOpen: true,
      acao: 'reset',
      titulo: `Autorização: Apagar ${nomeAmigavel}`,
      payload: { tipo, chave, nomeAmigavel }
    })
  }

  // ================= VALIDAÇÃO DA SENHA MESTRE =================
  const confirmarAcesso = async (e) => {
    e.preventDefault()
    
    if (credenciais.login === '051521880684' && credenciais.senha === '!P$.juno.K') {
      const acaoAtual = authModal.acao
      const payloadAtual = authModal.payload
      
      setAuthModal({ isOpen: false, acao: null, titulo: '', payload: null })
      setCredenciais({ login: '', senha: '' })

      if (acaoAtual === 'importar') {
        await executarImportacao(payloadAtual)
      } else if (acaoAtual === 'reset') {
        await executarReset(payloadAtual.tipo, payloadAtual.chave, payloadAtual.nomeAmigavel)
      }
    } else {
      mostrarAlerta('erro', 'Acesso Negado: Credenciais mestre incorretas.')
    }
  }

  const fecharModal = () => {
    setAuthModal({ isOpen: false, acao: null, titulo: '', payload: null })
    setCredenciais({ login: '', senha: '' })
  }

  // ================= GRAVAÇÃO DO BACKUP DIRETAMENTE NO FIREBASE =================
  const executarImportacao = async (arquivo) => {
    const fileReader = new FileReader()
    fileReader.onload = async (event) => {
      try {
        const dados = JSON.parse(event.target.result)
        if (window.confirm('Acesso Liberado! Deseja realmente carregar estes dados para a nuvem? Itens duplicados podem ser gerados.')) {
          setStatus({ tipo: 'info', msg: 'A processar e gravar dados no servidor...' })

          if (dados.storefy_produtos && dados.storefy_produtos.length > 0) {
            for (const p of dados.storefy_produtos) {
              await addDoc(collection(db, "produtos"), p)
            }
          }
          if (dados.storefy_historico && dados.storefy_historico.length > 0) {
            for (const h of dados.storefy_historico) {
              await addDoc(collection(db, "historico"), h)
            }
          }
          if (dados.storefy_clientes && dados.storefy_clientes.length > 0) {
            for (const c of dados.storefy_clientes) {
              await addDoc(collection(db, "clientes"), c)
            }
          }

          if (dados.storefy_links) localStorage.setItem('storefy_links', JSON.stringify(dados.storefy_links))
          if (dados.storefy_lembretes) localStorage.setItem('storefy_lembretes', dados.storefy_lembretes)
          if (dados.storefy_dados_loja) localStorage.setItem('storefy_dados_loja', JSON.stringify(dados.storefy_dados_loja))

          mostrarAlerta('sucesso', 'Dados restaurados com sucesso na nuvem!')
          setTimeout(() => window.location.reload(), 1200)
        }
      } catch (error) {
        mostrarAlerta('erro', 'Erro ao ler ou processar o arquivo estrutural JSON.')
      }
    }
    fileReader.readAsText(arquivo)
  }

  // ================= LIMPEZA REAL DE DADOS DO FIREBASE =================
  const executarReset = async (tipo, chave, nomeAmigavel) => {
    const confirmacaoFinal = window.confirm(`Acesso Liberado! Confirmação irrevogável: Deseja apagar permanentemente: ${nomeAmigavel} do servidor remoto?`)
    if (confirmacaoFinal) {
      setStatus({ tipo: 'info', msg: `A remover ${nomeAmigavel} da nuvem...` })
      try {
        if (tipo === 'tudo' || tipo === 'produtos') {
          const snap = await getDocs(collection(db, "produtos"))
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "produtos", docSnap.id))
          }
        }
        if (tipo === 'tudo' || tipo === 'historico') {
          const snap = await getDocs(collection(db, "historico"))
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "historico", docSnap.id))
          }
        }
        if (tipo === 'tudo' || tipo === 'clientes') {
          const snap = await getDocs(collection(db, "clientes"))
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "clientes", docSnap.id))
          }
        }

        if (tipo === 'tudo') {
          localStorage.clear()
        } else if (chave !== 'tudo') {
          localStorage.removeItem(chave)
        }

        mostrarAlerta('sucesso', `${nomeAmigavel} foi completamente limpo da nuvem!`)
        setTimeout(() => window.location.reload(), 1200)
      } catch (error) {
        console.error(error)
        mostrarAlerta('erro', 'Falha crítica ao apagar documentos das coleções remotas.')
      }
    }
  }

  const estilosTema = {
    fundo: '#f8fafc',
    textoPrincipal: '#1e1b4b',
    textoSecundario: '#64748b',
    cardFundo: '#ffffff',
    cardBorda: '#f1f5f9',
    inputFundo: '#ffffff',
    inputTexto: '#1e1b4b'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '850px', minHeight: '100vh', backgroundColor: estilosTema.fundo, paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
      
      <header>
        <h1 style={{ fontSize: isMobile ? '24px' : '30px', color: estilosTema.textoPrincipal, fontWeight: 'bold', margin: 0 }}>Configurações</h1>
        <p style={{ color: estilosTema.textoSecundario, marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Gerencie a identidade, segurança e backups do Storefy</p>
      </header>

      {status.msg && (
        <div style={{ background: status.tipo === 'sucesso' ? '#d1fae5' : (status.tipo === 'info' ? '#dbeafe' : '#fee2e2'), color: status.tipo === 'sucesso' ? '#069669' : (status.tipo === 'info' ? '#2563eb' : '#ef4444'), padding: '16px', borderRadius: '12px', fontWeight: '600', fontSize: '14px' }}>
          {status.msg}
        </div>
      )}

      {/* DADOS DA LOJA */}
      <div style={{ background: estilosTema.cardFundo, padding: isMobile ? '16px' : '28px', borderRadius: '20px', border: `1px solid ${estilosTema.cardBorda}`, boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid ${estilosTema.fundo}`, paddingBottom: '16px', marginBottom: '24px' }}>
          <Store size={22} color="#4f46e5" />
          <h2 style={{ fontSize: '18px', color: estilosTema.textoPrincipal, fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Perfil da Loja & Faturamento</h2>
        </div>

        <form onSubmit={handleSalvarLoja} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><Store size={12}/> Nome da Loja</label>
            <input type="text" value={dadosLoja.nomeLoja} onChange={e => setDadosLoja({...dadosLoja, nomeLoja: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="Ex: Storefy Perfumaria" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><User size={12}/> Nome da CEO / Proprietária</label>
            <input type="text" value={dadosLoja.ceo} onChange={e => setDadosLoja({...dadosLoja, ceo: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="Ex: Ana Paula" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><Phone size={12}/> Telefone de Contato</label>
            <input type="text" value={dadosLoja.telefone} onChange={e => setDadosLoja({...dadosLoja, telefone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="(00) 00000-0000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><Mail size={12}/> E-mail Comercial</label>
            <input type="email" value={dadosLoja.email} onChange={e => setDadosLoja({...dadosLoja, email: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="loja@email.com" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><MapPin size={12}/> Endereço Físico</label>
            <input type="text" value={dadosLoja.endereco} onChange={e => setDadosLoja({...dadosLoja, endereco: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="Rua, número, bairro, cidade..." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><Key size={12}/> Chaves Pix para Cobrança</label>
            <input type="text" value={dadosLoja.chavePix} onChange={e => setDadosLoja({...dadosLoja, chavePix: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px' }} placeholder="CNPJ, Celular, E-mail ou Chave Aleatória..." />
          </div>

          {/* NOVO CAMPO: ANOTAÇÕES DE COMANDOS PARA A LOJA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoSecundario }}><ClipboardList size={14}/> Anotações de Comandos para a Loja</label>
            <textarea 
              value={dadosLoja.comandos || ''} 
              onChange={e => setDadosLoja({...dadosLoja, comandos: e.target.value})} 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', minHeight: '110px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.4', boxSizing: 'border-box', width: '100%' }} 
              placeholder="Insira aqui diretrizes, avisos rápidos de faturamento ou notas operacionais para consulta da equipa..." 
            />
          </div>
          
          <button type="submit" style={{ gridColumn: '1 / -1', background: '#4f46e5', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', marginTop: '8px', width: '100%' }}>
            <Save size={18} /> Salvar Informações da Loja
          </button>
        </form>
      </div>

      {/* COPIAS DE SEGURANÇA */}
      <div style={{ background: estilosTema.cardFundo, padding: isMobile ? '16px' : '28px', borderRadius: '20px', border: `1px solid ${estilosTema.cardBorda}`, boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid ${estilosTema.fundo}`, paddingBottom: '16px', marginBottom: '20px' }}>
          <ShieldCheck size={22} color="#4f46e5" />
          <h2 style={{ fontSize: '18px', color: estilosTema.textoPrincipal, fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Cópias de Segurança (Backup)</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          <div style={{ border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '15px', color: estilosTema.textoPrincipal, fontWeight: 'bold', margin: 0 }}>Exportar Dados</h3>
            <p style={{ fontSize: '13px', color: estilosTema.textoSecundario, margin: 0 }}>Descarregue um arquivo estrutural consolidando todos os produtos, devedores e histórico salvos na nuvem.</p>
            <button onClick={exportarBackup} style={{ background: '#f1f5f9', color: '#1e1b4b', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', marginTop: 'auto', width: '100%' }}><Download size={16} /> Baixar Backup (.json)</button>
          </div>
          <div style={{ border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '15px', color: estilosTema.textoPrincipal, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              Restaurar Sistema <Lock size={14} color="#ef4444"/>
            </h3>
            <p style={{ fontSize: '13px', color: estilosTema.textoSecundario, margin: 0 }}>Suba um arquivo JSON exportado anteriormente para anexar os registos diretamente no banco de dados remoto.</p>
            <div style={{ position: 'relative', marginTop: 'auto', width: '100%' }}>
              <input type="file" accept=".json" onChange={tentarImportarBackup} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
              <button type="button" style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', width: '100%', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}><UploadCloud size={16} /> Subir Arquivo</button>
            </div>
          </div>
        </div>
      </div>

      {/* ZONA DE RISCO CONECTADA AO FIREBASE */}
      <div style={{ background: estilosTema.cardFundo, padding: isMobile ? '16px' : '28px', borderRadius: '20px', border: `1px solid ${estilosTema.cardBorda}`, boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid ${estilosTema.fundo}`, paddingBottom: '16px', marginBottom: '16px' }}>
          <AlertTriangle size={22} color="#ef4444" />
          <h2 style={{ fontSize: '18px', color: estilosTema.textoPrincipal, fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Zona de Risco (Exige Senha)</h2>
        </div>
        <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500', marginBottom: '20px', margin: 0, paddingBottom: '16px' }}>As ações abaixo eliminam informações diretamente do servidor Google Firestore de forma definitiva.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <button onClick={() => tentarResetSeletivo('historico', 'storefy_historico', 'Histórico de Vendas')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Trash2 size={16}/> Limpar Vendas</button>
          <button onClick={() => tentarResetSeletivo('produtos', 'storefy_produtos', 'Catálogo de Produtos')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Trash2 size={16}/> Limpar Produtos</button>
          <button onClick={() => tentarResetSeletivo('clientes', 'storefy_clientes', 'Fichas dos Clientes')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Trash2 size={16}/> Limpar Devedores</button>
          <button onClick={() => tentarResetSeletivo('tudo', 'tudo', 'SISTEMA COMPLETO')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', gridColumn: '1 / -1' }}><Trash2 size={16}/> Reset de Fábrica (Apagar Tudo)</button>
        </div>
      </div>

      {/* ================= MODAL DE AUTENTICAÇÃO (SEGURANÇA) ================= */}
      {authModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: estilosTema.cardFundo, width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Lock size={20} /> {authModal.titulo}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', color: estilosTema.textoSecundario, cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <p style={{ color: estilosTema.textoSecundario, fontSize: '14px', marginBottom: '24px', lineHeight: '1.4', margin: 0, paddingBottom: '16px' }}>
              Esta é uma área restrita do Storefy. Insira as credenciais mestre de fábrica para autorizar a modificação da base de dados remota.
            </p>

            <form onSubmit={confirmarAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoPrincipal }}>Login</label>
                <input 
                  type="text" 
                  value={credenciais.login} 
                  onChange={e => setCredenciais({...credenciais, login: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px', width: '100%', boxSizing: 'border-box' }} 
                  placeholder="Digite o login de fábrica"
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: estilosTema.textoPrincipal }}>Senha</label>
                <input 
                  type="password" 
                  value={credenciais.senha} 
                  onChange={e => setCredenciais({...credenciais, senha: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: estilosTema.inputFundo, color: estilosTema.inputTexto, outline: 'none', fontSize: '15px', width: '100%', boxSizing: 'border-box' }} 
                  placeholder="••••••••••"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="button" onClick={fecharModal} style={{ flex: 1, background: 'transparent', border: '1px solid #cbd5e1', color: estilosTema.textoPrincipal, padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, background: '#ef4444', border: 'none', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Liberar Acesso
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}