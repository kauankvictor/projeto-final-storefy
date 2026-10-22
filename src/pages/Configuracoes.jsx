import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, Download, AlertTriangle, Store, User, Key, Save, Lock, X, Settings, EyeOff, Plus, Palette, Share2, Globe, Link as LinkIcon, FileText, UploadCloud, Unlock, RefreshCw, Upload, Trash2, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
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
  const [dadosSeguranca, setDadosSeguranca] = useState({ 
    emailRecuperacao: '', 
    senhaProprietario: '', 
    senhaGerente: '', 
    senhaVendedor: '', 
    codigoAtual: '' 
  })
  
  // Inputs Temporários do Cofre
  const [inputSenhaAcesso, setInputSenhaAcesso] = useState('')
  const [inputEmail, setInputEmail] = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  
  // Inputs de novas senhas
  const [novaSenhaProprietario, setNovaSenhaProprietario] = useState('')
  const [novaSenhaGerente, setNovaSenhaGerente] = useState('')
  const [novaSenhaVendedor, setNovaSenhaVendedor] = useState('')

  // Sistema de Protocolo de Segurança Crítica
  const [modalCritico, setModalCritico] = useState({
    aberto: false,
    acao: '', 
    step: 1,
    codigoSegurancaGerado: '',
    arquivoSelecionado: null
  })
  
  const [inputsCriticos, setInputsCriticos] = useState({ senha: '', email: '', codigo: '' })
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
        if (docSnapSeg.exists()) {
          const segData = docSnapSeg.data()
          setDadosSeguranca({
            emailRecuperacao: segData.emailRecuperacao || '',
            senhaProprietario: segData.senhaProprietario || segData.senhaMaster || '',
            senhaGerente: segData.senhaGerente || '',
            senhaVendedor: segData.senhaVendedor || '',
            codigoAtual: segData.codigoAtual || ''
          })
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
    const senhaRequerida = dadosSeguranca.senhaProprietario ? dadosSeguranca.senhaProprietario : '0000'
    
    if (inputSenhaAcesso === senhaRequerida) {
      if (!dadosSeguranca.senhaProprietario) {
        setStatusCofre('primeiro_acesso')
      } else {
        setStatusCofre('desbloqueado')
      }
      setInputSenhaAcesso('')
      mostrarAlerta('sucesso', 'Acesso Total liberado.')
    } else {
      mostrarAlerta('erro', 'Senha de Proprietário incorreta!')
      setInputSenhaAcesso('')
    }
  }

  const handleConfigurarSenhasCofre = async (e) => {
    e.preventDefault()
    if(!inputEmail || !novaSenhaProprietario) return mostrarAlerta('erro', 'Preencha o e-mail e a senha do proprietário obrigatoriamente.')
    
    setStatus({ tipo: 'info', msg: 'Registrando credenciais de acesso...' })
    try {
      const novosDados = { 
        emailRecuperacao: inputEmail, 
        senhaProprietario: novaSenhaProprietario, 
        senhaGerente: novaSenhaGerente,
        senhaVendedor: novaSenhaVendedor,
        codigoAtual: '' 
      }
      await setDoc(doc(db, "configuracoes", "seguranca"), novosDados)
      setDadosSeguranca(novosDados)
      setStatusCofre('desbloqueado')
      setInputEmail('')
      setNovaSenhaProprietario('')
      setNovaSenhaGerente('')
      setNovaSenhaVendedor('')
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
      mostrarAlerta('sucesso', 'Código validado! Crie a nova senha de Proprietário.')
    } else {
      mostrarAlerta('erro', 'Código inválido ou expirado.')
    }
  }

  const handleSalvarNovaSenhaRedefinida = async (e) => {
    e.preventDefault()
    try {
      await updateDoc(doc(db, "configuracoes", "seguranca"), { senhaProprietario: novaSenhaProprietario, codigoAtual: '' })
      setDadosSeguranca({ ...dadosSeguranca, senhaProprietario: novaSenhaProprietario, codigoAtual: '' })
      setStatusCofre('desbloqueado')
      setNovaSenhaProprietario('')
      mostrarAlerta('sucesso', 'Nova senha do Proprietário salva com sucesso!')
    } catch (error) {
      mostrarAlerta('erro', 'Erro ao salvar nova senha.')
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

  // ========================== PROTOCOLO DE SEGURANÇA CRÍTICA ==========================

  const abrirModalCritico = (acao, arquivo = null) => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase()
    
    setModalCritico({
      aberto: true,
      acao: acao,
      step: 1,
      codigoSegurancaGerado: randomCode.substring(0, 16), // Max 16-20 chars
      arquivoSelecionado: arquivo
    })
    setInputsCriticos({ senha: '', email: '', codigo: '' })
  }

  const fecharModalCritico = () => {
    setModalCritico({ aberto: false, acao: '', step: 1, codigoSegurancaGerado: '', arquivoSelecionado: null })
    setInputsCriticos({ senha: '', email: '', codigo: '' })
  }

  const avancarPassoCritico = (e) => {
    e.preventDefault()
    
    if (modalCritico.step === 1) {
      setModalCritico({ ...modalCritico, step: 2 })
    } 
    else if (modalCritico.step === 2) {
      if (inputsCriticos.senha === dadosSeguranca.senhaProprietario) {
        setModalCritico({ ...modalCritico, step: 3 })
      } else {
        alert("Senha do Proprietário incorreta. Acesso Negado.")
        fecharModalCritico()
      }
    } 
    else if (modalCritico.step === 3) {
      if (inputsCriticos.email === dadosSeguranca.emailRecuperacao) {
        setModalCritico({ ...modalCritico, step: 4 })
      } else {
        alert("E-mail não confere com o registrado no Cofre. Acesso Negado.")
        fecharModalCritico()
      }
    } 
    else if (modalCritico.step === 4) {
      if (inputsCriticos.codigo === modalCritico.codigoSegurancaGerado) {
        executarAcaoCriticaFinal()
      } else {
        alert("Código de segurança inválido. Ação abortada.")
        fecharModalCritico()
      }
    }
  }

  const executarAcaoCriticaFinal = async () => {
    setStatus({ tipo: 'info', msg: 'Processando ação crítica, aguarde não feche a janela...' })
    
    try {
      if (modalCritico.acao === 'limpar_historico') {
        const querySnapshot = await getDocs(collection(db, "historico"))
        const promessas = querySnapshot.docs.map(d => deleteDoc(doc(db, "historico", d.id)))
        await Promise.all(promessas)
        mostrarAlerta('sucesso', 'Histórico de vendas apagado permanentemente com sucesso!')
      } 
      
      else if (modalCritico.acao === 'upar_json') {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const dados = JSON.parse(event.target.result)
            if (dados.storefy_produtos) {
              for (let prod of dados.storefy_produtos) {
                const docId = prod.id || Math.random().toString(36).substring(2)
                const cleanProd = { ...prod }
                delete cleanProd.id
                await setDoc(doc(db, "produtos", docId), cleanProd, { merge: true })
              }
            }
            if (dados.storefy_clientes) {
              for (let cli of dados.storefy_clientes) {
                const docId = cli.id || Math.random().toString(36).substring(2)
                const cleanCli = { ...cli }
                delete cleanCli.id
                await setDoc(doc(db, "clientes", docId), cleanCli, { merge: true })
              }
            }
            mostrarAlerta('sucesso', 'Arquivo JSON mesclado com sucesso sem apagar dados atuais!')
          } catch(e) {
            mostrarAlerta('erro', 'Erro ao ler arquivo JSON para mesclagem.')
          }
        }
        reader.readAsText(modalCritico.arquivoSelecionado)
      } 
      
      else if (modalCritico.acao === 'restaurar_sistema') {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const dados = JSON.parse(event.target.result)
            
            // 1. Limpeza total antes de restaurar
            const colecoes = ["produtos", "historico", "clientes"]
            for (let c of colecoes) {
              const snapshot = await getDocs(collection(db, c))
              const promessasDelete = snapshot.docs.map(d => deleteDoc(doc(db, c, d.id)))
              await Promise.all(promessasDelete)
            }

            // 2. Inserção dos novos dados puros
            if (dados.storefy_produtos) {
              for (let prod of dados.storefy_produtos) {
                const docId = prod.id || Math.random().toString(36).substring(2)
                const cleanProd = { ...prod }
                delete cleanProd.id
                await setDoc(doc(db, "produtos", docId), cleanProd)
              }
            }
            if (dados.storefy_clientes) {
              for (let cli of dados.storefy_clientes) {
                const docId = cli.id || Math.random().toString(36).substring(2)
                const cleanCli = { ...cli }
                delete cleanCli.id
                await setDoc(doc(db, "clientes", docId), cleanCli)
              }
            }
            if (dados.storefy_historico) {
              for (let hist of dados.storefy_historico) {
                const docId = hist.id || Math.random().toString(36).substring(2)
                const cleanHist = { ...hist }
                delete cleanHist.id
                await setDoc(doc(db, "historico", docId), cleanHist)
              }
            }
            if (dados.storefy_dados_loja) {
              await setDoc(doc(db, "configuracoes", "loja"), dados.storefy_dados_loja)
            }

            mostrarAlerta('sucesso', 'Restauração concluída! O sistema foi formatado e recuperado do arquivo.')
          } catch(e) {
            mostrarAlerta('erro', 'Erro ao formatar e restaurar o sistema via JSON.')
          }
        }
        reader.readAsText(modalCritico.arquivoSelecionado)
      }
    } catch (error) {
      console.error(error)
      mostrarAlerta('erro', 'Ocorreu um erro ao processar a ação crítica.')
    } finally {
      fecharModalCritico()
    }
  }

  const getTextoAvisoCritico = (acao) => {
    if (acao === 'limpar_historico') return "Você está prestes a APAGAR TODO O HISTÓRICO DE VENDAS. Esta ação excluirá permanentemente todos os registros de movimentação do caixa e não poderá ser desfeita de forma alguma."
    if (acao === 'upar_json') return "Você está prestes a MESCLAR UM ARQUIVO JSON aos dados atuais. Isso adicionará e atualizará informações no seu banco de dados atual, podendo sobrepor itens que tenham códigos ou nomes idênticos."
    if (acao === 'restaurar_sistema') return "Você está prestes a RESTAURAR O SISTEMA COMPLETO. ATENÇÃO MÁXIMA: Todos os seus produtos, clientes e histórico de vendas ATUAIS SERÃO APAGADOS PERMANENTEMENTE e substituídos exclusivamente pelos dados do arquivo JSON enviado."
    return ""
  }

  const getTituloCritico = (acao) => {
    if (acao === 'limpar_historico') return "Limpar Histórico de Vendas"
    if (acao === 'upar_json') return "Mesclar Dados (Upar JSON)"
    if (acao === 'restaurar_sistema') return "Restauração Extrema do Sistema"
    return "Ação de Segurança"
  }

  // Tratadores de input file
  const handleFileUparJson = (e) => {
    if (e.target.files[0]) {
      abrirModalCritico('upar_json', e.target.files[0])
      e.target.value = '' 
    }
  }

  const handleFileRestaurar = (e) => {
    if (e.target.files[0]) {
      abrirModalCritico('restaurar_sistema', e.target.files[0])
      e.target.value = '' 
    }
  }


  const SidebarBtn = ({ id, icon, texto }) => (
    <button 
      onClick={() => {
        setAbaAtiva(id)
        if(id !== 'seguranca' && statusCofre === 'desbloqueado') setStatusCofre('trancado')
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh', paddingBottom: '40px', boxSizing: 'border-box', width: '100%', position: 'relative' }}>
      
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
                    {!dadosSeguranca.senhaProprietario ? 'Use a senha padrão 0000 para entrar no sistema pela primeira vez e cadastrar suas senhas hierárquicas.' : 'Digite a Senha do Proprietário para liberar o Cofre de Segurança.'}
                  </p>
                  
                  <form onSubmit={handleDesbloquearCofre} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px', marginTop: '12px' }}>
                    <input type="password" value={inputSenhaAcesso} onChange={e => setInputSenhaAcesso(e.target.value)} placeholder="Senha do Proprietário" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', textAlign: 'center' }} />
                    <button type="submit" style={{ background: '#1e1b4b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Unlock size={16} /> Abrir Cofre</button>
                    {dadosSeguranca.senhaProprietario && (
                      <button type="button" onClick={() => setStatusCofre('pedir_email')} style={{ background: 'transparent', color: '#2563eb', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '8px', fontWeight: 'bold' }}>Esqueci minha senha</button>
                    )}
                  </form>
                </div>
              )}

              {statusCofre === 'primeiro_acesso' && (
                <div style={{ background: '#f8fafc', padding: isMobile ? '24px' : '32px', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '50%', color: '#2563eb' }}><ShieldCheck size={40} /></div>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Defina suas Credenciais e Senhas</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: 0 }}>
                    Cadastre um E-mail de Recuperação e crie as 3 senhas oficiais do sistema. Apenas a senha do Proprietário desbloqueia este cofre e ações críticas.
                  </p>
                  
                  <form onSubmit={handleConfigurarSenhasCofre} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px', marginTop: '12px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>E-mail Mestre de Recuperação *</label>
                      <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e1b4b' }}>1. Senha do Proprietário (Acesso Total) *</label>
                      <input type="text" value={novaSenhaProprietario} onChange={e => setNovaSenhaProprietario(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e1b4b' }}>2. Senha do Gerente (Opcional)</label>
                      <input type="text" value={novaSenhaGerente} onChange={e => setNovaSenhaGerente(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e1b4b' }}>3. Senha do Vendedor Contratado (Opcional)</label>
                      <input type="text" value={novaSenhaVendedor} onChange={e => setNovaSenhaVendedor(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>Salvar Configurações de Segurança</button>
                  </form>
                </div>
              )}

              {statusCofre === 'pedir_email' && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Recuperação de Senha</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>Digite o e-mail cadastrado no sistema para receber o código de recuperação.</p>
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
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', margin: 0 }}>Criar Nova Senha do Proprietário</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: 0 }}>Digite a nova senha que substituirá a esquecida.</p>
                  <form onSubmit={handleSalvarNovaSenhaRedefinida} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                    <input type="text" value={novaSenhaProprietario} onChange={e => setNovaSenhaProprietario(e.target.value)} placeholder="Nova senha" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Nova Senha</button>
                  </form>
                </div>
              )}

              {statusCofre === 'desbloqueado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '12px 16px', borderRadius: '12px', border: '1px solid #34d399' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={18} /> Cofre Aberto (Proprietário)</span>
                    <button onClick={() => setStatusCofre('trancado')} style={{ background: 'white', border: '1px solid #a7f3d0', color: '#065f46', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Trancar</button>
                  </div>
                  
                  <form onSubmit={handleConfigurarSenhasCofre} style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>E-mail de Recuperação Mestre</label>
                      <input type="email" value={inputEmail || dadosSeguranca.emailRecuperacao} onChange={e => setInputEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#b91c1c' }}>1. Senha Proprietário</label>
                        <input type="text" value={novaSenhaProprietario || dadosSeguranca.senhaProprietario} onChange={e => setNovaSenhaProprietario(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #fca5a5', outline: 'none', fontSize: '14px', color: '#b91c1c', fontWeight: 'bold' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>2. Senha Gerente</label>
                        <input type="text" value={novaSenhaGerente || dadosSeguranca.senhaGerente} onChange={e => setNovaSenhaGerente(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>3. Senha Vendedor</label>
                        <input type="text" value={novaSenhaVendedor || dadosSeguranca.senhaVendedor} onChange={e => setNovaSenhaVendedor(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
                      </div>
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
                
                {/* EXPORTAR DADOS */}
                <div style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={18} color="#2563eb"/> Exportar Dados (Backup Seguro)</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5', maxWidth: '600px' }}>
                    Faça o download de um arquivo JSON contendo todos os dados e cadastros do sistema. Guarde com segurança.
                  </p>
                  <button onClick={exportarBackup} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                    Baixar Arquivo JSON
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  
                  {/* UPAR JSON / MESCLAR */}
                  <div style={{ border: '1px solid #e2e8f0', background: '#ffffff', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UploadCloud size={18} color="#f59e0b" /> Mesclar Arquivo JSON
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                      Adiciona e atualiza informações no sistema a partir de um backup. <strong>Os dados atuais não serão apagados.</strong>
                    </p>
                    <div style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '2px dashed #fcd34d', background: '#fffbeb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', marginTop: 'auto' }}>
                      <UploadCloud size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '600' }}>Toque para mesclar .json</span>
                      <input type="file" accept=".json" onChange={handleFileUparJson} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>

                  {/* RESTAURAR SISTEMA */}
                  <div style={{ border: '1px solid #fecaca', background: '#fff5f5', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', color: '#991b1b', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={18} color="#ef4444" /> Restaurar Sistema
                    </h3>
                    <p style={{ fontSize: '13px', color: '#991b1b', margin: 0, lineHeight: '1.5', opacity: 0.8 }}>
                      <strong>ALERTA DE FORMATAÇÃO:</strong> Isso apagará todos os dados atuais e forçará a substituição pelo arquivo.
                    </p>
                    <div style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '2px dashed #ef4444', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', marginTop: 'auto' }}>
                      <Upload size={24} color="#ef4444" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>Toque para restaurar .json</span>
                      <input type="file" accept=".json" onChange={handleFileRestaurar} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>

                  {/* LIMPAR HISTÓRICO DE VENDAS */}
                  <div style={{ gridColumn: '1 / -1', border: '1px solid #fecaca', background: '#fff5f5', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', marginTop: '10px' }}>
                    <h3 style={{ fontSize: '16px', color: '#991b1b', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={18} color="#ef4444" /> Limpar Todo o Histórico de Vendas
                    </h3>
                    <p style={{ fontSize: '14px', color: '#991b1b', margin: 0, lineHeight: '1.5', maxWidth: '700px', opacity: 0.9 }}>
                      Esta ação apaga os registros do caixa. Ações de segurança máxima exigirão a senha do proprietário, confirmação de e-mail e um código aleatório.
                    </p>
                    <button onClick={() => abrirModalCritico('limpar_historico')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                      <Trash2 size={16} /> Apagar Histórico Agora
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===================== MODAL DE SEGURANÇA CRÍTICA ===================== */}
      {modalCritico.aberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: isMobile ? '24px' : '40px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
            
            <button onClick={fecharModalCritico} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>

            {modalCritico.step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                <div style={{ background: '#fee2e2', padding: '20px', borderRadius: '50%', color: '#ef4444' }}><ShieldAlert size={48} /></div>
                <h2 style={{ fontSize: '22px', color: '#991b1b', margin: 0, fontWeight: '900', textTransform: 'uppercase' }}>{getTituloCritico(modalCritico.acao)}</h2>
                <p style={{ color: '#1e1b4b', fontSize: '16px', lineHeight: '1.6', fontWeight: '600' }}>
                  {getTextoAvisoCritico(modalCritico.acao)}
                </p>
                <button onClick={avancarPassoCritico} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', fontSize: '15px' }}>
                  Estou Ciente, Continuar <ArrowRight size={18} />
                </button>
              </div>
            )}

            {modalCritico.step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                <div style={{ background: '#e0e7ff', padding: '20px', borderRadius: '50%', color: '#4f46e5' }}><Lock size={48} /></div>
                <h2 style={{ fontSize: '22px', color: '#1e1b4b', margin: 0, fontWeight: '900' }}>Etapa 1/3: Senha do Proprietário</h2>
                <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Esta é uma ação restrita. Confirme a senha do proprietário cadastrada no cofre de segurança.</p>
                <form onSubmit={avancarPassoCritico} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input type="password" value={inputsCriticos.senha} onChange={e => setInputsCriticos({...inputsCriticos, senha: e.target.value})} placeholder="Senha do Proprietário" required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '18px', textAlign: 'center', boxSizing: 'border-box' }} />
                  <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '15px' }}>Avançar</button>
                </form>
              </div>
            )}

            {modalCritico.step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                <div style={{ background: '#e0e7ff', padding: '20px', borderRadius: '50%', color: '#4f46e5' }}><User size={48} /></div>
                <h2 style={{ fontSize: '22px', color: '#1e1b4b', margin: 0, fontWeight: '900' }}>Etapa 2/3: Confirmação de E-mail</h2>
                <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Para evitar erros, digite o e-mail de recuperação exatamente como cadastrado no sistema.</p>
                <form onSubmit={avancarPassoCritico} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input type="email" value={inputsCriticos.email} onChange={e => setInputsCriticos({...inputsCriticos, email: e.target.value})} placeholder="E-mail cadastrado" required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '16px', textAlign: 'center', boxSizing: 'border-box' }} />
                  <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '15px' }}>Avançar</button>
                </form>
              </div>
            )}

            {modalCritico.step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '50%', color: '#d97706' }}><ShieldCheck size={48} /></div>
                <h2 style={{ fontSize: '22px', color: '#1e1b4b', margin: 0, fontWeight: '900' }}>Etapa 3/3: Assinatura Digital</h2>
                <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>Digite o código de verificação abaixo para confirmar a execução irreversível da tarefa.</p>
                
                <div style={{ background: '#f8fafc', border: '1px dashed #94a3b8', padding: '16px', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Código de Autorização</span>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e1b4b', marginTop: '8px', letterSpacing: '3px', wordBreak: 'break-all' }}>
                    {modalCritico.codigoSegurancaGerado}
                  </div>
                </div>

                <form onSubmit={avancarPassoCritico} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input type="text" value={inputsCriticos.codigo} onChange={e => setInputsCriticos({...inputsCriticos, codigo: e.target.value})} placeholder="Digite o código acima" required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' }} />
                  <button type="submit" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircle size={18}/> EXECUTAR AÇÃO DEFINITIVA
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}