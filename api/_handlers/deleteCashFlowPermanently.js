import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  // Only admins can permanently delete data
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  try {
    const { customer_email, customer_id, confirm } = req.body ?? {};
    if (!customer_email && !customer_id) return res.status(400).json({ error: 'customer_email or customer_id is required' });
    if (!confirm) return res.status(400).json({ error: 'confirm=true is required for permanent deletion' });

    const filter = customer_id ? { customer_id } : { customer_email };
    const filterKey = Object.keys(filter)[0];
    const filterVal = Object.values(filter)[0];

    // Delete cash flow related data
    const tables = ['cash_flow_entry', 'cash_flow_forecast', 'cash_flow_actuals'];
    const results = {};

    for (const table of tables) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(filterKey, filterVal);

      if (error) {
        console.error(`[deleteCashFlowPermanently] ${table} error:`, error.message);
        results[table] = { error: error.message };
      } else {
        results[table] = { deleted: count || 0 };
      }
    }

    return res.status(200).json({ success: true, results, filter });
  } catch (e) {
    console.error('[deleteCashFlowPermanently]', e);
    return res.status(500).json({ error: e.message });
  }
}
