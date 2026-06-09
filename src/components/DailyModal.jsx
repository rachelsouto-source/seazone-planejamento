import { useState, useEffect } from 'react'

const EMPTY = {
  data: new Date().toISOString().slice(0, 10),
  resumo: '',
  topicos: '',
  decisoes: '',
  acoes: '',
}

// Parse SeaNotes Slack message into structured fields
function parseSeaNotes(text) {
  if (!text?.trim()) return null

  const result = { resumo: '', topicos: '', decisoes: '', acoes: '' }

  // Extract date if present (2026-06-09T12:29...)
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) result.data = dateMatch[1]

  // Section markers (emoji or text headers)
  const sections = {
    resumo:   /resumo executivo/i,
    topicos:  /tópicos discutidos|topicos discutidos/i,
    decisoes: /decisões|decisoes/i,
    acoes:    /ações|acoes|próximos passos|proximos passos/i,
  }

  const lines = text.split('\n')
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Detect section header
    let matched = false
    for (const [key, re] of Object.entries(sections)) {
      if (re.test(line)) { current = key; matched = true; break }
    }
    if (matched) continue

    // Skip metadata lines (Participantes, Horário, app name)
    if (/^participantes:|^horário:|seanotes|daily \| projetos/i.test(line)) continue

    if (current && result[current] !== undefined) {
      result[current] += (result[current] ? '\n' : '') + line
    }
  }

  return result
}

export default function DailyModal({ daily, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState(false)

  useEffect(() => {
    setForm(daily ? { ...EMPTY, ...daily } : { ...EMPTY, data: new Date().toISOString().slice(0, 10) })
    setPasteMode(false)
    setPasteText('')
    setParsed(false)
  }, [daily])

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function handleParse() {
    const result = parseSeaNotes(pasteText)
    if (result) {
      setForm(prev => ({
        ...prev,
        ...(result.data ? { data: result.data } : {}),
        resumo: result.resumo || prev.resumo,
        topicos: result.topicos || prev.topicos,
        decisoes: result.decisoes || prev.decisoes,
        acoes: result.acoes || prev.acoes,
      }))
      setParsed(true)
      setPasteMode(false)
    }
  }

  async function handleSave() {
    if (!form.data) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{daily ? 'Editar Daily' : 'Nova Daily'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* Colar do SeaNotes */}
          {!daily && (
            <div style={{
              background: pasteMode ? '#f0f4ff' : '#f6f8fc',
              border: `1.5px ${pasteMode ? 'solid var(--blue)' : 'dashed #c7cee0'}`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            }}>
              {!pasteMode ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                      ⚡ Importar do SeaNotes
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      Cole o resumo do Slack — os campos são preenchidos automaticamente
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPasteMode(true)}>
                    Colar texto
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>
                    Cole o conteúdo do SeaNotes abaixo:
                  </div>
                  <textarea
                    rows={6}
                    autoFocus
                    placeholder="Cole aqui o resumo completo do SeaNotes (Ctrl+V)..."
                    value={pasteText}
                    onChange={e => { setPasteText(e.target.value); setParsed(false) }}
                    style={{
                      width: '100%', padding: 10, border: '1px solid #c7cee0',
                      borderRadius: 8, fontSize: 13, resize: 'vertical',
                      fontFamily: 'monospace', background: '#fff',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleParse}
                      disabled={!pasteText.trim()}
                    >
                      Preencher campos automaticamente
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPasteMode(false)}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
              {parsed && !pasteMode && (
                <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 700, marginTop: 4 }}>
                  ✓ Campos preenchidos automaticamente a partir do SeaNotes
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Data da Daily</label>
            <input
              type="date"
              value={form.data}
              onChange={e => set('data', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>📊 Resumo Executivo</label>
            <textarea
              rows={4}
              placeholder="Resuma os principais pontos alinhados com o time..."
              value={form.resumo}
              onChange={e => set('resumo', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>📌 Tópicos Discutidos</label>
            <textarea
              rows={3}
              placeholder="• Tópico 1&#10;• Tópico 2"
              value={form.topicos}
              onChange={e => set('topicos', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>✅ Decisões</label>
            <textarea
              rows={3}
              placeholder="• Decisão tomada 1&#10;• Decisão tomada 2"
              value={form.decisoes}
              onChange={e => set('decisoes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>🚀 Ações e Próximos Passos</label>
            <textarea
              rows={3}
              placeholder="• Nome: ação atribuída&#10;• Nome: ação atribuída"
              value={form.acoes}
              onChange={e => set('acoes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={saving || !form.data}
          >
            {saving ? 'Salvando...' : daily ? 'Salvar alterações' : 'Registrar daily'}
          </button>
        </div>
      </div>
    </div>
  )
}
