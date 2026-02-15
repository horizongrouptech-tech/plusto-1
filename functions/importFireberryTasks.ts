import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// פונקציה לשליחת עדכון לפיירברי
async function sendUpdateToFireberry(taskData) {
  const fireberryWebhookUrl = Deno.env.get('FIREBERRY_WEBHOOK_URL');
  
  if (!fireberryWebhookUrl) {
    console.error('FIREBERRY_WEBHOOK_URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    // המרת סטטוסים חזרה לפיירברי
    const statusToFireberry = {
      'open': 1,
      'in_progress': 11,
      'done': 10,
      'delayed': 1,
      'cancelled': 12
    };

    // המרת עדיפויות חזרה לפיירברי
    const priorityToFireberry = {
      'low': 1,
      'normal': 2,
      'high': 3
    };

    const fireberryPayload = {
      taskid: taskData.fireberry_task_id,
      pcfPlastoTaskId: taskData.id,
      subject: taskData.subject,
      description: taskData.description,
      statuscode: statusToFireberry[taskData.status] || 1,
      prioritycode: priorityToFireberry[taskData.priority] || 2,
      scheduledend: taskData.due_date,
      pcfActualEndDate: taskData.completed_date,
      ownername: taskData.assigned_to_name
    };

    const response = await fetch(fireberryWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fireberryPayload)
    });

    if (!response.ok) {
      throw new Error(`Fireberry webhook failed: ${response.status} ${response.statusText}`);
    }

    return { success: true, response: await response.text() };
  } catch (error) {
    console.error('Error sending to Fireberry:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // אימות באמצעות secret token
    const authHeader = req.headers.get('Authorization');
    const urlParams = new URL(req.url).searchParams;
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromQuery = urlParams.get('token');
    const providedToken = tokenFromHeader || tokenFromQuery;
    
    const expectedToken = Deno.env.get('FIREBERRY_WEBHOOK_SECRET');
    
    if (!expectedToken) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (!providedToken || providedToken !== expectedToken) {
      return Response.json({ error: 'Invalid or missing authentication token' }, { status: 401 });
    }

    // בדיקה שזה POST request
    if (req.method !== 'POST') {
      return Response.json({ 
        error: 'Method not allowed. Use POST request.',
        expected_format: {
          method: 'POST',
          url: 'https://plusto-35082d94.base44.app/api/apps/68402e39aac4f2ad35082d94/functions/importFireberryTasks?token=YOUR_TOKEN',
          body: 'Single task object or { tasks: [...] }'
        }
      }, { status: 405 });
    }

    const text = await req.text();
    
    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      return Response.json({ 
        error: 'Invalid JSON format - Fireberry is not sending raw JSON',
        details: parseError.message
      }, { status: 400 });
    }
    
    // זיהוי אוטומטי של הפורמט - אובייקט בודד או מערך
    let tasks;
    let action = 'import';
    
    if (body.taskid) {
      tasks = [body];
    } else if (body.tasks && Array.isArray(body.tasks)) {
      tasks = body.tasks;
      action = body.action || 'import';
    } else if (Array.isArray(body)) {
      tasks = body;
    } else {
      return Response.json({ 
        error: 'Invalid request format. Expected task object with taskid field or tasks array'
      }, { status: 400 });
    }
    
    // אם זה סנכרון חזרה לפיירברי
    if (action === 'sync_back') {
      const syncResults = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const task of tasks) {
        const result = await sendUpdateToFireberry(task);
        if (result.success) {
          syncResults.success++;
        } else {
          syncResults.failed++;
          syncResults.errors.push({
            task_id: task.fireberry_task_id || task.id,
            error: result.error
          });
        }
      }

      return Response.json({
        message: 'Sync to Fireberry completed',
        total: tasks.length,
        success: syncResults.success,
        failed: syncResults.failed,
        errors: syncResults.errors
      });
    }

    // מיפוי סטטוסים מפיירברי לפלאסטו
    const statusMapping = {
      1: 'open',       // פתוח
      11: 'in_progress', // בביצוע
      10: 'done',      // הושלם
      12: 'cancelled'  // בוטל
    };

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      imported_tasks: []
    };

    // טעינת נתונים לזיהוי לקוח (רק שדות נדרשים לחיסכון בזמן)
    // אופטימיזציה: שאילתה רק אם יש ID
    const allOnboarding = await base44.asServiceRole.entities.OnboardingRequest.list();

    // עיבוד כל משימה
    for (const fbTask of tasks) {
      try {
        // בדיקה אם המשימה כבר קיימת במערכת לפי pcfPlastoTaskId
        let existingTask = null;
        if (fbTask.pcfPlastoTaskId) {
          const existingTasks = await base44.asServiceRole.entities.CustomerGoal.filter({ 
            id: fbTask.pcfPlastoTaskId 
          });
          if (existingTasks.length > 0) {
            existingTask = existingTasks[0];
            console.log(`✅ Found existing task: ${existingTask.id}`);
          }
        }

        let customerEmail = null;
        // מזהה הלקוח בפיירברי - מחפש בשדות השונים שפיירברי משתמש בהם
        let fireberryAccountId = fbTask.pcfsystemfield35 || fbTask.objectid || fbTask.accountid || fbTask.parentcustomerid || fbTask.regardingobjectid;

        // 1. חיפוש לפי fireberry_account_id (הדרך החדשה והמדויקת)
        if (fireberryAccountId) {
            const matchedCustomer = allOnboarding.find(c => c.fireberry_account_id === fireberryAccountId);
            if (matchedCustomer) {
                customerEmail = matchedCustomer.email;
                console.log(`✅ Customer matched by fireberry_account_id: ${customerEmail}`);
            } else {
                console.log(`⚠️ No customer found for fireberry_account_id: ${fireberryAccountId}`);
            }
        }

        // 2. אם לא נמצא לפי ID, ננסה זיהוי מבוסס שם ומנהל (Fallback לישן, למקרה שה-ID חסר)
        // רק אם אין מזהה חשבון בכלל
        if (!customerEmail && !fireberryAccountId) {
             const searchKey = (fbTask.objecttitle || '').toLowerCase();
             let managerEmail = fbTask.owneremail; 
             
             // לוגיקה קודמת של זיהוי מנהל...
             // אני משאיר את זה כ-Fallback אבל העדיפות היא למזהה החד ערכי
             if (managerEmail && searchKey) {
                 const managerCustomers = allOnboarding.filter(c => c.assigned_financial_manager_email === managerEmail);
                 const matchedCustomer = managerCustomers.find(c => {
                     const businessName = (c.business_name || '').toLowerCase();
                     const fullName = (c.full_name || '').toLowerCase();
                     return businessName === searchKey || fullName === searchKey;
                 });
                 if (matchedCustomer) {
                     customerEmail = matchedCustomer.email;
                     // אם מצאנו, נשמור את המזהה לעתיד? לא, כי אין לנו אותו מהמשימה
                 }
             }
        }

        // המרת התאריכים
        const dueDate = fbTask.scheduledend ? new Date(fbTask.scheduledend).toISOString() : null;
        const reminderDate = fbTask.reminderdate ? new Date(fbTask.reminderdate).toISOString() : null;

        // חיפוש האחראי למשימה לפי fireberry_user_id
        let assigneeEmail = null;
        if (fbTask.ownerid) {
          const assigneeUsers = await base44.asServiceRole.entities.User.filter({ 
            fireberry_user_id: fbTask.ownerid 
          });

          if (assigneeUsers.length > 0) {
            assigneeEmail = assigneeUsers[0].email;
            console.log(`✅ Assignee found: ${assigneeEmail} for fireberry_user_id: ${fbTask.ownerid}`);
          } else {
            console.log(`⚠️ No user found for fireberry_user_id: ${fbTask.ownerid}`);
          }
        }

        // בניית אובייקט המשימה
        const taskData = {
          name: fbTask.subject || 'משימה ללא כותרת',
          notes: fbTask.description || (fbTask.pcfGoogleTaskID ? `Google Task ID: ${fbTask.pcfGoogleTaskID}` : null),
          status: statusMapping[fbTask.statuscode] || 'open',
          start_date: new Date().toISOString().split('T')[0],
          end_date: dueDate ? dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          end_date_time: fbTask.scheduledend || null,
          reminder_date: reminderDate,
          customer_email: customerEmail, // יכול להיות null אם לא נמצא לקוח
          related_fireberry_account_id: fireberryAccountId || null, // שמירת המזהה המקורי למקרה של שיוך עתידי
          assignee_email: assigneeEmail, 
          task_type: 'one_time',
          is_active: true,
          order_index: 0,
          fireberry_task_id: fbTask.taskid,
          fireberry_synced_at: new Date().toISOString()
        };

        let finalTask;
        
        // אם המשימה קיימת - עדכון, אחרת - יצירה
        if (existingTask) {
          console.log(`🔄 Updating existing task: ${existingTask.id}`);
          // 🔒 שמירת is_active המקורי בעדכון מפיירברי
          await base44.asServiceRole.entities.CustomerGoal.update(existingTask.id, {
            ...taskData,
            is_active: existingTask.is_active !== false
          });
          finalTask = { id: existingTask.id };
        } else {
          console.log(`➕ Creating new task`);
          finalTask = await base44.asServiceRole.entities.CustomerGoal.create(taskData);
        }
        
        results.success++;
        results.imported_tasks.push({
          fireberry_id: fbTask.taskid,
          plasto_id: finalTask.id,
          subject: taskData.name,
          customer_found: !!customerEmail,
          unassigned: !customerEmail,
          action: existingTask ? 'updated' : 'created'
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          fireberry_id: fbTask.taskid,
          subject: fbTask.subject,
          error: error.message
        });
      }
    }

    return Response.json({
      message: 'Import completed',
      total: tasks.length,
      success: results.success,
      failed: results.failed,
      imported_tasks: results.imported_tasks,
      errors: results.errors
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});