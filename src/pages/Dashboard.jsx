import { useState, useEffect } from 'react'
import { TrendingUp, Package, AlertTriangle, Clock as ClockIcon, Users, Calendar, ShieldAlert, CheckCircle, ArrowRight, Link as LinkIcon, Plus, ExternalLink, Trash2, X, ClipboardList } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'


import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation() 
  
  
  const [agora, setAgora] = useState(new Date())
  const [linksRapidos, setLinksRapidos] = useState([])
  const [modalLink, setModalLink] = useState(false)
  const [novoLinkNome, setNovoLinkNome] = useState('')
  const [novoLinkUrl, setNovoLinkUrl] = useState('')
  
  const [lembretes, setLembretes] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [metricas, setMetricas] = useState({
    faturamentoHoje: 0,
    totalProdutos: 0,
    estoqueBaixoCount: 0,
    clientesComDebito: 0
  })
  
  const [alertasContas, setAlertasContas] = useState([])
  const [produtosEsgotados, setProdutosEsgotados] = useState([])
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState([]) 

  const [ultimasAtividades, setUltimasAtividades] = useState([])

  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dataFormatada = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const horaFormatada = agora.toLocaleTimeString('pt-BR')

  
  const carregarDadosDoBanco = async () => {
    try {
      // Busca dados em tempo real diretamente do Cloud Firestore
      const queryProdutos = await getDocs(collection(db, "produtos"))
      const produtos = queryProdutos.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const queryHistorico = await getDocs(collection(db, "historico"))
      const historico = queryHistorico.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const queryClientes = await getDocs(collection(db, "clientes"))
      const clientes = queryClientes.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      localStorage.setItem('storefy_produtos', JSON.stringify(produtos))

      const links = JSON.parse(localStorage.getItem('storefy_links')) || []
      const notasSalvas = localStorage.getItem('storefy_lembretes') || ''

      setLinksRapidos(links)
      setLembretes(notesSalvas => notasSalvas)

      // Calcula Faturamento do Dia baseado na data de hoje
      const hojeStr = new Date().toLocaleDateString('pt-BR')
      const faturamentoHoje = historico
        .filter(h => (h.tipo === 'VENDA' || h.tipo === 'FIADO') && h.data === hojeStr)
        .reduce((total, venda) => total + (Number(venda.total) || 0), 0)

      const estoqueBaixo = produtos.filter(p => Number(p.quantidade) === 1)
      const esgotados = produtos.filter(p => Number(p.quantidade) === 0)

      let countClientesDebito = 0
      let listaAlertasVencimento = []
      
      const dataAtual = new Date()
      dataAtual.setHours(0, 0, 0, 0)

      clientes.forEach(cliente => {
        let temDebitoAtivo = false
        const anotacoesCliente = cliente.anotacoes || []
        
        anotacoesCliente.forEach(nota => {
          if (nota.status === 'Pendente') {
            temDebitoAtivo = true
            if (nota.dataVencimento && nota.dataVencimento !== 'Sem prazo' && nota.dataVencimento.includes('/')) {
              const [dia, mes, ano] = nota.dataVencimento.split('/')
              const dataVencimentoNota = new Date(ano, mes - 1, dia)
              const diffDias = Math.ceil((dataVencimentoNota - dataAtual) / (1000 * 60 * 60 * 24))

              if (diffDias < 0) {
                listaAlertasVencimento.push({ clienteNome: cliente.nome, texto: nota.texto, prazo: nota.dataVencimento, status: 'Atrasado', cor: '#ef4444' })
              } else if (diffDias <= 3) { 
                listaAlertasVencimento.push({ clienteNome: cliente.nome, texto: nota.texto, prazo: nota.dataVencimento, status: diffDias === 0 ? 'Vence Hoje' : `Vence em ${diffDias} dias`, cor: '#f59e0b' })
              }
            }
          }
        })
        if (temDebitoAtivo) countClientesDebito++
      })

      setMetricas({
        faturamentoHoje,
        totalProdutos: produtos.length,
        estoqueBaixoCount: estoqueBaixo.length,
        clientesComDebito: countClientesDebito
      })
      setAlertasContas(listaAlertasVencimento)
      setProdutosEsgotados(esgotados)
      setProdutosEstoqueBaixo(estoqueBaixo) 
      
      // Ordena o histórico para exibir as transações mais recentes no topo
      const historicoOrdenado = historico.sort((a, b) => (b.idRegistro || 0) - (a.idRegistro || 0))
      setUltimasAtividades(historicoOrdenado.slice(0, 5))
    } catch (error) {
      console.error("Erro ao sincronizar painel de controle:", error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosDoBanco()

    window.addEventListener('focus', carregarDadosDoBanco)
    return () => window.removeEventListener('focus', carregarDadosDoBanco)
  }, [location.pathname, location.key])

  const handleSalvarLink = (e) => {
    e.preventDefault()
    if (!novoLinkNome.trim() || !novoLinkUrl.trim()) return

    let urlCorrigida = novoLinkUrl
    if (!urlCorrigida.startsWith('http')) {
      urlCorrigida = 'https://' + urlCorrigida
    }

    const novoLink = { id: Date.now(), nome: novoLinkNome, url: urlCorrigida }
    const listaAtualizada = [...linksRapidos, novoLink]
    
    setLinksRapidos(listaAtualizada)
    localStorage.setItem('storefy_links', JSON.stringify(listaAtualizada))
    
    setNovoLinkNome('')
    setNovoLinkUrl('')
    setModalLink(false)
  }

  const handleExcluirLink = (id, nomeLink) => {
    const confirmar = window.confirm(`Deseja mesmo excluir o link de "${nomeLink}"?`)
    if (confirmar) {
      const listaAtualizada = linksRapidos.filter(link => link.id !== id)
      setLinksRapidos(listaAtualizada)
      localStorage.setItem('storefy_links', JSON.stringify(listaAtualizada))
    }
  }

  const handleMudarLembretes = (txt) => {
    setLembretes(txt)
    localStorage.setItem('storefy_lembretes', txt)
  }

  if (carregando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Sincronizando painel operacional com o banco de dados...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box', width: '100%' }}>
      
      {}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '30px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Painel de Controle</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '15px', margin: 0 }}>Resumo financeiro da loja</p>
        </div>
        
        <div style={{ textAlign: isMobile ? 'center' : 'right', background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: isMobile ? '100%' : 'auto' }}>
          <p style={{ color: '#475569', fontWeight: '600', fontSize: '13px', textTransform: 'capitalize', margin: 0 }}>{dataFormatada}</p>
          <p style={{ color: '#4f46e5', fontWeight: '900', fontSize: '24px', marginTop: '2px', letterSpacing: '1px', margin: 0 }}>{horaFormatada}</p>
        </div>
      </header>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
        
        <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#d1fae5', color: '#059669', padding: '8px', borderRadius: '8px', display: 'flex' }}><TrendingUp size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Vendas Hoje</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metricas.faturamentoHoje)}
          </h2>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '8px', display: 'flex' }}><Users size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Devedores</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>{metricas.clientesComDebito}</h2>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '8px', display: 'flex' }}><AlertTriangle size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Estoque Baixo</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>{metricas.estoqueBaixoCount}</h2>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px', borderRadius: '8px', display: 'flex' }}><Package size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Produtos</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>{metricas.totalProdutos}</h2>
        </div>

      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start', width: '100%' }}>
        
        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          
          <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', margin: 0 }}>
                <LinkIcon size={18} color="#4f46e5" /> Links favoritos
              </h3>
              <button onClick={() => setModalLink(true)} style={{ background: '#f1f5f9', color: '#4f46e5', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16}/> Adicionar
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {linksRapidos.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Adicione seus atalhos</p>
              ) : (
                linksRapidos.map(link => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <a href={link.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#1e1b4b', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.nome} <ExternalLink size={14} color="#64748b"/>
                    </a>
                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', flexShrink: 0 }}></div>
                    <button onClick={() => handleExcluirLink(link.id, link.nome)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '0' }}><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: 'white', padding: isMobile ? '16px' : '28px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingBottom: '12px' }}>
              <ClockIcon size={20} color="#4f46e5" /> Atividades Recentes do Sistema
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ultimasAtividades.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px', margin: 0 }}>Nenhuma movimentação recente localizada.</p>
              ) : (
                ultimasAtividades.map((atividade) => (
                  <div key={atividade.idRegistro} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: '16px 0', borderBottom: '1px solid #f8fafc', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '8px' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e1b4b' }}>
                        {atividade.tipo === 'VENDA' ? 'Venda Concluída' : (atividade.tipo === 'FIADO' ? 'Venda Fiado Registrada' : 'Atualização de Sistema')}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        {atividade.total 
                          ? `Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(atividade.total)} via ${atividade.formaPagamento || 'Não inf.'}`
                          : `Modificação aplicada nos registros do estoque.`
                        }
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', color: '#94a3b8', fontSize: '11px', gap: isMobile ? '8px' : '2px', width: isMobile ? '100%' : 'auto', borderTop: isMobile ? '1px dashed #e2e8f0' : 'none', paddingTop: isMobile ? '6px' : '0' }}>
                      <span>{atividade.data}</span>
                      {!isMobile && <ClockIcon size={10} style={{ display: 'none' }} />}
                      <span>{atividade.hora}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BOTÕES DE ATALHO RÁPIDO RESPONSIVOS */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', width: '100%' }}>
            <button onClick={() => navigate('/venda')} style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)', fontSize: '15px' }}>
              <span>Ir para Frente de Caixa</span> <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/clientes')} style={{ background: '#fff', color: '#1e1b4b', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px' }}>
              <span>Gerenciar Clientes</span> <ArrowRight size={18} color="#4f46e5" />
            </button>
          </div>

        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          
          <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingBottom: '8px' }}>
              <ClipboardList size={18} color="#4f46e5" /> Anotações e Lembretes
            </h3>
            <textarea 
              value={lembretes}
              onChange={(e) => handleMudarLembretes(e.target.value)}
              placeholder="..."
              style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', background: '#f8fafc', color: '#1e1b4b', lineHeight: '1.4', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, paddingBottom: '4px' }}>
              <Calendar size={18} color="#4f46e5" /> Avisos de Devedores
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alertasContas.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#d1fae5', color: '#069669', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '500' }}>
                  <CheckCircle size={18} /> Nenhuma pendência em atraso hoje!
                </div>
              ) : (
                alertasContas.map((alerta, index) => (
                  <div key={index} style={{ borderLeft: `4px solid ${alerta.cor}`, background: '#f8fafc', padding: '12px 14px', borderRadius: '0 12px 12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alerta.clienteNome}</strong>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: alerta.cor, textTransform: 'uppercase', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${alerta.cor}`, flexShrink: 0 }}>{alerta.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alerta.texto}</p>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Prazo: {alerta.prazo}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {}
          {produtosEstoqueBaixo.length > 0 && (
            <div style={{ background: '#fffbeb', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #fde68a', boxSizing: 'border-box', width: '100%' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#b45309', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                <AlertTriangle size={18} color="#d97706" /> Estoque Crítico (1 un.)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {produtosEstoqueBaixo.map(p => (
                  <div key={`baixo-${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #fcd34d' }}>
                    <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.nome}</span>
                    <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a', flexShrink: 0 }}>Comprar</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              <ShieldAlert size={18} color="#ef4444" /> Itens Esgotados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {produtosEsgotados.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>Nenhum produto zerado no estoque.</p>
              ) : (
                produtosEsgotados.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f1f5f9' }}>
                    <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{p.nome}</span>
                    <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>Repor</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {}
      {modalLink && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: isMobile ? '24px' : '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Novo Link Rápido</h2>
              <button onClick={() => setModalLink(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSalvarLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Nome do Link</label>
                <input type="text" required value={novoLinkNome} onChange={(e) => setNovoLinkNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>URL / Endereço</label>
                <input type="text" required value={novoLinkUrl} onChange={(e) => setNovoLinkUrl(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '8px' }}>
                Salvar Link
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}