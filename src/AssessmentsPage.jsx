import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, ${G.wash} 25%, ${G.cream} 50%, ${G.wash} 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}`;

function Shimmer({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function SkeletonRow() {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <Shimmer w="45%" h={15} style={{ marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Shimmer w={80} h={11} />
          <Shimmer w={60} h={11} />
        </div>
      </div>
      <Shimmer w={60} h={22} r={20} />
      <Shimmer w={90} h={30} r={8} />
      <Shimmer w={50} h={30} r={8} />
      <Shimmer w={60} h={30} r={8} />
    </div>
  );
}

// ── UI Atoms ──────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    padding: small ? "6px 14px" : "9px 20px",
    fontSize: small ? 12 : 13,
    opacity: disabled ? 0.5 : 1,
    transition: "all .15s",
    ...style,
  };
  const variants = {
    primary:   { background: G.dark,        color: "#fff" },
    secondary: { background: G.wash,        color: G.dark },
    danger:    { background: "#fef2f2",     color: "#c0392b" },
    ghost:     { background: "transparent", color: G.base, border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", resize: "vertical" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Tag({ children, color }) {
  const map = {
    green:  { bg: G.wash,    text: G.dark },
    yellow: { bg: "#fff8e1", text: "#7a5c00" },
    gray:   { bg: "#f0f0f0", text: "#555" },
    red:    { bg: "#fef2f2", text: "#c0392b" },
    blue:   { bg: "#e8f0fe", text: "#1a56a8" },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: G.white, borderRadius: 16, width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${G.wash}`, position: "sticky", top: 0, background: G.white, zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, message, action, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "72px 40px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: G.light, marginBottom: action ? 20 : 0 }}>{message}</div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "draft",     label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived",  label: "Archived" },
];

