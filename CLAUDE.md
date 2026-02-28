# CLAUDE.md — Working Rules for plusto-1

## Project Overview

- **Type**: CRM — מערכת ניהול עסקי
- **Stack**: Full-stack Next.js + Supabase (Postgres + Auth + Realtime)
- **Language convention**: תקשורת בעברית + מונחים טכניים באנגלית (שמות קבצים, variables, functions — תמיד באנגלית)

---

## Communication Style

- דבר אלי בעברית + מונחים טכניים באנגלית (לדוגמה: "יצרתי את ה-endpoint ב-`/api/contacts`")
- **עצור ושאל** רק לפני החלטות גדולות / ארכיטקטורליות
- על שינויים קטנים ובינוניים — תתקדם ותדווח בסיום
- בסיום כל משימה משמעותית — ספק סיכום קצר של מה שנעשה

---

## Planning & Workflow

### לפני שינויים גדולים:
1. **Plan Mode** — הצג תכנית ובקש אישור לפני כתיבת קוד
2. **TodoWrite** — שמור רשימת tasks לאורך המשימה ועדכן בזמן אמת
3. **דוח סיום** — בסיום פיצ'ר/שלב גדול, כתוב סיכום מה השתנה

### GSD — שיטת העבודה הרגילה לכל משימה משמעותית:
```
/gsd:discuss-phase → /gsd:plan-phase → /gsd:execute-phase → /gsd:verify-work
```
- כולל bug fixes גדולים, features חדשים, ו-refactors
- לתיקונים קטנים / שינויי config — `/gsd:quick`

---

## Code Conventions

### Components
- **תמיד** בנה ו-reuse React components — אין לוגיקת UI כפולה
- שמור components קטנים וממוקדים; פצל כשקובץ הופך מורכב
- Functional components בלבד (אין class components)

### Comments
- **חובה** להוסיף comments לכל לוגיקה שאינה self-evident
- מטרה: כל מפתח שיקרא את הקוד יבין אותו בקלות
- שפת ה-comment: עברית או אנגלית — לפי ההקשר

### Style
- התאם את הגישה לסוג המשימה (אין one-size-fits-all)
- העדף פשטות וקריאות על פני חכמה מיותרת
- אין over-engineering — רק מה שנדרש

---

## UI & Design

בחר את הספרייה **הטובה ביותר** לכל use case:

| Use Case | Library |
|----------|---------|
| General UI, forms, dialogs | `shadcn/ui + Tailwind` (default) |
| Charts & data viz | `Recharts` or `Chart.js` |
| Complex tables | `TanStack Table` |
| Date pickers | `react-day-picker` (via shadcn) |
| Advanced forms | `react-hook-form + zod` |

- העדף composable, reusable components
- אל תחזור על UI patterns — צור component ו-reuse אותו

---

## Error Handling

- **User-facing errors**: Toast notifications — השתמש ב-`useToast` של shadcn או `react-hot-toast`
- **Dev errors**: `console.error` עם הודעה משמעותית
- **אסור** לבלוע שגיאות בשקט — תמיד log

```typescript
// Good
try {
  await supabase.from('contacts').insert(data)
} catch (error) {
  console.error('[contacts/insert]', error)
  toast({ title: 'שגיאה בשמירת הנתונים', variant: 'destructive' })
}
```

---

## Database / Backend (Supabase)

- Supabase client: ייובא מ-`@/lib/supabase` (או הנתיב הקיים בפרויקט)
- **תמיד** הפעל Row Level Security (RLS) על טבלאות עם נתוני משתמשים
- כתוב typed queries — אין raw untyped calls
- שמור על separation: לוגיקת DB ב-server components או API routes, לא בתוך client components

---

## Testing

- כתוב tests **לפיצ'רים חשובים / קריטיים**:
  - Auth flows
  - Data mutations (create/update/delete)
  - Core business logic
- Frameworks: `Vitest` + `React Testing Library`
- אין tests לUI טריוויאלי אלא אם מתבקש במפורש

---

## Git Policy

| פעולה | מדיניות |
|--------|---------|
| `git add + commit` | שאל לפני, אלא אם הוזמן במפורש |
| `git push` | תמיד שאל לפני |
| יצירת branch | שאל לפני |
| מחיקת files / branches | תמיד שאל, אף פעם לא אוטומטי |
| `reset --hard`, force push | תמיד שאל — פעולות הרסניות |

---

## מה תמיד דורש אישור

עצור ובקש אישור לפני:

1. שינויי ארכיטקטורה (מבנה תיקיות, routing, DB schema)
2. מחיקת קבצים או branches
3. Push לremote
4. התקנת dependencies חדשות
5. שינויים שמשפיעים על כמה פיצ'רים מרכזיים בו-זמנית
