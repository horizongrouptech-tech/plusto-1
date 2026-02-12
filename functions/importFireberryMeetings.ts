import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
          url: 'https://plusto-35082d94.base44.app/api/apps/68402e39aac4f2ad35082d94/functions/importFireberryMeetings?token=YOUR_TOKEN',
          body: 'Single meeting object or { meetings: [...] }'
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
    let meetings;
    let action = 'import';
    
    if (body.meetingid) {
      meetings = [body];
    } else if (body.meetings && Array.isArray(body.meetings)) {
      meetings = body.meetings;
      action = body.action || 'import';
    } else if (Array.isArray(body)) {
      meetings = body;
    } else {
      return Response.json({ 
        error: 'Invalid request format. Expected meeting object with meetingid field or meetings array'
      }, { status: 400 });
    }

    // מיפוי סטטוסים מפיירברי לפלאסטו
    const statusMapping = {
      1: 'scheduled',    // נקבעה
      10: 'completed',   // בוצעה
      12: 'cancelled'    // בוטלה
    };

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      imported_meetings: []
    };

    // טעינת נתונים לזיהוי לקוח
    const allOnboarding = await base44.asServiceRole.entities.OnboardingRequest.list();

    // עיבוד כל פגישה
    for (const fbMeeting of meetings) {
      try {
        // בדיקה אם הפגישה כבר קיימת במערכת לפי pcfPlastoMeetingId
        let existingMeeting = null;
        if (fbMeeting.pcfPlastoMeetingId) {
          const existingMeetings = await base44.asServiceRole.entities.CustomerGoal.filter({ 
            id: fbMeeting.pcfPlastoMeetingId 
          });
          if (existingMeetings.length > 0) {
            existingMeeting = existingMeetings[0];
            console.log(`✅ Found existing meeting: ${existingMeeting.id}`);
          }
        }

        let customerEmail = null;
        // מזהה הלקוח בפיירברי
        let fireberryAccountId = fbMeeting.pcfsystemfield35 || fbMeeting.objectid || fbMeeting.accountid || fbMeeting.parentcustomerid || fbMeeting.regardingobjectid;

        // 1. חיפוש לפי fireberry_account_id
        if (fireberryAccountId) {
            const matchedCustomer = allOnboarding.find(c => c.fireberry_account_id === fireberryAccountId);
            if (matchedCustomer) {
                customerEmail = matchedCustomer.email;
                console.log(`✅ Customer matched by fireberry_account_id: ${customerEmail}`);
            } else {
                console.log(`⚠️ No customer found for fireberry_account_id: ${fireberryAccountId}`);
            }
        }

        // 2. Fallback - זיהוי מבוסס שם ומנהל (אם אין ID)
        if (!customerEmail && !fireberryAccountId) {
             const searchKey = (fbMeeting.objecttitle || '').toLowerCase();
             let managerEmail = fbMeeting.owneremail; 
             
             if (managerEmail && searchKey) {
                 const managerCustomers = allOnboarding.filter(c => c.assigned_financial_manager_email === managerEmail);
                 const matchedCustomer = managerCustomers.find(c => {
                     const businessName = (c.business_name || '').toLowerCase();
                     const fullName = (c.full_name || '').toLowerCase();
                     return businessName === searchKey || fullName === searchKey;
                 });
                 if (matchedCustomer) {
                     customerEmail = matchedCustomer.email;
                 }
             }
        }

        // המרת התאריכים
        const startDateTime = fbMeeting.start_datetime ? new Date(fbMeeting.start_datetime) : new Date();
        const endDateTime = fbMeeting.end_datetime ? new Date(fbMeeting.end_datetime) : new Date(startDateTime.getTime() + 60 * 60 * 1000); // שעה אחרי אם לא צוין

        const startDate = startDateTime.toISOString().split('T')[0];
        const endDate = endDateTime.toISOString().split('T')[0];
        const startTime = startDateTime.toTimeString().slice(0, 5); // HH:MM
        const endTime = endDateTime.toTimeString().slice(0, 5); // HH:MM

        // חיפוש האחראי לפגישה לפי fireberry_user_id
        let assigneeEmail = null;
        if (fbMeeting.ownerid) {
          const assigneeUsers = await base44.asServiceRole.entities.User.filter({ 
            fireberry_user_id: fbMeeting.ownerid 
          });

          if (assigneeUsers.length > 0) {
            assigneeEmail = assigneeUsers[0].email;
            console.log(`✅ Assignee found: ${assigneeEmail} for fireberry_user_id: ${fbMeeting.ownerid}`);
          } else {
            console.log(`⚠️ No user found for fireberry_user_id: ${fbMeeting.ownerid}`);
          }
        }

        // בניית additional_notes (JSON)
        const additionalData = {
          start_time: startTime,
          end_time: endTime,
          channel: fbMeeting.channel || 'zoom',
          location: fbMeeting.location || '',
          location_details: '',
          description: fbMeeting.description || '',
          participants: fbMeeting.participants || '',
          main_points: ['', '', '', '', ''],
          tasks: '',
          next_meeting_date: '',
          whatsapp_summary: '',
          status: statusMapping[fbMeeting.statuscode] || 'scheduled',
          send_reminder: true,
          invite_customer: true
        };

        // בניית אובייקט הפגישה
        const meetingData = {
          name: fbMeeting.subject || 'פגישת ניהול כספים',
          task_type: 'meeting',
          start_date: startDate,
          end_date: endDate,
          description: fbMeeting.description || '',
          additional_notes: JSON.stringify(additionalData),
          customer_email: customerEmail, // יכול להיות null אם לא נמצא לקוח
          related_fireberry_account_id: fireberryAccountId || null,
          assignee_email: assigneeEmail, 
          status: statusMapping[fbMeeting.statuscode] === 'completed' ? 'done' : 
                  (statusMapping[fbMeeting.statuscode] === 'cancelled' ? 'cancelled' : 'open'),
          is_active: true,
          order_index: 0,
          fireberry_meeting_id: fbMeeting.meetingid,
          fireberry_synced_at: new Date().toISOString()
        };

        let finalMeeting;
        
        // אם הפגישה קיימת - עדכון, אחרת - יצירה
        if (existingMeeting) {
          console.log(`🔄 Updating existing meeting: ${existingMeeting.id}`);
          await base44.asServiceRole.entities.CustomerGoal.update(existingMeeting.id, meetingData);
          finalMeeting = { id: existingMeeting.id };
        } else {
          console.log(`➕ Creating new meeting`);
          finalMeeting = await base44.asServiceRole.entities.CustomerGoal.create(meetingData);
        }
        
        results.success++;
        results.imported_meetings.push({
          fireberry_id: fbMeeting.meetingid,
          plasto_id: finalMeeting.id,
          subject: meetingData.name,
          customer_found: !!customerEmail,
          unassigned: !customerEmail,
          action: existingMeeting ? 'updated' : 'created'
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          fireberry_id: fbMeeting.meetingid,
          subject: fbMeeting.subject,
          error: error.message
        });
        console.error(`Error processing meeting:`, error);
      }
    }

    return Response.json({
      message: 'Import completed',
      total: meetings.length,
      success: results.success,
      failed: results.failed,
      imported_meetings: results.imported_meetings,
      errors: results.errors
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