function statusColor(s) {
  if (s === "published") return "green";
  if (s === "draft")     return "yellow";
  return "gray";
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [modules,     setModules]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [questions,   setQuestions]   = useState([]);
  const [qLoading,    setQLoading]    = useState(false);
  const [qModal,      setQModal]      = useState(null);
  const [qForm,       setQForm]       = useState({});
  const [qSaving,     setQSaving]     = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: aData } = await supabase.from("assessments").select("*").order("created_at", { ascending: false });
    let { data: mData } = await supabase.from("modules").select("id, title").eq("status", "published").order("title");
    if (!mData?.length) {
      const { data: allM } = await supabase.from("modules").select("id, title").order("title");
      mData = allM;
    }
    const moduleMap = {};
    (mData ?? []).forEach(m => { moduleMap[m.id] = m.title; });
    const assessmentsWithModule = (aData ?? []).map(a => ({
      ...a, modules: a.module_id ? { title: moduleMap[a.module_id] ?? null } : null,
    }));
    setAssessments(assessmentsWithModule);
    setModules(mData ?? []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);
    const payload = {
      title: form.title.trim(), description: form.description?.trim() ?? null,
      module_id: form.module_id || null, status: form.status || "draft",
      passing_score: form.passing_score ? Number(form.passing_score) : null,
      time_limit:    form.time_limit    ? Number(form.time_limit)    : null,
    };
    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("assessments").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("assessments").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({}); fetchData();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this assessment? This will also delete all its questions.")) return;
    await supabase.from("assessments").delete().eq("id", id);
    fetchData();
  };

  const openEdit = (a) => {
    setForm({ id: a.id, title: a.title, description: a.description, module_id: a.module_id, status: a.status, passing_score: a.passing_score, time_limit: a.time_limit });
    setError(null); setModal("edit");
  };

  const openQuestions = async (a) => {
    setSelected(a); setModal("questions"); setQLoading(true);
    const { data } = await supabase.from("questions").select("*, answer_options(*)").eq("assessment_id", a.id).order("order_index", { ascending: true });
    setQuestions(data ?? []); setQLoading(false);
  };

  const saveQuestion = async () => {
    if (!qForm.question_text?.trim()) return;
    setQSaving(true);
    const payload = {
      assessment_id: selected.id, question_text: qForm.question_text.trim(),
      question_type: qForm.question_type || "multiple_choice",
      points: qForm.points ? Number(qForm.points) : 1,
      order_index: qForm.order_index ? Number(qForm.order_index) : questions.length + 1,
    };
    let qId = qForm.id;
    if (qId) {
      await supabase.from("questions").update(payload).eq("id", qId);
    } else {
      const { data } = await supabase.from("questions").insert(payload).select().single();
      qId = data?.id;
    }
    if (qId && qForm.question_type !== "essay" && qForm.options?.length) {
      await supabase.from("answer_options").delete().eq("question_id", qId);
      const opts = qForm.options.filter(o => o.text?.trim()).map((o, i) => ({ question_id: qId, option_text: o.text.trim(), is_correct: !!o.is_correct, order_index: i + 1 }));
      if (opts.length) await supabase.from("answer_options").insert(opts);
    }
    setQSaving(false); setQModal(null); setQForm({});
    const { data } = await supabase.from("questions").select("*, answer_options(*)").eq("assessment_id", selected.id).order("order_index", { ascending: true });
    setQuestions(data ?? []);
  };

  const removeQuestion = async (qid) => {
    if (!window.confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", qid);
    setQuestions(q => q.filter(x => x.id !== qid));
  };

  const openAddQuestion = () => {
    setQForm({ question_type: "multiple_choice", points: 1, options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] });
    setQModal("add-q");
  };

  const openEditQuestion = (q) => {
    setQForm({
      id: q.id, question_text: q.question_text, question_type: q.question_type, points: q.points, order_index: q.order_index,
      options: q.answer_options?.length
        ? q.answer_options.sort((a, b) => a.order_index - b.order_index).map(o => ({ text: o.option_text, is_correct: o.is_correct }))
        : [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }],
    });
    setQModal("edit-q");
  };

  const filtered = assessments.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.modules?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>Assessments</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>Manage quizzes and assessments for GAD modules.</p>
          </div>
          <Btn onClick={() => { setForm({}); setError(null); setModal("add"); }}>+ New Assessment</Btn>
        </div>

        <div style={{ marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search assessments…"
            style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", width: "100%", maxWidth: 360 }} />
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 && !search ? (
          <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
            <EmptyState emoji="📝" title="No assessments yet" message="Create your first assessment to get started." action="+ New Assessment" onAction={() => { setForm({}); setError(null); setModal("add"); }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
            <EmptyState emoji="🔍" title="No results" message="No assessments match your search." />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(a => (
              <div key={a.id} style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(45,74,24,.05)" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: G.dark, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {a.modules?.title  && <span>📚 {a.modules.title}</span>}
                    {a.passing_score   && <span>✅ Pass: {a.passing_score}%</span>}
                    {a.time_limit      && <span>⏱ {a.time_limit} min</span>}
                  </div>
                  {a.description && (
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</div>
                  )}
                </div>
                <Tag color={statusColor(a.status)}>{a.status || "draft"}</Tag>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small variant="secondary" onClick={() => openQuestions(a)}>📋 Questions</Btn>
                  <Btn small variant="ghost"     onClick={() => openEdit(a)}>Edit</Btn>
                  <Btn small variant="danger"    onClick={() => remove(a.id)}>Delete</Btn>
                </div>
              </div>
            ))}
          </div>
        )}

        {(modal === "add" || modal === "edit") && (
          <Modal title={modal === "add" ? "New Assessment" : "Edit Assessment"} onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <Textarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
              <Select label="Module" value={form.module_id ?? ""} onChange={v => setForm(f => ({ ...f, module_id: v || null }))} options={[{ value: "", label: "— No module —" }, ...modules.map(m => ({ value: m.id, label: m.title }))]} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Select label="Status" value={form.status || "draft"} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
                <Input label="Passing Score (%)" type="number" value={form.passing_score} onChange={v => setForm(f => ({ ...f, passing_score: v }))} placeholder="e.g. 75" />
                <Input label="Time Limit (min)" type="number" value={form.time_limit} onChange={v => setForm(f => ({ ...f, time_limit: v }))} placeholder="e.g. 30" />
              </div>
              {error && <div style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save Changes"}</Btn>
              </div>
            </div>
          </Modal>
        )}

        {modal === "questions" && selected && (
          <Modal title={`Questions — ${selected.title}`} onClose={() => { setModal(null); setSelected(null); }} wide>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: G.base }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</div>
                <Btn small onClick={openAddQuestion}>+ Add Question</Btn>
              </div>
              {qLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ background: G.cream, borderRadius: 10, padding: "14px 16px", border: `1px solid ${G.wash}` }}>
                      <Shimmer w="70%" h={14} style={{ marginBottom: 10 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <Shimmer w={80} h={20} r={20} />
                        <Shimmer w={60} h={20} r={20} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: G.dark, marginBottom: 6 }}>No questions yet</div>
                  <div style={{ fontSize: 13, color: G.light, marginBottom: 16 }}>Add your first question to this assessment.</div>
                  <Btn small onClick={openAddQuestion}>+ Add Question</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {questions.map((q, qi) => (
                    <div key={q.id} style={{ background: G.cream, borderRadius: 10, padding: "14px 16px", border: `1px solid ${G.wash}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: G.dark, marginBottom: 6 }}>Q{qi + 1}. {q.question_text}</div>
                          <div style={{ display: "flex", gap: 8, marginBottom: q.answer_options?.length ? 8 : 0 }}>
                            <Tag color="blue">{q.question_type}</Tag>
                            <Tag color="gray">{q.points} pt{q.points !== 1 ? "s" : ""}</Tag>
                          </div>
                          {q.answer_options?.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                              {q.answer_options.sort((a, b) => a.order_index - b.order_index).map(opt => (
                                <div key={opt.id} style={{ fontSize: 12, color: opt.is_correct ? G.dark : "#777", fontWeight: opt.is_correct ? 700 : 400, display: "flex", gap: 6, alignItems: "center" }}>
                                  <span>{opt.is_correct ? "✅" : "○"}</span>
                                  <span>{opt.option_text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <Btn small variant="ghost"  onClick={() => openEditQuestion(q)}>Edit</Btn>
                          <Btn small variant="danger" onClick={() => removeQuestion(q.id)}>Delete</Btn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}

        {(qModal === "add-q" || qModal === "edit-q") && (
          <Modal title={qModal === "add-q" ? "Add Question" : "Edit Question"} onClose={() => setQModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Textarea label="Question Text *" value={qForm.question_text} onChange={v => setQForm(f => ({ ...f, question_text: v }))} rows={2} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select label="Type" value={qForm.question_type || "multiple_choice"} onChange={v => setQForm(f => ({ ...f, question_type: v }))}
                  options={[{ value: "multiple_choice", label: "Multiple Choice" }, { value: "true_false", label: "True / False" }, { value: "essay", label: "Essay" }]} />
                <Input label="Points" type="number" value={qForm.points} onChange={v => setQForm(f => ({ ...f, points: v }))} />
              </div>
              {qForm.question_type !== "essay" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, display: "block", marginBottom: 8 }}>
                    Answer Options <span style={{ color: G.light, fontWeight: 400 }}>(check the correct answer)</span>
                  </label>
                  {(qForm.question_type === "true_false"
                    ? [{ text: "True", is_correct: false }, { text: "False", is_correct: false }].map((o, i) => ({ ...o, ...(qForm.options?.[i] ?? {}), text: o.text }))
                    : qForm.options ?? []
                  ).map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <input type="checkbox" checked={!!opt.is_correct}
                        onChange={e => { const opts = [...(qForm.options ?? [])]; opts[i] = { ...opts[i], is_correct: e.target.checked }; setQForm(f => ({ ...f, options: opts })); }}
                        style={{ width: 16, height: 16, accentColor: G.base }} />
                      {qForm.question_type === "true_false" ? (
                        <span style={{ fontSize: 13, color: G.dark }}>{opt.text}</span>
                      ) : (
                        <input value={opt.text ?? ""}
                          onChange={e => { const opts = [...(qForm.options ?? [])]; opts[i] = { ...opts[i], text: e.target.value }; setQForm(f => ({ ...f, options: opts })); }}
                          placeholder={`Option ${i + 1}`}
                          style={{ flex: 1, border: `1px solid ${G.pale}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, outline: "none" }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <Btn variant="ghost" onClick={() => setQModal(null)}>Cancel</Btn>
                <Btn onClick={saveQuestion} disabled={qSaving}>{qSaving ? "Saving…" : qModal === "add-q" ? "Add Question" : "Save"}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}