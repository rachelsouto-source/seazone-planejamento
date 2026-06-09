const MEMBERS = [
  { name: 'Rachel',    color: '#0f1e3d', role: 'Coordenadora de Projetos' },
  { name: 'Caroline',  color: '#b45309', role: 'Gerente de Estruturação' },
  { name: 'Vinicius',  color: '#9333ea', role: 'Gerente de Lançamentos' },
  { name: 'Arthur',    color: '#0a7d3c', role: 'Especialista' },
  { name: 'Julia',     color: '#7c3aed', role: 'Especialista' },
  { name: 'Raquel',    color: '#2f5597', role: 'Especialista' },
]

export default function Login({ onLogin }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/seazone-logo.png"
            alt="Seazone"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'grid' }}
          />
          <div className="login-logo-fb" style={{ display: 'none' }}>SZ</div>
        </div>
        <p className="login-subtitle">Investimentos · Time de Projetos</p>
        <h2>Quem é você?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEMBERS.map(m => (
            <button key={m.name} className="demo-member-btn" onClick={() => onLogin(m.name)}>
              <div className="demo-avatar" style={{ background: m.color }}>
                {m.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{m.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
