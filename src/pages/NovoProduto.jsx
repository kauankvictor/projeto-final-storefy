import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, AlertCircle, UploadCloud, Move } from 'lucide-react'

// Importações cruciais do Firebase
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function NovoProduto() {
  const navigate = useNavigate()
  
  const [nome, setNome] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState('')
  
  // Estados para controle do enquadramento completo da imagem
  const [imagemOriginalSrc, setImagemOriginalSrc] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  
  const [categorias, setCategorias] = useState(['Perfumaria', 'Skincare', 'Maquiagem', 'Cabelos', 'Corpo e Banho'])
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Medição de largura para responsividade
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    // Busca todas as categorias em tempo real no Firestore para alimentar o datalist
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
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagemOriginalSrc(event.target.result)
        setZoom(1)
        setOffsetX(0)
        setOffsetY(0)
      }
      reader.readAsDataURL(file)
    }
  }

  // Renderiza o enquadramento completo baseado no tamanho mínimo da foto original
  const processarECompressarImagem = () => {
    return new Promise((resolve) => {
      if (!imagemOriginalSrc) {
        resolve('')
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 450
        canvas.height = 450
        const ctx = canvas.getContext('2d')

        // Define plano de fundo branco padrão para evitar transparências
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 450, 450)

        ctx.save()
        // Proporção de conversão de pixels da tela para o canvas de alta resolução
        ctx.translate(225 + (offsetX * 1.8), 225 + (offsetY * 1.8))
        ctx.scale(zoom, zoom)

        // Calcula a escala de contenção para ver a foto inteira sem zoom inicial forçado
        const escalaLargura = 450 / img.width
        const escalaAltura = 450 / img.height
        const escalaBase = Math.min(escalaLargura, escalaAltura)

        const larguraFinal = img.width * escalaBase
        const alturaFinal = img.height * escalaBase

        ctx.drawImage(img, -larguraFinal / 2, -alturaFinal / 2, larguraFinal, alturaFinal)
        ctx.restore()

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataUrl)
      }
      img.src = imagemOriginalSrc
    })
  }

  const handleSalvar = async (e) => {
    e.preventDefault()

    if (nome.trim() === '' || preco.trim() === '') {
      setErro('Os campos Nome e Preço são obrigatórios!')
      setSucesso(false)
      return
    }

    setSalvando(true)

    try {
      const imagemFinalComprimida = await processarECompressarImagem()

      const produtoNovo = {
        nome: nome,
        codigoBarras: codigoBarras,
        categoria: categoria || 'Sem Categoria',
        preco: parseFloat(preco),
        quantidade: quantidade === '' ? 0 : parseInt(quantidade, 10),
        imagem: imagemFinalComprimida,
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
      setImagemOriginalSrc(null)

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
      
      {/* MODAL CENTRAL DE SUCESSO */}
      {sucesso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', boxSizing: 'border-box' }}>
            <CheckCircle size={64} color="#10b981" />
            <h2 style={{ fontSize: '24px', color: '#1e1b4b', margin: 0, fontWeight: 'bold' }}>Cadastrado com Sucesso!</h2>
            <p style={{ color: '#64748b', margin: 0, lineHeigth: '1.4' }}>O produto foi enviado para a nuvem e já está disponível no catálogo.</p>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/estoque')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Novo Produto</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Cadastre um item com foto para o catálogo na nuvem</p>
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
        
        {/* COLUNA DA FOTO COM MÁSCARA DE RECORTE TOTAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: isMobile ? '100%' : '250px', flexShrink: 0, alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '15px' }}>Foto do Produto</label>
            
            <div style={{ 
              width: '250px',
              height: '250px', 
              borderRadius: '12px', 
              border: '2px dashed #cbd5e1', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: '#f8fafc', 
              position: 'relative', 
              overflow: 'hidden',
              margin: '0 auto'
            }}>
              {imagemOriginalSrc ? (
                <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                  <img 
                    src={imagemOriginalSrc} 
                    alt="Preview" 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`,
                      transition: 'transform 0.05s ease-out'
                    }} 
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  <UploadCloud size={40} style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>Toque para usar a Câmera ou Galeria</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImagemChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
            </div>
          </div>

          {/* PAINEL DE ENQUADRAMENTO SEM CORTE PRÉVIO */}
          {imagemOriginalSrc && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Move size={14}/> Enquadrar Foto</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Tamanho (Zoom)</span>
                  <span>{zoom.toFixed(1)}x</span>
                </div>
                <input type="range" min="1" max="4" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#4f46e5' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Mover para os Lados</span>
                <input type="range" min="-150" max="150" step="2" value={offsetX} onChange={(e) => setOffsetX(parseInt(e.target.value, 10))} style={{ width: '100%', cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Mover para Cima/Baixo</span>
                <input type="range" min="-150" max="150" step="2" value={offsetY} onChange={(e) => setOffsetY(parseInt(e.target.value, 10))} style={{ width: '100%', cursor: 'pointer' }} />
              </div>
            </div>
          )}
        </div>

        {/* CAMPOS DE INFORMAÇÕES DO PRODUTO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1, width: '100%' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#475569', fontSize: '14px' }}>Nome do Produto *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Hidratante Cereja e Avelã" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box', width: '100%' }} />
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