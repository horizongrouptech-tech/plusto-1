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

    // שלב 3: מעדכן את הפריטים
    const updatePromises = itemsToFix.map(item => {
      console.log(`מעדכן: ${item.name} (${item.id}) -> task_type: 'goal'`);
      return base44.asServiceRole.entities.CustomerGoal.update(item.id, {
        task_type: 'goal'
      });
    });

    // מבצע את כל העדכונים במקביל
    await Promise.all(updatePromises);

    console.log('כל העדכונים בוצעו בהצלחה!');

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