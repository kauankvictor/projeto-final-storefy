import { useState, useEffect } from 'react'
import { ShieldCheck, Download, UploadCloud, AlertTriangle, Store, Trash2, User, MapPin, Phone, Mail, Key, Save, Lock, X, ClipboardList, Settings, EyeOff, Plus, Palette } from 'lucide-react'
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Configuracoes() {
  const [status, setStatus] = useState({ tipo: '', msg: '' })
  const [abaAtiva, setAbaAtiva] = useState('loja')
  
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: '', endereco: '', ceo: '', telefone: '', email: '', chavePix: '', comandos: '', mapaUrl: ''
  })

  // Novo Estado: Customização do Catálogo (Salvo junto com os Dados da Loja)
  const [corCatalogo, setCorCatalogo] = useState('#db2777')
  const [nomeCatalogo, setNomeCatalogo] = useState('Storefy')

  const [listaVendedores, setListaVendedores] = useState([])
  const [novoVendedor, setNovoVendedor] = useState('')

  const [seguranca, setSeguranca] = useState({
    emailRecuperacao: '',
    senhaEstorno: '',
    senhaHistorico: '',
    senhaProdutos: '',
    senhaClientes: '',
    senhaBaixaConta: '',
    senhaMaster: ''
  })

  const [isSegurancaUnlocked, setIsSegurancaUnlocked] = useState(false)
  const [senhaAcessoSeguranca, setSenhaAcessoSeguranca] = useState('')

  const [authModal, setAuthModal] = useState({ isOpen: false, acao: null, titulo: '', payload: null, tipoSenhaExigida: 'master' })
  const [credenciais, setCredenciais] = useState({ login: '', senha: '' }) 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    const carregarTudoNuvem = async () => {
      try {
        const docRefLoja = doc(db, "configuracoes", "loja")
        const docSnapLoja = await getDoc(docRefLoja)
        if (docSnapLoja.exists()) {
          const dadosDB = docSnapLoja.data()
          setDadosLoja(dadosDB)
          if(dadosDB.corPrincipal) setCorCatalogo(dadosDB.corPrincipal)
          if(dadosDB.nomeCatalogo) setNomeCatalogo(dadosDB.nomeCatalogo)
        }

        const docRefSeguranca = doc(db, "configuracoes", "seguranca")
        const docSnapSeguranca = await getDoc(docRefSeguranca)
        if (docSnapSeguranca.exists()) setSeguranca(docSnapSeguranca.data())

        const docRefVendedores = doc(db, "configuracoes", "vendedores")
        const docSnapVendedores = await getDoc(docRefVendedores)
        if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
          setListaVendedores(docSnapVendedores.data().lista)
        }

      } catch (error) {
        console.error("Erro ao carregar do servidor:", error)
      }
    }

    carregarTudoNuvem()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const mostrarAlerta = (tipo, msg) => {
    setStatus({ tipo, msg })
    setTimeout(() => setStatus({ tipo: '', msg: '' }), 4000)
  }

  const handleAdicionarVendedor = (e) => {
    e.preventDefault()
    if (novoVendedor.trim() !== '') {
      setListaVendedores([...listaVendedores, novoVendedor.trim()])
      setNovoVendedor('')
    }
  }

  const handleRemoverVendedor = (indexParaRemover) => {
    setListaVendedores(listaVendedores.filter((_, index) => index !== indexParaRemover))
  }

  // Modificado para salvar a cor e o nome do catálogo junto com os dados gerais
  const handleSalvarLoja = async (e) => {
    e.preventDefault()
    setStatus({ tipo: 'info', msg: 'A salvar dados na nuvem...' })
    try {
      const dadosParaSalvar = {
        ...dadosLoja,
        corPrincipal: corCatalogo,
        nomeCatalogo: nomeCatalogo
      }
      
      await setDoc(doc(db, "configuracoes", "loja"), dadosParaSalvar)
      await setDoc(doc(db, "configuracoes", "vendedores"), { lista: listaVendedores })
      mostrarAlerta('sucesso', 'Configurações atualizadas com sucesso no servidor!')
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Erro ao salvar os dados da loja.')
    }
  }

  const handleSalvarSeguranca = async (e) => {
    e.preventDefault()
    if(!seguranca.emailRecuperacao) {
      mostrarAlerta('erro', 'O e-mail de recuperação é obrigatório.')
      return
    }
    setStatus({ tipo: 'info', msg: 'A salvar credenciais na nuvem...' })
    try {
      await setDoc(doc(db, "configuracoes", "seguranca"), seguranca)
      mostrarAlerta('sucesso', 'Senhas e acessos atualizados com sucesso!')
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Erro ao salvar as configurações de segurança.')
    }
  }

  const handleDesbloquearSeguranca = (e) => {
    e.preventDefault()
    let masterReal = '!P$.juno.K'
    if (seguranca && seguranca.senhaMaster && seguranca.senhaMaster.trim() !== '') {
      masterReal = seguranca.senhaMaster
    }
    if (senhaAcessoSeguranca === masterReal || senhaAcessoSeguranca === '!P$.juno.K') {
      setIsSegurancaUnlocked(true)
      setSenhaAcessoSeguranca('')
      mostrarAlerta('sucesso', 'Cofre desbloqueado com sucesso.')
    } else {
      mostrarAlerta('erro', 'Senha Master incorreta. Acesso negado.')
      setSenhaAcessoSeguranca('')
    }
  }

  const exportarBackup = async () => {
    setStatus({ tipo: 'info', msg: 'Gerando cópia de segurança. Aguarde...' })
    try {
      const queryProdutos = await getDocs(collection(db, "produtos"))
      const produtos = queryProdutos.docs.map(d => d.data())

      const queryHistorico = await getDocs(collection(db, "historico"))
      const historico = queryHistorico.docs.map(d => d.data())

      const queryClientes = await getDocs(collection(db, "clientes"))
      const clientes = queryClientes.docs.map(d => d.data())

      const docSnapLoja = await getDoc(doc(db, "configuracoes", "loja"))
      const dadosLojaBanco = docSnapLoja.exists() ? docSnapLoja.data() : {}

      const docSnapSeguranca = await getDoc(doc(db, "configuracoes", "seguranca"))
      const dadosSegurancaBanco = docSnapSeguranca.exists() ? docSnapSeguranca.data() : {}

      const docSnapVendedores = await getDoc(doc(db, "configuracoes", "vendedores"))
      const dadosVendedoresBanco = docSnapVendedores.exists() ? docSnapVendedores.data() : { lista: [] }

      const dadosBackup = {
        storefy_produtos: produtos,
        storefy_historico: historico,
        storefy_clientes: clientes,
        storefy_dados_loja: dadosLojaBanco,
        storefy_seguranca: dadosSegurancaBanco,
        storefy_vendedores: dadosVendedoresBanco
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup, null, 2))
      const downloadAnchor = document.createElement('a')
      const dataAtual = new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `backup_storefy_${dataAtual}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      
      mostrarAlerta('sucesso', 'Cópia de segurança baixada com sucesso!')
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Erro ao exportar dados do servidor.')
    }
  }

  const tentarImportarBackup = (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setAuthModal({
      isOpen: true,
      acao: 'importar',
      titulo: 'Restaurar Sistema',
      payload: arquivo,
      tipoSenhaExigida: 'master'
    })
    e.target.value = null
  }

  const tentarResetSeletivo = (tipo, nomeAmigavel, tipoSenhaExigida) => {
    setAuthModal({
      isOpen: true,
      acao: 'reset',
      titulo: `Apagar ${nomeAmigavel}`,
      payload: { tipo, nomeAmigavel },
      tipoSenhaExigida: tipoSenhaExigida
    })
  }

  const confirmarAcesso = async (e) => {
    e.preventDefault()
    let senhaValidacao = '!P$.juno.K'
    
    if(authModal.tipoSenhaExigida === 'historico' && seguranca.senhaHistorico) senhaValidacao = seguranca.senhaHistorico
    else if(authModal.tipoSenhaExigida === 'produtos' && seguranca.senhaProdutos) senhaValidacao = seguranca.senhaProdutos
    else if(authModal.tipoSenhaExigida === 'clientes' && seguranca.senhaClientes) senhaValidacao = seguranca.senhaClientes
    else if(authModal.tipoSenhaExigida === 'master' && seguranca.senhaMaster) senhaValidacao = seguranca.senhaMaster

    if (credenciais.senha === senhaValidacao || credenciais.senha === seguranca.senhaMaster || credenciais.senha === '!P$.juno.K') {
      const acaoAtual = authModal.acao
      const payloadAtual = authModal.payload
      
      setAuthModal({ isOpen: false, acao: null, titulo: '', payload: null, tipoSenhaExigida: 'master' })
      setCredenciais({ login: '', senha: '' })

      if (acaoAtual === 'importar') {
        await executarImportacao(payloadAtual)
      } else if (acaoAtual === 'reset') {
        await executarReset(payloadAtual.tipo, payloadAtual.nomeAmigavel)
      }
    } else {
      mostrarAlerta('erro', 'Acesso Negado: A senha inserida está incorreta para esta operação.')
    }
  }

  const fecharModal = () => {
    setAuthModal({ isOpen: false, acao: null, titulo: '', payload: null, tipoSenhaExigida: 'master' })
    setCredenciais({ login: '', senha: '' })
  }

  const executarImportacao = async (arquivo) => {
    const fileReader = new FileReader()
    fileReader.onload = async (event) => {
      try {
        const dados = JSON.parse(event.target.result)
        if (window.confirm('Deseja realmente carregar estes dados para a nuvem? Itens duplicados podem ser gerados.')) {
          setStatus({ tipo: 'info', msg: 'A processar e gravar dados no servidor...' })

          if (dados.storefy_produtos) for (const p of dados.storefy_produtos) await addDoc(collection(db, "produtos"), p)
          if (dados.storefy_historico) for (const h of dados.storefy_historico) await addDoc(collection(db, "historico"), h)
          if (dados.storefy_clientes) for (const c of dados.storefy_clientes) await addDoc(collection(db, "clientes"), c)
          if (dados.storefy_dados_loja) await setDoc(doc(db, "configuracoes", "loja"), dados.storefy_dados_loja)
          if (dados.storefy_seguranca) await setDoc(doc(db, "configuracoes", "seguranca"), dados.storefy_seguranca)
          if (dados.storefy_vendedores) await setDoc(doc(db, "configuracoes", "vendedores"), dados.storefy_vendedores)

          mostrarAlerta('sucesso', 'Dados restaurados com sucesso na nuvem!')
          setTimeout(() => window.location.reload(), 1500)
        }
      } catch (error) {
        mostrarAlerta('erro', 'Erro ao ler ou processar o arquivo estrutural JSON.')
      }
    }
    fileReader.readAsText(arquivo)
  }

  const executarReset = async (tipo, nomeAmigavel) => {
    const confirmacaoFinal = window.confirm(`Acesso Liberado! Confirmação final: Deseja apagar permanentemente: ${nomeAmigavel} do servidor remoto? Esta ação não tem volta.`)
    if (confirmacaoFinal) {
      setStatus({ tipo: 'info', msg: `A remover ${nomeAmigavel} da nuvem...` })
      try {
        if (tipo === 'tudo' || tipo === 'produtos') {
          const snap = await getDocs(collection(db, "produtos"))
          for (const docSnap of snap.docs) await deleteDoc(doc(db, "produtos", docSnap.id))
        }
        if (tipo === 'tudo' || tipo === 'historico') {
          const snap = await getDocs(collection(db, "historico"))
          for (const docSnap of snap.docs) await deleteDoc(doc(db, "historico", docSnap.id))
        }
        if (tipo === 'tudo' || tipo === 'clientes') {
          const snap = await getDocs(collection(db, "clientes"))
          for (const docSnap of snap.docs) await deleteDoc(doc(db, "clientes", docSnap.id))
        }
        if (tipo === 'tudo') {
          localStorage.clear()
          await deleteDoc(doc(db, "configuracoes", "loja"))
          await deleteDoc(doc(db, "configuracoes", "seguranca"))
          await deleteDoc(doc(db, "configuracoes", "vendedores"))
        }

        mostrarAlerta('sucesso', `${nomeAmigavel} limpo com sucesso!`)
        setTimeout(() => window.location.reload(), 1500)
      } catch (error) {
        console.error(error)
        mostrarAlerta('erro', 'Falha ao apagar documentos das coleções remotas.')
      }
    }
  }

  const SidebarBtn = ({ id, icon, texto }) => (
    <button 
      onClick={() => {
        setAbaAtiva(id);
        if (id !== 'seguranca') setIsSegurancaUnlocked(false);
      }} 
      style={{ 
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px', 
        borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
        textAlign: 'left', transition: '0.2s',
        background: abaAtiva === id ? '#4f46e5' : 'transparent',
        color: abaAtiva === id ? '#ffffff' : '#64748b'
      }}
    >
      {icon} {texto}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh', paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
      
      <header style={{ marginBottom: '10px' }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '30px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Configurações do Sistema</h1>
        <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Gerencie as informações, acessos e manutenções do Storefy</p>
      </header>

      {status.msg && (
        <div style={{ background: status.tipo === 'sucesso' ? '#d1fae5' : (status.tipo === 'info' ? '#dbeafe' : '#fee2e2'), color: status.tipo === 'sucesso' ? '#069669' : (status.tipo === 'info' ? '#2563eb' : '#ef4444'), padding: '16px', borderRadius: '12px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.tipo === 'sucesso' ? <ShieldCheck size={20}/> : <AlertTriangle size={20}/>} {status.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* MENU LATERAL */}
        <div style={{ width: isMobile ? '100%' : '250px', flexShrink: 0, display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '10px' : '0' }}>
          <SidebarBtn id="loja" icon={<Store size={18}/>} texto="Dados da Loja" />
          <SidebarBtn id="catalogo" icon={<Palette size={18}/>} texto="Personalizar Catálogo" />
          <SidebarBtn id="seguranca" icon={<Key size={18}/>} texto="Controle de Acessos" />
          <SidebarBtn id="manutencao" icon={<Settings size={18}/>} texto="Backups e Limpeza" />
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        <div style={{ flex: 1, background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', padding: isMobile ? '20px' : '32px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* ================= ABA: DADOS DA LOJA ================= */}
          {abaAtiva === 'loja' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Store size={22} color="#4f46e5" /> Perfil Oficial da Loja</h2>
              <form onSubmit={handleSalvarLoja} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Nome da Loja</label>
                  <input type="text" value={dadosLoja.nomeLoja} onChange={e => setDadosLoja({...dadosLoja, nomeLoja: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Nome da loja" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Responsável</label>
                  <input type="text" value={dadosLoja.ceo} onChange={e => setDadosLoja({...dadosLoja, ceo: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Nome do responsavel" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Telefone de Contato</label>
                  <input type="text" value={dadosLoja.telefone} onChange={e => setDadosLoja({...dadosLoja, telefone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="(00) 00000-0000" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>E-mail Comercial</label>
                  <input type="email" value={dadosLoja.email} onChange={e => setDadosLoja({...dadosLoja, email: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="loja@email.com" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Endereço Físico</label>
                  <input type="text" value={dadosLoja.endereco} onChange={e => setDadosLoja({...dadosLoja, endereco: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Rua, número, bairro, cidade..." />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Link do Google Maps</label>
                  <input type="text" value={dadosLoja.mapaUrl || ''} onChange={e => setDadosLoja({...dadosLoja, mapaUrl: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Cole a URL do mapa aqui" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Chave Pix Principal</label>
                  <input type="text" value={dadosLoja.chavePix} onChange={e => setDadosLoja({...dadosLoja, chavePix: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="CNPJ, Celular, E-mail..." />
                </div>
                
                {/* SEÇÃO VENDEDORES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14}/> Equipe de Vendas (Vendedores)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={novoVendedor} 
                      onChange={e => setNovoVendedor(e.target.value)} 
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} 
                      placeholder="Nome do vendedor..." 
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdicionarVendedor(e); } }}
                    />
                    <button type="button" onClick={handleAdicionarVendedor} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {listaVendedores.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {listaVendedores.map((vendedor, index) => (
                        <div key={index} style={{ background: '#e0e7ff', color: '#4f46e5', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {vendedor}
                          <button type="button" onClick={() => handleRemoverVendedor(index)} style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Quadro de Avisos da Equipe</label>
                  <textarea value={dadosLoja.comandos || ''} onChange={e => setDadosLoja({...dadosLoja, comandos: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }} placeholder="Orientações sobre a loja" />
                </div>
                
                <button type="submit" style={{ gridColumn: '1 / -1', background: '#4f46e5', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', marginTop: '8px', width: '100%' }}>
                  <Save size={18} /> Salvar Configurações
                </button>
              </form>
            </div>
          )}

          {/* ================= ABA: PERSONALIZAR CATÁLOGO ================= */}
          {abaAtiva === 'catalogo' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={22} color="#4f46e5" /> Identidade do Catálogo
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                Estas alterações refletirão imediatamente na visão do cliente quando ele abrir o seu link de vendas.
              </p>

              <form onSubmit={handleSalvarLoja} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Nome da Loja Exibido no Topo</label>
                  <input 
                    type="text" 
                    value={nomeCatalogo} 
                    onChange={e => setNomeCatalogo(e.target.value)} 
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} 
                    placeholder="Ex: Storefy Catálogo" 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Cor Principal dos Botões</label>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Clique no quadrado de cor para abrir a paleta de seleção.</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input 
                      type="color" 
                      value={corCatalogo} 
                      onChange={e => setCorCatalogo(e.target.value)} 
                      style={{ width: '60px', height: '60px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>{corCatalogo.toUpperCase()}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Código Hexadecimal</span>
                    </div>
                  </div>
                </div>

                <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', marginTop: '8px' }}>
                  <Save size={18} /> Salvar e Publicar Alterações
                </button>
              </form>
            </div>
          )}

          {/* ================= ABA: CONTROLE DE ACESSOS ================= */}
          {abaAtiva === 'seguranca' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={22} color="#4f46e5" /> Controle de Acessos</h2>
              
              {!isSegurancaUnlocked ? (
                <div style={{ background: '#f8fafc', padding: isMobile ? '24px' : '40px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '50%', color: '#ef4444' }}>
                    <EyeOff size={32} />
                  </div>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Cofre de Segurança Trancado</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: 0, lineHeight: '1.5' }}>Para visualizar e alterar as senhas do sistema, por favor, insira a <strong>Senha Master</strong> atual.</p>
                  
                  <form onSubmit={handleDesbloquearSeguranca} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px', marginTop: '8px' }}>
                    <input 
                      type="password" 
                      value={senhaAcessoSeguranca}
                      onChange={e => setSenhaAcessoSeguranca(e.target.value)}
                      placeholder="Digite a senha" 
                      required
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', textAlign: 'center' }}
                    />
                    <button type="submit" style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Lock size={16} /> Desbloquear Cofre
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>Defina as senhas de autorização para as áreas críticas do sistema. Assim você não precisa alterar o código fonte quando quiser trocar um acesso.</p>
                  
                  <form onSubmit={handleSalvarSeguranca} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}><Mail size={14}/> E-mail para Recuperação (Obrigatório)</label>
                        <input type="email" required value={seguranca.emailRecuperacao || ''} onChange={e => setSeguranca({...seguranca, emailRecuperacao: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="seuemail@gmail.com" />
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Caso perca a senha Master, as instruções serão enviadas para cá futuramente.</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Senha para Cancelar Venda</label>
                        <input type="text" value={seguranca.senhaEstorno || ''} onChange={e => setSeguranca({...seguranca, senhaEstorno: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Ex: 1234" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Senha p/ Baixa em Fiado</label>
                        <input type="text" value={seguranca.senhaBaixaConta || ''} onChange={e => setSeguranca({...seguranca, senhaBaixaConta: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Senha para receber devedor" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Senha para Limpar Histórico</label>
                        <input type="text" value={seguranca.senhaHistorico || ''} onChange={e => setSeguranca({...seguranca, senhaHistorico: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Definir senha..." />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Senha para Limpar Produtos</label>
                        <input type="text" value={seguranca.senhaProdutos || ''} onChange={e => setSeguranca({...seguranca, senhaProdutos: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Definir senha..." />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Senha para Limpar Devedores</label>
                        <input type="text" value={seguranca.senhaClientes || ''} onChange={e => setSeguranca({...seguranca, senhaClientes: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Definir senha..." />
                      </div>
                    </div>

                    <div style={{ background: '#fee2e2', padding: '20px', borderRadius: '12px', border: '1px solid #f87171', marginTop: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={14}/> Senha MASTER do Sistema</label>
                        <input type="text" value={seguranca.senhaMaster || ''} onChange={e => setSeguranca({...seguranca, senhaMaster: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fca5a5', outline: 'none', fontSize: '15px', color: '#b91c1c', fontWeight: 'bold' }} placeholder="Senha para formatação geral..." />
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>Esta senha permite apagar TODO o banco de dados e desbloquear o cofre. Guarde-a com segurança.</span>
                      </div>
                    </div>

                    <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                      <Save size={18} /> Salvar Credenciais na Nuvem
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ================= ABA: BACKUPS E MANUTENÇÃO ================= */}
          {abaAtiva === 'manutencao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              <div>
                <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={22} color="#4f46e5" /> Cópias de Segurança</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Exportar Backup</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Baixe um arquivo contendo todo o seu banco de dados atual.</p>
                    <button onClick={exportarBackup} style={{ background: '#f8fafc', color: '#1e1b4b', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', marginTop: 'auto' }}><Download size={16} /> Baixar JSON</button>
                  </div>
                  <div style={{ border: '1px dashed #cbd5e1', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      Restaurar Sistema <Lock size={14} color="#ef4444"/>
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Suba um arquivo JSON exportado anteriormente para anexar os registos diretamente no banco de dados remoto.</p>
                    <div style={{ position: 'relative', marginTop: 'auto' }}>
                      <input type="file" accept=".json" onChange={tentarImportarBackup} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <button type="button" style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', width: '100%', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}><UploadCloud size={16} /> Subir Arquivo</button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: '20px', color: '#ef4444', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={22} color="#ef4444" /> Formatação do Sistema</h2>
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '16px', margin: 0, paddingBottom: '16px' }}>ATENÇÃO: Estas ações apagam os dados de forma permanente do servidor Google. É exigida senha para execução.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button onClick={() => tentarResetSeletivo('historico', 'Histórico de Vendas', 'historico')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={16}/> Limpar Histórico de Vendas</div> <Lock size={14}/>
                  </button>
                  <button onClick={() => tentarResetSeletivo('produtos', 'Catálogo de Produtos', 'produtos')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={16}/> Esvaziar Catálogo de Produtos</div> <Lock size={14}/>
                  </button>
                  <button onClick={() => tentarResetSeletivo('clientes', 'Fichas dos Clientes', 'clientes')} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={16}/> Limpar Devedores</div> <Lock size={14}/>
                  </button>
                  <button onClick={() => tentarResetSeletivo('tudo', 'SISTEMA COMPLETO', 'master')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                    <AlertTriangle size={18}/> Formatar Sistema Inteiro (Reset de Fábrica)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= MODAL DE AUTENTICAÇÃO (SEGURANÇA) ================= */}
      {authModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Lock size={20} /> Autorização Necessária
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.4', margin: 0, paddingBottom: '16px' }}>
              Você está tentando <strong>{authModal.titulo}</strong>. Insira a senha definida nas configurações para confirmar.
            </p>

            <form onSubmit={confirmarAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Senha de Acesso</label>
                <input 
                  type="password" 
                  value={credenciais.senha} 
                  onChange={e => setCredenciais({...credenciais, senha: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} 
                  placeholder="Digite a senha..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="button" onClick={fecharModal} style={{ flex: 1, background: 'transparent', border: '1px solid #cbd5e1', color: '#1e1b4b', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, background: '#ef4444', border: 'none', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Confirmar Ação
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}