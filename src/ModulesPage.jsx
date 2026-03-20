import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark: "#2d4a18", mid: "#3a5a20", base: "#5a7a3a",
  light: "#8ab060", pale: "#b5cc8e", wash: "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

// ── File type helpers ────────────────────────────────────────────
function normalizeFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "aac", "ogg", "flac"].includes(ext)) return "audio";
  return "other"; // pptx, docx, xlsx, txt, zip, etc.
}

const FILE_META = {
  pdf:   { icon: "📄", bg: "#fee2e2" },
  video: { icon: "🎬", bg: "#dbeafe" },
  image: { icon: "🖼️", bg: "#fef9c3" },
  audio: { icon: "🎵", bg: "#f3e8ff" },
  other: { icon: "📎", bg: "#f3f4f6" },
};

function getExtLabel(filename) {
  return filename.split(".").pop().toUpperCase();
}

function formatSize(kb) {
  if (!kb) return "";
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// ── Shared styles ─────────────────────────────────────────────────
const s = {
  page:          { display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: G.cream, overflow: "hidden" },
  sidebar:       { width: 280, minWidth: 280, background: G.dark, display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden" },
  sidebarHeader: { padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  sidebarTitle:  { fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 },
  sidebarSub:    { fontSize: 12, color: G.pale, marginTop: 2 },
  addBtn:        { margin: "12px 16px", padding: "9px 14px", background: G.base, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  moduleList:    { flex: 1, overflowY: "auto", padding: "4px 0" },
  moduleItem:   (active) => ({ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderLeft: active ? `3px solid ${G.light}` : "3px solid transparent", background: active ? "rgba(255,255,255,0.12)" : "transparent", transition: "background .15s" }),
  moduleIcon:    { width: 34, height: 34, borderRadius: 8, background: G.mid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  modTitle:      { fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  modMeta:       { fontSize: 11, color: G.pale, marginTop: 1 },
  statusDot:    (st) => ({ width: 7, height: 7, borderRadius: "50%", background: st === "published" ? "#4ade80" : "#facc15", flexShrink: 0, marginLeft: "auto" }),
  main:          { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:        { background: "#fff", borderBottom: `1px solid ${G.wash}`, padding: "0 24px", display: "flex", alignItems: "center", height: 58, gap: 10, flexShrink: 0 },
  topBarTitle:   { fontSize: 17, fontWeight: 700, color: G.dark, flex: 1 },
  tabBar:        { display: "flex", borderBottom: `1px solid ${G.wash}`, background: "#fff", padding: "0 24px", flexShrink: 0 },
  tab:          (active) => ({ padding: "11px 18px", fontSize: 13, fontWeight: 600, color: active ? G.dark : "#999", borderBottom: active ? `2px solid ${G.dark}` : "2px solid transparent", cursor: "pointer", transition: "all .15s", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }),
  content:       { flex: 1, overflowY: "auto", padding: 24 },
  emptyState:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "#aaa" },
  overlay:       { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:        (w) => ({ background: "#fff", borderRadius: 16, width: "100%", maxWidth: w || 540, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader:       { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:        { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:         { padding: "20px 24px" },
  mFooter:       { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  label:         { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:         { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:        { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  textarea:      { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 80 },
  fg:            { marginBottom: 16 },
  row:           { display: "flex", gap: 12 },
  btnPrimary:    { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  btnSecondary:  { padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  btnDanger:     { padding: "9px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  btnGreen:      { padding: "9px 18px", background: G.base, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 },
  iconBtn:      (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 15, padding: "4px 6px", borderRadius: 6 }),
  tag:          (c) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "yellow" ? "#fef9c3" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "yellow" ? "#a16207" : "#555" }),
  badge:         { background: G.wash, color: G.base, borderRadius: 12, padding: "1px 8px", fontSize: 11, fontWeight: 700 },
};

// ═══════════════════════════════════════════════════════════════════
//  QUESTION MODAL — MC + True/False + Short Answer
// ═══════════════════════════════════════════════════════════════════
function QuestionModal({ onSave, onClose, initial, num }) {
  const [qText, setQText]   = useState(initial?.question_text || "");
  const [qType, setQType]   = useState(initial?.question_type || "multiple_choice");
  const [tfAns, setTfAns]   = useState(() => {
    if (initial?.question_type === "true_false") {
      const c = (initial.question_options || []).find(o => o.is_correct);
      return c?.option_text === "True" ? "true" : "false";
    }
    return "true";
  });
  const [opts, setOpts] = useState(() => {
    if (initial?.question_options?.length) return initial.question_options.map(o => ({ ...o }));
    return ["", "", "", ""].map(t => ({ option_text: t, is_correct: false }));
  });

  const setCorrect  = (i) => setOpts(o => o.map((x, j) => ({ ...x, is_correct: j === i })));
  const updateText  = (i, v) => setOpts(o => o.map((x, j) => j === i ? { ...x, option_text: v } : x));
  const addOpt      = () => setOpts(o => [...o, { option_text: "", is_correct: false }]);
  const removeOpt   = (i) => { if (opts.length > 2) setOpts(o => o.filter((_, j) => j !== i)); };

  const save = () => {
    if (!qText.trim()) return alert("Please enter the question text.");
    let finalOpts = [];
    if (qType === "true_false") {
      finalOpts = [
        { option_text: "True",  is_correct: tfAns === "true"  },
        { option_text: "False", is_correct: tfAns === "false" },
      ];
    } else if (qType === "multiple_choice") {
      if (opts.some(o => !o.option_text.trim())) return alert("Please fill in all options.");
      if (!opts.some(o => o.is_correct)) return alert("Please mark the correct answer.");
      finalOpts = opts;
    }
    // short_answer → no options needed
    onSave({ question_text: qText, question_type: qType, options: finalOpts });
  };

  const TYPE_BTNS = [
    { v: "multiple_choice", label: "🔘 Multiple Choice" },
    { v: "true_false",      label: "✅ True / False"    },
    { v: "short_answer",    label: "✏️ Short Answer"    },
  ];

  return (
    <div style={s.overlay}>
      <div style={s.modal(600)}>
        <div style={s.mHeader}>
          <span style={s.mTitle}>{initial ? `Edit Question ${num}` : "Add Question"}</span>
          <button style={s.iconBtn()} onClick={onClose}>✕</button>
        </div>
        <div style={s.mBody}>
          {/* Type picker */}
          <div style={s.fg}>
            <label style={s.label}>Question Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {TYPE_BTNS.map(t => (
                <button key={t.v} onClick={() => setQType(t.v)} style={{
                  flex: 1, padding: "9px 6px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12,
                  border: `2px solid ${qType === t.v ? G.base : G.pale}`,
                  background: qType === t.v ? G.wash : "#fff",
                  color: qType === t.v ? G.dark : "#888",
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <div style={s.fg}>
            <label style={s.label}>Question *</label>
            <textarea style={s.textarea} value={qText} onChange={e => setQText(e.target.value)} placeholder="Type your question here…" />
          </div>

          {/* Multiple choice options */}
          {qType === "multiple_choice" && (
            <div style={s.fg}>
              <label style={s.label}>Answer Options — click the circle to mark the correct answer</label>
              {opts.map((opt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setCorrect(i)} style={{
                    width: 24, height: 24, borderRadius: "50%", border: `2px solid ${opt.is_correct ? G.base : G.pale}`,
                    background: opt.is_correct ? G.base : "#fff", cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13,
                  }}>{opt.is_correct ? "✓" : ""}</button>
                  <input style={{ ...s.input, flex: 1 }} value={opt.option_text} onChange={e => updateText(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                  <button style={s.iconBtn(opts.length > 2 ? "#dc2626" : "#ccc")} onClick={() => removeOpt(i)} disabled={opts.length <= 2}>✕</button>
                </div>
              ))}
              {opts.length < 6 && (
                <button style={{ ...s.btnSecondary, fontSize: 12, padding: "6px 14px", marginTop: 4 }} onClick={addOpt}>+ Add Option</button>
              )}
            </div>
          )}

          {/* True / False */}
          {qType === "true_false" && (
            <div style={s.fg}>
              <label style={s.label}>Correct Answer</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["true", "false"].map(v => (
                  <button key={v} onClick={() => setTfAns(v)} style={{
                    flex: 1, padding: 14, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15,
                    border: `2px solid ${tfAns === v ? G.base : G.pale}`,
                    background: tfAns === v ? G.wash : "#fff", color: tfAns === v ? G.dark : "#888",
                  }}>{v === "true" ? "✅ True" : "❌ False"}</button>
                ))}
              </div>
            </div>
          )}

          {/* Short answer note */}
          {qType === "short_answer" && (
            <div style={{ background: G.wash, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: G.dark }}>
              <strong>ℹ️ Short Answer:</strong> Students type a written response. These are not auto-graded — review responses manually in the student submissions panel.
            </div>
          )}
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={s.btnPrimary} onClick={save}>{initial ? "Save Changes" : "Add Question"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ASSESSMENT PANEL
// ═══════════════════════════════════════════════════════════════════
function AssessmentPanel({ module }) {
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [badges, setBadges]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [editQ, setEditQ]           = useState(null);
  const [editQIdx, setEditQIdx]     = useState(null);
  const [form, setForm]             = useState({ title: "", passingScore: 75, timeLimit: 30, badgeId: "" });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase.from("assessments").select("*").eq("module_id", module.id).maybeSingle(),
        supabase.from("badges").select("id, name").order("name"),
      ]);
      if (!active) return;
      setBadges(b || []);
      if (a) {
        setAssessment(a);
        setForm({ title: a.title || "", passingScore: a.passing_score || 75, timeLimit: a.time_limit_minutes || 30, badgeId: a.badge_id || "" });
        const { data: qs } = await supabase.from("questions").select("*, question_options(*)").eq("assessment_id", a.id).order("sort_order");
        if (active) setQuestions(qs || []);
      } else {
        setForm(f => ({ ...f, title: `${module.title} — Assessment` }));
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [module.id]);

  const save = async () => {
    if (!questions.length) return alert("Add at least one question before saving.");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      module_id: module.id, title: form.title || `${module.title} — Assessment`,
      passing_score: form.passingScore, time_limit_minutes: form.timeLimit,
      badge_id: form.badgeId || null,
    };

    let aId = assessment?.id;
    if (!aId) {
      const { data: newA, error } = await supabase.from("assessments").insert({ ...payload, created_by: user?.id }).select().single();
      if (error) { alert("Save error: " + error.message); setSaving(false); return; }
      aId = newA.id; setAssessment(newA);
    } else {
      await supabase.from("assessments").update(payload).eq("id", aId);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let qId = q.id;
      if (q._new) {
        const { data: nq } = await supabase.from("questions").insert({ assessment_id: aId, question_text: q.question_text, question_type: q.question_type, sort_order: i }).select().single();
        qId = nq?.id;
      } else {
        await supabase.from("questions").update({ question_text: q.question_text, question_type: q.question_type, sort_order: i }).eq("id", qId);
        await supabase.from("question_options").delete().eq("question_id", qId);
      }
      const opts = q.options || q.question_options || [];
      for (let j = 0; j < opts.length; j++) {
        await supabase.from("question_options").insert({ question_id: qId, option_text: opts[j].option_text, is_correct: opts[j].is_correct, sort_order: j });
      }
    }

    if (assessment?.id) {
      const kept = questions.filter(q => !q._new).map(q => q.id);
      const { data: dbQs } = await supabase.from("questions").select("id").eq("assessment_id", aId);
      for (const dq of (dbQs || [])) {
        if (!kept.includes(dq.id)) {
          await supabase.from("question_options").delete().eq("question_id", dq.id);
          await supabase.from("questions").delete().eq("id", dq.id);
        }
      }
    }
    setSaving(false);
    alert(`✅ Assessment saved! ${questions.length} questions · Passing: ${form.passingScore}%`);
  };

  const addQ    = (d) => { setQuestions(qs => [...qs, { ...d, _new: true, id: `tmp_${Date.now()}` }]); setShowAdd(false); };
  const updateQ = (d) => { setQuestions(qs => qs.map((q, i) => i === editQIdx ? { ...q, ...d } : q)); setEditQ(null); setEditQIdx(null); };
  const deleteQ = (i) => { if (confirm("Remove this question?")) setQuestions(qs => qs.filter((_, j) => j !== i)); };
  const moveQ   = (i, dir) => { const qs = [...questions]; const t = i + dir; if (t < 0 || t >= qs.length) return; [qs[i], qs[t]] = [qs[t], qs[i]]; setQuestions(qs); };

  const QLABELS = { multiple_choice: "Multiple Choice", true_false: "True / False", short_answer: "Short Answer" };
  const QICONS  = { multiple_choice: "🔘", true_false: "✅", short_answer: "✏️" };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  return (
    <div>
      {/* Settings */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 20, border: `1px solid ${G.wash}`, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 16 }}>⚙️ Assessment Settings</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 3, minWidth: 200 }}>
            <label style={s.label}>Title</label>
            <input style={s.input} value={form.title} onChange={e => setF("title", e.target.value)} placeholder="e.g. Week 1 Quiz" />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <label style={s.label}>Passing Score (%)</label>
            <input style={s.input} type="number" min={0} max={100} value={form.passingScore} onChange={e => setF("passingScore", +e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <label style={s.label}>Time Limit (min)</label>
            <input style={s.input} type="number" min={1} value={form.timeLimit} onChange={e => setF("timeLimit", +e.target.value)} />
          </div>
        </div>

        {/* Badge award */}
        <div style={{ marginTop: 14 }}>
          <label style={s.label}>🏅 Auto-award badge when student passes</label>
          <select style={s.select} value={form.badgeId} onChange={e => setF("badgeId", e.target.value)}>
            <option value="">— No badge award —</option>
            {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {form.badgeId && (
            <div style={{ marginTop: 8, fontSize: 12, color: G.base, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              ✅ Badge will be automatically awarded to students who achieve {form.passingScore}% or higher.
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "💾 Save Assessment"}
          </button>
        </div>
      </div>

      {/* Question list header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>Questions</span>
          <span style={s.badge}>{questions.length}</span>
        </div>
        <button style={{ ...s.btnGreen, fontSize: 12, padding: "7px 16px" }} onClick={() => setShowAdd(true)}>+ Add Question</button>
      </div>

      {/* Empty */}
      {questions.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📝</div>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No questions yet</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18 }}>Add multiple choice, true/false, or short answer questions</div>
          <button style={s.btnGreen} onClick={() => setShowAdd(true)}>+ Add First Question</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((q, i) => {
            const opts = q.options || q.question_options || [];
            return (
              <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${G.wash}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${G.wash}`, background: G.cream, gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: G.base }}>Q{i + 1}</span>
                  <span style={{ fontSize: 11, background: G.wash, color: G.dark, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                    {QICONS[q.question_type]} {QLABELS[q.question_type]}
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                    <button style={s.iconBtn("#aaa")} onClick={() => moveQ(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button style={s.iconBtn("#aaa")} onClick={() => moveQ(i, 1)} disabled={i === questions.length - 1} title="Move down">↓</button>
                    <button style={s.iconBtn(G.base)} onClick={() => { setEditQ(q); setEditQIdx(i); }} title="Edit">✏️</button>
                    <button style={s.iconBtn("#dc2626")} onClick={() => deleteQ(i)} title="Delete">🗑️</button>
                  </div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.dark, marginBottom: 10, lineHeight: 1.5 }}>{q.question_text}</div>
                  {q.question_type === "short_answer" ? (
                    <div style={{ background: G.wash, borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "#999", fontStyle: "italic" }}>✏️ Students will type a written response</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {opts.map((o, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, background: o.is_correct ? "#dcfce7" : "#f9fafb", border: `1px solid ${o.is_correct ? "#86efac" : "#e5e7eb"}`, fontSize: 13 }}>
                          {o.is_correct ? "✅" : "⬜"}
                          <span style={{ color: o.is_correct ? "#16a34a" : G.dark, fontWeight: o.is_correct ? 700 : 400 }}>{o.option_text}</span>
                          {o.is_correct && <span style={{ marginLeft: "auto", fontSize: 11, color: "#16a34a", fontWeight: 700 }}>Correct answer</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd  && <QuestionModal num={questions.length + 1} onSave={addQ} onClose={() => setShowAdd(false)} />}
      {editQ    && <QuestionModal initial={editQ} num={editQIdx + 1} onSave={updateQ} onClose={() => { setEditQ(null); setEditQIdx(null); }} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  FILES PANEL
// ═══════════════════════════════════════════════════════════════════
function FilesPanel({ module }) {
  const [files, setFiles]           = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [dragging, setDragging]     = useState(false);
  const ref = useRef();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("module_files").select("*").eq("module_id", module.id).order("sort_order");
      if (active) setFiles(data || []);
    })();
    return () => { active = false; };
  }, [module.id]);

  const upload = async (file) => {
    setUploading(true); setUploadName(file.name);
    const { data: { user } } = await supabase.auth.getUser();
    const fileType = normalizeFileType(file.name);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${module.id}/${Date.now()}_${safe}`;
    const { error } = await supabase.storage.from("module-files").upload(path, file);
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("module-files").getPublicUrl(path);
    const { data: row } = await supabase.from("module_files").insert({
      module_id: module.id, file_name: file.name, file_url: publicUrl,
      file_type: fileType, file_size_kb: Math.round(file.size / 1024),
      sort_order: files.length, uploaded_by: user?.id,
    }).select().single();
    if (row) setFiles(f => [...f, row]);
    setUploading(false); setUploadName("");
  };

  const onDrop  = async (e) => { e.preventDefault(); setDragging(false); for (const f of Array.from(e.dataTransfer.files)) await upload(f); };
  const onPick  = async (e) => { for (const f of Array.from(e.target.files)) await upload(f); e.target.value = ""; };

  const del = async (file) => {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    const [, path] = file.file_url.split("/module-files/");
    if (path) await supabase.storage.from("module-files").remove([path]);
    await supabase.from("module_files").delete().eq("id", file.id);
    setFiles(f => f.filter(x => x.id !== file.id));
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => !uploading && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ border: `2px dashed ${dragging ? G.base : G.pale}`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: uploading ? "default" : "pointer", transition: "all .2s", background: dragging ? G.wash : "transparent", marginBottom: 16 }}
      >
        {uploading ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>Uploading "{uploadName}"…</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Please wait</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📤</div>
            <div style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>Drop files here or click to upload</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>PDF · Video (MP4, MOV) · Images · Audio · PowerPoint · Word · Excel · ZIP</div>
          </>
        )}
        <input ref={ref} type="file" multiple style={{ display: "none" }} onChange={onPick}
          accept=".pdf,.mp4,.mov,.avi,.webm,.mkv,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.txt,.zip" />
      </div>

      {files.length === 0 ? (
        <div style={{ ...s.emptyState, height: 100, fontSize: 13 }}>No files yet — upload above to add learning content</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#999", fontWeight: 600, marginBottom: 4 }}>{files.length} file{files.length !== 1 ? "s" : ""} uploaded</div>
          {files.map(file => {
            const ft = FILE_META[file.file_type] || FILE_META.other;
            return (
              <div key={file.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: `1px solid ${G.wash}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: ft.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{ft.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: G.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.file_name}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ background: G.wash, padding: "1px 7px", borderRadius: 5, fontWeight: 700, color: G.base }}>{getExtLabel(file.file_name)}</span>
                    {file.file_size_kb ? <span>{formatSize(file.file_size_kb)}</span> : null}
                  </div>
                </div>
                <a href={file.file_url} target="_blank" rel="noreferrer"
                  style={{ ...s.btnSecondary, textDecoration: "none", fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}>👁️ View</a>
                <button style={s.iconBtn("#dc2626")} onClick={() => del(file)} title="Delete">🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MODULE FORM MODAL
// ═══════════════════════════════════════════════════════════════════
function ModuleModal({ initial, categories, onSave, onClose }) {
  const [form, setForm] = useState({ title: initial?.title || "", description: initial?.description || "", category_id: initial?.category_id || "", status: initial?.status || "draft" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={s.overlay}>
      <div style={s.modal(520)}>
        <div style={s.mHeader}>
          <span style={s.mTitle}>{initial ? "Edit Module" : "Create New Module"}</span>
          <button style={s.iconBtn()} onClick={onClose}>✕</button>
        </div>
        <div style={s.mBody}>
          <div style={s.fg}>
            <label style={s.label}>Module Title *</label>
            <input style={s.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Gender Sensitivity Training" autoFocus />
          </div>
          <div style={s.fg}>
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What will students learn in this module?" />
          </div>
          <div style={s.row}>
            <div style={{ ...s.fg, flex: 1 }}>
              <label style={s.label}>Category</label>
              <select style={s.select} value={form.category_id} onChange={e => set("category_id", e.target.value)}>
                <option value="">— Select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ ...s.fg, flex: 1 }}>
              <label style={s.label}>Status</label>
              <select style={s.select} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="draft">📝 Draft</option>
                <option value="published">✅ Published</option>
              </select>
            </div>
          </div>
          <div style={{ background: G.wash, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark }}>
            💡 Set to <strong>Published</strong> so students can see this module in the app.
          </div>
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={s.btnPrimary} onClick={() => { if (!form.title.trim()) return alert("Title required."); onSave(form); }}>{initial ? "Save Changes" : "Create Module"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function ModulesPage() {
  const [modules, setModules]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tab, setTab]             = useState("files");
  const [showModal, setShowModal] = useState(false);
  const [editMod, setEditMod]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: mods }, { data: cats }] = await Promise.all([
        supabase.from("modules").select("*, categories(name), module_files(count), assessments(id)").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);
      if (active) {
        setModules(mods || []);
        setCategories(cats || []);
        if (mods?.length) setSelected(mods[0]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const saveModule = async (form) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (editMod) {
      const { data } = await supabase.from("modules").update(form).eq("id", editMod.id).select("*, categories(name), module_files(count), assessments(id)").single();
      setModules(ms => ms.map(m => m.id === editMod.id ? data : m));
      if (selected?.id === editMod.id) setSelected(data);
    } else {
      const { data } = await supabase.from("modules").insert({ ...form, created_by: user?.id }).select("*, categories(name), module_files(count), assessments(id)").single();
      setModules(ms => [data, ...ms]); setSelected(data);
    }
    setShowModal(false); setEditMod(null);
  };

  const togglePublish = async (mod, e) => {
    e?.stopPropagation();
    const newStatus = mod.status === "published" ? "draft" : "published";
    await supabase.from("modules").update({ status: newStatus }).eq("id", mod.id);
    const updated = { ...mod, status: newStatus };
    setModules(ms => ms.map(m => m.id === mod.id ? updated : m));
    if (selected?.id === mod.id) setSelected(updated);
  };

  const deleteMod = async () => {
    if (!selected || !confirm(`Delete "${selected.title}"? This is permanent.`)) return;
    await supabase.from("modules").delete().eq("id", selected.id);
    const rest = modules.filter(m => m.id !== selected.id);
    setModules(rest); setSelected(rest[0] || null);
  };

  const filtered  = modules.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  const fileCount = (m) => m?.module_files?.[0]?.count || 0;
  const hasAssess = (m) => (m?.assessments?.length || 0) > 0;

  return (
    <div style={s.page}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.sidebarTitle}>📚 Modules</div>
          <div style={s.sidebarSub}>{modules.length} module{modules.length !== 1 ? "s" : ""}</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…"
            style={{ ...s.input, marginTop: 10, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 12 }} />
        </div>
        <button style={s.addBtn} onClick={() => { setEditMod(null); setShowModal(true); }}>＋ New Module</button>
        <div style={s.moduleList}>
          {loading ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>Loading…</div>
            : !filtered.length ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>{search ? "No results" : "No modules yet"}</div>
            : filtered.map(mod => (
              <div key={mod.id} style={s.moduleItem(selected?.id === mod.id)} onClick={() => { setSelected(mod); setTab("files"); }}>
                <div style={s.moduleIcon}>📗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.modTitle}>{mod.title}</div>
                  <div style={s.modMeta}>{mod.categories?.name || "Uncategorized"} · {fileCount(mod)} file{fileCount(mod) !== 1 ? "s" : ""}{hasAssess(mod) ? " · 📝" : ""}</div>
                </div>
                <div style={s.statusDot(mod.status)} title={mod.status} />
              </div>
            ))
          }
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        {!selected ? (
          <div style={{ ...s.emptyState, flex: 1 }}>
            <span style={{ fontSize: 52 }}>📚</span>
            <span style={{ fontWeight: 700, color: G.dark, fontSize: 16 }}>Select a module to get started</span>
            <span style={{ fontSize: 13 }}>or create a new one using the button on the left</span>
          </div>
        ) : (
          <>
            <div style={s.topBar}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.topBarTitle}>{selected.title}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {selected.categories?.name || "Uncategorized"}
                  {selected.description ? ` · ${selected.description.slice(0, 60)}…` : ""}
                </div>
              </div>
              <span style={s.tag(selected.status === "published" ? "green" : "yellow")}>
                {selected.status === "published" ? "✅ Published" : "📝 Draft"}
              </span>
              <button style={{ ...s.btnSecondary, fontSize: 12, padding: "7px 14px" }} onClick={e => togglePublish(selected, e)}>
                {selected.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button style={{ ...s.btnSecondary, fontSize: 12, padding: "7px 14px" }} onClick={() => { setEditMod(selected); setShowModal(true); }}>✏️ Edit</button>
              <button style={{ ...s.btnDanger, fontSize: 12, padding: "7px 14px" }} onClick={deleteMod}>🗑️</button>
            </div>

            <div style={s.tabBar}>
              <div style={s.tab(tab === "files")} onClick={() => setTab("files")}>
                📁 Files {fileCount(selected) > 0 && <span style={s.badge}>{fileCount(selected)}</span>}
              </div>
              <div style={s.tab(tab === "assessment")} onClick={() => setTab("assessment")}>
                📝 Assessment {hasAssess(selected) && <span style={{ ...s.badge, background: "#dcfce7", color: "#16a34a" }}>✓</span>}
              </div>
            </div>

            <div style={s.content}>
              {tab === "files"      && <FilesPanel      key={selected.id + "_f"} module={selected} />}
              {tab === "assessment" && <AssessmentPanel key={selected.id + "_a"} module={selected} />}
            </div>
          </>
        )}
      </div>

      {showModal && <ModuleModal initial={editMod} categories={categories} onSave={saveModule} onClose={() => { setShowModal(false); setEditMod(null); }} />}
    </div>
  );
}