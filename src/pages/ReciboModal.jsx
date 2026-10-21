import { useRef } from 'react'
import { X, ImageDown, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'

export default function ReciboModal({ registro, dadosLoja, onClose }) {
  const reciboRef = useRef(null)

  const formatoMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)

  const baixarImagemRecibo = async () => {
    if (!reciboRef.current) return

    try {
      const canvas = await html2canvas(reciboRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Recibo_${registro.idRegistro || Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Erro ao gerar a imagem:', error)
      alert('Não foi possível gerar a imagem do recibo.')
    }
  }

  // Verificação de troco para o recibo
  const pgDetalhes = registro.pagamentosDetalhados || {}
  const totalPagoEmDinheiro = (Number(pgDetalhes.dinheiro) || 0)
  const totalPagoGeral = totalPagoEmDinheiro + (Number(pgDetalhes.pix) || 0) + (Number(pgDetalhes.cartaoCredito) || 0) + (Number(pgDetalhes.cartaoDebito) || 0)
  const teveTroco = totalPagoGeral > (registro.total || 0) && totalPagoEmDinheiro > 0
  const valorTroco = teveTroco ? totalPagoGeral - registro.total : 0

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ background: '#f1f5f9', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#4f46e5" /> Visualizar Recibo
          </h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* ÁREA DO RECIBO QUE SERÁ FOTOGRAFADA */}
          <div ref={reciboRef} style={{ background: 'white', width: '100%', padding: '24px', boxSizing: 'border-box', border: '1px dashed #cbd5e1', color: '#1e293b', fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', textTransform: 'uppercase' }}>{dadosLoja?.nomeLoja || 'NOME DA LOJA'}</h2>
              <p style={{ margin: '2px 0' }}>{dadosLoja?.endereco || 'Endereço não configurado'}</p>
              <p style={{ margin: '2px 0' }}>Tel: {dadosLoja?.telefone || '(00) 00000-0000'}</p>
            </div>
            
            <div style={{ marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px' }}>
              <p style={{ margin: '2px 0' }}>Data: {registro.data} - {registro.hora}</p>
              <p style={{ margin: '2px 0' }}>Atendente: {registro.vendedor || 'Não informado'}</p>
              <p style={{ margin: '2px 0' }}>Registro/Cupom: #{registro.idRegistro}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #cbd5e1' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Qtd. x Item</th>
                  <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {registro.itens?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ paddingTop: '8px', paddingBottom: '4px' }}>{item.quantidadeComprada}x {item.nome}</td>
                    <td style={{ textAlign: 'right', paddingTop: '8px', paddingBottom: '4px' }}>{formatoMoeda((item.preco || 0) * item.quantidadeComprada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {registro.desconto > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{formatoMoeda(registro.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Desconto:</span>
                    <span>- {formatoMoeda(registro.desconto)}</span>
                  </div>
                </>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                <span>TOTAL A PAGAR:</span>
                <span>{formatoMoeda(registro.total)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pagamento:</span>
                <span>{registro.formaPagamento}</span>
              </div>
              
              {teveTroco && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Valor Recebido:</span>
                    <span>{formatoMoeda(totalPagoGeral)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Troco:</span>
                    <span>{formatoMoeda(valorTroco)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#64748b' }}>
              <p style={{ margin: '2px 0' }}>Obrigado pela preferência!</p>
              <p style={{ margin: '2px 0' }}>Gerado por Storefy App</p>
            </div>
          </div>
          
        </div>

        <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={baixarImagemRecibo} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', width: '100%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
            <ImageDown size={20} /> Baixar Imagem do Recibo
          </button>
        </div>

      </div>
    </div>
  )
}