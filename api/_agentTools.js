/**
 * _agentTools.js — Tool definitions + execution for the AI agent
 *
 * כל tool מקבל את ה-user profile ומסנן נתונים לפי הרשאות:
 *   - Admin/Super Admin: גישה לכל הנתונים
 *   - Financial Manager: רק לקוחות משויכים
 *   - Client: רק הנתונים שלו
 */

import { supabaseAdmin } from './_helpers.js';

// ─── Permission helpers ──────────────────────────────────────────────────────

function isAdmin(user) {
  return ['admin', 'super_admin', 'department_manager'].includes(user.role);
}

function isFinancialManager(user) {
  return user.role === 'financial_manager' || user.user_type === 'financial_manager';
}

/**
 * מחזיר רשימת emails של לקוחות שהמשתמש מורשה לראות.
 * Admin → null (= הכל), FM → רשימת emails, Client → [email שלו]
 */
async function getAllowedCustomerEmails(user) {
  if (isAdmin(user)) return null; // null = no filter = see all

  if (isFinancialManager(user)) {
    const { data: onboardings } = await supabaseAdmin
      .from('onboarding_request')
      .select('email')
      .or(`assigned_financial_manager_email.eq.${user.email},additional_assigned_financial_manager_emails.cs.["${user.email}"]`);
    return (onboardings || []).map(o => o.email);
  }

  // Client — sees only own data
  return [user.email];
}

/**
 * מוסיף filter של הרשאות ל-query על טבלה שיש בה email field
 */
function applyEmailFilter(query, allowedEmails, emailColumn = 'email') {
  if (allowedEmails === null) return query; // admin — no filter
  if (allowedEmails.length === 0) return query.eq(emailColumn, '__no_access__');
  return query.in(emailColumn, allowedEmails);
}

// ─── Tool definitions (OpenAI function calling format) ───────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description: 'רשימת כל הלקוחות שהמשתמש מורשה לראות. מחזיר שם עסק, אימייל, סטטוס, ומנהל פיננסי משויך.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 50)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: 'חיפוש לקוח לפי שם עסק או אימייל (חיפוש חלקי)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'מחרוזת חיפוש — שם עסק או אימייל' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_details',
      description: 'מידע מלא על לקוח ספציפי — פרטי עסק, יעדים, המלצות, קבצים ותחזית',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'אימייל של הלקוח' },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_goals',
      description: 'רשימת יעדים ומשימות. ניתן לסנן לפי לקוח או סטטוס.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל לקוח לסינון (אופציונלי)' },
          status: { type: 'string', description: 'סינון לפי סטטוס: pending, in_progress, completed, overdue' },
          limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 30)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_recommendations',
      description: 'רשימת המלצות עסקיות. ניתן לסנן לפי לקוח או סטטוס.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל לקוח לסינון (אופציונלי)' },
          status: { type: 'string', description: 'סינון לפי סטטוס: draft, published, implemented' },
          limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 30)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'רשימת קבצים שהועלו למערכת. ניתן לסנן לפי לקוח.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל לקוח לסינון (אופציונלי)' },
          limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_business_forecast',
      description: 'תחזית עסקית של לקוח ספציפי',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
        },
        required: ['customer_email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_actions',
      description: 'רשימת פעולות שתועדו ללקוח (היסטוריית טיפול)',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל לקוח לסינון (אופציונלי)' },
          limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 20)' },
        },
      },
    },
  },
];

// ─── Tool execution ──────────────────────────────────────────────────────────

/**
 * מריץ tool ומחזיר תוצאה כ-string.
 * מסנן לפי הרשאות המשתמש.
 */
export async function executeTool(toolName, args, user) {
  const allowedEmails = await getAllowedCustomerEmails(user);

  switch (toolName) {
    case 'list_customers': {
      const limit = args.limit || 50;
      let q = supabaseAdmin
        .from('onboarding_request')
        .select('email, business_name, business_type, status, assigned_financial_manager_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      q = applyEmailFilter(q, allowedEmails, 'email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      if (!data?.length) return JSON.stringify({ message: 'לא נמצאו לקוחות', count: 0 });
      return JSON.stringify({ count: data.length, customers: data });
    }

    case 'search_customers': {
      const search = args.query;
      let q = supabaseAdmin
        .from('onboarding_request')
        .select('email, business_name, business_type, status, assigned_financial_manager_email')
        .or(`business_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(20);
      q = applyEmailFilter(q, allowedEmails, 'email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      if (!data?.length) return JSON.stringify({ message: `לא נמצאו לקוחות עבור "${search}"`, count: 0 });
      return JSON.stringify({ count: data.length, customers: data });
    }

    case 'get_customer_details': {
      const email = args.email;
      // בדיקת הרשאה
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לצפות בלקוח זה' });
      }

      // שליפת נתונים מקבילית
      const [customer, goals, recs, files, forecast] = await Promise.all([
        supabaseAdmin.from('onboarding_request').select('*').eq('email', email).single(),
        supabaseAdmin.from('customer_goal').select('id, title, status, task_type, due_date, priority').eq('customer_email', email).order('created_date', { ascending: false }).limit(10),
        supabaseAdmin.from('recommendation').select('id, title, status, category, created_date').eq('customer_email', email).order('created_date', { ascending: false }).limit(10),
        supabaseAdmin.from('file_upload').select('id, file_name, file_type, status, created_date').eq('customer_email', email).order('created_date', { ascending: false }).limit(5),
        supabaseAdmin.from('business_forecast').select('*').eq('customer_email', email).order('created_date', { ascending: false }).limit(1),
      ]);

      return JSON.stringify({
        customer: customer.data || null,
        goals: goals.data || [],
        recommendations: recs.data || [],
        files: files.data || [],
        forecast: forecast.data?.[0] || null,
      });
    }

    case 'list_goals': {
      const limit = args.limit || 30;
      let q = supabaseAdmin
        .from('customer_goal')
        .select('id, title, status, task_type, due_date, priority, customer_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      if (args.status) q = q.eq('status', args.status);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ count: data?.length || 0, goals: data || [] });
    }

    case 'list_recommendations': {
      const limit = args.limit || 30;
      let q = supabaseAdmin
        .from('recommendation')
        .select('id, title, status, category, customer_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      if (args.status) q = q.eq('status', args.status);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ count: data?.length || 0, recommendations: data || [] });
    }

    case 'list_files': {
      const limit = args.limit || 20;
      let q = supabaseAdmin
        .from('file_upload')
        .select('id, file_name, file_type, status, customer_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ count: data?.length || 0, files: data || [] });
    }

    case 'get_business_forecast': {
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לצפות בתחזית של לקוח זה' });
      }
      const { data, error } = await supabaseAdmin
        .from('business_forecast')
        .select('*')
        .eq('customer_email', email)
        .order('created_date', { ascending: false })
        .limit(1)
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ forecast: data });
    }

    case 'list_actions': {
      const limit = args.limit || 20;
      let q = supabaseAdmin
        .from('customer_action')
        .select('id, action_type, description, customer_email, created_date, created_by')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ count: data?.length || 0, actions: data || [] });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
