import { useState } from "react";
import { G } from "../styles/theme";
import { Btn, Card, Input, Modal, Select, Tag } from "../components/ui";
import { SEED } from "../data/seed";

export default function AssessmentsPage() {
  const [items, setItems] = useState(SEED.assessments);
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({ title: "", module: SEED.modules[0].title, questions: "10", status: "Draft" });

  const moduleOptions = SEED.modules.map(m => m.title);

  const openAdd  = () => { setForm({ title: "", module: moduleOptions[0], questions: "10", status: "Draft" }); setModal("add"); };
  const openEdit = item => { setForm({ title: item.title, module: item.module, questions: String(item.questions), status: item.status }); setModal(item); };

  const save = () => {
    if (!form.title.trim()) return;
    const entry = { ...form, questions: Number(form.questions) };
    if (modal === "add") {
      setItems(prev => [...prev, { id: Date.now(), ...entry }]);
    } else {
      setItems(prev => prev.map(i => i.id === modal.id ? { ...i, ...entry } : i));
    }
    setModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>
            Assessment Management
          </h2>
          <p style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>Create quizzes and evaluations for students.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Assessment</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "16px" }}>
        {items.map(item => (
          <Card key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "28px" }}>📝</span>
              <Tag color={item.status === "Active" ? G.base : "#e67e22"} bg={item.status === "Active" ? G.wash : "#fef5e7"}>
                {item.status}
              </Tag>
            </div>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "6px" }}>
              {item.title}
            </div>
            <div style={{ fontSize: "12.5px", color: "#888", marginBottom: "4px" }}>Module: {item.module}</div>
            <div style={{ fontSize: "12.5px", color: "#888", marginBottom: "16px" }}>{item.questions} Questions</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
              <Btn small variant="danger" onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}>Delete</Btn>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Add Assessment" : "Edit Assessment"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Assessment Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. GAD Basics Quiz" />
            <Select label="Linked Module" value={form.module} onChange={v => setForm(f => ({ ...f, module: v }))} options={moduleOptions} />
            <Input label="Number of Questions" value={form.questions} onChange={v => setForm(f => ({ ...f, questions: v }))} type="number" />
            <Select label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["Draft", "Active"]} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Assessment</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
