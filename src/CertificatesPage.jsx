import { useState } from "react";
import { G } from "../styles/theme";
import { Btn, Card, Input, Modal, Select, Tag } from "../components/ui";
import { CERTIFICATE_TEMPLATES, SEED } from "../data/seed";

const courseOptions = [
  ...SEED.modules.map(m => m.title),
  ...SEED.seminars.map(s => s.title),
];

export default function CertificatesPage() {
  const [items, setItems] = useState(SEED.certificates);
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ student: "", course: courseOptions[0], template: "Standard" });

  const openIssue = () => { setForm({ student: "", course: courseOptions[0], template: "Standard" }); setModal(true); };

  const issue = () => {
    if (!form.student.trim()) return;
    setItems(prev => [...prev, { id: Date.now(), ...form, issued: new Date().toISOString().slice(0, 10) }]);
    setModal(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>
            Certification Management
          </h2>
          <p style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>Generate and distribute digital certificates.</p>
        </div>
        <Btn onClick={openIssue}>＋ Issue Certificate</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: G.cream }}>
              {["Student", "Course", "Template", "Date Issued", "Action"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: G.base, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderTop: `1px solid ${G.wash}`, background: i % 2 === 0 ? "#fff" : G.white }}>
                <td style={{ padding: "14px 20px", fontWeight: 600, fontSize: "13.5px", color: "#333" }}>{item.student}</td>
                <td style={{ padding: "14px 20px", fontSize: "13px", color: "#666" }}>{item.course}</td>
                <td style={{ padding: "14px 20px" }}><Tag>{item.template}</Tag></td>
                <td style={{ padding: "14px 20px", fontSize: "13px", color: "#888" }}>{item.issued}</td>
                <td style={{ padding: "14px 20px" }}>
                  <Btn small variant="ghost">📥 Download</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title="Issue Certificate" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Input label="Student Name" value={form.student} onChange={v => setForm(f => ({ ...f, student: v }))} placeholder="e.g. Maria Santos" />
            <Select label="Course / Seminar" value={form.course} onChange={v => setForm(f => ({ ...f, course: v }))} options={courseOptions} />
            <Select label="Certificate Template" value={form.template} onChange={v => setForm(f => ({ ...f, template: v }))} options={CERTIFICATE_TEMPLATES} />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn onClick={issue}>Issue Certificate</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
