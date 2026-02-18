import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await req.json();
    
    if (!meetingId) {
      return Response.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // קריאת הפגישה עם הרשאות admin כדי לוודא שיש גישה לכל השדות
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ id: meetingId });
    const meeting = meetings[0];
    
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    console.log(`📅 Meeting details - ID: ${meeting.id}, Customer Email: ${meeting.customer_email}, Subject: ${meeting.subject}`);
    console.log(`📅 Fireberry Meeting ID: ${meeting.fireberry_meeting_id || 'NOT SET'}`);

    // קביעת אם זו פגישה חדשה או עדכון
    // אם אין fireberry_meeting_id, זו פגישה חדשה שטרם סונכרנה לפיירברי
    const isNewMeeting = !meeting.fireberry_meeting_id;
    
    console.log(`📅 isNewMeeting: ${isNewMeeting} (fireberry_meeting_id: ${meeting.fireberry_meeting_id ? 'exists' : 'missing'}, pcfPlastoMeetingId: ${meeting.id})`);

    // קריאת נתוני הלקוח - חיפוש קודם ב-OnboardingRequest
    let customerName = '';
    let businessName = '';
    let fireberryAccountId = meeting.related_fireberry_account_id || null;

    if (meeting.customer_email) {
      // נקה את המייל מרווחים וטקסט מיותר
      const cleanEmail = meeting.customer_email.trim().toLowerCase();
      console.log(`🔍 Searching for customer with email: "${cleanEmail}" (original: "${meeting.customer_email}")`);
      
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
        }
      }
    } else {
      console.log(`❌ Meeting has no customer_email!`);
    }

    // קריאת fireberry_user_id של האחראי לפגישה
    let assigneeFireberryUserId = null;
    if (meeting.manager_email) {
      const assigneeUsers = await base44.asServiceRole.entities.User.filter({ 
        email: meeting.manager_email 
      });
      
      if (assigneeUsers.length > 0 && assigneeUsers[0].fireberry_user_id) {
        assigneeFireberryUserId = assigneeUsers[0].fireberry_user_id;
      }
    }

    // המרת סטטוסים לפיירברי
    const statusToFireberry = {
      'scheduled': 1,    // נקבעה
      'completed': 10,    // בוצעה
      'cancelled': 12,    // בוטלה
      'rescheduled': 1,   // נדחתה (נשמרת כפתוחה)
      // מיפוי מסטטוסים של CustomerGoal
      'open': 1,
      'done': 10,
      'cancelled': 12
    };

    // קביעת סטטוס הפגישה
    let meetingStatus = meeting.status || 'scheduled';

    // בניית תאריכי התחלה וסיום
    const startTime = meeting.start_time || '10:00';
    const endTime = meeting.end_time || '11:00';
    const startDate = meeting.start_date || new Date().toISOString().split('T')[0];
    const endDate = meeting.end_date || startDate;
    
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    // בניית הנתונים לשליחה לפיירברי
    const fireberryPayload = {
      meetingid: meeting.fireberry_meeting_id || null,
      pcfPlastoMeetingId: meeting.id,
      subject: meeting.subject || 'פגישת ניהול כספים',
      description: meeting.notes || meeting.description || '',
      start_datetime: startDateTime,
      end_datetime: endDateTime,
      location: meeting.location || meeting.channel || '',
      channel: meeting.channel || 'zoom',
      statuscode: statusToFireberry[meetingStatus] || 1,
      pcfsystemfield35: fireberryAccountId,
      customer_name: customerName,
      business_name: businessName,
      ownerid: assigneeFireberryUserId,
      participants: Array.isArray(meeting.participants) ? meeting.participants.join(', ') : (meeting.participants || ''),
      isNewMeeting: isNewMeeting,
      itemType: 'meeting' // להבדיל ממשימות
    };

    console.log(`📤 Sending meeting to Fireberry:`, JSON.stringify(fireberryPayload, null, 2));

    // שליחה לפיירברי - Webhook URL לפגישות
    const fireberryWebhookUrl = 'https://hook.eu1.make.com/xd9fz081f7uaxkacgfx3iakvyi2swr9r';
    
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
      fireberry_synced_at: new Date().toISOString()
    };

    // שמירת fireberry_meeting_id שחזר מפיירברי
    if (responseData && typeof responseData === 'object' && responseData.meetingid) {
      if (!meeting.fireberry_meeting_id) {
        updateData.fireberry_meeting_id = responseData.meetingid;
        console.log(`✅ Fireberry meeting ID saved: ${responseData.meetingid}`);
      }
    }

    await base44.asServiceRole.entities.Meeting.update(meetingId, updateData);

    return Response.json({ 
      success: true,
      message: 'Meeting synced to Fireberry successfully',
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