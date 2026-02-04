# תוכנית יישום מלאה - כל ההערות והתיקונים

## סיכום כללי
תוכנית זו כוללת את כל ההערות והתיקונים הנדרשים על בסיס התמונות והפידבק.

---

## 1. קטלוג - הגדרת קטלוג רשמי

### תיאור:
- אופציה להגדיר קטלוג כברירת מחדל (קטלוג רשמי)
- כפתור שמסמן קטלוג כקטלוג רשמי
- שם הקטלוג אוטומטי יהפוך להיות "קטלוג רשמי"

### קבצים לעדכון:
- `src/components/catalog/ProductCatalogManager.jsx`
- `src/entities/Catalog.js` (אם יש)

### פעולות:
1. הוספת שדה `is_official` או `is_default` ל-Catalog entity
2. הוספת כפתור "הגדר כקטלוג רשמי" ליד כל קטלוג
3. כאשר מסמנים קטלוג כרשמי:
   - עדכון שם הקטלוג ל"קטלוג רשמי"
   - ביטול סימון רשמי מקטלוגים אחרים
   - שמירה ב-DB

---

## 2. עריכת לקוח - כל השדות

### תיאור:
- אין אפשרות לערוך את כל פרטי הלקוח כשעושים עין
- צריך לאפשר עריכה של כל השדות

### קבצים לעדכון:
- `src/components/admin/EditCustomerModal.jsx`
- `src/components/trial/CustomerOverviewModal.jsx` (אם יש שם עריכה)

### פעולות:
1. בדיקה שהכל השדות ב-EditCustomerModal ניתנים לעריכה
2. הוספת שדות חסרים אם יש
3. וידוא שהעריכה עובדת גם מ-CustomerOverviewModal

---

## 3. סינונים

### 3.1 סינון לפי מנהל כספים
**תיאור:** חסר סינון לפי מנהל כספים

**קבצים לעדכון:**
- `src/components/dashboard/DailyTasksDashboard.jsx`
- `src/pages/Dashboard.jsx`
- `src/components/dashboard/ClientList.jsx`

**פעולות:**
1. הוספת סינון "מנהל כספים" ב-DailyTasksDashboard
2. הוספת סינון ב-ClientList
3. הוספת סינון ב-Dashboard אם צריך

### 3.2 סינון משימות לפי לקוחות
**תיאור:** סינון משימות לפי לקוחות כמו שדיברנו בעבר

**קבצים לעדכון:**
- `src/components/dashboard/DailyTasksDashboard.jsx`
- `src/components/dashboard/kanban/TaskCard.jsx`

**פעולות:**
1. הוספת dropdown סינון לקוחות ב-DailyTasksDashboard
2. סינון המשימות לפי הלקוח שנבחר
3. הצגת שם הלקוח על כל כרטיס משימה

---

## 4. Dashboard - סקירה כללית

### 4.1 סגירת טאב לקוחות בדיפולט
**תיאור:** לשונית הלקוחות ב"סקירה כללית" צריכה להיות סגורה בדיפולט

**קבצים לעדכון:**
- `src/components/dashboard/DailyTasksDashboard.jsx`
- `src/pages/Dashboard.jsx`

**פעולות:**
1. שינוי `isClientsExpanded` ל-`false` בדיפולט
2. הוספת Accordion או Collapsible לטאב הלקוחות

### 4.2 משימות מעל הלקוחות
**תיאור:** המשימות צריכות להיות מעל הלקוחות

**קבצים לעדכון:**
- `src/pages/Dashboard.jsx`

**פעולות:**
1. שינוי סדר ה-grid: משימות קודם, לקוחות אחר כך
2. עדכון ה-layout

---

## 5. משימות

### 5.1 שדה "מועד תזכורת"
**תיאור:** שדה מועד תזכורת כמו שיש בפיירברי, הממשק בין המערכות כבר קיים

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- `src/components/admin/GoalsAndTasksDashboard.jsx`
- `functions/syncTaskToFireberry.ts`

