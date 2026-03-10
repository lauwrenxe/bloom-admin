import { G } from "../../styles/theme";
import { NAV_ITEMS } from "../../data/seed";

export default function Topbar({ active }) {
  const current = NAV_ITEMS.find(n => n.id === active);

  return (
    <div style={{
      background: "#fff", borderBottom: `1px solid ${G.wash}`,
      padding: "0 36px", height: "60px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "14px", color: "#888" }}>
        <span style={{ color: G.base, fontWeight: 600 }}>BLOOM</span>
        <span style={{ margin: "0 8px", color: "#ccc" }}>/</span>
        {current?.label}
      </div>

      {/* Avatar */}
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: `linear-gradient(135deg,${G.base},${G.dark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "14px", color: "#fff", fontWeight: 700,
      }}>
        A
      </div>
    </div>
  );
}
