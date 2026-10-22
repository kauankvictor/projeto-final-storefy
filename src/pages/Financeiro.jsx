import { useState, useEffect } from 'react'
import { DollarSign, ShoppingBag, Calendar, FileDown, FileText, PieChart, UserCheck, TrendingUp, Calculator, X } from 'lucide-react'

import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Financeiro() {
  const obterDataLocal = (dataObj = new Date()) => {
    return `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(dataObj.getDate()).padStart(2, '0')}`
  }

  const [dataInicial, setDataInicial] = useState(obterDataLocal()) 
  const [dataFinal, setDataFinal] = useState(obterDataLocal()) 
  const [carregando, setCarregando] = useState(true)
  
  const [todasVendas, setTodasVendas] = useState([])
  const [vendasFiltradas, setVendasFiltradas] = useState([])
  const [dadosLoja, setDadosLoja] = useState({ nomeLoja: 'Storefy', ceo: 'Administrador', telefone: '', email: '', endereco: 'Endereço não informado' })
  
  const [metricas, setMetricas] = useState({
    faturamentoTotal: 0,
    lucroTotal: 0,
    quantidadeVendas: 0,
    pix: 0,
    cartaoCredito: 0,
    cartaoDebito: 0,
    dinheiro: 0
  })

  const [desempenhoVendedores, setDesempenhoVendedores] = useState([])

  const [modalRelatorio, setModalRelatorio] = useState(false)
  const [filtroRelatorio, setFiltroRelatorio] = useState({ dataInicio: '', dataFim: '' })

  const [simCusto, setSimCusto] = useState('')
  const [simMargem, setSimMargem] = useState('')
  const [simPreco, setSimPreco] = useState('')

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
          setDadosLoja(prev => ({ ...prev, ...docSnapLoja.data() }))
        }
      } catch (error) {
        console.error("Erro ao carregar dados da loja:", error)
      }
    }
    carregarConfiguracoesNuvem()
  }, [])

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

  useEffect(() => {
    const calcularDadosFinanceiros = async () => {
      setCarregando(true)
      try {
        const querySnapshot = await getDocs(collection(db, "historico"))
        const historicoNuvem = querySnapshot.docs.map(doc => ({ idFirestore: doc.id, ...doc.data() }))

        const apenasVendas = historicoNuvem.filter(reg => reg.tipo === 'VENDA' || reg.tipo === 'FIADO' || reg.tipo === 'MISTA (Com Fiado)' || reg.tipo === 'BAIXA')
        setTodasVendas(apenasVendas)

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
        let lucroCalculado = 0
        let formas = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0 }

        filtradas.forEach(venda => {
          const valor = Number(venda.total) || 0
          
          if (venda.tipo === 'VENDA' || venda.tipo === 'MISTA (Com Fiado)' || venda.tipo === 'BAIXA' || venda.tipo === 'FIADO') {
            faturamento += valor

            let custoTotalItens = 0
            if (venda.itens && venda.itens.length > 0) {
              venda.itens.forEach(item => {
                const custoItem = Number(item.custo || item.precoCusto || 0)
                custoTotalItens += custoItem * (Number(item.quantidadeComprada) || 1)
              })
            }
            lucroCalculado += (valor - custoTotalItens)
            
            if (venda.pagamentosDetalhados) {
              const pPix = parseFloat(venda.pagamentosDetalhados.pix) || 0
              const pCC = parseFloat(venda.pagamentosDetalhados.cartaoCredito) || 0
              const pCD = parseFloat(venda.pagamentosDetalhados.cartaoDebito) || 0
              let pDin = parseFloat(venda.pagamentosDetalhados.dinheiro) || 0
              const pFiado = parseFloat(venda.pagamentosDetalhados.fiado) || 0
              
              const totalPagoFormas = pPix + pCC + pCD + pDin + pFiado
              const troco = totalPagoFormas > valor ? totalPagoFormas - valor : 0
              pDin = pDin - troco 
              
              formas.pix += pPix
              formas.cartaoCredito += pCC
              formas.cartaoDebito += pCD
              formas.dinheiro += (pDin > 0 ? pDin : 0)
            } else {
              const formaNorm = String(venda.formaPagamento || '').toLowerCase()
              if (formaNorm.includes('pix')) formas.pix += valor
              else if (formaNorm.includes('crédito')) formas.cartaoCredito += valor
              else if (formaNorm.includes('débito')) formas.cartaoDebito += valor
              else if (formaNorm.includes('cart')) { formas.cartaoCredito += valor }
              else formas.dinheiro += valor
            }
          }
        })

        let perfomanceMap = {}
        let vendedoresCadastrados = []
        const docRefVendedores = doc(db, "configuracoes", "vendedores")
        const docSnapVendedores = await getDoc(docRefVendedores)
        if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
          vendedoresCadastrados = docSnapVendedores.data().lista
        }

        vendedoresCadastrados.forEach(nome => {
          perfomanceMap[nome] = { nome, totalVendido: 0 }
        })

        filtradas.forEach(venda => {
          if (venda.vendedor && venda.vendedor !== 'Valor abatido na conta do cliente') {
            const vName = venda.vendedor
            if (!perfomanceMap[vName]) {
              perfomanceMap[vName] = { nome: vName, totalVendido: 0 }
            }
            perfomanceMap[vName].totalVendido += (Number(venda.total) || 0)
          }
        })

        let performanceArr = Object.values(perfomanceMap).filter(p => p.totalVendido > 0 || vendedoresCadastrados.includes(p.nome))
        performanceArr.sort((a, b) => b.totalVendido - a.totalVendido)
        setDesempenhoVendedores(performanceArr)
        
        setVendasFiltradas(filtradas)
        setMetricas({
          faturamentoTotal: faturamento,
          lucroTotal: lucroCalculado,
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

  const gerarRelatorioFinanceiroPDF = () => {
    const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)
    const janelaImpressao = window.open('', '_blank')
    
    const htmlPDF = `
      <html>
        <head>
          <title>Relatório Financeiro</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; color: #1e1b4b; font-size: 26px; }
            .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
            .titulo-relatorio { text-align: center; background: #f1f5f9; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 18px; color: #4f46e5; margin-bottom: 30px; text-transform: uppercase; }
            .grid-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; background: #fff; }
            .card h4 { margin: 0; text-transform: uppercase; color: #64748b; font-size: 11px; letter-spacing: 0.5px; }
            .card h2 { margin: 8px 0 0 0; color: #1e1b4b; font-size: 24px; }
            .secao-pagamentos { margin-bottom: 4px; }
            .tabela-pagamento { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-pagamento th, .tabela-pagamento td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            .tabela-pagamento th { background: #f8fafc; color: #475569; font-size: 13px; text-transform: uppercase; }
            .footer-assinatura { margin-top: 60px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 20px; color: #64748b; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${dadosLoja.nomeLoja || 'Loja Storefy'}</h1>
              <p>CEO: ${dadosLoja.ceo || 'Não informado'}</p>
              <p>Endereço: ${dadosLoja.endereco || 'Endereço não cadastrado'}</p>
              <p>Contato: ${dadosLoja.telefone || ''} | ${dadosLoja.email || ''}</p>
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
              <h4>Faturamento</h4>
              <h2>${formatoMoeda(metricas.faturamentoTotal)}</h2>
            </div>
            <div class="card">
              <h4>Lucro do Período</h4>
              <h2 style="color: #059669;">${formatoMoeda(metricas.lucroTotal)}</h2>
            </div>
            <div class="card">
              <h4>Atendimentos</h4>
              <h2>${metricas.quantidadeVendas}</h2>
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
                <tr><td>Cartão de Crédito</td><td><strong>${formatoMoeda(metricas.cartaoCredito)}</strong></td></tr>
                <tr><td>Cartão de Débito</td><td><strong>${formatoMoeda(metricas.cartaoDebito)}</strong></td></tr>
              </tbody>
            </table>
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

  const gerarPDFVendas = (e) => {
    e.preventDefault()
    
    if (!filtroRelatorio.dataInicio || !filtroRelatorio.dataFim) {
      alert("Por favor, selecione a data inicial e final.")
      return
    }

    const dataInicio = new Date(`${filtroRelatorio.dataInicio}T00:00:00`)
    const dataFim = new Date(`${filtroRelatorio.dataFim}T23:59:59`)

    const parseDataString = (dataStr) => {
      if (!dataStr) return new Date(0)
      const [dia, mes, ano] = dataStr.split('/')
      return new Date(`${ano}-${mes}-${dia}T00:00:00`)
    }

    const vendasDoPeriodo = todasVendas.filter(reg => {
      if (reg.tipo === 'SISTEMA' || reg.tipo === 'ESTOQUE' || reg.tipo === 'ESTORNO') return false
      const dataReg = parseDataString(reg.data)
      return dataReg >= dataInicio && dataReg <= dataFim
    })

    if (vendasDoPeriodo.length === 0) {
      alert("Nenhuma venda encontrada para este período.")
      return
    }

    const totalVendido = vendasDoPeriodo.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
    const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

    const janelaImpressao = window.open('', '_blank')
    const htmlPDF = `
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; color: #1e1b4b; font-size: 24px; }
            .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
            .tabela-vendas { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .tabela-vendas th, .tabela-vendas td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            .tabela-vendas th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 12px; }
            .total-geral { text-align: right; font-size: 20px; color: #1e1b4b; font-weight: bold; background: #f1f5f9; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Relatório de Vendas Concluídas</h1>
              <p>Período: ${filtroRelatorio.dataInicio.split('-').reverse().join('/')} até ${filtroRelatorio.dataFim.split('-').reverse().join('/')}</p>
            </div>
            <div style="text-align: right;">
              <p>Loja: ${dadosLoja.nomeLoja || 'Não configurado'}</p>
              <p>Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>

          <table class="tabela-vendas">
            <thead>
              <tr>
                <th>Cód. Registro</th>
                <th>Data/Hora</th>
                <th>Itens (Qtd)</th>
                <th>Pagamento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${vendasDoPeriodo.map(v => {
                const itensTxt = v.itens?.map(i => `${i.quantidadeComprada}x${i.nome}`).join(' | ') || 'Desconhecido';
                return `
                <tr>
                  <td>#${v.idRegistro}</td>
                  <td>${v.data}${v.hora}</td>
                  <td style="max-width: 300px;">${itensTxt}</td>
                  <td>${v.formaPagamento}</td>
                  <td style="font-weight: bold;">${formatoMoeda(v.total)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>

          <div class="total-geral">
            Total do Período: <span style="color: #10b981;">${formatoMoeda(totalVendido)}</span>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `
    
    janelaImpressao.document.write(htmlPDF)
    janelaImpressao.document.close()
    setModalRelatorio(false)
  }

  const gerarPlanilhaCSV = () => {
    if (vendasFiltradas.length === 0) {
      alert("Não há vendas neste período para exportar.")
      return
    }

    let csvContent = "ID;Data;Hora;Vendedor;Forma Pagamento;Desconto;Valor Total\n"

    vendasFiltradas.forEach(v => {
      const id = v.idRegistro || ''
      const data = v.data || ''
      const hora = v.hora || ''
      const vendedor = v.vendedor || 'Não informado'
      const pagamento = v.formaPagamento || ''
      const desconto = Number(v.desconto || 0).toFixed(2).replace('.', ',')
      const total = Number(v.total || 0).toFixed(2).replace('.', ',')

      csvContent += `"${id}";"${data}";"${hora}";"${vendedor}";"${pagamento}";"${desconto}";"${total}"\n`
    })

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    
    link.setAttribute("href", url)
    link.setAttribute("download", `storefy_vendas_${dataInicial}_a_${dataFinal}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatarBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)

  // Handlers do Simulador de Precificação
  const onChangeCustoSimulador = (e) => {
    const valorCusto = e.target.value
    setSimCusto(valorCusto)
    const c = Number(valorCusto) || 0
    const m = Number(simMargem) || 0
    if (c > 0 && m > 0) {
      setSimPreco((c + (c * (m / 100))).toFixed(2))
    } else {
      setSimPreco('')
    }
  }

  const onChangeMargemSimulador = (e) => {
    const valorMargem = e.target.value
    setSimMargem(valorMargem)
    const c = Number(simCusto) || 0
    const m = Number(valorMargem) || 0
    if (c > 0 && m > 0) {
      setSimPreco((c + (c * (m / 100))).toFixed(2))
    } else {
      setSimPreco('')
    }
  }

  const onChangePrecoSimulador = (e) => {
    const valorPreco = e.target.value
    setSimPreco(valorPreco)
    const c = Number(simCusto) || 0
    const p = Number(valorPreco) || 0
    if (c > 0 && p > c) {
      setSimMargem((((p - c) / c) * 100).toFixed(2))
    } else {
      setSimMargem('')
    }
  }

  const lucroSimuladoReais = (Number(simPreco) || 0) - (Number(simCusto) || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Resumo Financeiro</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '13px' : '15px', margin: 0 }}>Acompanhe métricas de faturamento em tempo real sincronizadas na nuvem</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          <button 
            onClick={() => setModalRelatorio(true)}
            style={{ background: '#f8fafc', color: '#2563eb', border: '1px solid #bfdbfe', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', flex: 1 }}
          >
            <FileDown size={18} /> Relatório de Vendas
          </button>

          <button 
            onClick={gerarRelatorioFinanceiroPDF}
            style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)', flex: 1 }}
          >
            <FileText size={18} /> Relatório PDF
          </button>
          
          <button 
            onClick={gerarPlanilhaCSV}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)', flex: 1 }}
          >
            <FileDown size={18} /> Exportar Excel
          </button>
        </div>
      </header>

      {modalRelatorio && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileDown size={20} /> Gerar Relatório de Vendas PDF
              </h3>
              <button onClick={() => setModalRelatorio(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={24}/></button>
            </div>
            
            <form onSubmit={gerarPDFVendas} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Data Inicial</label>
                <input 
                  type="date" 
                  value={filtroRelatorio.dataInicio} 
                  onChange={e => setFiltroRelatorio({...filtroRelatorio, dataInicio: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>Data Final</label>
                <input 
                  type="date" 
                  value={filtroRelatorio.dataFim} 
                  onChange={e => setFiltroRelatorio({...filtroRelatorio, dataFim: e.target.value})} 
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                  required
                />
              </div>

              <button type="submit" style={{ width: '100%', background: '#2563eb', border: 'none', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '8px' }}>
                Gerar PDF
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: isMobile ? '16px' : '20px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={setFiltroHoje} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px', borderRight: '1px solid #e2e8f0' }}>Hoje</button>
          <button onClick={setFiltroSemana} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px', borderRight: '1px solid #e2e8f0' }}>Semana</button>
          <button onClick={setFiltroMes} style={{ flex: 1, background: 'transparent', color: '#1e1b4b', border: 'none', padding: '10px 12px', fontWeight: '600', cursor: 'pointer', fontSize: isMobile ? '12px' : '14px' }}>Mês</button>
        </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '24px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '14px', borderRadius: '14px' }}><DollarSign size={28} /></div>
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Faturamento Geral</p>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: '900', marginTop: '4px', margin: 0 }}>{formatarBRL(metricas.faturamentoTotal)}</h2>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: '#d1fae5', color: '#059669', padding: '14px', borderRadius: '14px' }}><TrendingUp size={28} /></div>
              <div>
                <p style={{ color: '#059669', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Lucro do Período</p>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', color: '#047857', fontWeight: '900', marginTop: '4px', margin: 0 }}>{formatarBRL(metricas.lucroTotal)}</h2>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '14px', borderRadius: '14px' }}><ShoppingBag size={28} /></div>
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Operações Concluídas</p>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: '900', marginTop: '4px', margin: 0 }}>{metricas.quantidadeVendas} Feitas</h2>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
            <div style={{ background: 'white', padding: isMobile ? '20px' : '28px', borderRadius: '20px', border: '1px solid #f1f5f9', height: '100%' }}>
              <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                <PieChart size={20} color="#4f46e5" /> Detalhamento por Canal (Período)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Dinheiro</span>
                  <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.dinheiro)}</h4>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pix</span>
                  <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.pix)}</h4>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cartão Crédito</span>
                  <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.cartaoCredito)}</h4>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Cartão Débito</span>
                  <h4 style={{ fontSize: isMobile ? '16px' : '20px', color: '#1e1b4b', fontWeight: '800', margin: '6px 0 0 0' }}>{formatarBRL(metricas.cartaoDebito)}</h4>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: isMobile ? '20px' : '28px', borderRadius: '20px', border: '1px solid #f1f5f9', height: '100%' }}>
              <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                <UserCheck size={20} color="#4f46e5" /> Desempenho da Equipe (Período)
              </h3>
              
              {desempenhoVendedores.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>Nenhuma venda associada a um vendedor neste período.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                  {desempenhoVendedores.map((vendedor, index) => (
                    <div key={index} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', textTransform: 'capitalize' }}>
                        {vendedor.nome}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Faturado na conta:</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>{formatarBRL(vendedor.totalVendido)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'white', padding: isMobile ? '20px' : '28px', borderRadius: '20px', border: '1px solid #f1f5f9', marginTop: '8px' }}>
            <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 24px 0' }}>
              <Calculator size={20} color="#10b981" /> Simulador de Precificação
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Custo do Produto (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={simCusto} 
                  onChange={onChangeCustoSimulador} 
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px', color: '#1e1b4b' }} 
                  placeholder="Ex: 20.00"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Margem Desejada (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={simMargem} 
                  onChange={onChangeMargemSimulador} 
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px', color: '#1e1b4b' }} 
                  placeholder="Ex: 25"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Preço Final de Venda (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={simPreco} 
                  onChange={onChangePrecoSimulador} 
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none', fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold' }} 
                  placeholder="Preço sugerido..."
                />
              </div>
            </div>

            {(Number(simCusto) > 0 && Number(simPreco) > Number(simCusto)) && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#d1fae5', border: '1px dashed #10b981', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#064e3b', fontSize: '14px', fontWeight: '600' }}>Lucro Bruto Projetado:</span>
                <span style={{ color: '#047857', fontSize: '20px', fontWeight: '900' }}>{formatarBRL(lucroSimuladoReais)}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}