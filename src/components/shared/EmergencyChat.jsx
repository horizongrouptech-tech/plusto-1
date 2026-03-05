import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Loader2, ShieldAlert, CalendarPlus, Maximize2, Minimize2 } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import ReactMarkdown from 'react-markdown';
import { Product, Sale } from '@/api/entities';
import { openRouterAPI, SendEmail } from '@/api/integrations';



const EmergencyChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const { user } = useAuth();
  const [userContext, setUserContext] = useState(null);
  const [meetingRequested, setMeetingRequested] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef(null);

  const ESCALATION_PHRASE = "אני ממליץ לקבוע פגישת ייעוץ";

  useEffect(() => {
    const fetchUserAndContext = async () => {
      try {
        const userData = user;
        if (!userData) return;
        
        const [products, sales] = await Promise.all([
          Product.filter({ created_by: userData.email }),
          Sale.filter({ created_by: userData.email })
        ]);

        setUserContext({
          hasProducts: products.length > 0,
          productCount: products.length,
          hasSales: sales.length > 0,
          businessType: userData.business_type || "לא צוין"
        });

      } catch (e) {
        console.error("User not found for chat");
      }
    };
    
    if (isOpen) {
      fetchUserAndContext();
      if (messages.length === 0) {
        setMessages([
          { sender: 'ai', text: 'שלום! אני סוכן הסיוע העסקי שלך. איך אני יכול לעזור לך ברגע זה?' }
        ]);
        setMeetingRequested(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
         scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const systemPrompt = `
    אתה 'Plusto AI', יועץ עסקי לסיוע חירום בפלטפורמת Plusto.
    המשימה שלך היא משולשת:

    1.  **אבחון ושאילת שאלות:** אל תיתן תשובה מיד. שאל שאלות מנחות כדי להבין את הבעיה. השתמש במידע שכבר קיים על העסק כדי לשאול שאלות חכמות. לדוגמה: "אני רואה שיש לך ${userContext?.productCount || 'מספר'} מוצרים במערכת. האם הבעיה קשורה למוצר ספציפי?"

    2.  **זיהוי פערים והכוונה למערכת:** המטרה המרכזית שלך היא להדריך את המשתמש להשתמש במערכת כדי לפתור את הבעיה. אם חסר מידע, דרבן אותו להשלים אותו. לדוגמה: "כדי שאוכל לנתח את ירידת הרווחיות, אני צריך שתעלה דוח מכירות עדכני. בוא נלך יחד לעמוד 'העלאת קבצים' כדי לעשות את זה." השתמש במשפטי חיזוק כמו "אני פה לעזור, אבל קודם נעבור על הנתונים יחד."

    3.  **זיהוי תסכול והסלמה (מדרגה שנייה):** אם המשתמש מביע תסכול ("זה לא עוזר", "אני תקוע") או שהבעיה מורכבת מדי, עליך להציע פגישת ייעוץ. התשובה שלך חייבת לכלול את המשפט המדויק: "${ESCALATION_PHRASE} קצרה (עד 30 דקות) עם אלירן אוחיון, יזם מנוסה ומנכ\"ל הוריזון, שיעזור לך לבנות תוכנית פעולה מדויקת." אל תוסיף שום דבר אחרי משפט זה.

    שמור על שפה מקצועית, אנושית ומכוונת מטרה בעברית.
  `;
  
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isThinking) return;
    
    if (messageText.trim() === "פגישת עבודה") {
        handleScheduleMeeting();
        return;
    }

    const newMessages = [...messages, { sender: 'user', text: messageText }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
        const fullPrompt = `${systemPrompt}\n\n**הקשר על המשתמש:**\n- סוג עסק: ${userContext?.businessType}\n- קטלוג מוצרים הועלה: ${userContext?.hasProducts ? 'כן' : 'לא'}\n- דוחות מכירה הועלו: ${userContext?.hasSales ? 'כן' : 'לא'}\n\n**היסטוריית שיחה:**\n${JSON.stringify(messages.slice(-5))}\n\n**הודעת המשתמש:** "${messageText}"`;

        const response = await openRouterAPI({ prompt: fullPrompt });
        setMessages(prev => [...prev, { sender: 'ai', text: response }]);
    } catch (error) {
        console.error("Error calling LLM:", error);
        setMessages(prev => [...prev, { sender: 'ai', text: 'אני מתנצל, נתקלתי בבעיה טכנית.' }]);
    } finally {
        setIsThinking(false);
    }
  };
  
  const handleScheduleMeeting = async () => {
    setIsThinking(true);
    setMeetingRequested(true);
    
    try {
        if (!user) {
            throw new Error('User not found');
        }

        const adminEmail = "byo@post.bgu.ac.il";
        const emailSubject = `בקשה לפגישת ייעוץ מלקוח: ${user.business_name || user.full_name}`;
        
        const emailBody = `
            <!DOCTYPE html>
            <html dir="rtl" lang="he">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 0; }
                    .email-container { max-width: 600px; margin: 20px auto; padding: 25px; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #32acc1; }
                    .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                    .header h1 { color: #121725; font-size: 24px; margin: 0; }
                    .content p { line-height: 1.7; }
                    .content h2 { color: #32acc1; font-size: 18px; border-bottom: 2px solid #fc9f67; padding-bottom: 5px; display: inline-block; margin-top: 20px; }
                    .user-details { list-style: none; padding: 0; }
                    .user-details li { background-color: #f9f9f9; border: 1px solid #eee; padding: 12px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
                    .user-details strong { color: #121725; font-size: 16px; }
                    .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #888; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>בקשה חדשה לפגישת ייעוץ</h1>
                    </div>
                    <div class="content">
                        <p>הי הילי,</p>
                        <p>התקבלה בקשה חדשה לפגישת עבודה עם יועץ כספים דרך סוכן החירום במערכת Plusto.</p>
                        <h2>פרטי הלקוח:</h2>
                        <ul class="user-details">
                            <li><span>שם העסק:</span> <strong>${user.business_name || 'לא צוין'}</strong></li>
                            <li><span>שם מלא:</span> <strong>${user.full_name || 'לא צוין'}</strong></li>
                            <li><span>אימייל:</span> <strong><a href="mailto:${user.email}">${user.email}</a></strong></li>
                            <li><span>טלפון:</span> <strong><a href="tel:${user.phone}">${user.phone || 'לא צוין'}</a></strong></li>
                        </ul>
                        <h2>שלבים הבאים:</h2>
                        <p>אנא צרי קשר עם הלקוח בהקדם האפשרי על מנת לתאם פגישת עבודה קצרה (עד 30 דקות) עם אלירן.</p>
                    </div>
                    <div class="footer">
                        <p>הודעה זו נשלחה אוטומטית ממערכת Plusto.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await SendEmail({
            to: adminEmail,
            from_name: "Plusto - מערכת חכמה",
            subject: emailSubject,
            body: emailBody,
        });

        setMessages(prev => [...prev, {
            sender: 'ai', 
            text: 'הבקשה שלך לפגישת ייעוץ נשלחה בהצלחה! הילי, מנהלת המשרד, תיצור איתך קשר בהקדם. האם יש משהו נוסף שאוכל לסייע בו?'
        }]);
        
    } catch (error) {
        console.error("Failed to schedule meeting", error);
        setMessages(prev => [...prev, {
            sender: 'ai', 
            text: 'אני מתנצל, הייתה שגיאה בשליחת הבקשה. אנא נסה שוב או פנה לתמיכה ישירות.'
        }]);
    } finally {
        setIsThinking(false);
    }
  };

  const predefinedQuestions = [
    "הרווחיות שלי על מוצר מפתח ירדה",
    "אני צריך להגדיל מכירות במהירות",
    "מתחרה חדש נכנס לשוק",
    "אני במצוקה תזרימית"
  ];

  const lastMessageIsEscalation = messages.length > 0 && messages[messages.length-1].sender === 'ai' && messages[messages.length-1].text.includes(ESCALATION_PHRASE);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`bg-horizon-dark text-horizon-text border-horizon flex flex-col p-0 transition-all duration-300 ${
          isExpanded ? 'sm:max-w-4xl h-[90vh]' : 'sm:max-w-md h-[70vh]'
        }`} 
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b border-horizon">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-horizon-primary">
              <ShieldAlert className="w-6 h-6" />
              סוכן חירום עסקי
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-horizon-accent hover:bg-horizon-card"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
          <DialogDescription className="text-horizon-accent">
            סיוע מיידי לאתגרים עסקיים דחופים
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && <Bot className="w-6 h-6 text-horizon-primary flex-shrink-0" />}
                <div className={`rounded-lg px-4 py-2 max-w-[85%] ${msg.sender === 'user' ? 'bg-horizon-primary' : 'bg-horizon-card'}`}>
                  {msg.sender === 'ai' ? (
                    <div className="text-sm text-horizon-text">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-2" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-white">{msg.text}</p>
                  )}
                </div>
                {msg.sender === 'user' && <User className="w-6 h-6 text-horizon-accent flex-shrink-0" />}
              </div>
            ))}
            {isThinking && (
              <div className="flex items-start gap-3">
                <Bot className="w-6 h-6 text-horizon-primary" />
                <div className="rounded-lg px-4 py-2 bg-horizon-card flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-horizon-accent">חושב...</span>
                </div>
              </div>
            )}
            
            {lastMessageIsEscalation && !meetingRequested && (
                <div className="flex justify-center mt-4">
                    <Button onClick={handleScheduleMeeting} className="btn-horizon-secondary w-full">
                        <CalendarPlus className="w-4 h-4 ml-2" />
                        כן, קבע פגישת עבודה
                    </Button>
                </div>
            )}

          </div>
          
          {messages.length <= 1 && (
            <div className="mt-6 pt-4 border-t border-horizon">
              <p className="text-sm text-horizon-accent mb-3">או התחל עם אחת מהשאלות הנפוצות:</p>
              <div className="grid grid-cols-2 gap-2">
                {predefinedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-md border border-horizon bg-horizon-card px-3 py-2 text-right text-xs text-horizon-accent transition-colors hover:border-horizon-primary hover:bg-horizon-primary/10 hover:text-white"
                    onClick={() => handleSendMessage(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="p-4 border-t border-horizon">
          <div className="flex w-full items-center gap-2">
            <Input 
              placeholder="כתוב את האתגר שלך או 'פגישת עבודה'" 
              className="flex-1 bg-horizon-card border-horizon text-horizon-text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
              disabled={isThinking}
            />
            <Button onClick={() => handleSendMessage(input)} disabled={isThinking} className="btn-horizon-primary">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyChat;