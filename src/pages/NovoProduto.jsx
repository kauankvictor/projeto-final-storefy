import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, X, LayoutGrid, Plus, Star, RefreshCw } from 'lucide-react'

import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function NovoProduto() {
  const navigate = useNavigate()
  const nomeInputRef = useRef(null) // Ref para focar no campo Nome
 
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [codigosExistentes, setCodigosExistentes] = useState([])
  
  const [inputCategoria, setInputCategoria] = useState('')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([])
  
  const [custo, setCusto] = useState('')
  const [lucroPercentual, setLucroPercentual] = useState('')
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState('')
  
  const [descricao, setDescricao] = useState('')
  const [precoAntigo, setPrecoAntigo] = useState('')
 
  // Padrões do catálogo
  const [mostrarParcelamento, setMostrarParcelamento] = useState(false)
  const [maxParcelas, setMaxParcelas] = useState('')
  const [mostrarAvisoAcrescimo, setMostrarAvisoAcrescimo] = useState(true)

  const [visivelCatalogo, setVisivelCatalogo] = useState(false)
  const [destaque, setDestaque] = useState(false)
  const [nomeDestaque, setNomeDestaque] = useState('')
  
  // Controle Global do Sistema
  const [sistemaCatalogoAtivo, setSistemaCatalogoAtivo] = useState(true) 
 
  const [imagensPreviews, setImagensPreviews] = useState([])
  const [categoriasLista, setCategoriasLista] = useState([])
  const [eventosLista, setEventosLista] = useState([])
 
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false)
  const [modalEventosAberta, setModalEventosAberta] = useState(false)

  const [filaImagens, setFilaImagens] = useState([])
  const [imgObj, setImgObj] = useState(null)
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 })
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [arrastando, setArrastando] = useState(false)
  const [inicioArraste, setInicioArraste] = useState({ x: 0, y: 0 })

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault()
        document.getElementById('btn-salvar-produto')?.click()
      } else if (e.key === 'F3') {
        e.preventDefault()
        nomeInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/estoque')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
   
    const carregarConfiguracoesEListas = async () => {
      try {
        const docRefLoja = doc(db, "configuracoes", "loja")
        const docSnapLoja = await getDoc(docRefLoja)
        if (docSnapLoja.exists()) {
          const data = docSnapLoja.data()
          if (data.catalogoAtivo !== undefined) {
            setSistemaCatalogoAtivo(data.catalogoAtivo)
          }
        }

        const querySnapshot = await getDocs(collection(db, "produtos"))
        let catSet = new Set()
        let evSet = new Set()
        let codigosLista = []

        querySnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.codigoBarras) codigosLista.push(data.codigoBarras)
          if (data.categorias && Array.isArray(data.categorias)) {
            data.categorias.forEach(c => catSet.add(c))
          } else if (data.categoria) {
            catSet.add(data.categoria)
          }
          if (data.nomeDestaque) {
            evSet.add(data.nomeDestaque)
          }
        })

        setCodigosExistentes(codigosLista)
        setCategoriasLista([...catSet].sort((a, b) => a.localeCompare(b)))
        setEventosLista([...evSet].sort((a, b) => a.localeCompare(b)))
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }

    carregarConfiguracoesEListas()
    
    // Foca no nome ao carregar a página
    setTimeout(() => nomeInputRef.current?.focus(), 100)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (filaImagens.length > 0 && !imgObj) {
      const file = filaImagens[0]
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const coverRatio = Math.max(300 / img.width, 300 / img.height)
        setBaseSize({ w: img.width * coverRatio, h: img.height * coverRatio })
        setImgObj(img)
        setPosicao({ x: 0, y: 0 })
        setZoom(1)
      }
      img.src = url
    }
  }, [filaImagens, imgObj])

  const gerarCodigoUnico = () => {
    let novoCodigo = ''
    let tentativas = 0
    while (true) {
      novoCodigo = Math.floor(10000 + Math.random() * 90000).toString()
      if (!codigosExistentes.includes(novoCodigo)) break
      tentativas++
      if (tentativas > 1000) break
    }
    setCodigoBarras(novoCodigo)
  }

  const handleImagemChange = (e) => {
    const files = Array.from(e.target.files)
    if (imagensPreviews.length + filaImagens.length + files.length > 5) {
      setErro('Você pode adicionar no máximo 5 fotos por produto.')
      return
    }
    setFilaImagens(prev => [...prev, ...files])
    e.target.value = null
    setErro('')
  }

  const removerImagem = (indexParaRemover) => {
    setImagensPreviews(prev => prev.filter((_, index) => index !== indexParaRemover))
  }

  const handleStartDrag = (clientX, clientY) => {
    setArrastando(true)
    setInicioArraste({ x: clientX - posicao.x, y: clientY - posicao.y })
  }

  const handleMoveDrag = (clientX, clientY) => {
    if (!arrastando) return
    setPosicao({ x: clientX - inicioArraste.x, y: clientY - inicioArraste.y })
  }

  const handleEndDrag = () => {
    setArrastando(false)
  }

  const pularRecorte = () => {
    setImgObj(null)
    setFilaImagens(prev => prev.slice(1))
  }

  const salvarRecorte = () => {
    const canvasOrig = document.createElement('canvas')
    let w = imgObj.width
    let h = imgObj.height
    const maxDim = 1200
    if (w > h && w > maxDim) { h *= maxDim / w; w = maxDim }
    else if (h > maxDim) { w *= maxDim / h; h = maxDim }
    
    canvasOrig.width = w
    canvasOrig.height = h
    const ctxOrig = canvasOrig.getContext('2d')
    ctxOrig.fillStyle = '#ffffff'
    ctxOrig.fillRect(0, 0, w, h)
    ctxOrig.drawImage(imgObj, 0, 0, w, h)
    const originalBase64 = canvasOrig.toDataURL('image/jpeg', 0.8)

    const canvasCrop = document.createElement('canvas')
    canvasCrop.width = 500
    canvasCrop.height = 500
    const ctxCrop = canvasCrop.getContext('2d')
    ctxCrop.fillStyle = '#ffffff'
    ctxCrop.fillRect(0, 0, 500, 500)

    const ratioCanvas = 500 / 300
    const finalW = baseSize.w * zoom * ratioCanvas
    const finalH = baseSize.h * zoom * ratioCanvas
    
    const dx = 250 - finalW / 2 + (posicao.x * ratioCanvas)
    const dy = 250 - finalH / 2 + (posicao.y * ratioCanvas)
    
    ctxCrop.drawImage(imgObj, dx, dy, finalW, finalH)
    const cropBase64 = canvasCrop.toDataURL('image/jpeg', 0.8)

    setImagensPreviews(prev => [...prev, { original: originalBase64, recortada: cropBase64 }])
    setImgObj(null)
    setFilaImagens(prev => prev.slice(1))
  }

  const adicionarCategoria = (e) => {
    if (e) e.preventDefault()
    if (inputCategoria.trim() !== '' && !categoriasSelecionadas.includes(inputCategoria.trim())) {
      setCategoriasSelecionadas([...categoriasSelecionadas, inputCategoria.trim()])
    }
    setInputCategoria('')
  }

  const removerCategoriaSelecionada = (catParaRemover) => {
    setCategoriasSelecionadas(categoriasSelecionadas.filter(cat => cat !== catParaRemover))
  }

  const toggleCategoriaModal = (cat) => {
    if (categoriasSelecionadas.includes(cat)) {
      removerCategoriaSelecionada(cat)
    } else {
      setCategoriasSelecionadas([...categoriasSelecionadas, cat])
    }
  }

  const calcularPrecoSugerido = () => {
    if (custo && lucroPercentual) {
      return (parseFloat(custo) * (1 + parseFloat(lucroPercentual) / 100)).toFixed(2)
    }
    return ''
  }

  const calcularMargemReal = () => {
    if (custo && preco) {
      const valorCusto = parseFloat(custo)
      const valorVenda = parseFloat(preco)
      if (valorCusto > 0 && valorVenda >= valorCusto) {
        const lucroReais = valorVenda - valorCusto
        const lucroPorcentagem = (lucroReais / valorCusto) * 100
        return `Lucro: R$ ${lucroReais.toFixed(2)} (${lucroPorcentagem.toFixed(1)}%)`
      } else if (valorVenda < valorCusto) {
        return `Prejuízo: R$ ${(valorCusto - valorVenda).toFixed(2)}`
      }
    }
    return null
  }

  const handleSalvar = async (e) => {
    if (e) e.preventDefault()

    if (nome.trim() === '' || preco.trim() === '') {
      setErro('Os campos Nome e Preço à Vista são obrigatórios.')
      setSucesso(false)
      return
    }

    if (codigoBarras.trim() !== '' && codigosExistentes.includes(codigoBarras.trim())) {
      setErro('Este código de barras já está em uso por outro produto. Digite outro ou gere um novo.')
      setSucesso(false)
      return
    }

    if (destaque && nomeDestaque.trim() === '') {
      setErro('Digite ou selecione um nome para a vitrine ou desmarque a opção de destaque.')
      return
    }

    setSalvando(true)

    try {
      const categoriaFallback = categoriasSelecionadas.length > 0 ? categoriasSelecionadas[0] : 'Sem Categoria'

      const produtoNovo = {
        nome,
        codigoBarras: codigoBarras.trim(),
        categorias: categoriasSelecionadas.length > 0 ? categoriasSelecionadas : ['Sem Categoria'],
        categoria: categoriaFallback,
        custo: custo ? parseFloat(custo) : 0,
        lucroPercentual: lucroPercentual ? parseFloat(lucroPercentual) : 0,
        preco: parseFloat(preco),
        precoAntigo: (visivelCatalogo && precoAntigo) ? parseFloat(precoAntigo) : null,
        quantidade: quantidade === '' ? 0 : parseInt(quantidade, 10),
        descricao: visivelCatalogo ? descricao.trim() : '',
        mostrarParcelamento: visivelCatalogo ? mostrarParcelamento : false,
        maxParcelas: visivelCatalogo && mostrarParcelamento && maxParcelas ? parseInt(maxParcelas, 10) : null,
        mostrarAvisoAcrescimo: visivelCatalogo ? mostrarAvisoAcrescimo : false,
        visivelCatalogo: visivelCatalogo,
        destaque: visivelCatalogo ? destaque : false,
        nomeDestaque: visivelCatalogo && destaque ? nomeDestaque.trim() : null,
        fotos: visivelCatalogo ? imagensPreviews : [], 
        dataCadastro: new Date().toISOString()
      }

      await addDoc(collection(db, "produtos"), produtoNovo)

      const logEstoqueNovo = {
        idRegistro: Date.now(),
        tipo: 'ESTOQUE',
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR'),
        produtoAlterado: nome,
        detalhes: `Entrada inicial de produto no sistema. Quantidade inserida: ${quantidade || 0} unidades.`
      }
      await addDoc(collection(db, "historico"), logEstoqueNovo)

      setErro('')
      setSucesso(true)
      setNome('')
      setCodigoBarras('')
      setCategoriasSelecionadas([])
      setInputCategoria('')
      setCusto('')
      setLucroPercentual('')
      setPreco('')
      setPrecoAntigo('')
      setQuantidade('')
      setDescricao('')
      setMostrarParcelamento(false)
      setMaxParcelas('')
      setMostrarAvisoAcrescimo(true)
      setVisivelCatalogo(false)
      setDestaque(false)
      setNomeDestaque('')
      setImagensPreviews([])
      
      setCodigosExistentes([...codigosExistentes, produtoNovo.codigoBarras])

      // Reduzido para sair mais rápido da tela (1200ms) e focar no input Nome novamente
      setTimeout(() => {
        setSucesso(false)
        nomeInputRef.current?.focus()
      }, 900)

    } catch (error) {
      setErro('Erro ao salvar o produto na nuvem. Verifique sua conexão.')
    } finally {
      setSalvando(false)
    }
  }

  const margemRealTexto = calcularMargemReal()

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
      
      {/* Editor de Imagem Modal */}
      {filaImagens.length > 0 && imgObj && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', userSelect: 'none' }}
          onMouseUp={handleEndDrag} onMouseLeave={handleEndDrag} onTouchEnd={handleEndDrag}
        >
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px' }}>Ajustar Foto ({imagensPreviews.length + 1})</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center' }}>Arraste a imagem para enquadrar no quadrado e use o zoom. A foto original sem cortes será preservada ao expandir no catálogo.</p>
            
            <div 
              onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
              onMouseMove={(e) => handleMoveDrag(e.clientX, e.clientY)}
              onTouchMove={(e) => handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY)}
              style={{ width: '300px', height: '300px', background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: '12px', overflow: 'hidden', position: 'relative', cursor: arrastando ? 'grabbing' : 'grab', touchAction: 'none' }}
            >
              <img 
                src={imgObj.src} 
                alt="Recorte" 
                draggable={false}
                style={{ 
                  position: 'absolute', left: '50%', top: '50%', width: baseSize.w, height: baseSize.h, 
                  transform: `translate(calc(-50% + ${posicao.x}px), calc(-50% + ${posicao.y}px)) scale(${zoom})`,
                  pointerEvents: 'none' 
                }} 
              />
            </div>

            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Zoom</span>
              <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#2563eb' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button type="button" onClick={pularRecorte} style={{ flex: 1, background: 'transparent', border: '1px solid #cbd5e1', color: '#475569', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={salvarRecorte} style={{ flex: 2, background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar Recorte</button>
            </div>
          </div>
        </div>
      )}

      {/* Categorias Modal */}
      {modalCategoriasAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalCategoriasAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={24} color="#2563eb" /> Múltiplas Categorias
              </h2>
              <button onClick={() => setModalCategoriasAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {categoriasLista.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Nenhuma categoria salva ainda.</p>
              ) : (
                categoriasLista.map(cat => {
                  const selecionada = categoriasSelecionadas.includes(cat)
                  return (
                    <button
                      key={`modal-cat-${cat}`}
                      onClick={() => toggleCategoriaModal(cat)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '16px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        background: selecionada ? '#dbeafe' : '#f9fafb',
                        color: selecionada ? '#2563eb' : '#1f2937',
                        border: selecionada ? '2px solid #2563eb' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      {cat}
                      {selecionada && <CheckCircle size={20} color="#2563eb" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Eventos/Vitrine Modal */}
      {modalEventosAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalEventosAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={24} color="#2563eb" /> Selecionar Vitrine
              </h2>
              <button onClick={() => setModalEventosAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {eventosLista.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Nenhuma vitrine/evento cadastrado ainda.</p>
              ) : (
                eventosLista.map(ev => (
                  <button
                    key={`modal-ev-${ev}`}
                    onClick={() => {
                      setNomeDestaque(ev)
                      setModalEventosAberta(false)
                    }}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      background: '#f9fafb',
                      color: '#1f2937',
                      border: '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {ev}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', boxSizing: 'border-box' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0, fontWeight: 'bold' }}>Cadastrado com Sucesso</h2>
            <p style={{ color: '#64748b', margin: 0, lineHeight: '1.4' }}>O produto foi enviado para a nuvem.</p>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Novo Produto</h1>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>F1: Salvar • F3: Nome • ESC: Voltar</span>
          </div>
        </div>
        
        <button 
          id="btn-salvar-produto"
          onClick={handleSalvar} 
          disabled={salvando} 
          style={{ background: salvando ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer', fontSize: '15px' }}
        >
          <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar (F1)'}
        </button>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}

      <form onSubmit={handleSalvar} style={{ background: 'white', padding: isMobile ? '20px' : '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Nome do Produto *</label>
          <input ref={nomeInputRef} type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite o nome do produto" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 50%', minWidth: 0 }}>
            <label style={{ fontWeight: '600', color: '#475569' }}>Código de Barras</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="Ex: 12345" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', flex: 1, minWidth: '80px', boxSizing: 'border-box' }} />
              <button type="button" onClick={gerarCodigoUnico} style={{ background: '#f8fafc', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <RefreshCw size={18} /> Gerar
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 50%', minWidth: 0 }}>
            <label style={{ fontWeight: '600', color: '#475569' }}>Categorias</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              
              {/* NOVA UI DE CATEGORIA COM TAGS DENTRO DO INPUT */}
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', alignItems: 'center', minHeight: '48px', boxSizing: 'border-box' }}>
                {categoriasSelecionadas.map((cat, index) => (
                  <div key={index} style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cat}
                    <button type="button" onClick={() => removerCategoriaSelecionada(cat)} style={{ background: 'transparent', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', display: 'flex' }}><X size={14}/></button>
                  </div>
                ))}
                <input 
                  type="text" 
                  value={inputCategoria} 
                  onChange={(e) => setInputCategoria(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarCategoria();
                    }
                  }}
                  placeholder={categoriasSelecionadas.length === 0 ? "Nova categoria..." : ""}
                  style={{ border: 'none', outline: 'none', fontSize: '16px', flex: 1, minWidth: '100px', background: 'transparent' }} 
                />
              </div>

              <button type="button" onClick={adicionarCategoria} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={20} />
              </button>
              <button type="button" onClick={() => setModalCategoriasAberta(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '130px' : '150px'}, 1fr))`, gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Custo (R$)</label>
            <input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="Ex: 25.00" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Lucro (%)</label>
            <input type="number" step="0.1" value={lucroPercentual} onChange={(e) => setLucroPercentual(e.target.value)} placeholder="Ex: 50" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#94a3b8', fontSize: '14px' }}>Sugestão (R$)</label>
            <input type="text" readOnly value={calcularPrecoSugerido()} placeholder="Automático" style={{ padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', color: '#94a3b8', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box', cursor: 'not-allowed' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>À Vista (R$) *</label>
            <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Preço Final" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            {margemRealTexto && (
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: margemRealTexto.includes('Prejuízo') ? '#ef4444' : '#10b981', marginTop: '2px', whiteSpace: 'nowrap' }}>
                {margemRealTexto}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Qtd. Estoque</label>
            <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Em estoque" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          </div>

        </div>

        {/* MUDANÇA DE UI DO CATÁLOGO - INTEGRADO AO FORMULÁRIO SEM QUADRADO CINZA */}
        {sistemaCatalogoAtivo && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '8px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0', borderTop: '1px dashed #cbd5e1' }}>
              <input type="checkbox" id="visivelCatalogo" checked={visivelCatalogo} onChange={(e) => setVisivelCatalogo(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#2563eb' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="visivelCatalogo" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '15px', margin: 0 }}>Exibir no Catálogo Online</label>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Marque para configurar as informações visíveis para o cliente.</span>
              </div>
            </div>

            {visivelCatalogo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.3s ease-in-out', paddingTop: '12px', paddingBottom: '12px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Fotos do Produto no Catálogo ({imagensPreviews.length}/5)</label>
                  <div style={{ width: '100%', height: '140px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      <UploadCloud size={32} style={{ margin: '0 auto 8px auto' }} />
                      <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>Toque para adicionar fotos</p>
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleImagemChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  </div>
                  {imagensPreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                      {imagensPreviews.map((srcObj, index) => (
                        <div key={index} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={srcObj.recortada || srcObj} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'white' }} />
                          <button type="button" onClick={() => removerImagem(index)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Descrição do Produto</label>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição que o cliente verá no catálogo..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '250px' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Antigo / Riscado (R$)</label>
                  <input type="number" step="0.01" value={precoAntigo} onChange={(e) => setPrecoAntigo(e.target.value)} placeholder="Ex: 50.00" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <input type="checkbox" id="destaque" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} />
                  <label htmlFor="destaque" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '14px', margin: 0 }}>Destacar em Vitrine Especial (Kits, Eventos)</label>
                </div>
              
                {destaque && (
                  <div style={{ marginLeft: '32px', marginTop: '-8px' }}>
                    <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Nome da Seção (Ex: Dia dos Namorados)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="text"
                        value={nomeDestaque}
                        onChange={(e) => setNomeDestaque(e.target.value)}
                        placeholder="Digite o nome da vitrine..."
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                      <button type="button" onClick={() => setModalEventosAberta(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                        <LayoutGrid size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" id="mostrarParcelamento" checked={mostrarParcelamento} onChange={(e) => setMostrarParcelamento(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} />
                  <label htmlFor="mostrarParcelamento" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '14px', margin: 0 }}>Mostrar opção de parcelamento no cartão</label>
                </div>

                {mostrarParcelamento && (
                  <div style={{ marginLeft: '32px', marginTop: '-8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="number" 
                      value={maxParcelas} 
                      onChange={(e) => setMaxParcelas(e.target.value)} 
                      placeholder="Máx. de parcelas (ex: 12)" 
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', width: '100%', maxWidth: '250px', boxSizing: 'border-box' }} 
                    />
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" id="mostrarAvisoAcrescimo" checked={mostrarAvisoAcrescimo} onChange={(e) => setMostrarAvisoAcrescimo(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} />
                  <label htmlFor="mostrarAvisoAcrescimo" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '14px', margin: 0 }}>Exibir aviso sobre acréscimo</label>
                </div>
                
                {mostrarAvisoAcrescimo && (
                  <div style={{ marginLeft: '32px', marginTop: '-8px', fontSize: '12px', color: '#64748b' }}>
                    O cliente verá a mensagem: <em>"Valores no cartão sofrem acréscimos. Consulte o vendedor."</em>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', width: '100%' }}>
          <button type="submit" disabled={salvando} style={{ background: salvando ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer', fontSize: '16px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <Save size={20} /> {salvando ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>

      </form>
    </div>
  )
}