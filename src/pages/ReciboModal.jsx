import { X, Printer, Smartphone, Mail } from 'lucide-react'

export default function ReciboModal({ registro, dadosLoja, onClose }) {
  if (!registro) return null

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  // Função corrigida para gerar o texto perfeitamente
  const gerarTextoRecibo = () => {
    let texto = `*RECIBO DE PAGAMENTO*\n`
    texto += `*${dadosLoja?.nomeLoja || 'Storefy'}*\n`
    if (dadosLoja?.telefone) texto += `Contato: ${dadosLoja.telefone}\n`
    texto += `.......................................\n\n`
    
    // Variável registro.data corrigida aqui
    texto += `Data: ${registro.data} às ${registro.hora}\n`
    texto += `Operador: ${registro.vendedor || 'Não informado'}\n`
    if (registro.cliente?.nome) texto += `Cliente: ${registro.cliente.nome}\n`
    texto += `Movimentação: ${registro.formaPagamento || 'Não informada'}\n\n`
    
    texto += `*ITENS*\n`
    if (registro.itens && registro.itens.length > 0) {
      registro.itens.forEach(item => {
        const precoTotalItem = (item.preco || 0) * (item.quantidadeComprada || 1)
        texto += `${item.quantidadeComprada}x ${item.nome} - ${formatoMoeda(precoTotalItem)}\n`
      })
    } else {
      texto += `Baixa de conta ou item não especificado.\n`
    }
    
    texto += `\n.......................................\n`
    if (registro.desconto > 0) {
      texto += `Subtotal: ${formatoMoeda(registro.subtotal)}\n`
      texto += `Desconto: -${formatoMoeda(registro.desconto)}\n`
    }
    texto += `*TOTAL: ${formatoMoeda(registro.total)}*\n`
    texto += `.......................................\n`
    texto += `\nObrigado pela preferência!`
    
    return texto
  }

  const handleWhatsApp = () => {
    const texto = gerarTextoRecibo()
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const handleEmail = () => {
    const texto = gerarTextoRecibo()
    const assunto = `Recibo de Compra - ${dadosLoja?.nomeLoja || 'Loja'}`
    const url = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }} onClick={onClose}>
      
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #area-recibo, #area-recibo * { visibility: visible; }
            #area-recibo { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; margin: 0; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div style={{ background: 'white', width: '100%', maxWidth: '380px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e1b4b', fontWeight: 'bold' }}>Opções de Recibo</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}><X size={20} /></button>
        </div>

        <div id="area-recibo" style={{ padding: '24px', background: '#fdfdfd', fontFamily: 'monospace', color: '#000', fontSize: '14px', lineHeight: '1.5', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', textTransform: 'uppercase' }}>{dadosLoja?.nomeLoja || 'Storefy'}</h2>
            <p style={{ margin: 0, fontSize: '12px' }}>{dadosLoja?.endereco || 'Endereço não cadastrado'}</p>
            {dadosLoja?.telefone && <p style={{ margin: 0, fontSize: '12px' }}>Tel: {dadosLoja.telefone}</p>}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }}></div>

          <div style={{ marginBottom: '12px', fontSize: '12px' }}>
            <div><strong>Data:</strong> {registro.data} às {registro.hora}</div>
            <div><strong>Operador:</strong> {registro.vendedor || 'Não informado'}</div>
            {registro.cliente?.nome && <div><strong>Cliente:</strong> {registro.cliente.nome}</div>}
            <div><strong>Pagamento:</strong> {registro.formaPagamento || 'Não informada'}</div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
              <span>QTD X DESCRIÇÃO</span>
              <span>VALOR</span>
            </div>
            {registro.itens && registro.itens.length > 0 ? (
              registro.itens.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'flex-start' }}>
                  <span style={{ flex: 1, paddingRight: '8px' }}>{item.quantidadeComprada || 1}x {item.nome}</span>
                  <span>{formatoMoeda((item.preco || 0) * (item.quantidadeComprada || 1))}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', fontStyle: 'italic' }}>Item não especificado.</div>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', fontSize: '12px' }}>
            {registro.desconto > 0 && (
              <>
                <div>Subtotal: {formatoMoeda(registro.subtotal)}</div>
                <div>Desconto: -{formatoMoeda(registro.desconto)}</div>
              </>
            )}
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
              TOTAL: {formatoMoeda(registro.total)}
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }}></div>

          <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '16px' }}>
            Obrigado pela preferência!<br />
            Volte sempre.
          </div>
        </div>

        <div className="no-print" style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleWhatsApp} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
            <Smartphone size={18} /> Enviar via WhatsApp
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleEmail} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Mail size={18} /> E-mail
            </button>
            <button onClick={handleImprimir} style={{ flex: 1, background: '#475569', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}