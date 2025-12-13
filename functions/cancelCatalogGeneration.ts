import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const requestBody = await req.json();
        const { process_id, customer_email } = requestBody;

        if (!process_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'חסר מזהה תהליך'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // בדיקה שהתהליך קיים ושייך למשתמש
        const process = await base44.asServiceRole.entities.ProcessStatus.get(process_id);
        
        if (!process) {
            return new Response(JSON.stringify({
                success: false,
                error: 'תהליך לא נמצא'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (customer_email && process.customer_email !== customer_email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'אין הרשאה לבטל תהליך זה'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ביטול התהליך
        await base44.asServiceRole.entities.ProcessStatus.update(process_id, {
            status: 'cancelled',
            current_step: 'תהליך בוטל על ידי המשתמש',
            completed_at: new Date().toISOString(),
            error_message: 'התהליך בוטל על ידי המשתמש'
        });

        // עדכון סטטוס הקטלוג אם נמצא
        if (process.catalog_id) {
            try {
                await base44.asServiceRole.entities.Catalog.update(process.catalog_id, {
                    status: 'failed'
                });
            } catch (catalogError) {
                console.warn('Failed to update catalog status on cancellation:', catalogError);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'התהליך בוטל בהצלחה'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error cancelling catalog generation:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'שגיאה בביטול התהליך: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});