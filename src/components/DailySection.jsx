import { useState, useEffect } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { subscribeDailies, addDaily, updateDaily, removeDaily } from '../storage'
import DailyModal from './DailyModal'

function fmtDate(str) {
  if (!str) return '—'
  const d = parseISO(str)
  return isValid(d) ? format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : str
}

function Bullet({ text }) {
  if (!text?.trim()) return null
  return (
    <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
      {text.split('\n').filter(l => l.trim()).map((line, i) => (
        <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
          {line.replace(/^[•\-]\s*/, '')}
        </li>
      ))}
    </ul>
  )
}

function DailyCard({ daily, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="daily-card">
      <div className="daily-card-header" onClick={() => setExpanded(v => !v)}>
        <div className="daily-date-badge">
          <span className="daily-date-icon">📅</span>
          <span className="daily-date-text">{fmtDate(daily.data)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            className="icon-btn icon-btn-edit"
            title="Editar"
            onClick={e => { e.stopPropagation(); onEdit(daily) }}
          >✏️</button>
          <button
            className="icon-btn icon-btn-delete"
            title="Excluir"
            onClick={e => { e.stopPropagation(); onDelete(daily) }}
          >🗑</button>
          <span style={{ color: 'var(--muted)', fontSize: 18, userSelect: 'none' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Resumo sempre visível */}
      {daily.resumo && (
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, margin: '10px 0 0', padding: '0 2px' }}>
          {daily.resumo}
        </p>
      )}

      {/* Detalhes expansíveis */}
      {expanded && (
        <div className="daily-details">
          {daily.topicos?.trim() && (
            <div className="daily-section">
              <div className="daily-section-title">📌 Tópicos Discutidos</div>
              <Bullet text={daily.topicos} />
            </div>
          )}
          {daily.decisoes?.trim() && (
            <div className="daily-section">
              <div className="daily-section-title">✅ Decisões</div>
              <Bullet text={daily.decisoes} />
            </div>
          )}
          {daily.acoes?.trim() && (
            <div className="daily-section">
              <div className="daily-section-title">🚀 Ações</div>
              <Bullet text={daily.acoes} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DailySection({ slackChannelId }) {
  const [dailies, setDailies] = useState([])
  const [modalDaily, setModalDaily] = useState(undefined)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    return subscribeDailies(setDailies)
  }, [])

  async function handleSave(data) {
    if (data.id) {
      const { id, ...rest } = data
      await updateDaily(id, rest)
    } else {
      await addDaily(data)
    }
    setModalDaily(undefined)
  }

  function onSyncSlack() {
    // Placeholder: quando o canal do Slack for configurado, buscará automaticamente
    alert('Para ativar a sincronização automática, informe o canal do Slack onde o SeaNotes posta. Por enquanto, use "Colar texto" no modal.')
  }

  async function handleDelete(id) {
    await removeDaily(id)
    setConfirmDelete(null)
  }

  return (
    <section style={{ marginBottom: 32 }}>
      {/* Cabeçalho da seção */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="daily-section-icon">📋</div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
              Resumos Dailys
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Alinhamentos, decisões e ações de cada reunião
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onSyncSlack} title="Buscar última daily do SeaNotes no Slack">
            ⚡ Sincronizar SeaNotes
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalDaily(null)}>
            + Nova Daily
          </button>
        </div>
      </div>

      {dailies.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>Nenhum resumo registrado ainda.<br />Clique em "+ Nova Daily" após cada reunião.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dailies.map(d => (
            <DailyCard
              key={d.id}
              daily={d}
              onEdit={setModalDaily}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
      )}

      {modalDaily !== undefined && (
        <DailyModal
          daily={modalDaily}
          onSave={handleSave}
          onClose={() => setModalDaily(undefined)}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Excluir resumo</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Deseja excluir o resumo de <strong>{fmtDate(confirmDelete.data)}</strong>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
