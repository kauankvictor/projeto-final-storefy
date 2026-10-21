import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, Download, AlertTriangle, Store, User, Key, Save, Lock, X, Settings, EyeOff, Plus, Palette, Share2, Globe, Link as LinkIcon, FileText, UploadCloud, Unlock, RefreshCw, Upload } from 'lucide-react'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Configuracoes() {
  const location = useLocation()
  const [status, setStatus] = useState({ tipo: '', msg: '' })
  const [abaAtiva, setAbaAtiva] = useState('loja')
  
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: '', cnpj: '', endereco: '', ceo: '', telefone: '', email: '', chavePix: '', comandos: '', mapaUrl: ''
  })

  // Catálogo
  const [catalogoAtivo, setCatalogoAtivo] = useState(true)
  const [corCatalogo, setCorCatalogo] = useState('#2563eb')
  const [nomeCatalogo, setNomeCatalogo] = useState('Storefy')
  const [lojaAberta, setLojaAberta] = useState(true)
  const [infoEntrega, setInfoEntrega] = useState('')
  const [msgWhatsApp, setMsgWhatsApp] = useState('Olá! Gostaria de fazer o seguinte pedido:')
  const [whatsappPedidos, setWhatsappPedidos] = useState('')
  const [redesSociais, setRedesSociais] = useState({ instagram: '', facebook: '', tiktok: '' })
  const [banners, setBanners] = useState([])

  // Vendedores
  const [listaVendedores, setListaVendedores] = useState([])
  const [novoVendedor, setNovoVendedor] = useState('')

  // Sistema do Cofre de Segurança
  const [statusCofre, setStatusCofre] = useState('carregando')
  const [dadosSeguranca, setDadosSeguranca] = useState({ emailRecuperacao: '', senhaMaster: '', codigoAtual: '' })
  
  // Inputs Temporários do Cofre
  const [inputSenha, setInputSenha] = useState('')
  const [inputEmail, setInputEmail] = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [inputNovaSenha, setInputNovaSenha] = useState('')

  // Restauração do Sistema
  const [restoreDestrancado, setRestoreDestrancado] = useState(false)
  const [senhaRestore, setSenhaRestore] = useState('')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    if (location.state && location.state.aba) {
      setAbaAtiva(location.state.aba)
    }
  }, [location])

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
          if(dadosDB.catalogoAtivo !== undefined) setCatalogoAtivo(dadosDB.catalogoAtivo)
          if(dadosDB.corPrincipal) setCorCatalogo(dadosDB.corPrincipal)
          if(dadosDB.nomeCatalogo) setNomeCatalogo(dadosDB.nomeCatalogo)
          if(dadosDB.lojaAberta !== undefined) setLojaAberta(dadosDB.lojaAberta)
          if(dadosDB.infoEntrega) setInfoEntrega(dadosDB.infoEntrega)
          if(dadosDB.msgWhatsApp) setMsgWhatsApp(dadosDB.msgWhatsApp)
          if(dadosDB.whatsappPedidos) setWhatsappPedidos(dadosDB.whatsappPedidos)
          if(dadosDB.redesSociais) setRedesSociais(dadosDB.redesSociais)
          if(dadosDB.banners) setBanners(dadosDB.banners)
        }

        const docRefVendedores = doc(db, "configuracoes", "vendedores")
        const docSnapVendedores = await getDoc(docRefVendedores)
        if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
          setListaVendedores(docSnapVendedores.data().lista)
        }

        const docRefSeg = doc(db, "configuracoes", "seguranca")
        const docSnapSeg = await getDoc(docRefSeg)
        if (docSnapSeg.exists() && docSnapSeg.data().senhaMaster) {
          setDadosSeguranca(docSnapSeg.data())
        }
        setStatusCofre('trancado')

      } catch (error) {
        console.error("Erro ao carregar do servidor:", error)
        setStatusCofre('trancado')
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

  const handleSalvarLoja = async (e) => {
    e.preventDefault()
    setStatus({ tipo: 'info', msg: 'A salvar dados na nuvem...' })
    try {
      const dadosParaSalvar = {
        ...dadosLoja,
        catalogoAtivo, corPrincipal: corCatalogo, nomeCatalogo, lojaAberta,
        infoEntrega, msgWhatsApp, whatsappPedidos, redesSociais, banners
      }
      await setDoc(doc(db, "configuracoes", "loja"), dadosParaSalvar)
      await setDoc(doc(db, "configuracoes", "vendedores"), { lista: listaVendedores })
      mostrarAlerta('sucesso', 'Configurações atualizadas com sucesso no servidor!')
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Erro ao salvar os dados da loja.')
    }
  }

  const processarBanners = async (e) => {
    const files = Array.from(e.target.files)
    if (banners.length + files.length > 4) {
      mostrarAlerta('erro', 'Você pode adicionar no máximo 4 banners promocionais.')
      return
    }

    const promessas = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxW = 900 
            let width = img.width
            let height = img.height
            if (width > maxW) { height *= maxW / width; width = maxW }
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.6))
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      })
    })

    const novosBanners = await Promise.all(promessas)
    setBanners(prev => [...prev, ...novosBanners])
  }

  const removerBanner = (indexParaRemover) => {
    setBanners(prev => prev.filter((_, index) => index !== indexParaRemover))
  }

  const handleDesbloquearCofre = (e) => {
    e.preventDefault()
    const senhaRequerida = dadosSeguranca.senhaMaster ? dadosSeguranca.senhaMaster : '0000'
    
    if (inputSenha === senhaRequerida) {
      if (!dadosSeguranca.senhaMaster) {
        setStatusCofre('primeiro_acesso')
      } else {
        setStatusCofre('desbloqueado')
      }
      setInputSenha('')
      mostrarAlerta('sucesso', 'Acesso liberado.')
    } else {
      mostrarAlerta('erro', 'Senha incorreta!')
      setInputSenha('')
    }
  }

  const handleConfigurarPrimeiroCofre = async (e) => {
    e.preventDefault()
    if(!inputEmail || !inputNovaSenha) return mostrarAlerta('erro', 'Preencha e-mail e senha.')
    
    setStatus({ tipo: 'info', msg: 'Registrando credenciais...' })
    try {
      const novosDados = { emailRecuperacao: inputEmail, senhaMaster: inputNovaSenha, codigoAtual: '' }
      await setDoc(doc(db, "configuracoes", "seguranca"), novosDados)
      setDadosSeguranca(novosDados)
      setStatusCofre('desbloqueado')
      setInputEmail('')
      setInputNovaSenha('')
      mostrarAlerta('sucesso', 'Credenciais cadastradas com sucesso!')
    } catch (error) {
      mostrarAlerta('erro', 'Erro ao configurar segurança.')
    }
  }

  const handleIniciarRecuperacao = async (e) => {
    e.preventDefault()
    if (!dadosSeguranca.emailRecuperacao) {
      return mostrarAlerta('erro', 'Nenhum e-mail de recuperação foi cadastrado ainda.')
    }
    if (inputEmail !== dadosSeguranca.emailRecuperacao) {
      return mostrarAlerta('erro', 'E-mail não confere com o cadastrado.')
    }

    const codigoGerado = Math.floor(100000 + Math.random() * 900000).toString()
    
    try {
      await updateDoc(doc(db, "configuracoes", "seguranca"), { codigoAtual: codigoGerado })
      setDadosSeguranca({ ...dadosSeguranca, codigoAtual: codigoGerado })
      setStatusCofre('validar_codigo')
      
      alert(`[SIMULAÇÃO DE E-MAIL]\nPara: ${inputEmail}\nSeu código de verificação é: ${codigoGerado}`)
      mostrarAlerta('sucesso', 'Código enviado para seu e-mail!')
    } catch (error) {
      mostrarAlerta('erro', 'Erro ao gerar código.')
    }
  }

  const handleValidarCodigo = (e) => {
    e.preventDefault()
    if (inputCodigo === dadosSeguranca.codigoAtual) {
      setStatusCofre('redefinir_senha')
      setInputCodigo('')
      mostrarAlerta('sucesso', 'Código validado! Crie a nova senha.')
    } else {
      mostrarAlerta('erro', 'Código inválido ou expirado.')
    }
  }

  const handleSalvarNovaSenhaRedefinida = async (e) => {
    e.preventDefault()
    try {
      await updateDoc(doc(db, "configuracoes", "seguranca"), { senhaMaster: inputNovaSenha, codigoAtual: '' })
      setDadosSeguranca({ ...dadosSeguranca, senhaMaster: inputNovaSenha, codigoAtual: '' })
      setStatusCofre('desbloqueado')
      setInputNovaSenha('')
      mostrarAlerta('sucesso', 'Nova senha salva com sucesso!')
    } catch (error) {
      mostrarAlerta('erro', 'Erro ao salvar nova senha.')
    }
  }

  const handleDesbloquearRestore = (e) => {
    e.preventDefault()
    const senhaRequerida = dadosSeguranca.senhaMaster ? dadosSeguranca.senhaMaster : '0000'
    if (senhaRestore === senhaRequerida) {
      setRestoreDestrancado(true)
      setSenhaRestore('')
      mostrarAlerta('sucesso', 'Restauração de sistema desbloqueada.')
    } else {
      mostrarAlerta('erro', 'Senha incorreta para restauração!')
      setSenhaRestore('')
    }
  }

  const exportarBackup = async () => {
    setStatus({ tipo: 'info', msg: 'Gerando cópia de segurança. Aguarde...' })
    try {
      const queryProdutos = await getDocs(collection(db, "produtos"))
      const produtos = queryProdutos.docs.map(d => ({ id: d.id, ...d.data() }))
      
      const queryHistorico = await getDocs(collection(db, "historico"))
      const historico = queryHistorico.docs.map(d => ({ id: d.id, ...d.data() }))
      
      const queryClientes = await getDocs(collection(db, "clientes"))
      const clientes = queryClientes.docs.map(d => ({ id: d.id, ...d.data() }))
      
      const docSnapLoja = await getDoc(doc(db, "configuracoes", "loja"))
      const dadosLojaBanco = docSnapLoja.exists() ? docSnapLoja.data() : {}
      
      const docSnapVendedores = await getDoc(doc(db, "configuracoes", "vendedores"))
      const dadosVendedoresBanco = docSnapVendedores.exists() ? docSnapVendedores.data() : { lista: [] }

      const dadosBackup = { 
        storefy_produtos: produtos, 
        storefy_historico: historico, 
        storefy_clientes: clientes, 
        storefy_dados_loja: dadosLojaBanco, 
        storefy_vendedores: dadosVendedoresBanco 
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup, null, 2))
      const downloadAnchor = document.createElement('a')
      const dataAtual = new Date().toLocaleDateString('pt-BR').replaceAll('/', '_')
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

  const processarRestoreJSON = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setStatus({ tipo: 'info', msg: 'Iniciando restauração de dados...' })
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const dados = JSON.parse(event.target.result)
        
        if (dados.storefy_produtos && Array.isArray(dados.storefy_produtos)) {
          for (let prod of dados.storefy_produtos) {
            const docId = prod.id || Math.random().toString(36).substring(2)
            const cleanProd = { ...prod }
            delete cleanProd.id
            await setDoc(doc(db, "produtos", docId), cleanProd)
          }
        }
        
        if (dados.storefy_clientes && Array.isArray(dados.storefy_clientes)) {
          for (let cli of dados.storefy_clientes) {
            const docId = cli.id || Math.random().toString(36).substring(2)
            const cleanCli = { ...cli }
            delete cleanCli.id
            await setDoc(doc(db, "clientes", docId), cleanCli)
          }
        }

        if (dados.storefy_dados_loja) {
          await setDoc(doc(db, "configuracoes", "loja"), dados.storefy_dados_loja)
        }

        setRestoreDestrancado(false)
        mostrarAlerta('sucesso', 'Sistema restaurado com sucesso! Recarregue a página.')
      } catch (error) {
        console.error(error)
        mostrarAlerta('erro', 'Erro na restauração. Verifique o arquivo JSON.')
      }
    }
    reader.readAsText(file)
  }

  const SidebarBtn = ({ id, icon, texto }) => (
    <button 
      onClick={() => {
        setAbaAtiva(id)
        if(id !== 'seguranca' && statusCofre === 'desbloqueado') setStatusCofre('trancado')
        if(id !== 'manutencao') setRestoreDestrancado(false)
      }} 
      style={{ 
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px', 
        borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
        textAlign: 'left', transition: '0.2s',
        background: abaAtiva === id ? '#2563eb' : 'transparent',
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
        <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Gerencie as informações e manutenções do Storefy</p>
      </header>

      {status.msg && (
        <div style={{ background: status.tipo === 'sucesso' ? '#d1fae5' : (status.tipo === 'info' ? '#dbeafe' : '#fee2e2'), color: status.tipo === 'sucesso' ? '#069669' : (status.tipo === 'info' ? '#2563eb' : '#ef4444'), padding: '16px', borderRadius: '12px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.tipo === 'sucesso' ? <ShieldCheck size={20}/> : <AlertTriangle size={20}/>} {status.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
        
        <div style={{ width: isMobile ? '100%' : '250px', flexShrink: 0, display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '10px' : '0' }}>
          <SidebarBtn id="loja" icon={<Store size={18}/>} texto="Dados da Loja" />
          <SidebarBtn id="catalogo" icon={<Palette size={18}/>} texto="Personalizar Catálogo" />
          <SidebarBtn id="seguranca" icon={<Key size={18}/>} texto="Cofre de Segurança" />
          <SidebarBtn id="manutencao" icon={<Settings size={18}/>} texto="Backups de Dados" />
        </div>

        <div style={{ flex: 1, background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', padding: isMobile ? '20px' : '32px', width: '100%', boxSizing: 'border-box' }}>
          
          {abaAtiva === 'loja' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Store size={22} color="#2563eb" /> Perfil Oficial da Loja</h2>
              <form onSubmit={handleSalvarLoja} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Nome da Loja</label>
                  <input type="text" value={dadosLoja.nomeLoja || ''} onChange={e => setDadosLoja({...dadosLoja, nomeLoja: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Nome da loja" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>CNPJ (Opcional)</label>
                  <input type="text" value={dadosLoja.cnpj || ''} onChange={e => setDadosLoja({...dadosLoja, cnpj: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="00.000.000/0000-00" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Responsável (CEO)</label>
                  <input type="text" value={dadosLoja.ceo || ''} onChange={e => setDadosLoja({...dadosLoja, ceo: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Nome do responsavel" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Telefone Comercial</label>
                  <input type="text" value={dadosLoja.telefone || ''} onChange={e => setDadosLoja({...dadosLoja, telefone: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="(00) 00000-0000" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>E-mail Comercial</label>
                  <input type="email" value={dadosLoja.email || ''} onChange={e => setDadosLoja({...dadosLoja, email: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="loja@email.com" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Endereço Físico</label>
                  <input type="text" value={dadosLoja.endereco || ''} onChange={e => setDadosLoja({...dadosLoja, endereco: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Rua, número, bairro, cidade..." />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>Chave Pix Principal</label>
                  <input type="text" value={dadosLoja.chavePix || ''} onChange={e => setDadosLoja({...dadosLoja, chavePix: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="CNPJ, Celular, E-mail..." />
                </div>
                
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
                    <button type="button" onClick={handleAdicionarVendedor} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {listaVendedores.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {listaVendedores.map((vendedor, index) => (
                        <div key={index} style={{ background: '#dbeafe', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {vendedor}
                          <button type="button" onClick={() => handleRemoverVendedor(index)} style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
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
                
                <button type="submit" style={{ gridColumn: '1 / -1', background: '#2563eb', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', marginTop: '8px', width: '100%' }}>
                  <Save size={18} /> Salvar Dados da Loja
                </button>
              </form>
            </div>
          )}

          {abaAtiva === 'catalogo' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={22} color="#2563eb" /> Sistema de Catálogo Online
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Ligue a chave abaixo para exibir a vitrine de produtos para seus clientes.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: catalogoAtivo ? '#e0e7ff' : '#f1f5f9', padding: '10px 16px', borderRadius: '12px', border: `1px solid ${catalogoAtivo ? '#818cf8' : '#cbd5e1'}` }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: catalogoAtivo ? '#3730a3' : '#475569' }}>
                    {catalogoAtivo ? 'Catálogo Ativado' : 'Catálogo Desativado'}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                    <input type="checkbox" checked={catalogoAtivo} onChange={() => setCatalogoAtivo(!catalogoAtivo)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: catalogoAtivo ? '#4f46e5' : '#94a3b8', transition: '.4s', borderRadius: '24px' }}>
                      <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: catalogoAtivo ? '18px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                    </span>
                  </label>
                </div>
              </div>

              <form onSubmit={handleSalvarLoja} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {catalogoAtivo ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: lojaAberta ? '#d1fae5' : '#fee2e2', padding: '10px 16px', borderRadius: '12px', border: `1px solid ${lojaAberta ? '#34d399' : '#f87171'}`, width: 'fit-content' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: lojaAberta ? '#065f46' : '#991b1b' }}>
                          {lojaAberta ? 'Loja Aberta p/ Pedidos' : 'Loja Fechada p/ Pedidos'}
                        </span>
                        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                          <input type="checkbox" checked={lojaAberta} onChange={() => setLojaAberta(!lojaAberta)} style={{ opacity: 0, width: 0, height: 0 }} />
                          <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: lojaAberta ? '#10b981' : '#ef4444', transition: '.4s', borderRadius: '24px' }}>
                            <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: lojaAberta ? '18px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Nome da Loja Exibido no Topo</label>
                      <input type="text" value={nomeCatalogo} onChange={e => setNomeCatalogo(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Ex: Storefy Catálogo" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Cor Principal da Marca</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <input type="color" value={corCatalogo} onChange={e => setCorCatalogo(e.target.value)} style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>{corCatalogo.toUpperCase()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>WhatsApp para Receber Pedidos</label>
                      <input type="text" value={whatsappPedidos} onChange={e => setWhatsappPedidos(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="(00) 00000-0000" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Banners Promocionais (Máx: 4)</label>
                      <div style={{ width: '100%', height: '120px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffffff', position: 'relative', cursor: 'pointer' }}>
                        <UploadCloud size={30} color="#94a3b8" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Toque para adicionar fotos</span>
                        <input type="file" accept="image/*" multiple onChange={processarBanners} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                      </div>
                      
                      {banners.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingTop: '10px' }}>
                          {banners.map((src, index) => (
                            <div key={index} style={{ position: 'relative', width: '120px', height: '60px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={src} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button type="button" onClick={() => removerBanner(index)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Informações de Entrega e Retirada</label>
                      <textarea value={infoEntrega} onChange={e => setInfoEntrega(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} placeholder="Ex: Entregas para toda a cidade com taxa de R$ 5,00. Retiradas na loja das 08h às 18h." />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b' }}>Mensagem Padrão do WhatsApp</label>
                      <input type="text" value={msgWhatsApp} onChange={e => setMsgWhatsApp(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} placeholder="Olá! Gostaria de fazer o seguinte pedido:" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Links de Redes Sociais</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Share2 size={20} color="#e1306c" /><input type="text" value={redesSociais.instagram} onChange={e => setRedesSociais({...redesSociais, instagram: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} placeholder="Link da primeira rede social (ex: Instagram)" /></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={20} color="#2563eb" /><input type="text" value={redesSociais.facebook} onChange={e => setRedesSociais({...redesSociais, facebook: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} placeholder="Link da segunda rede social (ex: Facebook)" /></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LinkIcon size={20} color="#111827" /><input type="text" value={redesSociais.tiktok} onChange={e => setRedesSociais({...redesSociais, tiktok: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} placeholder="Link da terceira rede social (ex: TikTok)" /></div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f1f5f9', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <EyeOff size={40} color="#94a3b8" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', color: '#475569', margin: '0 0 8px 0' }}>Catálogo Oculto</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '400px', display: 'inline-block' }}>O catálogo não será acessível aos clientes. Ative a chave acima para configurar as informações visuais.</p>
                  </div>
                )}

                <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', marginTop: '8px' }}>
                  <Save size={18} /> Salvar Alterações do Catálogo
                </button>
              </form>
            </div>
          )}

          {abaAtiva === 'seguranca' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={22} color="#2563eb" /> Cofre de Segurança</h2>
              
              {statusCofre === 'carregando' && <p style={{ color: '#64748b' }}>Carregando segurança...</p>}

              {statusCofre === 'trancado' && (
                <div style={{ background: '#f8fafc', padding: isMobile ? '24px' : '40px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '50%', color: '#ef4444' }}><Lock size={40} /></div>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Cofre Trancado</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>
                    {!dadosSeguranca.senhaMaster ? 'Use a senha padrão 0000 para entrar no sistema pela primeira vez.' : 'Digite sua Senha Master para alterar os dados.'}
                  </p>
                  
                  <form onSubmit={handleDesbloquearCofre} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px', marginTop: '12px' }}>
                    <input type="password" value={inputSenha} onChange={e => setInputSenha(e.target.value)} placeholder="Digite a Senha" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', textAlign: 'center' }} />
                    <button type="submit" style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Unlock size={16} /> Abrir Cofre</button>
                    {dadosSeguranca.senhaMaster && (
                      <button type="button" onClick={() => setStatusCofre('pedir_email')} style={{ background: 'transparent', color: '#2563eb', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontWeight: 'bold' }}>Esqueci minha senha</button>
                    )}
                  </form>
                </div>
              )}

              {statusCofre === 'primeiro_acesso' && (
                <div style={{ background: '#f8fafc', padding: isMobile ? '24px' : '40px', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '50%', color: '#2563eb' }}><ShieldCheck size={40} /></div>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Defina suas Credenciais</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: 0 }}>Cadastre um E-mail de Recuperação e crie a nova Senha Master definitiva para não usar mais a senha padrão 0000.</p>
                  
                  <form onSubmit={handleConfigurarPrimeiroCofre} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px', marginTop: '12px' }}>
                    <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} placeholder="E-mail de Recuperação" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <input type="text" value={inputNovaSenha} onChange={e => setInputNovaSenha(e.target.value)} placeholder="Criar nova Senha Master" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar e Atualizar</button>
                  </form>
                </div>
              )}

              {statusCofre === 'pedir_email' && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Recuperação de Senha</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>Digite o e-mail cadastrado no sistema para receber o código de 6 dígitos.</p>
                  <form onSubmit={handleIniciarRecuperacao} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                    <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} placeholder="Seu e-mail" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar Código</button>
                    <button type="button" onClick={() => setStatusCofre('trancado')} style={{ background: 'transparent', color: '#64748b', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                  </form>
                </div>
              )}

              {statusCofre === 'validar_codigo' && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Código Enviado</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>Verifique a caixa de entrada do e-mail <strong>{inputEmail}</strong> e digite os 6 números.</p>
                  <form onSubmit={handleValidarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                    <input type="text" value={inputCodigo} onChange={e => setInputCodigo(e.target.value)} placeholder="000000" maxLength={6} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '20px', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} />
                    <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Verificar</button>
                    <button type="button" onClick={() => setStatusCofre('trancado')} style={{ background: 'transparent', color: '#64748b', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar Recuperação</button>
                  </form>
                </div>
              )}

              {statusCofre === 'redefinir_senha' && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Criar Nova Senha Master</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>Digite a nova senha que substituirá a esquecida.</p>
                  <form onSubmit={handleSalvarNovaSenhaRedefinida} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                    <input type="text" value={inputNovaSenha} onChange={e => setInputNovaSenha(e.target.value)} placeholder="Nova senha" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Nova Senha</button>
                  </form>
                </div>
              )}

              {statusCofre === 'desbloqueado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '12px 16px', borderRadius: '12px', border: '1px solid #34d399' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={18} /> Cofre Aberto</span>
                    <button onClick={() => setStatusCofre('trancado')} style={{ background: 'white', border: '1px solid #a7f3d0', color: '#065f46', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Trancar</button>
                  </div>
                  
                  <form onSubmit={handleConfigurarPrimeiroCofre} style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>E-mail de Recuperação</label>
                      <input type="email" value={inputEmail || dadosSeguranca.emailRecuperacao} onChange={e => setInputEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Senha Master Atual</label>
                      <input type="text" value={inputNovaSenha || dadosSeguranca.senhaMaster} onChange={e => setInputNovaSenha(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#b91c1c', fontWeight: 'bold' }} />
                    </div>
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><RefreshCw size={16} /> Atualizar Credenciais</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {abaAtiva === 'manutencao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={22} color="#2563eb" /> Backups e Restauração</h2>
                
                <div style={{ border: '1px dashed #cbd5e1', background: '#f8fafc', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Exportar Dados da Loja (Backup)</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5', maxWidth: '600px' }}>
                    Faça o download de um arquivo JSON contendo todos os dados do sistema. Guarde com segurança.
                  </p>
                  <button onClick={exportarBackup} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginTop: '8px' }}>
                    <Download size={18} /> Baixar Arquivo JSON
                  </button>
                </div>

                <div style={{ border: '1px solid #e2e8f0', background: '#ffffff', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={20} color="#ef4444" /> Restaurar Sistema
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5', maxWidth: '600px' }}>
                    Esta ação sobrescreve os dados atuais do banco utilizando um arquivo de backup anterior.
                  </p>
                  
                  {!restoreDestrancado ? (
                    <form onSubmit={handleDesbloquearRestore} style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <input type="password" value={senhaRestore} onChange={e => setSenhaRestore(e.target.value)} placeholder="Senha Master ou 0000" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                      <button type="submit" style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Liberar Envio</button>
                    </form>
                  ) : (
                    <div style={{ width: '100%', padding: '20px', borderRadius: '8px', border: '2px dashed #ef4444', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', marginTop: '8px' }}>
                      <Upload size={30} color="#ef4444" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '600' }}>Toque para anexar o arquivo .json</span>
                      <input type="file" accept=".json" onChange={processarRestoreJSON} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}