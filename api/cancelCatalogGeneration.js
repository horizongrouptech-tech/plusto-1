import { requireAuth, supabaseAdmin } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { processId, catalogId } = req.body ?? {};

    if (processId) {
      await supabaseAdmin.from('process_status').update({ status: 'cancelled', current_step: 'בוטל על ידי המשתמש', completed_at: new Date().toISOString() }).eq('id', processId);
    }
    if (catalogId) {
      await supabaseAdmin.from('catalog').update({ status: 'cancelled' }).eq('id', catalogId);
    }

    return res.status(200).json({ success: true, message: 'יצירת הקטלוג בוטלה' });
  } catch (error) {
    console.error('[cancelCatalogGeneration]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
