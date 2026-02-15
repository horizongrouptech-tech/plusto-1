import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * פונקציה לתיקון סיווג יעדים - מעדכנת את כל הפריטים שאין להם parent_id להיות יעדים
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // אימות משתמש אדמין
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // שלב 1: מביא את כל הרשומות ב-CustomerGoal
    console.log('שלב 1: טוען את כל היעדים והמשימות...');
    const allGoals = await base44.asServiceRole.entities.CustomerGoal.filter({}, '-created_date', 10000);
    
    console.log(`נמצאו ${allGoals.length} פריטים במערכת`);

    // שלב 2: מזהה פריטים שצריכים להיות יעדים
    const itemsToFix = allGoals.filter(item => {
      // תנאי: אין parent_id (לא משימת-משנה) ו-task_type לא מוגדר כ-goal
      const hasNoParent = !item.parent_id;
      const isNotGoal = item.task_type !== 'goal';
      
      return hasNoParent && isNotGoal;
    });

    console.log(`נמצאו ${itemsToFix.length} פריטים שצריכים עדכון`);

    if (itemsToFix.length === 0) {
      return Response.json({
        success: true,
        message: 'לא נמצאו פריטים שצריכים עדכון',
        totalChecked: allGoals.length,
        itemsFixed: 0
      });
    }

    // שלב 3: מעדכן את הפריטים במנות כדי למנוע Rate Limit
    const BATCH_SIZE = 10; // מעדכן 10 פריטים בכל מנה
    const DELAY_BETWEEN_BATCHES = 1000; // המתנה של שנייה בין מנות
    
    let updatedCount = 0;
    
    for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
      const batch = itemsToFix.slice(i, i + BATCH_SIZE);
      console.log(`מעבד מנה ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(itemsToFix.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(item => {
        console.log(`מעדכן: ${item.name} (${item.id}) -> task_type: 'goal'`);
        return base44.asServiceRole.entities.CustomerGoal.update(item.id, {
          task_type: 'goal'
        });
      });
      
      await Promise.all(batchPromises);
      updatedCount += batch.length;
      
      // המתנה בין מנות (מלבד המנה האחרונה)
      if (i + BATCH_SIZE < itemsToFix.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`כל העדכונים בוצעו בהצלחה! עודכנו ${updatedCount} פריטים`);

    return Response.json({
      success: true,
      message: `עודכנו ${itemsToFix.length} פריטים להיות יעדים`,
      totalChecked: allGoals.length,
      itemsFixed: itemsToFix.length,
      details: itemsToFix.map(item => ({
        id: item.id,
        name: item.name,
        customer_email: item.customer_email,
        previousType: item.task_type
      }))
    });

  } catch (error) {
    console.error('שגיאה בתיקון היעדים:', error);
    return Response.json(
      { 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
});