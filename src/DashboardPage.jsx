import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabase.js";

/* ─── Navigation helper ──────────────────────────────────────
 * The admin panel switches pages through the sidebar (App.jsx),
 * not through React Router. App.jsx passes its page switcher in
 * as `onNavigate`, so "View all →" opens the right page.
 */
function useSafeNavigate(onNavigate) {
  return useCallback((path) => {
    const page = String(path || "").replace(/^\//, "");
    if (onNavigate) onNavigate(page);
  }, [onNavigate]);
}

/* ─── date helpers (Philippine time) ─────────────────────── */
const MANILA = "Asia/Manila";
// "YYYY-MM-DD" in Philippine time (UTC+8), not UTC
const getToday    = () => new Date().toLocaleDateString("en-CA", { timeZone: MANILA });
const getMonthAgo = () => new Date(Date.now()-30*86400000).toLocaleDateString("en-CA", { timeZone: MANILA });

function toISO(d, end=false) {
  if (!d) return null;
  return end ? `${d}T23:59:59.999+08:00` : `${d}T00:00:00.000+08:00`;
}

function fmt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-PH", {
      timeZone:MANILA, month:"short", day:"numeric",
      hour:"2-digit", minute:"2-digit", hour12:true,
    });
  } catch { return "—"; }
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      timeZone:MANILA, month:"short", day:"numeric", year:"numeric",
    });
  } catch { return "—"; }
}

function toDateStr(iso) {
  if (!iso) return "";
  // Plain dates ("YYYY-MM-DD") are already local dates — keep them as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0,10);
  return d.toLocaleDateString("en-CA", { timeZone: MANILA });
}

const PRESETS = [
  {label:"Today",     days:0},
  {label:"This Week", days:7},
  {label:"This Month",days:30},
  {label:"This Year", days:365},
  {label:"All Time",  days:-1},
];