**פעולות:**
1. הוספת שדה `reminder_date` ל-CustomerGoal entity
2. הוספת input תאריך תזכורת בטופס יצירת/עריכת משימה
3. שליחה ל-Fireberry עם תאריך תזכורת

### 5.2 פופ אפ אחיד למשימות
**תיאור:** פופ אפ המשימה בניהול הלקוחות נראה שונה מפופ אפ המשימה בטרלו

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- `src/components/admin/GoalsAndTasksDashboard.jsx` (אם יש שם modal)
- `src/components/dashboard/kanban/TaskCard.jsx`

**פעולות:**
1. יצירת קומפוננטה משותפת `TaskEditModal.jsx`
2. שימוש באותה קומפוננטה בכל המקומות
3. וידוא שהעיצוב זהה

### 5.3 משימה ללא יעד
**תיאור:** אפשרות להקים משימה שלא משוייכת ליעד

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- `src/components/admin/GoalsAndTasksDashboard.jsx`
- `src/pages/CustomerManagement.jsx` (כשמוסיפים משימה מהצד)

**פעולות:**
1. הוספת אופציה "ללא יעד" ב-dropdown של יעדים
2. כאשר בוחרים "ללא יעד", `parent_id` נשאר `null`
3. וידוא שהמשימה נשמרת ללא `parent_id`

### 5.4 מקים המשימה = אחראי אוטומטית
**תיאור:** הקמת משימה תשים את מקים המשימה אחראי המשימה בצורה אוטומטית

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- `src/components/admin/GoalsAndTasksDashboard.jsx`

**פעולות:**
1. כאשר יוצרים משימה, `assignee_email` = `currentUser.email` אוטומטית
2. אפשרות לשנות את האחראי אם צריך

### 5.5 אפשרות לשים אחראי אחר
**תיאור:** אפשרות לשים אחראי משימה שהוא מישהו אחר עם גישה לתיק לקוח

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- `src/components/admin/GoalsAndTasksDashboard.jsx`

**פעולות:**
1. הוספת dropdown לבחירת אחראי
2. טעינת כל המשתמשים עם גישה ללקוח (מנהל כספים ראשי + נוספים)
3. אפשרות לבחור אחראי מהרשימה

### 5.6 תקלה בתאריך של המשימה
**תיאור:** לא נותן לבחור את התאריך בצורה טובה

**קבצים לעדכון:**
- `src/components/dashboard/TaskCreationModal.jsx`
- כל מקום שיש date picker למשימות

**פעולות:**
1. בדיקה של ה-date picker
2. שימוש ב-Calendar component מ-Shadcn UI
3. וידוא שהבחירה עובדת טוב

---

## 6. צ'קליסט יומי - אופק 360

### 6.1 פירוט מלא למצב מצוי ורצוי
**תיאור:** הפירוט המלא שהיה קודם למצב מצוי ורצוי צריך לחזור, גם אם בסימן קריאה או אייקון אחר

**קבצים לעדכון:**
- `src/components/admin/DailyOfek360Checklist.jsx`

**פעולות:**
1. הוספת כפתור "פרטים" או אייקון "!" ליד כל קטגוריה
2. כאשר לוחצים, נפתח modal או expand עם הפירוט המלא
3. שמירת הפירוט המלא ב-DB

### 6.2 תיעוד כל הימים בחודש (1-31)
**תיאור:** תיעוד של כל הימים בחודש קלנדרי (1-31) אפילו לא עם ציון, אלא עם בוצע או לא בוצע

**קבצים לעדכון:**
- `src/components/admin/DailyOfek360Checklist.jsx`
- `src/components/admin/DailyOfek360Checklist.jsx` - MonthlySummary

**פעולות:**
1. יצירת grid של כל הימים בחודש (1-31)
2. לכל יום - מצב מצוי/רצוי/לא בוצע
3. הצגה ב-MonthlySummary

---

## 7. ציר זמן - Goals Timeline

### 7.1 אופקי מציג אנכי ואנכי מציג אופקי
**תיאור:** תקלה - אופקי מציג אנכי ואנכי מציג אופקי

