import { parseISO, isValid, format, addDays, differenceInCalendarDays, startOfMonth, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MEMBER_COLORS = {
  Arthur: '#0a7d3c',
  Julia:  '#7c3aed',
  Raquel: '#2f5597',
}

const STATUS_BAR = {
  'Concluída':         '#22c55e',
  'Iniciada no prazo': '#f59e0b',
  'Iniciada':          '#f59e0b',
  'Em atraso':         '#ef4444',
  'Não iniciada':      '#94a3b8',
  'Pausada':           '#d1d5db',
}

function fmt(str) {
  if (!str) return '—'
  const d = parseISO(str)
  return isValid(d) ? format(d, 'dd/MM', { locale: ptBR }) : '—'
}

const MEMBERS = ['Arthur', 'Julia', 'Raquel']

export default function GanttTab({ tasks }) {
  const gt = tasks.filter(t =>
    t.dataInicial && t.dataFinal &&
    isValid(parseISO(t.dataInicial)) && isValid(parseISO(t.dataFinal))
  )

  if (gt.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-state-icon">📅</div>
        <p>Nenhuma tarefa com datas de início e entrega definidas.</p>
      </div>
    )
  }

  const allDates = gt.flatMap(t => [parseISO(t.dataInicial), parseISO(t.dataFinal)])
  const minDate  = addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -3)
  const maxDate  = addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 3)
  const total    = differenceInCalendarDays(maxDate, minDate) + 1

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayPct = differenceInCalendarDays(today, minDate) / total * 100

  function left(dateStr) {
    const d = parseISO(dateStr)
    return isValid(d) ? Math.max(0, differenceInCalendarDays(d, minDate)) / total * 100 : 0
  }
  function width(s, e) {
    const sd = parseISO(s), ed = parseISO(e)
    if (!isValid(sd) || !isValid(ed)) return 1
    return Math.max(0.8, (differenceInCalendarDays(ed, sd) + 1) / total * 100)
  }

  const months = []
  let cur = startOfMonth(minDate)
  while (cur <= maxDate) {
    const start   = cur < minDate ? minDate : cur
    const rawEnd  = addDays(addMonths(startOfMonth(cur), 1), -1)
    const end     = rawEnd > maxDate ? maxDate : rawEnd
    months.push({
      label: format(cur, 'MMM/yy', { locale: ptBR }),
      left:  differenceInCalendarDays(start, minDate) / total * 100,
      width: (differenceInCalendarDays(end, start) + 1) / total * 100,
    })
    cur = addMonths(cur, 1)
  }

  const TodayLine = () => (
    todayPct >= 0 && todayPct <= 100
      ? <div className="g-today" style={{ left: `${todayPct}%` }} />
      : null
  )

  return (
    <div className="g-wrap">
      {/* Legenda */}
      <div className="g-legend">
        {Object.entries(STATUS_BAR).map(([label, color]) => (
          <span key={label} className="g-legend-item">
            <span className="g-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="g-legend-item">
          <span className="g-legend-dot" style={{ background: '#ef4444', width: 2, height: 14, borderRadius: 1 }} />
          Hoje
        </span>
      </div>

      {/* Cabeçalho meses */}
      <div className="g-row g-header-row">
        <div className="g-name g-name-header">Tarefa</div>
        <div className="g-bar-area g-header-area">
          {months.map((m, i) => (
            <div key={i} className="g-month" style={{ left: `${m.left}%`, width: `${m.width}%` }}>
              {m.label}
            </div>
          ))}
          <TodayLine />
        </div>
      </div>

      {MEMBERS.map(member => {
        const mt = gt.filter(t => t.membro === member)
        if (mt.length === 0) return null
        return (
          <div key={member}>
            <div className="g-row g-member-row">
              <div className="g-name" style={{ background: MEMBER_COLORS[member], color: '#fff', fontWeight: 700 }}>
                {member}
              </div>
              <div className="g-bar-area" style={{ background: MEMBER_COLORS[member] + '14' }}>
                <TodayLine />
              </div>
            </div>
            {mt.map(task => (
              <div key={task.id} className="g-row g-task-row">
                <div className="g-name">
                  <span className="g-task-name">{task.tarefa}</span>
                  {task.empreendimento && <span className="g-task-emp">{task.empreendimento}</span>}
                </div>
                <div className="g-bar-area">
                  <TodayLine />
                  <div
                    className="g-bar"
                    style={{
                      left:       `${left(task.dataInicial)}%`,
                      width:      `${width(task.dataInicial, task.dataFinal)}%`,
                      background: STATUS_BAR[task.status] || '#94a3b8',
                      borderLeft: `3px solid ${MEMBER_COLORS[task.membro] || '#666'}`,
                    }}
                    title={`${task.tarefa}${task.empreendimento ? ' · ' + task.empreendimento : ''}\n${fmt(task.dataInicial)} → ${fmt(task.dataFinal)}\n${task.status}`}
                  >
                    <span className="g-bar-text">{task.tarefa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
