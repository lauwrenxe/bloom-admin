import { G } from "../../styles/theme";
import { BloomLogo } from "../ui";
import { NAV_ITEMS } from "../../data/seed";

export default function Sidebar({ active, setActive, onLogout }) {
  return (
    <aside style={{
      width: "240px", flexShrink: 0,
      background: `linear-gradient(180deg,${G.dark} 0%,${G.mid} 100%)`,
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 24px 20px" }}>
        <BloomLogo light />
        <div style={{ marginTop: "8px", fontSize: "10px", color: "rgba(255,255,255,.4)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          Admin Portal
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,.1)", margin: "0 20px" }} />

      {/* Nav links */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "11px 14px", borderRadius: "10px",
              border: "none", cursor: "pointer", textAlign: "left",
              fontFamily: "'DM Sans',sans-serif", fontSize: "13.5px", fontWeight: 500,
              marginBottom: "4px", transition: "all .18s",
              background:  active === item.id ? "rgba(255,255,255,.15)" : "transparent",
              color:       active === item.id ? "#fff"                  : "rgba(255,255,255,.6)",
              borderLeft:  active === item.id ? `3px solid ${G.pale}`   : "3px solid transparent",
            }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User card + sign out */}
      <div style={{ padding: "16px 20px 28px" }}>
        <div style={{ background: "rgba(255,255,255,.08)", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,.9)" }}>GADRC Admin</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,.45)", marginTop: "2px" }}>admin@bloom.edu</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "9px", borderRadius: "10px",
            border: "1px solid rgba(255,255,255,.15)", background: "transparent",
            color: "rgba(255,255,255,.55)", fontSize: "12.5px", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all .18s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,.55)"; }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