**קבצים לעדכון:**
- `src/components/goals/timeline/GoalsTimelineNew.jsx`
- `src/components/admin/CustomerGoalsGantt.jsx`

**פעולות:**
1. תיקון הלוגיקה של "אופקי" ו"אנכי"
2. וידוא שהתצוגה נכונה

### 7.2 שיפור תצוגה וסידור לפי זמנים
**תיאור:** לשפר את התצוגה ולוודא סדר לפי זמנים (ממועד הביצוע הקרוב ביותר לרחוק ביותר)

**קבצים לעדכון:**
- `src/components/goals/timeline/GoalsTimelineNew.jsx`
- `src/components/admin/CustomerGoalsGantt.jsx`

**פעולות:**
1. מיון יעדים לפי `start_date` או `target_date`
2. שיפור ה-visualization
3. וידוא שהסדר נכון

---

## 8. עץ עסק - שדרוג לקאנבה

### תיאור:
כל הפיצ'ר של העץ עסק צריך לעבור שדרוג - זה צריך להיות כמו קאנבה, יותר נוח יותר זורם

### קבצים לעדכון:
- `src/components/organization/OrganizationChartBuilder.jsx`

### פעולות:
1. החלפת ReactFlow ב-Kanban board
2. עמודות: תפקידים, עובדים, שכר, אחריות
3. אפשרות לגרור תפקידים בין עמודות
4. עיצוב מודרני וזורם

---

## 9. ספקים - טאב אחד עם כל סוגי הספקים

### תיאור:
טאב אחד של ספקים ששם גם ככה אתה שומר את הפרטים על הספק ופשוט יהיה שם אופציה לכל סוגי הספקים - רואה חשבון, הנהלת חשבונות, ספק בשר וכו'

### קבצים לעדכון:
- `src/components/admin/CustomerSuppliersTab.jsx`
- `src/entities/Supplier.js` (אם יש)

### פעולות:
1. הוספת שדה `supplier_type` ל-Supplier entity
2. הוספת dropdown לבחירת סוג ספק בטופס
3. סינון לפי סוג ספק
4. רשימת סוגי ספקים: רואה חשבון, הנהלת חשבונות, ספק בשר, ספק כללי, וכו'

---

## 10. קבצים

### 10.1 גרירת מסמכים
**תיאור:** לאפשר גרירה של מסמכים לתוך ההעלת קבצים

**קבצים לעדכון:**
- `src/components/admin/CustomerFileUploadManager.jsx`
- `src/components/upload/EnhancedFileUpload.jsx`

**פעולות:**
1. הוספת `onDrop` handler
2. הוספת `onDragOver` handler
3. וידוא שהגרירה עובדת

### 10.2 פתיחת קבצים בתוך המערכת
**תיאור:** לעשות שהקובץ יפתח בתוך המערכת ולא חייב להוריד אותו

**קבצים לעדכון:**
- `src/components/admin/CustomerFileUploadManager.jsx`

**פעולות:**
1. הוספת modal לפתיחת קבצים
2. תמיכה ב-PDF, תמונות, Excel
3. אם לא ניתן לפתוח, הורדה

### 10.3 ייבוא דוח Z לקטלוג
**תיאור:** לעשות שאם עלה דוח Z בקבצים אפשר לייבא אותו לקטלוג

**קבצים לעדכון:**
- `src/components/admin/CustomerFileUploadManager.jsx`
- `src/components/catalog/ProductCatalogManager.jsx`
- `functions/parseZReport.ts`

**פעולות:**
1. זיהוי קבצי Z-report ב-FileUpload
2. הוספת כפתור "ייבא לקטלוג" ליד כל Z-report
3. קריאה ל-parseZReport ויצירת מוצרים בקטלוג

---

## 11. תחזית עסקית

### 11.1 תיקון רווח תפעולי
**תיאור:** רווח תפעולי של מסמכים לא יכול להיות 755 אחוז - רווח תפעולי הוא חייב להיות מתחת ל-100 - החישוב הוא הפוך

**קבצים לעדכון:**
- `functions/analyzeFinancialReport.ts`
- כל מקום שמחשב רווח תפעולי

