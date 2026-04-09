// src/ForumPage.jsx
// BLOOM Admin Panel — Forum Moderation

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#1A2E1A",
  mid:   "#2D6A2D",
  base:  "#4CAF50",
  light: "#81C784",
  pale:  "#C8E6C9",
  wash:  "#E8F5E9",
  cream: "#F1F8F1",
  white: "#FAFEFA",
  danger: "#D32F2F",
  dangerPale: "#FFEBEE",
  warn:  "#F57C00",
  warnPale: "#FFF3E0",
};

const btn = (extra = {}) => ({
  border: "none", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontWeight: 600, fontSize: 13,
  padding: "7px 14px", transition: "opacity .15s",
  ...extra,
});

const card = {
  background: G.white, border: `1px solid ${G.pale}`,
  borderRadius: 12, boxShadow: "0 1px 4px rgba(26,46,26,.07)",
};

const FLAIRS = ["All", "General", "Question", "Discussion", "Resource"];

// ── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function FlairBadge({ flair }) {
  const colors = {
    General:    { bg: "#E3F2FD", color: "#1565C0" },
    Question:   { bg: "#FFF3E0", color: "#E65100" },
    Discussion: { bg: "#F3E5F5", color: "#6A1B9A" },
    Resource:   { bg: "#E8F5E9", color: "#2E7D32" },
    Announcement: { bg: "#FCE4EC", color: "#880E4F" },
  };
  const s = colors[flair] || { bg: G.wash, color: G.dark };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700,
    }}>{flair}</span>
  );
}

