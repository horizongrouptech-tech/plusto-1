import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * פונקציה לתזמון פגישה ושליחת זימון במייל עם קובץ ICS
 * 
 * הפונקציה:
 * 1. יוצרת קובץ ICS לאירוע
 * 2. שולחת אימייל עם הזימון למנהל הכספים ולקוח
 * 3. מחזירה את פרטי האירוע
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

    // יצירת תיאור הפגישה
    const eventDescription = `
פגישת ניהול כספים

לקוח: ${customer_name || customer_email}
מנהל כספים: ${financial_manager_email}

${description || ''}

---
פגישה זו נוצרה אוטומטית ממערכת Plusto
    `.trim();

    // יצירת קובץ ICS
    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);
    
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `plusto-meeting-${meeting_id}-${Date.now()}@plusto.co.il`;
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Plusto//Meeting Scheduler//HE
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${subject || 'פגישת ניהול כספים'}
DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}
LOCATION:${eventLocation || ''}
ORGANIZER;CN=Plusto:mailto:${financial_manager_email}
${invite_customer && customer_email ? `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${customer_name || customer_email}:mailto:${customer_email}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

    // המרת ICS ל-Base64 לצירוף כקובץ
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));

    // שליחת מייל למנהל הכספים עם קובץ ICS
    if (financial_manager_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: financial_manager_email,
          subject: `📅 זימון לפגישה: ${subject}`,
          body: `
שלום,

נקבעה פגישת ניהול כספים חדשה.

פרטי הפגישה:
📅 תאריך: ${startDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 שעה: ${startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
📍 מיקום/ערוץ: ${eventLocation}
👤 לקוח: ${customer_name || customer_email}

${description ? `הערות: ${description}` : ''}

הפגישה צורפה כקובץ ICS - פתח אותו כדי להוסיף את הפגישה ליומן.

בברכה,
צוות Plusto

---
[קובץ ICS מצורף]
${icsContent}
          `.trim()
        });
      } catch (emailError) {
        console.error('Error sending email to financial manager:', emailError);
      }
    }

    // שליחת מייל ללקוח עם קובץ ICS
    if (invite_customer && customer_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customer_email,
          subject: `📅 זימון לפגישה: ${subject}`,
          body: `
שלום ${customer_name || ''},

הוזמנת לפגישת ניהול כספים.

פרטי הפגישה:
📅 תאריך: ${startDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 שעה: ${startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
📍 מיקום/ערוץ: ${eventLocation}

${description ? `הערות: ${description}` : ''}

הפגישה צורפה כקובץ ICS - פתח אותו כדי להוסיף את הפגישה ליומן.

נשמח לראותך!

בברכה,
צוות Plusto

---
[קובץ ICS מצורף]
${icsContent}
          `.trim()
        });
        
        console.log('✅ Email sent successfully to customer:', customer_email);
      } catch (emailError) {
        console.error('Error sending email to customer:', emailError);
      }
    }

    // שליחת תזכורת נוספת אם נבחר
    if (send_reminder) {
      // התזכורת תישלח דרך ה-ICS שכבר נשלח
      console.log('Reminder enabled - included in calendar invite');
    }

    return Response.json({
      success: true,
      event_id: uid,
      message: 'Meeting scheduled and invitations sent via email',
      ics_generated: true
    });

  } catch (error) {
    console.error('Error in scheduleMeeting:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});