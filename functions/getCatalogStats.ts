import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function countAllProducts(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  query: Record<string, unknown>
): Promise<number> {
  let count = 0;
  let skip = 0;
  const batchSize = 5000;

  while (true) {
    const batch = await base44.entities.ProductCatalog.filter(
      query as Parameters<typeof base44.entities.ProductCatalog.filter>[0],
      '-created_date',
      batchSize,
      skip
    );
    count += batch.length;
    if (batch.length < batchSize) break;
    skip += batchSize;
  }

  return count;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { catalog_id } = await req.json();

    if (!catalog_id) {
      return Response.json({ error: 'חסר catalog_id' }, { status: 400 });
    }

    const baseQuery = { catalog_id, is_active: true };

    // כמות מוצרים בלבד (לא סכום שדות) – ספירת רשומות עם התנאי המתאים
    const [complete, incomplete, needsReview, recommended, suggested, missingCost] = await Promise.all([
      countAllProducts(base44, { ...baseQuery, data_quality: 'complete' }),
      countAllProducts(base44, { ...baseQuery, data_quality: 'incomplete' }),
      countAllProducts(base44, { ...baseQuery, needs_review: true }),
      countAllProducts(base44, { ...baseQuery, is_recommended: true }),
      countAllProducts(base44, { ...baseQuery, is_suggested: true }),
      countAllProducts(base44, { ...baseQuery, cost_price: { $lte: 0 } })
    ]);

    // הגבלה: אף ספירה לא תעלה על גודל הקטלוג (מניעת באגים/תשובות מוזרות)
    let cap = Number.POSITIVE_INFINITY;
    try {
      const catalog = await base44.entities.Catalog.get(catalog_id);
      if (catalog?.product_count != null) cap = Number(catalog.product_count);
    } catch (_) { /* ignore */ }

    const clamp = (n: number) => Math.min(n, cap);

    return Response.json({
      complete: clamp(complete),
      incomplete: clamp(incomplete),
      needsReview: clamp(needsReview),
      recommended: clamp(recommended),
      suggested: clamp(suggested),
      missingCost: clamp(missingCost)
    });
  } catch (error) {
    console.error('Error in getCatalogStats:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'שגיאה בקבלת סטטיסטיקות קטלוג' },
      { status: 500 }
    );
  }
});
