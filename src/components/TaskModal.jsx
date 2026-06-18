import { useState, useEffect } from 'react'
import { addDays, differenceInDays, parseISO, isValid, format } from 'date-fns'

const STATUS_OPTIONS = [
  'Não iniciada',
  'Iniciada no prazo',
  'Concluída',
  'Em atraso',
  'Pausada',
]

const MEMBERS = ['Arthur', 'Julia', 'Raquel']

function addBusinessDays(startStr, days) {
  if (!startStr || !days) return ''
  const start = parseISO(startStr)
  if (!isValid(start)) return ''
  const total = Number(days)
  let current = start
  // Start date counts as day 1 if it's a business day
  let count = (start.getDay() !== 0 && start.getDay() !== 6) ? 1 : 0
  if (count >= total) return format(current, 'yyyy-MM-dd')
  while (count < total) {
    current = addDays(current, 1)
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return format(current, 'yyyy-MM-dd')
}

function calcDuration(dataInicial, dataFinal) {
  if (!dataInicial || !dataFinal) return ''
  const s = parseISO(dataInicial)
  const e = parseISO(dataFinal)
  if (!isValid(s) || !isValid(e) || e < s) return ''
  // Inclusive: start date counts as day 1
  let count = 0
  let cur = s
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur = addDays(cur, 1)
  }
  return String(count)
}

const PRIORITY_OPTIONS = ['', 'Urgente', 'Alta', 'Média', 'Baixa']

const EMPTY = {
  membro: '',
  empreendimento: '',
  tarefa: '',
  prioridade: '',
  status: 'Não iniciada',
  dataInicial: '',
  vencimento: '',
  dataFinal: '',
  duracao: '',
  observacao: '',
}

export default function TaskModal({ task, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      // On edit, recalculate duration from existing dates if not stored
      const dur = task.duracao?.replace('d','') || calcDuration(task.dataInicial, task.dataFinal)
      setForm({ ...EMPTY, ...task, duracao: dur })
    } else {
      setForm(EMPTY)
    }
  }, [task])

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }

      // Data Inicial changed → recalculate Data Final + Vencimento if duration exists
      if (field === 'dataInicial' && next.duracao) {
        const calc = addBusinessDays(value, next.duracao)
        next.dataFinal = calc
        next.vencimento = calc
      }
      // Duração changed → recalculate Data Final + Vencimento if Data Inicial exists
      if (field === 'duracao' && next.dataInicial) {
        const calc = addBusinessDays(next.dataInicial, value)
        next.dataFinal = calc
        next.vencimento = calc
      }
      // Data Final changed manually → recalculate duration + sync Vencimento
      if (field === 'dataFinal') {
        next.duracao = calcDuration(next.dataInicial, value)
        next.vencimento = value
      }
      // Vencimento changed manually → recalculate duration + sync Data Final
      if (field === 'vencimento') {
        next.duracao = calcDuration(next.dataInicial, value)
        next.dataFinal = value
      }

      return next
    })
  }

  async function handleSave() {
    if (!form.membro || !form.tarefa) return
    setSaving(true)
    const durLabel = form.duracao ? `${form.duracao}d` : ''
    await onSave({ ...form, duracao: durLabel })
    setSaving(false)
  }

  const dataFinalFormatted = form.dataFinal
    ? parseISO(form.dataFinal).toLocaleDateString('pt-BR')
    : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Membro *</label>
              <select value={form.membro} onChange={e => set('membro', e.target.value)}>
                <option value="">Selecione...</option>
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Empreendimento / Contexto</label>
              <input
                type="text"
                placeholder="Ex: Marista 144, Revisão Material, Geral..."
                value={form.empreendimento}
                onChange={e => set('empreendimento', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tarefa *</label>
            <input
              type="text"
              placeholder="Descreva a tarefa..."
              value={form.tarefa}
              onChange={e => set('tarefa', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prioridade</label>
              <div className="priority-picker">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-btn priority-${(p || 'none').toLowerCase()}${form.prioridade === p ? ' active' : ''}`}
                    onClick={() => set('prioridade', p)}
                  >
                    {p || '—'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Data Inicial</label>
              <input
                type="date"
                value={form.dataInicial}
                onChange={e => set('dataInicial', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Data Final de Entrega</label>
              <input
                type="date"
                value={form.dataFinal}
                onChange={e => set('dataFinal', e.target.value)}
              />
              <span style={{
                fontSize: 11, color: 'var(--ok)', fontWeight: 700, marginTop: 4, display: 'block',
                visibility: (form.dataFinal && form.duracao && form.dataInicial) ? 'visible' : 'hidden'
              }}>
                ✓ calculada automaticamente
              </span>
            </div>

            <div className="form-group">
              <label>Duração (dias úteis)</label>
              <input
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={form.duracao}
                onChange={e => set('duracao', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              rows={2}
              placeholder="Notas, dependências, links..."
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={saving || !form.membro || !form.tarefa}
          >
            {saving ? 'Salvando...' : task ? 'Salvar alterações' : 'Adicionar tarefa'}
          </button>
        </div>
      </div>
    </div>
  )
}
