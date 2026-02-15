import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await req.json();
    
    if (!taskId) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // קריאת המשימה עם הרשאות admin כדי לוודא שיש גישה לכל השדות
    const tasks = await base44.asServiceRole.entities.CustomerGoal.filter({ id: taskId });
    const task = tasks[0];
    
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log(`📋 Task details - ID: ${task.id}, Customer Email: ${task.customer_email}, Name: ${task.name}`);

    // אם אין fireberry_task_id, זו משימה חדשה שצריך ליצור בפיירברי
    const isNewTask = !task.fireberry_task_id;

    // קריאת נתוני הלקוח - חיפוש קודם ב-OnboardingRequest
    let customerName = '';
    let businessName = '';
    let fireberryAccountId = task.related_fireberry_account_id || null;

    if (task.customer_email) {
      // נקה את המייל מרווחים וטקסט מיותר
      const cleanEmail = task.customer_email.trim().toLowerCase();
      console.log(`🔍 Searching for customer with email: "${cleanEmail}" (original: "${task.customer_email}")`);
      
      // חיפוש ב-OnboardingRequest - נביא את כל הלקוחות ונסנן בצד שלנו
      const allOnboardingCustomers = await base44.asServiceRole.entities.OnboardingRequest.list();
      console.log(`📊 Total OnboardingRequest records: ${allOnboardingCustomers.length}`);
      
      // חיפוש הלקוח לפי מייל (case-insensitive)
      const matchingCustomer = allOnboardingCustomers.find(c => 
        c.email && c.email.trim().toLowerCase() === cleanEmail
      );
      
      if (matchingCustomer) {
        customerName = matchingCustomer.full_name || '';
        businessName = matchingCustomer.business_name || '';
        fireberryAccountId = matchingCustomer.fireberry_account_id || fireberryAccountId;
        console.log(`✅ Customer found in OnboardingRequest:`);
        console.log(`   - Name: ${customerName}`);
        console.log(`   - Business: ${businessName}`);
        console.log(`   - Fireberry ID: ${fireberryAccountId}`);
      } else {
        // חיפוש גיבוי ב-User
        const allUsers = await base44.asServiceRole.entities.User.list();
        console.log(`📊 Total User records: ${allUsers.length}`);
        
        const matchingUser = allUsers.find(u => 
          u.email && u.email.trim().toLowerCase() === cleanEmail
        );
        
        if (matchingUser) {
          customerName = matchingUser.full_name || '';
          businessName = matchingUser.business_name || '';
          fireberryAccountId = matchingUser.fireberry_account_id || fireberryAccountId;
          console.log(`✅ Customer found in User:`);
          console.log(`   - Name: ${customerName}`);
          console.log(`   - Business: ${businessName}`);
          console.log(`   - Fireberry ID: ${fireberryAccountId}`);
        } else {
          console.log(`⚠️ No customer found for email: ${cleanEmail}`);
          // הדפס את כל המיילים הקיימים לניפוי
          const existingEmails = allOnboardingCustomers.map(c => c.email).filter(Boolean).slice(0, 10);
          console.log(`📧 Sample emails in OnboardingRequest: ${JSON.stringify(existingEmails)}`);
        }
      }
    } else {
      console.log(`❌ Task has no customer_email!`);
    }

    // קריאת fireberry_user_id של האחראי למשימה
    let assigneeFireberryUserId = null;
    if (task.assignee_email) {
      const assigneeUsers = await base44.asServiceRole.entities.User.filter({ 
        email: task.assignee_email 
      });
      
      if (assigneeUsers.length > 0 && assigneeUsers[0].fireberry_user_id) {
        assigneeFireberryUserId = assigneeUsers[0].fireberry_user_id;
      }
    }

    // המרת סטטוסים לפיירברי
    const statusToFireberry = {
      'open': 1,
      'in_progress': 11,
      'done': 10,
      'delayed': 1,
      'cancelled': 12
    };

    // בניית הנתונים לשליחה לפיירברי
    // הבחנה בין יעד למשימה
    const isGoal = task.task_type === 'goal';
    
    const fireberryPayload = {
      taskid: task.fireberry_task_id || null,
      pcfPlastoTaskId: task.id,
      subject: task.name,
      description: task.notes || '',
      statuscode: statusToFireberry[task.status] || 1,
      scheduledend: task.end_date_time || (task.end_date ? new Date(task.end_date).toISOString() : null),
      pcfActualEndDate: task.status === 'done' ? new Date().toISOString() : null,
      pcfsystemfield35: fireberryAccountId,
      customer_name: customerName,
      business_name: businessName,
      ownerid: assigneeFireberryUserId,
      reminderdate: task.reminder_date || null,
      isNewTask: isNewTask,
      // הבחנה בין יעד למשימה
      itemType: isGoal ? 'goal' : 'task',
      taskType: task.task_type || 'one_time'
    };

    console.log(`📤 Sending to Fireberry:`, JSON.stringify(fireberryPayload, null, 2));

    // שליחה לפיירברי
    const fireberryWebhookUrl = 'https://hook.eu1.make.com/skhp75w9syp62m9c8hrcunmnk7aat2fi';
    
    const response = await fetch(fireberryWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fireberryPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fireberry webhook error:', errorText);
      throw new Error(`Fireberry webhook failed: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    
    // ניסיון לפרסר את התגובה כ-JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    // עדכון תאריך הסנכרון האחרון
    const updateData = {
      fireberry_synced_at: new Date().toISOString(),
      is_active: task.is_active !== false // 🔒 שמירת is_active המקורי
    };

    // אם זו הייתה משימה חדשה, נשמור את ה-taskid שחזר מפיירברי
    if (isNewTask && responseData && typeof responseData === 'object' && responseData.taskid) {
      updateData.fireberry_task_id = responseData.taskid;
      console.log(`New task created in Fireberry with ID: ${responseData.taskid}`);
    }

    await base44.asServiceRole.entities.CustomerGoal.update(taskId, updateData);

    return Response.json({ 
      success: true,
      message: 'Task synced to Fireberry successfully',
      fireberry_response: responseData
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});