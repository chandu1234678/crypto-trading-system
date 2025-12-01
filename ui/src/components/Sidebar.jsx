export default function Sidebar({ active, onChange, backendStatus }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "trading", label: "Trading" },
    { id: "assistant", label: "AI Assistant" }
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        CTP<span>·BOT</span>
      </div>
      <nav className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="status-pill">{backendStatus}</div>
    </aside>
  );
}
