import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerEmail } = await req.json();

    if (!customerEmail) {
      return Response.json({ error: 'customerEmail is required' }, { status: 400 });
    }

    // Fetch customer data
    const customers = await base44.entities.OnboardingRequest.filter({
      email: customerEmail
    }, '-created_date');

    const customer = customers[0];

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch recent activities
    const recentGoals = await base44.entities.CustomerGoal.filter({
      customer_email: customerEmail,
      is_active: true
    }, '-updated_date');

    // Fetch recent meetings
    const meetings = await base44.entities.Meeting?.filter({
      customer_email: customerEmail
    }, '-meeting_date') || [];

    // Fetch open tasks
    const openTasks = recentGoals.filter(g => 
      !['meeting_summary', 'daily_checklist', 'daily_checklist_360'].includes(g.task_type) &&
      ['open', 'in_progress'].includes(g.status)
    );

    // Fetch completed tasks since last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedTasks = recentGoals.filter(g => 
      g.status === 'done' &&
      new Date(g.updated_date) >= thirtyDaysAgo &&
      !['meeting_summary', 'daily_checklist'].includes(g.task_type)
    );

    // Get previous meeting summaries (last 3)
    const previousMeetings = meetings.slice(0, 3).filter(m => m.summary);

    // Build preparation document
    const preparation = {
      customer_name: customer.business_name || customer.full_name,
      customer_email: customerEmail,
      preparation_date: new Date().toISOString(),
      prepared_by: user.email,
      
      executive_summary: `הכנה לפגישה עם ${customer.business_name || customer.full_name}. ${openTasks.length} משימות פתוחות, ${completedTasks.length} משימות הושלמו בחודש האחרון.`,
      
      business_overview: {
        business_type: customer.business_type,
        business_city: customer.business_city,
        main_products: customer.main_products_services,
        company_size: customer.company_size,
        monthly_revenue: customer.monthly_revenue
      },

      open_tasks_summary: {
        total_count: openTasks.length,
        high_priority: openTasks.filter(t => t.priority === 'high').length,
        by_status: {
          open: openTasks.filter(t => t.status === 'open').length,
          in_progress: openTasks.filter(t => t.status === 'in_progress').length
        },
        tasks: openTasks.slice(0, 10).map(t => ({
          name: t.name,
          priority: t.priority,
          status: t.status,
          end_date: t.end_date
        }))
      },

      recent_progress: {
        completed_this_month: completedTasks.length,
        tasks: completedTasks.slice(0, 5).map(t => ({
          name: t.name,
          completed_date: t.updated_date
        }))
      },

      recent_meetings: previousMeetings.slice(0, 3).map(m => ({
        date: m.meeting_date,
        summary: m.summary,
        key_decisions: m.key_decisions ? (Array.isArray(m.key_decisions) ? m.key_decisions : m.key_decisions.split('\n')).slice(0, 5) : []
      })),

      key_focus_areas: generateFocusAreas(openTasks, customer),
      
      discussion_points: generateDiscussionPoints(openTasks, completedTasks, previousMeetings),
      
      action_items_for_manager: generateActionItems(openTasks, customer)
    };

    return Response.json(preparation);

  } catch (error) {
    console.error('Error in generateFinancialManagerPreparation:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

function generateFocusAreas(tasks, customer) {
  const areas = [];

  // High priority tasks
  const highPriority = tasks.filter(t => t.priority === 'high');
  if (highPriority.length > 0) {
    areas.push({
      title: 'משימות בעדיפות גבוהה',
      description: `${highPriority.length} משימות המחייבות התייחסות דחופה`,
      count: highPriority.length
    });
  }

  // Overdue tasks
  const overdue = tasks.filter(t => 
    t.end_date && new Date(t.end_date) < new Date()
  );
  if (overdue.length > 0) {
    areas.push({
      title: 'משימות באיחור',
      description: `${overdue.length} משימות שחרגו מלוח הזמנים`,
      count: overdue.length
    });
  }

  // Financial areas
  if (customer.monthly_revenue) {
    areas.push({
      title: 'ניתוח כלכלי',
      description: `התכנסויות חודשיות: ₪${customer.monthly_revenue?.toLocaleString() || 'לא זמין'}`,
      count: null
    });
  }

  return areas;
}

function generateDiscussionPoints(tasks, completed, meetings) {
  const points = [];

  // Progress review
  points.push({
    topic: 'סקירת התקדמות',
    detail: `${completed.length} משימות הושלמו בחודש האחרון`
  });

  // Current challenges
  const delayedTasks = tasks.filter(t => 
    t.end_date && new Date(t.end_date) < new Date()
  );
  if (delayedTasks.length > 0) {
    points.push({
      topic: 'אתגרים עדכניים',
      detail: `${delayedTasks.length} משימות חרגו מלוח הזמנים - דרוש דיון על סיבות ופתרונות`
    });
  }

  // Last meeting recap
  if (meetings.length > 0) {
    points.push({
      topic: 'סקירת הפגישה האחרונה',
      detail: 'בדיקת עמידה בהחלטות שהתקבלו'
    });
  }

  // Next steps
  points.push({
    topic: 'קביעת יעדים לתקופה הקרובה',
    detail: 'הסכמה על משימות עדכניות ויעדים'
  });

  return points;
}

function generateActionItems(tasks, customer) {
  const items = [];

  // Review open tasks
  if (tasks.length > 0) {
    items.push({
      action: 'סקור את רשימת המשימות הפתוחות',
      priority: 'גבוהה'
    });
  }

  // Prepare metrics
  items.push({
    action: 'הכן מדדי ביצוע עדכניים',
    priority: 'בינונית'
  });

  // Review previous decisions
  items.push({
    action: 'בדוק עמידה בהחלטות קודמות',
    priority: 'בינונית'
  });

  return items;
}