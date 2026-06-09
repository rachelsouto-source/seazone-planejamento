import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { parseISO, isValid, addDays, format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MEMBER_COLORS = {
  Arthur: '#0a7d3c',
  Julia:  '#7c3aed',
  Raquel: '#2f5597',
}

const STATUS_COLORS = {
  'Concluída':        '#0a7d3c',
  'Iniciada no prazo':'#e6a800',
  'Não iniciada':     '#2f5597',
  'Em atraso':        '#b3261e',
  'Pausada':          '#c45000',
}

const MEMBERS = ['Arthur', 'Julia', 'Raquel']

function leadTime(task) {
  if (task.duracao) {
    const n = parseInt(task.duracao, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return null
}

function isOverdue(task) {
  if (!task.vencimento || task.status === 'Concluída') return false
  const d = parseISO(task.vencimento)
  const today = new Date(); today.setHours(0,0,0,0)
  return isValid(d) && d < today
}

function isUrgent(task) {
  if (!task.vencimento || task.status === 'Concluída') return false
  const d = parseISO(task.vencimento)
  const today = new Date(); today.setHours(0,0,0,0)
  if (!isValid(d)) return false
  const diff = differenceInDays(d, today)
  return diff >= 0 && diff <= 3
}

function fmtDate(str) {
  if (!str) return '—'
  const d = parseISO(str)
  return isValid(d) ? format(d, 'dd/MM/yy', { locale: ptBR }) : '—'
}

// Custom label for pie
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function DashboardTab({ tasks }) {
  const stats = useMemo(() => {
    const total = tasks.length
    const concluidas = tasks.filter(t => t.status === 'Concluída').length
    const atrasadas = tasks.filter(isOverdue).length
    const urgentes = tasks.filter(isUrgent).length

    // Status distribution
    const statusMap = {}
    tasks.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1 })
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

    // Per member
    const memberData = MEMBERS.map(m => {
      const mt = tasks.filter(t => t.membro === m)
      const lts = mt.map(leadTime).filter(v => v !== null)
      return {
        name: m,
        total: mt.length,
        concluidas: mt.filter(t => t.status === 'Concluída').length,
        atrasadas: mt.filter(isOverdue).length,
        leadTimeMedia: lts.length ? Math.round(lts.reduce((a,b) => a+b, 0) / lts.length) : 0,
        color: MEMBER_COLORS[m],
      }
    })

    // Empreendimentos
    const empMap = {}
    tasks.forEach(t => {
      const key = t.empreendimento || '(sem empreendimento)'
      empMap[key] = (empMap[key] || 0) + 1
    })
    const empData = Object.entries(empMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 8)

    // Overdue + urgent tasks
    const alertTasks = tasks
      .filter(t => isOverdue(t) || isUrgent(t))
      .sort((a,b) => {
        const da = parseISO(a.vencimento), db = parseISO(b.vencimento)
        return da - db
      })

    return { total, concluidas, atrasadas, urgentes, statusData, memberData, empData, alertTasks }
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="empty-state-icon">📊</div>
        <p>Nenhuma tarefa cadastrada ainda.<br />Adicione tarefas na aba <strong>Planejamento</strong> para ver o dashboard.</p>
      </div>
    )
  }

  const pct = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Progresso geral */}
      <div className="dash-section-title">Visão Geral</div>
      <div className="dash-overview-grid">
        <div className="dash-big-card">
          <div className="dash-big-label">Progresso Geral</div>
          <div className="dash-progress-ring-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e1e6f0" strokeWidth="10"/>
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={pct === 100 ? '#0a7d3c' : '#2f5597'}
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset .5s' }}
              />
              <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f1e3d">{pct}%</text>
            </svg>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            {stats.concluidas} de {stats.total} tarefas concluídas
          </div>
        </div>

        {stats.alertTasks.length > 0 && (
          <div className="dash-big-card" style={{ borderLeftColor: stats.atrasadas > 0 ? 'var(--err)' : '#e6a800' }}>
            <div className="dash-big-label">⚠️ Atenção</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {stats.alertTasks.slice(0, 5).map(t => (
                <div key={t.id} className={`alert-task-row${isOverdue(t) ? ' overdue' : ' urgent'}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      background: isOverdue(t) ? 'var(--err-bg)' : 'var(--warn-bg)',
                      color: isOverdue(t) ? 'var(--err)' : 'var(--warn)',
                    }}>
                      {isOverdue(t) ? 'ATRASADA' : 'HOJE/AMANHÃ'}
                    </span>
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.tarefa}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                      background: MEMBER_COLORS[t.membro] || '#5b6577', color: '#fff',
                    }}>{t.membro}</span>
                    <span style={{ fontSize: 11, color: isOverdue(t) ? 'var(--err)' : 'var(--warn)', fontWeight: 600 }}>
                      {fmtDate(t.vencimento)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="dash-charts-grid">

        {/* Status pie */}
        <div className="dash-card">
          <div className="dash-card-title">Tarefas por Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.statusData}
                cx="50%" cy="50%"
                outerRadius={85}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
              >
                {stats.statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tarefas por membro */}
        <div className="dash-card">
          <div className="dash-card-title">Tarefas por Pessoa</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.memberData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e6f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name="Total" radius={[4,4,0,0]}>
                {stats.memberData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
              <Bar dataKey="concluidas" name="Concluídas" fill="#0a7d3c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead time por membro */}
        <div className="dash-card">
          <div className="dash-card-title">Lead Time Médio por Pessoa (dias)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.memberData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e6f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${v}d`, 'Lead Time Médio']} />
              <Bar dataKey="leadTimeMedia" name="Lead Time (dias)" radius={[4,4,0,0]}>
                {stats.memberData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Progress por membro */}
      <div className="dash-section-title">Progresso por Pessoa</div>
      <div className="dash-member-grid">
        {stats.memberData.map(m => {
          const pctM = m.total > 0 ? Math.round((m.concluidas / m.total) * 100) : 0
          return (
            <div key={m.name} className="dash-member-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: m.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 14,
                }}>{m.name.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.total} tarefa{m.total !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: m.color }}>{pctM}%</div>
              </div>
              <div className="dash-progress-bar-bg">
                <div className="dash-progress-bar-fill" style={{ width: `${pctM}%`, background: m.color }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>✅ {m.concluidas} concluídas</span>
                {m.atrasadas > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--err)', fontWeight: 700 }}>⚠ {m.atrasadas} atrasada{m.atrasadas !== 1 ? 's' : ''}</span>
                )}
                {m.leadTimeMedia > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--blue)' }}>⏱ {m.leadTimeMedia}d médio</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empreendimentos */}
      {stats.empData.length > 1 && (
        <>
          <div className="dash-section-title">Tarefas por Empreendimento</div>
          <div className="dash-card" style={{ maxWidth: '100%' }}>
            <ResponsiveContainer width="100%" height={Math.max(200, stats.empData.length * 38)}>
              <BarChart data={stats.empData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e6f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v, 'Tarefas']} />
                <Bar dataKey="value" name="Tarefas" fill="#2f5597" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

    </div>
  )
}
