import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircleQuestion, HelpCircle, ChevronDown } from 'lucide-react';

const faqData = [
  {
    question: "איך האפליקציה יודעת להציע המלצות לשיפור רווחיות?",
    answer: "האפליקציה מנתחת את נתוני המוצרים שאתה מזין (מחיר עלות, מכירה, מכירות חודשיות וכו') בשילוב עם ידע פנימי מבוסס דאטה ומידע עדכני מהאינטרנט, כדי לזהות הזדמנויות עסקיות רווחיות."
  },
  {
    question: "אילו נתונים צריך להזין כדי להתחיל?",
    answer: "מספיק להתחיל עם:\n- שם מוצר (חובה)\n- מחיר עלות או מחיר מכירה (לפחות אחד מהם)\nמומלץ להוסיף גם כמות במלאי ומכירות חודשיות לקבלת המלצות מדויקות יותר."
  },
  {
    question: "מה זה “חיסכון פוטנציאלי” שמופיע בהמלצות?",
    answer: "זהו חישוב של כמה כסף אפשר לחסוך או להרוויח אם תיישם את ההמלצה, לדוגמה: החלפת ספק, שינוי מחיר, או קידום מכירות."
  },
  {
    question: "האם ההמלצות נוצרות באופן אוטומטי?",
    answer: "כן. ההמלצות מתעדכנות פעם בשבוע באופן אוטומטי, וניתן לרענן אותן ידנית בלחיצת כפתור."
  },
  {
    question: "אפשר לערוך המלצה? או לסמן אותה כבוצעה?",
    answer: "בהחלט. ניתן ללחוץ על “סמן כבוצע” כדי לשמור היסטוריה של פעולות, או “שמור” לעריכה מאוחרת."
  },
  {
    question: "מה ההבדל בין “המלצות” ל“בנק מהלכים”?",
    answer: "המלצות הן מותאמות אישית לפי הנתונים שלך.\nבנק מהלכים הוא מאגר כללי של רעיונות עסקיים לשיפור רווחיות – תוכל לבחור מהם מהלכים רלוונטיים לעסק שלך."
  },
  {
    question: "יש לי בעיה בטעינת ההמלצות – מה לעשות?",
    answer: "בדוק שהזנת לפחות מוצר אחד עם נתונים תקינים. אם עדיין אין תוצאות, נסה לרענן את הדף או פנה לתמיכה דרך כפתור “צור קשר”."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <MessageCircleQuestion className="w-20 h-20 mx-auto mb-4 text-horizon-primary" />
          <h1 className="text-4xl font-bold mb-3">שאלות נפוצות</h1>
          <p className="text-lg text-horizon-accent">כל מה שרצית לדעת על ProfitBooster במקום אחד</p>
        </div>

        <Card className="card-horizon shadow-horizon-strong">
          <CardContent className="p-8">
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-horizon">
                  <AccordionTrigger className="text-lg font-semibold text-horizon-text hover:text-horizon-primary py-6 text-right group">
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-horizon-accent group-hover:text-horizon-primary transition-colors" />
                        {item.question}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-horizon-accent transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-horizon-accent leading-relaxed pt-2 pb-6 whitespace-pre-line text-base bg-horizon-dark/30 p-4 rounded-md">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}