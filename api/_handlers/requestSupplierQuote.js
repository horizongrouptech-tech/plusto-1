import { requireAuth, supabaseAdmin } from '../_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { supplier_id, request_details, request_type = 'quote_request', estimated_value, priority = 'medium' } = req.body ?? {};
    if (!supplier_id || !request_details) {
      return res.status(400).json({ success: false, error: 'חסרים פרמטרים נדרשים: supplier_id ו-request_details' });
    }

    const { data: supplier } = await supabaseAdmin.from('supplier').select('*').eq('id', supplier_id).single();
    if (!supplier) return res.status(404).json({ success: false, error: 'ספק לא נמצא' });

    let supplierUserEmail = null;
    if (supplier.supplier_user_email) {
      const { data: su } = await supabaseAdmin.from('profiles').select('email').eq('email', supplier.supplier_user_email).eq('user_type', 'supplier_user').limit(1);
      if (su?.[0]) supplierUserEmail = su[0].email;
    }

    const { data: newLead, error: leadErr } = await supabaseAdmin.from('lead').insert({
      supplier_id,
      customer_email: user.email,
      customer_name: user.full_name || user.business_name || user.email,
      customer_phone: user.phone || '',
      request_details,
      request_type,
      status: 'new',
      assigned_to_supplier_user_email: supplierUserEmail,
      priority,
      estimated_value: estimated_value || null,
      response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contact_attempts: 0,
    }).select().single();

    if (leadErr) throw new Error(leadErr.message);

    return res.status(200).json({ success: true, lead_id: newLead.id, message: 'הפנייה נשלחה בהצלחה לספק' });
  } catch (error) {
    console.error('[requestSupplierQuote]', error);
    return res.status(500).json({ success: false, error: 'אירעה שגיאה ביצירת הפנייה: ' + error.message });
  }
}