**פעולות:**
1. בדיקה של הנוסחה
2. תיקון: רווח תפעולי = (רווח תפעולי / הכנסות) * 100
3. וידוא שהתוצאה תמיד מתחת ל-100%

### 11.2 הסרת העלאת הכנסה עתידי
**תיאור:** העלת קובץ הכנסה עתידי בתחזית העיסקית - להוריד את זה

**קבצים לעדכון:**
- `src/components/forecast/manual/Step3SalesForecast.jsx`
- `src/components/forecast/manual/FutureRevenueUploader.jsx`

**פעולות:**
1. הסרת FutureRevenueUploader מה-UI
2. הסרת הקוד הרלוונטי

### 11.3 תיקון 0 בהתחלה
**תיאור:** יש בעיה כאשר מזינים נתונים - יש שם 0 שהוא מוצג בצורה קבועה ואז כשרושמים מספר זה מוצג בצורה לא טוב. תעשה שבכל מקום שצריך להזין מספרים אז לא צריך להיות 0 אלה שיתחיל ב-NULL

**קבצים לעדכון:**
- `src/components/forecast/manual/Step3SalesForecast.jsx`
- כל מקום שיש Input type="number"

**פעולות:**
1. שינוי `value={0}` ל-`value={''}`
2. שינוי `placeholder="0"` ל-`placeholder=""`
3. טיפול ב-empty string כ-null

### 11.4 שירותים בתחזית - שיוך לקטלוג
**תיאור:** צריך שתיהיה אופציה לרשום סוגי שירותים בתחזית עיסקת ושזה ישייך את זה לקטלוג

**קבצים לעדכון:**
- `src/components/forecast/manual/Step3SalesForecast.jsx`
- `src/components/forecast/BusinessForecastManager.jsx`

**פעולות:**
1. הוספת שדה `catalog_product_id` ל-service
2. הוספת dropdown לבחירת מוצר מהקטלוג
3. שיוך אוטומטי אם יש התאמה בשם

---

## 12. דוחות Z - איחוד דוחות מרובים

### תיאור:
מה קורה אם אני מעלה 2 דוחות Z אחד של וולט ואחד מהקופה האם זה יודע לאחד לי את זה?

### קבצים לעדכון:
- `functions/parseZReport.ts`
- `src/components/forecast/manual/ZReportUploader.jsx`

### פעולות:
1. זיהוי דוחות Z קיימים לאותו חודש
2. איחוד המוצרים (חיבור כמויות ורווחים)
3. עדכון התחזית עם הנתונים המאוחדים

---

## 13. המלצות - AI Chat

### תיאור:
הממשק המלצות אני רוצה שהוא לא בהכרח רק ייתן לי המלצות אלא שפשוט באמת הצ'אט יהיה שם ופשוט זה יהיה כזה זה יהיה רשום תחת ההמלצות אבל זה כאילו יהיה עוזר AI שלי בעצם שהוא מותאם לכל לקוח

### קבצים לעדכון:
- `src/pages/CustomerManagement.jsx`
- `src/components/admin/StrategicRecommendations.jsx`
- יצירת קומפוננטה חדשה: `src/components/admin/AIChatAssistant.jsx`

### פעולות:
1. יצירת קומפוננטת AI Chat
2. שילוב ב-tab ההמלצות
3. כאשר מבקשים המלצה, שמירה ב"בנק המלצות"
4. אפשרות לאשר המלצה ולהפוך אותה ליעד
5. עריכה של המשימות שנוצרו מההמלצה

---

## 14. תובנות - שיפור תצוגה

### 14.1 שיפור תצוגה בניתוח תובנות
**תיאור:** תצוגה בניתוח תובנות - פופולאריות - ריווחיות הכל לא נראה פה טוב - לא מראה את הדברים בצורה ברורה

**קבצים לעדכון:**
- `src/components/analytics/CatalogAnalyticsDashboard.jsx`
- `src/components/analytics/PopularityAnalysis.jsx`
- `src/components/analytics/ProfitabilityAnalysis.jsx`

