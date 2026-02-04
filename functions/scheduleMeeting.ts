import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * פונקציה לתזמון פגישה וסנכרון עם Google Calendar
 * 
 * הפונקציה:
 * 1. יוצרת אירוע ב-Google Calendar
 * 2. שולחת זימונים למנהל הכספים ולקוח
 * 3. מחזירה את מזהה האירוע לשמירה במערכת
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      meeting_id,
      customer_email,
      financial_manager_email,
      subject,
      start_datetime,
      end_datetime,
      location,
      description,
      invite_customer,
      send_reminder,
      customer_name
    } = await req.json();

    // נושא בפורמט אחיד: "פגישת ניהול כספים מספר X, [שם הלקוח]"
    const meetingSubject = subject || `פגישת ניהול כספים, ${customer_name || customer_email}`;

    // בניית רשימת המוזמנים
    const attendees = [];
    
    // מנהל הכספים תמיד מוזמן
    if (financial_manager_email) {
      attendees.push({
        email: financial_manager_email,
        responseStatus: 'accepted'
      });
    }

    // הלקוח מוזמן רק אם נבחר
    if (invite_customer && customer_email) {
      attendees.push({
        email: customer_email,
        displayName: customer_name || customer_email
      });
    }

    // בניית תיאור הפגישה
    const eventDescription = `
פגישת ניהול כספים

לקוח: ${customer_name || customer_email}
מנהל כספים: ${financial_manager_email}

${description || ''}

---
פגישה זו נוצרה אוטומטית ממערכת Plusto
    `.trim();

    // בניית מיקום הפגישה
    let eventLocation = location;
    if (location === 'zoom') {
      eventLocation = 'Zoom (קישור יישלח בנפרד)';
    } else if (location === 'teams') {
      eventLocation = 'Microsoft Teams';
    } else if (location === 'google_meet') {
      eventLocation = 'Google Meet';
    } else if (location === 'phone') {
      eventLocation = 'שיחת טלפון';
    }

    // הגדרת תזכורות
    const reminders = send_reminder ? {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // יום לפני
        { method: 'popup', minutes: 30 }, // 30 דקות לפני
        { method: 'email', minutes: 60 } // שעה לפני
      ]
    } : { useDefault: true };

    // יצירת האירוע בגוגל קלנדר
    try {
      const { data: calendarResponse, error: calendarError } = await base44.asServiceRole.integrations.Google.CreateCalendarEvent({
        summary: meetingSubject,
        description: eventDescription,
        start: {
          dateTime: start_datetime,
          timeZone: 'Asia/Jerusalem'
        },
        end: {
          dateTime: end_datetime,
          timeZone: 'Asia/Jerusalem'
        },
        location: eventLocation,
        attendees: attendees,
        reminders: reminders,
        // הוספת Google Meet אוטומטית אם זה נבחר
        conferenceData: location === 'google_meet' ? {
          createRequest: {
            requestId: `plusto-${meeting_id}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        } : undefined,
        sendUpdates: 'all' // שליחת הזמנות לכל המשתתפים
      });

      if (calendarError) {
        console.error('Google Calendar API Error:', calendarError);
        return Response.json({ 
          success: false, 
          error: 'Failed to create calendar event',
          details: calendarError 
        }, { status: 500 });
      }

      // שליחת מייל נוסף ללקוח עם פרטי הפגישה
      if (invite_customer && customer_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customer_email,
            subject: `זימון לפגישה: ${subject}`,
            body: `
שלום ${customer_name || ''},

הוזמנת לפגישת ניהול כספים.

פרטי הפגישה:
📅 תאריך: ${new Date(start_datetime).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 שעה: ${new Date(start_datetime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(end_datetime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
📍 מיקום: ${eventLocation}

${description ? `הערות: ${description}` : ''}

נשמח לראותך!

בברכה,
צוות Plusto
            `.trim()
          });
        } catch (emailError) {
          console.error('Error sending email to customer:', emailError);
          // לא נכשיל את הפונקציה אם המייל נכשל
        }
      }

      return Response.json({
        success: true,
        event_id: calendarResponse?.id,
        html_link: calendarResponse?.htmlLink,
        meet_link: calendarResponse?.hangoutLink || calendarResponse?.conferenceData?.entryPoints?.[0]?.uri
      });

    } catch (calendarException) {
      console.error('Calendar exception:', calendarException);
      
      // במקרה שאין אינטגרציה פעילה, נשלח לפחות מייל
      if (invite_customer && customer_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customer_email,
            subject: `זימון לפגישה: ${subject}`,
            body: `
שלום ${customer_name || ''},

הוזמנת לפגישת ניהול כספים.

פרטי הפגישה:
📅 תאריך: ${new Date(start_datetime).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 שעה: ${new Date(start_datetime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(end_datetime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
📍 מיקום: ${eventLocation || 'יימסר בנפרד'}

${description ? `הערות: ${description}` : ''}

בברכה,
צוות Plusto
            `.trim()
          });
          
          return Response.json({
            success: true,
            event_id: null,
            message: 'Meeting created, email sent (Google Calendar not available)'
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }

      return Response.json({
        success: false,
        error: 'Google Calendar integration not available',
        details: calendarException.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in scheduleMeeting:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});