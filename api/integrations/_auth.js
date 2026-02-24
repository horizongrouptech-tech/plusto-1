import { createClient } from '@supabase/supabase-js';

/**
 * Shared auth helper for Vercel API routes.
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the authenticated user, or sends a 401 and returns null.
 *
 * NOTE: Auth migration (Step 3) is not yet complete.
 * Until then this helper is permissive — it validates if a token is present
 * but does not block requests without one so that existing Base44 sessions
 * can still reach these routes during the transition period.
 */
export async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    // Permissive during migration — remove this block after Step 3 is done
    return { id: 'anonymous', email: 'anonymous' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}