**פעולות:**
1. שיפור הגרפים
2. הוספת טבלאות ברורות
3. וידוא שהנתונים מדויקים

### 14.2 פילטרים של אחוז רווח
**תיאור:** צריך להוסיף פילטרים של אחוז רווח של המוצרים בתובנות העיסקיות

**קבצים לעדכון:**
- `src/components/analytics/CatalogAnalyticsDashboard.jsx`

**פעולות:**
1. הוספת slider או input לטווח אחוז רווח
2. סינון המוצרים לפי הטווח
3. הצגה בגרפים

---

## 15. תקלות נוספות

### 15.1 דוח ריכוז נתוני אשראי
**תיאור:** בעיה בדוח ריכוז נתוני אשראי של שלומי זול - ברגע שלוחצים על להסתכל עליו הוא עושה מסך לבן

**קבצים לעדכון:**
- `functions/processCreditReport.ts`
- כל מקום שמציג דוחות אשראי

**פעולות:**
1. בדיקת שגיאות בקונסול
2. תיקון ה-rendering
3. הוספת error boundaries

### 15.2 עריכת ספקים
**תיאור:** אין אפשרות לערוך ספקים שהכנסתי

**קבצים לעדכון:**
- `src/components/admin/CustomerSuppliersTab.jsx`
- `src/components/admin/SupplierDetailsModal.jsx`

**פעולות:**
1. הוספת כפתור "ערוך" ליד כל ספק
2. יצירת modal עריכה
3. שמירת השינויים

### 15.3 הסרת כפתור לידים
**תיאור:** תוריד את הכפתור לגשת לדף הלידים מהתצוגה

**קבצים לעדכון:**
- `src/pages/Dashboard.jsx`
- `src/components/dashboard/ClientList.jsx`
- כל מקום שיש כפתור ללידים

**פעולות:**
1. הסרת כפתורים/לינקים ללידים
2. הסרת טאב לידים אם יש

---

## 16. תזרים - צילום מסך לפני עדכון

### תיאור:
כל הקטע של התזרים אני לפני שאתה אפילו כאילו מעדכן את העדכון אתה יכול לשלוח לי צילום מסך של איך זה נראה אצלך ב-UI

### הערה:
זה דורש צילום מסך - לא ניתן לעשות דרך הכלים שלי. צריך להמתין לאישור המשתמש.

---

## סדר עדיפויות יישום

### עדיפות גבוהה (Critical):
1. תיקון רווח תפעולי (11.1)
2. תיקון 0 בהתחלה (11.3)
3. תקלה בתאריך משימה (5.6)
4. דוח אשראי מסך לבן (15.1)

### עדיפות בינונית (Important):
5. קטלוג רשמי (1)
6. עריכת לקוח מלאה (2)
7. סינון מנהל כספים (3.1)
8. סינון משימות לפי לקוחות (3.2)
9. מועד תזכורת (5.1)
10. משימה ללא יעד (5.3)
11. פופ אפ אחיד (5.2)
12. צ'קליסט - פירוט מלא (6.1)
13. צ'קליסט - תיעוד ימים (6.2)

### עדיפות נמוכה (Nice to have):
14. Dashboard - סגירת טאב (4.1)
15. Dashboard - משימות מעל (4.2)
16. עץ עסק קאנבה (8)
17. ספקים - כל הסוגים (9)
18. גרירת קבצים (10.1)
19. פתיחת קבצים (10.2)
20. ייבוא Z לקטלוג (10.3)
21. הסרת הכנסה עתידי (11.2)
22. שירותים בתחזית (11.4)
23. איחוד דוחות Z (12)
24. AI Chat (13)
25. תובנות - שיפור (14)
26. עריכת ספקים (15.2)
27. הסרת לידים (15.3)

---

## הערות חשובות:
- כל התיקונים צריכים לכלול toast notifications
- כל התיקונים צריכים להיות responsive
- כל התיקונים צריכים לתמוך בעברית (RTL)
- יש לבדוק compatibility עם Fireberry integration
