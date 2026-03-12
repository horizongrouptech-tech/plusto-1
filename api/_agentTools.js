/**
 * _agentTools.js — Tool definitions + execution for the AI agent
 *
 * כל tool מקבל את ה-user profile ומסנן נתונים לפי הרשאות:
 *   - Admin/Super Admin: גישה לכל הנתונים
 *   - Financial Manager: רק לקוחות משויכים
 *   - Client: רק הנתונים שלו
 *
 * כולל כלי קריאה וכתיבה:
 *   - קריאה: list_customers, search_customers, get_customer_details, list_goals, list_recommendations, list_files, get_business_forecast, list_actions
 *   - כתיבה: create_goal (+ subtasks), update_goal, add_subtasks_to_goal, create_recommendation, create_action, schedule_meeting
 *   - תבניות: list_goal_templates, create_goal_from_template
 *   - קבצים: associate_file_with_customer, analyze_file, get_file_analysis
 */

import { supabaseAdmin, openRouterAPI } from './_helpers.js';

// ─── Security helpers ────────────────────────────────────────────────────────

/** מנקה מחרוזת חיפוש מתווים מיוחדים שיכולים לשבש ilike query */
function sanitizeSearch(input) {
  if (!input || typeof input !== 'string') return '';
  // הסר תווים מיוחדים של SQL pattern matching + תווים מסוכנים
  return input.replace(/[%_\\'";\-\-\/\*]/g, '').trim().slice(0, 100);
}

/** מגביל ערך limit לטווח סביר */
function clampLimit(val, defaultVal = 20, max = 100) {
  const n = Number(val) || defaultVal;
  return Math.min(Math.max(1, n), max);
}

/** מחזיר שגיאה גנרית ללא חשיפת מבנה DB */
function toolError(context, err) {
  console.error(`[agentTools/${context}]`, err?.message || err);
  return JSON.stringify({ error: 'אירעה שגיאה בעיבוד הבקשה. נסה שוב.' });
}

// ─── Tool execution timeout ──────────────────────────────────────────────────

const TOOL_EXECUTION_TIMEOUT_MS = 10_000;

/** עוטף Promise ב-timeout — מונע tools שנתקעים */
function withTimeout(promise, ms = TOOL_EXECUTION_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timed out')), ms)
    ),
  ]);
}

// ─── Permission helpers ──────────────────────────────────────────────────────

function isAdmin(user) {
  return ['admin', 'super_admin', 'department_manager'].includes(user.role);
}

function isFinancialManager(user) {
  return user.role === 'financial_manager' || user.user_type === 'financial_manager';
}