// ── Main Component ────────────────────────────────────────
export default function ForumPage() {
  const [posts,        setPosts]        = useState([]);
  const [replies,      setReplies]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [flairFilter,  setFlairFilter]  = useState("All");
  const [selectedPost, setSelectedPost] = useState(null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [stats,        setStats]        = useState({ posts: 0, replies: 0, users: 0 });
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'post'|'reply', id, label }
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState(null);

  // ── Load posts ──────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*, profiles(full_name)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get reply counts per post
      const { data: replyCounts } = await supabase
        .from("forum_replies")
        .select("post_id");

      const countMap = {};
      (replyCounts || []).forEach(r => {
        countMap[r.post_id] = (countMap[r.post_id] || 0) + 1;
      });

      const enriched = (data || []).map(p => ({
        ...p,
        replyCount: countMap[p.id] || 0,
      }));

      setPosts(enriched);

      // Stats
      const uniqueUsers = new Set(enriched.map(p => p.user_id)).size;
      setStats({
        posts:   enriched.length,
        replies: replyCounts?.length || 0,
        users:   uniqueUsers,
      });
    } catch (e) {
      showToast("Failed to load posts: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load replies for selected post ──────────────────────
  const loadReplies = useCallback(async (postId) => {
    setRepliesLoading(true);
    try {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("*, profiles(full_name)")
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      setReplies(data || []);
    } catch (e) {
      showToast("Failed to load replies: " + e.message, "error");
    } finally {
      setRepliesLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    if (selectedPost) loadReplies(selectedPost.id);
  }, [selectedPost, loadReplies]);

  // ── Toast ───────────────────────────────────────────────
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Toggle pin ──────────────────────────────────────────
  async function togglePin(post) {
    try {
      await supabase
        .from("forum_posts")
        .update({ is_pinned: !post.is_pinned })
        .eq("id", post.id);
      showToast(post.is_pinned ? "Post unpinned." : "Post pinned to top.");
      loadPosts();
      if (selectedPost?.id === post.id) {
        setSelectedPost(p => ({ ...p, is_pinned: !p.is_pinned }));
      }
    } catch (e) {
      showToast("Failed to update pin: " + e.message, "error");
    }
  }

  // ── Delete ──────────────────────────────────────────────
  async function confirmAndDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "post") {
        await supabase.from("forum_posts").delete().eq("id", confirmDelete.id);
        showToast("Post deleted.");
        if (selectedPost?.id === confirmDelete.id) setSelectedPost(null);
        loadPosts();
      } else {
        await supabase.from("forum_replies").delete().eq("id", confirmDelete.id);
        showToast("Reply deleted.");
        if (selectedPost) loadReplies(selectedPost.id);
        loadPosts();
      }
    } catch (e) {
      showToast("Delete failed: " + e.message, "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  // ── Filtered posts ──────────────────────────────────────
  const filtered = posts.filter(p => {
    const matchSearch =
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchFlair = flairFilter === "All" || p.flair === flairFilter;
    return matchSearch && matchFlair;
  });

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: toast.type === "error" ? G.danger : G.mid,
          color: "#fff", borderRadius: 10, padding: "12px 20px",
          fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          animation: "fadeSlideIn .2s ease",
        }}>{toast.message}</div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ ...card, padding: 28, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: G.dark, marginBottom: 10 }}>
              🗑 Delete {confirmDelete.type === "post" ? "Post" : "Reply"}?
            </div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
              <strong>"{confirmDelete.label}"</strong>
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              This action cannot be undone.
              {confirmDelete.type === "post" && " All replies will also be deleted."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={btn({ background: G.cream, color: G.dark })}>
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                disabled={deleting}
                style={btn({ background: G.danger, color: "#fff", opacity: deleting ? 0.6 : 1 })}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 }}>
          💬 Forum Moderation
        </h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
          Monitor, pin, and moderate student forum posts and replies.
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14, marginBottom: 24,
      }}>
        {[
          { label: "Total Posts",   value: stats.posts,   icon: "📝" },
          { label: "Total Replies", value: stats.replies, icon: "💬" },
          { label: "Active Users",  value: stats.users,   icon: "👥" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: G.mid, marginTop: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: selectedPost ? "1fr 1fr" : "1fr", gap: 20 }}>

        {/* ── Post list ── */}
        <div style={card}>
          {/* Search + filter */}
          <div style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${G.pale}`,
            display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          }}>
            <input
              placeholder="Search posts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 160,
                border: `1px solid ${G.pale}`, borderRadius: 8,
                padding: "8px 12px", fontSize: 13,
                fontFamily: "inherit", outline: "none",
                background: G.cream,
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FLAIRS.map(f => (
                <button
                  key={f}
                  onClick={() => setFlairFilter(f)}
                  style={btn({
                    background: flairFilter === f ? G.mid : G.cream,
                    color:      flairFilter === f ? "#fff" : G.dark,
                    padding: "6px 12px",
                  })}>
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={loadPosts}
              style={btn({ background: G.wash, color: G.mid })}>
              ↻ Refresh
            </button>
          </div>

          {/* Post rows */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 320px)" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                Loading posts...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                No posts found.
              </div>
            ) : filtered.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                style={{
                  padding: "14px 20px",
                  borderBottom: `1px solid ${G.pale}`,
                  cursor: "pointer",
                  background: selectedPost?.id === post.id ? G.wash : "transparent",
                  transition: "background .15s",
                }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      {post.is_pinned && (
                        <span style={{ fontSize: 12, color: G.warn }}>📌 Pinned</span>
                      )}
                      <FlairBadge flair={post.flair || "General"} />
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: G.dark,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {post.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: "#888", marginTop: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {post.content}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                      {post.profiles?.full_name || "Unknown"} · {timeAgo(post.created_at)} · {post.replyCount} repl{post.replyCount === 1 ? "y" : "ies"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: "flex", gap: 6, flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => togglePin(post)}
                      title={post.is_pinned ? "Unpin" : "Pin to top"}
                      style={btn({
                        background: post.is_pinned ? G.warnPale : G.cream,
                        color:      post.is_pinned ? G.warn : G.dark,
                        padding: "5px 10px", fontSize: 12,
                      })}>
                      {post.is_pinned ? "📌 Unpin" : "📌 Pin"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({
                        type: "post", id: post.id,
                        label: post.title,
                      })}
                      style={btn({
                        background: G.dangerPale,
                        color: G.danger,
                        padding: "5px 10px", fontSize: 12,
                      })}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Post detail + replies ── */}
        {selectedPost && (
          <div style={{ ...card, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${G.pale}`,
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <FlairBadge flair={selectedPost.flair || "General"} />
                  {selectedPost.is_pinned && (
                    <span style={{ fontSize: 11, color: G.warn }}>📌 Pinned</span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: G.dark }}>
                  {selectedPost.title}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  By {selectedPost.profiles?.full_name || "Unknown"} · {timeAgo(selectedPost.created_at)}
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                style={btn({ background: G.cream, color: G.dark, padding: "6px 12px" })}>
                ✕ Close
              </button>
            </div>

            {/* Post content */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${G.pale}`,
              background: G.cream,
            }}>
              <div style={{ fontSize: 14, color: G.dark, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedPost.content}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={() => togglePin(selectedPost)}
                  style={btn({
                    background: selectedPost.is_pinned ? G.warnPale : G.wash,
                    color:      selectedPost.is_pinned ? G.warn : G.mid,
                    fontSize: 12,
                  })}>
                  {selectedPost.is_pinned ? "📌 Unpin Post" : "📌 Pin Post"}
                </button>
                <button
                  onClick={() => setConfirmDelete({
                    type: "post", id: selectedPost.id,
                    label: selectedPost.title,
                  })}
                  style={btn({ background: G.dangerPale, color: G.danger, fontSize: 12 })}>
                  🗑 Delete Post
                </button>
              </div>
            </div>

            {/* Replies */}
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 420px)" }}>
              <div style={{
                padding: "12px 20px 6px",
                fontSize: 13, fontWeight: 700, color: G.dark,
              }}>
                {replies.length} Repl{replies.length === 1 ? "y" : "ies"}
              </div>

              {repliesLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#999", fontSize: 13 }}>
                  Loading replies...
                </div>
              ) : replies.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#bbb", fontSize: 13 }}>
                  No replies yet.
                </div>
              ) : replies.map(reply => (
                <div
                  key={reply.id}
                  style={{
                    padding: "12px 20px",
                    borderBottom: `1px solid ${G.pale}`,
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.mid, marginBottom: 4 }}>
                        {reply.profiles?.full_name || "Unknown"}
                        <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 8 }}>
                          {timeAgo(reply.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: G.dark, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {reply.content}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmDelete({
                        type: "reply", id: reply.id,
                        label: reply.content.slice(0, 50) + (reply.content.length > 50 ? "..." : ""),
                      })}
                      title="Delete reply"
                      style={btn({
                        background: G.dangerPale, color: G.danger,
                        padding: "4px 8px", fontSize: 12, flexShrink: 0,
                      })}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}