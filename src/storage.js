import { supabase, isDemo } from './supabase'
export { isDemo }

// ── localStorage helpers ──────────────────────────────
function loadLocal(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

function makeLocalBus(key) {
  const listeners = []
  return {
    subscribe(cb) {
      listeners.push(cb)
      cb(loadLocal(key))
      return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1) }
    },
    notify() { const d = loadLocal(key); listeners.forEach(fn => fn(d)) },
  }
}

const tasksBus  = makeLocalBus('seazone_tasks')
const dailyBus  = makeLocalBus('seazone_dailies')

// ── TASKS ─────────────────────────────────────────────
const tasksCallbacks = []

function notifyTasks() {
  supabase.from('tasks').select('*').order('created_at', { ascending: true })
    .then(({ data }) => tasksCallbacks.forEach(cb => cb(data || [])))
}

export function subscribeTasks(callback) {
  if (isDemo) return tasksBus.subscribe(callback)

  tasksCallbacks.push(callback)
  supabase.from('tasks').select('*').order('created_at', { ascending: true })
    .then(({ data }) => callback(data || []))

  const channel = supabase.channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, notifyTasks)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
    const i = tasksCallbacks.indexOf(callback)
    if (i >= 0) tasksCallbacks.splice(i, 1)
  }
}

export async function addTask(data) {
  if (isDemo) {
    saveLocal('seazone_tasks', [...loadLocal('seazone_tasks'), { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() }])
    tasksBus.notify(); return
  }
  await supabase.from('tasks').insert([data])
  notifyTasks()
}

export async function updateTask(id, data) {
  if (isDemo) {
    saveLocal('seazone_tasks', loadLocal('seazone_tasks').map(t => t.id === id ? { ...t, ...data } : t))
    tasksBus.notify(); return
  }
  await supabase.from('tasks').update(data).eq('id', id)
  notifyTasks()
}

export async function removeTask(id) {
  if (isDemo) {
    saveLocal('seazone_tasks', loadLocal('seazone_tasks').filter(t => t.id !== id))
    tasksBus.notify(); return
  }
  await supabase.from('tasks').delete().eq('id', id)
  notifyTasks()
}

// ── DAILIES ───────────────────────────────────────────
const dailiesCallbacks = []

function notifyDailies() {
  supabase.from('dailies').select('*').order('data', { ascending: false })
    .then(({ data }) => dailiesCallbacks.forEach(cb => cb(data || [])))
}

export function subscribeDailies(callback) {
  if (isDemo) return dailyBus.subscribe(callback)

  dailiesCallbacks.push(callback)
  supabase.from('dailies').select('*').order('data', { ascending: false })
    .then(({ data }) => callback(data || []))

  const channel = supabase.channel('dailies-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dailies' }, notifyDailies)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
    const i = dailiesCallbacks.indexOf(callback)
    if (i >= 0) dailiesCallbacks.splice(i, 1)
  }
}

export async function addDaily(data) {
  if (isDemo) {
    saveLocal('seazone_dailies', [{ ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...loadLocal('seazone_dailies')])
    dailyBus.notify(); return
  }
  await supabase.from('dailies').insert([data])
  notifyDailies()
}

export async function updateDaily(id, data) {
  if (isDemo) {
    saveLocal('seazone_dailies', loadLocal('seazone_dailies').map(d => d.id === id ? { ...d, ...data } : d))
    dailyBus.notify(); return
  }
  await supabase.from('dailies').update(data).eq('id', id)
  notifyDailies()
}

export async function removeDaily(id) {
  if (isDemo) {
    saveLocal('seazone_dailies', loadLocal('seazone_dailies').filter(d => d.id !== id))
    dailyBus.notify(); return
  }
  await supabase.from('dailies').delete().eq('id', id)
  notifyDailies()
}
