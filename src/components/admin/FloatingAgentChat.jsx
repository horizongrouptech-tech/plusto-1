import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Bot, 
  User as UserIcon,
  Expand,
  Shrink,
  History,
  Plus,
  Loader2,
  Database,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Zap,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
  Target,
  RefreshCw,
  Filter
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsers } from '../shared/UsersContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// תצוגת Tool Call
const ToolCallDisplay = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getToolIcon = (name) => {
    if (name?.includes('search') || name?.includes('filter')) return Search;
    if (name?.includes('read') || name?.includes('list')) return Database;
    if (name?.includes('create') || name?.includes('update')) return FileText;
    return Zap;
  };
  
  const getToolStatus = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'failed':
      case 'error':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' };
      default:
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', spin: true };
    }
  };
  
  const ToolIcon = getToolIcon(toolCall?.name);
  const statusConfig = getToolStatus(toolCall?.status);
  const StatusIcon = statusConfig.icon;
  
  // עיבוד שם הכלי לעברית
  const getToolDisplayName = (name) => {
    if (!name) return 'פעולה';
    
    const translations = {
      'searchCustomers': 'חיפוש לקוחות',
      'Recommendation.read': 'קריאת המלצות',
      'Recommendation.filter': 'סינון המלצות',
      'ProductCatalog.read': 'קריאת קטלוג',
      'ProductCatalog.filter': 'סינון קטלוג',
      'CustomerGoal.read': 'קריאת יעדים',
      'CustomerGoal.filter': 'סינון יעדים',
      'CustomerGoal.create': 'יצירת יעד',
      'CustomerGoal.update': 'עדכון יעד',
      'FileUpload.read': 'קריאת קבצים',
      'ManualForecast.read': 'קריאת תחזית',
      'BusinessForecast.read': 'קריאת תחזית עסקית',
      'OnboardingRequest.read': 'קריאת בקשות הצטרפות',
      'CustomerAction.create': 'תיעוד פעולה',
      'web_search': 'חיפוש באינטרנט',
    };
    
    return translations[name] || name.split('.').reverse().join(' ');
  };
  
  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs w-full
          ${isExpanded ? 'bg-horizon-card border-horizon-primary/50' : 'bg-horizon-card/50 border-horizon hover:border-horizon-primary/30'}`}
      >
        <ToolIcon className={`w-3 h-3 ${statusConfig.color}`} />
        <span className="text-horizon-text flex-1 text-right">{getToolDisplayName(toolCall?.name)}</span>
        <StatusIcon className={`w-3 h-3 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} />
        {(toolCall?.arguments_string || toolCall?.results) && (
          isExpanded ? <ChevronUp className="w-3 h-3 text-horizon-accent" /> : <ChevronDown className="w-3 h-3 text-horizon-accent" />
        )}
      </button>
      
      {isExpanded && (toolCall?.arguments_string || toolCall?.results) && (
        <div className="mt-1.5 mr-3 pr-3 border-r-2 border-horizon space-y-2 text-xs">
          {toolCall?.arguments_string && (
            <div>
              <div className="text-horizon-accent mb-1">פרמטרים:</div>
              <pre className="bg-horizon-card rounded-md p-2 text-horizon-text whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {toolCall?.results && (
            <div>
              <div className="text-horizon-accent mb-1">תוצאה:</div>
              <pre className="bg-horizon-card rounded-md p-2 text-horizon-text whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                {(() => {
                  try {
                    const parsed = typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results;
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    return String(toolCall.results);
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// בועת הודעה משופרת
const MessageBubble = ({ message, isUser }) => {
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-horizon-primary to-horizon-secondary flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-right ${
            isUser
              ? 'bg-gradient-to-br from-horizon-primary to-horizon-primary/80 text-white rounded-tr-sm'
              : 'bg-horizon-card text-horizon-text border border-horizon rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed" dir="rtl">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none text-right" dir="rtl">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-1 last:mb-0 first:mt-0 text-right">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc mr-4 my-2 space-y-1 text-right pr-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal mr-4 my-2 space-y-1 text-right pr-4">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-horizon-primary">{children}</strong>,
                  em: ({ children }) => <em className="italic text-horizon-accent">{children}</em>,
                  code: ({ children }) => <code className="bg-horizon-dark px-1.5 py-0.5 rounded text-xs">{children}</code>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2 text-horizon-text">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-horizon-text">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-horizon-text">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Tool Calls */}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <ToolCallDisplay key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-horizon-primary flex items-center justify-center flex-shrink-0 mt-1">
          <UserIcon className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

// גדלי חלון
const CHAT_SIZES = {
  small: { width: 380, height: 500 },
  medium: { width: 450, height: 600 },
  large: { width: 550, height: 700 },
  xlarge: { width: 700, height: 800 },
  fullscreen: { width: '100vw', height: '100vh' }
};

export default function FloatingAgentChat({ 
  currentUser, 
  agentName = "customer_business_advisor_agent", 
  currentPageName, 
  selectedCustomer, 
  pageContext 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatSize, setChatSize] = useState('medium');
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // שימוש ב-Context
  const { allUsers: assignedCustomers = [], isAdmin, isFinancialManager } = useUsers();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+/ or Cmd+/ to toggle chat
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        if (chatSize === 'fullscreen') {
          setChatSize('large');
        } else {
          setIsOpen(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, chatSize]);

  // assignedCustomers מגיע מ-Context, אין צורך בטעינה מקומית

  useEffect(() => {
    if (isOpen && currentUser && !isInitialized) {
      const initializeChat = async () => {
        try {
          setIsLoading(true);
          
          const existingConversations = await base44.agents.listConversations({
            agent_name: agentName,
          });

          const userConversations = existingConversations.filter(conv => 
            conv.metadata?.user_email === currentUser.email
          ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

          setConversations(userConversations);

          let activeConversation;
          if (userConversations.length > 0) {
            activeConversation = userConversations[0];
          } else {
            // הוספת מידע על לקוחות משויכים למטאדטה
            const conversationMetadata = {
              name: `ייעוץ עסקי - ${currentUser.full_name || currentUser.email}`,
              description: "שיחת ייעוץ עסקי עם Horizon Business Advisor",
              user_email: currentUser.email,
              user_name: currentUser.full_name || currentUser.email,
              user_role: currentUser.role || currentUser.user_type || 'user',
              is_admin: isAdmin,
              is_financial_manager: isFinancialManager,
              current_page: currentPageName || 'unknown',
              customer_in_focus: selectedCustomer?.email || currentUser.email,
              customer_name: selectedCustomer?.business_name || currentUser.business_name,
              page_context: pageContext || {},
              assigned_customers_count: assignedCustomers.length
            };

            activeConversation = await base44.agents.createConversation({
              agent_name: agentName,
              metadata: conversationMetadata
            });
            
            setConversations([activeConversation]);
          }

          setCurrentConversation(activeConversation);
          setMessages(activeConversation.messages || []);

          const unsubscribeFunc = base44.agents.subscribeToConversation(
            activeConversation.id,
            (data) => {
              setMessages(data.messages || []);
              // Check if AI is typing
              const lastMessage = data.messages?.[data.messages.length - 1];
              setIsTyping(lastMessage?.role === 'user');
            }
          );
          setUnsubscribe(() => unsubscribeFunc);

          setIsInitialized(true);
        } catch (error) {
          console.error("Error initializing chat:", error);
        } finally {
          setIsLoading(false);
        }
      };

      initializeChat();
    }
  }, [isOpen, currentUser, isInitialized, agentName, currentPageName, selectedCustomer, pageContext, isAdmin, isFinancialManager, assignedCustomers.length]);

  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      await base44.agents.addMessage(currentConversation, {
        role: "user",
        content: messageText
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const cycleSize = () => {
    const sizes = ['small', 'medium', 'large', 'xlarge', 'fullscreen'];
    const currentIndex = sizes.indexOf(chatSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setChatSize(sizes[nextIndex]);
  };

  const startNewConversation = async () => {
    try {
      setIsLoading(true);
      
      const conversationMetadata = {
        name: `ייעוץ חדש - ${new Date().toLocaleString('he-IL')}`,
        description: "שיחת ייעוץ עסקי חדשה",
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        user_role: currentUser.role || currentUser.user_type || 'user',
        current_page: currentPageName || 'unknown',
        customer_in_focus: selectedCustomer?.email || currentUser.email,
        customer_name: selectedCustomer?.business_name || currentUser.business_name,
        page_context: pageContext || {}
      };

      const newConversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: conversationMetadata
      });

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      setShowHistory(false);

      if (unsubscribe) {
        unsubscribe();
      }
      
      const unsubscribeFunc = base44.agents.subscribeToConversation(
        newConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      setUnsubscribe(() => unsubscribeFunc);

    } catch (error) {
      console.error("Error creating new conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchConversation = async (conversation) => {
    try {
      setIsLoading(true);
      
      if (unsubscribe) {
        unsubscribe();
      }

      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
      setShowHistory(false);

      const unsubscribeFunc = base44.agents.subscribeToConversation(
        conversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      setUnsubscribe(() => unsubscribeFunc);

    } catch (error) {
      console.error("Error switching conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // קטגוריות פעולות מהירות
  const quickActionCategories = [
    {
      id: 'daily',
      label: '📅 יומי',
      icon: Calendar,
      actions: [
        { label: "המשימות שלי להיום", prompt: "מה המשימות והיעדים שלי להיום? הצג לי רשימה מסודרת לפי עדיפות", icon: Target },
        { label: "סיכום יומי", prompt: isAdmin 
          ? "תן לי סיכום של הפעילות היומית בכל המערכת - לקוחות שטופלו, המלצות שפורסמו, ויעדים שהושלמו" 
          : "תן לי סיכום של הפעילות היומית שלי - לקוחות שטיפלתי בהם, המלצות שפרסמתי, ויעדים שהושלמו", icon: FileText },
        { label: "מה דחוף עכשיו?", prompt: isAdmin 
          ? "מה הפריטים הדחופים ביותר בכל המערכת שצריך לטפל בהם עכשיו?" 
          : "מה הפריטים הדחופים ביותר שצריך שאטפל בהם עכשיו?", icon: AlertCircle }
      ]
    },
    {
      id: 'tracking',
      label: '📊 מעקב',
      icon: TrendingUp,
      actions: [
        { label: "מה השתנה השבוע?", prompt: selectedCustomer 
          ? `מה השתנה אצל ${selectedCustomer.business_name || selectedCustomer.email} בשבוע האחרון? המלצות חדשות, יעדים שהושלמו, או שינויים משמעותיים` 
          : "מה השתנה אצל הלקוחות שלי בשבוע האחרון? סכם שינויים משמעותיים", icon: RefreshCw },
        { label: "דו\"ח שבועי", prompt: isAdmin 
          ? "צור לי סיכום שבועי על כל הלקוחות במערכת - התקדמות, הישגים, ונקודות לשיפור" 
          : "צור לי סיכום שבועי על הלקוחות שלי - התקדמות, הישגים, ונקודות לשיפור", icon: BarChart3 },
        { label: "השוואת לקוחות", prompt: "השווה בין הלקוחות שלי לפי רווחיות, התקדמות ביעדים, ויישום המלצות", icon: Users }
      ]
    },
    {
      id: 'search',
      label: '🔍 חיפוש',
      icon: Search,
      actions: [
        { label: "לקוחות עם רווחיות נמוכה", prompt: "מצא לי לקוחות עם רווחיות ממוצעת נמוכה מ-20% בקטלוג שלהם", icon: Filter },
        { label: "המלצות לא מיושמות", prompt: "מצא לי את כל ההמלצות שפורסמו לפני יותר מחודש ועדיין לא יושמו", icon: Clock },
        { label: "יעדים באיחור", prompt: "מצא לי את כל היעדים שעברו את תאריך היעד ועדיין פתוחים", icon: AlertCircle },
        { label: "לקוחות ללא תחזית", prompt: "מי מהלקוחות שלי עדיין לא הזין תחזית עסקית?", icon: FileText }
      ]
    },
    {
      id: 'customer',
      label: '👤 לקוח',
      icon: UserIcon,
      actions: selectedCustomer ? [
        { label: "סיכום מקיף", prompt: `תן לי סיכום מקיף על ${selectedCustomer.business_name || selectedCustomer.email}: נתוני עסק, המלצות, תחזית, יעדים, ונתונים חסרים`, icon: Sparkles },
        { label: "נתונים חסרים", prompt: `בדוק מה חסר ללקוח ${selectedCustomer.business_name || selectedCustomer.email} - האם יש תחזית? קטלוג? המלצות? מה צריך להשלים?`, icon: AlertCircle },
        { label: "המלצה הבאה", prompt: `מה ההמלצה הכי חשובה לקדם עכשיו עבור ${selectedCustomer.business_name || selectedCustomer.email} ולמה?`, icon: Zap },
        { label: "בדיקת תחזית", prompt: `נתח את התחזית של ${selectedCustomer.business_name || selectedCustomer.email} - האם המספרים הגיוניים? איפה יש סיכונים?`, icon: TrendingUp }
      ] : [
        { label: "סיכום כל הלקוחות", prompt: isAdmin 
          ? "תן לי סיכום על כל הלקוחות במערכת - מי פעיל, מי צריך תשומת לב" 
          : "תן לי סיכום על הלקוחות שלי - מי פעיל, מי צריך תשומת לב", icon: Users },
        { label: "לקוחות שדורשים תשומת לב", prompt: isAdmin 
          ? "מי הלקוחות בכל המערכת שדורשים תשומת לב מיידית?" 
          : "מי מהלקוחות שלי דורש תשומת לב מיידית?", icon: AlertCircle }
      ]
    }
  ];

  const [activeQuickCategory, setActiveQuickCategory] = useState('daily');

  // Quick Actions - Dynamic based on page, context, and user role
  const getQuickActions = () => {
    const category = quickActionCategories.find(c => c.id === activeQuickCategory);
    return category?.actions || [];
  };

  const getSizeStyles = () => {
    const size = CHAT_SIZES[chatSize];
    if (chatSize === 'fullscreen') {
      return {
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: 0,
        zIndex: 9999
      };
    }
    return {
      width: size.width,
      height: isMinimized ? 60 : size.height,
    };
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-50"
        style={{ direction: 'ltr' }}
      >
        <Button
          onClick={toggleOpen}
          className="bg-gradient-to-br from-horizon-primary to-horizon-secondary hover:opacity-90 text-white rounded-full h-16 w-16 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group relative"
          title="פתח צ'אט עם יועץ עסקי AI (Ctrl+/)"
        >
          <MessageCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </Button>
      </div>
    );
  }

  const sizeStyles = getSizeStyles();

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${chatSize === 'fullscreen' ? '' : 'bottom-6 right-6'}`}
      style={{ 
        ...sizeStyles,
        direction: 'rtl'
      }}
    >
      <Card className={`w-full h-full bg-horizon-dark shadow-2xl border border-horizon flex flex-col ${chatSize === 'fullscreen' ? 'rounded-none' : 'rounded-2xl'}`}>
        {/* Header */}
        <CardHeader className={`pb-2 px-4 py-3 text-white flex-shrink-0 ${chatSize === 'fullscreen' ? 'rounded-none' : 'rounded-t-2xl'} ${isAdmin ? 'bg-gradient-to-l from-purple-600 to-purple-500' : 'bg-gradient-to-l from-horizon-primary to-horizon-primary/80'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">יועץ עסקי AI</CardTitle>
                  {isAdmin && <Badge className="bg-white/20 text-white text-xs py-0">אדמין</Badge>}
                </div>
                {selectedCustomer ? (
                  <p className="text-xs text-white/70 truncate max-w-[150px]">
                    {selectedCustomer.business_name || selectedCustomer.email}
                  </p>
                ) : (
                  <p className="text-xs text-white/70">
                    {isAdmin ? 'גישה לכל המערכת' : `${assignedCustomers.length} לקוחות`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* History */}
              <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/10"
                    title="היסטוריית שיחות"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-horizon-dark border-horizon">
                  <DropdownMenuItem 
                    onClick={startNewConversation}
                    className="text-horizon-primary hover:bg-horizon-card cursor-pointer"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    שיחה חדשה
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-horizon" />
                  <div className="max-h-60 overflow-y-auto">
                    {conversations.slice(0, 10).map((conv) => (
                      <DropdownMenuItem
                        key={conv.id}
                        onClick={() => switchConversation(conv)}
                        className={`text-horizon-text hover:bg-horizon-card cursor-pointer ${conv.id === currentConversation?.id ? 'bg-horizon-primary/20' : ''}`}
                      >
                        <MessageCircle className="w-4 h-4 ml-2 flex-shrink-0" />
                        <span className="truncate flex-1">{conv.metadata?.name || 'שיחה'}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Size toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleSize}
                className="h-8 w-8 text-white hover:bg-white/10"
                title="שנה גודל"
              >
                {chatSize === 'fullscreen' ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
              </Button>
              
              {/* Minimize */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMinimize}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              
              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleOpen}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex-1 overflow-hidden flex flex-col p-0 bg-horizon-dark">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {isLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-horizon-accent">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-horizon-primary to-horizon-secondary flex items-center justify-center">
                      <Bot className="w-8 h-8 text-white animate-pulse" />
                    </div>
                    <p className="text-lg font-medium text-horizon-text">מתחבר ליועץ עסקי...</p>
                    <p className="text-sm text-horizon-accent mt-1">רק רגע...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-horizon-accent px-4">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-horizon-primary to-horizon-secondary flex items-center justify-center shadow-xl">
                      <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-horizon-text mb-2">שלום! אני היועץ העסקי שלך</h3>
                    <p className="text-sm text-horizon-accent">
                      {isAdmin 
                        ? "יש לי גישה לכל הנתונים במערכת ואני יכול לעזור לך בניתוחים, סיכומים וייעוץ אסטרטגי על כל הלקוחות"
                        : `יש לי גישה לנתונים של ${assignedCustomers.length} לקוחות המשויכים אליך ואני יכול לעזור לך בניתוחים, סיכומים וייעוץ אסטרטגי`
                      }
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                      {selectedCustomer && (
                        <Badge className="bg-horizon-primary/20 text-horizon-text border-horizon">
                          לקוח במוקד: {selectedCustomer.business_name || selectedCustomer.email}
                        </Badge>
                      )}
                      <Badge className={`${isAdmin ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'} border-transparent`}>
                        {isAdmin ? '👑 אדמין - גישה לכל המערכת' : `📊 ${assignedCustomers.length} לקוחות`}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Quick Actions with Categories */}
                  <div className="w-full space-y-3">
                    {/* Category Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {quickActionCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveQuickCategory(category.id)}
                          className={`text-xs whitespace-nowrap px-3 py-1.5 h-auto rounded-full transition-all ${
                            activeQuickCategory === category.id 
                              ? 'bg-horizon-primary text-white' 
                              : 'bg-horizon-card border border-horizon text-horizon-accent hover:text-horizon-text hover:border-horizon-primary/50'
                          }`}
                        >
                          {category.label}
                        </Button>
                      ))}
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 gap-2">
                      {getQuickActions().map((action, idx) => {
                        const Icon = action.icon || Sparkles;
                        return (
                          <Button
                            key={idx}
                            variant="ghost"
                            className="w-full text-right justify-start text-sm border border-horizon hover:bg-horizon-card hover:border-horizon-primary/50 text-horizon-text px-3 py-2.5 h-auto transition-all"
                            onClick={() => {
                              setInputMessage(action.prompt);
                              setTimeout(() => sendMessage(), 100);
                            }}
                          >
                            <Icon className="w-4 h-4 ml-2 text-horizon-primary flex-shrink-0" />
                            <span>{action.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <MessageBubble 
                      key={index} 
                      message={message} 
                      isUser={message.role === 'user'} 
                    />
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-horizon-primary to-horizon-secondary flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-horizon-card border border-horizon rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-horizon-primary" />
                          <span className="text-sm text-horizon-accent">חושב...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-horizon flex-shrink-0 bg-horizon-dark/80 backdrop-blur-sm">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="הקלד שאלה או בקשה..."
                  disabled={isLoading}
                  className="flex-1 bg-horizon-card border-horizon text-horizon-text placeholder:text-horizon-accent resize-none min-h-[44px] max-h-32"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="bg-gradient-to-br from-horizon-primary to-horizon-secondary hover:opacity-90 text-white h-11 w-11 flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-horizon-accent text-center mt-2">
                Ctrl+/ לפתיחה/סגירה • Esc לסגירה
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}