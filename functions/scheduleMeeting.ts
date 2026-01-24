import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'), 
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        
        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        const adminEmail = "byo@post.bgu.ac.il"; // Email for Hilli
        const emailSubject = `בקשה לפגישת ייעוץ מלקוח: ${user.business_name || user.full_name}`;
        
        const emailBody = `
            <!DOCTYPE html>
            <html dir="rtl" lang="he">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 0; }
                    .email-container { max-width: 600px; margin: 20px auto; padding: 25px; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #32acc1; }
                    .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                    .header h1 { color: #121725; font-size: 24px; margin: 0; }
                    .content p { line-height: 1.7; }
                    .content h2 { color: #32acc1; font-size: 18px; border-bottom: 2px solid #fc9f67; padding-bottom: 5px; display: inline-block; margin-top: 20px; }
                    .user-details { list-style: none; padding: 0; }
                    .user-details li { background-color: #f9f9f9; border: 1px solid #eee; padding: 12px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
                    .user-details strong { color: #121725; font-size: 16px; }
                    .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #888; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>בקשה חדשה לפגישת ייעוץ</h1>
                    </div>
                    <div class="content">
                        <p>הי הילי,</p>
                        <p>התקבלה בקשה חדשה לפגישת עבודה עם יועץ כספים דרך סוכן החירום במערכת Plusto.</p>
                        <h2>פרטי הלקוח:</h2>
                        <ul class="user-details">
                            <li><span>שם העסק:</span> <strong>${user.business_name || 'לא צוין'}</strong></li>
                            <li><span>שם מלא:</span> <strong>${user.full_name || 'לא צוין'}</strong></li>
                            <li><span>אימייל:</span> <strong><a href="mailto:${user.email}">${user.email}</a></strong></li>
                            <li><span>טלפון:</span> <strong><a href="tel:${user.phone}">${user.phone || 'לא צוין'}</a></strong></li>
                        </ul>
                        <h2>שלבים הבאים:</h2>
                        <p>אנא צרי קשר עם הלקוח בהקדם האפשרי על מנת לתאם פגישת עבודה קצרה (עד 30 דקות) עם אלירן.</p>
                    </div>
                    <div class="footer">
                        <p>הודעה זו נשלחה אוטומטית ממערכת Plusto.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await base44.integrations.Core.SendEmail({
            to: adminEmail,
            from_name: "Plusto - מערכת חכמה",
            subject: emailSubject,
            body: emailBody,
        });

        return new Response(JSON.stringify({ message: "Request sent successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in scheduleMeeting function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});