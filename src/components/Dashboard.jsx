import { useState, useEffect } from 'react'
import { format, parseISO, isValid, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase, isDemo as isDemoClient } from '../supabase'
import { subscribeTasks, addTask, updateTask, removeTask } from '../storage'
import Header from './Header'
import KPIPanel from './KPIPanel'
import TaskModal from './TaskModal'
import DailySection from './DailySection'
import DashboardTab from './DashboardTab'
import GanttTab from './GanttTab'

const MEMBERS = ['Arthur', 'Julia', 'Raquel']

const MEMBER_COLORS = {
  Arthur: '#0a7d3c',
  Julia: '#7c3aed',
  Raquel: '#2f5597',
}

const STATUS_CLASS = {
  'Iniciada no prazo': 'status-iniciada',
  'Iniciada': 'status-iniciada',
  'Não iniciada': 'status-nao-iniciada',
  'Concluída': 'status-concluida',
  'Em atraso': 'status-atrasada',
  'Pausada': 'status-pausada',
}

// Ordem de exibição: iniciadas primeiro, depois não iniciadas
const STATUS_SORT = {
  'Iniciada no prazo': 0,
  'Iniciada':          0,
  'Em atraso':         1,
  'Pausada':           2,
  'Não iniciada':      3,
  'Concluída':         4,
}

function fmtDate(str) {
  if (!str) return '—'
  const d = parseISO(str)
  return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—'
}

function isOverdue(str, status) {
  if (!str || status === 'Concluída') return false
  const d = parseISO(str)
  const today = new Date(); today.setHours(0,0,0,0)
  return isValid(d) && d < today
}

function countBusinessDays(startStr, endStr) {
  if (!startStr || !endStr) return null
  const s = parseISO(startStr)
  const e = parseISO(endStr)
  if (!isValid(s) || !isValid(e) || e < s) return null
  let count = 0, cur = s
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur = addDays(cur, 1)
  }
  return count
}

