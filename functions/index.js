const { onRequest } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()

exports.seaNotesWebhook = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const text = req.body.text || ''
  if (!text) return res.status(400).json({ error: 'Nenhum texto enviado' })

  const parsed = parseSeaNotes(text)
  const date = extractDate(text) || new Date().toISOString().split('T')[0]

  const db = getFirestore()

  // Evita duplicata para o mesmo dia
  const existing = await db.collection('dailies').where('data', '==', date).limit(1).get()
  if (!existing.empty) {
    return res.status(200).json({ status: 'duplicate', message: `Daily de ${date} já registrada` })
  }

  const doc = await db.collection('dailies').add({
    data: date,
    resumo:   parsed.resumo,
    topicos:  parsed.topicos,
    decisoes: parsed.decisoes,
    acoes:    parsed.acoes,
    fonte:    'SeaNotes (Slack)',
    createdAt: new Date().toISOString(),
  })

  return res.status(200).json({ status: 'ok', id: doc.id, date })
})

function parseSeaNotes(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const patterns = {
    resumo:   /resumo\s*executivo/i,
    topicos:  /tópicos?\s*discutidos?/i,
    decisoes: /decisões?/i,
    acoes:    /ações?(\s*e\s*próximos?\s*passos?)?/i,
  }
  const skip = /^participantes:|^horário:|seanotes|daily\s*\|\s*projetos/i

  let current = null
  const collected = { resumo: [], topicos: [], decisoes: [], acoes: [] }

  for (const line of lines) {
    if (skip.test(line)) continue
    let matched = false
    for (const [key, re] of Object.entries(patterns)) {
      if (re.test(line)) { current = key; matched = true; break }
    }
    if (!matched && current) collected[current].push(line)
  }

  return Object.fromEntries(
    Object.entries(collected).map(([k, arr]) => [k, arr.join('\n').trim()])
  )
}

function extractDate(text) {
  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const m = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // Formato YYYY-MM-DD
  const m2 = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return m2[0]
  return null
}
