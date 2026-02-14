import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { customer_email } = await req.json();

        if (!customer_email) {
            return new Response(JSON.stringify({ error: 'Customer email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Starting permanent cash flow deletion for ${customer_email}`);

        const result = await base44.asServiceRole.entities.CashFlow.deleteMany({
            customer_email
        });

        const deletedCount = result?.deletedCount ?? result?.count ?? 0;

        console.log(`Cash flow deletion completed. Deleted: ${deletedCount}`);

        return new Response(JSON.stringify({
            success: true,
            deletedCount,
            message: deletedCount > 0
                ? `כל נתוני התזרים נמחקו בהצלחה - ${deletedCount} תנועות`
                : 'אין תנועות למחוק'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error deleting cash flow permanently:', error);
        return new Response(JSON.stringify({
            error: 'שגיאה במחיקת התזרים',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
