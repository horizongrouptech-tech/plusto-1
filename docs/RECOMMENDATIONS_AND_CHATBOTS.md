# המלצות המערכת והצ'אטבוט הפנימי

מסמך זה מתאר את אופן פעולת מנועי ההמלצות במערכת Plusto ואת שני הצ'אטבוטים הפנימיים. רלוונטי לסוכן טיםול (המלצות) ולפיתוח בנושא.

---

## 1. ארכיטקטורת ההמלצות

במערכת קיימים מספר מנועי המלצות. הזרימה העיקרית לאדמין/מנהל כספים עוברת דרך **מנוע ההמלצות המשודרג** (Enhanced), שמתזמר איסוף נתונים, בניית פרומפט, קריאה ל-LLM ועיבוד תגובה.

- **נקודות הפעלה**: אדמין (יצירת המלצות מערכת), דף המלצות (משתמש), וואטסאפ (המלצה ממוקדת).
- **מנועים**: Enhanced, Inventory-Based, Targeted, recommendationEngine (כולל Fallback).
- **תזמור**: unifiedRecommendationOrchestrator קורא ל-InvokeLLM עם סכימת JSON, then processRecommendations → Recommendation.create.

---

## 2. איך המלצות המערכת עובדות

### 2.1 Triggers ומנועים

| מקור | קובץ | מנוע |
|------|------|------|
| אדמין – "יצירת המלצות מערכת" | `src/pages/Admin.jsx` | `generateEnhancedRecommendations` (enhancedRecommendationEngine.jsx) |
| מודל "המלצות מערכת" | `src/components/admin/SystemRecommendationsModal.jsx` | אותו מנוע |
| דף המלצות (משתמש) | `src/pages/Recommendations.jsx` | `generateInventoryBasedRecommendations` (inventoryBasedRecommendationEngine.jsx) |
| וואטסאפ | `functions/receiveWhatsAppDataWebhook.ts` | לוגיקה מקבילה ל-targetedRecommendationEngine.jsx |

### 2.2 זרימת המנוע המשודרג (Enhanced)

1. **איסוף נתונים** – `collectBusinessData(customer)`: ProductCatalog, Product, BusinessForecast, FileUpload, Supplier; איחוד מוצרים, `analyzeUploadedFiles`.
2. **הערכת איכות** – `hasSufficientInternalData = businessData.hasProductCatalog || businessData.fileAnalysis.hasSignificantData`.
3. **ניתוח מלאי** – `analyzeInventoryProblems(businessData)` (אם יש נתונים).
4. **סכימת JSON** – נתונים מספיקים → DETAILED_RECOMMENDATION_SCHEMA; אחרת → SIMPLIFIED_RECOMMENDATION_SCHEMA.
5. **פרומפט** – `buildEnhancedPrompt` עם דוגמאות לסוג עסק, רשימת מוצרים (דגימה), תובנות מקבצים, תחזית, ספקי שותפים.
6. **תזמור** – `InvokeLLM({ prompt, add_context_from_internet: !hasSufficientInternalData, response_json_schema })`.
7. **עיבוד** – `processRecommendations`: התאמת product_context, ייחודיות מוצר/קטגוריה, ולידציות, המרה לפורמט תצוגה.
8. **שמירה** – `Recommendation.create` עם `related_data.generation_method` ו-`schema_used`.

### 2.3 מנוע מבוסס מלאי (Inventory-Based)

- איסוף: `gatherCustomerDataWithCatalog` (Product, Supplier, Promotion, Sale, ProductCatalog).
- חישוב: `calculateAccurateProfitData` → validProducts / incompleteDataProducts.
- סוגי המלצות: מבצעים (15% הנחה), באנדלים, התראות מלאי (עודף/חוסר/מתים), השלמת נתונים.
- שמירה: `saveRecommendationsToDatabase` → Recommendation.create.

### 2.4 מנוע ממוקד (Targeted)

- חיפוש בקטלוג → אם נמצא: `generateRecommendationFromCatalog`; אחרת: `conductExternalResearch` + `generateRecommendationFromResearch`.
- משמש גם ב-Webhook וואטסאפ.

### 2.5 ישות Recommendation

