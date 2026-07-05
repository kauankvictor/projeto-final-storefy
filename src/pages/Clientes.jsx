import { useState, useEffect } from 'react'
import { Search, UserPlus, X, Save, Calendar, FileText, Trash2, AlertCircle, Phone, MapPin, CheckCircle, Edit2, ChevronDown, ChevronUp, DollarSign, CreditCard, Banknote, Smartphone, Filter } from 'lucide-react'

// Importações do Firebase
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos') 
  const [carregando, setCarregando] = useState(true)
  
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [clienteAtivo, setClienteAtivo] = useState(null) 
  
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  
  const [textoAnotacao, setTextoAnotacao] = useState('')
  const [valorDebito, setValorDebito] = useState('')
  const [dataAnotacao, setDataAnotacao] = useState('')

  const [notaEmEdicao, setNotaEmEdicao] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [valorEdicao, setValorEdicao] = useState('')
  const [dataEdicao, setDataEdicao] = useState('')

  const [notaExpandida, setNotaExpandida] = useState(null)
  
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [nomeFicha, setNomeFicha] = useState('')
  const [telefoneFicha, setTelefoneFicha] = useState('')
  const [enderecoFicha, setEnderecoFicha] = useState('')

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false) 
  const [valorReceber, setValorReceber] = useState('') 

  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Busca os clientes diretamente do Firebase Firestore
  useEffect(() => {
    const buscarClientesFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clientes"))
        const listaClientes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setClientes(listaClientes)
      } catch (error) {
        console.error("Erro ao buscar clientes na nuvem:", error)
      } finally {
        setCarregando(false)
      }
    }

    buscarClientesFirebase()
  }, [])

  const calcularDividaTotal = (cliente) => {
    if (!cliente || !cliente.anotacoes) return 0
    return cliente.anotacoes.reduce((total, nota) => {
      if (nota.status === 'Pendente') {
        const valorOriginal = Number(nota.valor) || 0
        const valorJaPago = Number(nota.valorPago) || 0
        return total + (valorOriginal - valorJaPago)
      }
      return total
    }, 0)
  }

  const clientesFiltrados = clientes.filter(cliente => {
    const matchBusca = cliente.nome.toLowerCase().includes(busca.toLowerCase()) || (cliente.telefone && cliente.telefone.includes(busca))
    const totalDevendo = calcularDividaTotal(cliente)
    let matchFiltro = true
    if (filtroStatus === 'Devedores') matchFiltro = totalDevendo > 0
    if (filtroStatus === 'Em Dia') matchFiltro = totalDevendo === 0

    return matchBusca && matchFiltro
  })

  // Salva um novo cliente na nuvem
  const handleSalvarCliente = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return

    const novoCliente = { nome, telefone, endereco, anotacoes: [] }

    try {
      const docRef = await addDoc(collection(db, "clientes"), novoCliente)
      const clienteComId = { id: docRef.id, ...novoCliente }
      
      setClientes([clienteComId, ...clientes])
      setNome('')
      setTelefone('')
      setEndereco('')
      setModalNovoAberto(false)
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error)
    }
  }

  // Elevado nível de segurança cadastral
  const salvarEdicaoFicha = async () => {
    if (!nomeFicha.trim()) {
      alert('O nome do cliente é obrigatório.')
      return
    }

    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { nome: nomeFicha, telefone: telefoneFicha, endereco: enderecoFicha })

      const clienteAtualizado = { ...clienteAtivo, nome: nomeFicha, telefone: telefoneFicha, endereco: enderecoFicha }
      setClientes(clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c))
      setClienteAtivo(clienteAtualizado)
      setEditandoFicha(false)
    } catch (error) {
      console.error("Erro ao atualizar ficha:", error)
    }
  }

  // Remove o cliente permanentemente da nuvem mediante validação de senha mestre
  const handleExcluirCliente = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${clienteAtivo.nome}"? Esta ação não pode ser desfeita.`)) {
      const senhaInformada = window.prompt("Digite a senha de administrador para autorizar a exclusão:")
      
      if (senhaInformada !== "150306") {
        alert("Acesso negado. Senha incorreta.")
        return
      }

      try {
        await deleteDoc(doc(db, "clientes", clienteAtivo.id))
        setClientes(clientes.filter(c => c.id !== clienteAtivo.id))
        fecharModalFicha()
        alert("Ficha do cliente excluída permanentemente.")
      } catch (error) {
        console.error("Erro ao excluir cliente:", error)
      }
    }
  }

  // Adiciona uma nova dívida ao array do cliente na nuvem de forma segura
  const handleAdicionarAnotacao = async () => {
    const valorTexto = String(valorDebito || '')
    const valorNumerico = parseFloat(valorTexto.replace(',', '.'))
    
    if (!textoAnotacao.trim() || isNaN(valorNumerico) || valorNumerico <= 0) {
      alert("Por favor, preencha a descrição e um valor válido.")
      return 
    }

    const dataVencimentoFormatada = dataAnotacao ? dataAnotacao.split('-').reverse().join('/') : 'Sem prazo'

    const novaAnotacao = {
      id: Date.now(),
      texto: textoAnotacao,
      valor: valorNumerico,
      valorPago: 0,
      dataVencimento: dataVencimentoFormatada, 
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente' 
    }

    const anotacoesAtualizadas = [novaAnotacao, ...(clienteAtivo.anotacoes || [])]

    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { anotacoes: anotacoesAtualizadas })

      const clienteAtualizado = { ...clienteAtivo, anotacoes: anotacoesAtualizadas }
      setClientes(clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c))
      setClienteAtivo(clienteAtualizado) 

      setTextoAnotacao('')
      setValorDebito('')
      setDataAnotacao('')
      setNotaExpandida(novaAnotacao.id) 
    } catch (error) {
      console.error("Erro ao adicionar dívida:", error)
    }
  }

  const abrirModalPagamentoDaConta = () => {
    setModalPagamentoAberto(true)
    setValorReceber(calcularDividaTotal(clienteAtivo).toString()) 
  }

  // Registra pagamentos parciais ou totais na nuvem salvando no Firebase Historico com autenticação
  const confirmarPagamentoEEnviarParaCaixa = async (formaPagamento) => {
    const valorRecebidoNum = parseFloat(String(valorReceber).replace(',', '.'))
    const dividaTotalAtual = calcularDividaTotal(clienteAtivo)

    if (isNaN(valorRecebidoNum) || valorRecebidoNum <= 0) {
      alert("Digite um valor válido maior que zero.")
      return
    }

    if (valorRecebidoNum > dividaTotalAtual) {
      alert("O valor recebido não pode ser maior do que a dívida do cliente.")
      return
    }

    const senhaInformada = window.prompt("Digite a senha de autorização para processar a baixa na conta:")
    if (senhaInformada !== "150306") {
      alert("Operação cancelada. Senha incorreta.")
      return
    }

    let restantePraAbater = valorRecebidoNum
    const dataHoje = new Date().toLocaleDateString('pt-BR')
    const anotacoesDoAntigoParaNovo = [...(clienteAtivo.anotacoes || [])].reverse()
    
    const anotacoesAbatidas = anotacoesDoAntigoParaNovo.map(nota => {
      if (nota.status === 'Pendente' && restantePraAbater > 0) {
        const valorOriginalItem = Number(nota.valor) || 0
        const valorJaPagoItem = Number(nota.valorPago) || 0
        const faltaPagarNesteItem = valorOriginalItem - valorJaPagoItem

        if (faltaPagarNesteItem > 0) {
          const abaterAqui = Math.min(faltaPagarNesteItem, restantePraAbater)
          restantePraAbater -= abaterAqui
          const novoValorPago = valorJaPagoItem + abaterAqui
          const quitouOItem = novoValorPago >= valorOriginalItem

          const notaAtualizada = {
            ...nota,
            valorPago: novoValorPago,
            status: quitouOItem ? 'Quitada' : 'Pendente'
          }

          if (quitouOItem) {
            notaAtualizada.dataPagamento = dataHoje
          }

          return notaAtualizada
        }
      }
      return nota
    }).reverse() 

    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { anotacoes: anotacoesAbatidas })

      const clienteAtualizado = { ...clienteAtivo, anotacoes: anotacoesAbatidas }
      setClientes(clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c))
      setClienteAtivo(clienteAtualizado)

      const nuevoRegistroHistorico = {
        idRegistro: Date.now(),
        tipo: 'VENDA', 
        data: dataHoje,
        hora: new Date().toLocaleTimeString('pt-BR'),
        subtotal: valorRecebidoNum,
        desconto: 0,
        total: valorRecebidoNum,
        formaPagamento: formaPagamento,
        vendedor: 'Recebimento de Conta',
        cliente: { nome: clienteAtivo.nome, id: clienteAtivo.id },
        itens: [{ 
          id: 'baixa_conta', 
          nome: `Baixa Parcial de Conta - ${clienteAtivo.nome}`, 
          quantidadeComprada: 1, 
          preco: valorRecebidoNum,
          categoria: 'Recebimento' 
        }]
      }

      await addDoc(collection(db, "historico"), nuevoRegistroHistorico)

      setModalPagamentoAberto(false)
      setValorReceber('')
      alert("Pagamento processado e enviado ao fluxo de caixa com sucesso.")
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error)
      alert("Erro ao processar o abatimento na nuvem.")
    }
  }

  // Salva edições de registros de contas na nuvem
  const handleSalvarEdicaoAnotacao = async (notaId, e) => {
    e.stopPropagation()
    const valorTexto = String(valorEdicao || '')
    const valorNumerico = parseFloat(valorTexto.replace(',', '.'))

    if (!textoEdicao.trim() || isNaN(valorNumerico)) {
      alert("Preencha descrição e valor corretamente.")
      return
    }

    const novaDataVencimento = dataEdicao ? dataEdicao.split('-').reverse().join('/') : 'Sem prazo'

    const anotacoesAtualizadas = (clienteAtivo.anotacoes || []).map(nota => {
      if (nota.id === notaId) {
        return { ...nota, texto: textoEdicao, valor: valorNumerico, dataVencimento: novaDataVencimento }
      }
      return nota
    })

    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { anotacoes: anotacoesAtualizadas })

      const clienteAtualizado = { ...clienteAtivo, anotacoes: anotacoesAtualizadas }
      setClientes(clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c))
      setClienteAtivo(clienteAtualizado) 
      setNotaEmEdicao(null)
    } catch (error) {
      console.error("Erro ao editar nota:", error)
    }
  }

  // Remove uma anotação específica do histórico da nuvem
  const handleExcluirAnotacao = async (notaId, e) => {
    e.stopPropagation()
    if (window.confirm('Excluir esta anotação da conta? Esta ação não pode ser desfeita.')) {
      const anotacoesAtualizadas = (clienteAtivo.anotacoes || []).filter(nota => nota.id !== notaId)

      try {
        const docRef = doc(db, "clientes", clienteAtivo.id)
        await updateDoc(docRef, { anotacoes: anotacoesAtualizadas })

        const clienteAtualizado = { ...clienteAtivo, anotacoes: anotacoesAtualizadas }
        setClientes(clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c))
        setClienteAtivo(clienteAtualizado)
      } catch (error) {
        console.error("Erro ao remover nota:", error)
      }
    }
  }

  const iniciarEdicaoFicha = () => {
    setNomeFicha(clienteAtivo.nome || '')
    setTelefoneFicha(clienteAtivo.telefone || '')
    setEnderecoFicha(clienteAtivo.endereco || '')
    setEditandoFicha(true)
  }

  const fecharModalFicha = () => {
    setClienteAtivo(null)
    setNotaEmEdicao(null)
    setNotaExpandida(null)
    setModalPagamentoAberto(false)
    setEditandoFicha(false)
    setValorReceber('')
  }

  const toggleExpandirNota = (id) => {
    if (notaEmEdicao === id) return 
    if (notaExpandida === id) setNotaExpandida(null)
    else setNotaExpandida(id)
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b' }}>Fichas de clientes</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '16px' }}>Gerenciamento de contas dos clientes</p>
        </div>
        <button onClick={() => setModalNovoAberto(true)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', width: isMobile ? '100%' : 'auto' }}>
          <UserPlus size={20} /> Novo Cliente
        </button>
      </header>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', width: '100%', maxWidth: isMobile ? '100%' : '350px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <Search size={20} color="#64748b" />
          <input type="text" placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '10px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
          <Filter size={20} color="#64748b" />
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '15px', cursor: 'pointer', width: '100%' }}>
            <option value="Todos">Todos os Clientes</option>
            <option value="Devedores">Apenas Devedores</option>
            <option value="Em Dia">Apenas Em Dia</option>
          </select>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Carregando ficha de clientes do Google Firestore...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: '20px' }}>
          {clientesFiltrados.map(cliente => {
            const totalDevendo = calcularDividaTotal(cliente)
            return (
              <div key={cliente.id} onClick={() => setClienteAtivo(cliente)} style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', lineHeight: '1.2' }}>{cliente.nome}</h3>
                  {totalDevendo > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Em Débito</span>
                      <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>{formatoMoeda(totalDevendo)}</span>
                    </div>
                  ) : (
                    <span style={{ background: '#d1fae5', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Em dia</span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {cliente.telefone || 'Sem número'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {cliente.endereco || 'Sem endereço'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DE NOVO CLIENTE */}
      {modalNovoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: isMobile ? '20px' : '32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: isMobile ? '20px' : '24px', color: '#1e1b4b' }}>Cadastrar Cliente</h2>
              <button onClick={() => setModalNovoAberto(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSalvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Nome Completo *</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Telefone</label>
                <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Endereço</label>
                <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>Salvar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO CLIENTE E GESTÃO DE CONTA */}
      {clienteAtivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '24px', overflow: 'hidden', boxSizing: 'border-box' }}>
            
            <div style={{ padding: isMobile ? '20px' : '28px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'white', display: 'flex', depth: '1', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: isMobile ? '16px' : '0' }}>
              
              <div style={{ flex: 1, marginRight: isMobile ? '0' : '20px', position: 'relative' }}>
                {isMobile && (
                  <button onClick={fecharModalFicha} style={{ position: 'absolute', top: 0, right: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
                )}

                {editandoFicha ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: isMobile ? '30px' : '0' }}>
                    <input type="text" value={nomeFicha} onChange={(e) => setNomeFicha(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={telefoneFicha} onChange={(e) => setTelefoneFicha(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={enderecoFicha} onChange={(e) => setEnderecoFicha(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={salvarEdicaoFicha} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Salvar Ficha</button>
                      <button onClick={() => setEditandoFicha(false)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: isMobile ? '10px' : '0' }}>
                      <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 'bold', maxWidth: isMobile ? '70%' : '100%' }}>{clienteAtivo.nome}</h2>
                      <button onClick={iniciarEdicaoFicha} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      <button onClick={handleExcluirCliente} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', padding: '6px', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', opacity: 0.8, fontSize: '13px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {clienteAtivo.telefone || 'Sem número cadastrado'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {clienteAtivo.endereco || 'Sem endereço cadastrado'}</span>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', textAlign: isMobile ? 'center' : 'right', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', border: '1px solid rgba(255,255,255,0.2)', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.9 }}>Valor Total da Conta</span>
                  <span style={{ fontSize: isMobile ? '26px' : '22px', fontWeight: '900', color: calcularDividaTotal(clienteAtivo) > 0 ? '#fca5a5' : '#86efac' }}>{formatoMoeda(calcularDividaTotal(clienteAtivo))}</span>
                  {calcularDividaTotal(clienteAtivo) > 0 && (
                    <button onClick={abrirModalPagamentoDaConta} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}><DollarSign size={16} /> Dar Baixa (Receber)</button>
                  )}
                </div>
                {!isMobile && (
                  <button onClick={fecharModalFicha} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}><X size={28} /></button>
                )}
              </div>
            </div>

            <div style={{ padding: isMobile ? '20px' : '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e1b4b', marginBottom: '16px', textTransform: 'uppercase' }}>Detalhes da Conta</h4>
                {!(clienteAtivo.anotacoes || []) || (clienteAtivo.anotacoes || []).length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>A conta do cliente está limpa.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(clienteAtivo.anotacoes || []).map(nota => {
                      const isExpandida = notaExpandida === nota.id
                      const valorOriginal = Number(nota.valor) || 0
                      const valorPago = Number(nota.valorPago) || 0
                      const saldoPendente = valorOriginal - valorPago

                      return (
                        <div key={nota.id} onClick={() => toggleExpandirNota(nota.id)} style={{ background: isExpandida ? '#fff' : '#f8fafc', border: isExpandida ? '2px solid #4f46e5' : '1px solid #e2e8f0', padding: isMobile ? '14px' : '18px', borderRadius: '16px', display: 'flex', borderStyle: 'solid', flexDirection: 'column', gap: '16px', opacity: nota.status === 'Quitada' && !isExpandida ? 0.6 : 1 }}>
                          {notaEmEdicao === nota.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={e => e.stopPropagation()}>
                              <input type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #4f46e5', outline: 'none' }} />
                              <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                                <input type="number" step="0.01" value={valorEdicao} onChange={(e) => setValorEdicao(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #4f46e5', width: '100%', boxSizing: 'border-box' }} />
                                <input type="date" value={dataEdicao} onChange={(e) => setDataEdicao(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                <button onClick={(e) => handleSalvarEdicaoAnotacao(nota.id, e)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Salvar</button>
                                <button onClick={(e) => { e.stopPropagation(); setNotaEmEdicao(null) }} style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, paddingRight: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <p style={{ color: '#1e1b4b', fontSize: isExpandida ? '15px' : '14px', fontWeight: '600', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{nota.texto}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '8px', flexShrink: 0 }}>
                                      {valorOriginal > 0 && <span style={{ fontSize: '15px', fontWeight: 'bold', color: nota.status === 'Quitada' ? '#10b981' : '#ef4444' }}>{formatoMoeda(valorOriginal)}</span>}
                                      {nota.status === 'Pendente' && valorPago > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '4px' }}>
                                          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Pago: {formatoMoeda(valorPago)}</span>
                                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>Resta: {formatoMoeda(saldoPendente)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', color: '#94a3b8', fontSize: '11px', flexWrap: 'wrap' }}>
                                    <span>Criado em: {nota.dataCriacao}</span>
                                    {nota.dataVencimento !== 'Sem prazo' && <span style={{ color: nota.status === 'Quitada' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>Prazo: {nota.dataVencimento}</span>}
                                  </div>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>{isExpandida ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                              </div>
                              {isExpandida && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                  {nota.status === 'Quitada' && <span style={{ flex: 1, minWidth: '100%', background: '#d1fae5', color: '#059669', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>Quitada em {nota.dataPagamento}</span>}
                                  <button onClick={(e) => iniciarEdicaoAnotacao(nota, e)} style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Edit2 size={14} /> Editar</button>
                                  <button onClick={(e) => handleExcluirAnotacao(nota.id, e)} style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Trash2 size={14} /> Excluir</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px dashed #cbd5e1' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>Anotar Nova Compra</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Produtos da compra" value={textoAnotacao} onChange={(e) => setTextoAnotacao(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Valor total (R$) *</span>
                      <input type="number" step="0.01" placeholder="Ex: 150.00" value={valorDebito} onChange={(e) => setValorDebito(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Pagamento agendado para?</span>
                      <input type="date" value={dataAnotacao} onChange={(e) => setDataAnotacao(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <button onClick={handleAdicionarAnotacao} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>Adicionar à Conta</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalPagamentoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: isMobile ? '24px' : '32px', textAlign: 'center', boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '8px' }}>Receber da Conta</h3>
            <div style={{ marginBottom: '20px', textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Valor que o cliente está pagando:</label>
              <input type="number" step="0.01" value={valorReceber} onChange={(e) => setValorReceber(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '18px', fontWeight: 'bold', color: '#1e1b4b', marginTop: '6px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => confirmarPagamentoEEnviarParaCaixa('Pix')} style={{ padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}><Smartphone size={20} color="#10b981" /> <br/>Pix</button>
              <button onClick={() => confirmarPagamentoEEnviarParaCaixa('Dinheiro')} style={{ padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}><Banknote size={20} color="#10b981" /> <br/>Dinheiro</button>
              <button onClick={() => confirmarPagamentoEEnviarParaCaixa('Cartão Débito')} style={{ padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}><CreditCard size={20} color="#3b82f6" /> <br/>Débito</button>
              <button onClick={() => confirmarPagamentoEEnviarParaCaixa('Cartão Crédito')} style={{ padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}><CreditCard size={20} color="#8b5cf6" /> <br/>Crédito</button>
            </div>
            <button onClick={() => { setModalPagamentoAberto(false); setValorReceber(''); }} style={{ background: 'transparent', color: '#64748b', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '10px' }}>Cancelar Recebimento</button>
          </div>
        </div>
      )}
    </div>
  )
}