/** בדיקת הרשאת כתיבה — רק admin ו-financial manager */
function canWrite(user) {
  return isAdmin(user) || isFinancialManager(user);
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
  // ── Read tools ──
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
          status: { type: 'string', description: 'סינון לפי סטטוס: open, in_progress, done, delayed, cancelled' },
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

  // ── Write tools ──
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'יצירת יעד/משימה חדשה ללקוח, כולל אפשרות ליצור תת-משימות. דורש הרשאת admin או מנהל פיננסי.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
          name: { type: 'string', description: 'שם היעד/משימה' },
          task_type: { type: 'string', description: 'סוג: goal, one_time, recurring (ברירת מחדל: goal)' },
          priority: { type: 'string', description: 'עדיפות: low, medium, high, urgent' },
          end_date: { type: 'string', description: 'תאריך יעד (YYYY-MM-DD)' },
          start_date: { type: 'string', description: 'תאריך התחלה (YYYY-MM-DD, אופציונלי)' },
          notes: { type: 'string', description: 'תיאור/הערות (אופציונלי)' },
          assignee_email: { type: 'string', description: 'אימייל האחראי על היעד (אופציונלי)' },
          success_metrics: { type: 'string', description: 'מדדי הצלחה (אופציונלי)' },
          subtasks: {
            type: 'array',
            description: 'רשימת תת-משימות ליצירה יחד עם היעד (אופציונלי)',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'שם התת-משימה' },
                end_date: { type: 'string', description: 'תאריך יעד (YYYY-MM-DD, אופציונלי)' },
              },
              required: ['name'],
            },
          },
        },
        required: ['customer_email', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal',
      description: 'עדכון יעד/משימה קיימת — סטטוס, תאריכים, אחראי, הערות, או הוספת תת-משימות',
      parameters: {
        type: 'object',
        properties: {
          goal_id: { type: 'string', description: 'מזהה היעד' },
          status: { type: 'string', description: 'סטטוס חדש: open, in_progress, done, delayed, cancelled (אופציונלי)' },
          name: { type: 'string', description: 'שם חדש (אופציונלי)' },
          notes: { type: 'string', description: 'הערות (אופציונלי)' },
          end_date: { type: 'string', description: 'תאריך יעד חדש YYYY-MM-DD (אופציונלי)' },
          start_date: { type: 'string', description: 'תאריך התחלה חדש YYYY-MM-DD (אופציונלי)' },
          assignee_email: { type: 'string', description: 'אימייל אחראי חדש (אופציונלי)' },
          priority: { type: 'string', description: 'עדיפות: low, medium, high, urgent (אופציונלי)' },
          add_subtasks: {
            type: 'array',
            description: 'תת-משימות חדשות להוספה ליעד (אופציונלי)',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'שם התת-משימה' },
                end_date: { type: 'string', description: 'תאריך יעד (YYYY-MM-DD, אופציונלי)' },
              },
              required: ['name'],
            },
          },
        },
        required: ['goal_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_recommendation',
      description: 'יצירת המלצה עסקית חדשה ללקוח',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
          title: { type: 'string', description: 'כותרת ההמלצה' },
          category: { type: 'string', description: 'קטגוריה: financial, operational, marketing, hr, strategy' },
          description: { type: 'string', description: 'תיאור מפורט של ההמלצה' },
          priority: { type: 'string', description: 'עדיפות: low, medium, high' },
        },
        required: ['customer_email', 'title', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_action',
      description: 'רישום פעולה/אירוע שבוצע עבור לקוח (תיעוד היסטוריית טיפול)',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
          action_type: { type: 'string', description: 'סוג הפעולה: call, email, meeting, note, task, other' },
          description: { type: 'string', description: 'תיאור הפעולה' },
        },
        required: ['customer_email', 'action_type', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_meeting',
      description: 'קביעת פגישה עם לקוח',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
          title: { type: 'string', description: 'נושא הפגישה' },
          meeting_date: { type: 'string', description: 'תאריך ושעה (ISO format)' },
          duration_minutes: { type: 'number', description: 'משך הפגישה בדקות (ברירת מחדל: 60)' },
          location: { type: 'string', description: 'מיקום או קישור לזום (אופציונלי)' },
          notes: { type: 'string', description: 'הערות (אופציונלי)' },
        },
        required: ['customer_email', 'title', 'meeting_date'],
      },
    },
  },

  // ── Subtask tool ──
  {
    type: 'function',
    function: {
      name: 'add_subtasks_to_goal',
      description: 'הוספת תת-משימות ליעד קיים. מוצא את היעד אוטומטית לפי שם או מזהה — אין צורך לחפש את ה-ID בנפרד.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח שהיעד שייך אליו' },
          goal_name: { type: 'string', description: 'שם היעד שאליו רוצים להוסיף משימות (חיפוש לפי שם)' },
          goal_id: { type: 'string', description: 'מזהה היעד (אופציונלי — אם ידוע, עדיף על חיפוש לפי שם)' },
          subtasks: {
            type: 'array',
            description: 'רשימת תת-משימות להוספה',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'שם התת-משימה' },
                end_date: { type: 'string', description: 'תאריך יעד (YYYY-MM-DD, אופציונלי)' },
              },
              required: ['name'],
            },
          },
        },
        required: ['customer_email', 'subtasks'],
      },
    },
  },

  // ── Goal template tools ──
  {
    type: 'function',
    function: {
      name: 'list_goal_templates',
      description: 'רשימת תבניות יעדים זמינות מבנק היעדים. מחזיר שם, קטגוריה, משך, שלבי ביצוע ומדדי הצלחה.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'סינון לפי קטגוריה: financial, operational, marketing, sales, hr, strategic, other (אופציונלי)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal_from_template',
      description: 'יצירת יעד חדש ללקוח מתוך תבנית מבנק היעדים, כולל תת-משימות אוטומטיות מהתבנית',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'אימייל הלקוח' },
          template_id: { type: 'string', description: 'מזהה התבנית (מ-list_goal_templates)' },
          custom_name: { type: 'string', description: 'שם מותאם ליעד (אופציונלי — ברירת מחדל: שם התבנית)' },
          duration_days: { type: 'number', description: 'משך בימים (אופציונלי — ברירת מחדל: מהתבנית)' },
          notes: { type: 'string', description: 'הערות נוספות (אופציונלי)' },
          assignee_email: { type: 'string', description: 'אימייל האחראי (אופציונלי)' },
        },
        required: ['customer_email', 'template_id'],
      },
    },
  },

  // ── File tools ──
  {
    type: 'function',
    function: {
      name: 'associate_file_with_customer',
      description: 'שיוך קובץ קיים ללקוח ספציפי',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'מזהה הקובץ' },
          customer_email: { type: 'string', description: 'אימייל הלקוח לשיוך' },
        },
        required: ['file_id', 'customer_email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_file',
      description: 'ניתוח קובץ באמצעות AI — שולח את הקובץ למודל ומחזיר תובנות',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'מזהה הקובץ לניתוח' },
          analysis_prompt: { type: 'string', description: 'הנחיה ספציפית לניתוח (אופציונלי)' },
        },
        required: ['file_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_file_analysis',
      description: 'שליפת תוצאות ניתוח קודם של קובץ (parsed_data ו-ai_insights)',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'מזהה הקובץ' },
        },
        required: ['file_id'],
      },
    },
  },
];