- `base44/entities/recommendation.jsonc`: customer_email, title, description, category, source, expected_profit, status, delivery_status, priority, action_steps, related_data.
- קטגוריות: pricing, bundles, promotions, suppliers, strategic_moves, inventory (ובסכימות גם operations, strategic_moves).

### 2.6 המלצות ממנהלים אחרים (RecommendationSuggestionSystem)

- מנגנון נפרד: משווה המלצות שפורסמו ללקוחות של מנהל אחר לפי דמיון עסקי (ציון >70); המנהל יכול לאמץ ו־Recommendation.create ללקוח שלו.

---

## 3. הצ'אטבוט הפנימי

### 3.1 סוכן החירום (EmergencyChat)

- **מיקום**: `src/components/shared/EmergencyChat.jsx`; נפתח מ-Layout (כפתור סיוע).
- **קהל**: לקוח/משתמש.
- **לוגיקה**: "Plusto AI" – (1) אבחון ושאילת שאלות, (2) הכוונה למערכת (העלאת קבצים וכו'), (3) הסלמה – משפט קבוע לפגישת ייעוץ עם אלירן אוחיון.
- **טכניקה**: `InvokeLLM({ prompt })` ללא response_json_schema; תשובה חופשית.
- **פגישת עבודה**: "פגישת עבודה" או כפתור אחרי הסלמה → SendEmail ל-byo@post.bgu.ac.il.

### 3.2 עוזר AI למנהל (AIChatAssistant)

- **מיקום**: `src/components/admin/AIChatAssistant.jsx`; מוצג ב-CustomerManagement בהקשר לקוח.
- **קהל**: מנהל כספים/אדמין.
- **לוגיקה**: עוזר מותאם ללקוח; אם השאלה קשורה להמלצות – ליצור המלצה (כותרת, תיאור, צעדי ביצוע, רווח צפוי).
- **טכניקה**: InvokeLLM עם response_json_schema (message, is_recommendation, recommendation); כפתור "אשר המלצה" → Recommendation.create עם source: 'ai_chat'.

### 3.3 FloatingAgentChat (סוכני Base44)

- סוכן לפי `agentName`: למשל `plusto_user_guide_agent`, `timool_recommendations_agent`.
- בעמוד Admin: יועץ עסקי AI (ימין) + סוכן המלצות טיםול (שמאל, `timool_recommendations_agent`).

---

## 4. רלוונטיות לסוכן טיםול

- **המלצות**: שימוש ב-`generateEnhancedRecommendations` (ובהתאם ב-inventoryBased או targeted); הבנת `hasSufficientInternalData` vs "מבוסס שוק"; כיבוד collectBusinessData, buildEnhancedPrompt, processRecommendations.
- **צ'אטבוט**: EmergencyChat לסיוע והסלמה; AIChatAssistant ליצירת/אישור המלצות למנהל. סוכן טיםול יכול להפנות למנהלים ל-AIChatAssistant כשמדובר ב"המלצות ללקוח X".
- **AgentSupportTicket**: ישות לפניות מנהל (באג/פיצ'ר); שימושי אם סוכן טיםול יוצר או מעדכן פניות תמיכה בנושא המלצות.

---

## 5. קבצים מרכזיים

- **המלצות**:  
  `src/components/logic/enhancedRecommendationEngine.jsx`, `unifiedRecommendationOrchestrator.jsx`, `inventoryBasedRecommendationEngine.jsx`, `recommendationEngine.jsx`, `targetedRecommendationEngine.jsx`, `src/pages/Admin.jsx`, `base44/entities/recommendation.jsonc`.

- **צ'אטבוט**:  
  `src/components/shared/EmergencyChat.jsx`, `src/components/admin/AIChatAssistant.jsx`, `src/components/admin/FloatingAgentChat.jsx`, `src/Layout.jsx`, `src/pages/CustomerManagement.jsx`.

- **תצוגה/מודלים**:  
  `src/components/admin/SystemRecommendationsModal.jsx`, `src/components/admin/RecommendationSuggestionSystem.jsx`.

- **כלל Cursor לסוכן טיםול**:  
  `.cursor/rules/timool-recommendations-agent.mdc`.
