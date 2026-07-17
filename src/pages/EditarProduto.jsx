import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, Trash2, X, LayoutGrid } from 'lucide-react'

import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function EditarProduto() {
  const navigate = useNavigate()
  const { id } = useParams() 
  
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [precoAntigo, setPrecoAntigo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  
  const [visivelCatalogo, setVisivelCatalogo] = useState(true)
  const [destaque, setDestaque] = useState(false)
  const [nomeDestaque, setNomeDestaque] = useState('')
  const [imagensPreviews, setImagensPreviews] = useState([])
  
  const [categorias, setCategorias] = useState([])
  const [eventos, setEventos] = useState([])
  
  // NOVO ESTADO: Guarda os dados originais para comparar o que mudou
  const [produtoOriginal, setProdutoOriginal] = useState(null)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [modalCategoriasAberta, setModalCategoriasAberta] = useState(false)

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)

    const carregarListasEProduto = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"))
        const categoriasDoBanco = querySnapshot.docs.map(doc => doc.data().categoria).filter(Boolean)
        setCategorias([...new Set(categoriasDoBanco)].sort((a, b) => a.localeCompare(b)))

        const eventosDoBanco = querySnapshot.docs.map(doc => doc.data().nomeDestaque).filter(Boolean)
        setEventos([...new Set(eventosDoBanco)])

        const docRef = doc(db, "produtos", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const dados = docSnap.data()
          
          // Salva uma cópia exata do que veio do banco para o histórico
          setProdutoOriginal(dados)

          setNome(dados.nome || '')
          setCodigoBarras(dados.codigoBarras || '')
          setCategoria(dados.categoria || '')
          setDescricao(dados.descricao || '')
          setPreco(dados.preco ? dados.preco.toString() : '')
          setPrecoAntigo(dados.precoAntigo ? dados.precoAntigo.toString() : '')
          setQuantidade(dados.quantidade ? dados.quantidade.toString() : '0')
          
          setVisivelCatalogo(dados.visivelCatalogo !== false) 
          setDestaque(dados.destaque || false)
          setNomeDestaque(dados.nomeDestaque || '')
          
          if (dados.fotos && Array.isArray(dados.fotos)) {
            setImagensPreviews(dados.fotos)
          } else if (dados.imagem) {
            setImagensPreviews([dados.imagem])
          } else {
            setImagensPreviews([])
          }
        } else {
          setErro('Produto não encontrado.')
        }
      } catch (error) {
        setErro('Falha ao carregar informações.')
      } finally {
        setCarregando(false)
      }
    }
    
    carregarListasEProduto()
    return () => window.removeEventListener('resize', handleResize)
  }, [id])

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
      setErro('Os campos Nome e Preço são obrigatórios!')
      return
    }

    if (destaque && nomeDestaque.trim() === '') {
      setErro('Digite um nome para a vitrine ou desmarque a opção de destaque.')
      return
    }

    setProcessando(true)
    try {
      const arrayImagensComprimidas = await processarECompressarImagens()

      const novoPrecoNum = parseFloat(preco)
      const novaQtdNum = parseInt(quantidade, 10) || 0

      // LÓGICA DO HISTÓRICO DETALHADO
      let mudancas = []
      if (produtoOriginal) {
        if (nome !== produtoOriginal.nome) {
          mudancas.push(`Nome alterado de "${produtoOriginal.nome}" para "${nome}"`)
        }
        if (novoPrecoNum !== parseFloat(produtoOriginal.preco || 0)) {
          mudancas.push(`Preço de ${formatoMoeda(produtoOriginal.preco)} para ${formatoMoeda(novoPrecoNum)}`)
        }
        if (novaQtdNum !== parseInt(produtoOriginal.quantidade || 0, 10)) {
          mudancas.push(`Quantidade de ${produtoOriginal.quantidade || 0} para ${novaQtdNum}`)
        }
        if (codigoBarras !== (produtoOriginal.codigoBarras || '')) {
          mudancas.push(`Código de barras modificado`)
        }
        if ((categoria || 'Sem Categoria') !== (produtoOriginal.categoria || 'Sem Categoria')) {
          mudancas.push(`Categoria modificada`)
        }
        if (descricao.trim() !== (produtoOriginal.descricao || '').trim()) {
          mudancas.push(`Descrição modificada`)
        }
      }

      const textoDetalhes = mudancas.length > 0 
        ? `Modificações: ${mudancas.join(', ')}.` 
        : `Atualização de imagens ou configurações visuais do catálogo.`

      const dadosAtualizados = {
        nome,
        codigoBarras,
        categoria: categoria || 'Sem Categoria',
        descricao: descricao.trim(),
        preco: novoPrecoNum,
        precoAntigo: precoAntigo ? parseFloat(precoAntigo) : null,
        quantidade: novaQtdNum,
        visivelCatalogo: visivelCatalogo,
        destaque: destaque,
        nomeDestaque: destaque ? nomeDestaque.trim() : null,
        fotos: arrayImagensComprimidas,
        dataUltimaEdicao: new Date().toISOString()
      }

      await updateDoc(doc(db, "produtos", id), dadosAtualizados)

      // Grava no histórico usando o texto detalhado gerado
      const logEstoqueEditado = {
        idRegistro: Date.now(),
        tipo: 'ESTOQUE',
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR'),
        produtoAlterado: nome,
        detalhes: textoDetalhes
      }
      await addDoc(collection(db, "historico"), logEstoqueEditado)

      setSucesso(true)
      setTimeout(() => navigate('/estoque'), 1500)
    } catch (error) {
      setErro('Erro ao atualizar. Verifique sua conexão.')
    } finally {
      setProcessando(false)
    }
  }

  const handleExcluir = async () => {
    if (window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
      setProcessando(true)
      try {
        await deleteDoc(doc(db, "produtos", id))
        navigate('/estoque')
      } catch (error) {
        setErro('Erro ao excluir.')
        setProcessando(false)
      }
    }
  }

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
      
      {modalCategoriasAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModalCategoriasAberta(false)}>
          <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={24} color="#4f46e5" /> Selecionar Categoria
              </h2>
              <button onClick={() => setModalCategoriasAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {categorias.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Nenhuma categoria cadastrada ainda.</p>
              ) : (
                categorias.map(cat => (
                  <button
                    key={`modal-${cat}`}
                    onClick={() => {
                      setCategoria(cat)
                      setModalCategoriasAberta(false)
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
                    {cat}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}><ArrowLeft size={24} /></button>
          <div><h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Editar Produto</h1></div>
        </div>
        <button onClick={handleExcluir} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          <Trash2 size={18} /> Excluir
        </button>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}
      {sucesso && <div style={{ background: '#d1fae5', color: '#10b981', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><CheckCircle size={20} />Alterado com sucesso!</div>}

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
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Código de Barras</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Categoria</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Digite ou selecione..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setModalCategoriasAberta(true)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <LayoutGrid size={20} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Descrição do Produto</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Atual (R$) *</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Antigo</label>
              <input type="number" step="0.01" value={precoAntigo} onChange={(e) => setPrecoAntigo(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Qtd. Estoque</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="visivelCatalogo" checked={visivelCatalogo} onChange={(e) => setVisivelCatalogo(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#4f46e5' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="visivelCatalogo" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '15px', margin: 0 }}>Exibir no Catálogo Online</label>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Desmarque para manter o produto apenas no sistema gerencial.</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="destaque" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: '#4f46e5' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="destaque" style={{ fontWeight: 'bold', color: '#1e1b4b', cursor: 'pointer', fontSize: '15px', margin: 0 }}>Destacar na Vitrine (Kits e Eventos)</label>
              </div>
            </div>
            
            {destaque && (
              <div style={{ marginTop: '4px', paddingLeft: '36px' }}>
                <label style={{ fontWeight: '600', color: '#475569', fontSize: '13px' }}>Nome da Seção (Ex: Dia dos Namorados)</label>
                <input 
                  type="text" 
                  list="lista-eventos-edit" 
                  value={nomeDestaque} 
                  onChange={(e) => setNomeDestaque(e.target.value)} 
                  placeholder="Selecione ou digite um novo nome..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} 
                />
                <datalist id="lista-eventos-edit">
                  {eventos.map(ev => <option key={ev} value={ev} />)}
                </datalist>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', width: '100%' }}>
            <button type="submit" disabled={processando} style={{ background: processando ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: processando ? 'not-allowed' : 'pointer', fontSize: '16px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
              <Save size={20} /> {processando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}