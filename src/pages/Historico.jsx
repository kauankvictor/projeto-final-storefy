import { useState, useEffect } from 'react'
import { History, ShoppingBag, Edit, Calendar, Clock, User, CreditCard, Trash2, Filter, Search, Package, ArrowRight, X, Lock } from 'lucide-react'

// Importações cruciais do Firebase
import { collection, getDocs, doc, deleteDoc, getDoc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Historico() {
  const [registros, setRegistros] = useState([])
  const [busca, setBusca] = useState('')
  const [dataFiltro, setDataFiltro] = useState('') 
  const [tipoFiltro, setTipoFiltro] = useState('TODOS')
  const [carregando, setCarregando] = useState(true)

  const [authModal, setAuthModal] = useState({ isOpen: false, tipo: '', targetId: null, titulo: '' })
  const [credenciais, setCredenciais] = useState({ login: '', senha: '' })

  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 1. Busca os registros do histórico diretamente do Firebase
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

  const tentarLimparHistorico = () => {
    setAuthModal({ isOpen: true, tipo: 'LIMPAR', targetId: null, titulo: 'Autorização: Limpar Histórico' })
  }

  const tentarCancelarVenda = (idFirestore) => {
    setAuthModal({ isOpen: true, tipo: 'CANCELAR', targetId: idFirestore, titulo: 'Autorização: Cancelar Venda' })
  }

  const fecharModal = () => {
    setAuthModal({ isOpen: false, tipo: '', targetId: null, titulo: '' })
    setCredenciais({ login: '', senha: '' })
  }

  const confirmarAcesso = async (e) => {
    e.preventDefault()
    
    if (authModal.tipo === 'LIMPAR') {
      if (credenciais.login === '051521880684' && credenciais.senha === '!P$.juno.K') {
        fecharModal()
        if (window.confirm('Acesso Liberado! Deseja apagar todo o histórico de atividades da nuvem?')) {
          try {
            for (const registro of registros) {
              await deleteDoc(doc(db, "historico", registro.idFirestore))
            }
            setRegistros([])
            alert('Histórico apagado com sucesso!')
          } catch (error) {
            console.error("Erro ao limpar histórico:", error)
            alert('Erro ao apagar histórico na nuvem.')
          }
        }
      } else {
        alert('Acesso Negado: Login ou senha mestre incorretos.')
      }
    } else if (authModal.tipo === 'CANCELAR') {
      if (credenciais.login === 'paulinha.15' && credenciais.senha === '131590') {
        const idParaCancelar = authModal.targetId
        fecharModal()
        await executarCancelamentoVenda(idParaCancelar) 
      } else {
        alert('Acesso Negado: Usuário ou senha de estorno incorretos.')
      }
    }
  }

  const executarCancelamentoVenda = async (idFirestore) => {
    const vendaParaCancelar = registros.find(h => h.idFirestore === idFirestore)
    if (!vendaParaCancelar) return

    if (window.confirm('Confirmar o cancelamento da venda na nuvem? Os produtos retornarão ao estoque e, se houver débito, ele será removido da ficha do cliente.')) {
      
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

        await deleteDoc(doc(db, "historico", idFirestore))
        setRegistros(registros.filter(h => h.idFirestore !== idFirestore))

        alert('Cancelamento concluído com sucesso!')

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

    if (tipoFiltro === 'VENDAS' && reg.tipo !== 'VENDA' && reg.tipo !== 'FIADO') return false
    if (tipoFiltro === 'SISTEMA' && reg.tipo === 'VENDA') return false

    if (busca.trim()) {
      const termo = busca.toLowerCase()
      if (reg.tipo === 'VENDA' || reg.tipo === 'FIADO') {
        const nomeCliente = reg.cliente?.nome?.toLowerCase() || ''
        const nomeVendedor = reg.vendedor?.toLowerCase() || ''
        const itensVenda = (reg.itens || []).map(item => item?.nome?.toLowerCase() || '').join(' ')
        if (!nomeCliente.includes(termo) && !itensVenda.includes(termo) && !nomeVendedor.includes(termo)) return false
      } else {
        const nomeProduto = reg.produtoAlterado?.toLowerCase() || ''
        const detalhes = reg.detalhes?.toLowerCase() || ''
        if (!nomeProduto.includes(termo) && !detalhes.includes(termo)) return false
      }
    }

    return true
  })

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  if (carregando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Buscando atividades no servidor do Google...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b' }}>Histórico de Atividades</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '16px' }}>Auditoria em tempo real de transações e alterações</p>
        </div>

        {registros.length > 0 && (
          <button 
            onClick={tentarLimparHistorico}
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
          >
            <Trash2 size={18} /> Limpar Histórico
          </button>
        )}
      </header>

      <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: isMobile ? '100%' : '250px', boxSizing: 'border-box', flexGrow: 1 }}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar por cliente, vendedor..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} 
          />
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', overflow: 'hidden', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={() => setTipoFiltro('TODOS')} style={{ flex: 1, background: tipoFiltro === 'TODOS' ? '#4f46e5' : 'transparent', color: tipoFiltro === 'TODOS' ? 'white' : '#64748b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px' }}>Todos</button>
          <button onClick={() => setTipoFiltro('VENDAS')} style={{ flex: 1, background: tipoFiltro === 'VENDAS' ? '#10b981' : 'transparent', color: tipoFiltro === 'VENDAS' ? 'white' : '#64748b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px' }}>Vendas</button>
          <button onClick={() => setTipoFiltro('SISTEMA')} style={{ flex: 1, background: tipoFiltro === 'SISTEMA' ? '#3b82f6' : 'transparent', color: tipoFiltro === 'SISTEMA' ? 'white' : '#64748b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px' }}>Auditoria</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '8px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
          <Filter size={18} color="#64748b" />
          <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '14px', fontWeight: '500', width: '100%' }} />
          {dataFiltro && (
            <button onClick={() => setDataFiltro('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {registrosFiltrados.length === 0 ? (
          <div style={{ background: 'white', padding: '60px 20px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8' }}>
            <History size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: '500' }}>Nenhuma atividade encontrada na nuvem.</p>
          </div>
        ) : (
          registrosFiltrados.map((reg, index) => {
            const isVenda = reg?.tipo === 'VENDA' || reg?.tipo === 'FIADO'
            const corDestaque = isVenda ? '#10b981' : '#3b82f6'
            const bgCorDestaque = isVenda ? '#d1fae5' : '#dbeafe'

            return (
              <div key={reg?.idFirestore || index} style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', borderLeft: `5px solid ${corDestaque}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '16px' : '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', gap: isMobile ? '16px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ background: bgCorDestaque, color: corDestaque, padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                      {isVenda ? <ShoppingBag size={20} /> : <Edit size={20} />}
                    </div>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {isVenda ? (reg.tipo === 'FIADO' ? 'Venda Fiado (Pendente)' : 'Venda Concluída') : 'Atualização de Sistema'}
                      </span>
                      <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {reg?.data || 'Sem data'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {reg?.hora || 'Sem hora'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isVenda && (
                    <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', flexDirection: 'column', gap: '2px', borderTop: isMobile ? '1px dashed #cbd5e1' : 'none', paddingTop: isMobile ? '12px' : '0' }}>
                      {reg.desconto > 0 && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                          Subtotal: {formatoMoeda(reg.subtotal || 0)}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                        {reg.desconto > 0 ? `Total com Desconto (-${formatoMoeda(reg.desconto)})` : 'Total da Venda'}
                      </span>
                      <h3 style={{ fontSize: '20px', color: '#10b981', fontWeight: '900', margin: 0 }}>
                        {formatoMoeda(reg?.total || 0)}
                      </h3>
                    </div>
                  )}
                </div>

                <div style={{ padding: isMobile ? '16px' : '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {isVenda ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} /> Itens Movimentados
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                          {reg?.itens && reg.itens.length > 0 ? (
                            reg.itens.map((item, i) => (
                              <div key={item?.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px', color: '#1e1b4b', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '0', borderBottom: isMobile && i !== reg.itens.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: isMobile && i !== reg.itens.length - 1 ? '8px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                  <span style={{ fontWeight: '600', color: '#4f46e5' }}>{item?.quantidadeComprada || 1}x</span>
                                  <span style={{ lineHeight: '1.3' }}>{item?.nome || 'Produto Desconhecido'}</span>
                                </div>
                                <span style={{ color: '#64748b', fontWeight: '600', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
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
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pagamento</span>
                            <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600' }}>{reg?.formaPagamento || 'Não informada'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px', flex: 1 }}>
                          <User size={16} color="#64748b" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Vendedor(a)</span>
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

                      <button 
                        onClick={() => tentarCancelarVenda(reg.idFirestore)}
                        style={{ alignSelf: isMobile ? 'stretch' : 'flex-end', background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', transition: '0.2s' }}
                      >
                        <X size={16} /> Cancelar Transação na Nuvem
                      </button>
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

      {authModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} /> {authModal.titulo}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Esta é uma ação restrita. Insira as credenciais para manipular a nuvem.
            </p>

            <form onSubmit={confirmarAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Login</label>
                <input 
                  type="text" 
                  value={credenciais.login} 
                  onChange={e => setCredenciais({...credenciais, login: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e1b4b', outline: 'none', fontSize: '16px' }} 
                  placeholder="Nome de usuário"
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Senha</label>
                <input 
                  type="password" 
                  value={credenciais.senha} 
                  onChange={e => setCredenciais({...credenciais, senha: e.target.value})} 
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
                  Confirmar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  )
}