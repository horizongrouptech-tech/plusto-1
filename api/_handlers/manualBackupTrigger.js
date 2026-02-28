import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  try {
    const { backup_type = 'full', description } = req.body ?? {};

    const backupId = `manual-backup-${Date.now()}`;

    await supabaseAdmin.from('backup_log').insert({
      backup_id: backupId,
      backup_type,
      status: 'initiated',
      backup_name: `Manual ${backup_type} backup`,
      description: description || `Manually triggered by ${user.full_name || user.email}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }).catch(err => console.error('[manualBackupTrigger] log error:', err.message));

    // Trigger both code and DB backup if type is 'full'
    const results = {};

    if (backup_type === 'full' || backup_type === 'code') {
      results.code = await fetch(`${process.env.VITE_SITE_URL || ''}/api/backupCodeToS3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization },
        body: JSON.stringify({ backup_name: backupId }),
      }).then(r => r.json()).catch(e => ({ error: e.message }));
    }

    if (backup_type === 'full' || backup_type === 'database') {
      results.database = await fetch(`${process.env.VITE_SITE_URL || ''}/api/backupDatabaseToS3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization },
        body: JSON.stringify({ backup_name: backupId }),
      }).then(r => r.json()).catch(e => ({ error: e.message }));
    }

    await supabaseAdmin.from('backup_log')
      .update({ status: 'completed', completed_at: new Date().toISOString(), notes: JSON.stringify(results) })
      .eq('backup_id', backupId)
      .catch(() => {});

    return res.status(200).json({ success: true, backup_id: backupId, backup_type, results });
  } catch (e) {
    console.error('[manualBackupTrigger]', e);
    return res.status(500).json({ error: e.message });
  }
}
