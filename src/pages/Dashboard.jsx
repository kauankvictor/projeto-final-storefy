import { useState, useEffect } from 'react'
import { TrendingUp, Package, Clock as ClockIcon, Activity, ClipboardList, UserCheck, DollarSign } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation() 
  
  const [agora, setAgora] = useState(new Date())
  const [lembretes, setLembretes] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [metricas, setMetricas] = useState({
    faturamentoHoje: 0,
    faturamentoMes: 0,
    totalProdutos: 0
  })
  
  const [ultimasAtividades, setUltimasAtividades] = useState([])
  const [desempenhoVendedores, setDesempenhoVendedores] = useState([])

  const [dadosGraficoSemana, setDadosGraficoSemana] = useState([])
  const [dadosGraficoPagamentos, setDadosGraficoPagamentos] = useState([])

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dataFormatada = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const horaFormatada = agora.toLocaleTimeString('pt-BR')

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const formatarDataBR = (dataObj) => {
    const d = String(dataObj.getDate()).padStart(2, '0')
    const m = String(dataObj.getMonth() + 1).padStart(2, '0')
    const a = dataObj.getFullYear()
    return `${d}/${m}/${a}`
  }

  const normalizarData = (dStr) => {
    if (!dStr || !dStr.includes('/')) return dStr
    const partes = dStr.split('/')
    if (partes.length !== 3) return dStr
    const dia = String(partes[0]).padStart(2, '0')
    const mes = String(partes[1]).padStart(2, '0')
    return `${dia}/${mes}/${partes[2]}`
  }

  const converterParaDate = (dataStr) => {
    if (!dataStr || !dataStr.includes('/')) return null
    const [dia, mes, ano] = dataStr.split('/')
    return new Date(ano, mes - 1, dia, 12, 0, 0) 
  }

  const carregarDadosDoBanco = async () => {
    try {
      const queryProdutos = await getDocs(collection(db, "produtos"))
      const produtos = queryProdutos.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const queryHistorico = await getDocs(collection(db, "historico"))
      const historico = queryHistorico.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      let vendedoresCadastrados = []
      const docRefVendedores = doc(db, "configuracoes", "vendedores")
      const docSnapVendedores = await getDoc(docRefVendedores)
      if (docSnapVendedores.exists() && docSnapVendedores.data().lista) {
        vendedoresCadastrados = docSnapVendedores.data().lista
      }

      // CORREÇÃO DO QUOTA EXCEEDED ERROR
      // Removemos as imagens em Base64 antes de salvar no localStorage
      try {
        const produtosLeves = produtos.map(p => {
          const { fotos, imagem, ...resto } = p;
          return resto;
        });
        localStorage.setItem('storefy_produtos', JSON.stringify(produtosLeves))
      } catch (cacheError) {
        console.warn("Aviso: Memória local cheia, ignorando cache de produtos.", cacheError)
      }

      const notasSalvas = localStorage.getItem('storefy_lembretes') || ''
      setLembretes(notasSalvas)

      const hojeDate = new Date()
      const hojeStr = formatarDataBR(hojeDate)
      
      const primeiroDiaMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1)
      const ultimoDiaMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth() + 1, 0)
      
      const vendasTotais = historico.filter(h => {
        const tipo = String(h.tipo || '').toUpperCase()
        return tipo === 'VENDA' || tipo === 'FIADO'
      })
      
      const vendasHoje = vendasTotais.filter(h => normalizarData(h.data) === hojeStr)
      
      const faturamentoHoje = vendasHoje.reduce((total, venda) => {
        if (String(venda.tipo).toUpperCase() === 'VENDA') return total + (Number(venda.total) || 0)
        return total
      }, 0)

      const vendasMes = vendasTotais.filter(venda => {
        const dataVenda = converterParaDate(normalizarData(venda.data))
        if (!dataVenda) return false
        return dataVenda >= primeiroDiaMes && dataVenda <= ultimoDiaMes
      })
      
      const faturamentoMes = vendasMes.reduce((total, venda) => {
        if (String(venda.tipo).toUpperCase() === 'VENDA') return total + (Number(venda.total) || 0)
        return total
      }, 0)

      let perfomanceMap = {}
      vendedoresCadastrados.forEach(nome => {
        perfomanceMap[nome] = { nome, totalVendido: 0, vendasPendentesFiado: 0 }
      })

      vendasHoje.forEach(venda => {
        if (String(venda.tipo).toUpperCase() === 'VENDA' && venda.vendedor && venda.vendedor !== 'Valor abatido na conta do cliente') {
          const vName = venda.vendedor
          if (!perfomanceMap[vName]) {
            perfomanceMap[vName] = { nome: vName, totalVendido: 0, vendasPendentesFiado: 0 }
          }
          perfomanceMap[vName].totalVendido += (Number(venda.total) || 0)
        }
      })

      const queryClientes = await getDocs(collection(db, "clientes"))
      const clientes = queryClientes.docs.map(doc => doc.data())
      
      clientes.forEach(cliente => {
        if (cliente.anotacoes && Array.isArray(cliente.anotacoes)) {
          cliente.anotacoes.forEach(nota => {
            const dataNota = converterParaDate(nota.dataCriacao)
            
            if (dataNota && formatarDataBR(dataNota) === hojeStr) {
              const valorOriginal = Number(nota.valor) || 0
              const valorPago = Number(nota.valorPago) || 0
              const pendente = valorOriginal - valorPago

              const match = nota.texto ? nota.texto.match(/\(Vendedor: (.*?)\)/) : null
              let vName = 'Desconhecido'
              if (match && match[1]) {
                vName = match[1].trim()
              }

              if (vName !== 'Desconhecido') {
                if (!perfomanceMap[vName]) {
                  perfomanceMap[vName] = { nome: vName, totalVendido: 0, vendasPendentesFiado: 0 }
                }
                perfomanceMap[vName].totalVendido += valorPago
                perfomanceMap[vName].vendasPendentesFiado += pendente
              }
            }
          })
        }
      })

      let performanceArr = Object.values(perfomanceMap).filter(p => p.totalVendido > 0 || p.vendasPendentesFiado > 0 || vendedoresCadastrados.includes(p.nome))
      performanceArr.sort((a, b) => b.totalVendido - a.totalVendido)
      setDesempenhoVendedores(performanceArr)

      let pagamentos = { Pix: 0, Dinheiro: 0, Cartão: 0, Fiado: 0 }
      vendasHoje.forEach(v => {
        const valor = Number(v.total) || 0
        const forma = String(v.formaPagamento || '').toLowerCase()
        const tipoLog = String(v.tipo || '').toUpperCase()

        if (tipoLog === 'VENDA') {
          if (forma.includes('pix')) pagamentos.Pix += valor
          else if (forma.includes('cart') || forma.includes('créd') || forma.includes('déb')) pagamentos.Cartão += valor
          else if (forma.includes('dinh') || forma.includes('espéc')) pagamentos.Dinheiro += valor
          else pagamentos.Dinheiro += valor
        } else if (tipoLog === 'FIADO') {
          pagamentos.Fiado += valor
        }
      })

      const dadosPizza = [
        { name: 'Pix', value: pagamentos.Pix, color: '#10b981' },
        { name: 'Dinheiro', value: pagamentos.Dinheiro, color: '#f59e0b' },
        { name: 'Cartão', value: pagamentos.Cartão, color: '#3b82f6' },
        { name: 'Fiado', value: pagamentos.Fiado, color: '#ef4444' }
      ].filter(d => d.value > 0)

      setDadosGraficoPagamentos(dadosPizza)

      const dadosSemana = []
      for (let i = 6; i >= 0; i--) {
        const dataAlvo = new Date()
        dataAlvo.setDate(hojeDate.getDate() - i)
        const dataAlvoStr = formatarDataBR(dataAlvo)
        
        const faturamentoDia = vendasTotais
          .filter(h => normalizarData(h.data) === dataAlvoStr && String(h.tipo).toUpperCase() === 'VENDA')
          .reduce((total, venda) => total + (Number(venda.total) || 0), 0)

        dadosSemana.push({
          dia: dataAlvo.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
          total: faturamentoDia,
          dataCompleta: dataAlvoStr
        })
      }
      setDadosGraficoSemana(dadosSemana)

      setMetricas({
        faturamentoHoje,
        faturamentoMes,
        totalProdutos: produtos.length
      })
      
      const historicoOrdenado = [...historico].sort((a, b) => (b.idRegistro || 0) - (a.idRegistro || 0))
      setUltimasAtividades(historicoOrdenado.slice(0, 4)) 

    } catch (error) {
      console.error("Erro ao sincronizar painel de controle:", error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosDoBanco()
    window.addEventListener('focus', carregarDadosDoBanco)
    return () => window.removeEventListener('focus', carregarDadosDoBanco)
  }, [location.pathname, location.key])

  const handleMudarLembretes = (txt) => {
    setLembretes(txt)
    localStorage.setItem('storefy_lembretes', txt)
  }

  if (carregando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Sincronizando painel operacional com o banco de dados...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box', width: '100%' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '30px', color: '#1e1b4b', fontWeight: 'bold', margin: 0 }}>Visão Geral</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: isMobile ? '14px' : '15px', margin: 0 }}>Acompanhe o desempenho da sua loja em tempo real</p>
        </div>
        
        <div style={{ textAlign: isMobile ? 'center' : 'right', background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: isMobile ? '100%' : 'auto' }}>
          <p style={{ color: '#475569', fontWeight: '600', fontSize: '13px', textTransform: 'capitalize', margin: 0 }}>{dataFormatada}</p>
          <p style={{ color: '#4f46e5', fontWeight: '900', fontSize: '24px', marginTop: '2px', letterSpacing: '1px', margin: 0 }}>{horaFormatada}</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', padding: isMobile ? '20px' : '24px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px', display: 'flex' }}><TrendingUp size={16} /></div>
            <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Faturamento de Hoje</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '900', margin: 0 }}>
            {formatarMoeda(metricas.faturamentoHoje)}
          </h2>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '20px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#dcfce7', color: '#059669', padding: '8px', borderRadius: '8px', display: 'flex' }}><DollarSign size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Faturamento (Mês Atual)</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>
            {formatarMoeda(metricas.faturamentoMes)}
          </h2>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '20px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px', borderRadius: '8px', display: 'flex' }}><Package size={16} /></div>
            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Total de Produtos Catalogados</p>
          </div>
          <h2 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', fontWeight: '900', margin: 0 }}>{metricas.totalProdutos}</h2>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start', width: '100%' }}>
        
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', boxSizing: 'border-box', width: '100%' }}>
          <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 24px 0' }}>
            <Activity size={20} color="#4f46e5" /> Faturamento dos Últimos 7 Dias
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={dadosGraficoSemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  formatter={(value) => [formatarMoeda(value), "Faturamento"]} 
                  labelFormatter={(label) => `Dia: ${label}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
            <TrendingUp size={20} color="#4f46e5" /> Divisão de Pagamentos (Hoje)
          </h3>
          
          {dadosGraficoPagamentos.length === 0 ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', minHeight: '200px' }}>
              Nenhuma venda hoje.
            </div>
          ) : (
            <div style={{ width: '100%', height: 220, position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={dadosGraficoPagamentos}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dadosGraficoPagamentos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatarMoeda(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            {dadosGraficoPagamentos.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                {item.name}
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', alignItems: 'stretch', width: '100%' }}>
        
        <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0', textTransform: 'uppercase' }}>
            <ClockIcon size={18} color="#4f46e5" /> Últimas Atividades
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-start' }}>
            {ultimasAtividades.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px', margin: 0 }}>Nenhuma movimentação.</p>
            ) : (
              ultimasAtividades.map((atividade) => (
                <div key={atividade.idRegistro} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f8fafc', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e1b4b' }}>
                      {String(atividade.tipo).toUpperCase() === 'VENDA' ? 'Venda Concluída' : (String(atividade.tipo).toUpperCase() === 'FIADO' ? 'Venda no Fiado' : 'Ajuste de Estoque')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {atividade.total 
                        ? `${formatarMoeda(atividade.total)} via ${atividade.formaPagamento || '-'}`
                        : `Alteração aplicada.`
                      }
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'right' }}>
                    <span>{atividade.hora}</span>
                    <br/>
                    <span>{atividade.vendedor || ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
            <ClipboardList size={18} color="#4f46e5" /> Lembretes Rápidos
          </h3>
          <textarea 
            value={lembretes}
            onChange={(e) => handleMudarLembretes(e.target.value)}
            placeholder="Digite avisos ou lembretes para a equipe..."
            style={{ flex: 1, width: '100%', minHeight: '180px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', fontFamily: 'inherit', resize: 'none', background: '#f8fafc', color: '#1e1b4b', lineHeight: '1.5', boxSizing: 'border-box' }}
          />
        </div>

      </div>

      <div style={{ background: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0', textTransform: 'uppercase' }}>
          <UserCheck size={18} color="#4f46e5" /> Desempenho da Equipe (Hoje)
        </h3>
        
        {desempenhoVendedores.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px', margin: 0 }}>Nenhuma venda associada a um vendedor hoje.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '200px'}, 1fr))`, gap: '16px' }}>
            {desempenhoVendedores.map((vendedor, index) => (
              <div key={index} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e1b4b', textTransform: 'capitalize' }}>
                  {vendedor.nome}
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Vendido e Recebido:</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>{formatarMoeda(vendedor.totalVendido)}</span>
                </div>
                {vendedor.vendasPendentesFiado > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
                    <span style={{ fontSize: '11px', color: '#ef4444' }}>Aberto no Fiado:</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>{formatarMoeda(vendedor.vendasPendentesFiado)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}