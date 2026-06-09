import { parseISO, isValid } from 'date-fns'

function calcLeadTime(task) {
  // Prefer stored duracao (business days only, e.g. "2d" or "2")
  if (task.duracao) {
    const n = parseInt(task.duracao, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return null
}

export default function KPIPanel({ tasks }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const total = tasks.length
  const concluidas = tasks.filter(t => t.status === 'Concluída').length
  const atrasadas = tasks.filter(t => {
    if (t.status === 'Concluída') return false
    if (!t.vencimento) return false
    const v = parseISO(t.vencimento)
    return isValid(v) && v < today
  }).length

  const leadTimes = tasks.map(calcLeadTime).filter(v => v !== null)
  const avgLeadTime = leadTimes.length
    ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
    : null

  const emAndamento = tasks.filter(t =>
    t.status === 'Iniciada no prazo' || t.status === 'Iniciada'
  ).length

  return (
    <div className="kpi-bar">
      <div className="kpi-card">
        <div className="kpi-label">Total de Tarefas</div>
        <div className="kpi-value">{total}</div>
        <div className="kpi-sub">todas as pessoas</div>
      </div>

      <div className="kpi-card green">
        <div className="kpi-label">Concluídas</div>
        <div className="kpi-value">{concluidas}</div>
        <div className="kpi-sub">
          {total > 0 ? Math.round((concluidas / total) * 100) : 0}% do total
        </div>
      </div>

      <div className="kpi-card amber">
        <div className="kpi-label">Em Andamento</div>
        <div className="kpi-value">{emAndamento}</div>
        <div className="kpi-sub">iniciadas</div>
      </div>

      <div className="kpi-card red">
        <div className="kpi-label">Em Atraso</div>
        <div className="kpi-value">{atrasadas}</div>
        <div className="kpi-sub">vencimento ultrapassado</div>
      </div>

      <div className="kpi-card navy">
        <div className="kpi-label">Lead Time Médio</div>
        <div className="kpi-value">{avgLeadTime !== null ? `${avgLeadTime}d` : '—'}</div>
        <div className="kpi-sub">dias entre início e entrega</div>
      </div>
    </div>
  )
}
