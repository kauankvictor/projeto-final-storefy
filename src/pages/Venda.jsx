import { useState, useEffect, useRef } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, UserCheck, X, Receipt, Lock, Barcode, ShoppingBag } from 'lucide-react'

import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Venda() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  
  const [carrinho, setCarrinho] = useState([])
  
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
  
  // Senhas autorizadas para aplicar desconto
  const [senhasAutorizadas, setSenhasAutorizadas] = useState({ proprietario: '', gerente: '' })

  const [modalConfirmacao, setModalConfirmacao] = useState(false)
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
    if (!modalConfirmacao) {
      inputBuscaRef.current?.focus()
    }
  }, [modalConfirmacao])

  useEffect(() => {
    if (modalConfirmacao) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [modalConfirmacao])

  useEffect(() => {
    const carregarDadosNuvem = async () => {
      try {
        const queryProdutos = await getDocs(collection(db, "produtos"))
        const listaP = queryProdutos.docs.map(d => ({ id: d.id, ...d.data() }))
        setProdutos(listaP)

        // Carrega Vendedores
        const docRefVendedores = doc(db, "configuracoes", "vendedores")
        const docSnapVendedores = await getDoc(docRefVendedores)
        if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
          setListaVendedores(docSnapVendedores.data().lista)
        } else {
          setListaVendedores([])
        }

        // Carrega Senhas do Cofre
        const docRefSeg = doc(db, "configuracoes", "seguranca")
        const docSnapSeg = await getDoc(docRefSeg)
        if (docSnapSeg.exists()) {
          const dadosSeg = docSnapSeg.data()
          setSenhasAutorizadas({
            proprietario: dadosSeg.senhaProprietario || dadosSeg.senhaMaster || '',
            gerente: dadosSeg.senhaGerente || ''
          })
        }

      } catch (error) {
        console.error("Erro ao carregar dados na frente de caixa:", error)
        setErro("Falha ao sincronizar dados com o servidor.")
      }
    }
    carregarDadosNuvem()
  }, [sucesso])

  const produtosFiltradosBusca = busca.trim().length > 0 ? produtos.filter(produto => {
    const termoBusca = busca.toLowerCase()
    return produto.nome.toLowerCase().includes(termoBusca) || 
           (produto.codigoBarras && produto.codigoBarras.includes(termoBusca))
  }).slice(0, 15) : [] 

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
      setCarrinho([{ ...produto, quantidadeComprada: 1 }, ...carrinho])
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
      setErro('A lista de produtos está vazia!')
      return
    }
    setErro('')
    setModalConfirmacao(true)
  }

  const confirmarEFinalizarVenda = async (e) => {
    if(e) e.preventDefault()
    setErro('')

    const totalVenda = calcularTotalFinal()
    const totalPago = calcularTotalPago()

    if (totalPago < totalVenda - 0.01) {
      setErro(`Falta saldo para completar o pagamento.`)
      return
    }

    // Validação de segurança do Desconto
    if (aplicarDesconto && calcularDescontoReal() > 0) {
      const isProprietario = senhasAutorizadas.proprietario && senhaDesconto === senhasAutorizadas.proprietario;
      const isGerente = senhasAutorizadas.gerente && senhaDesconto === senhasAutorizadas.gerente;
      
      if (!isProprietario && !isGerente) {
        setErro('Senha incorreta! Apenas o Proprietário ou Gerente podem autorizar descontos.')
        return
      }
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
          codigoBarras: item.codigoBarras || '',
          preco: Number(item.preco), 
          custo: Number(item.custo || item.precoCusto || 0),
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

      setTimeout(() => setSucesso(false), 500)
    } catch (error) {
      console.error("Erro crítico ao finalizar venda:", error)
      setErro("Erro ao processar venda na nuvem. Verifique o estoque e tente novamente.")
    } finally {
      setProcessando(false)
    }
  }

  const fecharModal = () => {
    setModalConfirmacao(false)
    setErro('')
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', height: isMobile ? 'auto' : 'calc(100vh - 80px)', position: 'relative' }}>
      
      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0 }}>Venda Finalizada!</h2>
            <p style={{ color: '#64748b', margin: 0 }}>A movimentação foi registrada com sucesso.</p>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        <header>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Frente de Caixa</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px' }}>Terminal de vendas rápido e direto.</p>
        </header>

        {erro && !modalConfirmacao && (
          <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <AlertCircle size={20} />{erro}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '16px 20px', borderRadius: '16px', width: '100%', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '2px solid #4f46e5', boxSizing: 'border-box' }}>
            <Barcode size={24} color="#4f46e5" />
            <input 
              ref={inputBuscaRef}
              type="text" 
              placeholder="Bipe com o leitor ou digite o nome do produto..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              onKeyDown={handleBuscaKeyDown}
              style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', color: '#1e1b4b', fontSize: '18px', fontWeight: '500' }} 
            />
            {busca && (
              <button onClick={() => setBusca('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            )}
          </div>

          {busca.trim().length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', marginTop: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {produtosFiltradosBusca.length > 0 ? (
                produtosFiltradosBusca.map(produto => (
                  <div 
                    key={produto.id} 
                    onClick={() => { adicionarAoCarrinho(produto); setBusca(''); inputBuscaRef.current?.focus(); }}
                    style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e1b4b', fontSize: '15px' }}>{produto.nome}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>Cód: {produto.codigoBarras || 'S/N'} | Estoque: {produto.quantidade}</div>
                    </div>
                    <div style={{ fontWeight: '900', color: '#4f46e5', fontSize: '16px' }}>{formatoMoeda(produto.preco)}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum produto encontrado.</div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingBottom: '20px', scrollbarWidth: 'none' }}>
          {carrinho.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '16px', opacity: 0.7, marginTop: '40px' }}>
              <ShoppingCart size={64} />
              <p style={{ fontSize: '18px', fontWeight: '500' }}>Aguardando produtos...</p>
            </div>
          ) : (
            carrinho.map((item, index) => (
              <div key={item.id + index} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', background: 'white', borderRadius: '16px', padding: '20px', gap: '20px', border: '1px solid #e2e8f0', borderLeft: '6px solid #4f46e5', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Barcode size={16} /> {item.codigoBarras || 'SEM CÓDIGO'}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e1b4b', lineHeight: '1.2' }}>{item.nome}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '24px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <button onClick={() => removerDoCarrinho(item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}><Minus size={18} /></button>
                    <span style={{ fontWeight: '900', fontSize: '18px', width: '30px', textAlign: 'center', color: '#1e1b4b' }}>{item.quantidadeComprada}</span>
                    <button onClick={() => adicionarAoCarrinho(item)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}><Plus size={18} /></button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '100px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{item.quantidadeComprada}x {formatoMoeda(item.preco)}</span>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#4f46e5' }}>{formatoMoeda(item.preco * item.quantidadeComprada)}</span>
                  </div>

                  <button onClick={() => removerDoCarrinho(item.id, true)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fca5a5'} onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}>
                    <Trash2 size={20} />
                  </button>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '380px', minWidth: isMobile ? '100%' : '380px', background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
            <ShoppingBag size={24} color="#4f46e5"/> Resumo da Venda
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>Itens Registrados:</span>
              <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold' }}>{carrinho.reduce((acc, item) => acc + item.quantidadeComprada, 0)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>Subtotal:</span>
              <span style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: '900' }}>{formatoMoeda(calcularSubtotal())}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', borderTop: '2px dashed #cbd5e1', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: '900' }}>TOTAL</span>
            <span style={{ fontSize: '32px', color: '#000000', fontWeight: '900' }}>
              {formatoMoeda(calcularSubtotal())}
            </span>
          </div>

          <button id="btn-fechar-venda" onClick={prepararVenda} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '20px', transition: '0.2s', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            PAGAR [F11] <CheckCircle size={24} />
          </button>
        </div>
      </div>

      {modalConfirmacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 6000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', padding: isMobile ? '24px' : '32px', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: isMobile ? '20px' : '24px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: '900' }}>
                <Receipt size={28} color="#4f46e5" /> Fechar Pagamento
              </h3>
              <button onClick={fecharModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            {/* AVISO DE ERRO DENTRO DO MODAL */}
            {erro && (
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '24px' }}>
                <AlertCircle size={20} />{erro}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '32px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Subtotal:</span>
                    <span style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: 'bold' }}>{formatoMoeda(calcularSubtotal())}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', cursor: 'pointer' }}>
                      <input type="checkbox" checked={aplicarDesconto} onChange={(e) => {
                        setAplicarDesconto(e.target.checked);
                        if(!e.target.checked) {
                          setDescontoValor('');
                          setSenhaDesconto('');
                        }
                      }} style={{ width: '20px', height: '20px', accentColor: '#4f46e5' }} />
                      Aplicar Desconto?
                    </label>
                    
                    {aplicarDesconto && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <select value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', cursor: 'pointer', background: '#f8fafc' }}>
                          <option value="R$">R$</option>
                          <option value="%">%</option>
                        </select>
                        <input 
                          type="number" min="0" placeholder="0.00" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} 
                          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100px', textAlign: 'right' }} 
                        />
                        {parseFloat(descontoValor) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', padding: '0 12px', borderRadius: '8px', border: '1px solid #ef4444', flex: 1 }}>
                            <Lock size={16} color="#ef4444"/>
                            <input 
                              type="password" placeholder="Senha do Gerente ou Proprietário" value={senhaDesconto} onChange={(e) => setSenhaDesconto(e.target.value)}
                              style={{ border: 'none', outline: 'none', width: '100%', padding: '10px 0', fontSize: '14px', background: 'transparent' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #cbd5e1', paddingTop: '16px', marginTop: '4px' }}>
                    <span style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: '900' }}>TOTAL A PAGAR:</span>
                    <span style={{ fontSize: '32px', color: '#000000', fontWeight: '900' }}>
                      {formatoMoeda(calcularTotalFinal())}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18}/> Atendente (Opcional)
                  </label>
                  <select 
                    value={vendedorNome} 
                    onChange={(e) => setVendedorNome(e.target.value)} 
                    style={{ padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', background: '#f8fafc', cursor: 'pointer', fontWeight: '500' }} 
                  >
                    <option value="">
                      {listaVendedores.length > 0 ? "Selecione o vendedor..." : "Cadastre vendedores nas configurações"}
                    </option>
                    {listaVendedores.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', marginTop: 0 }}>Métodos de Pagamento</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>Dinheiro:</label>
                      <input type="number" placeholder="0.00" value={pagamentos.dinheiro} onChange={e => setPagamentos({...pagamentos, dinheiro: e.target.value})} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>Pix:</label>
                      <input type="number" placeholder="0.00" value={pagamentos.pix} onChange={e => setPagamentos({...pagamentos, pix: e.target.value})} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>Crédito:</label>
                      <input type="number" placeholder="0.00" value={pagamentos.cartaoCredito} onChange={e => setPagamentos({...pagamentos, cartaoCredito: e.target.value})} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>Débito:</label>
                      <input type="number" placeholder="0.00" value={pagamentos.cartaoDebito} onChange={e => setPagamentos({...pagamentos, cartaoDebito: e.target.value})} style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: '#475569', fontWeight: '600' }}>Total Informado:</span>
                    <span style={{ fontSize: '20px', color: '#1e1b4b', fontWeight: '900' }}>{formatoMoeda(calcularTotalPago())}</span>
                  </div>
                  
                  {calcularTotalPago() > calcularTotalFinal() && parseFloat(pagamentos.dinheiro) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d1fae5', padding: '16px', borderRadius: '12px', border: '2px solid #10b981', marginTop: '4px' }}>
                      <span style={{ fontSize: '20px', color: '#047857', fontWeight: '900' }}>TROCO:</span>
                      <span style={{ fontSize: '28px', color: '#047857', fontWeight: '900' }}>
                        {formatoMoeda(calcularTotalPago() - calcularTotalFinal())}
                      </span>
                    </div>
                  )}
                  
                  {calcularTotalPago() < calcularTotalFinal() && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '15px', color: '#ef4444', fontWeight: 'bold' }}>Falta pagar:</span>
                      <span style={{ fontSize: '18px', color: '#ef4444', fontWeight: '900' }}>{formatoMoeda(calcularTotalFinal() - calcularTotalPago())}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                  <button type="button" disabled={processando} onClick={fecharModal} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '2px solid #cbd5e1', padding: '18px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
                    Cancelar
                  </button>
                  <button id="btn-confirmar-venda" type="submit" onClick={confirmarEFinalizarVenda} disabled={processando || calcularTotalPago() < calcularTotalFinal() - 0.01} style={{ flex: 1.5, background: (processando || calcularTotalPago() < calcularTotalFinal() - 0.01) ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '900', cursor: (processando || calcularTotalPago() < calcularTotalFinal() - 0.01) ? 'not-allowed' : 'pointer', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: (processando || calcularTotalPago() < calcularTotalFinal() - 0.01) ? 'none' : '0 10px 15px -3px rgba(16, 185, 129, 0.4)' }}>
                    <CheckCircle size={24} /> 
                    {processando ? 'Gerando...' : 'Confirmar [F11]'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}