import { useState, useEffect, useRef } from 'react'
import { Search, Filter, ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Tag, UserCheck, X, Receipt, LayoutGrid, Lock } from 'lucide-react'

import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Venda() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  
  const [carrinho, setCarrinho] = useState([])
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  
  const [pagamentos, setPagamentos] = useState({
    dinheiro: '',
    pix: '',
    cartaoCredito: '',
    cartaoDebito: ''
  })
  
  const [aplicarDesconto, setAplicarDesconto] = useState(false)
  const [descontoTipo, setDescontoTipo] = useState('R$')
  const [descontoValor, setDescontoValor] = useState('')
  const [senhaDesconto, setSenhaDesconto] = useState('')

  const [modalConfirmacao, setModalConfirmacao] = useState(false)

  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false)
  const [vendedorNome, setVendedorNome] = useState('')
  const [listaVendedores, setListaVendedores] = useState([])

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [processando, setProcessando] = useState(false)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const inputBuscaRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        if (modalConfirmacao) {
          document.getElementById('btn-confirmar-venda')?.click()
        } else {
          document.getElementById('btn-fechar-venda')?.click()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalConfirmacao])

  useEffect(() => {
    if (!modalConfirmacao && !carrinhoAberto && !modalCategoriasAberta) {
      inputBuscaRef.current?.focus()
    }
  }, [modalConfirmacao, carrinhoAberto, modalCategoriasAberta])

  useEffect(() => {
    if (modalCategoriasAberta || carrinhoAberto || modalConfirmacao) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [modalCategoriasAberta, carrinhoAberto, modalConfirmacao])

  useEffect(() => {
    const carregarDadosNuvem = async () => {
      try {
        const queryProdutos = await getDocs(collection(db, "produtos"))
        const listaP = queryProdutos.docs.map(d => ({ id: d.id, ...d.data() }))
        setProdutos(listaP)

        const docRefVendedores = doc(db, "configuracoes", "vendedores")
        const docSnapVendedores = await getDoc(docRefVendedores)
        if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
          setListaVendedores(docSnapVendedores.data().lista)
        } else {
          setListaVendedores([])
        }
      } catch (error) {
        console.error("Erro ao carregar dados na frente de caixa:", error)
        setErro("Falha ao sincronizar dados com o servidor.")
      }
    }
    carregarDadosNuvem()
  }, [sucesso])

  let catSet = new Set()
  produtos.forEach(p => {
    if (p.categorias && Array.isArray(p.categorias)) {
      p.categorias.forEach(c => catSet.add(c))
    } else if (p.categoria) {
      catSet.add(p.categoria)
    }
  })
  const categoriasUnicas = ['Todas', 'Promoções', ...Array.from(catSet).sort((a, b) => a.localeCompare(b))]
  const categoriasExibidas = isMobile ? categoriasUnicas.slice(0, 3) : categoriasUnicas
  const mostrarBotaoTodasCategorias = isMobile && categoriasUnicas.length > 3

  const produtosFiltrados = produtos.filter(produto => {
    const termoBusca = busca.toLowerCase()
    const strCategorias = (produto.categorias || []).join(' ').toLowerCase()
    const catAntiga = (produto.categoria || '').toLowerCase()

    const matchBusca = 
      produto.nome.toLowerCase().includes(termoBusca) || 
      strCategorias.includes(termoBusca) ||
      catAntiga.includes(termoBusca) ||
      (produto.codigoBarras && produto.codigoBarras.includes(termoBusca))
      
    let matchCategoria = false
    if (categoriaFiltro === 'Todas') {
      matchCategoria = true
    } else if (categoriaFiltro === 'Promoções') {
      matchCategoria = Number(produto.precoAntigo) > Number(produto.preco)
    } else {
      matchCategoria = (produto.categorias && produto.categorias.includes(categoriaFiltro)) || produto.categoria === categoriaFiltro
    }

    return matchBusca && matchCategoria
  })

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
        item.id === id ? { ...item, quantidadeComprada: item.quantidadeComprada - 1 } : item
      ))
    }
  }

  const handleBuscaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (busca.trim()) {
        const produtoEncontrado = produtos.find(p => p.codigoBarras === busca.trim())
        if (produtoEncontrado) {
          adicionarAoCarrinho(produtoEncontrado)
          setBusca('')
        }
      }
    }
  }

  const calcularSubtotal = () => carrinho.reduce((total, item) => total + (Number(item.preco) * item.quantidadeComprada), 0)

  const calcularDescontoReal = () => {
    if (!aplicarDesconto) return 0
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

  const calcularTotalFinal = () => calcularSubtotal() - calcularDescontoReal()

  const calcularTotalPago = () => {
    return (parseFloat(pagamentos.dinheiro) || 0) + 
           (parseFloat(pagamentos.pix) || 0) + 
           (parseFloat(pagamentos.cartaoCredito) || 0) + 
           (parseFloat(pagamentos.cartaoDebito) || 0)
  }

  const prepararVenda = () => {
    if (carrinho.length === 0) {
      setErro('O carrinho está vazio!')
      return
    }
    setErro('')
    if (calcularTotalPago() === 0) {
       setPagamentos(prev => ({ ...prev, dinheiro: calcularTotalFinal().toFixed(2) }))
    }
    setModalConfirmacao(true)
  }

  const confirmarEFinalizarVenda = async (e) => {
    if(e) e.preventDefault()
    setErro('')

    const totalVenda = calcularTotalFinal()
    const totalPago = calcularTotalPago()

    if (totalPago < totalVenda - 0.01) {
      setErro(`Falta R$ ${(totalVenda - totalPago).toFixed(2)} para completar o pagamento.`)
      return
    }

    if (aplicarDesconto && calcularDescontoReal() > 0 && senhaDesconto !== '0000') {
      setErro('Senha de desconto incorreta! A venda não pode ser finalizada.')
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

      const formasUsadas = []
      if (parseFloat(pagamentos.dinheiro) > 0) formasUsadas.push('Dinheiro')
      if (parseFloat(pagamentos.pix) > 0) formasUsadas.push('Pix')
      if (parseFloat(pagamentos.cartaoCredito) > 0) formasUsadas.push('Crédito')
      if (parseFloat(pagamentos.cartaoDebito) > 0) formasUsadas.push('Débito')

      const novaVenda = {
        idRegistro: Date.now(),
        tipo: 'VENDA', 
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR'),
        itens: carrinho.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: Number(item.preco), 
          quantidadeComprada: item.quantidadeComprada,
          categoria: item.categorias ? item.categorias.join(', ') : (item.categoria || 'Sem categoria')
        })),
        subtotal: calcularSubtotal(),
        desconto: calcularDescontoReal(),
        total: totalVenda,
        formaPagamento: formasUsadas.join(' + '),
        pagamentosDetalhados: pagamentos,
        vendedor: vendedorNome || 'Não informado'
      }

      await addDoc(collection(db, "historico"), novaVenda)

      setSucesso(true)
      setCarrinho([])
      setDescontoValor('')
      setSenhaDesconto('')
      setAplicarDesconto(false)
      setPagamentos({ dinheiro: '', pix: '', cartaoCredito: '', cartaoDebito: '' })
      setVendedorNome('')
      setErro('')
      setModalConfirmacao(false)
      setCarrinhoAberto(false)

      setTimeout(() => setSucesso(false), 3000)
    } catch (error) {
      console.error("Erro crítico ao finalizar venda:", error)
      setErro("Erro ao processar venda na nuvem. Verifique o estoque e tente novamente.")
    } finally {
      setProcessando(false)
    }
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const renderCarrinho = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px', flexShrink: 0 }}>
        <h2 style={{ fontSize: '20px', color: '#1e1b4b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={24} color="#4f46e5" /> Carrinho
        </h2>
        {isMobile && (
          <button onClick={() => setCarrinhoAberto(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
        {carrinho.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0' }}>{item.nome}</p>
              <p style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '600', margin: '4px 0 0 0' }}>
                {formatoMoeda(item.preco)}
              </p>
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

      <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 'bold' }}>Total Carrinho:</span>
          <span style={{ fontSize: '24px', color: '#1e1b4b', fontWeight: '900' }}>{formatoMoeda(calcularSubtotal())}</span>
        </div>

        <button id="btn-fechar-venda" onClick={prepararVenda} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }}>
          Fechar Venda [F11] <Plus size={20} />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '32px', height: isMobile ? 'auto' : 'calc(100vh - 80px)', overflowY: isMobile ? 'visible' : 'hidden', position: 'relative' }}>
      
      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0 }}>Venda Finalizada!</h2>
            <p style={{ color: '#64748b', margin: 0 }}>A movimentação foi registrada com sucesso no sistema.</p>
          </div>
        </div>
      )}

      {modalCategoriasAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalCategoriasAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={24} color="#4f46e5" /> Todas as Categorias
              </h2>
              <button onClick={() => setModalCategoriasAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {categoriasUnicas.map(cat => (
                <button
                  key={`modal-${cat}`}
                  onClick={() => {
                    setCategoriaFiltro(cat)
                    setModalCategoriasAberta(false)
                  }}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    background: categoriaFiltro === cat ? '#4f46e5' : '#f9fafb',
                    color: categoriaFiltro === cat ? 'white' : '#1f2937',
                    border: '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? '0' : '16px' }}>
        <header>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Frente de Caixa</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px' }}>Bipe com o leitor ou busque para adicionar ao carrinho</p>
        </header>

        {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '2px solid #cbd5e1' }}>
            <Search size={20} color="#64748b" />
            <input 
              ref={inputBuscaRef}
              type="text" 
              placeholder="Escanear código de barras (Leitor) ou digitar nome..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              onKeyDown={handleBuscaKeyDown}
              style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '16px', marginBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 10, flexShrink: 0 }}>
          {categoriasExibidas.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategoriaFiltro(cat)} 
              style={{ 
                padding: '10px 20px', 
                borderRadius: '10px', 
                background: categoriaFiltro === cat ? '#4f46e5' : '#f1f5f9', 
                color: categoriaFiltro === cat ? 'white' : '#64748b', 
                border: 'none', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                flexShrink: 0,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                transition: '0.2s',
                boxShadow: categoriaFiltro === cat ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
          
          {mostrarBotaoTodasCategorias && (
            <button 
              onClick={() => setModalCategoriasAberta(true)} 
              style={{ 
                padding: '10px 20px', 
                borderRadius: '10px', 
                background: '#e2e8f0', 
                color: '#1e1b4b', 
                border: 'none', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                flexShrink: 0,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LayoutGrid size={16} /> Todas Categorias
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '160px' : '180px'}, 1fr))`, gap: '16px' }}>
          {produtosFiltrados.map((produto) => {
            return (
              <div 
                key={produto.id} 
                onClick={() => adicionarAoCarrinho(produto)}
                style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', margin: 0, display: 'flex', justifyContent: 'space-between' }}>
                  {produto.codigoBarras || 'Sem Código'}
                  {Number(produto.precoAntigo) > Number(produto.preco) && (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Promoção</span>
                  )}
                </span>
                
                <h3 style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', margin: '4px 0 0 0', lineHeight: '1.2', flex: 1 }}>{produto.nome}</h3>
                
                <span style={{ fontSize: '18px', color: '#4f46e5', fontWeight: '900', marginTop: '4px' }}>
                  {formatoMoeda(produto.preco)}
                </span>
                
                <span style={{ fontSize: '12px', color: produto.quantidade > 0 ? '#64748b' : '#ef4444', fontWeight: 'bold' }}>
                  Estoque: {produto.quantidade} un.
                </span>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); adicionarAoCarrinho(produto); }}
                  style={{ background: '#f8fafc', color: '#4f46e5', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', fontSize: '13px' }}
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {!isMobile && carrinho.length > 0 && (
        <div style={{ width: '400px', minWidth: '400px', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          {renderCarrinho()}
        </div>
      )}

      {isMobile && carrinhoAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '400px', height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', animation: 'slideInRight 0.3s' }}>
            {renderCarrinho()}
          </div>
        </div>
      )}

      {isMobile && carrinho.length > 0 && (
        <button 
          onClick={() => setCarrinhoAberto(true)}
          style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#4f46e5', color: 'white', padding: '16px', borderRadius: '50%', border: 'none', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'pointer' }}
        >
          <ShoppingCart size={24} />
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>
            {carrinho.reduce((acc, item) => acc + item.quantidadeComprada, 0)}
          </span>
        </button>
      )}

      {modalConfirmacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', padding: isMobile ? '24px' : '32px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: isMobile ? '18px' : '22px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Receipt size={28} color="#4f46e5" /> Finalizar Venda
              </h3>
              <button onClick={() => setModalConfirmacao(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={28} /></button>
            </div>

            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Subtotal:</span>
                <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold' }}>{formatoMoeda(calcularSubtotal())}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', cursor: 'pointer' }}>
                  <input type="checkbox" checked={aplicarDesconto} onChange={(e) => {
                    setAplicarDesconto(e.target.checked);
                    if(!e.target.checked) {
                      setDescontoValor('');
                      setSenhaDesconto('');
                    }
                  }} style={{ width: '18px', height: '18px' }} />
                  Aplica desconto?
                </label>
                
                {aplicarDesconto && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                    <select value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', cursor: 'pointer', background: 'white' }}>
                      <option value="R$">R$</option>
                      <option value="%">%</option>
                    </select>
                    <input 
                      type="number" min="0" placeholder="0.00" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', width: '90px', textAlign: 'right' }} 
                    />
                    {parseFloat(descontoValor) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '0 8px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                        <Lock size={14} color="#ef4444"/>
                        <input 
                          type="password" placeholder="Senha (0000)" value={senhaDesconto} onChange={(e) => setSenhaDesconto(e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '90px', padding: '8px 0', fontSize: '13px' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #cbd5e1', paddingTop: '12px' }}>
                <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold' }}>TOTAL A PAGAR:</span>
                <span style={{ fontSize: '28px', color: '#ef4444', fontWeight: '900' }}>
                  {formatoMoeda(calcularTotalFinal())}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Pagamentos Múltiplos</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#475569' }}>Dinheiro:</label>
                  <input type="number" placeholder="0.00" value={pagamentos.dinheiro} onChange={e => setPagamentos({...pagamentos, dinheiro: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '15px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#475569' }}>Pix:</label>
                  <input type="number" placeholder="0.00" value={pagamentos.pix} onChange={e => setPagamentos({...pagamentos, pix: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '15px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#475569' }}>Cartão Créd.:</label>
                  <input type="number" placeholder="0.00" value={pagamentos.cartaoCredito} onChange={e => setPagamentos({...pagamentos, cartaoCredito: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '15px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#475569' }}>Cartão Déb.:</label>
                  <input type="number" placeholder="0.00" value={pagamentos.cartaoDebito} onChange={e => setPagamentos({...pagamentos, cartaoDebito: e.target.value})} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '15px' }} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>Total Pago (+):</span>
                  <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold' }}>{formatoMoeda(calcularTotalPago())}</span>
                </div>
                
                {calcularTotalPago() > calcularTotalFinal() && parseFloat(pagamentos.dinheiro) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '10px', borderRadius: '8px', border: '1px solid #10b981', marginTop: '8px' }}>
                    <span style={{ fontSize: '18px', color: '#047857', fontWeight: '900' }}>TROCO:</span>
                    <span style={{ fontSize: '24px', color: '#047857', fontWeight: '900' }}>
                      {formatoMoeda(calcularTotalPago() - calcularTotalFinal())}
                    </span>
                  </div>
                )}
                
                {calcularTotalPago() < calcularTotalFinal() && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: '600' }}>Falta pagar:</span>
                    <span style={{ fontSize: '16px', color: '#ef4444', fontWeight: 'bold' }}>{formatoMoeda(calcularTotalFinal() - calcularTotalPago())}</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={confirmarEFinalizarVenda} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16}/> Vendedor / Responsável (Opcional)
                </label>
                <select 
                  value={vendedorNome} 
                  onChange={(e) => setVendedorNome(e.target.value)} 
                  style={{ padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', background: '#f8fafc', cursor: 'pointer' }} 
                >
                  <option value="">
                    {listaVendedores.length > 0 ? "Selecione o vendedor..." : "Cadastre vendedores nas configurações"}
                  </option>
                  {listaVendedores.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="button" disabled={processando} onClick={() => setModalConfirmacao(false)} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', padding: '16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                  Voltar
                </button>
                <button id="btn-confirmar-venda" type="submit" disabled={processando || calcularTotalPago() < calcularTotalFinal() - 0.01} style={{ flex: 2, background: (processando || calcularTotalPago() < calcularTotalFinal() - 0.01) ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '10px', fontWeight: 'bold', cursor: (processando || calcularTotalPago() < calcularTotalFinal() - 0.01) ? 'not-allowed' : 'pointer', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} /> 
                  {processando ? 'Processando...' : 'Confirmar Venda [F11]'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}