/* ─── Chart.js loader (de-duped) ──────────────────────────── */
let _chartPromise = null;
function loadChart() {
  if (!_chartPromise) {
    _chartPromise = new Promise(resolve => {
      if (window.Chart) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
      s.onload = resolve;
      s.onerror = () => { _chartPromise = null; resolve(); };
      document.head.appendChild(s);
    });
  }
  return _chartPromise;
}

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
  :root {
    --bloom-dark:   #1A2E1A;
    --bloom-mid:    #2D6A2D;
    --bloom-light:  #4CAF50;
    --bloom-bg:     #F5F7F5;
    --bloom-border: #E8F5E9;
    --bloom-muted:  #9EAD9E;
  }
  .dash-stat-card {
    border: none !important;
    border-radius: 12px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,.06) !important;
    overflow: hidden;
    transition: transform .18s, box-shadow .18s;
    height: 100%;
  }
  .dash-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,.1) !important;
  }
  .dash-stat-card .stat-bar { height: 4px; }
  .dash-welcome-card {
    background: linear-gradient(135deg, var(--bloom-dark) 0%, var(--bloom-mid) 60%, var(--bloom-light) 100%);
    border-radius: 14px !important;
    border: none !important;
    color: #fff;
    overflow: hidden;
    position: relative;
    height: 100%;
  }
  .dash-welcome-card::before {
    content: '';
    position: absolute; width: 200px; height: 200px;
    border-radius: 50%; background: rgba(255,255,255,.05);
    top: -60px; right: -40px; pointer-events: none;
  }
  .dash-welcome-card::after {
    content: '';
    position: absolute; width: 120px; height: 120px;
    border-radius: 50%; background: rgba(255,255,255,.04);
    bottom: -30px; right: 60px; pointer-events: none;
  }
  .dash-chart-card {
    border-radius: 12px !important;
    border: 1px solid var(--bloom-border) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,.05) !important;
    height: 100%;
  }
  .section-header-line {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 14px;
  }
  .section-header-line h6 {
    font-size: 13px; font-weight: 700;
    color: var(--bloom-dark); margin: 0;
  }
  .progress-bloom { height: 6px; border-radius: 4px; background: var(--bloom-border); }
  .progress-bloom .progress-bar { border-radius: 4px; }
  .stat-trend-up   { color: #107C10; font-size: 11px; font-weight: 700; }
  .stat-trend-down { color: #C50F1F; font-size: 11px; font-weight: 700; }
  .dash-scroll-body {
    overflow-y: auto; overflow-x: hidden;
    scrollbar-width: thin; scrollbar-color: #ccc transparent;
  }
  .dash-scroll-body::-webkit-scrollbar { width: 4px; }
  .dash-scroll-body::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
  .dash-fixed-card   .card-body { height: 320px; display: flex; flex-direction: column; }
  .dash-fixed-card-lg .card-body { height: 400px; display: flex; flex-direction: column; }
  .cal-cell { transition: background .12s; cursor: pointer; }
  .cal-cell:hover { background: #E8F5E9 !important; }
  .ev-item { transition: background .12s, box-shadow .12s; cursor: pointer; }
  .ev-item:hover { background: #f0fdf4 !important; box-shadow: 0 2px 10px rgba(0,0,0,.07) !important; }
  /* view-all nav button */
  .dash-viewall-btn {
    font-size: 11px;
    background: #E8F5E9;
    color: var(--bloom-dark);
    font-weight: 600;
    text-decoration: none;
    border: none;
    border-radius: 6px;
    padding: 2px 10px;
    cursor: pointer;
    transition: background .15s;
  }
  .dash-viewall-btn:hover { background: #C8E6C9; color: var(--bloom-dark); }
  .bloom-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000; padding: 16px;
    animation: fadeIn .15s ease;
  }
  .bloom-modal {
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 500px;
    max-height: 88vh; overflow: auto;
    box-shadow: 0 24px 64px rgba(0,0,0,.22);
    animation: slideUp .18s ease;
  }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .dash-animate { animation: fadeUp .25s ease both; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .refreshing-pulse { animation: pulse 1.2s ease-in-out infinite; }
  .skeleton {
    background: linear-gradient(90deg,#e8ede8 25%,#f0f4f0 50%,#e8ede8 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .ev-badge-event        { background:#E8F5E9; color:#1A2E1A; }
  .ev-badge-seminar      { background:#DBEAFE; color:#1D4ED8; }
  .ev-badge-announcement { background:#FEF3C7; color:#92400E; }
`;

/* ─── Calendar data fetchers ──────────────────────────────── */
// Custom calendar events: read whatever date/colour/location columns the
// events table uses (the Calendar page and Dashboard must agree).
const normalizeEvent = (e) => {
  const start = toDateStr(e.start_date ?? e.event_date ?? e.date ?? e.start_time ?? e.starts_at ?? null);
  const end   = toDateStr(e.end_date ?? e.end_time ?? e.ends_at ?? null) || start;
  return {
    ...e,
    start_date:  start,
    end_date:    end < start ? start : end,
    location:    e.location ?? e.venue ?? "",
    description: e.description ?? "",
    color_hex:   e.color_hex ?? e.color ?? "#2D6A2D",
    event_type:  e.event_type ?? e.type ?? e.category ?? "event",
    _source:     "event",
  };
};
/**
 * Events, seminars, and announcements for a calendar window.
 * monthFrom / monthTo are plain "YYYY-MM-DD" strings (Philippine dates).
 * Each source is fetched separately so one failing table never hides the others.
 */
async function fetchMergedCalendarEvents(monthFrom, monthTo) {
  const [evRes, semRes, annRes] = await Promise.allSettled([
    supabase.from("events").select("*").limit(1000),

    supabase
      .from("seminars")
      .select("id,title,scheduled_start,scheduled_end,status,venue,description")
      .gte("scheduled_start", toISO(monthFrom))
      .lte("scheduled_start", toISO(monthTo, true)),

    supabase
      .from("announcements")
      .select("id,title,body,content,published_at,is_pinned")
      .not("published_at", "is", null)
      .gte("published_at", toISO(monthFrom))
      .lte("published_at", toISO(monthTo, true)),
  ]);

  const pick = (res, label) => {
    if (res.status !== "fulfilled") { console.error(`[Cal] ${label}:`, res.reason); return []; }
    if (res.value.error) { console.error(`[Cal] ${label}:`, res.value.error.message); return []; }
    return res.value.data || [];
  };
  const evData  = pick(evRes,  "events");
  const semData = pick(semRes, "seminars");
  const annData = pick(annRes, "announcements");

  const evNorm = evData.map(normalizeEvent)
    .filter(e => e.start_date && e.start_date <= monthTo && e.end_date >= monthFrom);

  const semNorm = semData.map(s => ({
    id:              `sem_${s.id}`,
    _rawId:          s.id,
    title:           s.title,
    start_date:      toDateStr(s.scheduled_start),
    end_date:        toDateStr(s.scheduled_end || s.scheduled_start),
    scheduled_start: s.scheduled_start,
    scheduled_end:   s.scheduled_end,
    description:     s.description || "",
    location:        s.venue || "",
    color_hex:       "#2563EB",
    event_type:      "seminar",
    _source:         "seminar",
    _status:         s.status,
  }));

  const annNorm = annData.map(a => ({
    id:          `ann_${a.id}`,
    _rawId:      a.id,
    title:       a.title,
    start_date:  toDateStr(a.published_at),
    end_date:    toDateStr(a.published_at),
    description: a.body || a.content || "",
    color_hex:   "#f59e0b",
    event_type:  "announcement",
    _source:     "announcement",
    is_pinned:   a.is_pinned,
  }));

  return [...evNorm, ...semNorm, ...annNorm]
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
}


/**
 * Upcoming (and still-running) events and seminars for the
 * "Upcoming Events & Seminars" widget. Cancelled/completed seminars are excluded.
 */
async function fetchUpcomingMerged() {
  const todayStr = getToday();           // Philippine date
  const now      = Date.now();
  // Look back 30 days so seminars that started earlier but are still running are included
  const lookback = new Date(now - 30*86400000).toISOString();

  const [evRes, semRes] = await Promise.allSettled([
    supabase.from("events").select("*").limit(1000),

    supabase
      .from("seminars")
      .select("id,title,scheduled_start,scheduled_end,status,venue,description")
      .gte("scheduled_start", lookback)
      .order("scheduled_start", { ascending: true })
      .limit(100),
  ]);

  // One failing source shouldn't hide the other — only fail if both fail
  let failures = 0;
  const pick = (res, label) => {
    if (res.status !== "fulfilled") { console.error(`[Upcoming] ${label}:`, res.reason); failures++; return []; }
    if (res.value.error) { console.error(`[Upcoming] ${label}:`, res.value.error.message); failures++; return []; }
    return res.value.data || [];
  };
  const evData  = pick(evRes,  "events");
  const semData = pick(semRes, "seminars")
    // still upcoming or currently running, and not cancelled/completed
    .filter(s => {
      const status = (s.status || "").toLowerCase();
      if (status === "cancelled" || status === "completed") return false;
      const endsAt = new Date(s.scheduled_end || s.scheduled_start).getTime();
      return status === "ongoing" || endsAt >= now || toDateStr(s.scheduled_start) >= todayStr;
    });
  if (failures === 2) throw new Error("Failed to load events");

  // Custom events that haven't ended yet
  const evNorm = evData.map(normalizeEvent)
    .filter(e => e.start_date && e.end_date >= todayStr);

  const semNorm = semData.map(s => ({
    id:              `sem_${s.id}`,
    _rawId:          s.id,
    title:           s.title,
    start_date:      toDateStr(s.scheduled_start),
    end_date:        toDateStr(s.scheduled_end || s.scheduled_start),
    scheduled_start: s.scheduled_start,
    scheduled_end:   s.scheduled_end,
    description:     s.description || "",
    location:        s.venue || "",
    color_hex:       "#2563EB",
    event_type:      "seminar",
    _source:         "seminar",
    _status:         s.status,
  }));

  return [...evNorm, ...semNorm]
    .sort((a, b) => (a.scheduled_start || a.start_date || "").localeCompare(b.scheduled_start || b.start_date || ""));
}


/* ─── Sub-components ──────────────────────────────────────── */
function StatCard({icon, label, value, sub, color}) {
  return (
    <div className="card dash-stat-card">
      <div className="card-body p-3 d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div className="text-uppercase fw-bold mb-1"
              style={{fontSize:10,letterSpacing:.8,color:"var(--bloom-muted)"}}>
              {label}
            </div>
            <div style={{fontSize:26,fontWeight:800,color:"var(--bloom-dark)",lineHeight:1}}>
              {value ?? "—"}
            </div>
            {sub && <small className="text-muted" style={{fontSize:11}}>{sub}</small>}
          </div>
          <div className="d-flex align-items-center justify-content-center rounded-3"
            style={{width:42,height:42,background:`${color}15`,flexShrink:0}}>
            <i className={`bi ${icon}`} style={{fontSize:19,color}}/>
          </div>
        </div>
      </div>
      <div className="stat-bar" style={{background:color}}/>
    </div>
  );
}

/** Section header with an optional "View all →" button. */
function SH({title, icon, badge, action, onAction, linkTo, onLinkClick}) {
  return (
    <div className="section-header-line">
      <h6>
        <i className={`bi ${icon} me-2`} style={{color:"var(--bloom-mid)"}}/>
        {title}
        {badge != null && (
          <span className="badge ms-2 rounded-pill"
            style={{background:"#E8F5E9",color:"var(--bloom-dark)",fontSize:10}}>
            {badge}
          </span>
        )}
      </h6>
      <div className="d-flex gap-1">
        {action && (
          <button className="btn btn-sm btn-outline-secondary py-0 px-2"
            style={{fontSize:11}} onClick={onAction}>
            {action}
          </button>
        )}
        {linkTo && onLinkClick && (
          <button
            className="dash-viewall-btn"
            onClick={onLinkClick}
          >
            View all →
          </button>
        )}
      </div>
    </div>
  );
}

function MBar({label, value, max, color, sub}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1">
        <span className="text-truncate fw-semibold"
          style={{fontSize:12,color:"var(--bloom-dark)",maxWidth:180}} title={label}>
          {label}
        </span>
        <span className="fw-bold ms-2"
          style={{fontSize:12,color:"var(--bloom-dark)",flexShrink:0}}>
          {sub ?? `${pct}%`}
        </span>
      </div>
      <div className="progress-bloom">
        <div className="progress-bar" style={{width:`${pct}%`,background:color||"var(--bloom-mid)"}}/>
      </div>
    </div>
  );
}

function Empty({icon, msg}) {
  return (
    <div className="text-center py-4 text-muted flex-grow-1 d-flex flex-column align-items-center justify-content-center">
      <i className={`bi ${icon} d-block mb-2`} style={{fontSize:28,opacity:.4}}/>
      <span style={{fontSize:13}}>{msg}</span>
    </div>
  );
}

function ErrorState({msg, onRetry}) {
  return (
    <div className="text-center py-3 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
      <i className="bi bi-exclamation-circle d-block mb-2 text-danger" style={{fontSize:24,opacity:.6}}/>
      <span className="text-muted" style={{fontSize:12}}>{msg || "Failed to load"}</span>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger mt-2 py-0 px-2"
          style={{fontSize:11}} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function SourceBadge({ev}) {
  if (ev._source === "seminar")      return <span className="badge ev-badge-seminar"      style={{fontSize:9,fontWeight:700}}>Seminar</span>;
  if (ev._source === "announcement") return <span className="badge ev-badge-announcement" style={{fontSize:9,fontWeight:700}}>Announcement</span>;
  const label = ev.event_type ? ev.event_type.charAt(0).toUpperCase()+ev.event_type.slice(1) : "Event";
  return <span className="badge ev-badge-event" style={{fontSize:9,fontWeight:700}}>{label}</span>;
}

/* ─── Day Events Modal ────────────────────────────────────── */
function DayEventsModal({date, events, onClose}) {
  const label = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday:"long", month:"long", day:"numeric", year:"numeric",
  });
  return (
    <div className="bloom-overlay" onClick={onClose}>
      <div className="bloom-modal" onClick={e => e.stopPropagation()}>
        <div className="d-flex align-items-start justify-content-between p-4 pb-3"
          style={{borderBottom:"1px solid #E8F5E9",position:"sticky",top:0,background:"#fff",zIndex:1}}>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"var(--bloom-dark)"}}>{label}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>
              {events.length} item{events.length!==1?"s":""}
            </div>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={onClose}>✕</button>
        </div>
        <div className="p-4">
          {events.length === 0 ? (
            <Empty icon="bi-calendar-x" msg="Nothing scheduled on this date"/>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {events.map(ev => (
                <div key={ev.id} style={{
                  borderLeft:`4px solid ${ev.color_hex||"#2D6A2D"}`,
                  background:(ev.color_hex||"#2D6A2D")+"12",
                  borderRadius:"0 10px 10px 0",
                  padding:"12px 14px",
                }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <SourceBadge ev={ev}/>
                    {ev._status && (
                      <span className="badge bg-light text-secondary" style={{fontSize:9,textTransform:"uppercase"}}>{ev._status}</span>
                    )}
                  </div>
                  <div style={{fontWeight:700,color:"var(--bloom-dark)",fontSize:14,marginBottom:4}}>
                    {ev.title}
                  </div>
                  <div style={{fontSize:12,color:"#666",marginBottom:4}}>
                    {ev.scheduled_start
                      ? fmt(ev.scheduled_start)
                      : fmtDate(ev.start_date)}
                    {ev.scheduled_end && ev.scheduled_end !== ev.scheduled_start
                      ? ` → ${fmt(ev.scheduled_end)}`
                      : ev.end_date && ev.end_date !== ev.start_date
                        ? ` → ${fmtDate(ev.end_date)}`
                        : ""}
                  </div>
                  {ev.location && (
                    <div style={{fontSize:12,color:"#888",marginBottom:4}}>
                      <i className="bi bi-geo-alt me-1"/>{ev.location}
                    </div>
                  )}
                  {ev.description && (
                    <div style={{fontSize:12,color:"#555",lineHeight:1.5,marginTop:6,whiteSpace:"pre-wrap"}}>
                      {ev.description}
                    </div>
                  )}
                  {ev.is_pinned && (
                    <span className="badge mt-2" style={{background:"#FEF3C7",color:"#92400E",fontSize:9}}>
                      📌 Pinned
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="d-flex justify-content-end p-3 pt-0">
          <button className="btn btn-sm" style={{background:"#E8F5E9",color:"var(--bloom-dark)",fontWeight:600}}
            onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Event Detail Modal ──────────────────────────────────── */
function EventDetailModal({ev, onClose}) {
  if (!ev) return null;
  const startLabel = ev.scheduled_start ? fmt(ev.scheduled_start) : fmtDate(ev.start_date);
  const endLabel   = ev.scheduled_end   ? fmt(ev.scheduled_end)   : (ev.end_date && ev.end_date !== ev.start_date ? fmtDate(ev.end_date) : null);
  const borderColor = ev.color_hex || "#2D6A2D";
  return (
    <div className="bloom-overlay" onClick={onClose}>
      <div className="bloom-modal" style={{maxWidth:460}} onClick={e => e.stopPropagation()}>
        <div style={{height:6,borderRadius:"16px 16px 0 0",background:borderColor}}/>
        <div className="d-flex align-items-start justify-content-between px-4 pt-4 pb-3"
          style={{borderBottom:"1px solid #E8F5E9"}}>
          <div style={{flex:1,minWidth:0}}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <SourceBadge ev={ev}/>
              {ev._status && (
                <span className="badge" style={{
                  background:ev._status==="upcoming"?"#DBEAFE":ev._status==="ongoing"?"#DCFCE7":"#F3F4F6",
                  color:ev._status==="upcoming"?"#1D4ED8":ev._status==="ongoing"?"#16A34A":"#666",
                  fontSize:9,fontWeight:700,textTransform:"uppercase",
                }}>
                  {ev._status}
                </span>
              )}
            </div>
            <div style={{fontWeight:800,fontSize:17,color:"var(--bloom-dark)",lineHeight:1.3}}>
              {ev.title}
            </div>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-2 ms-3 flex-shrink-0"
            onClick={onClose}>✕</button>
        </div>
        <div className="px-4 py-3" style={{display:"flex",flexDirection:"column",gap:10}}>
          <div className="d-flex align-items-start gap-3 p-3 rounded-3"
            style={{background:"#F5F7F5"}}>
            <i className="bi bi-calendar-event" style={{color:"var(--bloom-mid)",fontSize:16,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--bloom-dark)"}}>
                {startLabel}
              </div>
              {endLabel && (
                <div style={{fontSize:12,color:"#888",marginTop:2}}>
                  Ends: {endLabel}
                </div>
              )}
            </div>
          </div>
          {ev.location && (
            <div className="d-flex align-items-start gap-3 p-3 rounded-3"
              style={{background:"#F5F7F5"}}>
              <i className="bi bi-geo-alt" style={{color:"var(--bloom-mid)",fontSize:16,marginTop:2}}/>
              <div style={{fontSize:13,color:"var(--bloom-dark)"}}>{ev.location}</div>
            </div>
          )}
          {ev.description && (
            <div className="p-3 rounded-3" style={{background:"#F5F7F5"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>
                Description
              </div>
              <div style={{fontSize:13,color:"#444",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{ev.description}</div>
            </div>
          )}
          {ev.is_pinned && (
            <span className="badge align-self-start" style={{background:"#FEF3C7",color:"#92400E",fontSize:10}}>
              📌 Pinned Announcement
            </span>
          )}
        </div>
        <div className="d-flex justify-content-end p-3 pt-0">
          <button className="btn btn-sm" style={{background:"#E8F5E9",color:"var(--bloom-dark)",fontWeight:600}}
            onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Calendar ───────────────────────────────────────── */
function MiniCalendar({date, setDate, calEvents, onDayClick}) {
  const year      = date.getFullYear();
  const month     = date.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month+1, 0).getDate();
  const todayStr  = getToday(); // Philippine date

  const dayMap = useMemo(() => {
    const map = {};
    (calEvents||[]).forEach(ev => {
      const start = (ev.start_date||"").slice(0,10);
      const end   = (ev.end_date||ev.start_date||"").slice(0,10);
      if (!start) return;
      const s = new Date(start+"T00:00:00");
      const e = new Date((end||start)+"T00:00:00");
      for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
        if (d.getFullYear()===year && d.getMonth()===month) {
          const key = d.getDate();
          if (!map[key]) map[key] = [];
          map[key].push(ev);
        }
      }
    });
    return map;
  }, [calEvents, year, month]);

  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMo; d++) cells.push(d);

  const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  return (
    <div style={{userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setDate(new Date(year,month-1,1))} aria-label="Previous month"
          style={{background:"none",border:"none",cursor:"pointer",color:"var(--bloom-dark)",fontSize:18,padding:"2px 8px",borderRadius:6,lineHeight:1}}>
          ‹
        </button>
        <div style={{fontWeight:700,fontSize:13,color:"var(--bloom-dark)"}}>
          {date.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}
        </div>
        <button onClick={()=>setDate(new Date(year,month+1,1))} aria-label="Next month"
          style={{background:"none",border:"none",cursor:"pointer",color:"var(--bloom-dark)",fontSize:18,padding:"2px 8px",borderRadius:6,lineHeight:1}}>
          ›
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"#aaa",padding:"2px 0"}}>
            {d}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i) => {
          if (!d) return <div key={`e${i}`}/>;
          const dateStr    = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isToday    = dateStr === todayStr;
          const dayEvents  = dayMap[d] || [];
          const hasEvent   = dayEvents.some(ev => ev._source==="event");
          const hasSeminar = dayEvents.some(ev => ev._source==="seminar");
          const hasAnn     = dayEvents.some(ev => ev._source==="announcement");
          const hasAny     = dayEvents.length > 0;

          return (
            <div
              key={d}
              className="cal-cell"
              onClick={() => onDayClick(dateStr, dayEvents)}
              title={hasAny ? `${dayEvents.length} item${dayEvents.length>1?"s":""}` : ""}
              style={{
                textAlign:"center",padding:"5px 2px",borderRadius:6,fontSize:12,
                fontWeight:isToday?800:400,
                background:isToday?"var(--bloom-mid)":hasAny?"#F0FAF0":"transparent",
                color:isToday?"#fff":"#444",
                position:"relative",
                border: hasAny && !isToday ? "1px solid #C8E6C9" : "1px solid transparent",
              }}>
              {d}
              {hasAny && (
                <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:2,flexWrap:"wrap"}}>
                  {hasEvent   && <div style={{width:4,height:4,borderRadius:"50%",background:isToday?"#fff":"var(--bloom-mid)"}}/>}
                  {hasSeminar && <div style={{width:4,height:4,borderRadius:"50%",background:isToday?"#fff":"#2563EB"}}/>}
                  {hasAnn     && <div style={{width:4,height:4,borderRadius:"50%",background:isToday?"#fff":"#f59e0b"}}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{display:"flex",gap:10,marginTop:10,fontSize:10,color:"#888",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <div style={{width:10,height:10,borderRadius:2,background:"var(--bloom-mid)"}}/> Today
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"var(--bloom-mid)"}}/> Event
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#2563EB"}}/> Seminar
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#f59e0b"}}/> Announcement
        </div>
      </div>
    </div>
  );
}

/* ─── Chart canvases ─────────────────────────────────────── */
function BarCanvas({data, version}) {
  const ref=useRef(null), chart=useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadChart().then(() => {
      if (cancelled || !ref.current || !window.Chart) return;
      if (chart.current) chart.current.destroy();
      chart.current = new window.Chart(ref.current, {
        type:"bar",
        data:{
          labels:data.map(d=>d.label),
          datasets:[{
            data:data.map(d=>d.value),
            backgroundColor:data.map((_,i)=>`rgba(45,106,45,${0.4+i*0.09})`),
            borderRadius:5, borderSkipped:false,
          }],
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>`${c.raw} action${c.raw===1?"":"s"}`}}},
          scales:{
            y:{beginAtZero:true,grid:{color:"rgba(0,0,0,.04)"},ticks:{font:{size:10},color:"#9E9E9E",precision:0}},
            x:{grid:{display:false},ticks:{font:{size:10},color:"#9E9E9E"}},
          },
        },
      });
    });
    return () => { cancelled = true; if (chart.current) { chart.current.destroy(); chart.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return <div style={{position:"relative",height:180}}><canvas ref={ref}/></div>;
}

function DonutCanvas({segments, version}) {
  const ref=useRef(null), chart=useRef(null);
  useEffect(() => {
    if (!segments.length) return;
    let cancelled = false;
    loadChart().then(() => {
      if (cancelled || !ref.current || !window.Chart) return;
      if (chart.current) chart.current.destroy();
      const total = segments.reduce((s,g)=>s+g.value, 0);
      chart.current = new window.Chart(ref.current, {
        type:"doughnut",
        data:{
          labels:segments.map(s=>s.label),
          datasets:[{
            data:segments.map(s=>s.value),
            backgroundColor:["#2D6A2D","#4CAF50","#81C784","#A5D6A7","#C8E6C9"],
            borderWidth:3, borderColor:"#fff",
          }],
        },
        options:{
          responsive:true, maintainAspectRatio:false, cutout:"70%",
          plugins:{
            legend:{position:"bottom",labels:{font:{size:11},boxWidth:10,padding:12,color:"#616161"}},
            tooltip:{callbacks:{label:(c)=>`${c.label}: ${c.raw} (${total?Math.round((c.raw/total)*100):0}%)`}},
          },
        },
      });
    });
    return () => { cancelled = true; if (chart.current) { chart.current.destroy(); chart.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return <div style={{position:"relative",height:180}}><canvas ref={ref}/></div>;
}

/* ─── Skeleton ────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="p-4">
      <div className="skeleton mb-2" style={{width:220,height:26}}/>
      <div className="skeleton mb-4" style={{width:140,height:14}}/>
      <div className="row g-3 mb-4">
        {Array.from({length:8}).map((_,i)=>(
          <div key={i} className="col-xl-3 col-md-4 col-6">
            <div className="card" style={{height:100,borderRadius:12}}>
              <div className="card-body p-3">
                <div className="skeleton mb-2" style={{height:11,width:"55%"}}/>
                <div className="skeleton" style={{height:28,width:"35%"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      {[220,280,340].map((h,i)=>(
        <div key={i} className="row g-3 mb-3">
          {[6,6].map((span,j)=>(
            <div key={j} className={`col-lg-${span}`}>
              <div className="skeleton" style={{height:h,borderRadius:12}}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function DashboardPage({ onNavigate }) {
  const navigate = useSafeNavigate(onNavigate);

  /* ── state ── */
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors,     setErrors]     = useState({});

  const [fromDate, setFromDate] = useState(getMonthAgo);
  const [toDate,   setToDate]   = useState(getToday);
  const [preset,   setPreset]   = useState("This Month");

  // stats
  const [stats,       setStats]       = useState({});
  const [adminName,   setAdminName]   = useState("");
  const [modStats,    setModStats]    = useState([]);
  const [semStats,    setSemStats]    = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [certStats,   setCertStats]   = useState({});
  const [assessStats, setAssessStats] = useState({});
  const [recentMods,  setRecentMods]  = useState([]);
  const [weeklyAct,   setWeeklyAct]   = useState([]);

  // calendar
  const [calDate,        setCalDate]        = useState(new Date());
  const [calEvents,      setCalEvents]      = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // modals
  const [dayModal,    setDayModal]    = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // chart version counters
  const [chartBarVer,   setChartBarVer]   = useState(0);
  const [chartDonutVer, setChartDonutVer] = useState(0);

  // Realtime channel refs
  const channelsRef = useRef([]);

  /* ── Calendar window: previous month → end of next month ── */
  const getMonthWindow = useCallback((d) => {
    const y = d.getFullYear(), m = d.getMonth();
    const prev = new Date(y, m-1, 1);
    const next = new Date(y, m+2, 0); // last day of next month
    const pad = n => String(n).padStart(2,"0");
    const from = `${prev.getFullYear()}-${pad(prev.getMonth()+1)}-01`;
    const to   = `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}`;
    return { from, to };
  }, []);

  /* ── [C] fetch calendar events ── */
  const refreshCalEvents = useCallback(async (forDate) => {
    const { from, to } = getMonthWindow(forDate);
    try {
      const merged = await fetchMergedCalendarEvents(from, to);
      setCalEvents(merged);
    } catch(e) {
      console.error("[Dashboard] calEvents:", e);
    }
  }, [getMonthWindow]);

  /* ── [D] fetch upcoming events ── */
  const refreshUpcoming = useCallback(async () => {
    try {
      const merged = await fetchUpcomingMerged();
      setUpcomingEvents(merged);
      setErrors(prev => { const { upcoming, ...rest } = prev; return rest; });
    } catch(e) {
      console.error("[Dashboard] upcoming:", e);
      setErrors(prev => ({...prev, upcoming:"Failed to load events"}));
    }
  }, []);

  /* ── stat cards: all-time totals + how many were added in the selected period ── */
  const fetchStats = useCallback(async (from, to) => {
    const f = toISO(from), t = toISO(to, true);
    const rng = (q, col="created_at") => {
      if (f) q = q.gte(col, f);
      if (t) q = q.lte(col, t);
      return q;
    };
    const count = (table) => supabase.from(table).select("*",{count:"exact",head:true});
    const nowIso = new Date().toISOString();

    const queries = [
      // all-time totals
      count("modules"),
      count("modules").eq("status","published"),
      count("assessments"),
      count("seminars"),
      count("seminars").gte("scheduled_start", nowIso).not("status","in","(cancelled,completed)"),
      count("certificates").eq("is_revoked",false),
      count("student_badges"),
      count("assessment_attempts"),
      supabase.from("user_roles").select("user_id, roles!inner(name)",{count:"exact",head:true}).eq("roles.name","student"),
      // added in the selected period
      rng(count("modules")),
      rng(count("assessments")),
      rng(count("seminars")),
      rng(count("certificates").eq("is_revoked",false),"issued_at"),
      rng(count("student_badges"),"awarded_at"),
      rng(count("assessment_attempts"),"submitted_at"),
      rng(supabase.from("user_roles").select("user_id, roles!inner(name)",{count:"exact",head:true}).eq("roles.name","student"),"assigned_at"),
    ];
    const results = await Promise.allSettled(queries);
    const get = i => (results[i].status==="fulfilled" && !results[i].value.error) ? (results[i].value.count ?? 0) : null;
    if (get(0) === null && get(3) === null && get(8) === null) throw new Error("Could not load statistics");

    setStats({
      totalMods:get(0), pubMods:get(1), totalAssess:get(2),
      totalSems:get(3), upcomingSems:get(4), totalCerts:get(5),
      totalBadges:get(6), totalAttempts:get(7), students:get(8),
      newMods:get(9), newAssess:get(10), newSems:get(11), newCerts:get(12),
      newBadges:get(13), newAttempts:get(14), newStudents:get(15),
    });

    // Signed-in admin's name for the greeting
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setAdminName((me?.full_name || "").trim());
    }
  }, []);

  const fetchModStats = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_module_completion_stats")
      .select("*").order("completion_rate_percent",{ascending:false}).limit(6);
    if (error) throw new Error("Module stats failed");
    setModStats(data ?? []);
  }, []);

  const fetchSemStats = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_seminar_attendance_summary")
      .select("*").order("scheduled_start",{ascending:false}).limit(5);
    if (error) throw new Error("Seminar stats failed");
    setSemStats(data ?? []);
  }, []);

  const fetchLeaderboard = useCallback(async (from, to) => {
    let q = supabase.from("student_badges").select("user_id,awarded_at,profiles(full_name)");
    if (from) q = q.gte("awarded_at", toISO(from));
    if (to)   q = q.lte("awarded_at", toISO(to, true));
    const { data, error } = await q;
    if (error) throw new Error("Leaderboard failed");
    const map = {};
    (data??[]).forEach((r,i)=>{
      const uid = r.user_id??`u${i}`;
      if (!map[uid]) map[uid]={uid,name:r.profiles?.full_name||"—",count:0};
      map[uid].count++;
    });
    setLeaderboard(Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5));
  }, []);

  const fetchCertStats = useCallback(async (from, to) => {
    let q = supabase.from("certificates").select("reference_type,is_revoked,issued_at");
    if (from) q = q.gte("issued_at", toISO(from));
    if (to)   q = q.lte("issued_at", toISO(to, true));
    const { data, error } = await q;
    if (error) throw new Error("Certificate stats failed");
    const rows = data ?? [];
    const byType={}, valid=rows.filter(c=>!c.is_revoked).length;
    rows.filter(c=>!c.is_revoked).forEach(c=>{
      const t=(c.reference_type??"manual");
      const label=t.charAt(0).toUpperCase()+t.slice(1);
      byType[label]=(byType[label]??0)+1;
    });
    setCertStats({byType,valid,revoked:rows.length-valid,total:rows.length});
    setChartDonutVer(v=>v+1);
  }, []);

  const fetchAssessStats = useCallback(async (from, to) => {
    let q = supabase.from("assessment_attempts").select("score,passed,submitted_at");
    if (from) q = q.gte("submitted_at", toISO(from));
    if (to)   q = q.lte("submitted_at", toISO(to, true));
    const { data, error } = await q;
    if (error) throw new Error("Assessment stats failed");
    if (!data||!data.length) { setAssessStats({}); return; }
    const passed = data.filter(a=>a.passed).length;
    const scored = data.filter(a=>typeof a.score==="number");
    const avg    = scored.length ? Math.round(scored.reduce((s,a)=>s+a.score,0)/scored.length) : null;
    setAssessStats({total:data.length,passed,failed:data.length-passed,avg,passRate:Math.round((passed/data.length)*100)});
  }, []);

  const fetchRecentMods = useCallback(async (from, to) => {
    let q = supabase.from("modules").select("id,title,status,created_at")
      .order("created_at",{ascending:false}).limit(5);
    if (from) q = q.gte("created_at", toISO(from));
    if (to)   q = q.lte("created_at", toISO(to, true));
    const { data, error } = await q;
    if (error) throw new Error("Recent modules failed");
    setRecentMods(data??[]);
  }, []);

  /* ── Activity chart: the 7 days ending on the "To" date (Philippine time) ── */
  const fetchWeeklyAct = useCallback(async (to) => {
    const endStr = to || getToday();
    const end    = new Date(`${endStr}T00:00:00+08:00`);
    const days   = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(end.getTime() - i*86400000);
      days.push(d.toLocaleDateString("en-CA", { timeZone: MANILA }));
    }
    const { data, error } = await supabase.from("activity_logs")
      .select("created_at")
      .gte("created_at", toISO(days[0]))
      .lte("created_at", toISO(days[6], true));
    if (error) throw new Error("Activity chart failed");

    const buckets = {};
    days.forEach(ds => {
      const label = new Date(`${ds}T12:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: MANILA, weekday:"short" });
      buckets[ds] = { label, value: 0 };
    });
    (data??[]).forEach(r=>{
      const key = new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: MANILA });
      if (buckets[key]) buckets[key].value++;
    });
    setWeeklyAct(days.map(ds => buckets[ds]));
    setChartBarVer(v=>v+1);
  }, []);

  /* ── Ref to always hold the latest calDate (avoids stale closures) ── */
  const calDateRef = useRef(calDate);
  useEffect(() => { calDateRef.current = calDate; }, [calDate]);

  /* ── fetchAll orchestrator ── */
  const fetchAll = useCallback(async (from, to, isRefresh=false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setErrors({});
    const currentCalDate = calDateRef.current;
    const run = async (key, fn) => {
      try { await fn(); }
      catch(err) {
        console.error(`[Dashboard] ${key}:`, err);
        setErrors(prev => ({...prev, [key]:err.message??"Failed"}));
      }
    };
    await Promise.allSettled([
      run("stats",       ()=>fetchStats(from,to)),
      run("modStats",    ()=>fetchModStats()),
      run("semStats",    ()=>fetchSemStats()),
      run("leaderboard", ()=>fetchLeaderboard(from,to)),
      run("certStats",   ()=>fetchCertStats(from,to)),
      run("assessStats", ()=>fetchAssessStats(from,to)),
      run("recentMods",  ()=>fetchRecentMods(from,to)),
      run("weeklyAct",   ()=>fetchWeeklyAct(to)),
      run("calEvents",   ()=>refreshCalEvents(currentCalDate)),
      refreshUpcoming(),
    ]);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [
    fetchStats, fetchModStats, fetchSemStats, fetchLeaderboard,
    fetchCertStats, fetchAssessStats, fetchRecentMods, fetchWeeklyAct,
    refreshCalEvents, refreshUpcoming,
  ]);

  /* ── Initial load ── */
  useEffect(() => {
    const today    = getToday();
    const monthAgo = getMonthAgo();
    setFromDate(monthAgo); setToDate(today);
    fetchAll(monthAgo, today);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime: keep calendar and upcoming list fresh ── */
  useEffect(() => {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const handleCalChange  = () => { refreshCalEvents(calDateRef.current); };
    const handleBothChange = () => { refreshCalEvents(calDateRef.current); refreshUpcoming(); };

    const evCh = supabase
      .channel("dash-events-v4")
      .on("postgres_changes", {event:"*", schema:"public", table:"events"},        handleBothChange)
      .subscribe((status) => { if (status === "CHANNEL_ERROR") console.warn("[Dashboard] events channel error"); });

    const semCh = supabase
      .channel("dash-seminars-v4")
      .on("postgres_changes", {event:"*", schema:"public", table:"seminars"},      handleBothChange)
      .subscribe((status) => { if (status === "CHANNEL_ERROR") console.warn("[Dashboard] seminars channel error"); });

    const annCh = supabase
      .channel("dash-announcements-v4")
      .on("postgres_changes", {event:"*", schema:"public", table:"announcements"}, handleCalChange)
      .subscribe((status) => { if (status === "CHANNEL_ERROR") console.warn("[Dashboard] announcements channel error"); });

    channelsRef.current = [evCh, semCh, annCh];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [refreshCalEvents, refreshUpcoming]);

  /* ── Re-fetch calendar dots when the month changes ── */
  useEffect(() => {
    refreshCalEvents(calDate);
  }, [calDate, refreshCalEvents]);

  /* ── applyPreset ── */
  const applyPreset = useCallback((p) => {
    const today = getToday();
    setPreset(p.label);
    let from;
    if      (p.days===-1) from = "2020-01-01";
    else if (p.days===0)  from = today;
    else from = new Date(Date.now() - p.days*86400000).toLocaleDateString("en-CA", { timeZone: MANILA });
    setFromDate(from); setToDate(today);
    fetchAll(from, today, true);
  }, [fetchAll]);

  /* ── Day click handler ── */
  const handleDayClick = useCallback((dateStr, dayEvents) => {
    setDayModal({ date: dateStr, events: dayEvents });
  }, []);

  /* ── derived ── */
  const certSegs    = Object.entries(certStats.byType??{}).map(([t,v])=>({label:t,value:v}));
  const draftCount  = Math.max(0, (stats.totalMods??0)-(stats.pubMods??0));
  const hour        = Number(new Date().toLocaleString("en-US", { timeZone: MANILA, hour:"numeric", hour12:false })) % 24;
  const greeting    = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const firstName   = adminName ? adminName.split(" ")[0] : "Admin";
  const periodLabel = preset === "Custom" ? "this period" : preset === "All Time" ? "all time" : preset.toLowerCase();
  const plus        = (n) => n == null ? null : `+${n} ${periodLabel}`;
  const show        = (n) => n == null ? "—" : n;

  if (loading) return <DashboardSkeleton/>;

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>
      <div className="p-4" style={{background:"var(--bloom-bg)",minHeight:"100vh"}}>

        {/* ── Page header ── */}
        <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <h4 className="fw-bold mb-1" style={{color:"var(--bloom-dark)",fontSize:22}}>
              {greeting}, {firstName}
              {refreshing && (
                <span className="ms-2 refreshing-pulse"
                  style={{fontSize:13,color:"var(--bloom-mid)",fontWeight:400}}>
                  <i className="bi bi-arrow-repeat me-1"/>Refreshing…
                </span>
              )}
            </h4>
            <p className="mb-0" style={{fontSize:13,color:"#6C757D"}}>
              Here's what's happening in your GADRC system today.
            </p>
          </div>

          {/* Date filter bar */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm" role="group">
              {PRESETS.map(p=>(
                <button key={p.label} type="button" onClick={()=>applyPreset(p)} disabled={refreshing}
                  className={`btn ${preset===p.label?"btn-primary":"btn-outline-secondary"}`}
                  style={{fontSize:11,fontWeight:preset===p.label?700:400}}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="d-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
              <i className="bi bi-calendar3 text-muted" style={{fontSize:13}}/>
              <input type="date" className="border-0 p-0 bg-transparent"
                style={{fontSize:11,width:110,outline:"none",color:"var(--bloom-dark)",colorScheme:"light"}}
                value={fromDate} max={toDate}
                onChange={e=>{const v=e.target.value; if(!v||v>toDate) return; setFromDate(v);setPreset("Custom");fetchAll(v,toDate,true);}}/>
              <span className="text-muted" style={{fontSize:12}}>—</span>
              <input type="date" className="border-0 p-0 bg-transparent"
                style={{fontSize:11,width:110,outline:"none",color:"var(--bloom-dark)",colorScheme:"light"}}
                value={toDate} min={fromDate} max={getToday()}
                onChange={e=>{const v=e.target.value; if(!v||v<fromDate) return; setToDate(v);setPreset("Custom");fetchAll(fromDate,v,true);}}/>
            </div>
            <button className="btn btn-sm btn-outline-secondary"
              style={{fontSize:11}} disabled={refreshing}
              onClick={()=>fetchAll(fromDate,toDate,true)}>
              <i className={`bi bi-arrow-clockwise me-1 ${refreshing?"refreshing-pulse":""}`}/>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Row 1: 8 stat cards (all-time totals, with what was added in the period) ── */}
        <div className="row g-3 mb-4">
          {[
            {icon:"bi-mortarboard",     label:"Students",      value:show(stats.students),      sub:plus(stats.newStudents),                                               color:"#1A2E1A"},
            {icon:"bi-book",            label:"Modules",       value:show(stats.totalMods),     sub:`${stats.pubMods??0} published · ${draftCount} draft`,                 color:"#2D6A2D"},
            {icon:"bi-clipboard-check", label:"Assessments",   value:show(stats.totalAssess),   sub:plus(stats.newAssess),                                                 color:"#2563EB"},
            {icon:"bi-people",          label:"Seminars",      value:show(stats.totalSems),     sub:`${stats.upcomingSems??0} upcoming`,                                   color:"#7C3AED"},
            {icon:"bi-award",           label:"Badges Earned", value:show(stats.totalBadges),   sub:plus(stats.newBadges),                                                 color:"#D97706"},
            {icon:"bi-patch-check",     label:"Certificates",  value:show(stats.totalCerts),    sub:plus(stats.newCerts),                                                  color:"#059669"},
            {icon:"bi-pencil-square",   label:"Quiz Attempts", value:show(stats.totalAttempts), sub:plus(stats.newAttempts),                                               color:"#0891B2"},
            {icon:"bi-graph-up-arrow",  label:"Pass Rate",     value:assessStats.passRate!=null?`${assessStats.passRate}%`:"—", sub:`quiz attempts, ${periodLabel}`, color:"#DC2626"},
          ].map((c,i)=>(
            <div key={i} className="col-xl-3 col-md-4 col-6 dash-animate"
              style={{animationDelay:`${i*0.04}s`}}>
              <StatCard {...c}/>
            </div>
          ))}
        </div>

        {/* ── Row 2: Welcome card + Activity chart ── */}
        <div className="row g-3 mb-3">
          <div className="col-lg-4">
            <div className="card dash-welcome-card p-4">
              <div style={{position:"relative",zIndex:1}}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{width:42,height:42,background:"rgba(255,255,255,.2)"}}>
                    <i className="bi bi-flower2 text-white" style={{fontSize:20}}/>
                  </div>
                  <div>
                    <div className="fw-bold text-white" style={{fontSize:15}}>BLOOM GAD</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>GADRC CvSU</div>
                  </div>
                </div>
                <h5 className="fw-bold text-white mb-2" style={{fontSize:18}}>
                  Welcome back,<br/>{adminName || "GADRC Admin"}!
                </h5>
                <p style={{fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.7,marginBottom:20}}>
                  Manage GAD learning modules, track student progress, run seminars, and issue certificates — all from one dashboard.
                </p>
                <div className="row g-2">
                  {[
                    {label:"Total Students",  value:show(stats.students),     icon:"bi-people"},
                    {label:"Published Mods",  value:show(stats.pubMods),      icon:"bi-book"},
                    {label:"Upcoming Sems",   value:show(stats.upcomingSems), icon:"bi-calendar3"},
                  ].map(s=>(
                    <div key={s.label} className="col-4">
                      <div className="text-center p-2 rounded-3"
                        style={{background:"rgba(255,255,255,.12)"}}>
                        <i className={`bi ${s.icon} d-block mb-1 text-white`} style={{fontSize:16}}/>
                        <div className="fw-bold text-white" style={{fontSize:16}}>{s.value}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:.4}}>
                          {s.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card dash-chart-card">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between mb-3 flex-wrap gap-2">
                  <SH title="System Activity (Last 7 Days)" icon="bi-bar-chart-line"/>
                  <div>
                    <div className="text-end mb-1" style={{fontSize:9,color:"#999",textTransform:"uppercase",letterSpacing:.4,fontWeight:700}}>
                      Quiz results · {periodLabel}
                    </div>
                    <div className="d-flex gap-3">
                      {[
                        {label:"Attempts",  value:assessStats.total??0,                             color:"#2563EB"},
                        {label:"Passed",    value:assessStats.passed??0,                            color:"#059669"},
                        {label:"Failed",    value:assessStats.failed??0,                            color:"#DC2626"},
                        {label:"Avg Score", value:assessStats.avg!=null?`${assessStats.avg}%`:"—",  color:"#2D6A2D"},
                      ].map(s=>(
                        <div key={s.label} className="text-center">
                          <div className="fw-bold" style={{fontSize:15,color:s.color}}>{s.value}</div>
                          <small className="text-muted" style={{fontSize:9,textTransform:"uppercase",letterSpacing:.4}}>{s.label}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {errors.weeklyAct
                  ? <ErrorState msg={errors.weeklyAct} onRetry={()=>fetchWeeklyAct(toDate).catch(()=>{})}/>
                  : weeklyAct.length>0 && weeklyAct.some(d=>d.value>0)
                    ? <BarCanvas data={weeklyAct} version={chartBarVer}/>
                    : <Empty icon="bi-bar-chart" msg="No activity in these 7 days"/>
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Module bars + Certs donut + Leaderboard ── */}
        <div className="row g-3 mb-3">
          <div className="col-lg-4">
            <div className="card dash-chart-card dash-fixed-card">
              <div className="card-body p-3">
                <SH title="Module Completion Rate" icon="bi-book"/>
                {errors.modStats
                  ? <ErrorState msg={errors.modStats} onRetry={()=>fetchModStats().then(()=>setErrors(p=>{const{modStats,...r}=p;return r;})).catch(()=>{})}/>
                  : modStats.length===0
                    ? <Empty icon="bi-book" msg="No data yet"/>
                    : <div className="dash-scroll-body flex-grow-1">
                        {modStats.map((m,i)=>(
                          <MBar key={m.module_id??i}
                            label={m.module_title??"Untitled"}
                            value={m.completion_rate_percent??0} max={100}
                            color={["#1A2E1A","#2D6A2D","#3A7A3A","#4CAF50","#81C784","#A5D6A7"][i]||"#2D6A2D"}
                            sub={`${m.completion_rate_percent??0}% · ${m.completed_count??0}/${m.total_students??0}`}
                          />
                        ))}
                      </div>
                }
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card dash-chart-card dash-fixed-card">
              <div className="card-body p-3">
                <SH title={`Certificates Issued · ${periodLabel}`} icon="bi-patch-check"/>
                {errors.certStats
                  ? <ErrorState msg={errors.certStats} onRetry={()=>fetchCertStats(fromDate,toDate).catch(()=>{})}/>
                  : !certStats.total
                    ? <Empty icon="bi-patch-check" msg="None issued in this period"/>
                    : <>
                        {certSegs.length>0 && <DonutCanvas segments={certSegs} version={chartDonutVer}/>}
                        <div className="row g-2 mt-2">
                          <div className="col-6">
                            <div className="rounded-3 text-center py-2" style={{background:"#DFF6DD"}}>
                              <div className="fw-bold text-success" style={{fontSize:18}}>{certStats.valid??0}</div>
                              <small className="text-success fw-semibold" style={{fontSize:9,textTransform:"uppercase"}}>Valid</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="rounded-3 text-center py-2" style={{background:"#FDE7E9"}}>
                              <div className="fw-bold text-danger" style={{fontSize:18}}>{certStats.revoked??0}</div>
                              <small className="text-danger fw-semibold" style={{fontSize:9,textTransform:"uppercase"}}>Revoked</small>
                            </div>
                          </div>
                        </div>
                      </>
                }
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card dash-chart-card dash-fixed-card">
              <div className="card-body p-3">
                <SH title={`Badge Leaderboard · ${periodLabel}`} icon="bi-trophy"/>
                {errors.leaderboard
                  ? <ErrorState msg={errors.leaderboard} onRetry={()=>fetchLeaderboard(fromDate,toDate).catch(()=>{})}/>
                  : leaderboard.length===0
                    ? <Empty icon="bi-award" msg="No badges earned in this period"/>
                    : <div className="dash-scroll-body flex-grow-1">
                        {leaderboard.map((r,i)=>(
                          <div key={r.uid}
                            className="d-flex align-items-center gap-3 p-2 rounded-3 mb-1"
                            style={{background:i===0?"linear-gradient(135deg,#F9FBE7,#E8F5E9)":"transparent"}}>
                            <div className="fw-bold text-center"
                              style={{width:24,fontSize:i<3?18:13,color:i===0?"#F59E0B":i===1?"#9E9E9E":i===2?"#CD7F32":"#6C757D"}}>
                              #{i+1}
                            </div>
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                              style={{width:32,height:32,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:12}}>
                              {(r.name||"?").slice(0,1).toUpperCase()}
                            </div>
                            <span className="flex-grow-1 text-truncate fw-semibold" style={{fontSize:12}}>{r.name}</span>
                            <span className="badge rounded-pill" style={{background:"#FEF3C7",color:"#D97706",fontSize:11}}>
                              <i className="bi bi-award me-1"/>{r.count}
                            </span>
                          </div>
                        ))}
                      </div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Calendar + Upcoming Events ── */}
        <div className="row g-3 mb-3">
          <div className="col-lg-4">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Calendar" icon="bi-calendar3"
                  badge={calEvents.length||undefined}/>
                <MiniCalendar
                  date={calDate}
                  setDate={setCalDate}
                  calEvents={calEvents}
                  onDayClick={handleDayClick}
                />
                <div className="mt-3 pt-3" style={{borderTop:"1px solid #E8F5E9"}}>
                  <div style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>
                    {calDate.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    {(() => {
                      const ym = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,"0")}`;
                      const inMonth = calEvents.filter(e => (e.start_date||"").startsWith(ym) || ((e.start_date||"") < ym && (e.end_date||"") >= ym));
                      return [
                        {label:"Events",        count:inMonth.filter(e=>e._source==="event").length,        color:"var(--bloom-mid)"},
                        {label:"Seminars",      count:inMonth.filter(e=>e._source==="seminar").length,      color:"#2563EB"},
                        {label:"Announcements", count:inMonth.filter(e=>e._source==="announcement").length, color:"#f59e0b"},
                      ];
                    })().map(s=>(
                      <div key={s.label} className="text-center px-2 py-1 rounded-2"
                        style={{background:"#F5F7F5",minWidth:64}}>
                        <div style={{fontWeight:800,fontSize:16,color:s.color}}>{s.count}</div>
                        <div style={{fontSize:10,color:"#888"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card dash-chart-card dash-fixed-card-lg">
              <div className="card-body p-3">
                <SH
                  title="Upcoming Events & Seminars"
                  icon="bi-calendar-event"
                  badge={upcomingEvents.length||undefined}
                  linkTo="/calendar"
                  onLinkClick={() => navigate("/calendar")}
                />
                {errors.upcoming
                  ? <ErrorState msg={errors.upcoming} onRetry={refreshUpcoming}/>
                  : upcomingEvents.length===0
                    ? <Empty icon="bi-calendar-x" msg="No upcoming events — add one from the Calendar page"/>
                    : <div className="dash-scroll-body flex-grow-1" style={{paddingRight:4}}>
                        {upcomingEvents.slice(0,12).map(ev=>{
                          const evDateStr = ev.scheduled_start ? toDateStr(ev.scheduled_start) : ev.start_date;
                          const dt        = evDateStr ? new Date(`${evDateStr}T12:00:00+08:00`) : null;
                          const todayStr  = getToday();
                          const tomorrow  = new Date(new Date(`${todayStr}T12:00:00+08:00`).getTime()+86400000).toLocaleDateString("en-CA",{timeZone:MANILA});
                          const isToday    = evDateStr===todayStr;
                          const isTomorrow = evDateStr===tomorrow;
                          const dayLabel   = isToday?"Today":isTomorrow?"Tomorrow"
                            : dt ? dt.toLocaleDateString("en-PH",{timeZone:MANILA,month:"short",day:"numeric",weekday:"short"}) : "—";
                          const timeLabel  = ev.scheduled_start
                            ? new Date(ev.scheduled_start).toLocaleTimeString("en-PH",{timeZone:MANILA,hour:"2-digit",minute:"2-digit",hour12:true})
                            : "";
                          const borderColor = ev.color_hex || "#2D6A2D";
                          return (
                            <div key={ev.id}
                              className="ev-item"
                              onClick={()=>setDetailModal(ev)}
                              style={{
                                display:"flex",alignItems:"center",gap:12,
                                padding:"10px 14px",marginBottom:8,
                                background:isToday?"#f0fdf4":"#fafafa",
                                borderRadius:10,
                                border:`1px solid ${isToday?"#86efac":"#e5e7eb"}`,
                                borderLeft:`4px solid ${borderColor}`,
                              }}>
                              <div style={{
                                minWidth:48,textAlign:"center",
                                background:isToday?"var(--bloom-mid)":"#f3f4f6",
                                borderRadius:8,padding:"6px 4px",flexShrink:0,
                              }}>
                                <div style={{fontSize:11,fontWeight:800,color:isToday?"#fff":"#666",textTransform:"uppercase",letterSpacing:.5}}>
                                  {dt?dt.toLocaleDateString("en-PH",{timeZone:MANILA,month:"short"}):"—"}
                                </div>
                                <div style={{fontSize:20,fontWeight:900,color:isToday?"#fff":"var(--bloom-dark)",lineHeight:1}}>
                                  {dt?Number(dt.toLocaleDateString("en-PH",{timeZone:MANILA,day:"numeric"})):"—"}
                                </div>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:"var(--bloom-dark)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                  {ev.title}
                                </div>
                                <div style={{fontSize:11,color:"#888",marginTop:2}}>
                                  <i className="bi bi-clock me-1"/>
                                  {dayLabel}{timeLabel?` · ${timeLabel}`:""}
                                  {ev.location&&<><i className="bi bi-geo-alt ms-2 me-1"/>{ev.location}</>}
                                </div>
                                <div className="mt-1">
                                  <SourceBadge ev={ev}/>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                {ev._status && (
                                  <span style={{
                                    fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:8,
                                    background:ev._status==="upcoming"?"#dbeafe":ev._status==="ongoing"?"#dcfce7":"#f3f4f6",
                                    color:ev._status==="upcoming"?"#1d4ed8":ev._status==="ongoing"?"#16a34a":"#666",
                                    textTransform:"uppercase",
                                  }}>
                                    {ev._status}
                                  </span>
                                )}
                                <i className="bi bi-chevron-right text-muted" style={{fontSize:11}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 5: Seminar attendance + Recent modules ── */}
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="card dash-chart-card dash-fixed-card">
              <div className="card-body p-3">
                <SH title="Seminar Attendance (Latest 5)" icon="bi-people"/>
                {errors.semStats
                  ? <ErrorState msg={errors.semStats} onRetry={()=>fetchSemStats().then(()=>setErrors(p=>{const{semStats,...r}=p;return r;})).catch(()=>{})}/>
                  : semStats.length===0
                    ? <Empty icon="bi-people" msg="No seminars yet"/>
                    : <div className="dash-scroll-body flex-grow-1">
                        {semStats.map((s,i)=>(
                          <MBar key={s.seminar_id??i}
                            label={s.seminar_title??"Untitled"}
                            value={s.attendance_rate_percent??0} max={100}
                            color={i===0?"#7C3AED":"#2563EB"}
                            sub={`${s.attendance_rate_percent??0}% · ${s.attended_count??0}/${s.registered_count??0}`}
                          />
                        ))}
                      </div>
                }
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card dash-chart-card dash-fixed-card">
              <div className="card-body p-3">
                <SH
                  title={`Modules Added · ${periodLabel}`}
                  icon="bi-clock-history"
                  linkTo="/modules"
                  onLinkClick={() => navigate("/modules")}
                />
                {errors.recentMods
                  ? <ErrorState msg={errors.recentMods} onRetry={()=>fetchRecentMods(fromDate,toDate).catch(()=>{})}/>
                  : recentMods.length===0
                    ? <Empty icon="bi-book" msg="No modules added in this period"/>
                    : <div className="dash-scroll-body flex-grow-1">
                        {recentMods.map(m=>(
                          <div key={m.id} className="d-flex align-items-center gap-2 py-2"
                            style={{borderBottom:"1px solid #F0F4F0"}}>
                            <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{width:30,height:30,background:m.status==="published"?"#DFF6DD":"#FFF4CE"}}>
                              <i className="bi bi-book"
                                style={{fontSize:13,color:m.status==="published"?"#107C10":"#835B00"}}/>
                            </div>
                            <div className="flex-grow-1 overflow-hidden">
                              <div className="fw-semibold text-truncate" style={{fontSize:12}}>{m.title}</div>
                              <small className="text-muted" style={{fontSize:10}}>{fmt(m.created_at)}</small>
                            </div>
                            <span className={`badge rounded-pill ${m.status==="published"?"bg-success-subtle text-success":"bg-warning-subtle text-warning"}`}
                              style={{fontSize:9}}>
                              {m.status}
                            </span>
                          </div>
                        ))}
                      </div>
                }
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Day Events Modal ── */}
      {dayModal && (
        <DayEventsModal
          date={dayModal.date}
          events={dayModal.events}
          onClose={()=>setDayModal(null)}
        />
      )}

      {/* ── Event Detail Modal ── */}
      {detailModal && (
        <EventDetailModal
          ev={detailModal}
          onClose={()=>setDetailModal(null)}
        />
      )}
    </>
  );
}