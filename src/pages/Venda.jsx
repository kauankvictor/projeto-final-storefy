import { useState, useEffect } from 'react'
import { Search, Filter, ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Tag, UserCheck, X, Receipt, UserPlus } from 'lucide-react'

// Importações cruciais do Firebase
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Venda() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  
  const [carrinho, setCarrinho] = useState([])
  const [clienteNome, setClienteNome] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  
  const [descontoTipo, setDescontoTipo] = useState('R$')
  const [descontoValor, setDescontoValor] = useState('')
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [vendedorNome, setVendedorNome] = useState('')

  const [listaClientes, setListaClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [criandoClienteRapido, setCriandoClienteRapido] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [processando, setProcessando] = useState(false)

  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ================= BUSCA DE DADOS NA NUVEM =================
  useEffect(() => {
    const carregarDadosNuvem = async () => {
      try {
        const queryProdutos = await getDocs(collection(db, "produtos"))
        const listaP = queryProdutos.docs.map(d => ({ id: d.id, ...d.data() }))
        setProdutos(listaP)

        const queryClientes = await getDocs(collection(db, "clientes"))
        const listaC = queryClientes.docs.map(d => ({ id: d.id, ...d.data() }))
        setListaClientes(listaC)
      } catch (error) {
        console.error("Erro ao carregar dados na frente de caixa:", error)
        setErro("Falha ao sincronizar dados com o servidor Google.")
      }
    };
    carregarDadosNuvem()
  }, [sucesso])

  const categoriasUnicas = ['Todas', ...new Set(produtos.map(p => p.categoria))]

  const produtosFiltrados = produtos.filter(produto => {
    const termoBusca = busca.toLowerCase()
    const matchBusca = 
      produto.nome.toLowerCase().includes(termoBusca) || 
      produto.categoria.toLowerCase().includes(termoBusca) ||
      (produto.codigoBarras && produto.codigoBarras.includes(termoBusca))
    const matchCategoria = categoriaFiltro === 'Todas' || produto.categoria === categoriaFiltro
    return matchBusca && matchCategoria
  })

  const clientesFiltradosBusca = listaClientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  )
  
  const adicionarAoCarrinho = (produto) => {
    setErro('')
    const itemJaNoCarrinho = carrinho.find(item => item.id === produto.id)
    
    if (itemJaNoCarrinho) {
      if (itemJaNoCarrinho.quantidadeComprada >= produto.quantidade) {
        setErro(`Você só tem ${produto.quantidade} unidades de "${produto.nome}" no estoque!`)
        return
      }
      const novoCarrinho = carrinho.map(item => 
        item.id === produto.id ? { ...item, quantidadeComprada: item.quantidadeComprada + 1 } : item
      )
      setCarrinho(novoCarrinho)
    } else {
      if (produto.quantidade <= 0) {
        setErro(`"${produto.nome}" está esgotado!`)
        return
      }
      setCarrinho([...carrinho, { ...produto, quantidadeComprada: 1 }])
    }
  }

  const removerDoCarrinho = (id, removerTudo = false) => {
    const item = carrinho.find(item => item.id === id)
    if (removerTudo || item.quantidadeComprada === 1) {
      setCarrinho(carrinho.filter(item => item.id !== id))
    } else {
      setCarrinho(carrinho.map(item => 
        item.id === id ? { ...item, ...item, quantidadeComprada: item.quantidadeComprada - 1 } : item
      ))
    }
  }

  const handleCadastrarClienteRapido = async (e) => {
    e.preventDefault()
    if (!novoClienteNome.trim()) return

    const novoC = { nome: novoClienteNome.trim(), telefone: '', endereco: '', anotacoes: [] }
    
    try {
      const docRef = await addDoc(collection(db, "clientes"), novoC)
      const clienteComId = { id: docRef.id, ...novoC }
      
      setListaClientes([clienteComId, ...listaClientes])
      setClienteSelecionado(clienteComId) 
      setNovoClienteNome('')
      setCriandoClienteRapido(false)
    } catch (error) {
      console.error("Erro ao cadastrar cliente rápido:", error)
      setErro("Não foi possível registrar o cliente.")
    }
  }

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidadeComprada), 0)
  }

  const calcularDescontoReal = () => {
    const subtotal = calcularSubtotal()
    const valorDigitado = parseFloat(descontoValor) || 0
    if (valorDigitado <= 0) return 0
    if (descontoTipo === 'R$') return valorDigitado > subtotal ? subtotal : valorDigitado
    if (descontoTipo === '%') {
      const valorPorcentagem = subtotal * (valorDigitado / 100)
      return valorPorcentagem > subtotal ? subtotal : valorPorcentagem
    }
    return 0
  }

  const calcularTotalFinal = () => {
    return calcularSubtotal() - calcularDescontoReal()
  }
  
  const prepararVenda = () => {
    if (carrinho.length === 0) {
      setErro('O carrinho está vazio!')
      return
    }
    if (formaPagamento === 'Anotar (Fiado)' && !clienteSelecionado) {
      setErro('Selecione ou cadastre um cliente para fechar no Fiado!')
      return
    }
    setErro('')
    setModalConfirmacao(true)
  }

  const confirmarEFinalizarVenda = async (e) => {
    e.preventDefault()

    if (!vendedorNome.trim()) {
      alert("Informe o nome do vendedor para prosseguir!")
      return
    }

    setProcessando(true)

    try {
      for (const item of carrinho) {
        const produtoOriginal = produtos.find(p => p.id === item.id)
        if (produtoOriginal) {
          const novaQuantidade = produtoOriginal.quantidade - item.quantidadeComprada
          const produtoDocRef = doc(db, "produtos", item.id)
          await updateDoc(produtoDocRef, { quantidade: novaQuantidade })
        }
      }

      if (formaPagamento === 'Anotar (Fiado)') {
        const textoDebitoItens = carrinho.map(item => `${item.quantidadeComprada}x ${item.nome}`).join('\n')
        
        const novaAnotacaoDebito = {
          id: Date.now(),
          texto: `Compra Frente de Caixa:\n${textoDebitoItens}\n(Vendedor: ${vendedorNome})`,
          valor: calcularTotalFinal(),
          valorPago: 0,
          dataVencimento: 'Sem prazo',
          dataCriacao: new Date().toLocaleDateString('pt-BR'),
          status: 'Pendente'
        }

        const clienteDocRef = doc(db, "clientes", clienteSelecionado.id)
        const anotacoesAtuais = clienteSelecionado.anotacoes || []
        await updateDoc(clienteDocRef, {
          anotacoes: [novaAnotacaoDebito, ...anotacoesAtuais]
        })
      }

      const novaVenda = {
        idRegistro: Date.now(),
        tipo: formaPagamento === 'Anotar (Fiado)' ? 'FIADO' : 'VENDA', 
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR'),
        itens: carrinho.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidadeComprada: item.quantidadeComprada,
          categoria: item.categoria
        })),
        subtotal: calcularSubtotal(),
        desconto: calcularDescontoReal(),
        total: calcularTotalFinal(),
        formaPagamento,
        vendedor: vendedorNome,
        cliente: formaPagamento === 'Anotar (Fiado)' ? { nome: clienteSelecionado.nome, id: clienteSelecionado.id } : (clienteNome ? { nome: clienteNome } : null)
      }

      await addDoc(collection(db, "historico"), novaVenda)

      setSucesso(true)
      setCarrinho([])
      setClienteNome('')
      setClienteSelecionado(null)
      setBuscaCliente('')
      setFormaPagamento('Pix')
      setDescontoValor('')
      setVendedorNome('')
      setErro('')
      setModalConfirmacao(false)

      setTimeout(() => setSucesso(false), 3000)
    } catch (error) {
      console.error("Erro crítico ao finalizar venda:", error)
      setErro("Erro ao processar venda na nuvem. Verifique o estoque e tente novamente.")
    } finally {
      setProcessando(false)
    }
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const rolarParaCarrinho = () => {
    document.getElementById('carrinho-mobile').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      gap: isMobile ? '16px' : '32px', 
      height: isMobile ? 'auto' : 'calc(100vh - 80px)', 
      overflowY: isMobile ? 'visible' : 'hidden',
      position: 'relative' 
    }}>
      
      {/* ================= MODAL CENTRAL DE SUCESSO ================= */}
      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0 }}>Venda Finalizada!</h2>
            <p style={{ color: '#64748b', margin: 0 }}>A movimentação foi registrada com sucesso no sistema.</p>
          </div>
        </div>
      )}

      {/* ================= LADO ESQUERDO: PRODUTOS ================= */}
      <div style={{ 
        flex: '2', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        overflowY: isMobile ? 'visible' : 'auto', 
        paddingRight: isMobile ? '0' : '16px' 
      }}>
        <header>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b' }}>Painel de vendas</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '16px' }}>Adicione os produtos no carrinho e finalize a venda</p>
        </header>

        {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Search size={20} color="#64748b" />
            <input type="text" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <Filter size={20} color="#64748b" />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '15px', cursor: 'pointer', width: '100%' }}>
              {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '140px' : '200px'}, 1fr))`, gap: '16px' }}>
          {produtosFiltrados.map((produto) => (
            <div key={produto.id} style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '12px' : '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: isMobile ? '100px' : '140px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {produto.imagem ? <img src={produto.imagem} alt={produto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingCart size={32} color="#cbd5e1" />}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{produto.categoria}</span>
              <h3 style={{ fontSize: isMobile ? '13px' : '14px', color: '#1e1b4b', fontWeight: 'bold', margin: '4px 0', lineHeight: '1.2' }}>{produto.nome}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                <span style={{ fontSize: isMobile ? '14px' : '16px', color: '#4f46e5', fontWeight: '800' }}>{formatoMoeda(produto.preco)}</span>
                <span style={{ fontSize: '11px', color: produto.quantidade > 0 ? '#64748b' : '#ef4444', fontWeight: 'bold' }}>Qtd: {produto.quantidade}</span>
              </div>
              
              <button 
                onClick={() => adicionarAoCarrinho(produto)}
                style={{ background: '#f1f5f9', color: '#4f46e5', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', fontSize: isMobile ? '13px' : '14px' }}
              >
                <Plus size={16} /> {isMobile ? 'Add' : 'Adicionar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ================= LADO DIREITO: CARRINHO (SÓ APARECE SE TIVER ITENS) ================= */}
      {carrinho.length > 0 && (
        <div id="carrinho-mobile" style={{ 
          flex: isMobile ? 'none' : '1', 
          background: 'white', 
          borderRadius: '16px', 
          padding: isMobile ? '16px' : '24px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
          display: 'flex', 
          flexDirection: 'column', 
          width: isMobile ? '100%' : '400px',
          minWidth: isMobile ? '100%' : '360px',
          marginTop: isMobile ? '16px' : '0'
        }}>
          <h2 style={{ fontSize: '20px', color: '#1e1b4b', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={24} color="#4f46e5" /> Carrinho</h2>

          <div style={{ flexGrow: 1, overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: isMobile ? '0' : '8px' }}>
            {carrinho.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
                  <p style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '600', marginTop: '2px' }}>{formatoMoeda(item.preco)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                  <button onClick={() => removerDoCarrinho(item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><Minus size={16} /></button>
                  <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center', color: '#1e1b4b' }}>{item.quantidadeComprada}</span>
                  <button onClick={() => adicionarAoCarrinho(item)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><Plus size={16} /></button>
                  <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }}></div>
                  <button onClick={() => removerDoCarrinho(item.id, true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Forma de Pagamento</label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', cursor: 'pointer', background: '#f8fafc' }}>
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Anotar (Fiado)">Anotar na Conta (Fiado)</option>
              </select>
            </div>

            {formaPagamento === 'Anotar (Fiado)' ? (
              <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase' }}>Venda no Fiado</span>
                
                {clienteSelecionado ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                    <span style={{ color: '#1e1b4b', fontWeight: 'bold', fontSize: '14px' }}>👤 {clienteSelecionado.nome}</span>
                    <button onClick={() => setClienteSelecionado(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                ) : criandoClienteRapido ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" placeholder="Nome" value={novoClienteNome} onChange={(e) => setNovoClienteNome(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }} />
                    <button onClick={handleCadastrarClienteRapido} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Salvar</button>
                    <button onClick={() => setCriandoClienteRapido(false)} style={{ background: '#cbd5e1', color: '#475569', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>X</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" placeholder="Buscar cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }} />
                      <button onClick={() => setCriandoClienteRapido(true)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><UserPlus size={16}/></button>
                    </div>
                    
                    {buscaCliente.trim() && (
                      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {clientesFiltradosBusca.map(c => (
                          <button key={c.id} onClick={() => setClienteSelecionado(c)} style={{ background: 'transparent', border: 'none', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#1e1b4b', borderBottom: '1px solid #f1f5f9' }}>
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Cliente (Opcional)</label>
                <input type="text" placeholder="Ex: Maria José" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }} />
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 'bold' }}>Subtotal:</span>
              <span style={{ fontSize: '24px', color: '#1e1b4b', fontWeight: '900' }}>{formatoMoeda(calcularSubtotal())}</span>
            </div>

            <button onClick={prepararVenda} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }}>
              Fechar Venda <Plus size={20} />
            </button>
          </div>
        </div>
      )}

      {/* === MODAL DE RESUMO, DESCONTO E IDENTIFICAÇÃO === */}
      {modalConfirmacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', padding: isMobile ? '24px' : '32px', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: isMobile ? '18px' : '22px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Receipt size={28} color="#4f46e5" /> Resumo da Venda
              </h3>
              <button onClick={() => setModalConfirmacao(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={28} /></button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Itens Registrados</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                {carrinho.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#1e1b4b' }}>
                    <span>{item.quantidadeComprada}x {item.nome}</span>
                    <span style={{ fontWeight: '600' }}>{formatoMoeda(item.preco * item.quantidadeComprada)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '15px' }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>Tipo de Venda:</span>
              <span style={{ color: formaPagamento === 'Anotar (Fiado)' ? '#ef4444' : '#1e1b4b', fontWeight: 'bold', background: formaPagamento === 'Anotar (Fiado)' ? '#fee2e2' : '#e0e7ff', padding: '4px 12px', borderRadius: '6px' }}>
                {formaPagamento === 'Anotar (Fiado)' ? `Fiado 👤 ${clienteSelecionado?.nome}` : formaPagamento}
              </span>
            </div>

            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Subtotal:</span>
                <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold' }}>{formatoMoeda(calcularSubtotal())}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={16} /> Desconto:</span>
                <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                  <select value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', cursor: 'pointer', background: 'white' }}>
                    <option value="R$">-R$</option>
                    <option value="%">-%</option>
                  </select>
                  <input 
                    type="number" min="0" placeholder="0.00" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} 
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', width: isMobile ? '100%' : '90px', textAlign: 'right' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #cbd5e1', paddingTop: '16px' }}>
                <span style={{ fontSize: isMobile ? '15px' : '18px', color: '#1e1b4b', fontWeight: 'bold' }}>
                  {formaPagamento === 'Anotar (Fiado)' ? 'Lançar:' : 'Receber:'}
                </span>
                <span style={{ fontSize: isMobile ? '22px' : '28px', color: formaPagamento === 'Anotar (Fiado)' ? '#ef4444' : '#10b981', fontWeight: '900' }}>
                  {formatoMoeda(calcularTotalFinal())}
                </span>
              </div>
            </div>

            <form onSubmit={confirmarEFinalizarVenda} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16}/> Vendedor / Responsável
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome de quem está finalizando..." 
                  value={vendedorNome} 
                  onChange={(e) => setVendedorNome(e.target.value)} 
                  style={{ padding: '14px', borderRadius: '8px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '15px', background: '#f8fafc' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="button" disabled={processando} onClick={() => setModalConfirmacao(false)} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', padding: '16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Voltar
                </button>
                <button type="submit" disabled={processando} style={{ flex: 2, background: processando ? '#94a3b8' : (formaPagamento === 'Anotar (Fiado)' ? '#ef4444' : '#10b981'), color: 'white', border: 'none', padding: '16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} /> 
                  {processando ? 'Processando...' : (formaPagamento === 'Anotar (Fiado)' ? 'Confirmar e Pendurar' : 'Confirmar Venda')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* === BOTÃO FLUTUANTE PARA MOBILE === */}
      {isMobile && carrinho.length > 0 && (
        <button 
          onClick={rolarParaCarrinho}
          style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#4f46e5', color: 'white', padding: '16px', borderRadius: '50%', border: 'none', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'pointer' }}
        >
          <ShoppingCart size={24} />
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>
            {carrinho.reduce((acc, item) => acc + item.quantidadeComprada, 0)}
          </span>
        </button>
      )}

    </div>
  )
}