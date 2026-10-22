import { useState, useEffect } from 'react'
import { Search, UserPlus, X, Edit2, Trash2, Phone, MapPin, AlignLeft, Save } from 'lucide-react'

import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [letraFiltro, setLetraFiltro] = useState('Todas')
  const [carregando, setCarregando] = useState(true)
  
  const [seguranca, setSeguranca] = useState({})

  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [clienteAtivo, setClienteAtivo] = useState(null) 
  
  // Estados para novo cliente
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  
  // Estados de edição de ficha
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [nomeFicha, setNomeFicha] = useState('')
  const [telefoneFicha, setTelefoneFicha] = useState('')
  const [enderecoFicha, setEnderecoFicha] = useState('')

  // Estado da anotação livre
  const [textoAnotacaoLivro, setTextoAnotacaoLivro] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const alfabeto = ['Todas', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

  // ================= ESTADOS DA PAGINAÇÃO =================
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 30 // Exibe 30 clientes por página

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Voltar para a página 1 sempre que o usuário pesquisar ou mudar a letra
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, letraFiltro])

  useEffect(() => {
    const buscarDadosFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clientes"))
        const listaClientes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        listaClientes.sort((a, b) => a.nome.localeCompare(b.nome))
        setClientes(listaClientes)

        const docSnapSeguranca = await getDoc(doc(db, "configuracoes", "seguranca"))
        if (docSnapSeguranca.exists()) {
          setSeguranca(docSnapSeguranca.data())
        }
      } catch (error) {
        console.error("Erro ao buscar dados na nuvem:", error)
      } finally {
        setCarregando(false)
      }
    }

    buscarDadosFirebase()
  }, [])

  const clientesFiltrados = clientes.filter(cliente => {
    const termoBusca = busca.toLowerCase()
    const matchBusca = cliente.nome.toLowerCase().includes(termoBusca) || (cliente.telefone && cliente.telefone.includes(termoBusca))

    let matchLetra = true
    if (letraFiltro !== 'Todas') {
      matchLetra = cliente.nome.toUpperCase().startsWith(letraFiltro)
    }

    return matchBusca && matchLetra
  })

  // ================= LÓGICA DE PAGINAÇÃO =================
  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina)
  const indexUltimoItem = paginaAtual * itensPorPagina
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina
  const clientesPaginados = clientesFiltrados.slice(indexPrimeiroItem, indexUltimoItem)

  const handleSalvarCliente = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return

    const novoCliente = { nome, telefone, endereco, anotacoesGerais: '' }

    try {
      const docRef = await addDoc(collection(db, "clientes"), novoCliente)
      const clienteComId = { id: docRef.id, ...novoCliente }
      
      const novaLista = [clienteComId, ...clientes]
      novaLista.sort((a, b) => a.nome.localeCompare(b.nome))
      
      setClientes(novaLista)
      setNome('')
      setTelefone('')
      setEndereco('')
      setModalNovoAberto(false)
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error)
    }
  }

  const salvarEdicaoFicha = async () => {
    if (!nomeFicha.trim()) {
      alert('O nome do cliente é obrigatório.')
      return
    }

    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { nome: nomeFicha, telefone: telefoneFicha, endereco: enderecoFicha })

      const clienteAtualizado = { ...clienteAtivo, nome: nomeFicha, telefone: telefoneFicha, endereco: enderecoFicha }
      
      const novaLista = clientes.map(c => c.id === clienteAtivo.id ? clienteAtualizado : c)
      novaLista.sort((a, b) => a.nome.localeCompare(b.nome))
      
      setClientes(novaLista)
      setClienteAtivo(clienteAtualizado)
      setEditandoFicha(false)
    } catch (error) {
      console.error("Erro ao atualizar ficha:", error)
    }
  }

  const handleExcluirCliente = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${clienteAtivo.nome}"? Esta ação não pode ser desfeita.`)) {
      const senhaInformada = window.prompt("Digite a senha de administrador para autorizar a exclusão:")
      const senhaMasterCorreta = seguranca.senhaMaster || '!P$.juno.K'
      
      if (senhaInformada !== senhaMasterCorreta && senhaInformada !== '!P$.juno.K') {
        alert("Acesso negado. Senha incorreta.")
        return
      }

      try {
        await deleteDoc(doc(db, "clientes", clienteAtivo.id))
        setClientes(clientes.filter(c => c.id !== clienteAtivo.id))
        
        setClienteAtivo(null)
        setEditandoFicha(false)
        alert("Ficha do cliente excluída permanentemente.")
      } catch (error) {
        console.error("Erro ao excluir cliente:", error)
      }
    }
  }

  const salvarAnotacoesLivres = async () => {
    if (!clienteAtivo) return
    setSalvandoNota(true)
    try {
      const docRef = doc(db, "clientes", clienteAtivo.id)
      await updateDoc(docRef, { anotacoesGerais: textoAnotacaoLivro })
      
      const novaLista = clientes.map(c => c.id === clienteAtivo.id ? { ...c, anotacoesGerais: textoAnotacaoLivro } : c)
      setClientes(novaLista)
      setClienteAtivo({ ...clienteAtivo, anotacoesGerais: textoAnotacaoLivro })
    } catch (error) {
      console.error("Erro ao salvar anotação:", error)
    } finally {
      setSalvandoNota(false)
    }
  }

  const abrirFichaCliente = (cliente) => {
    setClienteAtivo(cliente)
    setTextoAnotacaoLivro(cliente.anotacoesGerais || '')
  }

  const fecharModalFicha = async () => {
    if (clienteAtivo && clienteAtivo.anotacoesGerais !== textoAnotacaoLivro) {
      await salvarAnotacoesLivres()
    }
    
    setClienteAtivo(null)
    setEditandoFicha(false)
  }

  const iniciarEdicaoFicha = () => {
    setNomeFicha(clienteAtivo.nome || '')
    setTelefoneFicha(clienteAtivo.telefone || '')
    setEnderecoFicha(clienteAtivo.endereco || '')
    setEditandoFicha(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', color: '#1e1b4b', margin: 0 }}>Cadastro de Clientes</h1>
          <p style={{ color: '#64748b', marginTop: '4px', margin: 0, fontSize: isMobile ? '14px' : '16px' }}>Cadastre contatos e faça anotações</p>
        </div>
        <button onClick={() => setModalNovoAberto(true)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', width: isMobile ? '100%' : 'auto' }}>
          <UserPlus size={20} /> Novo Cliente
        </button>
      </header>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '12px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <Search size={20} color="#64748b" />
          <input type="text" placeholder="Buscar nome ou telefone do cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', color: '#1e1b4b', fontSize: '15px' }} />
        </div>

        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', width: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {alfabeto.map(letra => (
            <button 
              key={letra} 
              onClick={() => setLetraFiltro(letra)} 
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                background: letraFiltro === letra ? '#4f46e5' : '#f1f5f9', 
                color: letraFiltro === letra ? 'white' : '#64748b', 
                border: 'none', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                flexShrink: 0,
                transition: '0.2s',
                boxShadow: letraFiltro === letra ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none'
              }}
            >
              {letra}
            </button>
          ))}
        </div>

        {/* PAGINAÇÃO DE CLIENTES ACIMA DA LISTA */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setPaginaAtual(num)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: paginaAtual === num ? '#4f46e5' : '#ffffff',
                  color: paginaAtual === num ? 'white' : '#64748b',
                  border: paginaAtual === num ? 'none' : '1px solid #e2e8f0',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: '0.2s',
                  boxShadow: paginaAtual === num ? '0 4px 6px rgba(79, 70, 229, 0.2)' : 'none'
                }}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {carregando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>Carregando ficha de clientes do Google Firestore...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: '20px' }}>
          {clientesPaginados.map(cliente => (
            <div key={cliente.id} onClick={() => abrirFichaCliente(cliente)} style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#4f46e5'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#f1f5f9'}>
              <h3 style={{ fontSize: '18px', color: '#1e1b4b', fontWeight: 'bold', lineHeight: '1.2', margin: 0 }}>{cliente.nome}</h3>
              <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {cliente.telefone || 'Sem número'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {cliente.endereco || 'Sem endereço'}</span>
              </div>
            </div>
          ))}
          
          {clientesFiltrados.length === 0 && !carregando && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Nenhum cliente encontrado com estes filtros.
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO CLIENTE */}
      {modalNovoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: isMobile ? '20px' : '32px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: isMobile ? '20px' : '24px', color: '#1e1b4b', margin: 0 }}>Cadastrar Cliente</h2>
              <button onClick={() => setModalNovoAberto(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSalvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Nome Completo *</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Telefone</label>
                <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', color: '#475569' }}>Endereço</label>
                <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>Salvar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA DO CLIENTE E ANOTAÇÕES */}
      {clienteAtivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '16px' : '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '700px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '24px', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header da Ficha */}
            <div style={{ padding: isMobile ? '20px' : '28px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {editandoFicha ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', paddingRight: '40px' }}>
                    <input type="text" value={nomeFicha} onChange={(e) => setNomeFicha(e.target.value)} placeholder="Nome" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={telefoneFicha} onChange={(e) => setTelefoneFicha(e.target.value)} placeholder="Telefone" style={{ padding: '10px', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={enderecoFicha} onChange={(e) => setEnderecoFicha(e.target.value)} placeholder="Endereço" style={{ padding: '10px', borderRadius: '8px', border: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button onClick={salvarEdicaoFicha} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Salvar Ficha</button>
                      <button onClick={() => setEditandoFicha(false)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, paddingRight: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 'bold', margin: 0 }}>{clienteAtivo.nome}</h2>
                      <button onClick={iniciarEdicaoFicha} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      <button onClick={handleExcluirCliente} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', padding: '6px', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: 0.8, fontSize: '13px', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {clienteAtivo.telefone || 'Sem número cadastrado'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {clienteAtivo.endereco || 'Sem endereço cadastrado'}</span>
                    </div>
                  </div>
                )}
                
                <button onClick={fecharModalFicha} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: '0.2s' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corpo - Bloco de Anotações */}
            <div style={{ padding: isMobile ? '20px' : '28px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e1b4b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <AlignLeft size={18} color="#4f46e5"/> Bloco de Anotações
                </h4>
                <button 
                  onClick={salvarAnotacoesLivres} 
                  style={{ background: salvandoNota ? '#10b981' : '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', transition: '0.3s' }}
                >
                  <Save size={16} /> {salvandoNota ? 'Salvo!' : 'Salvar Manualmente'}
                </button>
              </div>
              
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', marginTop: 0 }}>
                Escreva livremente informações, histórico ou detalhes sobre o cliente. As alterações serão salvas automaticamente ao fechar esta tela.
              </p>
              
              <textarea
                value={textoAnotacaoLivro}
                onChange={(e) => setTextoAnotacaoLivro(e.target.value)}
                placeholder="Ex: Cliente prefere entregas pela manhã. Última visita feita dia 10..."
                style={{
                  width: '100%',
                  flexGrow: 1,
                  minHeight: isMobile ? '200px' : '300px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  resize: 'none',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}