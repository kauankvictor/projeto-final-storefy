import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Image as ImageIcon, Filter, FileDown, X, Settings, Trash2, CreditCard, AlertCircle, Star, Palette, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Estoque() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [produtos, setProdutos] = useState([])
  const [dadosLoja, setDadosLoja] = useState({ nomeLoja: 'Storefy', ceo: 'Administrador', telefone: '-', email: '-', endereco: 'Endereço não informado' })
  const [carregando, setCarregando] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  
  const [categoriasFavoritas, setCategoriasFavoritas] = useState([])
  const [categoriasOcultas, setCategoriasOcultas] = useState([])
  const [catalogoOculto, setCatalogoOculto] = useState(false)
  const [corPrincipal, setCorPrincipal] = useState('#db2777')
  
  const [modalGerenciarCategorias, setModalGerenciarCategorias] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const carregarConfiguracoesNuvem = async () => {
      try {
        const docRefLoja = doc(db, "configuracoes", "loja")
        const docSnapLoja = await getDoc(docRefLoja)
        if (docSnapLoja.exists()) {
          const data = docSnapLoja.data()
          setDadosLoja(prev => ({ ...prev, ...data }))
          if (data.corPrincipal) setCorPrincipal(data.corPrincipal)
          if (data.catalogoOculto !== undefined) setCatalogoOculto(data.catalogoOculto)
        }
        
        const docRefCat = doc(db, "configuracoes", "categorias")
        const docSnapCat = await getDoc(docRefCat)
        if (docSnapCat.exists()) {
          const data = docSnapCat.data()
          if (data.favoritas) setCategoriasFavoritas(data.favoritas)
          if (data.ocultas) setCategoriasOcultas(data.ocultas)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }
    carregarConfiguracoesNuvem()
  }, [])

  useEffect(() => {
    const buscarProdutosFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"))
        const listaProdutos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setProdutos(listaProdutos)
        localStorage.setItem('storefy_produtos', JSON.stringify(listaProdutos))
      } catch (error) {
        console.error("Erro ao buscar produtos na nuvem:", error)
      } finally {
        setCarregando(false)
      }
    }

    buscarProdutosFirebase()
  }, [])

  const hexToRgba = (hex, opacity) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(219, 39, 119, ${opacity})`; 
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
  }

  let catSet = new Set()
  produtos.forEach(p => {
    if (p.categorias && Array.isArray(p.categorias)) {
      p.categorias.forEach(c => catSet.add(c))
    } else if (p.categoria) {
      catSet.add(p.categoria)
    }
  })
  
  const catArray = Array.from(catSet)
  const favs = catArray.filter(c => categoriasFavoritas.includes(c)).sort((a, b) => a.localeCompare(b))
  const others = catArray.filter(c => !categoriasFavoritas.includes(c)).sort((a, b) => a.localeCompare(b))
  
  const categoriasUnicas = ['Todas', 'Promoções', ...favs, ...others]
  const listaGerenciavel = [...favs, ...others]

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

  const gerarPDFEstoque = () => {
    const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
    const janelaImpressao = window.open('', '_blank')

    const htmlPDF = `
      <html>
        <head>
          <title>Relatório de Estoque</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; color: #1e1b4b; font-size: 26px; }
            .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
            .titulo-relatorio { text-align: center; background: #f1f5f9; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 18px; color: #4f46e5; margin-bottom: 30px; text-transform: uppercase; }
            .tabela-estoque { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-estoque th, .tabela-estoque td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 14px; }
            .tabela-estoque th { background: #f8fafc; color: #475569; font-size: 13px; text-transform: uppercase; }
            .footer-assinatura { margin-top: 60px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 20px; color: #64748b; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${dadosLoja.nomeLoja || 'Loja Storefy'}</h1>
              <p>CEO: ${dadosLoja.ceo || 'Não informado'}</p>
              <p>Endereço: ${dadosLoja.endereco || 'Endereço não cadastrado'}</p>
              <p>Contato: ${dadosLoja.telefone || '-'} | ${dadosLoja.email || '-'}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
              <p>Total de Itens Listados: ${produtosFiltrados.length}</p>
            </div>
          </div>

          <div class="titulo-relatorio">Relatório de Estoque e Catálogo</div>

          <table class="tabela-estoque">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Cód. Barras</th>
                <th>Qtd</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              ${produtosFiltrados.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Nenhum produto encontrado.</td></tr>' : 
                produtosFiltrados.map(p => `
                <tr>
                  <td style="font-weight: 600; color: #1e1b4b;">${p.nome}</td>
                  <td>${p.categorias ? p.categorias.join(', ') : p.categoria}</td>
                  <td>${p.codigoBarras || 'Sem código'}</td>
                  <td style="color: ${p.quantidade > 0 ? '#059669' : '#ef4444'}; font-weight: bold;">
                    ${p.quantidade > 0 ? p.quantidade + ' un' : 'Esgotado'}
                  </td>
                  <td style="font-weight: bold;">${formatoMoeda(p.preco)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-assinatura">
            <p>Relatório gerado administrativamente através do Storefy.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `
    
    janelaImpressao.document.write(htmlPDF)
    janelaImpressao.document.close()
  }

  const pegarPrimeiraFotoRecortada = (produto) => {
    if (produto.fotos && produto.fotos.length > 0) return produto.fotos[0].recortada || produto.fotos[0]
    if (produto.imagem) return produto.imagem
    return null
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const toggleFavorita = async (cat) => {
    let novasFavoritas = [...categoriasFavoritas]
    if (novasFavoritas.includes(cat)) {
      novasFavoritas = novasFavoritas.filter(c => c !== cat)
    } else {
      novasFavoritas.push(cat)
    }
    setCategoriasFavoritas(novasFavoritas)
    await setDoc(doc(db, "configuracoes", "categorias"), { favoritas: novasFavoritas }, { merge: true })
  }

  const toggleOcultarCategoria = async (cat) => {
    let novasOcultas = [...categoriasOcultas]
    if (novasOcultas.includes(cat)) {
      novasOcultas = novasOcultas.filter(c => c !== cat)
    } else {
      novasOcultas.push(cat)
    }
    setCategoriasOcultas(novasOcultas)
    await setDoc(doc(db, "configuracoes", "categorias"), { ocultas: novasOcultas }, { merge: true })
  }

  const handleToggleCatalogoOculto = async (e) => {
    const valor = e.target.checked
    setCatalogoOculto(valor)
    await setDoc(doc(db, "configuracoes", "loja"), { catalogoOculto: valor }, { merge: true })
  }

  const renomearCategoria = async (nomeAntigo) => {
    const novoNome = prompt(`Renomear "${nomeAntigo}" para:`, nomeAntigo)
    if (!novoNome || novoNome.trim() === '' || novoNome === nomeAntigo) return
    
    setCarregando(true)
    try {
      const snapshot = await getDocs(collection(db, "produtos"))
      for (let documento of snapshot.docs) {
        const data = documento.data()
        let mudou = false
        let novasCats = data.categorias ? [...data.categorias] : []
        if (novasCats.includes(nomeAntigo)) {
          novasCats = novasCats.map(c => c === nomeAntigo ? novoNome.trim() : c)
          mudou = true
        }
        let catUnica = data.categoria === nomeAntigo ? novoNome.trim() : data.categoria
        if (data.categoria === nomeAntigo) mudou = true

        if (mudou) {
          await updateDoc(doc(db, "produtos", documento.id), { categorias: novasCats, categoria: catUnica })
        }
      }
      
      let novasFavoritas = [...categoriasFavoritas]
      if (novasFavoritas.includes(nomeAntigo)) {
        novasFavoritas = novasFavoritas.map(c => c === nomeAntigo ? novoNome.trim() : c)
        setCategoriasFavoritas(novasFavoritas)
        await setDoc(doc(db, "configuracoes", "categorias"), { favoritas: novasFavoritas }, { merge: true })
      }

      let novasOcultas = [...categoriasOcultas]
      if (novasOcultas.includes(nomeAntigo)) {
        novasOcultas = novasOcultas.map(c => c === nomeAntigo ? novoNome.trim() : c)
        setCategoriasOcultas(novasOcultas)
        await setDoc(doc(db, "configuracoes", "categorias"), { ocultas: novasOcultas }, { merge: true })
      }
      
      const pSnapshot = await getDocs(collection(db, "produtos"))
      setProdutos(pSnapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error(error)
    } finally {
      setCarregando(false)
    }
  }

  const excluirCategoria = async (nomeExcluir) => {
    if (!window.confirm(`Atenção: Tem certeza que deseja remover a categoria "${nomeExcluir}" de todos os produtos do estoque?`)) return
    
    setCarregando(true)
    try {
      const snapshot = await getDocs(collection(db, "produtos"))
      for (let documento of snapshot.docs) {
        const data = documento.data()
        let mudou = false
        let novasCats = data.categorias ? data.categorias.filter(c => c !== nomeExcluir) : []
        if (data.categorias && data.categorias.includes(nomeExcluir)) mudou = true
        
        if (novasCats.length === 0) novasCats = ['Sem Categoria']
        
        let catUnica = data.categoria === nomeExcluir ? 'Sem Categoria' : data.categoria
        if (data.categoria === nomeExcluir) mudou = true

        if (mudou) {
          await updateDoc(doc(db, "produtos", documento.id), { categorias: novasCats, categoria: catUnica })
        }
      }
      
      let novasFavoritas = categoriasFavoritas.filter(c => c !== nomeExcluir)
      setCategoriasFavoritas(novasFavoritas)
      let novasOcultas = categoriasOcultas.filter(c => c !== nomeExcluir)
      setCategoriasOcultas(novasOcultas)

      await setDoc(doc(db, "configuracoes", "categorias"), { favoritas: novasFavoritas, ocultas: novasOcultas }, { merge: true })
      
      const pSnapshot = await getDocs(collection(db, "produtos"))
      setProdutos(pSnapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error(error)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {modalGerenciarCategorias && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setModalGerenciarCategorias(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', marginTop: 0 }}>
              <Settings size={24} color={corPrincipal} /> Gerenciar Categorias
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: catalogoOculto ? '#fee2e2' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${catalogoOculto ? '#ef4444' : '#e2e8f0'}`, marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', color: catalogoOculto ? '#b91c1c' : '#1e1b4b' }}>Ocultar Todo o Catálogo</span>
                <span style={{ fontSize: '12px', color: catalogoOculto ? '#ef4444' : '#64748b' }}>Ative para esconder todos os produtos da visão do cliente.</span>
              </div>
              <input type="checkbox" checked={catalogoOculto} onChange={handleToggleCatalogoOculto} style={{ width: '24px', height: '24px', accentColor: '#ef4444', cursor: 'pointer' }} />
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {listaGerenciavel.map((cat) => {
                const isFav = categoriasFavoritas.includes(cat);
                const isOculta = categoriasOcultas.includes(cat);

                return (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOculta ? '#f1f5f9' : (isFav ? hexToRgba(corPrincipal, 0.05) : '#f8fafc'), padding: '12px', borderRadius: '8px', border: isFav && !isOculta ? `1px solid ${corPrincipal}` : '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px', opacity: isOculta ? 0.6 : 1, transition: '0.2s' }}>
                    <span style={{ fontWeight: 'bold', color: isOculta ? '#94a3b8' : (isFav ? corPrincipal : '#1e1b4b'), wordBreak: 'break-all', textDecoration: isOculta ? 'line-through' : 'none' }}>{cat}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => toggleOcultarCategoria(cat)} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: isOculta ? '#ef4444' : '#64748b' }}>
                        {isOculta ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => toggleFavorita(cat)} style={{ background: isFav ? hexToRgba(corPrincipal, 0.1) : 'white', border: isFav ? `1px solid ${corPrincipal}` : '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: isFav ? corPrincipal : '#94a3b8' }}>
                        <Star size={16} fill={isFav ? corPrincipal : 'none'} color={isFav ? corPrincipal : '#94a3b8'} />
                      </button>
                      <button onClick={() => renomearCategoria(cat)} style={{ background: '#e0e7ff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#4f46e5' }}><Edit2 size={16} /></button>
                      <button onClick={() => excluirCategoria(cat)} style={{ background: '#fee2e2', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                )
              })}
              {listaGerenciavel.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>Nenhuma categoria disponível.</p>}
            </div>
            
            <button onClick={() => setModalGerenciarCategorias(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px', borderRadius: '8px', marginTop: '20px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Fechar Janela</button>
          </div>
        </div>
      )}

      {produtoSelecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, padding: '20px' }} onClick={() => setProdutoSelecionado(null)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProdutoSelecionado(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              <X size={16} />
            </button>
            
            <div style={{ width: '100%', height: '300px', display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', background: '#f8fafc', position: 'relative' }}>
              {Number(produtoSelecionado.precoAntigo) > Number(produtoSelecionado.preco) && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '6px 10px', borderRadius: '8px', zIndex: 5 }}>
                  -{Math.round(((Number(produtoSelecionado.precoAntigo) - Number(produtoSelecionado.preco)) / Number(produtoSelecionado.precoAntigo)) * 100)}%
                </div>
              )}
              {(() => {
                const fotosParaMostrar = (produtoSelecionado.fotos && produtoSelecionado.fotos.length > 0) ? produtoSelecionado.fotos : (produtoSelecionado.imagem ? [produtoSelecionado.imagem] : [])
                if (fotosParaMostrar.length === 0) {
                  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ImageIcon size={48} color="#cbd5e1" /></div>
                }
                return fotosParaMostrar.map((foto, idx) => (
                  <img key={idx} src={foto.recortada || foto} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0, scrollSnapAlign: 'start' }} />
                ))
              })()}
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {produtoSelecionado.categorias ? produtoSelecionado.categorias.join(' • ') : produtoSelecionado.categoria}
                </span>
                <h2 style={{ fontSize: '20px', color: '#1e1b4b', margin: '4px 0 0 0', fontWeight: 'bold' }}>{produtoSelecionado.nome}</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontFamily: 'monospace' }}>Código: {produtoSelecionado.codigoBarras || 'Não cadastrado'}</p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Number(produtoSelecionado.precoAntigo) > Number(produtoSelecionado.preco) && (
                    <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 'bold' }}>
                      {formatoMoeda(produtoSelecionado.precoAntigo)}
                    </span>
                  )}
                  <span style={{ fontSize: '24px', color: '#4f46e5', fontWeight: '900' }}>{formatoMoeda(produtoSelecionado.preco)}</span>
                  
                  {produtoSelecionado.mostrarParcelamento && produtoSelecionado.maxParcelas && Number(produtoSelecionado.maxParcelas) > 0 && (
                     <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginTop: '2px' }}>
                       Cartão em até <span style={{ color: '#1e1b4b' }}>{produtoSelecionado.maxParcelas}x</span>
                     </span>
                  )}
                </div>
                <span style={{ background: produtoSelecionado.quantidade > 0 ? '#d1fae5' : '#fee2e2', color: produtoSelecionado.quantidade > 0 ? '#059669' : '#dc2626', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  {produtoSelecionado.quantidade > 0 ? `Estoque: ${produtoSelecionado.quantidade}` : 'Esgotado'}
                </span>
              </div>

              {produtoSelecionado.mostrarAvisoAcrescimo && (
                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#b45309', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Valores a prazo podem sofrer acréscimos.
                  </span>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold', margin: '0 0 6px 0' }}>Descrição</h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto' }}>
                  {produtoSelecionado.descricao || 'Nenhuma descrição detalhada disponível.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Estoque</h1>
          <p style={{ color: '#64748b', marginTop: '4px', margin: 0, fontSize: isMobile ? '14px' : '16px' }}>Gerencie seus produtos, preços e categorias</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          <button 
            onClick={() => navigate('/configuracoes', { state: { aba: 'catalogo' } })}
            style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: 'white', color: corPrincipal, border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Palette size={18} /> Catálogo
          </button>
          <button 
            onClick={gerarPDFEstoque}
            style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: 'white', color: '#4f46e5', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <FileDown size={18} /> PDF
          </button>
          <button 
            onClick={() => navigate('/estoque/novo')}
            style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: '#4f46e5', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
          >
            <Plus size={18} /> Novo
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '12px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar nome, categoria ou código..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }}
          />
        </div>

        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          {categoriasUnicas.map(cat => {
            const isFav = categoriasFavoritas.includes(cat);
            return (
              <button 
                key={cat} 
                onClick={() => setCategoriaFiltro(cat)} 
                style={{ padding: '10px 20px', borderRadius: '10px', background: categoriaFiltro === cat ? '#4f46e5' : '#f1f5f9', color: categoriaFiltro === cat ? 'white' : '#64748b', border: 'none', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, fontSize: '14px', whiteSpace: 'nowrap', transition: '0.2s', boxShadow: categoriaFiltro === cat ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isFav && <Star size={14} fill={categoriaFiltro === cat ? 'white' : corPrincipal} color={categoriaFiltro === cat ? 'white' : corPrincipal} />}
                {cat}
              </button>
            )
          })}
          <button onClick={() => setModalGerenciarCategorias(true)} style={{ padding: '10px 20px', borderRadius: '10px', background: '#e2e8f0', color: '#1e1b4b', border: 'none', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, fontSize: '14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={16} /> Gerenciar
          </button>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
          Carregando produtos do servidor Google...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '140px' : '240px'}, 1fr))`, gap: isMobile ? '12px' : '24px' }}>
          {produtosFiltrados.map((produto) => {
            const fotoPrincipal = pegarPrimeiraFotoRecortada(produto)
            const temDesconto = Number(produto.precoAntigo) > Number(produto.preco)

            return (
              <div 
                key={produto.id} 
                onClick={() => setProdutoSelecionado(produto)}
                style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '12px' : '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', position: 'relative', cursor: 'pointer' }}
              >
                
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/estoque/${produto.id}`) }}
                  style={{ position: 'absolute', top: isMobile ? '16px' : '24px', right: isMobile ? '16px' : '24px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}
                >
                  <Edit2 size={16} color="#4f46e5" />
                </button>

                <div style={{ width: '100%', height: isMobile ? '120px' : '220px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {temDesconto && (
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '4px 6px', borderRadius: '6px', zIndex: 5 }}>
                      -{Math.round(((Number(produto.precoAntigo) - Number(produto.preco)) / Number(produto.precoAntigo)) * 100)}%
                    </div>
                  )}
                  {fotoPrincipal ? (
                    <img src={fotoPrincipal} alt={produto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="#cbd5e1" />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {produto.categorias ? produto.categorias.join(' • ') : produto.categoria}
                  </span>
                  
                  <h3 style={{ fontSize: isMobile ? '13px' : '16px', color: '#1e1b4b', fontWeight: 'bold', margin: '4px 0 12px 0', lineHeight: '1.3' }}>
                    {produto.nome}
                  </h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {temDesconto && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 'bold', marginBottom: '-2px' }}>
                          {formatoMoeda(produto.precoAntigo)}
                        </span>
                      )}
                      <span style={{ fontSize: isMobile ? '15px' : '18px', color: '#4f46e5', fontWeight: '800' }}>
                        {formatoMoeda(produto.preco)}
                      </span>
                    </div>
                    
                    {produto.quantidade > 0 ? (
                      <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                        Estoque: {produto.quantidade}
                      </span>
                    ) : (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                        Esgotado
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {produto.codigoBarras ? `Cód: ${produto.codigoBarras}` : 'Sem código de barras'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {produtosFiltrados.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}