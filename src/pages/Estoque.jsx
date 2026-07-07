import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Image as ImageIcon, Filter, FileDown, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Estoque() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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

  const categoriasUnicas = ['Todas', ...new Set(produtos.map(p => p.categoria))]

  const produtosFiltrados = produtos.filter(produto => {
    const termoBusca = busca.toLowerCase()
    const matchBusca = 
      produto.nome.toLowerCase().includes(termoBusca) || 
      produto.categoria.toLowerCase().includes(termoBusca) ||
      (produto.codigoBarras && produto.codigoBarras.includes(termoBusca))
      
    const matchCategoria = categoriaFiltro === 'Todas' || produto.categoria === categoriaFiltro

    return matchBusca && matchCategoria
  })

  const gerarPDFEstoque = () => {
    const dadosLoja = JSON.parse(localStorage.getItem('storefy_dados_loja')) || {
      nomeLoja: 'Storefy', ceo: 'Administrador', telefone: 'Sem telefone', email: 'Sem email'
    }

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
              <h1>${dadosLoja.nomeLoja}</h1>
              <p>CEO: ${dadosLoja.ceo}</p>
              <p>Contato: ${dadosLoja.telefone} | ${dadosLoja.email}</p>
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
                  <td>${p.categoria}</td>
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

  const pegarPrimeiraFoto = (produto) => {
    if (produto.fotos && produto.fotos.length > 0) return produto.fotos[0]
    if (produto.imagem) return produto.imagem
    return null
  }

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* MODAL DE DETALHES DO PRODUTO */}
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
                  <img key={idx} src={foto} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0, scrollSnapAlign: 'start' }} />
                ))
              })()}
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{produtoSelecionado.categoria}</span>
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
                </div>
                <span style={{ background: produtoSelecionado.quantidade > 0 ? '#d1fae5' : '#fee2e2', color: produtoSelecionado.quantidade > 0 ? '#059669' : '#dc2626', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                  {produtoSelecionado.quantidade > 0 ? `Estoque: ${produtoSelecionado.quantidade}` : 'Esgotado'}
                </span>
              </div>

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
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b' }}>Estoque</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '16px' }}>Gerencie seus produtos, preços e categorias</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
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

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', flexGrow: 1, width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '100%' : '400px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <Search size={20} color="#64748b" />
          <input 
            type="text" 
            placeholder="Buscar nome, categoria ou código..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px 16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '10px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
          <Filter size={20} color="#64748b" />
          <select 
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '15px', cursor: 'pointer', width: '100%' }}
          >
            {categoriasUnicas.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
          Carregando produtos do servidor Google...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '140px' : '240px'}, 1fr))`, gap: isMobile ? '12px' : '24px' }}>
          {produtosFiltrados.map((produto) => {
            const fotoPrincipal = pegarPrimeiraFoto(produto)
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
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {produto.categoria}
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