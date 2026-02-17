import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * פונקציה לתיקון סיווג יעדים - לוגיקה חכמה:
 * 1. פריטים עם תת-משימות שאינם מסומנים כ-goal -> מתקן ל-goal
 * 2. לא נוגע במשימות עצמאיות (ללא parent_id וללא תת-משימות)
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

    // שלב 2: בניית מפת parent_id -> רשימת תת-משימות
    const childrenByParent = new Map();
    for (const item of allGoals) {
      if (item.parent_id) {
        if (!childrenByParent.has(item.parent_id)) {
          childrenByParent.set(item.parent_id, []);
        }
        childrenByParent.get(item.parent_id).push(item);
      }
    }

    // שלב 3: מזהה פריטים שצריכים להיות יעדים - רק אלה שיש להם תת-משימות
    const itemsToFix = allGoals.filter(item => {
      const isNotGoal = item.task_type !== 'goal';
      const hasChildren = childrenByParent.has(item.id);
      return isNotGoal && hasChildren;
    });

    console.log(`נמצאו ${itemsToFix.length} פריטים עם תת-משימות שצריכים עדכון ל-goal`);

    // דוח על מצב כללי
    const explicitGoals = allGoals.filter(item => item.task_type === 'goal');
    const standaloneTasksNotGoal = allGoals.filter(item => 
      !item.parent_id && item.task_type !== 'goal' && !childrenByParent.has(item.id)
    );
    const subtasks = allGoals.filter(item => !!item.parent_id);

    console.log(`סטטיסטיקות: ${explicitGoals.length} יעדים מפורשים, ${standaloneTasksNotGoal.length} משימות עצמאיות, ${subtasks.length} תת-משימות`);

    if (itemsToFix.length === 0) {
      return Response.json({
        success: true,
        message: 'לא נמצאו פריטים שצריכים עדכון',
        totalChecked: allGoals.length,
        itemsFixed: 0,
        stats: {
          explicitGoals: explicitGoals.length,
          standaloneTasks: standaloneTasksNotGoal.length,
          subtasks: subtasks.length
        }
      });
    }

    // שלב 4: מעדכן את הפריטים במנות כדי למנוע Rate Limit
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 2000;
    
    let updatedCount = 0;
    const results = [];
    
    for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
      const batch = itemsToFix.slice(i, i + BATCH_SIZE);
      console.log(`מעבד מנה ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(itemsToFix.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (item) => {
        try {
          const childCount = childrenByParent.get(item.id)?.length || 0;
          console.log(`מעדכן: ${item.name} (${item.id}) -> task_type: 'goal' (יש ${childCount} תת-משימות)`);
          
          await base44.asServiceRole.entities.CustomerGoal.update(item.id, {
            task_type: 'goal'
          });
          
          return { success: true, id: item.id, name: item.name, childCount };
        } catch (error) {
          console.error(`שגיאה בעדכון ${item.id}:`, error.message);
          return { success: false, id: item.id, name: item.name, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      updatedCount += batchResults.filter(r => r.success).length;
      
      // המתנה בין מנות (מלבד המנה האחרונה)
      if (i + BATCH_SIZE < itemsToFix.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`כל העדכונים בוצעו! עודכנו ${updatedCount} פריטים`);

    return Response.json({
      success: true,
      message: `עודכנו ${updatedCount} פריטים להיות יעדים (רק כאלה עם תת-משימות)`,
      totalChecked: allGoals.length,
      itemsFixed: updatedCount,
      stats: {
        explicitGoals: explicitGoals.length + updatedCount,
        standaloneTasks: standaloneTasksNotGoal.length,
        subtasks: subtasks.length
      },
      details: results.map(r => ({
        id: r.id,
        name: r.name,
        success: r.success,
        childCount: r.childCount,
        error: r.error
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