import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, Trash2 } from 'lucide-react'

import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function EditarProduto() {
  const navigate = useNavigate()
  const { id } = useParams() 
  
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [imagemPreview, setImagemPreview] = useState(null)
  
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    const buscarProduto = async () => {
      try {
        const docRef = doc(db, "produtos", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const dados = docSnap.data()
          setNome(dados.nome || '')
          setCodigoBarras(dados.codigoBarras || '')
          setCategoria(dados.categoria || '')
          setPreco(dados.preco ? dados.preco.toString() : '')
          setQuantidade(dados.quantidade ? dados.quantidade.toString() : '0')
          setImagemPreview(dados.imagem || null)
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
  }, [id])

  // Lógica de compressão de imagem idêntica ao NovoProduto
  const handleImagemChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 500
          const MAX_HEIGHT = 500
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          setImagemPreview(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (nome.trim() === '' || preco.trim() === '') {
      setErro('Os campos Nome e Preço são obrigatórios!')
      return
    }

    setProcessando(true)
    try {
      const dadosAtualizados = {
        nome,
        codigoBarras,
        categoria: categoria || 'Sem Categoria',
        preco: parseFloat(preco),
        quantidade: parseInt(quantidade, 10) || 0,
        imagem: imagemPreview || '',
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
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <ArrowLeft size={24} />
        </button>
        <button onClick={handleExcluir} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          <Trash2 size={18} /> Excluir
        </button>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px' }}><AlertCircle size={20} />{erro}</div>}
      {sucesso && <div style={{ background: '#d1fae5', color: '#10b981', padding: '16px', borderRadius: '8px' }}><CheckCircle size={20} />Alterado com sucesso!</div>}

      <form onSubmit={handleSalvar} style={{ background: 'white', padding: '32px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '600' }}>Foto</label>
          <div style={{ height: '250px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
            {imagemPreview ? <img src={imagemPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UploadCloud size={40} color="#cbd5e1" />}
            <input type="file" accept="image/*" onChange={handleImagemChange} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600' }}>Nome do Produto *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600' }}>Código de Barras</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600' }}>Categoria</label>
              <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600' }}>Preço (R$) *</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '600' }}>Qtd. Estoque</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <button type="submit" disabled={processando} style={{ background: processando ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {processando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}