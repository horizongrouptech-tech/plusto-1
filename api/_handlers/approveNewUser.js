import { requireAuth, supabaseAdmin } from '../_helpers.js';

/**
 * POST /api/approveNewUser
 * Admin/department_manager approves a new user and assigns their role.
 *
 * Body: { user_id, chosen_role, notes? }
 * (Also supports legacy: { pending_approval_id, chosen_role })
 *
 * Actions:
 * 1. Updates profiles record (role, is_approved_by_admin, onboarding_completed)
 * 2. If pending_approvals record exists, updates it too
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;

  // רק admin, super_admin, department_manager יכולים לאשר
  const allowedRoles = ['admin', 'super_admin', 'department_manager'];
  if (!allowedRoles.includes(currentUser.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
  }

  const { user_id, pending_approval_id, chosen_role, notes } = req.body ?? {};

  // תמיכה ב-user_id ישיר או pending_approval_id (legacy)
  const targetUserId = user_id || null;

  if (!chosen_role) {
    return res.status(400).json({ success: false, error: 'chosen_role is required' });
  }
  if (!targetUserId && !pending_approval_id) {
    return res.status(400).json({ success: false, error: 'user_id or pending_approval_id is required' });
  }

  // וידוא שה-role תקין
  const validRoles = ['financial_manager', 'client', 'department_manager', 'supplier_user'];
  if (!validRoles.includes(chosen_role)) {
    return res.status(400).json({ success: false, error: `Invalid role: ${chosen_role}` });
  }

  try {
    let profileUserId = targetUserId;
    let userEmail = '';

    // אם הגיע pending_approval_id (legacy) — שלוף ממנו את ה-user_id
    if (!profileUserId && pending_approval_id) {
      const { data: approval, error: fetchError } = await supabaseAdmin
        .from('pending_approvals')
        .select('user_id, email')
        .eq('id', pending_approval_id)
        .single();

      if (fetchError || !approval) {
        return res.status(404).json({ success: false, error: 'Pending approval not found' });
      }
      profileUserId = approval.user_id;
      userEmail = approval.email;
    }

    // שליפת הפרופיל לוידוא שקיים
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, is_approved_by_admin')
      .eq('id', profileUserId)
      .single();

    if (profileFetchError || !profile) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    if (profile.is_approved_by_admin) {
      return res.status(200).json({ success: true, message: 'Already approved' });
    }

    userEmail = userEmail || profile.email;

    // עדכון profiles — הגדרת role + אישור
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: chosen_role,
        user_type: chosen_role === 'client' ? 'regular' : chosen_role, // backward compat
        is_approved_by_admin: true,
        onboarding_completed: true,
        is_active: true,
      })
      .eq('id', profileUserId);

    if (updateProfileError) throw updateProfileError;

    // אם יש רשומת pending_approvals — עדכן אותה גם (אופציונלי, לא חוסם)
    await supabaseAdmin
      .from('pending_approvals')
      .update({
        status: 'approved',
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('user_id', profileUserId)
      .catch(() => {}); // לא חוסם אם הטבלה לא קיימת או אין רשומה

    return res.status(200).json({
      success: true,
      message: `User ${userEmail} approved as ${chosen_role}`,
    });
  } catch (error) {
    console.error('[approveNewUser]', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
