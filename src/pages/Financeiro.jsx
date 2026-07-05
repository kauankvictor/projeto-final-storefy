import { useState, useEffect } from 'react'
import { DollarSign, ShoppingBag, CreditCard, Calendar, FileDown, PieChart } from 'lucide-react'

// Importações cruciais do Firebase
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Financeiro() {
  const obterDataLocal = (dataObj = new Date()) => {
    return `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(dataObj.getDate()).padStart(2, '0')}`
  }

  // ================= ESTADOS DE FILTRO =================
  const [dataInicial, setDataInicial] = useState(obterDataLocal()) 
  const [dataFinal, setDataFinal] = useState(obterDataLocal()) 
  const [carregando, setCarregando] = useState(true)
  
  // ================= ESTADOS DOS RESULTADOS =================
  const [vendasFiltradas, setVendasFiltradas] = useState([])
  const [metricas, setMetricas] = useState({
    faturamentoTotal: 0,
    quantidadeVendas: 0,
    pix: 0,
    cartao: 0,
    dinheiro: 0,
    fiado: 0
  })

  // ================= ESTADO RESPONSIVO =================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ================= BOTÕES RÁPIDOS =================
  const setFiltroHoje = () => {
    const hoje = obterDataLocal()
    setDataInicial(hoje)
    setDataFinal(hoje)
  }

  const setFiltroSemana = () => {
    const data = new Date()
    const domingo = new Date(data.setDate(data.getDate() - data.getDay()))
    const sabado = new Date(data.setDate(data.getDate() - data.getDay() + 6))
    setDataInicial(obterDataLocal(domingo))
    setDataFinal(obterDataLocal(sabado))
  }

  const setFiltroMes = () => {
    const data = new Date()
    const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1)
    const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0)
    setDataInicial(obterDataLocal(primeiroDia))
    setDataFinal(obterDataLocal(ultimoDia))
  }

  // ================= AUXILIARES DE DATA =================
  const converterParaDate = (dataStr) => {
    if (!dataStr || !dataStr.includes('/')) return null
    const [dia, mes, ano] = dataStr.split('/')
    return new Date(ano, mes - 1, dia, 12, 0, 0) 
  }

  const formatarDataBR = (dataIso) => {
    if (!dataIso) return ''
    const [ano, mes, dia] = dataIso.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // ================= LEITURA E FILTRAGEM DIRETO DO FIREBASE =================
  useEffect(() => {
    const calcularDadosFinanceiros = async () => {
      setCarregando(true)
      try {
        const querySnapshot = await getDocs(collection(db, "historico"))
        const historicoNuvem = querySnapshot.docs.map(doc => doc.data())

        const apenasVendas = historicoNuvem.filter(reg => reg.tipo === 'VENDA' || reg.tipo === 'FIADO')

        const [anoI, mesI, diaI] = dataInicial.split('-')
        const [anoF, mesF, diaF] = dataFinal.split('-')
        
        const inicio = new Date(anoI, mesI - 1, diaI, 0, 0, 0)
        const fim = new Date(anoF, mesF - 1, diaF, 23, 59, 59)

        const filtradas = apenasVendas.filter(venda => {
          const dataVenda = converterParaDate(venda.data)
          if (!dataVenda) return false
          return dataVenda >= inicio && dataVenda <= fim
        })

        let faturamento = 0
        let formas = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0 }

        filtradas.forEach(venda => {
          const valor = Number(venda.total) || 0
          faturamento += valor

          const formaNorm = String(venda.formaPagamento || '').toLowerCase()
          if (formaNorm.includes('pix')) formas.pix += valor
          else if (formaNorm.includes('cart') || formaNorm.includes('créd') || formaNorm.includes('déb')) formas.cartao += valor
          else if (formaNorm.includes('dinh') || formaNorm.includes('espéc')) formas.dinheiro += valor
          else if (formaNorm.includes('fia') || formaNorm.includes('anota')) formas.fiado += valor
          else formas.dinheiro += valor 
        })

        setVendasFiltradas(filtradas)
        setMetricas({
          faturamentoTotal: faturamento,
          quantidadeVendas: filtradas.length,
          ...formas
        })

      } catch (error) {
        console.error("Erro ao calcular dados do financeiro:", error)
      } finally {
        setCarregando(false)
      }
    }

    calcularDadosFinanceiros()
  }, [dataInicial, dataFinal])

  // ================= GERADOR DE RELATÓRIO PDF EXIBINDO DADOS DA NUVEM =================
  const gerarRelatorioPDF = () => {
    const dadosLoja = JSON.parse(localStorage.getItem('storefy_dados_loja')) || {
      nomeLoja: 'Storefy', ceo: 'Administrador', telefone: '-', email: '-'
    }

    const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
    const janelaImpressao = window.open('', '_blank')
    
    const htmlPDF = `
      <html>
        <head>
          <title>Relatório Financeiro - ${dadosLoja.nomeLoja}</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; color: #1e1b4b; font-size: 26px; }
            .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
            .titulo-relatorio { text-align: center; background: #f1f5f9; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 18px; color: #4f46e5; margin-bottom: 30px; text-transform: uppercase; }
            .grid-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; background: #fff; }
            .card h4 { margin: 0; text-transform: uppercase; color: #64748b; font-size: 11px; letter-spacing: 0.5px; }
            .card h2 { margin: 8px 0 0 0; color: #1e1b4b; font-size: 24px; }
            .secao-pagamentos { margin-bottom: 4px; }
            .tabela-pagamento { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-pagamento th, .tabela-pagamento td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            .tabela-pagamento th { background: #f8fafc; color: #475569; font-size: 13px; text-transform: uppercase; }
            .lista-vendas h3 { border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; color: #1e1b4b; font-size: 16px; margin-bottom: 15px; }
            .item-venda { border-bottom: 1px dashed #e2e8f0; padding: 10px 0; display: flex; justify-content: space-between; font-size: 14px; }
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
              <p style="color: #4f46e5; font-weight: bold; font-size: 15px; margin-top: 8px;">
                Período: ${formatarDataBR(dataInicial)} até ${formatarDataBR(dataFinal)}
              </p>
            </div>
          </div>

          <div class="titulo-relatorio">Fechamento e Resumo Financeiro</div>

          <div class="grid-cards">
            <div class="card">
              <h4>Faturamento do Período</h4>
              <h2>${formatoMoeda(metricas.faturamentoTotal)}</h2>
            </div>
            <div class="card">
              <h4>Total de Vendas Concluídas</h4>
              <h2>${metricas.quantidadeVendas} Atendimentos</h2>
            </div>
          </div>

          <div class="secao-pagamentos">
            <h3 style="color: #1e1b4b; font-size: 16px; margin-bottom: 15px;">Divisão por Forma de Pagamento</h3>
            <table class="tabela-pagamento">
              <thead>
                <tr>
                  <th>Meio de Recebimento</th>
                  <th>Valor Arrecadado</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Dinheiro à Vista</td><td><strong>${formatoMoeda(metricas.dinheiro)}</strong></td></tr>
                <tr><td>Transferência Pix</td><td><strong>${formatoMoeda(metricas.pix)}</strong></td></tr>
                <tr><td>Cartão (Crédito/Débito)</td><td><strong>${formatoMoeda(metricas.cartao)}</strong></td></tr>
                <tr><td>Fiado / Caderno de Notas</td><td style="color: #ef4444;">export devedores<strong>${formatoMoeda(metricas.fiado)}</strong></td></tr>
              </tbody>
            </table>
          </div>

          <div class="lista-vendas">
            <h3>Listagem Detalhada do Período</h3>
            ${vendasFiltradas.length === 0 ? '<p style="color: #94a3b8; font-style: italic;">Nenhuma venda registrada neste intervalo de tempo.</p>' : 
              vendasFiltradas.map(v => `
                <div class="item-venda">
                  <div>
                    <strong>Data/Hora:</strong> ${v.data} - ${v.hora} | 
                    <strong>Vendedor:</strong> ${v.vendedor || 'Não inf.'} | 
                    <strong>Cliente:</strong> ${v.cliente?.nome || 'Consumidor Final'} <br/>
                    <small style="color: #64748b;">Meio: ${v.formaPagamento}</small>
                  </div>
                  <div style="font-weight: bold; color: #10b981; display: flex; flex-direction: column; align-items: flex-end;">
                    <span>${formatoMoeda(v.total)}</span>
                    ${v.desconto > 0 ? `<small style="color: #ef4444; font-size: 11px;">(Desc: ${formatoMoeda(v.desconto)})</small>` : ''}
                  </div>
                </div>
              `).join('')
            }
          </div>

          <div class="footer-assinatura">
            <p>Relatório gerado administrativamente através do Storefy via Google Cloud.</p>
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

  const formatarBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CABEÇALHO RESPONSIVO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Resumo Financeiro</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Acompanhe métricas de faturamento em tempo real sincronizadas na nuvem</p>
        </div>

        <button 
          onClick={gerarRelatorioPDF}
          style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)', width: isMobile ? '100%' : 'auto' }}
        >
          <FileDown size={18} /> Exportar Relatório (PDF)
        </button>
      </header>

      {/* PAINEL DE FILTROS INTELIGENTES RESPONSIVO */}
      <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
        
        {/* Botões Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={setFiltroHoje} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px', borderRight: '1px solid #e2e8f0' }}>Hoje</button>
          <button onClick={setFiltroSemana} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px', borderRight: '1px solid #e2e8f0' }}>Semana</button>
          <button onClick={setFiltroMes} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>Mês</button>
        </div>

        {/* Seleção de Data Inicial e Final */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: isMobile ? '0' : 'auto', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '8px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
            <Calendar size={18} color="#64748b" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>De:</span>
            <input 
              type="date" 
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }} 
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '8px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
            <Calendar size={18} color="#64748b" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Até:</span>
            <input 
              type="date" 
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: '#1e1b4b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%' }} 
            />
          </div>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Calculando balanço e somando registros da nuvem...</div>
      ) : (
        <>
          {/* METRICAS PRINCIPAIS RESPONSIVAS */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: '#d1fae5', color: '#059669', padding: '14px', borderRadius: '14px' }}><DollarSign size={28} /></div>
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Faturamento do Período</p>
                <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: '#1e1b4b', fontWeight: '900', marginTop: '4px', margin: 0 }}>{formatarBRL(metricas.faturamentoTotal)}</h2>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '14px', borderRadius: '14px' }}><ShoppingBag size={28} /></div>
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Quantidade de Vendas</p>
                <h2 style={{ fontSize: isMobile ? '24px' : '32px', color: '#1e1b4b', fontWeight: '900', marginTop: '4px', margin: 0 }}>{metricas.quantidadeVendas} Feitas</h2>
              </div>
            </div>
          </div>

          {/* DETALHAMENTO POR MEIO DE RECEBIMENTO RESPONSIVO */}
          <div style={{ background: 'white', padding: isMobile ? '20px' : '28px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingBottom: '16px' }}>
              <PieChart size={20} color="#4f46e5" /> Detalhamento por Canal de Entrada
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Dinheiro</span>
                <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.dinheiro)}</h4>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pix</span>
                <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.pix)}</h4>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cartões</span>
                <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.cartao)}</h4>
              </div>

              <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '14px', border: '1px solid #fee2e2' }}>
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Fiado</span>
                <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#ef4444', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.fiado)}</h4>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}