// ─── Tool execution ──────────────────────────────────────────────────────────

/**
 * מריץ tool ומחזיר תוצאה כ-string.
 * מסנן לפי הרשאות המשתמש.
 * כל tool עטוף ב-timeout למניעת תקיעות.
 */
export async function executeTool(toolName, args, user) {
  try {
    return await withTimeout(_executeTool(toolName, args, user));
  } catch (err) {
    if (err.message === 'Tool execution timed out') {
      console.error(`[agentTools] Tool "${toolName}" timed out after ${TOOL_EXECUTION_TIMEOUT_MS}ms`);
      return JSON.stringify({ error: 'הפעולה לקחה יותר מדי זמן. נסה שוב.' });
    }
    return toolError(toolName, err);
  }
}

async function _executeTool(toolName, args, user) {
  const allowedEmails = await getAllowedCustomerEmails(user);

  switch (toolName) {
    // ── Read tools ──

    case 'list_customers': {
      const limit = clampLimit(args.limit, 50);
      let q = supabaseAdmin
        .from('onboarding_request')
        .select('email, business_name, business_type, status, assigned_financial_manager_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      q = applyEmailFilter(q, allowedEmails, 'email');
      const { data, error } = await q;
      if (error) return toolError('list_customers', error);
      if (!data?.length) return JSON.stringify({ message: 'לא נמצאו לקוחות', count: 0 });
      return JSON.stringify({ count: data.length, customers: data });
    }

    case 'search_customers': {
      const search = sanitizeSearch(args.query);
      if (!search) return JSON.stringify({ error: 'מחרוזת חיפוש לא תקינה' });
      let q = supabaseAdmin
        .from('onboarding_request')
        .select('email, business_name, business_type, status, assigned_financial_manager_email')
        .or(`business_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(20);
      q = applyEmailFilter(q, allowedEmails, 'email');
      const { data, error } = await q;
      if (error) return toolError('search_customers', error);
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
        supabaseAdmin.from('customer_goal').select('id, name, status, task_type, end_date, priority, parent_id, assignee_email').eq('customer_email', email).order('created_date', { ascending: false }).limit(10),
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
      const limit = clampLimit(args.limit, 30);
      let q = supabaseAdmin
        .from('customer_goal')
        .select('id, name, status, task_type, end_date, start_date, priority, customer_email, parent_id, assignee_email, notes, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      if (args.status) q = q.eq('status', args.status);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return toolError('list_goals', error);
      return JSON.stringify({ count: data?.length || 0, goals: data || [] });
    }

    case 'list_recommendations': {
      const limit = clampLimit(args.limit, 30);
      let q = supabaseAdmin
        .from('recommendation')
        .select('id, title, status, category, customer_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      if (args.status) q = q.eq('status', args.status);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return toolError('list_recommendations', error);
      return JSON.stringify({ count: data?.length || 0, recommendations: data || [] });
    }

    case 'list_files': {
      const limit = clampLimit(args.limit, 20);
      let q = supabaseAdmin
        .from('file_upload')
        .select('id, file_name, file_type, status, customer_email, created_date')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return toolError('list_files', error);
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
      if (error) return toolError('get_business_forecast', error);
      return JSON.stringify({ forecast: data });
    }

    case 'list_actions': {
      const limit = clampLimit(args.limit, 20);
      let q = supabaseAdmin
        .from('customer_action')
        .select('id, action_type, description, customer_email, created_date, created_by')
        .order('created_date', { ascending: false })
        .limit(limit);
      if (args.customer_email) q = q.eq('customer_email', args.customer_email);
      q = applyEmailFilter(q, allowedEmails, 'customer_email');
      const { data, error } = await q;
      if (error) return toolError('list_actions', error);
      return JSON.stringify({ count: data?.length || 0, actions: data || [] });
    }

    // ── Write tools ──

    case 'create_goal': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור יעדים' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור יעד ללקוח זה' });
      }

      // חישוב order_index — ספירת יעדים ראשיים קיימים
      const { data: existingGoals } = await supabaseAdmin
        .from('customer_goal')
        .select('id')
        .eq('customer_email', email)
        .is('parent_id', null);
      const orderIndex = (existingGoals || []).length;

      const payload = {
        customer_email: email,
        name: args.name,
        task_type: args.task_type || 'goal',
        priority: args.priority || 'medium',
        status: 'open',
        is_active: true,
        order_index: orderIndex,
        created_by: user.email,
        created_date: new Date().toISOString(),
      };
      if (args.end_date) payload.end_date = args.end_date;
      if (args.start_date) payload.start_date = args.start_date;
      if (args.notes) payload.notes = args.notes;
      if (args.assignee_email) payload.assignee_email = args.assignee_email;
      if (args.success_metrics) payload.success_metrics = args.success_metrics;

      const { data, error } = await supabaseAdmin
        .from('customer_goal')
        .insert(payload)
        .select()
        .single();
      if (error) return toolError('create_goal', error);

      // יצירת תת-משימות אם צוינו
      let subtasksCreated = 0;
      if (args.subtasks?.length && data?.id) {
        const subtaskRows = args.subtasks.map((st, idx) => ({
          customer_email: email,
          parent_id: data.id,
          name: typeof st === 'string' ? st : st.name,
          status: 'open',
          task_type: 'one_time',
          end_date: (typeof st === 'object' && st.end_date) ? st.end_date : (args.end_date || null),
          order_index: idx,
          is_active: true,
          created_by: user.email,
          created_date: new Date().toISOString(),
        }));
        const { data: subs, error: subErr } = await supabaseAdmin
          .from('customer_goal')
          .insert(subtaskRows)
          .select();
        if (subErr) console.error('[create_goal/subtasks]', subErr.message);
        subtasksCreated = subs?.length || 0;
      }

      const msg = subtasksCreated > 0
        ? `יעד "${args.name}" נוצר בהצלחה עם ${subtasksCreated} תת-משימות`
        : `יעד "${args.name}" נוצר בהצלחה`;
      return JSON.stringify({ message: msg, goal: data, subtasks_created: subtasksCreated });
    }

    case 'update_goal':
    case 'update_goal_status': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה לעדכן יעדים' });
      }

      // בדיקת סטטוס תקין אם סופק
      const validStatuses = ['open', 'in_progress', 'done', 'delayed', 'cancelled'];
      if (args.status && !validStatuses.includes(args.status)) {
        return JSON.stringify({ error: `סטטוס לא תקין. אפשרויות: ${validStatuses.join(', ')}` });
      }

      // בדיקה שהיעד קיים ושיש הרשאה
      const { data: goal } = await supabaseAdmin
        .from('customer_goal')
        .select('id, customer_email, name')
        .eq('id', args.goal_id)
        .single();
      if (!goal) return JSON.stringify({ error: 'יעד לא נמצא' });
      if (allowedEmails !== null && !allowedEmails.includes(goal.customer_email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לעדכן יעד זה' });
      }

      // בניית payload עדכון — רק שדות שסופקו
      const updatePayload = { updated_date: new Date().toISOString() };
      if (args.status) updatePayload.status = args.status;
      if (args.name) updatePayload.name = args.name;
      if (args.notes !== undefined) updatePayload.notes = args.notes;
      if (args.end_date) updatePayload.end_date = args.end_date;
      if (args.start_date) updatePayload.start_date = args.start_date;
      if (args.assignee_email) updatePayload.assignee_email = args.assignee_email;
      if (args.priority) updatePayload.priority = args.priority;

      const { data, error } = await supabaseAdmin
        .from('customer_goal')
        .update(updatePayload)
        .eq('id', args.goal_id)
        .select()
        .single();
      if (error) return toolError('update_goal', error);

      // הוספת תת-משימות חדשות אם צוינו
      let subtasksCreated = 0;
      if (args.add_subtasks?.length) {
        // ספירת תת-משימות קיימות לצורך order_index
        const { data: existingSubs } = await supabaseAdmin
          .from('customer_goal')
          .select('id')
          .eq('parent_id', args.goal_id);
        const startIdx = (existingSubs || []).length;

        const subtaskRows = args.add_subtasks.map((st, idx) => ({
          customer_email: goal.customer_email,
          parent_id: args.goal_id,
          name: typeof st === 'string' ? st : st.name,
          status: 'open',
          task_type: 'one_time',
          end_date: (typeof st === 'object' && st.end_date) ? st.end_date : null,
          order_index: startIdx + idx,
          is_active: true,
          created_by: user.email,
          created_date: new Date().toISOString(),
        }));
        const { data: subs, error: subErr } = await supabaseAdmin
          .from('customer_goal')
          .insert(subtaskRows)
          .select();
        if (subErr) console.error('[update_goal/subtasks]', subErr.message);
        subtasksCreated = subs?.length || 0;
      }

      // הודעת תוצאה
      const changes = [];
      if (args.status) changes.push(`סטטוס: ${args.status}`);
      if (args.name) changes.push(`שם: ${args.name}`);
      if (args.end_date) changes.push(`תאריך יעד: ${args.end_date}`);
      if (args.assignee_email) changes.push(`אחראי: ${args.assignee_email}`);
      if (subtasksCreated > 0) changes.push(`${subtasksCreated} תת-משימות נוספו`);
      const changesSummary = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      return JSON.stringify({ message: `יעד "${goal.name}" עודכן בהצלחה${changesSummary}`, goal: data, subtasks_created: subtasksCreated });
    }

    case 'create_recommendation': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור המלצות' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור המלצה ללקוח זה' });
      }

      const payload = {
        customer_email: email,
        title: args.title,
        description: args.description,
        category: args.category || 'strategy',
        priority: args.priority || 'medium',
        status: 'draft',
        created_by: user.email,
        created_date: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('recommendation')
        .insert(payload)
        .select()
        .single();
      if (error) return toolError('create_recommendation', error);
      return JSON.stringify({ message: `המלצה "${args.title}" נוצרה בהצלחה`, recommendation: data });
    }

    case 'create_action': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה לרשום פעולות' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לרשום פעולה ללקוח זה' });
      }

      const validTypes = ['call', 'email', 'meeting', 'note', 'task', 'other'];
      const actionType = validTypes.includes(args.action_type) ? args.action_type : 'other';

      const payload = {
        customer_email: email,
        action_type: actionType,
        description: args.description,
        created_by: user.email,
        created_date: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('customer_action')
        .insert(payload)
        .select()
        .single();
      if (error) return toolError('create_action', error);
      return JSON.stringify({ message: 'פעולה תועדה בהצלחה', action: data });
    }

    case 'schedule_meeting': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה לקבוע פגישות' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לקבוע פגישה עם לקוח זה' });
      }

      const payload = {
        customer_email: email,
        title: args.title,
        meeting_date: args.meeting_date,
        duration_minutes: args.duration_minutes || 60,
        location: args.location || '',
        notes: args.notes || '',
        status: 'scheduled',
        created_by: user.email,
        created_date: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('meeting')
        .insert(payload)
        .select()
        .single();
      if (error) return toolError('schedule_meeting', error);
      return JSON.stringify({ message: `פגישה "${args.title}" נקבעה בהצלחה`, meeting: data });
    }

    // ── Subtask tool ──

    case 'add_subtasks_to_goal': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה להוסיף משימות' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה להוסיף משימות ללקוח זה' });
      }
      if (!args.subtasks?.length) {
        return JSON.stringify({ error: 'יש לציין לפחות תת-משימה אחת' });
      }

      // חיפוש היעד — לפי goal_id (אם סופק) או לפי שם
      let goal = null;
      if (args.goal_id) {
        const { data } = await supabaseAdmin
          .from('customer_goal')
          .select('id, customer_email, name, end_date')
          .eq('id', args.goal_id)
          .single();
        goal = data;
      }
      if (!goal && args.goal_name) {
        // חיפוש לפי שם — ilike לתמיכה בהתאמה חלקית
        const { data } = await supabaseAdmin
          .from('customer_goal')
          .select('id, customer_email, name, end_date')
          .eq('customer_email', email)
          .is('parent_id', null) // רק יעדים ראשיים, לא תתי-משימות
          .ilike('name', `%${sanitizeSearch(args.goal_name)}%`)
          .limit(1)
          .single();
        goal = data;
      }
      if (!goal) {
        return JSON.stringify({ error: `לא נמצא יעד בשם "${args.goal_name || args.goal_id}" עבור הלקוח ${email}` });
      }
      // וידוא שהיעד שייך ללקוח הנכון
      if (goal.customer_email !== email) {
        return JSON.stringify({ error: 'היעד לא שייך ללקוח שצוין' });
      }

      // ספירת תת-משימות קיימות לצורך order_index
      const { data: existingSubs } = await supabaseAdmin
        .from('customer_goal')
        .select('id')
        .eq('parent_id', goal.id);
      const startIdx = (existingSubs || []).length;

      const subtaskRows = args.subtasks.map((st, idx) => ({
        customer_email: email,
        parent_id: goal.id,
        name: typeof st === 'string' ? st : st.name,
        status: 'open',
        task_type: 'one_time',
        end_date: (typeof st === 'object' && st.end_date) ? st.end_date : (goal.end_date || null),
        order_index: startIdx + idx,
        is_active: true,
        created_by: user.email,
        created_date: new Date().toISOString(),
      }));

      const { data: subs, error: subErr } = await supabaseAdmin
        .from('customer_goal')
        .insert(subtaskRows)
        .select();
      if (subErr) return toolError('add_subtasks_to_goal', subErr);

      const names = (subs || []).map(s => s.name).join(', ');
      return JSON.stringify({
        message: `${subs?.length || 0} תת-משימות נוספו ליעד "${goal.name}": ${names}`,
        goal_id: goal.id,
        goal_name: goal.name,
        subtasks_created: subs?.length || 0,
        subtasks: subs,
      });
    }

    // ── Goal template tools ──

    case 'list_goal_templates': {
      let q = supabaseAdmin
        .from('goal_template')
        .select('id, name, description, category, estimated_duration_days, success_metrics, action_steps, usage_count')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(30);
      if (args.category) q = q.eq('category', args.category);
      const { data, error } = await q;
      if (error) return toolError('list_goal_templates', error);
      if (!data?.length) return JSON.stringify({ message: 'לא נמצאו תבניות יעדים', count: 0 });
      return JSON.stringify({ count: data.length, templates: data });
    }

    case 'create_goal_from_template': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור יעדים' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה ליצור יעד ללקוח זה' });
      }

      // שליפת התבנית
      const { data: template } = await supabaseAdmin
        .from('goal_template')
        .select('*')
        .eq('id', args.template_id)
        .eq('is_active', true)
        .single();
      if (!template) return JSON.stringify({ error: 'תבנית לא נמצאה או לא פעילה' });

      // חישוב order_index
      const { data: existingGoals } = await supabaseAdmin
        .from('customer_goal')
        .select('id')
        .eq('customer_email', email)
        .is('parent_id', null);
      const orderIndex = (existingGoals || []).length;

      // חישוב תאריך יעד
      const durationDays = args.duration_days || template.estimated_duration_days || 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      // יצירת היעד הראשי
      const goalPayload = {
        customer_email: email,
        name: (args.custom_name || template.name || '').trim(),
        notes: args.notes || template.description || '',
        status: 'open',
        end_date: endDate.toISOString().split('T')[0],
        success_metrics: template.success_metrics || '',
        order_index: orderIndex,
        task_type: 'goal',
        is_active: true,
        created_by: user.email,
        created_date: new Date().toISOString(),
      };
      if (args.assignee_email) goalPayload.assignee_email = args.assignee_email;

      const { data: newGoal, error: goalErr } = await supabaseAdmin
        .from('customer_goal')
        .insert(goalPayload)
        .select()
        .single();
      if (goalErr) return toolError('create_goal_from_template', goalErr);

      // יצירת תת-משימות מ-action_steps של התבנית
      let subtasksCreated = 0;
      const actionSteps = template.action_steps || template.suggested_tasks || [];
      if (actionSteps.length > 0 && newGoal?.id) {
        const startDate = new Date();
        const subtaskRows = actionSteps.map((step, idx) => {
          const taskDate = new Date(startDate);
          taskDate.setDate(taskDate.getDate() + Math.floor((durationDays / actionSteps.length) * idx));
          return {
            customer_email: email,
            parent_id: newGoal.id,
            name: typeof step === 'string' ? step : (step.name || step.title || ''),
            status: 'open',
            task_type: 'one_time',
            end_date: taskDate.toISOString().split('T')[0],
            order_index: idx,
            is_active: true,
            created_by: user.email,
            created_date: new Date().toISOString(),
          };
        });
        const { data: subs, error: subErr } = await supabaseAdmin
          .from('customer_goal')
          .insert(subtaskRows)
          .select();
        if (subErr) console.error('[create_goal_from_template/subtasks]', subErr.message);
        subtasksCreated = subs?.length || 0;
      }

      // עדכון מונה שימוש בתבנית
      await supabaseAdmin
        .from('goal_template')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', args.template_id);

      return JSON.stringify({
        message: `יעד "${newGoal.name}" נוצר בהצלחה מתבנית "${template.name}" עם ${subtasksCreated} תת-משימות`,
        goal: newGoal,
        template_name: template.name,
        subtasks_created: subtasksCreated,
      });
    }

    // ── File tools ──

    case 'associate_file_with_customer': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה לשייך קבצים' });
      }
      const email = args.customer_email;
      if (allowedEmails !== null && !allowedEmails.includes(email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לשייך קובץ ללקוח זה' });
      }

      // וידוא שהקובץ קיים
      const { data: file } = await supabaseAdmin
        .from('file_upload')
        .select('id, file_name')
        .eq('id', args.file_id)
        .single();
      if (!file) return JSON.stringify({ error: 'קובץ לא נמצא' });

      const { data, error } = await supabaseAdmin
        .from('file_upload')
        .update({ customer_email: email })
        .eq('id', args.file_id)
        .select()
        .single();
      if (error) return toolError('associate_file_with_customer', error);
      return JSON.stringify({ message: `קובץ "${file.file_name}" שויך ללקוח ${email}`, file: data });
    }

    case 'analyze_file': {
      if (!canWrite(user)) {
        return JSON.stringify({ error: 'אין לך הרשאה לנתח קבצים' });
      }

      // שליפת הקובץ
      const { data: file } = await supabaseAdmin
        .from('file_upload')
        .select('*')
        .eq('id', args.file_id)
        .single();
      if (!file) return JSON.stringify({ error: 'קובץ לא נמצא' });

      // בדיקת הרשאה — הקובץ משויך ללקוח שהמשתמש מורשה לראות
      if (file.customer_email && allowedEmails !== null && !allowedEmails.includes(file.customer_email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לנתח קובץ זה' });
      }

      const fileUrl = file.file_url;
      if (!fileUrl) return JSON.stringify({ error: 'לקובץ אין URL — לא ניתן לנתח' });

      const prompt = args.analysis_prompt ||
        'נתח את הקובץ הזה בפירוט. זהה נתונים מרכזיים, מגמות, ותובנות חשובות. ענה בעברית.';

      try {
        const result = await openRouterAPI({
          prompt,
          file_urls: [fileUrl],
        });

        // שמור את התוצאה ב-ai_insights
        await supabaseAdmin
          .from('file_upload')
          .update({
            ai_insights: typeof result === 'string' ? result : JSON.stringify(result),
            status: 'analyzed',
          })
          .eq('id', args.file_id);

        const summary = typeof result === 'string'
          ? result.slice(0, 2000)
          : JSON.stringify(result).slice(0, 2000);
        return JSON.stringify({ message: 'הקובץ נותח בהצלחה', analysis: summary });
      } catch (err) {
        return toolError('analyze_file', err);
      }
    }

    case 'get_file_analysis': {
      const { data: file } = await supabaseAdmin
        .from('file_upload')
        .select('id, file_name, file_type, status, customer_email, parsed_data, ai_insights, data_category')
        .eq('id', args.file_id)
        .single();
      if (!file) return JSON.stringify({ error: 'קובץ לא נמצא' });

      // בדיקת הרשאה
      if (file.customer_email && allowedEmails !== null && !allowedEmails.includes(file.customer_email)) {
        return JSON.stringify({ error: 'אין לך הרשאה לצפות בקובץ זה' });
      }

      return JSON.stringify({
        file_name: file.file_name,
        file_type: file.file_type,
        status: file.status,
        data_category: file.data_category,
        has_parsed_data: !!file.parsed_data,
        has_ai_insights: !!file.ai_insights,
        // שולח תקציר של parsed_data אם קיים
        parsed_data_preview: file.parsed_data
          ? JSON.stringify(file.parsed_data).slice(0, 1500)
          : null,
        ai_insights_preview: file.ai_insights
          ? (typeof file.ai_insights === 'string' ? file.ai_insights.slice(0, 1500) : JSON.stringify(file.ai_insights).slice(0, 1500))
          : null,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
