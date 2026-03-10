import { G } from "../styles/theme";

/* ── Tag badge ── */
export const Tag = ({ children, color = G.base, bg = G.wash }) => (
  <span style={{
    display: "inline-block", background: bg, color,
    borderRadius: "20px", padding: "3px 12px",
    fontSize: "11px", fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase",
  }}>
    {children}
  </span>
);

/* ── Button ── */
export const Btn = ({ children, onClick, variant = "primary", small, style = {} }) => {
  const base = {
    border: "none", borderRadius: "22px",
    fontFamily: "'DM Sans',sans-serif",
    fontWeight: 600, cursor: "pointer",
    transition: "all .18s", letterSpacing: ".3px",
    padding: small ? "7px 16px" : "11px 24px",
    fontSize: small ? "12px" : "13.5px",
    ...style,
  };
  const variants = {
    primary: { background: G.base,     color: "#fff" },
    danger:  { background: "#c0392b",  color: "#fff" },
    ghost:   { background: G.wash,     color: G.base },
    dark:    { background: G.dark,     color: "#fff" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.opacity = ".85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1";   e.currentTarget.style.transform = ""; }}
    >
      {children}
    </button>
  );
};

/* ── Text Input ── */
export const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    {label && (
      <label style={{ fontSize: "12px", fontWeight: 600, color: G.dark, letterSpacing: ".4px", textTransform: "uppercase" }}>
        {label}
      </label>
    )}
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1.5px solid ${G.wash}`, borderRadius: "10px",
        padding: "10px 14px", fontSize: "13.5px",
        fontFamily: "'DM Sans',sans-serif", outline: "none",
        background: "#fff", color: "#222", transition: "border .18s",
      }}
      onFocus={e => e.target.style.borderColor = G.base}
      onBlur={e  => e.target.style.borderColor = G.wash}
    />
  </div>
);

/* ── Select ── */
export const Select = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    {label && (
      <label style={{ fontSize: "12px", fontWeight: 600, color: G.dark, letterSpacing: ".4px", textTransform: "uppercase" }}>
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1.5px solid ${G.wash}`, borderRadius: "10px",
        padding: "10px 14px", fontSize: "13.5px",
        fontFamily: "'DM Sans',sans-serif", outline: "none",
        background: "#fff", color: "#222",
      }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

/* ── Card wrapper ── */
export const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", borderRadius: "16px",
    border: `1.5px solid ${G.wash}`,
    boxShadow: "0 2px 16px rgba(58,90,32,.06)",
    padding: "28px 24px",
    ...style,
  }}>
    {children}
  </div>
);

/* ── Modal overlay ── */
export const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    zIndex: 999, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px",
  }}>
    <div style={{
      background: "#fff", borderRadius: "20px", padding: "36px 32px",
      width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "20px", color: G.dark }}>
          {title}
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ── BLOOM Logo ── */
export const BloomLogo = ({ light }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
    <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="5.5" fill={light ? G.pale  : G.base}  />
      <circle cx="15" cy="5"  r="4.2" fill={light ? "#fff"  : G.light} />
      <circle cx="15" cy="25" r="4.2" fill={light ? "#fff"  : G.light} />
      <circle cx="5"  cy="15" r="4.2" fill={light ? "#fff"  : G.light} />
      <circle cx="25" cy="15" r="4.2" fill={light ? "#fff"  : G.light} />
      <circle cx="7.5"  cy="7.5"  r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale} />
      <circle cx="22.5" cy="7.5"  r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale} />
      <circle cx="7.5"  cy="22.5" r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale} />
      <circle cx="22.5" cy="22.5" r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale} />
    </svg>
    <span style={{
      fontFamily: "'Playfair Display',Georgia,serif",
      fontWeight: 700, fontSize: "20px", letterSpacing: "1px",
      color: light ? "#fff" : G.dark,
    }}>
      BLOOM
    </span>
  </div>
);
