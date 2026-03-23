/* ─── BLOOM GAD — CVSU Design System ───────────────────────────
   Single source of truth for all colors, spacing, and shadows.
   Import this in every page: import { T, s as CS } from "./theme.js"
──────────────────────────────────────────────────────────────── */

export const T = {
  /* App backgrounds */
  appBg:      "#F5F7F5",
  surfaceL1:  "#FFFFFF",
  surfaceL2:  "#F9FBF9",
  surfaceL3:  "#F2F6F2",

  /* Sidebar */
  rail:        "#1A2E1A",
  railHover:   "rgba(255,255,255,.08)",
  railActive:  "rgba(255,255,255,.14)",
  railText:    "rgba(255,255,255,.58)",
  railTextActive: "#FFFFFF",
  railBorder:  "rgba(255,255,255,.07)",

  /* Brand — CVSU forest green */
  brand:      "#2D6A2D",
  brand2:     "#1F5C1F",
  brandMid:   "#3A7A3A",
  brandLight: "#E8F5E9",
  brandPale:  "#C8E6C9",
  brandAccent:"#4CAF50",

  /* Text */
  text1:      "#1A2E1A",
  text2:      "#4A5E4A",
  text3:      "#8A9E8A",
  textInvert: "#FFFFFF",

  /* Borders */
  border:     "#DDE8DD",
  borderSoft: "#EBF2EB",
  borderHover:"#B5CC8E",

  /* Status */
  success:    "#107C10",
  successBg:  "#DFF6DD",
  successText:"#0D5E0D",
  danger:     "#C50F1F",
  dangerBg:   "#FDE7E9",
  dangerText: "#A30E1A",
  warning:    "#835B00",
  warningBg:  "#FFF4CE",
  warningText:"#6B4A00",
  info:       "#0550AE",
  infoBg:     "#DDEEFF",
  infoText:   "#0550AE",

  /* Shadows */
  shadow1: "0 1px 3px rgba(26,46,26,.06), 0 1px 2px rgba(26,46,26,.04)",
  shadow2: "0 4px 12px rgba(26,46,26,.08), 0 2px 4px rgba(26,46,26,.04)",
  shadow3: "0 8px 24px rgba(26,46,26,.10), 0 4px 8px rgba(26,46,26,.05)",
};

/* ─── Shared page-level style tokens ─────────────────────────── */
export const CS = {
  page:    { padding:"28px 32px", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", background:T.appBg, minHeight:"100vh" },
  card:    { background:T.surfaceL1, border:`1px solid ${T.border}`, borderRadius:10, boxShadow:T.shadow1 },
  title:   { fontSize:22, fontWeight:700, color:T.text1, margin:0, fontFamily:"'Inter',system-ui,sans-serif" },
  subtitle:{ fontSize:13, color:T.text3, marginTop:3 },
  th:      { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:T.text3, textTransform:"uppercase", letterSpacing:".5px", background:T.surfaceL2, borderBottom:`1px solid ${T.border}` },
  td:      { padding:"11px 14px", borderBottom:`1px solid ${T.borderSoft}`, color:T.text1, fontSize:13, verticalAlign:"middle" },
  input:   { border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", fontSize:13, fontFamily:"inherit", outline:"none", background:T.surfaceL1, color:T.text1, width:"100%" },
  select:  { border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", fontSize:13, fontFamily:"inherit", outline:"none", background:T.surfaceL1, color:T.text1 },
  label:   { fontSize:11, fontWeight:600, color:T.text2, letterSpacing:".4px", textTransform:"uppercase", display:"block", marginBottom:5 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:   { background:T.surfaceL1, borderRadius:12, width:"100%", maxWidth:540, maxHeight:"90vh", overflow:"auto", boxShadow:T.shadow3 },
  mHead:   { padding:"18px 22px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:T.surfaceL1, zIndex:1 },
  mTitle:  { fontSize:16, fontWeight:700, color:T.text1 },
  mBody:   { padding:"20px 22px" },
  tabs:    { display:"flex", gap:0, borderBottom:`1px solid ${T.border}`, marginBottom:22 },
  tab:    (a) => ({ padding:"9px 18px", border:"none", borderBottom: a ? `2px solid ${T.brand}` : "2px solid transparent", background:"transparent", cursor:"pointer", fontSize:13, fontWeight: a ? 700 : 400, color: a ? T.brand : T.text3, marginBottom:-1, fontFamily:"inherit", transition:"all .15s" }),
  searchBar: { padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:13, outline:"none", background:T.surfaceL1, color:T.text1 },
  toolbar: { display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" },
  header:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12 },
};

/* ─── Shared tag/badge helper ─────────────────────────────────── */
export function tagStyle(variant) {
  const map = {
    green:  { background:T.successBg, color:T.successText },
    red:    { background:T.dangerBg,  color:T.dangerText  },
    yellow: { background:T.warningBg, color:T.warningText },
    blue:   { background:T.infoBg,    color:T.infoText    },
    gray:   { background:T.surfaceL3, color:T.text2       },
    brand:  { background:T.brandLight,color:T.brand       },
  };
  const base = { display:"inline-flex", alignItems:"center", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700 };
  return { ...base, ...(map[variant]||map.gray) };
}

/* ─── Primary button style ───────────────────────────────────── */
export function btnPrimary(small=false) {
  return {
    padding: small ? "6px 14px" : "9px 18px",
    background: T.brand, color: "#fff",
    border: "none", borderRadius:6, cursor:"pointer",
    fontWeight:600, fontSize: small ? 12 : 13,
    fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
    transition:"background .14s",
  };
}
export function btnSecondary(small=false) {
  return {
    padding: small ? "6px 14px" : "9px 18px",
    background: T.surfaceL1, color: T.text2,
    border:`1px solid ${T.border}`, borderRadius:6, cursor:"pointer",
    fontWeight:600, fontSize: small ? 12 : 13,
    fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
    transition:"all .14s",
  };
}
export function btnDanger(small=false) {
  return {
    padding: small ? "6px 14px" : "9px 18px",
    background: T.dangerBg, color: T.dangerText,
    border:`1px solid ${T.dangerBg}`, borderRadius:6, cursor:"pointer",
    fontWeight:600, fontSize: small ? 12 : 13,
    fontFamily:"inherit", transition:"all .14s",
  };
}