/**
 * פונקציות עזר לבדיקת הרשאות בנק יעדים
 */

/**
 * בדיקה האם למשתמש יש הרשאה לערוך/למחוק תבניות יעדים
 * רק אדמין או מנהל מחלקה
 */
export const canEditGoalTemplates = (user) => {
  if (!user) return false;
  return user.role === 'admin' || 
         user.department_manager_role === 'department_manager';
};

/**
 * בדיקה האם למשתמש יש הרשאה לצפות ולהשתמש בתבניות יעדים
 * כל מנהל כספים (כולל מנהלי מחלקה ואדמין)
 */
export const canUseGoalTemplates = (user) => {
  if (!user) return false;
  return user.user_type === 'financial_manager' || user.role === 'admin';
};

/**
 * קבלת תווית הרשאה לתצוגה
 */
export const getPermissionLabel = (user) => {
  if (!user) return '';
  if (canEditGoalTemplates(user)) return 'ניהול מלא';
  if (canUseGoalTemplates(user)) return 'קריאה בלבד';
  return 'אין גישה';
};