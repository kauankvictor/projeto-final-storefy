import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, Trash2, X } from 'lucide-react'

import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function EditarProduto() {
  const navigate = useNavigate()
  const { id } = useParams() 
  
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [precoAntigo, setPrecoAntigo] = useState('') // NOVO: Estado para o preço antigo
  const [quantidade, setQuantidade] = useState('')
  const [imagensPreviews, setImagensPreviews] = useState([])
  
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)

    const buscarProduto = async () => {
      try {
        const docRef = doc(db, "produtos", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const dados = docSnap.data()
          setNome(dados.nome || '')
          setCodigoBarras(dados.codigoBarras || '')
          setCategoria(dados.categoria || '')
          setDescricao(dados.descricao || '')
          setPreco(dados.preco ? dados.preco.toString() : '')
          setPrecoAntigo(dados.precoAntigo ? dados.precoAntigo.toString() : '') // NOVO: Puxa o preço antigo do banco
          setQuantidade(dados.quantidade ? dados.quantidade.toString() : '0')
          
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
    
    buscarProduto()
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
      reader.onload = (event) => {
        setImagensPreviews(prev => [...prev, event.target.result])
      }
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

    setProcessando(true)
    try {
      const arrayImagensComprimidas = await processarECompressarImagens()

      const dadosAtualizados = {
        nome,
        codigoBarras,
        categoria: categoria || 'Sem Categoria',
        descricao: descricao.trim(),
        preco: parseFloat(preco),
        precoAntigo: precoAntigo ? parseFloat(precoAntigo) : null, // NOVO: Salva a atualização
        quantidade: parseInt(quantidade, 10) || 0,
        fotos: arrayImagensComprimidas,
        dataUltimaEdicao: new Date().toISOString()
      }

      await updateDoc(doc(db, "produtos", id), dadosAtualizados)
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
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Editar Produto</h1>
          </div>
        </div>
        <button onClick={handleExcluir} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          <Trash2 size={18} /> Excluir
        </button>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}
      {sucesso && <div style={{ background: '#d1fae5', color: '#10b981', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><CheckCircle size={20} />Alterado com sucesso!</div>}

      <form onSubmit={handleSalvar} style={{ 
        background: 'white', 
        padding: isMobile ? '20px' : '32px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: '32px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
          <label style={{ fontWeight: '600', color: '#475569', fontSize: '15px' }}>Fotos do Produto ({imagensPreviews.length}/5)</label>
          
          <div style={{ 
            width: '100%',
            height: '180px', 
            borderRadius: '12px', 
            border: '2px dashed #cbd5e1', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#f8fafc', 
            position: 'relative', 
            overflow: 'hidden',
            cursor: 'pointer'
          }}>
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
              <UploadCloud size={40} style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>Toque para adicionar fotos</p>
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImagemChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>

          {imagensPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
              {imagensPreviews.map((src, index) => (
                <div key={index} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removerImagem(index)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1, width: '100%' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Nome do Produto *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Código de Barras</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Categoria</label>
              <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Descrição do Produto</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Escreva os detalhes, tamanho, marca..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%', minHeight: '100px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Atual (R$) *</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço Antigo (Opcional)</label>
              <input type="number" step="0.01" value={precoAntigo} onChange={(e) => setPrecoAntigo(e.target.value)} placeholder="Ex: De 150 por..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Qtd. Estoque</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>
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