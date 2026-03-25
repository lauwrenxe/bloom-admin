import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Styles ───────────────────────────────────────────────────────
const s = {
  page:         { display: "flex", height: "100vh", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7F5", overflow: "hidden" },
  sidebar:      { width: 290, minWidth: 290, background: G.dark, display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHdr:   { padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  sidebarTitle: { fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 },
  sidebarSub:   { fontSize: 12, color: G.pale, marginTop: 2 },
  asmList:      { flex: 1, overflowY: "auto", padding: "4px 0" },
  asmItem:     (a) => ({ padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderLeft: a ? `3px solid ${G.light}` : "3px solid transparent", background: a ? "rgba(255,255,255,0.1)" : "transparent", transition: "background .15s" }),
  asmIcon:      { width: 34, height: 34, borderRadius: 6, background: G.mid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 },
  asmTitle:     { fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  asmMeta:      { fontSize: 11, color: G.pale, marginTop: 1 },
  pubDot:      (p) => ({ width: 7, height: 7, borderRadius: "50%", background: p ? "#4ade80" : "#facc15", flexShrink: 0, marginLeft: "auto" }),
  addBtn:       { margin: "12px 16px", padding: "9px 14px", background: G.base, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  searchInput:  { margin: "0 12px 8px", padding: "8px 12px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, outline: "none", width: "calc(100% - 24px)", boxSizing: "border-box" },
  main:         { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:       { background: "#fff", borderBottom: `1px solid ${G.wash}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  topTitle:     { fontSize: 17, fontWeight: 700, color: G.dark, flex: 1 },
  tabBar:       { display: "flex", borderBottom: `1px solid ${G.wash}`, background: "#fff", padding: "0 24px", flexShrink: 0 },
  tab:         (a) => ({ padding: "11px 18px", fontSize: 13, fontWeight: 600, color: a ? G.dark : "#999", borderBottom: a ? `2px solid ${G.dark}` : "2px solid transparent", cursor: "pointer", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }),
  content:      { flex: 1, overflowY: "auto", padding: 24 },
  card:         { background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #DDE8DD", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", marginBottom: 16 },
  label:        { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:        { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:       { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  textarea:     { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 80 },
  fg:           { marginBottom: 16 },
  row:          { display: "flex", gap: 12 },
  btnPrimary:   { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary: { padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnGreen:     { padding: "8px 16px", background: G.base, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnDanger:    { padding: "7px 14px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  iconBtn:     (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  tag:         (c) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "yellow" ? "#fef9c3" : c === "blue" ? "#dbeafe" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "yellow" ? "#92400e" : c === "blue" ? "#1d4ed8" : "#555" }),
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:       (w) => ({ background: "#fff", borderRadius: 10, width: "100%", maxWidth: w || 540, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader:      { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:       { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:        { padding: "20px 24px" },
  mFooter:      { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  statCard:    (c) => ({ flex: 1, minWidth: 100, background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #DDE8DD", borderTop: `3px solid ${c || G.base}` }),
  statNum:      { fontSize: 28, fontWeight: 900, color: G.dark },
  statLabel:    { fontSize: 12, color: "#888", marginTop: 2 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:           { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${G.wash}`, background: "#F5F7F5" },
  td:           { padding: "11px 14px", borderBottom: `1px solid ${G.wash}`, color: G.dark, verticalAlign: "middle" },
  emptyBox:     { background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" },
};

// ── Question type labels ──────────────────────────────────────────
const QTYPE = { multiple_choice: "Multiple Choice", true_false: "True/False", short_answer: "Short Answer" };

// ═══════════════════════════════════════════════════════════════════
//  QUESTIONS TAB
// ═══════════════════════════════════════════════════════════════════
function QuestionsTab({ assessment }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editQ, setEditQ]         = useState(null);
  const [saving, setSaving]       = useState(false);
  // form state
  const [qText, setQText]   = useState("");
  const [qType, setQType]   = useState("multiple_choice");
  const [opts, setOpts]     = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [tfAns, setTfAns]   = useState("true");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*, question_options(*)")
      .eq("assessment_id", assessment.id)
      .order("sort_order");
    setQuestions(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditQ(null); setQText(""); setQType("multiple_choice");
    setOpts(["", "", "", ""]); setCorrect(0); setTfAns("true");
    setShowModal(true);
  };

  const openEdit = (q) => {
    setEditQ(q); setQText(q.question_text); setQType(q.question_type);
    const qOpts = (q.question_options || []).sort((a, b) => a.sort_order - b.sort_order);
    if (q.question_type === "multiple_choice") {
      setOpts(qOpts.map(o => o.option_text));
      setCorrect(qOpts.findIndex(o => o.is_correct));
    } else if (q.question_type === "true_false") {
      const c = qOpts.find(o => o.is_correct);
      setTfAns(c?.option_text === "True" ? "true" : "false");
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!qText.trim()) return alert("Enter the question text.");
    if (qType === "multiple_choice" && opts.some(o => !o.trim())) return alert("Fill in all answer options.");
    setSaving(true);
    let qId = editQ?.id;
    if (!qId) {
      const { data: nq } = await supabase.from("questions").insert({
        assessment_id: assessment.id, question_text: qText,
        question_type: qType, sort_order: questions.length,
      }).select().single();
      qId = nq?.id;
    } else {
      await supabase.from("questions").update({ question_text: qText, question_type: qType }).eq("id", qId);
      await supabase.from("question_options").delete().eq("question_id", qId);
    }
    // Insert options
    if (qType === "multiple_choice") {
      for (let i = 0; i < opts.length; i++) {
        await supabase.from("question_options").insert({ question_id: qId, option_text: opts[i], is_correct: i === correct, sort_order: i });
      }
    } else if (qType === "true_false") {
      await supabase.from("question_options").insert({ question_id: qId, option_text: "True",  is_correct: tfAns === "true",  sort_order: 0 });
      await supabase.from("question_options").insert({ question_id: qId, option_text: "False", is_correct: tfAns === "false", sort_order: 1 });
    }
    setSaving(false); setShowModal(false); load();
  };

  const del = async (q) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("question_options").delete().eq("question_id", q.id);
    await supabase.from("questions").delete().eq("id", q.id);
    load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: G.dark }}>Questions</span>
          <span style={{ background: G.wash, color: G.base, borderRadius: 10, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{questions.length}</span>
        </div>
        <button style={s.btnGreen} onClick={openAdd}>+ Add Question</button>
      </div>

      {questions.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-clipboard-check me-1"/></div>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No questions yet</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Add questions for students to answer in the app</div>
          <button style={s.btnGreen} onClick={openAdd}>+ Add First Question</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((q, i) => {
            const qOpts = (q.question_options || []).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={q.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: G.base }}>Q{i + 1}</span>
                    <span style={s.tag("blue")}>{QTYPE[q.question_type] || q.question_type}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={s.iconBtn(G.base)} onClick={() => openEdit(q)}><i className="bi bi-pencil me-1"/></button>
                    <button style={s.iconBtn("#dc2626")} onClick={() => del(q)}><i className="bi bi-trash me-1"/></button>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: G.dark, marginBottom: 10, lineHeight: 1.5 }}>{q.question_text}</div>
                {q.question_type === "short_answer" ? (
                  <div style={{ background: G.wash, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#888", fontStyle: "italic" }}><i className="bi bi-pencil me-1"/> Students type a written response</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {qOpts.map((o, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, background: o.is_correct ? "#dcfce7" : "#f9fafb", border: `1px solid ${o.is_correct ? "#86efac" : "#e5e7eb"}`, fontSize: 13 }}>
                        {o.is_correct ? "" : "⬜"}
                        <span style={{ color: o.is_correct ? "#16a34a" : G.dark, fontWeight: o.is_correct ? 700 : 400 }}>{o.option_text}</span>
                        {o.is_correct && <span style={{ marginLeft: "auto", fontSize: 11, color: "#16a34a", fontWeight: 700 }}>Correct answer</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Question Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal(580)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{editQ ? "Edit Question" : "Add Question"}</span>
              <button style={s.iconBtn()} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {/* Type picker */}
              <div style={s.fg}>
                <label style={s.label}>Question Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["multiple_choice", "Multiple Choice"], ["true_false", "True / False"], ["short_answer", "Short Answer"]].map(([v, l]) => (
                    <button key={v} onClick={() => setQType(v)} style={{ flex: 1, padding: "9px 6px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, border: `2px solid ${qType === v ? G.base : G.pale}`, background: qType === v ? G.wash : "#fff", color: qType === v ? G.dark : "#888" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Question Text *</label>
                <textarea style={s.textarea} value={qText} onChange={e => setQText(e.target.value)} placeholder="Type your question here…" />
              </div>
              {qType === "multiple_choice" && (
                <div style={s.fg}>
                  <label style={s.label}>Answer Options — click the circle to mark the correct answer</label>
                  {opts.map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <button onClick={() => setCorrect(i)} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${correct === i ? G.base : G.pale}`, background: correct === i ? G.base : "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
                        {correct === i ? "" : ""}
                      </button>
                      <input style={{ ...s.input, flex: 1 }} value={o} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }} placeholder={`Option ${i + 1}`} />
                      {opts.length > 2 && <button style={s.iconBtn("#dc2626")} onClick={() => { setOpts(opts.filter((_, j) => j !== i)); if (correct >= i) setCorrect(Math.max(0, correct - 1)); }}>×</button>}
                    </div>
                  ))}
                  {opts.length < 6 && <button style={{ ...s.btnSecondary, fontSize: 12, padding: "6px 14px" }} onClick={() => setOpts([...opts, ""])}>+ Add Option</button>}
                </div>
              )}
              {qType === "true_false" && (
                <div style={s.fg}>
                  <label style={s.label}>Correct Answer</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["true", "false"].map(v => (
                      <button key={v} onClick={() => setTfAns(v)} style={{ flex: 1, padding: 14, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15, border: `2px solid ${tfAns === v ? G.base : G.pale}`, background: tfAns === v ? G.wash : "#fff", color: tfAns === v ? G.dark : "#888" }}>
                        {v === "true" ? "True" : "False"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {qType === "short_answer" && (
                <div style={{ background: G.wash, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: G.dark }}>
                  <strong>ℹ️ Short Answer:</strong> Students type a written response. Review manually in the Results tab.
                </div>
              )}
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : editQ ? "Save Changes" : "Add Question"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  RESULTS TAB — student attempts
// ═══════════════════════════════════════════════════════════════════
function ResultsTab({ assessment }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null); // attempt detail modal

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessment_attempts")
      .select("*, profiles(full_name, student_id, email)")
      .eq("assessment_id", assessment.id)
      .order("submitted_at", { ascending: false });
    setAttempts(data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [assessment.id]);

  const loadDetail = async (attempt) => {
    const { data: answers } = await supabase
      .from("assessment_answers")
      .select("*, questions(question_text, question_type), selected_option:question_options!selected_option_id(option_text, is_correct)")
      .eq("attempt_id", attempt.id);
    setSelected({ ...attempt, answers: answers || [] });
  };

  // Stats
  const total    = attempts.length;
  const passed   = attempts.filter(a => a.passed).length;
  const failed   = total - passed;
  const avgScore = total > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / total) : 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading results…</div>;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Attempts", value: total,       color: G.base },
          { label: "Passed",         value: passed,      color: "#16a34a" },
          { label: "Failed",         value: failed,      color: "#dc2626" },
          { label: "Avg Score",      value: `${avgScore}%`, color: "#2563eb" },
          { label: "Pass Rate",      value: `${passRate}%`, color: G.light },
        ].map(stat => (
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {attempts.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-bar-chart me-1"/></div>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No attempts yet</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Student results will appear here once they take the assessment in the app.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE8DD", overflow: "hidden" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Student</th>
                <th style={s.th}>Student ID</th>
                <th style={s.th}>Score</th>
                <th style={s.th}>Result</th>
                <th style={s.th}>Completed</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a => (
                <tr key={a.id} style={{ transition: "background .1s" }}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: G.dark }}>{a.profiles?.full_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{a.profiles?.email || ""}</div>
                  </td>
                  <td style={s.td}>{a.profiles?.student_id || "—"}</td>
                  <td style={s.td}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: a.passed ? "#16a34a" : "#dc2626" }}>{a.score ?? "—"}%</span>
                    <span style={{ fontSize: 11, color: "#aaa", marginLeft: 4 }}>/ {assessment.passing_score}% to pass</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.tag(a.passed ? "green" : "red")}>
                      {a.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td style={s.td}>{formatDate(a.submitted_at)}</td>
                  <td style={s.td}>
                    <button style={s.btnGreen} onClick={() => loadDetail(a)}>View Answers</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attempt detail modal */}
      {selected && (
        <div style={s.overlay}>
          <div style={s.modal(660)}>
            <div style={s.mHeader}>
              <div>
                <div style={s.mTitle}><i className="bi bi-file-earmark-text me-1"/> {selected.profiles?.full_name || "Student"}'s Answers</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  Score: <strong style={{ color: selected.passed ? "#16a34a" : "#dc2626" }}>{selected.score}%</strong>
                  &nbsp;·&nbsp;{selected.passed ? "Passed" : "Failed"}
                  &nbsp;·&nbsp;{formatDate(selected.submitted_at)}
                </div>
              </div>
              <button style={s.iconBtn()} onClick={() => setSelected(null)}>×</button>
            </div>
            <div style={s.mBody}>
              {selected.answers.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>No answer details available.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selected.answers.map((ans, i) => {
                    const isCorrect = ans.selected_option?.is_correct;
                    const isShort   = ans.questions?.question_type === "short_answer";
                    return (
                      <div key={ans.id} style={{ background: isShort ? G.cream : isCorrect ? "#f0fdf4" : "#fff5f5", borderRadius: 10, padding: "14px 16px", border: `1px solid ${isShort ? G.pale : isCorrect ? "#86efac" : "#fca5a5"}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4 }}>Q{i + 1} · {QTYPE[ans.questions?.question_type] || ans.questions?.question_type}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: G.dark, marginBottom: 8 }}>{ans.questions?.question_text}</div>
                        {isShort ? (
                          <div style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}><i className="bi bi-pencil me-1"/> Short answer — review manually</div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={s.tag(isCorrect ? "green" : "red")}>{isCorrect ? "Correct" : "Incorrect"}</span>
                            <span style={{ fontSize: 13, color: G.dark }}>Answered: <strong>{ans.selected_option?.option_text || "—"}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════
function SettingsTab({ assessment, modules, badges, onSaved }) {
  const [form, setForm]   = useState({ ...assessment });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    await supabase.auth.getUser();
    const payload = {
      title:              form.title.trim(),
      description:        form.description?.trim() || null,
      module_id:          form.module_id || null,
      passing_score:      Number(form.passing_score) || 75,
      time_limit_minutes: Number(form.time_limit_minutes) || 30,
      is_published:       form.is_published,
      badge_id:           form.badge_id || null,
    };
    const { error: err } = await supabase.from("assessments").update(payload).eq("id", assessment.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    alert("Assessment settings saved!");
    onSaved();
  };

  const togglePublish = async () => {
    const newVal = !form.is_published;
    setF("is_published", newVal);
    await supabase.from("assessments").update({ is_published: newVal }).eq("id", assessment.id);
    onSaved();
  };

  return (
    <div>
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={s.card}>
        <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 16 }}><i className="bi bi-gear me-1"/> Assessment Settings</div>
        <div style={s.fg}>
          <label style={s.label}>Title *</label>
          <input style={s.input} value={form.title || ""} onChange={e => setF("title", e.target.value)} />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} placeholder="Brief description of this assessment" />
        </div>
        <div style={{ ...s.row, flexWrap: "wrap" }}>
          <div style={{ ...s.fg, flex: 2, minWidth: 180 }}>
            <label style={s.label}>Linked Module</label>
            <select style={s.select} value={form.module_id || ""} onChange={e => setF("module_id", e.target.value)}>
              <option value="">— No module —</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div style={{ ...s.fg, flex: 1, minWidth: 110 }}>
            <label style={s.label}>Passing Score (%)</label>
            <input style={s.input} type="number" min={0} max={100} value={form.passing_score || 75} onChange={e => setF("passing_score", e.target.value)} />
          </div>
          <div style={{ ...s.fg, flex: 1, minWidth: 110 }}>
            <label style={s.label}>Time Limit (min)</label>
            <input style={s.input} type="number" min={1} value={form.time_limit_minutes || 30} onChange={e => setF("time_limit_minutes", e.target.value)} />
          </div>
        </div>
        <div style={s.fg}>
          <label style={s.label}><i className="bi bi-award me-1"/> Badge Awarded on Pass</label>
          <select style={s.select} value={form.badge_id || ""} onChange={e => setF("badge_id", e.target.value)}>
            <option value="">— No badge —</option>
            {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {form.badge_id && <div style={{ marginTop: 6, fontSize: 12, color: G.base, fontWeight: 600 }}><i className="bi bi-check-circle-fill me-1"/> Students who pass will automatically receive this badge.</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: G.dark }}>
              <input type="checkbox" checked={!!form.is_published} onChange={togglePublish} style={{ width: 16, height: 16, accentColor: G.base }} />
              Published (visible to students in app)
            </label>
            <span style={s.tag(form.is_published ? "green" : "yellow")}>{form.is_published ? "Published" : "Draft"}</span>
          </div>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [modules,     setModules]     = useState([]);
  const [badges,      setBadges]      = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [tab,         setTab]         = useState("questions");
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [showAdd,     setShowAdd]     = useState(false);
  const [addForm,     setAddForm]     = useState({});
  const [addSaving,   setAddSaving]   = useState(false);
  const [addError,    setAddError]    = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: m }, { data: b }] = await Promise.all([
        supabase.from("assessments").select("*, modules(title)").order("created_at", { ascending: false }),
        supabase.from("modules").select("id, title").order("title"),
        supabase.from("badges").select("id, name").order("name"),
      ]);
      if (active) {
        setAssessments(a || []);
        setModules(m || []);
        setBadges(b || []);
        if (a?.length) setSelected(a[0]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const { data } = await supabase.from("assessments").select("*, modules(title)").order("created_at", { ascending: false });
    setAssessments(data || []);
    if (selected) setSelected(data?.find(a => a.id === selected.id) || data?.[0] || null);
  };

  const createAssessment = async () => {
    if (!addForm.title?.trim()) { setAddError("Title is required."); return; }
    setAddSaving(true); setAddError("");
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("assessments").insert({
      title:              addForm.title.trim(),
      module_id:          addForm.module_id || null,
      passing_score:      Number(addForm.passing_score) || 75,
      time_limit_minutes: Number(addForm.time_limit_minutes) || 30,
      is_published:       false,
      created_by:         currentUser?.id,
    }).select("*, modules(title)").single();
    setAddSaving(false);
    if (err) { setAddError(err.message); return; }
    setAssessments(as => [data, ...as]);
    setSelected(data); setTab("questions");
    setShowAdd(false); setAddForm({});
  };

  const deleteAssessment = async (a) => {
    if (!confirm(`Delete "${a.title}"? This removes all questions and student results.`)) return;
    await supabase.from("assessments").delete().eq("id", a.id);
    const rest = assessments.filter(x => x.id !== a.id);
    setAssessments(rest);
    setSelected(rest[0] || null);
  };

  const filtered = assessments.filter(a =>
    (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.modules?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHdr}>
          <div style={s.sidebarTitle}><i className="bi bi-clipboard-check me-1"/> Assessments</div>
          <div style={s.sidebarSub}>{assessments.length} total</div>
        </div>
        <button style={s.addBtn} onClick={() => { setAddForm({ passing_score: 75, time_limit_minutes: 30 }); setAddError(""); setShowAdd(true); }}>＋ New Assessment</button>
        <input style={s.searchInput} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.asmList}>
          {loading ? (
            <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>No assessments found</div>
          ) : filtered.map(a => (
            <div key={a.id} style={s.asmItem(selected?.id === a.id)} onClick={() => { setSelected(a); setTab("questions"); }}>
              <div style={s.asmIcon}><i className="bi bi-clipboard-check me-1"/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.asmTitle}>{a.title}</div>
                <div style={s.asmMeta}>{a.modules?.title || "No module"} · {a.passing_score || 75}% to pass</div>
              </div>
              <div style={s.pubDot(a.is_published)} title={a.is_published ? "Published" : "Draft"} />
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={s.main}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, color: "#aaa" }}>
            <span style={{ fontSize: 52 }}><i className="bi bi-clipboard-check me-1"/></span>
            <span style={{ fontWeight: 700, color: G.dark, fontSize: 16 }}>Select an assessment to get started</span>
            <span style={{ fontSize: 13 }}>or create a new one using the button on the left</span>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div style={s.topBar}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.topTitle}>{selected.title}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {selected.modules?.title || "No module"} · {selected.passing_score || 75}% to pass · {selected.time_limit_minutes || 30} min
                </div>
              </div>
              <span style={s.tag(selected.is_published ? "green" : "yellow")}>
                {selected.is_published ? "Published" : "Draft"}
              </span>
              <button style={s.btnDanger} onClick={() => deleteAssessment(selected)}><i className="bi bi-trash me-1"/> Delete</button>
            </div>

            {/* Tab bar */}
            <div style={s.tabBar}>
              <div style={s.tab(tab === "questions")} onClick={() => setTab("questions")}><i className="bi bi-file-earmark-text me-1"/> Questions</div>
              <div style={s.tab(tab === "results")}   onClick={() => setTab("results")}>
                <i className="bi bi-bar-chart me-1"/> Student Results
              </div>
              <div style={s.tab(tab === "settings")}  onClick={() => setTab("settings")}><i className="bi bi-gear me-1"/> Settings</div>
            </div>

            {/* Content */}
            <div style={s.content}>
              {tab === "questions" && <QuestionsTab key={selected.id + "_q"} assessment={selected} />}
              {tab === "results"    && <ResultsTab   key={selected.id + "_r"} assessment={selected} />}
              {tab === "settings"   && <SettingsTab  key={selected.id + "_s"} assessment={selected} modules={modules} badges={badges} onSaved={reload} />}
            </div>
          </>
        )}
      </div>

      {/* ── Create Assessment Modal ── */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal(520)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>Create New Assessment</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {addError && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{addError}</div>}
              <div style={s.fg}>
                <label style={s.label}>Assessment Title *</label>
                <input style={s.input} value={addForm.title || ""} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Week 1 Quiz" autoFocus />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Linked Module</label>
                <select style={s.select} value={addForm.module_id || ""} onChange={e => setAddForm(f => ({ ...f, module_id: e.target.value }))}>
                  <option value="">— Select module —</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Passing Score (%)</label>
                  <input style={s.input} type="number" min={0} max={100} value={addForm.passing_score || 75} onChange={e => setAddForm(f => ({ ...f, passing_score: e.target.value }))} />
                </div>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Time Limit (min)</label>
                  <input style={s.input} type="number" min={1} value={addForm.time_limit_minutes || 30} onChange={e => setAddForm(f => ({ ...f, time_limit_minutes: e.target.value }))} />
                </div>
              </div>
              <div style={{ background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                <i className="bi bi-lightbulb me-1"/> After creating, go to <strong>Questions</strong> tab to add questions, then <strong>Settings</strong> to publish it for students.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: addSaving ? 0.7 : 1 }} onClick={createAssessment} disabled={addSaving}>{addSaving ? "Creating…" : "Create Assessment"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}