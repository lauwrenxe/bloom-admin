import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

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
    primary:  { background: G.dark,  color: "#fff" },
    secondary:{ background: G.wash,  color: G.dark },
    danger:   { background: "#fef2f2", color: "#c0392b" },
    ghost:    { background: "transparent", color: G.base, border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
      <input
        type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none",
        }}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <textarea
        value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none", resize: "vertical",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
      <select
        value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Tag({ children, color }) {
  const map = {
    green:  { bg: G.wash,     text: G.dark },
    yellow: { bg: "#fff8e1",  text: "#7a5c00" },
    gray:   { bg: "#f0f0f0",  text: "#555" },
    red:    { bg: "#fef2f2",  text: "#c0392b" },
    blue:   { bg: "#e8f0fe",  text: "#1a56a8" },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: G.white, borderRadius: 16, width: "100%",
        maxWidth: wide ? 720 : 520, maxHeight: "90vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: `1px solid ${G.wash}`,
          position: "sticky", top: 0, background: G.white, zIndex: 1,
        }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "— select status —" },
  { value: "draft",     label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived",  label: "Archived" },
];

function statusColor(s) {
  if (s === "published") return "green";
  if (s === "draft")     return "yellow";
  return "gray";
}

// ── Empty state ───────────────────────────────────────────────────
function Empty({ onAdd }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 40px", color: "#aaa" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: G.dark, marginBottom: 8 }}>No assessments yet</div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first assessment to get started.</div>
      <Btn onClick={onAdd}>+ New Assessment</Btn>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [modules,     setModules]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null); // "add" | "edit" | "questions"
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(null); // assessment for question drill-down
  const [search,      setSearch]      = useState("");

  // ── Questions sub-state ──
  const [questions,   setQuestions]   = useState([]);
  const [qLoading,    setQLoading]    = useState(false);
  const [qModal,      setQModal]      = useState(null); // "add-q" | "edit-q"
  const [qForm,       setQForm]       = useState({});
  const [qSaving,     setQSaving]     = useState(false);

  useEffect(() => { fetchData(); }, []);

  // ── Fetch assessments + modules ───────────────────────────────
  const fetchData = async () => {
    setLoading(true);

    const { data: aData } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    let { data: mData } = await supabase
      .from("modules").select("id, title").eq("status", "published").order("title");
    if (!mData?.length) {
      const { data: allM } = await supabase.from("modules").select("id, title").order("title");
      mData = allM;
    }

    const moduleMap = {};
    (mData ?? []).forEach(m => { moduleMap[m.id] = m.title; });
    const assessmentsWithModule = (aData ?? []).map(a => ({
      ...a,
      modules: a.module_id ? { title: moduleMap[a.module_id] ?? null } : null,
    }));

    setAssessments(assessmentsWithModule);
    setModules(mData ?? []);
    setLoading(false);
  };

  // ── Save assessment (insert or update) ───────────────────────
  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);
    const payload = {
      title:       form.title.trim(),
      description: form.description?.trim() ?? null,
      module_id:   form.module_id   || null,
      status:      form.status      || "draft",
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
    setModal(null); setForm({});
    fetchData();
  };

  // ── Delete assessment ────────────────────────────────────────
  const remove = async (id) => {
    if (!window.confirm("Delete this assessment? This will also delete all its questions.")) return;
    await supabase.from("assessments").delete().eq("id", id);
    fetchData();
  };

  // ── Open edit modal ──────────────────────────────────────────
  const openEdit = (a) => {
    setForm({
      id: a.id, title: a.title, description: a.description,
      module_id: a.module_id, status: a.status,
      passing_score: a.passing_score, time_limit: a.time_limit,
    });
    setError(null);
    setModal("edit");
  };

  // ── Open questions drill-down ────────────────────────────────
  const openQuestions = async (a) => {
    setSelected(a);
    setModal("questions");
    setQLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*, answer_options(*)")
      .eq("assessment_id", a.id)
      .order("order_index", { ascending: true });
    setQuestions(data ?? []);
    setQLoading(false);
  };

  // ── Save question ────────────────────────────────────────────
  const saveQuestion = async () => {
    if (!qForm.question_text?.trim()) { return; }
    setQSaving(true);
    const payload = {
      assessment_id: selected.id,
      question_text: qForm.question_text.trim(),
      question_type: qForm.question_type || "multiple_choice",
      points:        qForm.points ? Number(qForm.points) : 1,
      order_index:   qForm.order_index ? Number(qForm.order_index) : questions.length + 1,
    };
    let qId = qForm.id;
    if (qId) {
      await supabase.from("questions").update(payload).eq("id", qId);
    } else {
      const { data } = await supabase.from("questions").insert(payload).select().single();
      qId = data?.id;
    }
    // Save answer options if multiple choice
    if (qId && qForm.question_type !== "essay" && qForm.options?.length) {
      await supabase.from("answer_options").delete().eq("question_id", qId);
      const opts = qForm.options
        .filter(o => o.text?.trim())
        .map((o, i) => ({
          question_id:  qId,
          option_text:  o.text.trim(),
          is_correct:   !!o.is_correct,
          order_index:  i + 1,
        }));
      if (opts.length) await supabase.from("answer_options").insert(opts);
    }
    setQSaving(false);
    setQModal(null); setQForm({});
    // Refresh questions
    const { data } = await supabase
      .from("questions").select("*, answer_options(*)")
      .eq("assessment_id", selected.id).order("order_index", { ascending: true });
    setQuestions(data ?? []);
  };

  // ── Delete question ──────────────────────────────────────────
  const removeQuestion = async (qid) => {
    if (!window.confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", qid);
    setQuestions(q => q.filter(x => x.id !== qid));
  };

  // ── Open add-question modal ───────────────────────────────────
  const openAddQuestion = () => {
    setQForm({
      question_type: "multiple_choice",
      points: 1,
      options: [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    });
    setQModal("add-q");
  };

  const openEditQuestion = (q) => {
    setQForm({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      order_index: q.order_index,
      options: q.answer_options?.length
        ? q.answer_options.sort((a,b) => a.order_index - b.order_index).map(o => ({ text: o.option_text, is_correct: o.is_correct }))
        : [{ text:"",is_correct:false},{text:"",is_correct:false},{text:"",is_correct:false},{text:"",is_correct:false}],
    });
    setQModal("edit-q");
  };

  // ── Filtered list ────────────────────────────────────────────
  const filtered = assessments.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.modules?.title?.toLowerCase().includes(search.toLowerCase())
  );

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>
            Assessments
          </h1>
          <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
            Manage quizzes and assessments for GAD modules.
          </p>
        </div>
        <Btn onClick={() => { setForm({}); setError(null); setModal("add"); }}>+ New Assessment</Btn>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search assessments…"
          style={{
            border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
            color: G.dark, outline: "none", width: "100%", maxWidth: 360,
          }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: G.base }}>🌸 Loading…</div>
      ) : filtered.length === 0 && !search ? (
        <Empty onAdd={() => { setForm({}); setError(null); setModal("add"); }} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>No assessments match your search.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              background: G.white, border: `1px solid ${G.pale}`,
              borderRadius: 12, padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: G.dark, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {a.modules?.title && <span>📚 {a.modules.title}</span>}
                  {a.passing_score  && <span>✅ Pass: {a.passing_score}%</span>}
                  {a.time_limit     && <span>⏱ {a.time_limit} min</span>}
                </div>
                {a.description && (
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, maxWidth: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.description}
                  </div>
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

      {/* ── Add / Edit Assessment Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "New Assessment" : "Edit Assessment"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
            <Textarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
            <Select
              label="Module"
              value={form.module_id ?? ""}
              onChange={v => setForm(f => ({ ...f, module_id: v || null }))}
              options={[{ value: "", label: "— No module —" }, ...modules.map(m => ({ value: m.id, label: m.title }))]}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Select label="Status" value={form.status || "draft"} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS.filter(o => o.value)} />
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

      {/* ── Questions Drill-down Modal ── */}
      {modal === "questions" && selected && (
        <Modal title={`Questions — ${selected.title}`} onClose={() => { setModal(null); setSelected(null); }} wide>
          <div>
            {/* Sub-header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: G.base }}>
                {questions.length} question{questions.length !== 1 ? "s" : ""}
              </div>
              <Btn small onClick={openAddQuestion}>+ Add Question</Btn>
            </div>

            {qLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: G.base }}>🌸 Loading questions…</div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                No questions yet. Add your first question above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.map((q, qi) => (
                  <div key={q.id} style={{
                    background: G.cream, borderRadius: 10, padding: "14px 16px",
                    border: `1px solid ${G.wash}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: G.dark, marginBottom: 6 }}>
                          Q{qi + 1}. {q.question_text}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: q.answer_options?.length ? 8 : 0 }}>
                          <Tag color="blue">{q.question_type}</Tag>
                          <Tag color="gray">{q.points} pt{q.points !== 1 ? "s" : ""}</Tag>
                        </div>
                        {q.answer_options?.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                            {q.answer_options.sort((a,b) => a.order_index - b.order_index).map(opt => (
                              <div key={opt.id} style={{
                                fontSize: 12, color: opt.is_correct ? G.dark : "#777",
                                fontWeight: opt.is_correct ? 700 : 400,
                                display: "flex", gap: 6, alignItems: "center",
                              }}>
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

      {/* ── Add / Edit Question Modal ── */}
      {(qModal === "add-q" || qModal === "edit-q") && (
        <Modal title={qModal === "add-q" ? "Add Question" : "Edit Question"} onClose={() => setQModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Textarea label="Question Text *" value={qForm.question_text} onChange={v => setQForm(f => ({ ...f, question_text: v }))} rows={2} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select
                label="Type"
                value={qForm.question_type || "multiple_choice"}
                onChange={v => setQForm(f => ({ ...f, question_type: v }))}
                options={[
                  { value: "multiple_choice", label: "Multiple Choice" },
                  { value: "true_false",      label: "True / False" },
                  { value: "essay",           label: "Essay" },
                ]}
              />
              <Input label="Points" type="number" value={qForm.points} onChange={v => setQForm(f => ({ ...f, points: v }))} />
            </div>

            {/* Answer options — shown for non-essay types */}
            {qForm.question_type !== "essay" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, display: "block", marginBottom: 8 }}>
                  Answer Options <span style={{ color: G.light, fontWeight: 400 }}>(check the correct answer)</span>
                </label>
                {(qForm.question_type === "true_false"
                  ? [{ text: "True", is_correct: false }, { text: "False", is_correct: false }].map((o, i) => ({
                      ...o, ...(qForm.options?.[i] ?? {}), text: o.text,
                    }))
                  : qForm.options ?? []
                ).map((opt, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!opt.is_correct}
                      onChange={e => {
                        const opts = [...(qForm.options ?? [])];
                        opts[i] = { ...opts[i], is_correct: e.target.checked };
                        setQForm(f => ({ ...f, options: opts }));
                      }}
                      style={{ width: 16, height: 16, accentColor: G.base }}
                    />
                    {qForm.question_type === "true_false" ? (
                      <span style={{ fontSize: 13, color: G.dark }}>{opt.text}</span>
                    ) : (
                      <input
                        value={opt.text ?? ""}
                        onChange={e => {
                          const opts = [...(qForm.options ?? [])];
                          opts[i] = { ...opts[i], text: e.target.value };
                          setQForm(f => ({ ...f, options: opts }));
                        }}
                        placeholder={`Option ${i + 1}`}
                        style={{
                          flex: 1, border: `1px solid ${G.pale}`, borderRadius: 8,
                          padding: "7px 10px", fontSize: 13,
                          fontFamily: "'DM Sans', sans-serif", background: G.white, outline: "none",
                        }}
                      />
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
  );
}