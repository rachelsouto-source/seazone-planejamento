const AVATAR_COLORS = {
  rachel:   '#0f1e3d',
  caroline: '#b45309',
  vinicius: '#9333ea',
  arthur:   '#0a7d3c',
  julia:    '#7c3aed',
  raquel:   '#2f5597',
}

export default function Header({ displayName, onLogout, isDemo }) {
  const initials = (displayName || '?').slice(0, 2).toUpperCase()
  const color = AVATAR_COLORS[(displayName || '').toLowerCase()] || '#5b6577'

  return (
    <header>
      {/* Logo — esquerda */}
      <div className="header-logo-box">
        <img
          src="/seazone-logo.png"
          alt="Seazone"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'grid' }}
        />
        <div className="header-logo-fb" style={{ display: 'none' }}>SZ</div>
      </div>

      {/* Título — centro */}
      <div className="header-title-center">
        <h1>Planejamento de Projetos</h1>
        <p className="sub">Seazone Investimentos · Time de Arquitetura</p>
      </div>

      {/* User + logout — direita */}
      <div className="header-right-box">
        {isDemo && <span className="badge-demo">Demo</span>}
        <div className="user-chip">
          <div className="user-avatar" style={{ background: color }}>{initials}</div>
          <span className="user-name">{displayName}</span>
        </div>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>
    </header>
  )
}
