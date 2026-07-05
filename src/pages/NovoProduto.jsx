import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, X } from 'lucide-react'

import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function NovoProduto() {
  const navigate = useNavigate()
  
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState('')
  
  // Estado para armazenar as múltiplas imagens
  const [imagensPreviews, setImagensPreviews] = useState([])
  
  const [categorias, setCategorias] = useState(['Perfumaria', 'Skincare', 'Maquiagem', 'Cabelos', 'Corpo e Banho'])
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    const carregarCategoriasExistentes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"))
        const categoriasDoBanco = querySnapshot.docs.map(doc => doc.data().categoria).filter(Boolean)
        const listaUnica = ['Perfumaria', 'Skincare', 'Maquiagem', 'Cabelos', 'Corpo e Banho', ...new Set(categoriasDoBanco)]
        setCategorias(listaUnica)
      } catch (error) {
        console.error("Erro ao carregar categorias dinâmicas:", error)
      }
    }

    carregarCategoriasExistentes()
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

  // Comprime todas as imagens automaticamente para garantir que caibam no Firestore
  const processarECompressarImagens = async () => {
    const promessasDeCompressao = imagensPreviews.map(imagemSrc => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          // Reduz a resolução para economizar espaço no banco de dados
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
      setErro('Os campos Nome e Preço são obrigatórios.')
      setSucesso(false)
      return
    }

    setSalvando(true)

    try {
      const arrayImagensComprimidas = await processarECompressarImagens()

      const produtoNovo = {
        nome: nome,
        codigoBarras: codigoBarras,
        categoria: categoria || 'Sem Categoria',
        preco: parseFloat(preco),
        quantidade: quantidade === '' ? 0 : parseInt(quantidade, 10),
        fotos: arrayImagensComprimidas, // Agora salva um array de fotos
        dataCadastro: new Date().toISOString()
      }

      await addDoc(collection(db, "produtos"), produtoNovo)

      setErro('')
      setSucesso(true)
      setNome('')
      setCodigoBarras('')
      setCategoria('')
      setPreco('')
      setQuantidade('')
      setImagensPreviews([])

      setTimeout(() => setSucesso(false), 3000)
    } catch (error) {
      console.error("Erro ao salvar no Firebase: ", error)
      setErro('Erro ao salvar o produto na nuvem. Verifique sua conexão.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', boxSizing: 'border-box', width: '100%' }}>
      
      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', boxSizing: 'border-box' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0, fontWeight: 'bold' }}>Cadastrado com Sucesso</h2>
            <p style={{ color: '#64748b', margin: 0, lineHeight: '1.4' }}>O produto foi enviado para a nuvem e já está disponível no catálogo.</p>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Novo Produto</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Cadastre itens com até 5 fotos para o catálogo</p>
        </div>
      </header>

      {erro && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><AlertCircle size={20} />{erro}</div>}

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
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Hidratante Cereja" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Código de Barras</label>
              <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="0000000000000" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569' }}>Categoria</label>
              <input type="text" list="lista-categorias" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Selecione ou crie nova" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
              <datalist id="lista-categorias">
                {categorias.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Preço (R$) *</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0.00" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Qtd. Estoque</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
            </div>
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