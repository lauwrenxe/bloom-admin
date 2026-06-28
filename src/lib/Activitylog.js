import { supabase } from "./supabase.js";

/**
 * Logs an admin action to the activity_logs table.
 * Used by the Super Admin "Admin Activity Log" and "Admin Reports" tabs
 * to show what each admin did (create/edit/delete/publish/etc).
 *
 * Actual activity_logs columns: id, user_id, action_type, reference_type,
 * reference_id, metadata (jsonb), created_at.
 *
 * @param {string} actionType    - e.g. "module_created", "module_updated", "seminar_deleted"
 * @param {object} details       - small JSON object describing what happened (shown in the Details column)
 * @param {string} [referenceType] - optional table/entity name this action relates to, e.g. "module", "seminar"
 * @param {string} [referenceId]   - optional id of the row this action relates to
 */
export async function logActivity(actionType, details = {}, referenceType = null, referenceId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return; // not logged in, nothing to attribute this to

    const { error } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type: actionType,
      reference_type: referenceType,
      reference_id: referenceId,
      metadata: details,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("logActivity insert error:", error.message);
  } catch (e) {
    // Logging must never break the actual admin action — fail silently, just warn in console
    console.error("logActivity failed:", e);
  }
}