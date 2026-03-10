import { useState } from "react";
import { G } from "../styles/theme";
import { Btn, Card, Input, Modal, Select, Tag } from "../components/ui";
import { SEED } from "../data/seed";

const statusStyle = s =>
  s === "Upcoming"  ? { color: "#4a90d9", bg: "#eaf2fb"  } :
  s === "Live"      ? { color: "#c0392b", bg: "#fdecea"  } :
                      { color: G.base,    bg: G.wash      };

export default function SeminarsPage() {
  const [items, setItems] = useState(SEED.seminars);
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({ title: "", date: "", time: "10:00 AM", status: "Upcoming" });

  const openAdd  = () => { setForm({ title: "", date: "", time: "10:00 AM", status: "Upcoming" }); setModal("add"); };
  const openEdit = item => { setForm({ title: item.title, date: item.date, time: item.time, status: item.status }); setModal(item); };

  const save = () => {
    if (!form.title.trim() || !form.date) return;
    if (modal === "add") {
      setItems(prev => [...prev, { id: Date.now(), ...form, attendees: 0 }]);
    } else {
      setItems(prev => prev.map(i => i.id === modal.id ? { ...i, ...form } : i));
    }
    setModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>
            Seminar & Webinar Management
          </h2>
          <p style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>Schedule and host live GAD webinars.</p>
        </div>
        <Btn onClick={openAdd}>＋ Schedule Seminar</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "16px" }}>
        {items.map(item => {
          const sc = statusStyle(item.status);
          return (
            <Card key={item.id} style={{ borderTop: `4px solid ${sc.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>🎙️</span>
                <Tag color={sc.color} bg={sc.bg}>{item.status}</Tag>
              </div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "8px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "12.5px", color: "#888", marginBottom: "2px" }}>📅 {item.date} · {item.time}</div>
              <div style={{ fontSize: "12.5px", color: "#888", marginBottom: "16px" }}>👥 {item.attendees} attendees</div>
              <div style={{ display: "flex", gap: "8px" }}>
                {item.status === "Upcoming" && <Btn small variant="dark">Go Live</Btn>}
                <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}>Delete</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Schedule Seminar" : "Edit Seminar"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Seminar Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Women's Rights Forum" />
            <Input label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date" />
            <Input label="Time" value={form.time} onChange={v => setForm(f => ({ ...f, time: v }))} placeholder="e.g. 09:00 AM" />
            <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["Upcoming", "Live", "Completed"]} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Seminar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
