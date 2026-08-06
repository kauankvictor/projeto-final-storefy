import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, X, LayoutGrid, Plus, Star, CreditCard, Info } from 'lucide-react'

import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function NovoProduto() {
  const navigate = useNavigate()
 
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  
  const [inputCategoria, setInputCategoria] = useState('')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([])
  
  const [preco, setPreco] = useState('')
  const [precoAntigo, setPrecoAntigo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [descricao, setDescricao] = useState('')
 
  const [divideCartao, setDivideCartao] = useState(false)
  const [maxParcelas, setMaxParcelas] = useState('')

  const [visivelCatalogo, setVisivelCatalogo] = useState(true)
  const [destaque, setDestaque] = useState(false)
  const [nomeDestaque, setNomeDestaque] = useState('')
 
  const [imagensPreviews, setImagensPreviews] = useState([])
  const [categoriasLista, setCategoriasLista] = useState([])
  const [eventosLista, setEventosLista] = useState([])
 
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false)
  const [modalEventosAberta, setModalEventosAberta] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
   
    const carregarListasDinamicas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"))
       
        let catSet = new Set()
        let evSet = new Set()

        querySnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.categorias && Array.isArray(data.categorias)) {
            data.categorias.forEach(c => catSet.add(c))
          } else if (data.categoria) {
            catSet.add(data.categoria)
          }
          if (data.nomeDestaque) {
            evSet.add(data.nomeDestaque)
          }
        })

        setCategoriasLista([...catSet].sort((a, b) => a.localeCompare(b)))
        setEventosLista([...evSet].sort((a, b) => a.localeCompare(b)))

      } catch (error) {
        console.error("Erro ao carregar listas dinâmicas:", error)
      }
    }

    carregarListasDinamicas()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleImagemChange = (e) => {
    const files = Array.from(e.target.files)
    if (imagensPreviews.length + files.length > 5) {
      setErro('Você pode adicionar no máximo 5 fotos por produto.')
      return
    }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => setImagensPreviews(prev => [...prev, event.target.result])
      reader.readAsDataURL(file)
    })
    setErro('')
  }

  const removerImagem = (indexParaRemover) => {
    setImagensPreviews(prev => prev.filter((_, index) => index !== indexParaRemover))
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

  const processarECompressarImagens = async () => {
    const promessasDeCompressao = imagensPreviews.map(imagemSrc => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const tamanhoMaximo = 500
          let largura = img.width
          let altura = img.height

          if (largura > altura) {
            if (largura > tamanhoMaximo) {
              altura *= tamanhoMaximo / largura
              largura = tamanhoMaximo
            }
          } else {
            if (altura > tamanhoMaximo) {
              largura *= tamanhoMaximo / altura
              altura = tamanhoMaximo
            }
          }

          canvas.width = largura
          canvas.height = altura
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, largura, altura)
          ctx.drawImage(img, 0, 0, largura, altura)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
          resolve(dataUrl)
        }
        img.src = imagemSrc
      })
    })

    return Promise.all(promessasDeCompressao)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()

    if (nome.trim() === '' || preco.trim() === '') {
      setErro('Os campos Nome e Preço à Vista são obrigatórios.')
      setSucesso(false)
      return
    }

    if (destaque && nomeDestaque.trim() === '') {
      setErro('Digite ou selecione um nome para a vitrine ou desmarque a opção de destaque.')
      return
    }

    setSalvando(true)

    try {
      const arrayImagensComprimidas = await processarECompressarImagens()
      
      const categoriaFallback = categoriasSelecionadas.length > 0 ? categoriasSelecionadas[0] : 'Sem Categoria'

      const produtoNovo = {
        nome,
        codigoBarras,
        categorias: categoriasSelecionadas.length > 0 ? categoriasSelecionadas : ['Sem Categoria'],
        categoria: categoriaFallback,
        preco: parseFloat(preco),
        precoAntigo: precoAntigo ? parseFloat(precoAntigo) : null,
        quantidade: quantidade === '' ? 0 : parseInt(quantidade, 10),
        descricao: descricao.trim(),
        divideCartao: divideCartao,
        maxParcelas: divideCartao && maxParcelas ? parseInt(maxParcelas, 10) : null,
        visivelCatalogo: visivelCatalogo,
        destaque: destaque,
        nomeDestaque: destaque ? nomeDestaque.trim() : null,
        fotos: arrayImagensComprimidas,
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
      setPreco('')
      setPrecoAntigo('')
      setQuantidade('')
      setDescricao('')
      setDivideCartao(false)
      setMaxParcelas('')
      setVisivelCatalogo(true)
      setDestaque(false)
      setNomeDestaque('')
      setImagensPreviews([])

      setTimeout(() => setSucesso(false), 3000)
    } catch (error) {
      setErro('Erro ao salvar o produto na nuvem. Verifique sua conexão.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
     
      {modalCategoriasAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalCategoriasAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={24} color="#db2777" /> Múltiplas Categorias
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
                        background: selecionada ? '#fce7f3' : '#f9fafb',
                        color: selecionada ? '#db2777' : '#1f2937',
                        border: selecionada ? '2px solid #db2777' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      {cat}
                      {selecionada && <CheckCircle size={20} color="#db2777" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {modalEventosAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalEventosAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={24} color="#db2777" /> Selecionar Vitrine
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

      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Novo Produto</h1>
        </div>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}

      <form onSubmit={handleSalvar} style={{ background: 'white', padding: isMobile ? '20px' : '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px', width: '100%', boxSizing: 'border-box' }}>
       
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
          <label style={{ fontWeight: '600', color: '#475569', fontSize: '15px' }}>Fotos do Produto ({imagensPreviews.length}/5)</label>
          <div style={{ width: '100%', height: '180px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
              <UploadCloud size={40} style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>Toque para adicionar fotos</p>
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImagemChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
          {imagensPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {imagensPreviews.map((src, index) => (
                <div key={index} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removerImagem(index)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1, width: '100%' }}>
         
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Nome do Produto *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite o nome do produto" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Código de Barras</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="Digite o código de barras" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
           
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Categorias</label>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                  placeholder="Digite uma nova categoria..." 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', flex: 1, boxSizing: 'border-box' }} 
                />
                <button type="button" onClick={adicionarCategoria} style={{ background: '#db2777', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </button>
                <button type="button" onClick={() => setModalCategoriasAberta(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <LayoutGrid size={20} />
                </button>
              </div>
              
              {categoriasSelecionadas.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {categoriasSelecionadas.map((cat, index) => (
                    <div key={index} style={{ background: '#fce7f3', color: '#db2777', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {cat}
                      <button type="button" onClick={() => removerCategoriaSelecionada(cat)} style={{ background: 'transparent', border: 'none', padding: 0, color: '#db2777', cursor: 'pointer', display: 'flex' }}><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Descrição do Produto</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição do produto" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 120px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>À Vista (R$) *</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Digite o preço à vista" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 120px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Antigo (R$)</label>
              <input type="number" step="0.01" value={precoAntigo} onChange={(e) => setPrecoAntigo(e.target.value)} placeholder="Digite o preço antigo" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 120px' }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Qtd. Estoque</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Digite a quantidade em estoque" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', color: '#1e1b4b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#db2777" /> Configuração de Parcelamento
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="divideCartao" checked={divideCartao} onChange={(e) => setDivideCartao(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#db2777' }} />
              <label htmlFor="divideCartao" style={{ fontWeight: 'bold', color: '#475569', cursor: 'pointer', fontSize: '14px', margin: 0 }}>Divide no cartão de crédito?</label>
            </div>

            {divideCartao && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Número Máximo de Parcelas</label>
                <input 
                  type="number" 
                  value={maxParcelas} 
                  onChange={(e) => setMaxParcelas(e.target.value)} 
                  placeholder="Digite o máximo de parcelas" 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', width: '100%', maxWidth: '300px', boxSizing: 'border-box' }} 
                />
              </div>
            )}
            
            <div style={{ background: '#fffbeb', color: '#d97706', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Lembrete: Compras a prazo podem sofrer alteração de valor. Ao salvar, o catálogo exibirá a mensagem instruindo o cliente a consultar o vendedor para valores parcelados.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
           
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="visivelCatalogo" checked={visivelCatalogo} onChange={(e) => setVisivelCatalogo(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#db2777' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="visivelCatalogo" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '15px', margin: 0 }}>Exibir no Catálogo Online</label>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Desmarque para manter o produto apenas no sistema gerencial.</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="destaque" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#db2777' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="destaque" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '15px', margin: 0 }}>Destacar na Vitrine (Kits e Eventos)</label>
              </div>
            </div>
           
            {destaque && (
              <div style={{ marginTop: '4px', paddingLeft: '36px' }}>
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', width: '100%' }}>
            <button type="submit" disabled={salvando} style={{ background: salvando ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer', fontSize: '16px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
              <Save size={20} /> {salvando ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}