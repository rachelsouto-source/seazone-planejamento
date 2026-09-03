import { useState, useEffect } from 'react'
import { parseISO, isValid, format, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabase'

const MEMBERS = ['Rachel', 'Arthur', 'Julia', 'Raquel']

const COLORS = {
  Rachel: '#e11d48',
  Arthur: '#0a7d3c',
  Julia:  '#7c3aed',
  Raquel: '#2f5597',
}

const SQL_CREATE = `create table if not exists ferias (
  id uuid primary key default gen_random_uuid(),
  membro text not null,
  inicio date not null,
  fim date not null,
  observacao text,
  created_at timestamptz default now()
);
alter table ferias enable row level security;
create policy "public_ferias" on ferias
  for all using (true) with check (true);`

function buildYear(year) {
  const start = new Date(year, 0, 1)
  const end   = new Date(year, 11, 31)
  const total = differenceInCalendarDays(end, start) + 1
  const months = Array.from({ length: 12 }, (_, i) => {
    const d    = new Date(year, i, 1)
    const dEnd = new Date(year, i + 1, 0)
    return {
      label: format(d, 'MMM', { locale: ptBR }),
      left:  differenceInCalendarDays(d, start) / total * 100,
      width: (differenceInCalendarDays(dEnd, d) + 1) / total * 100,
    }
  })
  return { start, end, total, months }
}

function toPct(dateStr, start, total) {
  const d = parseISO(dateStr)
  if (!isValid(d)) return 0
  return Math.max(0, Math.min(100, differenceInCalendarDays(d, start) / total * 100))
}

function toWidth(s, e, total) {
  const sd = parseISO(s), ed = parseISO(e)
  if (!isValid(sd) || !isValid(ed)) return 0
  return Math.max(0.4, (differenceInCalendarDays(ed, sd) + 1) / total * 100)
}

function findOverlaps(ferias) {
  const result = []
  for (let i = 0; i < ferias.length; i++) {
    for (let j = i + 1; j < ferias.length; j++) {
      const a = ferias[i], b = ferias[j]
      if (a.membro === b.membro) continue
      if (!a.inicio || !b.inicio) continue
      const aS = parseISO(a.inicio), aE = parseISO(a.fim)
      const bS = parseISO(b.inicio), bE = parseISO(b.fim)
      if (!isValid(aS) || !isValid(aE) || !isValid(bS) || !isValid(bE)) continue
      const oS = aS > bS ? aS : bS
      const oE = aE < bE ? aE : bE
      if (oS <= oE) result.push({ members: [a.membro, b.membro], oS, oE })
    }
  }
  return result
}

const EMPTY_FORM = { membro: 'Rachel', inicio: '', fim: '', observacao: '' }

export default function FeriasTab() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [ferias, setFerias] = useState([])
  const [loading, setLoading] = useState(true)
  const [sqlError, setSqlError] = useState(false)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const { start, total, months } = buildYear(year)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayPct = differenceInCalendarDays(today, start) / total * 100

  async function load() {
    setLoading(true)
    setSqlError(false)
    const { data, error } = await supabase
      .from('ferias').select('*').order('inicio', { ascending: true })
    if (error) { setSqlError(true); setLoading(false); return }
    setFerias(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const yearFerias = ferias.filter(f => {
    if (!f.inicio) return false
    return parseISO(f.inicio).getFullYear() === year ||
           parseISO(f.fim).getFullYear() === year
  })

  const overlaps = findOverlaps(yearFerias)

  function openAdd()   { setSaveError(null); setForm(EMPTY_FORM); setModal('add') }
  function openEdit(f) { setSaveError(null); setForm({ membro: f.membro, inicio: f.inicio, fim: f.fim, observacao: f.observacao || '' }); setModal(f) }
  function closeModal()   { setSaveError(null); setModal(null) }
  function closeConfirm() { setSaveError(null); setConfirmDel(null) }

  async function handleSave() {
    if (!form.inicio || !form.fim) return
    setSaving(true)
    setSaveError(null)
    const { error } = modal === 'add'
      ? await supabase.from('ferias').insert([form])
      : await supabase.from('ferias').update(form).eq('id', modal.id)
    setSaving(false)
    if (error) {
      setSaveError(error.message || 'Não foi possível salvar. Tente novamente.')
      return
    }
    // o período salvo pode cair em outro ano — leva a visão para lá, senão o
    // registro some do calendário e parece que nada foi salvo
    const savedStart = parseISO(form.inicio)
    if (isValid(savedStart) && savedStart.getFullYear() !== year) setYear(savedStart.getFullYear())
    setModal(null)
    load()
  }

  async function handleDelete(id) {
    setSaveError(null)
    const { error } = await supabase.from('ferias').delete().eq('id', id)
    if (error) {
      setSaveError(error.message || 'Não foi possível excluir. Tente novamente.')
      return
    }
    setConfirmDel(null)
    load()
  }

  function fFmt(str)  { return isValid(parseISO(str)) ? format(parseISO(str), 'dd/MM')      : '?' }
  function fFull(str) { return isValid(parseISO(str)) ? format(parseISO(str), 'dd/MM/yyyy') : '?' }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>

  if (sqlError) return (
    <div className="ferias-sql-card">
      <p style={{ fontWeight: 700, color: 'var(--err)', marginBottom: 10 }}>
        ⚠️ Tabela "ferias" não encontrada no Supabase.
      </p>
      <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--muted)' }}>
        Abra o Supabase → SQL Editor → cole o código abaixo e clique em Run:
      </p>
      <pre className="ferias-sql-pre">{SQL_CREATE}</pre>
      <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={load}>
        Já executei — tentar novamente
      </button>
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>Férias do Time</h3>
          <div className="ferias-year-nav">
            <button onClick={() => setYear(y => y - 1)}>‹</button>
            <span>{year}</span>
            <button onClick={() => setYear(y => y + 1)}>›</button>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={openAdd}>+ Adicionar Férias</button>
      </div>

      {/* Overlap alert */}
      {overlaps.length > 0 && (
        <div className="ferias-alert">
          <span>⚠️</span>
          <span>
            <strong>{overlaps.length} sobreposição{overlaps.length > 1 ? 'ões' : ''} detectada{overlaps.length > 1 ? 's' : ''}:</strong>
            {' '}
            {overlaps.map((o, i) => (
              <span key={i} className="ferias-overlap-chip">
                {o.members.join(' & ')} · {fFmt(o.oS.toISOString())}–{fFmt(o.oE.toISOString())}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Gantt */}
      <div className="g-wrap" style={{ marginBottom: 20 }}>
        <div className="g-row g-header-row">
          <div className="g-name g-name-header">Membro</div>
          <div className="g-bar-area g-header-area">
            {months.map((m, i) => (
              <div key={i} className="g-month" style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                {m.label}
              </div>
            ))}
            {todayPct >= 0 && todayPct <= 100 && <div className="g-today" style={{ left: `${todayPct}%` }} />}
          </div>
        </div>

        {MEMBERS.map(member => {
          const mf = yearFerias.filter(f => f.membro === member)
          return (
            <div key={member} className="g-row g-task-row">
              <div className="g-name" style={{ borderLeft: `4px solid ${COLORS[member] || '#aaa'}` }}>
                <span className="g-task-name" style={{ color: COLORS[member] || 'var(--ink)' }}>{member}</span>
                <span className="g-task-emp">
                  {mf.length === 0 ? 'sem férias' : `${mf.length} período${mf.length > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="g-bar-area ferias-lane">
                {overlaps.map((o, i) => (
                  <div key={i} className="ferias-overlap-zone"
                    style={{
                      left:  `${toPct(o.oS.toISOString().slice(0,10), start, total)}%`,
                      width: `${toWidth(o.oS.toISOString().slice(0,10), o.oE.toISOString().slice(0,10), total)}%`,
                    }}
                  />
                ))}
                {todayPct >= 0 && todayPct <= 100 && <div className="g-today" style={{ left: `${todayPct}%` }} />}
                {mf.map(fv => (
                  <div
                    key={fv.id}
                    className="ferias-bar"
                    style={{
                      left:       `${toPct(fv.inicio, start, total)}%`,
                      width:      `${toWidth(fv.inicio, fv.fim, total)}%`,
                      background: COLORS[member] || '#666',
                    }}
                    title={`${member}: ${fFull(fv.inicio)} → ${fFull(fv.fim)}${fv.observacao ? '\n' + fv.observacao : ''}\nClique para editar`}
                    onClick={() => openEdit(fv)}
                  >
                    <span className="ferias-bar-text">{fFmt(fv.inicio)}–{fFmt(fv.fim)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* List */}
      {yearFerias.length > 0 ? (
        <div className="table-wrapper">
          <table style={{ tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Dias corridos</th>
                <th>Observação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {yearFerias.map(fv => {
                const dias = isValid(parseISO(fv.inicio)) && isValid(parseISO(fv.fim))
                  ? differenceInCalendarDays(parseISO(fv.fim), parseISO(fv.inicio)) + 1
                  : '—'
                const hasOverlap = overlaps.some(o =>
                  o.members.includes(fv.membro) &&
                  parseISO(fv.inicio) <= o.oE && parseISO(fv.fim) >= o.oS
                )
                return (
                  <tr key={fv.id} style={hasOverlap ? { background: '#fff5f5' } : {}}>
                    <td>
                      <span className="ferias-dot" style={{ background: COLORS[fv.membro] || '#aaa' }} />
                      <strong>{fv.membro}</strong>
                    </td>
                    <td>{fFull(fv.inicio)}</td>
                    <td>{fFull(fv.fim)}</td>
                    <td><span className="duration-chip">{dias}d</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fv.observacao || '—'}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="icon-btn icon-btn-edit" onClick={() => openEdit(fv)}>✏️</button>
                        <button className="icon-btn icon-btn-delete" onClick={() => setConfirmDel(fv)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🏖️</div>
          <p>Nenhuma férias cadastrada para {year}.</p>
          <button className="btn btn-secondary" onClick={openAdd} style={{ marginTop: 10 }}>+ Adicionar</button>
        </div>
      )}

      {/* Modal add/edit */}
      {modal !== null && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{modal === 'add' ? '🏖️ Adicionar Férias' : '✏️ Editar Férias'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Membro</label>
                <select className="form-input" value={form.membro}
                  onChange={e => setForm(p => ({ ...p, membro: e.target.value }))}>
                  {MEMBERS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div>
                  <label className="form-label">Data de início</label>
                  <input type="date" className="form-input" value={form.inicio}
                    onChange={e => setForm(p => ({ ...p, inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Último dia de férias</label>
                  <input type="date" className="form-input" value={form.fim}
                    onChange={e => setForm(p => ({ ...p, fim: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Observação (opcional)</label>
                <input className="form-input" placeholder="ex: recesso fim de ano"
                  value={form.observacao}
                  onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
              </div>
              {saveError && (
                <div className="ferias-alert" style={{ margin: 0 }}>
                  <span>⚠️</span><span>{saveError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-secondary"
                disabled={!form.inicio || !form.fim || saving}
                onClick={handleSave}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Confirmar exclusão</h3>
              <button className="modal-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="modal-body">
              <p>Excluir férias de <strong>{confirmDel.membro}</strong> ({fFull(confirmDel.inicio)} a {fFull(confirmDel.fim)})?</p>
              {saveError && (
                <div className="ferias-alert" style={{ marginTop: 12 }}>
                  <span>⚠️</span><span>{saveError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeConfirm}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDel.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
