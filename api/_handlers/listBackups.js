import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  try {
    const { backup_type, limit = 50 } = req.body ?? {};

    let query = supabaseAdmin
      .from('backup_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (backup_type) {
      query = query.eq('backup_type', backup_type);
    }

    const { data, error } = await query;
    if (error) {
      // Table may not exist yet
      console.error('[listBackups] query error:', error.message);
      return res.status(200).json({ backups: [], total: 0, note: 'backup_log table not found' });
    }

    return res.status(200).json({ backups: data || [], total: data?.length || 0 });
  } catch (e) {
    console.error('[listBackups]', e);
    return res.status(500).json({ error: e.message });
  }
}
