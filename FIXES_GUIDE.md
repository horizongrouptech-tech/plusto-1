# מדריך תיקונים מפורט - כל הבעיות והפתרונות

## 📋 תוכן עניינים
1. [המלצות ממוקדות - בחירת מוצר מרשימה](#1-המלצות-ממוקדות)
2. [שליחת הודעה לווצאפ בהמלצות](#2-שליחת-ווצאפ)
3. [תצוגת המלצות - גובה כפתור אחיד](#3-תצוגת-המלצות)
4. [טאב ספקים - אופטימיזציה](#4-טאב-ספקים)
5. [טאב פגישות - זימון Google Calendar](#5-טאב-פגישות)
6. [נושא פגישה קבוע](#6-נושא-פגישה)
7. [סיכום פגישה - פורמט](#7-סיכום-פגישה)
8. [Snackbar לכל פעולה](#8-snackbar)
9. [תזרים - שיפורים נרחבים](#9-תזרים)
10. [המלצות מערכת - תהליך](#10-המלצות-מערכת)
11. [אחוזים בקטלוג](#11-אחוזים-קטלוג)
12. [דוחות Z - איחוד](#12-דוחות-z)
13. [שירותים בתחזית](#13-שירותים-תחזית)
14. [טעינת קטלוג - Pagination](#14-טעינת-קטלוג)
15. [UI/UX יעדים](#15-uiux-יעדים)
16. [סינון לקוחות](#16-סינון-לקוחות)
17. [מחיקת יעדים](#17-מחיקת-יעדים)
18. [תחזית מכירות](#18-תחזית-מכירות)
19. [התראה מוצרים ללא מחיר](#19-התראה-מחיר)
20. [סינון ממתינים](#20-סינון-ממתינים)

---

## 1. המלצות ממוקדות - בחירת מוצר מרשימה

### בעיה:
כרגע המשתמש צריך להכניס שם מוצר ידנית. צריך לבחור מרשימת המוצרים הקיימים בקטלוג.

### פתרון:

**קובץ:** `src/components/admin/TargetedRecommendationModal.jsx`

```jsx
// הוסף import
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ProductCatalog } from '@/entities/ProductCatalog';

// בתוך הקומפוננטה, הוסף:
const [selectedProductId, setSelectedProductId] = useState('');
const [customProductName, setCustomProductName] = useState('');

// טעינת מוצרים מהקטלוג
const { data: catalogProducts = [], isLoading: isLoadingProducts } = useQuery({
  queryKey: ['catalogProducts', customer?.email],
  queryFn: async () => {
    // טען את הקטלוג הפעיל
    const catalogs = await base44.entities.Catalog.filter({
      created_by: customer.email,
      is_active: true
    }, '-created_date');
    
    if (catalogs.length === 0) return [];
    
    const activeCatalog = catalogs[0];
    
    // טען מוצרים מהקטלוג (עד 500 ראשונים)
    const products = await ProductCatalog.filter({
      customer_email: customer.email,
      catalog_id: activeCatalog.id,
      is_active: true
    }, '-created_date', 500);
    
    return products;
  },
  enabled: !!customer?.email
});

// שנה את הטופס:
<div>
  <label className="block text-sm font-medium text-horizon-text mb-2">
    בחר מוצר מהקטלוג *
  </label>
  <Select 
    value={selectedProductId} 
    onValueChange={(value) => {
      setSelectedProductId(value);
      if (value === 'custom') {
        setCustomProductName('');
      } else {
        const product = catalogProducts.find(p => p.id === value);
        if (product) {
          setFormData(prev => ({
            ...prev,
            productName: product.product_name,
            productDescription: `${product.category || ''} - מחיר: ₪${product.selling_price || 0}`
          }));
        }
      }
    }}
  >
    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
      <SelectValue placeholder={isLoadingProducts ? "טוען מוצרים..." : "בחר מוצר מהקטלוג"} />
    </SelectTrigger>
    <SelectContent className="bg-horizon-card border-horizon">
      <SelectItem value="custom">+ הזן מוצר חדש ידנית</SelectItem>
      {catalogProducts.map(product => (
        <SelectItem key={product.id} value={product.id}>
          {product.product_name} {product.category ? `(${product.category})` : ''}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  {selectedProductId === 'custom' && (
    <div className="mt-2">
      <Input
        value={customProductName}
        onChange={(e) => {
          setCustomProductName(e.target.value);
          setFormData(prev => ({ ...prev, productName: e.target.value }));
        }}
        placeholder="הזן שם מוצר חדש..."
        className="bg-horizon-card border-horizon text-horizon-text"
      />
    </div>
  )}
</div>
```

---

## 2. שליחת הודעה לווצאפ בהמלצות

### בעיה:
הכפתור לשליחת ווצאפ לא מופיע או לא עובד.

### פתרון:

**קובץ:** `src/components/admin/RecommendationDisplayCard.jsx`

```jsx
// וודא שיש כפתור שליחת ווצאפ:
{recommendation.delivery_status !== 'sent' && customer?.phone && (
  <Button
    size="sm"
    variant="outline"
    onClick={(e) => {
      e.stopPropagation();
      onSendToCustomer?.(recommendation);
    }}
    className="border-green-500 text-green-400 hover:bg-green-500/10"
  >
    <MessageSquare className="w-4 h-4 ml-2" />
    שלח לווצאפ
  </Button>
)}
```

**קובץ:** `src/pages/CustomerManagement.jsx`

```jsx
// וודא שהפונקציה קיימת ומועברת:
const handleSendRecommendationWhatsApp = async (recommendation) => {
  if (!customer.phone) {
    toast({
      title: "שגיאה",
      description: "אין מספר טלפון זמין עבור לקוח זה",
      variant: "destructive"
    });
    return;
  }

  try {
    const { data, error } = await base44.functions.invoke('sendWhatsAppMessage', {
      phoneNumber: customer.phone,
      customerEmail: customer.email,
      recommendation: recommendation,
      templateType: 'auto'
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'שגיאה בשליחת הווצאפ');
    }

    toast({
      title: "הצלחה!",
      description: "ההמלצה נשלחה בהצלחה לווטסאפ",
      variant: "default"
    });

    // עדכון סטטוס
    queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    toast({
      title: "שגיאה",
      description: `שגיאה בשליחת ההמלצה: ${error.message}`,
      variant: "destructive"
    });
  }
};

// וודא שזה מועבר ל-StrategicRecommendations:
<StrategicRecommendations
  ...
  onSendToCustomer={handleSendRecommendationWhatsApp}
/>
```

---

## 3. תצוגת המלצות - גובה כפתור אחיד

### בעיה:
כפתור "לחץ לצפייה מלאה" לא באותו גובה אצל כולם.

### פתרון:

**קובץ:** `src/components/admin/RecommendationDisplayCard.jsx`

```jsx
// שנה את המבנה כך שהכפתור תמיד יהיה בתחתית:
<Card className="bg-horizon-card border-horizon hover:border-horizon-primary/50 transition-all flex flex-col h-full">
  <CardHeader className="flex-shrink-0">
    {/* תוכן כותרת */}
  </CardHeader>
  
  <CardContent className="flex-1 flex flex-col">
    {/* תוכן גמיש */}
    <div className="flex-1">
      {/* כל התוכן כאן */}
    </div>
    
    {/* כפתור תמיד בתחתית */}
    <div className="mt-auto pt-4 border-t border-horizon">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onView?.(recommendation);
        }}
        className="w-full border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
      >
        <Eye className="w-4 h-4 ml-2" />
        לחץ לצפייה מלאה
      </Button>
    </div>
  </CardContent>
</Card>
```

**קובץ:** `src/components/admin/StrategicRecommendations.jsx`

```jsx
// וודא שכל הכרטיסים באותו גובה:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {recommendations.map((recommendation) => (
    <RecommendationDisplayCard
      key={recommendation.id}
      recommendation={recommendation}
      onView={onView}
      onEdit={onEdit}
      onUpgrade={onUpgrade}
      onDelete={onDelete}
      onArchive={onArchive}
      onSendToCustomer={onSendToCustomer}
      isAdmin={isAdmin}
      className="h-full" // הוסף className
    />
  ))}
</div>
```

---

## 4. טאב ספקים - אופטימיזציה

### בעיה:
טעינת ספקים איטית מאוד.

### פתרון:

**קובץ:** `src/components/admin/CustomerSuppliersTab.jsx`

```jsx
// הוסף caching ו-optimistic updates:
const loadSuppliers = useCallback(async () => {
  if (!customer) {
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);

    // טעינה מקבילית עם timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    const [customerSuppliersResult, suggestedResult] = await Promise.allSettled([
      Promise.race([
        base44.entities.Supplier.filter({
          customer_emails: [customer.email],
          is_active: true
        }),
        timeoutPromise
      ]),
      Promise.race([
        base44.functions.invoke('getSuggestedSuppliers', {
          customer_email: customer.email,
          customer_data: customer
        }),
        timeoutPromise
      ])
    ]);

    // עיבוד תוצאות...
    // (הקוד הקיים)

    // Cache התוצאות ב-localStorage למשך 5 דקות
    if (customerSuppliersResult.status === 'fulfilled') {
      localStorage.setItem(
        `suppliers_${customer.email}`,
        JSON.stringify({
          data: customerSuppliersResult.value,
          timestamp: Date.now()
        })
      );
    }

  } catch (error) {
    // נסה לטעון מ-cache אם יש
    const cached = localStorage.getItem(`suppliers_${customer.email}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 דקות
        setSuppliers(data);
      }
    }
    console.error("Error loading suppliers:", error);
  } finally {
    setIsLoading(false);
  }
}, [customer]);
```

---

## 5. טאב פגישות - זימון Google Calendar

### בעיה:
יצירת פגישה לא שולחת זימון.

### פתרון:

**קובץ:** `functions/scheduleMeeting.ts`

הפונקציה כבר קיימת, אבל צריך לוודא שה-Google Calendar integration מוגדר.

**בדיקה נדרשת:**
1. האם יש Google Calendar integration פעיל ב-Base44?
2. האם יש email של מנהל הכספים ב-`currentUser.email`?
3. האם יש email של הלקוח ב-`customer.email`?

**תיקון בקובץ:** `src/components/meetings/MeetingsTab.jsx`

```jsx
// שים לב - הפונקציה כבר קוראת ל-scheduleMeeting
// אבל צריך לוודא שהיא נקראת נכון:

// בתוך handleCreateMeeting, אחרי יצירת הפגישה:
if (newMeetingForm.invite_customer || newMeetingForm.send_reminder) {
  try {
    const { data: calendarResult, error: calendarError } = await base44.functions.invoke('scheduleMeeting', {
      meeting_id: newMeeting.id,
      customer_email: customer.email,
      financial_manager_email: currentUser?.email,
      subject: newMeetingForm.subject.trim(),
      start_datetime: `${newMeetingForm.start_date}T${newMeetingForm.start_time}:00`,
      end_datetime: `${newMeetingForm.end_date}T${newMeetingForm.end_time}:00`,
      location: newMeetingForm.channel === 'office' ? newMeetingForm.location : newMeetingForm.channel,
      description: newMeetingForm.description,
      invite_customer: newMeetingForm.invite_customer,
      send_reminder: newMeetingForm.send_reminder,
      customer_name: customer.business_name || customer.full_name
    });

    if (calendarError) {
      console.error('Calendar error:', calendarError);
      // לא נכשיל את יצירת הפגישה, רק נדווח
      toast({
        title: "אזהרה",
        description: "הפגישה נוצרה, אבל הזימון ב-Google Calendar נכשל. בדוק את הגדרות האינטגרציה.",
        variant: "destructive"
      });
    } else if (calendarResult?.event_id) {
      // עדכון ה-google_event_id
      additionalData.google_event_id = calendarResult.event_id;
      await base44.entities.CustomerGoal.update(newMeeting.id, {
        additional_notes: JSON.stringify(additionalData)
      });
      
      toast({
        title: "הצלחה!",
        description: "הפגישה נוצרה והזימון נשלח בהצלחה",
        variant: "default"
      });
    }
  } catch (calendarError) {
    console.error('Error scheduling Google Calendar event:', calendarError);
    // לא נכשיל את יצירת הפגישה
  }
}
```

**מה צריך בדיוק:**
1. **Google Calendar API** - צריך להגדיר ב-Base44 Admin:
   - לך ל-Integrations > Google
   - הפעל Google Calendar
   - אשר הרשאות (Calendar read/write, Gmail send)

2. **Email של מנהל הכספים** - צריך להיות ב-`currentUser.email`

3. **Email של הלקוח** - צריך להיות ב-`customer.email`

---

## 6. נושא פגישה קבוע

### בעיה:
נושא הפגישה צריך להיות: "פגישת ניהול כספים מספר X, [שם הלקוח]"

### פתרון:

**קובץ:** `src/components/meetings/MeetingsTab.jsx`

```jsx
// הוסף פונקציה לחישוב מספר הפגישה:
const getNextMeetingNumber = useMemo(() => {
  if (!meetings || meetings.length === 0) return 1;
  
  // מצא את המספר הגבוה ביותר
  const numbers = meetings
    .map(m => {
      const match = m.subject?.match(/פגישת ניהול כספים מספר (\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  return numbers.length > 0 ? Math.max(...numbers) + 1 : meetings.length + 1;
}, [meetings]);

// בתוך handleCreateMeeting, שנה את הנושא:
const meetingNumber = getNextMeetingNumber;
const defaultSubject = `פגישת ניהול כספים מספר ${meetingNumber}, ${customer.business_name || customer.full_name}`;

// אם המשתמש לא הזין נושא, השתמש בברירת מחדל
const finalSubject = newMeetingForm.subject.trim() || defaultSubject;

// יצירת הפגישה:
const newMeeting = await base44.entities.CustomerGoal.create({
  customer_email: customer.email,
  name: finalSubject, // השתמש בנושא הסופי
  // ... שאר השדות
});

// גם בטופס, הוסף placeholder:
<Input
  value={newMeetingForm.subject}
  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, subject: e.target.value })}
  placeholder={`פגישת ניהול כספים מספר ${getNextMeetingNumber}, ${customer.business_name || customer.full_name}`}
  className="bg-horizon-card border-horizon text-horizon-text"
/>
```

---

## 7. סיכום פגישה - פורמט

### בעיה:
סיכום פגישה צריך להיות בפורמט מסוים.

### פתרון:

**קובץ:** `src/components/meetings/MeetingsTab.jsx`

```jsx
// הוסף פונקציה ליצירת סיכום בפורמט הנדרש:
const generateMeetingSummary = (meeting) => {
  const meetingDate = format(new Date(meeting.start_date), 'dd/MM/yyyy', { locale: he });
  
  return `סיכום פגישה מתאריך: ${meetingDate}

נוכחים בפגישה:
${meeting.participants || 'לא צוין'}

עיקרי הדברים שעלו:
${meeting.main_points?.map((point, idx) => `${idx + 1}. ${point || ''}`).join('\n') || '1.\n2.\n3.\n4.\n5.'}

משימות:
${meeting.tasks || 'לא צוין'}

תאריך פגישה הבאה: ${meeting.next_meeting_date ? format(new Date(meeting.next_meeting_date), 'dd/MM/yyyy', { locale: he }) : 'טרם נקבעה'}`;
};

// בתוך מודל פרטי הפגישה, הוסף כפתור "העתק סיכום":
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    const summary = generateMeetingSummary(selectedMeeting);
    navigator.clipboard.writeText(summary);
    toast({
      title: "הועתק!",
      description: "הסיכום הועתק ללוח",
      variant: "default"
    });
  }}
  className="border-horizon text-horizon-text"
>
  <Copy className="w-4 h-4 ml-2" />
  העתק סיכום
</Button>
```

---

## 8. Snackbar לכל פעולה

### בעיה:
לא כל פעולה מראה snackbar, וחלק מהן דורשות לחיצה.

### פתרון:

**קובץ:** `src/components/ui/toast.jsx` - כבר קיים

**קובץ:** `src/App.jsx` - וודא שה-Toaster מופיע:

```jsx
import { Toaster } from "@/components/ui/toaster";

// בתוך return:
<Toaster />
```

**יצירת Hook גלובלי:**

**קובץ:** `src/hooks/useGlobalToast.jsx` (חדש)

```jsx
import { useToast } from "@/components/ui/use-toast";

export function useGlobalToast() {
  const { toast } = useToast();

  const showSuccess = (message) => {
    toast({
      title: "הצלחה!",
      description: message,
      variant: "default",
      duration: 3000
    });
  };

  const showError = (message) => {
    toast({
      title: "שגיאה",
      description: message,
      variant: "destructive",
      duration: 5000
    });
  };

  const showInfo = (message) => {
    toast({
      title: "מידע",
      description: message,
      variant: "default",
      duration: 3000
    });
  };

  return { showSuccess, showError, showInfo, toast };
}
```

**שימוש בכל מקום:**

```jsx
// בכל קומפוננטה:
import { useGlobalToast } from '@/hooks/useGlobalToast';

const { showSuccess, showError } = useGlobalToast();

// במקום alert:
// alert('הצלחה!');
showSuccess('הפעולה בוצעה בהצלחה!');

// במקום alert('שגיאה'):
// alert('שגיאה');
showError('אירעה שגיאה');
```

**תיקון TOAST_REMOVE_DELAY:**

**קובץ:** `src/components/ui/use-toast.jsx`

```jsx
// שנה מ:
const TOAST_REMOVE_DELAY = 1000000;

// ל:
const TOAST_REMOVE_DELAY = 5000; // 5 שניות
```

---

## 9. תזרים - שיפורים נרחבים

### 9.1 שמירת קבצים

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// בתוך handleFileUpload, אחרי העלאת הקובץ:
// שמירת הקובץ ל-FileUpload entity
try {
  await base44.entities.FileUpload.create({
    customer_email: customer.email,
    filename: file.name,
    file_url: file_url,
    file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
    status: 'processed',
    data_category: 'cashflow',
    analysis_notes: `נוספו ${response.data.processed || 0} תנועות`,
    customer_email: customer.email
  });
} catch (saveError) {
  console.error('Error saving file record:', saveError);
  // לא נכשיל את התהליך
}
```

### 9.2 שיוך רק לעתיד ולהווה

**קובץ:** `functions/parseBizIboxFile.ts`

```ts
// בתוך הפונקציה, אחרי יצירת cashFlowEntries:
const today = new Date();
today.setHours(0, 0, 0, 0);

// סינון רק תאריכים מהיום והלאה
const futureEntries = cashFlowEntries.filter(entry => {
  const entryDate = new Date(entry.date);
  entryDate.setHours(0, 0, 0, 0);
  return entryDate >= today;
});

// שמור רק את futureEntries
if (futureEntries.length > 0) {
  await base44.asServiceRole.entities.CashFlow.bulkCreate(futureEntries);
}
```

### 9.3 עריכת הוצאות עתידיות

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// הוסף פילטר לתאריכים עתידיים בלבד:
const [showFutureOnly, setShowFutureOnly] = useState(false);

const filteredCashFlowData = useMemo(() => {
  let filtered = [...cashFlowData];
  
  if (showFutureOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= today;
    });
  }
  
  return filtered;
}, [cashFlowData, showFutureOnly]);

// הוסף כפתור פילטר:
<Button
  variant={showFutureOnly ? "default" : "outline"}
  onClick={() => setShowFutureOnly(!showFutureOnly)}
>
  {showFutureOnly ? "הצג הכל" : "הצג רק עתיד"}
</Button>
```

### 9.4 עריכת קטגוריה - Dropdown במקום עריכה

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// טעינת כל הקטגוריות הקיימות
const { data: allCategories = [] } = useQuery({
  queryKey: ['cashFlowCategories', customer?.email],
  queryFn: async () => {
    const entries = await base44.entities.CashFlow.filter({
      customer_email: customer.email
    });
    const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
    return categories.sort();
  },
  enabled: !!customer?.email
});

// בטבלה, שנה את תא הקטגוריה:
<TableCell>
  {editingItem?.id === item.id && editingItem?.editingCategory ? (
    <Select
      value={editingItem.category}
      onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
      onOpenChange={(open) => {
        if (!open) {
          // שמור אוטומטית כשסוגרים
          handleSaveEdit();
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allCategories.map(cat => (
          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
        ))}
        <SelectItem value="__new__">+ קטגוריה חדשה</SelectItem>
      </SelectContent>
    </Select>
  ) : (
    <div 
      className="cursor-pointer hover:bg-horizon-card/50 p-1 rounded"
      onClick={() => {
        setEditingItem({ ...item, editingCategory: true });
      }}
    >
      {item.category || 'ללא קטגוריה'}
    </div>
  )}
</TableCell>
```

### 9.5 יצירת קטגוריות אוטומטית

**קובץ:** `functions/parseBizIboxFile.ts`

```ts
// כבר קיים - הקטגוריות נוצרות אוטומטית
// אבל וודא שהן נשמרות גם ב-RecurringExpense
```

### 9.6 טאב תנועות קבועות

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// הוסף טאב חדש:
<Tabs value={activeView} onValueChange={setActiveView}>
  <TabsList>
    <TabsTrigger value="daily">תנועות יומיות</TabsTrigger>
    <TabsTrigger value="recurring">תנועות קבועות</TabsTrigger>
    <TabsTrigger value="recurring-expenses">הוצאות קבועות</TabsTrigger>
  </TabsList>

  <TabsContent value="recurring">
    <RecurringTransactionsTab 
      customer={customer}
      dateRange={dateRange}
    />
  </TabsContent>
</Tabs>
```

**קובץ חדש:** `src/components/cashflow/RecurringTransactionsTab.jsx`

```jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';

export default function RecurringTransactionsTab({ customer, dateRange }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  // טעינת תנועות קבועות
  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ['recurringTransactions', customer?.email],
    queryFn: async () => {
      // Entity חדש או שימוש ב-RecurringExpense עם סוג שונה
      // כרגע נשתמש ב-RecurringExpense אבל נסמן שזה לתזרים
      const expenses = await base44.entities.RecurringExpense.filter({
        customer_email: customer.email,
        linked_to_cashflow: true // שדה חדש שצריך להוסיף
      });
      return expenses;
    },
    enabled: !!customer?.email
  });

  // חישוב תנועות צפויות לתאריך מסוים
  const getTransactionsForDate = (date) => {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return recurringTransactions.flatMap(expense => {
      const monthData = expense.monthly_amounts?.find(
        m => m.month === month && m.year === year
      );
      
      if (monthData) {
        return [{
          id: `${expense.id}_${month}_${year}`,
          date: format(date, 'yyyy-MM-dd'),
          description: expense.category,
          debit: monthData.amount,
          credit: 0,
          category: expense.category,
          is_recurring: true,
          recurring_expense_id: expense.id
        }];
      }
      return [];
    });
  };

  const transactionsForSelectedDate = getTransactionsForDate(selectedDate);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>תנועות קבועות</CardTitle>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף תנועה קבועה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* לוח שנה לבחירת תאריך */}
          <div className="mb-4">
            <Label>בחר תאריך:</Label>
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </div>

          {/* תנועות צפויות לתאריך */}
          <div className="space-y-2">
            {transactionsForSelectedDate.map(transaction => (
              <div key={transaction.id} className="flex justify-between p-3 bg-horizon-card rounded">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-horizon-accent">{transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-400">₪{transaction.debit.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9.7 הוספת הוצאה/הכנסה צפויה

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// הוסף כפתור ומודל:
const [showAddExpectedModal, setShowAddExpectedModal] = useState(false);
const [expectedTransaction, setExpectedTransaction] = useState({
  type: 'expense', // 'expense' | 'income'
  category: '',
  amount: 0,
  date: '',
  description: ''
});

// כפתור:
<Button onClick={() => setShowAddExpectedModal(true)}>
  <Plus className="w-4 h-4 ml-2" />
  הוסף הוצאה/הכנסה צפויה
</Button>

// מודל:
<Dialog open={showAddExpectedModal} onOpenChange={setShowAddExpectedModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>הוסף תנועה צפויה</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>סוג תנועה</Label>
        <Select 
          value={expectedTransaction.type}
          onValueChange={(value) => setExpectedTransaction({ ...expectedTransaction, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">הוצאה צפויה</SelectItem>
            <SelectItem value="income">הכנסה צפויה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>קטגוריה</Label>
        <Select 
          value={expectedTransaction.category}
          onValueChange={(value) => setExpectedTransaction({ ...expectedTransaction, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר קטגוריה" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>סכום</Label>
        <Input
          type="number"
          value={expectedTransaction.amount}
          onChange={(e) => setExpectedTransaction({ ...expectedTransaction, amount: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <Label>תאריך צפוי</Label>
        <Input
          type="date"
          value={expectedTransaction.date}
          onChange={(e) => setExpectedTransaction({ ...expectedTransaction, date: e.target.value })}
        />
      </div>

      <div>
        <Label>תיאור</Label>
        <Input
          value={expectedTransaction.description}
          onChange={(e) => setExpectedTransaction({ ...expectedTransaction, description: e.target.value })}
        />
      </div>
    </div>
    <DialogFooter>
      <Button onClick={handleAddExpectedTransaction}>
        שמור
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// פונקציה לשמירה:
const handleAddExpectedTransaction = async () => {
  try {
    await base44.entities.CashFlow.create({
      customer_email: customer.email,
      date: expectedTransaction.date,
      description: expectedTransaction.description,
      category: expectedTransaction.category,
      debit: expectedTransaction.type === 'expense' ? expectedTransaction.amount : 0,
      credit: expectedTransaction.type === 'income' ? expectedTransaction.amount : 0,
      payment_type: 'expected',
      is_expected: true
    });
    
    queryClient.invalidateQueries(['cashFlow', customer.email]);
    setShowAddExpectedModal(false);
    setExpectedTransaction({ type: 'expense', category: '', amount: 0, date: '', description: '' });
    
    toast({
      title: "הצלחה!",
      description: "התנועה הצפויה נוספה",
      variant: "default"
    });
  } catch (error) {
    console.error('Error adding expected transaction:', error);
    toast({
      title: "שגיאה",
      description: "שגיאה בהוספת התנועה",
      variant: "destructive"
    });
  }
};
```

### 9.8 טאב כרטיסי אשראי

**קובץ:** `src/components/cashflow/CashFlowManager.jsx`

```jsx
// הוסף טאב:
<TabsTrigger value="credit-cards">כרטיסי אשראי</TabsTrigger>

<TabsContent value="credit-cards">
  <CreditCardsTab customer={customer} />
</TabsContent>
```

**קובץ חדש:** `src/components/cashflow/CreditCardsTab.jsx`

```jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CreditCardsTab({ customer }) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // טעינת הוצאות כרטיסי אשראי
  const { data: creditCardExpenses = [] } = useQuery({
    queryKey: ['creditCardExpenses', customer?.email],
    queryFn: async () => {
      return base44.entities.CashFlow.filter({
        customer_email: customer.email,
        payment_type: 'credit_card'
      }, '-date');
    },
    enabled: !!customer?.email
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // קריאה לפונקציה שמנתחת דוח כרטיס אשראי
      const response = await base44.functions.invoke('parseCreditCardReport', {
        fileUrl: file_url,
        customerEmail: customer.email
      });

      if (response.data.success) {
        queryClient.invalidateQueries(['creditCardExpenses', customer.email]);
        toast({
          title: "הצלחה!",
          description: `נוספו ${response.data.processed || 0} הוצאות`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error uploading credit card report:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעיבוד דוח כרטיס אשראי",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>כרטיסי אשראי</CardTitle>
            <div>
              <input
                type="file"
                id="credit-card-upload"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('credit-card-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 ml-2" />
                העלה דוח כרטיס אשראי
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תאריך</TableHead>
                <TableHead>תיאור</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>סכום</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCardExpenses.map(expense => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <Select
                      value={expense.category}
                      onValueChange={async (value) => {
                        await base44.entities.CashFlow.update(expense.id, { category: value });
                        queryClient.invalidateQueries(['creditCardExpenses', customer.email]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* רשימת קטגוריות */}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>₪{expense.debit.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 10. המלצות מערכת - תהליך

### בעיה:
צריך להבין איך המערכת נותנת המלצות.

### פתרון - תיעוד התהליך:

**קובץ:** `functions/generateStrategicRecommendations.ts`

התהליך הנוכחי:
1. מקבל פרטי לקוח (סוג עסק, יעדים, מוצרים, מחזור)
2. שולח פרומפט ל-AI עם כל הפרטים
3. AI מחזיר 5-8 המלצות אסטרטגיות
4. כל המלצה כוללת: כותרת, תיאור, רווח צפוי, אחוז שיפור, מאמץ, צעדים, זמן, קטגוריה
5. ההמלצות נשמרות במערכת עם סטטוס "pending"

**שיפור אפשרי - הוספת נתונים מהקטלוג:**

```ts
// הוסף טעינת נתונים מהקטלוג:
const catalogProducts = await base44.asServiceRole.entities.ProductCatalog.filter({
  customer_email: customer_email,
  is_active: true
}, '-created_date', 50); // 50 מוצרים ראשונים

const productsSummary = catalogProducts.map(p => 
  `${p.product_name}: מחיר מכירה ₪${p.selling_price}, רווח ${p.profit_percentage}%`
).join('\n');

// הוסף לפרומפט:
const enhancedPrompt = `
${strategicPrompt}

נתוני קטלוג:
${productsSummary}
`;
```

---

## 11. אחוזים בקטלוג

### בעיה:
צריכים להיות רווח גולמי / מחיר מכירה.

### פתרון:

**קובץ:** `src/components/catalog/ProductCatalogTable.jsx`

```jsx
// הוסף עמודה חדשה:
<TableHead>רווח גולמי %</TableHead>

<TableCell>
  {(() => {
    const costPrice = parseFloat(product.cost_price) || 0;
    const sellingPrice = parseFloat(product.selling_price) || 0;
    const grossProfit = sellingPrice - costPrice;
    const grossProfitPercent = sellingPrice > 0 
      ? ((grossProfit / sellingPrice) * 100).toFixed(1)
      : 0;
    
    return (
      <span className={grossProfitPercent > 30 ? 'text-green-400' : grossProfitPercent > 15 ? 'text-yellow-400' : 'text-red-400'}>
        {grossProfitPercent}%
      </span>
    );
  })()}
</TableCell>
```

---

## 12. דוחות Z - איחוד

### בעיה:
צריך לאחד 2 דוחות Z (וולט + קופה).

### פתרון:

**קובץ:** `functions/parseZReport.ts`

```ts
// הוסף פונקציה לאיחוד דוחות:
async function mergeZReports(reports: ZReportData[]): Promise<ZReportData> {
  const merged: ZReportData = {
    date: reports[0].date,
    total_revenue: 0,
    total_revenue_with_vat: 0,
    products: [],
    summary: {
      total_revenue: 0,
      total_revenue_with_vat: 0,
      products_count: 0
    }
  };

  // איחוד מוצרים - אם אותו מוצר בשני הדוחות, חבר את הכמויות
  const productsMap = new Map();

  for (const report of reports) {
    merged.total_revenue += report.total_revenue || 0;
    merged.total_revenue_with_vat += report.total_revenue_with_vat || 0;

    for (const product of report.products || []) {
      const key = product.product_name || product.name;
      if (productsMap.has(key)) {
        const existing = productsMap.get(key);
        existing.quantity_sold = (existing.quantity_sold || 0) + (product.quantity_sold || 0);
        existing.revenue = (existing.revenue || 0) + (product.revenue || 0);
        existing.revenue_with_vat = (existing.revenue_with_vat || 0) + (product.revenue_with_vat || 0);
      } else {
        productsMap.set(key, { ...product });
      }
    }
  }

  merged.products = Array.from(productsMap.values());
  merged.summary = {
    total_revenue: merged.total_revenue,
    total_revenue_with_vat: merged.total_revenue_with_vat,
    products_count: merged.products.length
  };

  return merged;
}

// בשימוש:
// אם יש 2 קבצים, תן אפשרות לבחור "אחד דוחות"
```

**קובץ:** `src/components/forecast/manual/ZReportUploader.jsx`

```jsx
// הוסף אפשרות להעלות מספר קבצים:
const [uploadedFiles, setUploadedFiles] = useState([]);
const [mergeReports, setMergeReports] = useState(false);

// טיפול בהעלאה מרובת קבצים:
const handleMultipleFiles = async (files: FileList) => {
  if (files.length > 1 && mergeReports) {
    // העלה את כל הקבצים
    const fileUrls = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrls.push(file_url);
    }

    // קרא לפונקציה שמאחדת
    const response = await base44.functions.invoke('mergeZReports', {
      fileUrls,
      customerEmail: customer.email,
      month: selectedMonth
    });
  }
};
```

---

## 13. שירותים בתחזית

### בעיה:
צריך אופציה לרשום סוגי שירותים בתחזית עסקית ולשייך לקטלוג.

### פתרון:

**קובץ:** `src/components/forecast/BusinessForecastManager.jsx`

```jsx
// הוסף טאב/סקציה לשירותים:
const [services, setServices] = useState([]);

// טעינת שירותים מהקטלוג:
const { data: catalogServices = [] } = useQuery({
  queryKey: ['catalogServices', customer?.email],
  queryFn: async () => {
    const products = await ProductCatalog.filter({
      customer_email: customer.email,
      is_active: true
    });
    // סינון רק שירותים (או כל המוצרים)
    return products;
  },
  enabled: !!customer?.email
});

// הוסף אפשרות לשייך שירות למוצר מהקטלוג:
<div>
  <Label>שייך למוצר מהקטלוג</Label>
  <Select
    value={service.linked_product_id || ''}
    onValueChange={(value) => {
      const product = catalogServices.find(p => p.id === value);
      if (product) {
        updateService(serviceId, {
          ...service,
          linked_product_id: value,
          linked_product_name: product.product_name
        });
      }
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="בחר מוצר מהקטלוג" />
    </SelectTrigger>
    <SelectContent>
      {catalogServices.map(product => (
        <SelectItem key={product.id} value={product.id}>
          {product.product_name} ({product.category})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

## 14. טעינת קטלוג - Pagination

### בעיה:
קטלוגים גדולים טוענים לאט. צריך להציג רק 100 ראשונים ואז לטעון עוד.

### פתרון:

**קובץ:** `src/components/catalog/ProductCatalogManager.jsx`

```jsx
// שנה את loadCatalog:
const [hasMoreProducts, setHasMoreProducts] = useState(false);
const [loadedProductsCount, setLoadedProductsCount] = useState(100);
const PRODUCTS_PER_PAGE = 100;

const loadCatalog = useCallback(async () => {
  if (!selectedCatalogId) {
    setIsLoading(false);
    return;
  }
  
  try {
    setIsLoading(true);
    
    // טען רק את ה-100 הראשונים
    const firstBatch = await ProductCatalog.filter(
      {
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        is_active: true
      },
      '-created_date',
      PRODUCTS_PER_PAGE,
      0
    );
    
    setProducts(firstBatch);
    setFilteredProducts(firstBatch);
    
    // בדוק אם יש עוד
    const totalCount = await ProductCatalog.count({
      customer_email: customer.email,
      catalog_id: selectedCatalogId,
      is_active: true
    });
    
    setHasMoreProducts(totalCount > PRODUCTS_PER_PAGE);
    setLoadedProductsCount(PRODUCTS_PER_PAGE);
    
  } catch (error) {
    console.error("Error loading catalog:", error);
  } finally {
    setIsLoading(false);
  }
}, [customer.email, selectedCatalogId]);

// פונקציה לטעינת עוד:
const loadMoreProducts = useCallback(async () => {
  try {
    setIsLoading(true);
    
    const nextBatch = await ProductCatalog.filter(
      {
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        is_active: true
      },
      '-created_date',
      PRODUCTS_PER_PAGE,
      loadedProductsCount
    );
    
    setProducts(prev => [...prev, ...nextBatch]);
    setFilteredProducts(prev => [...prev, ...nextBatch]);
    setLoadedProductsCount(prev => prev + nextBatch.length);
    
    // בדוק אם יש עוד
    const totalCount = await ProductCatalog.count({
      customer_email: customer.email,
      catalog_id: selectedCatalogId,
      is_active: true
    });
    
    setHasMoreProducts(loadedProductsCount + nextBatch.length < totalCount);
    
  } catch (error) {
    console.error("Error loading more products:", error);
  } finally {
    setIsLoading(false);
  }
}, [customer.email, selectedCatalogId, loadedProductsCount]);

// הוסף כפתור "טען עוד":
{hasMoreProducts && (
  <div className="text-center mt-4">
    <Button
      onClick={loadMoreProducts}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          טען עוד מוצרים ({loadedProductsCount} מתוך {totalCount})
        </>
      )}
    </Button>
  </div>
)}
```

---

## 15. UI/UX יעדים

### בעיה:
כאשר הטאב של הלקוחות פתוח וגם הטאב של המשימות, ה-UI נראה לא טוב.

### פתרון:

**קובץ:** `src/components/admin/GoalsAndTasksDashboard.jsx`

```jsx
// הוסף min-height ו-spacing טוב יותר:
<div className="p-4 md:p-6 space-y-6 min-h-screen">
  {/* תוכן */}
</div>

// וודא שהכרטיסים לא מתנגשים:
<Card className="card-horizon mb-6">
  {/* תוכן */}
</Card>
```

---

## 16. סינון לקוחות

### בעיה:
צריך להוסיף סינון לפי קבוצה A/B וללא שיוך.

### פתרון:

**קובץ:** `src/pages/CustomerManagement.jsx` או איפה שיש רשימת לקוחות

```jsx
const [groupFilter, setGroupFilter] = useState('all'); // 'all' | 'A' | 'B' | 'none'

// הוסף פילטר:
<Select value={groupFilter} onValueChange={setGroupFilter}>
  <SelectTrigger>
    <SelectValue placeholder="סינון לפי קבוצה" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">כל הלקוחות</SelectItem>
    <SelectItem value="A">קבוצה A</SelectItem>
    <SelectItem value="B">קבוצה B</SelectItem>
    <SelectItem value="none">ללא שיוך</SelectItem>
  </SelectContent>
</Select>

// סינון הלקוחות:
const filteredCustomers = useMemo(() => {
  let filtered = customers;
  
  if (groupFilter !== 'all') {
    filtered = filtered.filter(customer => {
      if (groupFilter === 'none') {
        return !customer.customer_group || customer.customer_group === '';
      }
      return customer.customer_group === groupFilter;
    });
  }
  
  return filtered;
}, [customers, groupFilter]);
```

---

## 17. מחיקת יעדים

### בעיה:
יש בעיה במחיקת יעדים שנכתבו על ידי יוזרים שכבר לא במערכת.

### פתרון:

**קובץ:** `src/components/admin/GoalsAndTasksDashboard.jsx`

```jsx
const handleDeleteTask = async (taskId, taskName) => {
  // בדיקה אם יש תת-משימות
  const subtasks = allGoals.filter((t) => t.parent_id === taskId);
  
  if (subtasks.length > 0) {
    // ... הקוד הקיים
  } else {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${taskName}"?`)) {
      return;
    }

    try {
      // נסה למחוק - גם אם assignee_email לא קיים יותר
      await base44.entities.CustomerGoal.delete(taskId);
      
      // אם נכשל, נסה לעדכן ל-is_active: false
      // (זה fallback אם המחיקה נכשלה)
      try {
        await base44.entities.CustomerGoal.update(taskId, { is_active: false });
      } catch (updateError) {
        // אם גם זה נכשל, זה בסדר - המשתמש יראה שגיאה
      }
      
      await queryClient.invalidateQueries(['customerGoals', customer.email]);
      toast({
        title: "הצלחה!",
        description: "המשימה נמחקה בהצלחה",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      
      // נסה למחוק דרך is_active במקום delete
      try {
        await base44.entities.CustomerGoal.update(taskId, { is_active: false });
        await queryClient.invalidateQueries(['customerGoals', customer.email]);
        toast({
          title: "הצלחה!",
          description: "המשימה הוסתרה (לא נמחקה לחלוטין)",
          variant: "default"
        });
      } catch (updateError) {
        toast({
          title: "שגיאה",
          description: `שגיאה במחיקת המשימה: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  }
};
```

---

## 18. תחזית מכירות

### בעיה:
בתחזית מכירות בתחזית העסקית - צריך להציג רק מוצרים שנמכרו, ואז אם טוען דוח Z, עדיפות למוצרים שנמכרו.

### פתרון:

**קובץ:** `src/components/forecast/manual/Step3SalesForecast.jsx`

```jsx
// טעינת מוצרים שנמכרו מדוחות Z:
const { data: soldProducts = [] } = useQuery({
  queryKey: ['soldProducts', customer?.email, forecastData?.id],
  queryFn: async () => {
    if (!forecastData?.z_reports_uploaded) return [];
    
    // אסוף את כל המוצרים שנמכרו מכל דוחות Z
    const allSoldProducts = [];
    
    for (const zReport of forecastData.z_reports_uploaded) {
      if (zReport.detailed_products) {
        allSoldProducts.push(...zReport.detailed_products);
      }
    }
    
    // החזר רשימה ייחודית של מוצרים
    const uniqueProducts = [...new Map(
      allSoldProducts.map(p => [p.product_name || p.name, p])
    ).values()];
    
    return uniqueProducts;
  },
  enabled: !!forecastData?.z_reports_uploaded
});

// סינון ושילוב:
const allAvailableProducts = useMemo(() => {
  // 1. מוצרים שנמכרו (עדיפות)
  const sold = soldProducts.map(p => ({
    ...p,
    priority: 1,
    source: 'z_report'
  }));
  
  // 2. מוצרים מהקטלוג שלא נמכרו
  const catalog = catalogProducts
    .filter(p => !soldProducts.find(sp => sp.product_name === p.product_name))
    .map(p => ({
      ...p,
      priority: 2,
      source: 'catalog'
    }));
  
  // מיון לפי עדיפות
  return [...sold, ...catalog].sort((a, b) => a.priority - b.priority);
}, [soldProducts, catalogProducts]);

// בטבלת התחזית, הצג רק את המוצרים שנמכרו בהתחלה:
const displayedProducts = useMemo(() => {
  if (showOnlySold) {
    return allAvailableProducts.filter(p => p.priority === 1);
  }
  return allAvailableProducts;
}, [allAvailableProducts, showOnlySold]);
```

---

## 19. התראה מוצרים ללא מחיר קנייה

### בעיה:
כאשר בקטלוג יש מוצרים שאין להם מחיר קנייה, צריך התראה או סימון.

### פתרון:

**קובץ:** `src/components/catalog/ProductCatalogTable.jsx`

```jsx
// הוסף בדיקה וסימון:
const hasCostPrice = (product) => {
  return product.cost_price && parseFloat(product.cost_price) > 0;
};

// בטבלה:
<TableCell>
  {!hasCostPrice(product) && (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/50 mr-2">
      <AlertTriangle className="w-3 h-3 ml-1" />
      חסר מחיר קנייה
    </Badge>
  )}
  {product.cost_price ? `₪${parseFloat(product.cost_price).toLocaleString()}` : '-'}
</TableCell>

// או סימון בשורה:
<TableRow className={!hasCostPrice(product) ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''}>
  {/* תוכן */}
</TableRow>
```

---

## 20. סינון ממתינים

### בעיה:
כאשר מנהל כספים יכול לשייך, צריך אופציה לסנן לפי ממתינים.

### פתרון:

**קובץ:** `src/pages/CustomerManagement.jsx` או איפה שיש רשימת לקוחות

```jsx
const [pendingFilter, setPendingFilter] = useState(false);

// כפתור פילטר:
<Button
  variant={pendingFilter ? "default" : "outline"}
  onClick={() => setPendingFilter(!pendingFilter)}
>
  <Filter className="w-4 h-4 ml-2" />
  ממתינים לשיוך
</Button>

// סינון:
const filteredCustomers = useMemo(() => {
  let filtered = customers;
  
  if (pendingFilter) {
    filtered = filtered.filter(customer => {
      // לקוחות שממתינים לשיוך מנהל כספים
      return !customer.assigned_financial_manager_email || 
             customer.assigned_financial_manager_email === '';
    });
  }
  
  return filtered;
}, [customers, pendingFilter]);
```

---

## סיכום - סדר עדיפות לביצוע

1. **גבוה מאוד:**
   - Snackbar לכל פעולה (#8)
   - נושא פגישה קבוע (#6)
   - זימון Google Calendar (#5)
   - שליחת ווצאפ (#2)

2. **גבוה:**
   - בחירת מוצר בהמלצות (#1)
   - תזרים - כל השיפורים (#9)
   - טעינת קטלוג (#14)

3. **בינוני:**
   - תצוגת המלצות (#3)
   - אופטימיזציה ספקים (#4)
   - דוחות Z (#12)

4. **נמוך:**
   - שאר השיפורים

---

**הערה חשובה:** כל התיקונים דורשים בדיקה קפדנית. מומלץ לבצע אותם אחד אחד ולבדוק כל אחד לפני המעבר לבא.