export default function Dashboard({ user, displayName, isDemo, onDemoLogout }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('planejamento')
  const [planView, setPlanView] = useState('ativas')   // 'ativas' | 'concluidas'
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [modalTask, setModalTask] = useState(undefined)
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function refreshTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    refreshTasks()
    if (!isDemo && supabase) {
      const channel = supabase.channel('tasks-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refreshTasks)
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [])

  async function handleSave(data) {
    if (data.id) {
      const { id, ...rest } = data
      await updateTask(id, rest)
    } else {
      await addTask(data)
    }
    setModalTask(undefined)
    await refreshTasks()
  }

  async function handleDelete(id) {
    await removeTask(id)
    setConfirmDelete(null)
    await refreshTasks()
  }

  function handleLogout() {
    if (isDemo) onDemoLogout()
    else supabase.auth.signOut()
  }

  const filtered = tasks.filter(t => {
    if (filter !== 'Todos' && t.membro !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.tarefa?.toLowerCase().includes(q) ||
        t.empreendimento?.toLowerCase().includes(q) ||
        t.membro?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const groups = (filter === 'Todos' ? MEMBERS : [filter]).map(m => ({
    member: m,
    tasks: filtered
      .filter(t => t.membro === m && (planView === 'concluidas' ? t.status === 'Concluída' : t.status !== 'Concluída'))
      .sort((a, b) => (STATUS_SORT[a.status] ?? 3) - (STATUS_SORT[b.status] ?? 3)),
  }))

  const totalConcluidas = tasks.filter(t => t.status === 'Concluída').length

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Carregando tarefas...</span>
      </div>
    )
  }

  return (
    <>
      <Header displayName={displayName} onLogout={handleLogout} isDemo={isDemo} />

      <div className="page-tabs-bar">
        <div className="page-tabs">
          <button
            className={`page-tab${tab === 'planejamento' ? ' active' : ''}`}
            onClick={() => setTab('planejamento')}
          >
            📋 Planejamento
          </button>
          <button
            className={`page-tab${tab === 'gantt' ? ' active' : ''}`}
            onClick={() => setTab('gantt')}
          >
            📅 Gantt
          </button>
          <button
            className={`page-tab${tab === 'dashboard' ? ' active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`page-tab${tab === 'dailys' ? ' active' : ''}`}
            onClick={() => setTab('dailys')}
          >
            📝 Resumos Dailys
          </button>
        </div>
      </div>

      <div className="main-content">
        {isDemo && (
          <div className="demo-banner">
            <span>⚠️</span>
            <span>
              <strong>Modo demonstração</strong> — dados salvos apenas neste navegador.
              Configure o Firebase para compartilhar com o time. Ver <code>SETUP.md</code>.
            </span>
          </div>
        )}

        {tab === 'dailys' && <DailySection />}

        {tab === 'dashboard' && <DashboardTab tasks={tasks} />}

        {tab === 'gantt' && <GanttTab tasks={tasks} />}

        {tab === 'planejamento' && <>
        <KPIPanel tasks={tasks} />

        {/* Sub-abas: Em andamento / Concluídas */}
        <div className="plan-view-bar">
          <button
            className={`plan-view-btn${planView === 'ativas' ? ' active' : ''}`}
            onClick={() => setPlanView('ativas')}
          >
            Em andamento
          </button>
          <button
            className={`plan-view-btn${planView === 'concluidas' ? ' active' : ''}`}
            onClick={() => setPlanView('concluidas')}
          >
            Concluídas
            {totalConcluidas > 0 && (
              <span className="plan-view-badge">{totalConcluidas}</span>
            )}
          </button>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <div className="filter-tabs">
              {['Todos', ...MEMBERS].map(m => (
                <button
                  key={m}
                  className={`filter-tab${filter === m ? ' active' : ''}`}
                  onClick={() => setFilter(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <input
              className="search-input"
              placeholder="Buscar tarefa ou empreendimento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {planView === 'ativas' && (
            <button className="btn btn-secondary" onClick={() => setModalTask(null)}>
              + Nova Tarefa
            </button>
          )}
        </div>

        {groups.every(g => g.tasks.length === 0) && search ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>Nenhuma tarefa encontrada para "{search}".</p>
          </div>
        ) : groups.every(g => g.tasks.length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">{planView === 'concluidas' ? '✅' : '📋'}</div>
            <p>{planView === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Sem tarefas em andamento.'}</p>
          </div>
        ) : (
          groups.map(({ member, tasks: memberTasks }) => (
            <div key={member} className="team-group">
              <div className="team-group-header">
                <div
                  className="team-badge"
                  style={{ background: MEMBER_COLORS[member] }}
                >
                  {member}
                </div>
                <span className="team-count">
                  {memberTasks.length} tarefa{memberTasks.length !== 1 ? 's' : ''}
                </span>
                {memberTasks.length > 0 && planView === 'ativas' && (
                  <span className="team-meta">
                    {memberTasks.filter(t => isOverdue(t.vencimento, t.status)).length > 0 && (
                      <span style={{ color: 'var(--err)' }}>
                        {memberTasks.filter(t => isOverdue(t.vencimento, t.status)).length} em atraso
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="table-wrapper">
                {memberTasks.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem tarefas no momento.</p>
                  </div>
                ) : (
                  <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="col-emp">Empreendimento / Contexto</th>
                        <th className="col-task">Tarefa</th>
                        <th className="col-obs">Observações</th>
                        <th className="col-status">Status</th>
                        <th className="col-date">Data Inicial</th>
                        <th className="col-date">Data Entrega</th>
                        <th className="col-dur">Dias úteis</th>
                        <th className="col-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberTasks.map(task => {
                        const overdue = isOverdue(task.vencimento, task.status)
                        return (
                          <tr key={task.id}>
                            <td className="col-emp">
                              {task.empreendimento
                                ? <span className="empreendimento-tag">{task.empreendimento}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                              }
                            </td>
                            <td className="col-task td-task">
                              <div className="task-name">{task.tarefa}</div>
                            </td>
                            <td className="col-obs">
                              {task.observacao
                                ? <span className="task-obs" style={{ fontSize: 12, color: 'var(--muted)' }}>{task.observacao}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                              }
                            </td>
                            <td className="col-status">
                              <span className={`status-badge ${STATUS_CLASS[task.status] || 'status-nao-iniciada'}`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="col-date"><span className="date-text">{fmtDate(task.dataInicial)}</span></td>
                            <td className="col-date"><span className="date-text">{fmtDate(task.dataFinal)}</span></td>
                            <td className="col-dur">
                              {task.duracao
                                ? <span className="duration-chip">{task.duracao}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                              }
                            </td>
                            <td className="col-actions">
                              <div className="actions-cell">
                                <button
                                  className="icon-btn icon-btn-edit"
                                  title="Editar"
                                  onClick={() => setModalTask(task)}
                                >✏️</button>
                                <button
                                  className="icon-btn icon-btn-delete"
                                  title="Excluir"
                                  onClick={() => setConfirmDelete(task)}
                                >🗑</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        </>}
      </div>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => setModalTask(undefined)}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Confirmar exclusão</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Deseja excluir a tarefa <strong>"{confirmDelete.tarefa}"</strong>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <img
          src="/seazone-logo.png"
          alt="Seazone"
          onError={e => { e.target.style.display = 'none' }}
        />
        <p>Planejamento de Projetos · Seazone Investimentos · {new Date().getFullYear()}</p>
      </footer>
    </>
  )
}
