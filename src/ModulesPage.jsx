import { useState } from "react";
import { G } from "../styles/theme";
import { Btn, Card, Input, Modal, Select, Tag } from "../components/ui";
import { MODULE_CATEGORIES, SEED } from "../data/seed";

export default function ModulesPage() {
  const [items, setItems]   = useState(SEED.modules);
  const [modal, setModal]   = useState(null); // null | "add" | item
  const [form,  setForm]    = useState({ title: "", category: "Basics", status: "Draft" });

  const openAdd  = () => { setForm({ title: "", category: "Basics", status: "Draft" }); setModal("add"); };
  const openEdit = item => { setForm({ title: item.title, category: item.category, status: item.status }); setModal(item); };

  const save = () => {
    if (!form.title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (modal === "add") {
      setItems(prev => [...prev, { id: Date.now(), ...form, updated: today }]);
    } else {
      setItems(prev => prev.map(i => i.id === modal.id ? { ...i, ...form, updated: today } : i));
    }
    setModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>
            Module Management
          </h2>
          <p style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>Upload and manage GAD learning modules.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Module</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: G.cream }}>
              {["Title", "Category", "Status", "Last Updated", "Actions"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: G.base, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderTop: `1px solid ${G.wash}`, background: i % 2 === 0 ? "#fff" : G.white }}>
                <td style={{ padding: "14px 20px", fontWeight: 600, fontSize: "13.5px", color: "#333" }}>{item.title}</td>
                <td style={{ padding: "14px 20px", fontSize: "13px", color: "#666" }}>{item.category}</td>
                <td style={{ padding: "14px 20px" }}>
                  <Tag color={item.status === "Published" ? G.base : "#e67e22"} bg={item.status === "Published" ? G.wash : "#fef5e7"}>
                    {item.status}
                  </Tag>
                </td>
                <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888" }}>{item.updated}</td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                    <Btn small variant="danger" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={modal === "add" ? "Add Module" : "Edit Module"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Module Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Introduction to GAD" />
            <Select label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={MODULE_CATEGORIES} />
            <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["Draft", "Published"]} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Module</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
