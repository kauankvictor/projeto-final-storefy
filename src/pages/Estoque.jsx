import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, FileDown, X, Settings, Trash2, Eye, EyeOff, Star, Palette, Sheet } from 'lucide-react'
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
  const [corPrincipal, setCorPrincipal] = useState('#2563eb') // Azul como padrão
  
  const [modalGerenciarCategorias, setModalGerenciarCategorias] = useState(false)
  const [modalExportar, setModalExportar] = useState(false)
  const [categoriaExportacao, setCategoriaExportacao] = useState('Todas')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault()
        navigate('/estoque/novo')
      } else if (e.key === 'F2') {
        e.preventDefault()
        if (produtoSelecionado) {
          navigate(`/estoque/${produtoSelecionado.id}`)
        }
      } else if (e.key === 'F3') {
        e.preventDefault()
        document.getElementById('input-busca-estoque')?.focus()
      } else if (e.key === 'F12') {
        e.preventDefault()
        setModalExportar(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, produtoSelecionado])

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
    if (!result) return `rgba(37, 99, 235, ${opacity})`; // Fallback azul
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const formatarDataBrasil = (data) => {
    if (!data) return '-';
    let d;
    if (data.seconds) { d = new Date(data.seconds * 1000); } 
    else { d = new Date(data); }
    
    if (isNaN(d.getTime())) return typeof data === 'string' ? data : '-';
    
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const seg = String(d.getSeconds()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${horas}:${min}:${seg}`;
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

  const getProdutosParaExportar = () => {
    return produtos.filter(produto => {
      if (categoriaExportacao === 'Todas') return true;
      if (categoriaExportacao === 'Promoções') return Number(produto.precoAntigo) > Number(produto.preco);
      return (produto.categorias && produto.categorias.includes(categoriaExportacao)) || produto.categoria === categoriaExportacao;
    });
  }

  const gerarPDFEstoque = () => {
    const listaExportar = getProdutosParaExportar()
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
            .titulo-relatorio { text-align: center; background: #f1f5f9; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 18px; color: #2563eb; margin-bottom: 30px; text-transform: uppercase; }
            .tabela-estoque { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-estoque th, .tabela-estoque td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 13px; }
            .tabela-estoque th { background: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; }
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
              <p><strong>Emissão:</strong> ${formatarDataBrasil(new Date())}</p>
              <p>Filtro: ${categoriaExportacao}</p>
              <p>Total de Itens: ${listaExportar.length}</p>
            </div>
          </div>

          <div class="titulo-relatorio">Relatório Analítico (${categoriaExportacao})</div>

          <table class="tabela-estoque">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Cód. Barras</th>
                <th>Qtd</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Lucro</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              ${listaExportar.length === 0 ? '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">Nenhum produto encontrado.</td></tr>' : 
                listaExportar.map(p => {
                  const custo = Number(p.custo) || 0;
                  const preco = Number(p.preco) || 0;
                  const lucro = preco - custo;
                  return `
                  <tr>
                    <td style="font-weight: 600; color: #1e1b4b;">${p.nome} <br/><small style="font-weight: normal; color: #64748b;">${p.categorias ? p.categorias.join(', ') : p.categoria}</small></td>
                    <td>${p.codigoBarras || '-'}</td>
                    <td style="color: ${p.quantidade > 0 ? '#059669' : '#ef4444'}; font-weight: bold;">
                      ${p.quantidade > 0 ? p.quantidade + ' un' : 'Esgotado'}
                    </td>
                    <td>${formatoMoeda(custo)}</td>
                    <td style="font-weight: bold;">${formatoMoeda(preco)}</td>
                    <td style="color: ${lucro >= 0 ? '#059669' : '#ef4444'}; font-weight: bold;">${formatoMoeda(lucro)}</td>
                    <td>${formatarDataBrasil(p.dataCadastro)}</td>
                  </tr>
                `}).join('')}
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

  const gerarPlanilhaCSV = () => {
    const listaExportar = getProdutosParaExportar()
    if (listaExportar.length === 0) {
      alert("Não há produtos para exportar nesta categoria.")
      return
    }

    let csvContent = "Produto;Categoria;Codigo;Quantidade;Custo;Preco;Lucro;Data de Cadastro\n"

    listaExportar.forEach(p => {
      const nome = p.nome || ''
      const cat = p.categorias ? p.categorias.join(', ') : (p.categoria || '')
      const cod = p.codigoBarras || ''
      const qtd = p.quantidade || 0
      
      const custoNum = Number(p.custo) || 0
      const precoNum = Number(p.preco) || 0
      
      const custo = custoNum.toFixed(2).replace('.', ',')
      const preco = precoNum.toFixed(2).replace('.', ',')
      const lucro = (precoNum - custoNum).toFixed(2).replace('.', ',')
      const dataCad = formatarDataBrasil(p.dataCadastro)

      csvContent += `"${nome}";"${cat}";"${cod}";"${qtd}";"${custo}";"${preco}";"${lucro}";"${dataCad}"\n`
    })

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    
    link.setAttribute("href", url)
    link.setAttribute("download", `storefy_estoque_${categoriaExportacao.replace(/\s+/g, '_')}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
      
      {/* Modal Gerenciar Categorias */}
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
                      <button onClick={() => renomearCategoria(cat)} style={{ background: '#e0e7ff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#2563eb' }}><Edit2 size={16} /></button>
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

      {/* Modal Exportar Arquivos F12 */}
      {modalExportar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setModalExportar(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', marginTop: 0 }}>
              <FileDown size={24} color="#2563eb" /> Exportar Dados [F12]
            </h2>
            
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Selecione a Categoria para Gerar:</label>
            <select 
              value={categoriaExportacao} 
              onChange={(e) => setCategoriaExportacao(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', marginBottom: '20px', fontSize: '14px', color: '#1e1b4b', outline: 'none' }}
            >
              {categoriasUnicas.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button onClick={() => { gerarPDFEstoque(); setModalExportar(false); }} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>
                <FileDown size={18}/> Baixar PDF
              </button>
              <button onClick={() => { gerarPlanilhaCSV(); setModalExportar(false); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
                <Sheet size={18}/> Baixar Excel
              </button>
              <button onClick={() => setModalExportar(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produto Selecionado */}
      {produtoSelecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, padding: '20px' }} onClick={() => setProdutoSelecionado(null)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProdutoSelecionado(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: '#f1f5f9', color: '#1e1b4b', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              <X size={16} />
            </button>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                  {produtoSelecionado.categorias ? produtoSelecionado.categorias.join(' • ') : produtoSelecionado.categoria}
                </span>
                <h2 style={{ fontSize: '20px', color: '#1e1b4b', margin: '4px 0 0 0', fontWeight: 'bold' }}>{produtoSelecionado.nome}</h2>
                
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Cód: {produtoSelecionado.codigoBarras || 'S/N'}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Number(produtoSelecionado.precoAntigo) > Number(produtoSelecionado.preco) && (
                    <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 'bold' }}>
                      {formatoMoeda(produtoSelecionado.precoAntigo)}
                    </span>
                  )}
                  <span style={{ fontSize: '24px', color: '#2563eb', fontWeight: '900' }}>{formatoMoeda(produtoSelecionado.preco)}</span>
                </div>
                <span style={{ background: produtoSelecionado.quantidade > 0 ? '#d1fae5' : '#fee2e2', color: produtoSelecionado.quantidade > 0 ? '#059669' : '#dc2626', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  {produtoSelecionado.quantidade > 0 ? `Estoque: ${produtoSelecionado.quantidade}` : 'Esgotado'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Custo</span>
                  <span style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: '600' }}>{formatoMoeda(produtoSelecionado.custo || 0)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Lucro</span>
                  <span style={{ fontSize: '15px', color: (Number(produtoSelecionado.preco) - Number(produtoSelecionado.custo)) >= 0 ? '#059669' : '#ef4444', fontWeight: '600' }}>
                    {formatoMoeda(Number(produtoSelecionado.preco) - Number(produtoSelecionado.custo))}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cadastrado em</span>
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>{formatarDataBrasil(produtoSelecionado.dataCadastro)}</span>
                </div>
              </div>

              <button onClick={() => navigate(`/estoque/${produtoSelecionado.id}`)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <Edit2 size={16}/> Editar Produto [F2]
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Estoque</h1>
          <p style={{ color: '#64748b', marginTop: '4px', margin: 0, fontSize: isMobile ? '14px' : '16px' }}>Gerencie produtos, custos, lucros e listagens [F1]</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <button 
            onClick={() => navigate('/configuracoes', { state: { aba: 'catalogo' } })}
            style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: 'white', color: corPrincipal, border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Palette size={18} /> Catálogo
          </button>
          <button 
            onClick={() => setModalExportar(true)}
            style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center', background: 'white', color: '#2563eb', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <FileDown size={18} /> Exportar [F12]
          </button>
          <button 
            onClick={() => navigate('/estoque/novo')}
            style={{ flex: isMobile ? '100%' : 'none', justifyContent: 'center', background: '#2563eb', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
          >
            <Plus size={18} /> Novo [F1]
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '12px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <Search size={20} color="#64748b" />
          <input 
            id="input-busca-estoque"
            type="text" 
            placeholder="Buscar nome, categoria ou código... [F3]" 
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
                style={{ padding: '10px 20px', borderRadius: '10px', background: categoriaFiltro === cat ? '#2563eb' : '#f1f5f9', color: categoriaFiltro === cat ? 'white' : '#64748b', border: 'none', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, fontSize: '14px', whiteSpace: 'nowrap', transition: '0.2s', boxShadow: categoriaFiltro === cat ? '0 4px 6px rgba(37, 99, 235, 0.2)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '160px' : '240px'}, 1fr))`, gap: '16px' }}>
          {produtosFiltrados.map((produto) => {
            const temDesconto = Number(produto.precoAntigo) > Number(produto.preco)
            const custo = Number(produto.custo) || 0
            const preco = Number(produto.preco) || 0
            const lucro = preco - custo

            return (
              <div 
                key={produto.id} 
                onClick={() => setProdutoSelecionado(produto)}
                style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'transform 0.1s', position: 'relative' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/estoque/${produto.id}`) }}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: '#f8fafc', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                >
                  <Edit2 size={14} />
                </button>

                <div style={{ marginBottom: '2px', paddingRight: '32px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                    {produto.categorias ? produto.categorias.join(' • ') : produto.categoria}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', margin: '0', lineHeight: '1.3' }}>
                    {produto.nome}
                  </h3>
                  {temDesconto && <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '10px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>Promo</span>}
                </div>

                <div style={{ marginBottom: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Cód: {produto.codigoBarras || 'S/N'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '20px', color: '#2563eb', fontWeight: '900' }}>
                    {formatoMoeda(preco)}
                  </span>
                  <span style={{ fontSize: '12px', color: produto.quantidade > 0 ? '#059669' : '#ef4444', fontWeight: 'bold', background: produto.quantidade > 0 ? '#d1fae5' : '#fee2e2', padding: '4px 8px', borderRadius: '6px' }}>
                    Qtd: {produto.quantidade}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Custo</span>
                    <span style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600' }}>{formatoMoeda(custo)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Lucro</span>
                    <span style={{ fontSize: '13px', color: lucro >= 0 ? '#059669' : '#ef4444', fontWeight: '600' }}>{formatoMoeda(lucro)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cadastrado em</span>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>{formatarDataBrasil(produto.dataCadastro)}</span>
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