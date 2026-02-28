import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  try {
    const { backup_id } = req.body ?? {};
    if (!backup_id) return res.status(400).json({ error: 'backup_id is required' });

    // Get the backup record
    const { data: backup, error } = await supabaseAdmin
      .from('backup_log')
      .select('*')
      .eq('backup_id', backup_id)
      .single();

    if (error || !backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Return preview info about what would be restored
    const preview = {
      backup_id: backup.backup_id,
      backup_type: backup.backup_type,
      backup_name: backup.backup_name,
      created_at: backup.created_at,
      tables: backup.tables_backed_up || [],
      status: backup.status,
      description: backup.description,
      restore_warning: 'Restoring this backup will overwrite current data. This action cannot be undone.',
      estimated_records: backup.total_records || null,
    };

    return res.status(200).json({ success: true, preview });
  } catch (e) {
    console.error('[restoreBackupPreview]', e);
    return res.status(500).json({ error: e.message });
  }
}
