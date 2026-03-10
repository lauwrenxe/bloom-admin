import { useState } from "react";
import { G } from "../styles/theme";
import { Btn, Card, Input, Modal, Select, Tag } from "../components/ui";
import { SEED } from "../data/seed";

const typeStyle = t =>
  t === "Event"   ? { color: "#8e44ad", bg: "#f5eef8" } :
  t === "Meeting" ? { color: "#e67e22", bg: "#fef5e7" } :
                    { color: G.base,    bg: G.wash     };

export default function CalendarPage() {
  const [items, setItems] = useState(SEED.events);
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({ title: "", date: "", type: "Event", desc: "" });

  const openAdd  = () => { setForm({ title: "", date: "", type: "Event", desc: "" }); setModal("add"); };
  const openEdit = item => { setForm({ title: item.title, date: item.date, type: item.type, desc: item.desc }); setModal(item); };

  const save = () => {
    if (!form.title.trim() || !form.date) return;
    if (modal === "add") {
      setItems(prev => [...prev, { id: Date.now(), ...form }]);
    } else {
      setItems(prev => prev.map(i => i.id === modal.id ? { ...i, ...form } : i));
    }
    setModal(null);
  };

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>
            Calendar & Activity Management
          </h2>
          <p style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>Schedule GADRC events, activities, and meetings.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Event</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sorted.map(item => {
          const tc = typeStyle(item.type);
          return (
            <Card key={item.id} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "20px 24px" }}>
              {/* Date badge */}
              <div style={{ background: tc.bg, borderRadius: "12px", padding: "14px 16px", textAlign: "center", minWidth: "64px", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "20px", color: tc.color }}>
                  {item.date.slice(8)}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: tc.color, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {new Date(item.date + "T00:00:00").toLocaleString("default", { month: "short" })}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#333", marginBottom: "4px" }}>{item.title}</div>
                <div style={{ fontSize: "12.5px", color: "#888" }}>{item.desc}</div>
              </div>

              <Tag color={tc.color} bg={tc.bg}>{item.type}</Tag>

              <div style={{ display: "flex", gap: "8px" }}>
                <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}>Delete</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Add Event" : "Edit Event"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Event Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. GAD Orientation" />
            <Input label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date" />
            <Select label="Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={["Event", "Activity", "Meeting"]} />
            <Input label="Description" value={form.desc} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Brief description..." />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Event</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
