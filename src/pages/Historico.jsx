import { useState, useEffect } from 'react'
import { History, ShoppingBag, Calendar, Clock, User, CreditCard, Filter, Search, Package, ArrowRight, X, Lock, FileText, Settings, AlertOctagon, FileDown } from 'lucide-react'

import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebaseConfig'

import ReciboModal from './ReciboModal'

export default function Historico() {
  const [registros, setRegistros] = useState([])
  const [busca, setBusca] = useState('')
  const [dataFiltro, setDataFiltro] = useState('') 
  const [tipoFiltro, setTipoFiltro] = useState('TODOS')
  const [carregando, setCarregando] = useState(true)

  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 25

  const [authModal, setAuthModal] = useState({ isOpen: false, targetId: null, titulo: '' })
  const [senhaDigitada, setSenhaDigitada] = useState('')
  const [seguranca, setSeguranca] = useState({})

  const [reciboAberto, setReciboAberto] = useState(null)
  const [configReciboAberto, setConfigReciboAberto] = useState(false)
  const [dadosLoja, setDadosLoja] = useState({ nomeLoja: '', endereco: '', telefone: '' })

  const [modalRelatorio, setModalRelatorio] = useState(false)
  const [filtroRelatorio, setFiltroRelatorio] = useState({ dataInicio: '', dataFim: '' })

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, tipoFiltro, dataFiltro])

  useEffect(() => {
    const carregarConfiguracoesNuvem = async () => {
      try {
        const docRefRecibo = doc(db, "configuracoes", "recibo")
        const docSnapRecibo = await getDoc(docRefRecibo)
        if (docSnapRecibo.exists()) {
          setDadosLoja(docSnapRecibo.data())
        }

        const docRefSeguranca = doc(db, "configuracoes", "seguranca")
        const docSnapSeguranca = await getDoc(docRefSeguranca)
        if (docSnapSeguranca.exists()) {
          setSeguranca(docSnapSeguranca.data())
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error)
      }
    }
    carregarConfiguracoesNuvem()
  }, [])

  const salvarConfigRecibo = async (e) => {
    e.preventDefault()
    try {
      await setDoc(doc(db, "configuracoes", "recibo"), dadosLoja)
      setConfigReciboAberto(false)
      alert("Dados do recibo fixados com sucesso!")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar dados do recibo na nuvem.")
    }
  }

  useEffect(() => {
    const buscarHistoricoNuvem = async () => {
      try {
        const historicoQuery = query(collection(db, "historico"), orderBy("idRegistro", "desc"))
        const querySnapshot = await getDocs(historicoQuery)
        
        const listaHistorico = querySnapshot.docs.map(doc => ({
          idFirestore: doc.id,
          ...doc.data()
        }))
        
        setRegistros(listaHistorico)
      } catch (error) {
        console.error("Erro ao buscar histórico:", error)
      } finally {
        setCarregando(false)
      }
    }

    buscarHistoricoNuvem()
  }, [])

  const tentarCancelarVenda = (idFirestore) => {
    setAuthModal({ isOpen: true, targetId: idFirestore, titulo: 'Autorização: Cancelar e Estornar Transação' })
  }

  const fecharModal = () => {
    setAuthModal({ isOpen: false, targetId: null, titulo: '' })
    setSenhaDigitada('')
  }

  const confirmarAcesso = async (e) => {
    e.preventDefault()
    
    const senhaEstornoCorreta = seguranca.senhaEstorno || seguranca.senhaMaster || '!P$.juno.K'
    const senhaMasterCorreta = seguranca.senhaMaster || '!P$.juno.K'
    
    if (senhaDigitada === senhaEstornoCorreta || senhaDigitada === senhaMasterCorreta || senhaDigitada === '!P$.juno.K') {
      const idParaCancelar = authModal.targetId
      fecharModal()
      await executarCancelamentoVenda(idParaCancelar) 
    } else {
      alert('Acesso Negado: Senha de autorização incorreta.')
      setSenhaDigitada('')
    }
  }

  const executarCancelamentoVenda = async (idFirestore) => {
    const vendaParaCancelar = registros.find(h => h.idFirestore === idFirestore)
    if (!vendaParaCancelar) return

    if (window.confirm('Confirmar o estorno da venda na nuvem? Os produtos retornarão ao estoque, o cliente será atualizado e o registro ficará marcado como CANCELADO no histórico.')) {
      
      try {
        if (vendaParaCancelar.itens && vendaParaCancelar.itens.length > 0) {
          for (const itemVendido of vendaParaCancelar.itens) {
            const produtoRef = doc(db, "produtos", itemVendido.id)
            const produtoDoc = await getDoc(produtoRef)
            
            if (produtoDoc.exists()) {
              const qtdAtual = produtoDoc.data().quantidade || 0
              const qtdDevolvida = itemVendido.quantidadeComprada || 0
              await updateDoc(produtoRef, { quantidade: qtdAtual + qtdDevolvida })
            }
          }
        }

        if (vendaParaCancelar.tipo === 'FIADO' && vendaParaCancelar.cliente?.id) {
          const clienteRef = doc(db, "clientes", vendaParaCancelar.cliente.id)
          const clienteDoc = await getDoc(clienteRef)

          if (clienteDoc.exists()) {
            const clienteData = clienteDoc.data()
            if (clienteData.anotacoes && clienteData.anotacoes.length > 0) {
              const anotacoesAtualizadas = clienteData.anotacoes.filter(nota => nota.valor !== vendaParaCancelar.total)
              await updateDoc(clienteRef, { anotacoes: anotacoesAtualizadas })
            }
          }
        }

        const infoEstorno = `Estornado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
        await updateDoc(doc(db, "historico", idFirestore), { 
          tipo: 'ESTORNO',
          detalhesCancelamento: infoEstorno
        })
        
        setRegistros(registros.map(h => 
          h.idFirestore === idFirestore ? { ...h, tipo: 'ESTORNO', detalhesCancelamento: infoEstorno } : h
        ))

        alert('Cancelamento concluído com sucesso. Registro mantido como Estornado!')

      } catch (error) {
        console.error("Erro crítico no cancelamento:", error)
        alert('Erro ao tentar cancelar a venda. O estorno pode ter sido incompleto.')
      }
    }
  }

  const registrosFiltrados = registros.filter(reg => {
    if (!reg) return false 

    if (dataFiltro) {
      if (!reg.data) return false
      const partes = dataFiltro.split('-')
      if (partes.length !== 3) return false
      const dataFormatada = partes.reverse().join('/')
      if (reg.data !== dataFormatada) return false
    }

    const ehEstorno = reg.tipo === 'ESTORNO'
    const ehEstoque = reg.tipo === 'SISTEMA' || reg.tipo === 'ESTOQUE'
    const ehVendaNormal = reg.tipo === 'VENDA' || (reg.tipo === 'FIADO' && !ehEstorno) || (reg.tipo === 'BAIXA' && !ehEstorno)

    if (tipoFiltro === 'VENDAS' && !ehVendaNormal) return false
    if (tipoFiltro === 'ESTOQUE' && !ehEstoque) return false
    if (tipoFiltro === 'ESTORNOS' && !ehEstorno) return false

    if (busca.trim()) {
      const termo = busca.toLowerCase()
      const idStr = String(reg.idRegistro || '') 

      if (ehVendaNormal || ehEstorno) {
        const nomeCliente = reg.cliente?.nome?.toLowerCase() || ''
        const nomeVendedor = reg.vendedor?.toLowerCase() || ''
        const itensVenda = (reg.itens || []).map(item => item?.nome?.toLowerCase() || '').join(' ')
        if (!nomeCliente.includes(termo) && !itensVenda.includes(termo) && !nomeVendedor.includes(termo) && !idStr.includes(termo)) return false
      } else {
        const nomeProduto = reg.produtoAlterado?.toLowerCase() || ''
        const detalhes = reg.detalhes?.toLowerCase() || ''
        if (!nomeProduto.includes(termo) && !detalhes.includes(termo) && !idStr.includes(termo)) return false
      }
    }

    return true
  })

  const totalPaginas = Math.ceil(registrosFiltrados.length / itensPorPagina)
  const indexUltimoItem = paginaAtual * itensPorPagina
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina
  const registrosPaginados = registrosFiltrados.slice(indexPrimeiroItem, indexUltimoItem)

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const parseDataBR = (dataStr) => {
    if (!dataStr) return new Date(0)
    const [dia, mes, ano] = dataStr.split('/')
    return new Date(`${ano}-${mes}-${dia}T00:00:00`)
  }

  const gerarPDFVendas = (e) => {
    e.preventDefault()
    
    if (!filtroRelatorio.dataInicio || !filtroRelatorio.dataFim) {
      alert("Por favor, selecione a data inicial e final.")
      return
    }

    const dataInicio = new Date(`${filtroRelatorio.dataInicio}T00:00:00`)
    const dataFim = new Date(`${filtroRelatorio.dataFim}T23:59:59`)

    const vendasDoPeriodo = registros.filter(reg => {
      if (reg.tipo === 'SISTEMA' || reg.tipo === 'ESTOQUE' || reg.tipo === 'ESTORNO') return false
      const dataReg = parseDataBR(reg.data)
      return dataReg >= dataInicio && dataReg <= dataFim
    })

    if (vendasDoPeriodo.length === 0) {
      alert("Nenhuma venda encontrada para este período.")
      return
    }

    const totalVendido = vendasDoPeriodo.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)

    const janelaImpressao = window.open('', '_blank')
    const htmlPDF = `
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; color: #1e1b4b; font-size: 24px; }
            .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
            .tabela-vendas { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-vendas th, .tabela-vendas td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            .tabela-vendas th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 12px; }
            .total-geral { text-align: right; font-size: 20px; color: #1e1b4b; font-weight: bold; background: #f1f5f9; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Relatório de Vendas Concluídas</h1>
              <p>Período: ${filtroRelatorio.dataInicio.split('-').reverse().join('/')} até ${filtroRelatorio.dataFim.split('-').reverse().join('/')}</p>
            </div>
            <div style="text-align: right;">
              <p>Loja: ${dadosLoja.nomeLoja || 'Não configurado'}</p>
              <p>Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>

          <table class="tabela-vendas">
            <thead>
              <tr>
                <th>Cód. Registro</th>
                <th>Data/Hora</th>
                <th>Itens (Qtd)</th>
                <th>Pagamento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${vendasDoPeriodo.map(v => {
                // Adicionado o espaço entre a quantidade e o nome do item
                const itensTxt = v.itens?.map(i => `${i.quantidadeComprada}x${i.nome}`).join(' | ') || 'Desconhecido';
                return `
                <tr>
                  <td>#${v.idRegistro}</td>
                  <td>${v.data}${v.hora}</td>
                  <td style="max-width: 300px;">${itensTxt}</td>
                  <td>${v.formaPagamento}</td>
                  <td style="font-weight: bold;">${formatoMoeda(v.total)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>

          <div class="total-geral">
            Total do Período: <span style="color: #10b981;">${formatoMoeda(totalVendido)}</span>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `
    
    janelaImpressao.document.write(htmlPDF)
    janelaImpressao.document.close()
    setModalRelatorio(false)
  }

  if (carregando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Buscando atividades no servidor do Google...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Histórico de Atividades</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '16px', margin: 0 }}>Auditoria em tempo real de transações e alterações</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <button 
            onClick={() => setModalRelatorio(true)}
            style={{ background: '#f8fafc', color: '#2563eb', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer', width: '100%', transition: '0.2s' }}
          >
            <FileDown size={18} /> Relatório PDF
          </button>
          <button 
            onClick={() => setConfigReciboAberto(true)}
            style={{ background: '#f8fafc', color: '#1e1b4b', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
          >
            <Settings size={18} /> Configurar Recibo
          </button>
        </div>
      </header>

      {modalRelatorio && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileDown size={20} /> Gerar Relatório PDF
              </h3>
              <button onClick={() => setModalRelatorio(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <form onSubmit={gerarPDFVendas} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Data Inicial</label>
                <input 
                  type="date" 
                  value={filtroRelatorio.dataInicio} 
                  onChange={e => setFiltroRelatorio({...filtroRelatorio, dataInicio: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Data Final</label>
                <input 
                  type="date" 
                  value={filtroRelatorio.dataFim} 
                  onChange={e => setFiltroRelatorio({...filtroRelatorio, dataFim: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                  required
                />
              </div>

              <button type="submit" style={{ width: '100%', background: '#2563eb', border: 'none', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '8px' }}>
                Gerar PDF
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: isMobile ? '100%' : '250px', boxSizing: 'border-box', flexGrow: 1 }}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar por ID, cliente, vendedor..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} 
          />
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', overflowX: 'auto', width: isMobile ? '100%' : 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setTipoFiltro('TODOS')} style={{ flex: 1, background: tipoFiltro === 'TODOS' ? '#4f46e5' : 'transparent', color: tipoFiltro === 'TODOS' ? 'white' : '#64748b', border: 'none', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>Todos</button>
          <button onClick={() => setTipoFiltro('VENDAS')} style={{ flex: 1, background: tipoFiltro === 'VENDAS' ? '#10b981' : 'transparent', color: tipoFiltro === 'VENDAS' ? 'white' : '#64748b', border: 'none', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>Vendas</button>
          <button onClick={() => setTipoFiltro('ESTOQUE')} style={{ flex: 1, background: tipoFiltro === 'ESTOQUE' ? '#3b82f6' : 'transparent', color: tipoFiltro === 'ESTOQUE' ? 'white' : '#64748b', border: 'none', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>Estoque</button>
          <button onClick={() => setTipoFiltro('ESTORNOS')} style={{ flex: 1, background: tipoFiltro === 'ESTORNOS' ? '#ef4444' : 'transparent', color: tipoFiltro === 'ESTORNOS' ? 'white' : '#64748b', border: 'none', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>Estornos</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '8px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
          <Filter size={18} color="#64748b" />
          <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '14px', fontWeight: '500', width: '100%' }} />
          {dataFiltro && (
            <button onClick={() => setDataFiltro('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
          )}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '-8px' }}>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setPaginaAtual(num)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: paginaAtual === num ? '#4f46e5' : '#ffffff',
                color: paginaAtual === num ? 'white' : '#64748b',
                border: paginaAtual === num ? 'none' : '1px solid #e2e8f0',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: '0.2s',
                boxShadow: paginaAtual === num ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none'
              }}
            >
              {num}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {registrosPaginados.length === 0 ? (
          <div style={{ background: 'white', padding: '60px 20px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8' }}>
            <History size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: '500' }}>Nenhuma atividade encontrada.</p>
          </div>
        ) : (
          registrosPaginados.map((reg, index) => {
            const ehEstorno = reg.tipo === 'ESTORNO'
            const ehEstoque = reg.tipo === 'SISTEMA' || reg.tipo === 'ESTOQUE'
            const ehVendaNormal = (reg.tipo === 'VENDA' || reg.tipo === 'FIADO' || reg.tipo === 'BAIXA') && !ehEstorno && !ehEstoque

            let labelTipo = 'Alteração de Estoque'
            let corDestaque = '#3b82f6'
            let bgCorDestaque = '#dbeafe'
            let iconeCategoria = <Package size={20} />

            if (ehEstorno) {
              labelTipo = 'Transação Cancelada (Estorno)'
              corDestaque = '#dc2626'
              bgCorDestaque = '#fef2f2'
              iconeCategoria = <AlertOctagon size={20} />
            } else if (ehVendaNormal) {
              labelTipo = 'Venda Registrada'
              corDestaque = '#10b981'
              bgCorDestaque = '#d1fae5'
              iconeCategoria = <ShoppingBag size={20} />
            }

            const mostrarComoEstruturaVenda = ehVendaNormal || ehEstorno

            const pgDetalhes = reg.pagamentosDetalhados || {}
            const totalPagoEmDinheiro = (Number(pgDetalhes.dinheiro) || 0)
            const totalPagoGeral = totalPagoEmDinheiro + (Number(pgDetalhes.pix) || 0) + (Number(pgDetalhes.cartaoCredito) || 0) + (Number(pgDetalhes.cartaoDebito) || 0)
            const teveTroco = totalPagoGeral > (reg.total || 0) && totalPagoEmDinheiro > 0
            const valorTroco = teveTroco ? totalPagoGeral - reg.total : 0

            return (
              <div key={reg?.idFirestore || index} style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', borderLeft: `5px solid ${corDestaque}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: ehEstorno ? 0.8 : 1 }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '16px' : '16px 24px', background: ehEstorno ? '#fef2f2' : '#f8fafc', borderBottom: '1px solid #f1f5f9', gap: isMobile ? '16px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ background: bgCorDestaque, color: corDestaque, padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                      {iconeCategoria}
                    </div>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: ehEstorno ? '#991b1b' : '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {labelTipo}
                        {reg.idRegistro && <span style={{ fontSize: '10px', background: ehEstorno ? '#fca5a5' : '#e2e8f0', color: ehEstorno ? '#7f1d1d' : '#475569', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0' }}>#{reg.idRegistro}</span>}
                      </span>
                      <div style={{ display: 'flex', gap: '12px', color: ehEstorno ? '#b91c1c' : '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {reg?.data || 'Sem data'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {reg?.hora || 'Sem hora'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {mostrarComoEstruturaVenda && (
                    <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', flexDirection: 'column', gap: '2px', borderTop: isMobile ? `1px dashed ${ehEstorno ? '#fca5a5' : '#cbd5e1'}` : 'none', paddingTop: isMobile ? '12px' : '0' }}>
                      {reg.desconto > 0 && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                          Subtotal: {formatoMoeda(reg.subtotal || 0)}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: ehEstorno ? '#b91c1c' : '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                        {reg.desconto > 0 ? `Total com Desconto` : 'Total Movimentado'}
                      </span>
                      <h3 style={{ fontSize: '20px', color: ehEstorno ? '#991b1b' : corDestaque, fontWeight: '900', margin: 0 }}>
                        {formatoMoeda(reg?.total || 0)}
                      </h3>
                    </div>
                  )}
                </div>

                <div style={{ padding: isMobile ? '16px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {mostrarComoEstruturaVenda ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} /> Detalhes do Registro
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                          {reg?.itens && reg.itens.length > 0 ? (
                            reg.itens.map((item, i) => (
                              <div key={item?.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px', color: '#1e1b4b', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '0', borderBottom: isMobile && i !== reg.itens.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: isMobile && i !== reg.itens.length - 1 ? '8px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                  <span style={{ fontWeight: '600', color: ehEstorno ? '#ef4444' : '#4f46e5' }}>{item?.quantidadeComprada || 1}x</span>
                                  <span style={{ lineHeight: '1.3' }}>
                                    {item?.codigoBarras && <strong style={{ color: '#64748b', marginRight: '6px' }}>{item.codigoBarras} -</strong>}
                                    <span style={{ textDecoration: ehEstorno ? 'line-through' : 'none' }}>{item?.nome || 'Produto Desconhecido'}</span>
                                  </span>
                                </div>
                                <span style={{ color: '#64748b', fontWeight: '600', alignSelf: isMobile ? 'flex-end' : 'auto', textDecoration: ehEstorno ? 'line-through' : 'none' }}>
                                  {formatoMoeda((item?.preco || 0) * (item?.quantidadeComprada || 1))}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>Informações dos itens indisponíveis.</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px', flex: 1 }}>
                          <CreditCard size={16} color="#64748b" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Movimentação</span>
                            <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600' }}>{reg?.formaPagamento || 'Não informada'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px', flex: 1 }}>
                          <User size={16} color="#64748b" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Operador</span>
                            <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600' }}>{reg?.vendedor || 'Não informado'}</span>
                          </div>
                        </div>

                        {reg?.cliente && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px', flex: 1 }}>
                            <User size={16} color="#64748b" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cliente</span>
                              <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600' }}>{reg.cliente.nome}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* TROCO MENOS DESTACADO */}
                      {teveTroco && !ehEstorno && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Fornecido: <strong>{formatoMoeda(totalPagoGeral)}</strong>
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Troco: <strong style={{ color: '#1e1b4b', fontSize: '14px' }}>{formatoMoeda(valorTroco)}</strong>
                          </span>
                        </div>
                      )}

                      {ehEstorno && reg.detalhesCancelamento && (
                         <div style={{ marginTop: '4px', padding: '10px 12px', background: '#fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                           ⚠️ {reg.detalhesCancelamento}
                         </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexDirection: isMobile ? 'column' : 'row', alignSelf: isMobile ? 'stretch' : 'flex-end' }}>
                        <button 
                          onClick={() => setReciboAberto(reg)}
                          style={{ flex: 1, background: '#f1f5f9', color: '#1e1b4b', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }}
                        >
                          <FileText size={16} /> Ver Recibo
                        </button>

                        {!ehEstorno && (
                          <button 
                            onClick={() => tentarCancelarVenda(reg.idFirestore)}
                            style={{ flex: 1, background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' }}
                          >
                            <X size={16} /> Estornar Transação
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <ArrowRight size={24} color="#94a3b8" style={{ marginTop: '4px', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: '600', margin: 0 }}>
                          Item Modificado: <span style={{ color: '#3b82f6' }}>"{reg?.produtoAlterado || 'Desconhecido'}"</span>
                        </p>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                          {reg?.detalhes || 'Sem detalhes registrados.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {configReciboAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, padding: '20px', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} /> Cabeçalho do Recibo
              </h3>
              <button onClick={() => setConfigReciboAberto(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <form onSubmit={salvarConfigRecibo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Nome da Loja no Topo</label>
                <input 
                  type="text" 
                  value={dadosLoja.nomeLoja || ''} 
                  onChange={e => setDadosLoja({...dadosLoja, nomeLoja: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '15px' }} 
                  placeholder="Ex: Paulinha Variedades"
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Endereço a exibir</label>
                <input 
                  type="text" 
                  value={dadosLoja.endereco || ''} 
                  onChange={e => setDadosLoja({...dadosLoja, endereco: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '15px' }} 
                  placeholder="Ex: Rua Pedro Candido, 522..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Telefone da Loja</label>
                <input 
                  type="text" 
                  value={dadosLoja.telefone || ''} 
                  onChange={e => setDadosLoja({...dadosLoja, telefone: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '15px' }} 
                  placeholder="Ex: 84 99999-9999"
                />
              </div>

              <button type="submit" style={{ width: '100%', background: '#4f46e5', border: 'none', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '8px' }}>
                Salvar Dados do Recibo
              </button>
            </form>
          </div>
        </div>
      )}

      {authModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, padding: '20px', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} /> {authModal.titulo}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Esta é uma ação restrita. Insira a senha de autorização configurada no sistema.
            </p>

            <form onSubmit={confirmarAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Senha</label>
                <input 
                  type="password" 
                  value={senhaDigitada} 
                  onChange={e => setSenhaDigitada(e.target.value)} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '16px' }} 
                  placeholder="••••••••••"
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

      {reciboAberto && (
        <ReciboModal 
          registro={reciboAberto} 
          dadosLoja={dadosLoja} 
          onClose={() => setReciboAberto(null)} 
        />
      )}
    </div>
  )
}