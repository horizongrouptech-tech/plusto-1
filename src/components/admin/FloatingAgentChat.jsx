import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
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
  Paperclip,
  Image,
  Table,
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

import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUsers } from '../shared/UsersContext';
import { useAgentContext } from '../agent/AgentContextProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as agents from '@/api/agents';
import { UploadFile } from '@/api/integrations';
import { supabase } from '@/api/supabaseClient';

// תצוגת Tool Call
const ToolCallDisplay = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isWriteTool = (name) =>
    name?.includes('create') || name?.includes('update') || name?.includes('schedule') || name?.includes('associate');

  const getToolIcon = (name) => {
    if (name?.includes('search') || name?.includes('filter')) return Search;
    if (name?.includes('read') || name?.includes('list') || name?.includes('get_file')) return Database;
    if (name?.includes('analyze')) return Sparkles;
    if (name?.includes('create') || name?.includes('update') || name?.includes('schedule')) return FileText;
    if (name?.includes('associate')) return Upload;
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
      'Meeting.create': 'קביעת פגישה',
      'analyze_file': 'ניתוח קובץ',
      'associate_file_with_customer': 'שיוך קובץ ללקוח',
      'get_file_analysis': 'שליפת ניתוח קובץ',
      'web_search': 'חיפוש באינטרנט',
    };
    
    return translations[name] || name.split('.').reverse().join(' ');
  };
  
  // כתיבה = כתום, קריאה = כחול/טיל
  const writeMode = isWriteTool(toolCall?.name);
  const borderActive = writeMode ? 'border-amber-500/50' : 'border-horizon-primary/50';
  const borderHover = writeMode ? 'hover:border-amber-500/30' : 'hover:border-horizon-primary/30';

  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs w-full
          ${isExpanded ? `bg-horizon-card ${borderActive}` : `bg-horizon-card/50 border-horizon ${borderHover}`}`}
      >
        <ToolIcon className={`w-3 h-3 ${writeMode ? 'text-amber-400' : statusConfig.color}`} />
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

// Markdown components — מוגדרים מחוץ ל-render למניעת re-creation
const markdownComponents = {
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
};

// בועת הודעה משופרת — עם timestamp on hover + copy button
const MessageBubble = React.memo(({ message, isUser }) => {
  const [showActions, setShowActions] = useState(false);

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content || '');
    toast.success('הועתק ללוח');
  };

  // פורמט שעה
  const timeStr = message.created_date
    ? new Date(message.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-horizon-primary to-horizon-secondary flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="max-w-[80%] min-w-0 space-y-1">
        <div
          className={`rounded-2xl px-3 py-2.5 text-right relative group ${
            isUser
              ? 'bg-horizon-primary text-white rounded-tr-sm shadow-lg'
              : 'bg-horizon-card text-horizon-text border border-horizon rounded-tl-sm shadow-md'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed font-medium break-words overflow-wrap-anywhere" dir="rtl">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none text-right text-horizon-text [&_p]:text-horizon-text [&_li]:text-horizon-text break-words overflow-wrap-anywhere" dir="rtl">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy + timestamp — מוצגים ב-hover */}
          {showActions && (
            <div className={`absolute -bottom-5 flex items-center gap-2 text-[10px] text-horizon-accent ${isUser ? 'left-0' : 'right-0'}`}>
              {timeStr && <span>{timeStr}</span>}
              {!isUser && message.content && (
                <button onClick={copyMessage} className="hover:text-horizon-primary transition-colors" title="העתק">
                  <Download className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* File Attachments — קבצים מצורפים להודעה */}
        {message.file_attachments?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {message.file_attachments.map((file, idx) => {
              const Icon = file.file_type?.includes('pdf') ? FileText
                : (file.file_type?.includes('sheet') || file.file_type?.includes('csv')) ? Table
                : file.file_type?.includes('image') ? Image : FileText;
              return (
                <a
                  key={idx}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                    ${isUser
                      ? 'bg-white/20 hover:bg-white/30 text-white'
                      : 'bg-horizon-dark/50 hover:bg-horizon-dark/70 text-horizon-text border border-horizon'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{file.filename}</span>
                </a>
              );
            })}
          </div>
        )}

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
        <div className="w-6 h-6 rounded-full bg-horizon-primary flex items-center justify-center flex-shrink-0 mt-1">
          <UserIcon className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
});

// גדלי חלון
const CHAT_SIZES = {
  small: { width: 380, height: 500 },
  medium: { width: 450, height: 600 },
  large: { width: 550, height: 700 },
  xlarge: { width: 700, height: 800 },
  fullscreen: { width: '100vw', height: '100vh' }
};

export default function FloatingAgentChat({
  currentUser: currentUserProp,
  agentName = "customer_business_advisor_agent",
  currentPageName: currentPageNameProp,
  selectedCustomer: selectedCustomerProp,
  pageContext: pageContextProp,
  title = "יועץ עסקי AI"
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
  const [attachedFiles, setAttachedFiles] = useState([]); // קבצים שהמשתמש בחר לצרף
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // שימוש ב-Context — אם לא הועבר currentUser כ-prop, נשתמש ב-context
  const { allUsers: assignedCustomers = [], isAdmin, isFinancialManager, currentUser: contextUser } = useUsers();
  const currentUser = currentUserProp || contextUser;

  // AgentContext — מודעות לעמוד הנוכחי ולקוח נבחר (props מקבלים עדיפות)
  const agentCtx = useAgentContext();
  const currentPageName = currentPageNameProp || agentCtx.currentPageName;
  const selectedCustomer = selectedCustomerProp || agentCtx.selectedCustomer;
  const pageContext = pageContextProp || agentCtx.pageContext;

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
          
          const existingConversations = await agents.listConversations({
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
              assigned_customers_count: assignedCustomers.length,
              entity_instructions: "כשאתה יוצר יעד (goal) ב-CustomerGoal.create, חובה לשלוח task_type: 'goal'. כשאתה יוצר משימה (task) שמשויכת ליעד, שלח task_type: 'one_time' ו-parent_id של היעד. אל תיצור יעד בלי task_type: 'goal'."
            };

            activeConversation = await agents.createConversation({
              agent_name: agentName,
              metadata: conversationMetadata
            });
            
            setConversations([activeConversation]);
          }

          setCurrentConversation(activeConversation);
          setMessages(activeConversation.messages || []);

          const unsubscribeFunc = agents.subscribeToConversation(
            activeConversation.id,
            (data) => {
              setMessages(data.messages || []);
              // כשמגיעה תשובה מה-assistant — סמן שהוא סיים "לחשוב"
              const lastMessage = data.messages?.[data.messages.length - 1];
              if (lastMessage?.role === 'assistant') {
                setIsTyping(false);
              }
            }
          );
          setUnsubscribe(() => unsubscribeFunc);

          setIsInitialized(true);
        } catch (error) {
          console.error("[FloatingAgentChat] init error:", error);
          toast.error('שגיאה בטעינת הצ\'אט — נסה לרענן את העמוד');
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

  const sendMessage = async (overrideText) => {
    const textToSend = overrideText || inputMessage.trim();
    if ((!textToSend && attachedFiles.length === 0) || !currentConversation || isLoading) return;

    const messageText = textToSend;
    const filesToUpload = [...attachedFiles];
    setInputMessage('');
    setAttachedFiles([]);
    setIsLoading(true);
    setIsTyping(true);

    // הוספת ההודעה של המשתמש לרשימה מיד (optimistic update)
    const optimisticUserMsg = {
      role: 'user',
      content: messageText || 'קובץ מצורף',
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      // העלאת קבצים מצורפים אם יש
      let fileAttachments = [];
      if (filesToUpload.length > 0) {
        try {
          fileAttachments = await uploadAttachedFiles();
        } catch (uploadErr) {
          console.error("[FloatingAgentChat] upload error:", uploadErr);
          toast.error('שגיאה בהעלאת הקובץ — נסה שוב');
          setInputMessage(messageText);
          setAttachedFiles(filesToUpload);
          setIsLoading(false);
          setIsTyping(false);
          return;
        }
      }

      const result = await agents.addMessage(currentConversation, {
        role: "user",
        content: messageText || 'קובץ מצורף',
        file_attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
      });

      // ה-API מחזיר את הודעת ה-assistant — נוסיף ישירות
      if (result?.message) {
        setIsTyping(false);
        setMessages(prev => {
          // אם Realtime כבר הוסיף את ההודעה — לא נוסיף שוב
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg?.content === result.message.content) return prev;
          return [...prev, result.message];
        });

        // רענון אוטומטי של נתונים ב-UI אחרי פעולות כתיבה בצ'אטבוט
        if (result.message.tool_calls?.length) {
          const writeTools = ['create_goal', 'update_goal', 'update_goal_status',
            'create_goal_from_template', 'add_subtasks_to_goal',
            'create_recommendation', 'log_action', 'schedule_meeting'];
          const hasWriteOp = result.message.tool_calls.some(tc => writeTools.includes(tc.name));
          if (hasWriteOp) {
            queryClient.invalidateQueries({ queryKey: ['customerGoals'] });
            queryClient.invalidateQueries({ queryKey: ['allRelevantTasks'] });
            queryClient.invalidateQueries({ queryKey: ['customerRecommendations'] });
          }
        }
      } else {
        // API הצליח אבל לא החזיר message — מצב לא צפוי
        setIsTyping(false);
      }
    } catch (error) {
      console.error("[FloatingAgentChat] send error:", error);
      // לא מחזירים את ההודעה ל-input — ההודעה כבר נשמרה ב-DB
      setIsTyping(false);
      const isTimeout = error.message?.includes('timeout') || error.message?.includes('aborted');
      toast.error(
        isTimeout
          ? 'הבקשה לקחה יותר מדי זמן — נסה שוב עם שאלה קצרה יותר'
          : 'שגיאה בשליחת ההודעה — נסה שוב',
        { action: { label: 'נסה שוב', onClick: () => sendMessage() } }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- File upload helpers ---
  const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 3;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    // ולידציה — סוג קובץ + גודל + מספר מקסימלי
    const validFiles = files.filter(f => {
      if (!ALLOWED_FILE_TYPES.includes(f.type) && !f.name.endsWith('.csv')) {
        toast.error(`סוג קובץ לא נתמך: ${f.name}`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`הקובץ ${f.name} גדול מ-10MB`);
        return false;
      }
      return true;
    });
    setAttachedFiles(prev => {
      const combined = [...prev, ...validFiles].slice(0, MAX_FILES);
      if (prev.length + validFiles.length > MAX_FILES) {
        toast.error(`ניתן לצרף עד ${MAX_FILES} קבצים`);
      }
      return combined;
    });
    // reset input כדי שאפשר לבחור אותו קובץ שוב
    e.target.value = '';
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /** העלאת קבצים ל-Storage + יצירת רשומות file_upload */
  const uploadAttachedFiles = async () => {
    const results = [];
    for (const file of attachedFiles) {
      // העלאה ל-Supabase Storage
      const { file_url } = await UploadFile({ file });
      // יצירת רשומת file_upload ב-DB
      const { data: record, error } = await supabase
        .from('file_upload')
        .insert({
          file_url,
          filename: file.name,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: currentUser?.email,
          status: 'uploaded',
        })
        .select()
        .single();
      if (error) throw error;
      results.push({
        file_id: record.id,
        file_url,
        filename: file.name,
        file_type: file.type,
      });
    }
    return results;
  };

  // אייקון לפי סוג קובץ
  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return FileText;
    if (fileType?.includes('sheet') || fileType?.includes('csv')) return Table;
    if (fileType?.includes('image')) return Image;
    return FileText;
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
      // מובייל — פתיחה אוטומטית במסך מלא
      if (window.innerWidth < 640) {
        setChatSize('fullscreen');
      }
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
        page_context: pageContext || {},
        entity_instructions: "כשאתה יוצר יעד (goal) ב-CustomerGoal.create, חובה לשלוח task_type: 'goal'. כשאתה יוצר משימה (task) שמשויכת ליעד, שלח task_type: 'one_time' ו-parent_id של היעד. אל תיצור יעד בלי task_type: 'goal'."
      };

      const newConversation = await agents.createConversation({
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
      
      const unsubscribeFunc = agents.subscribeToConversation(
        newConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      setUnsubscribe(() => unsubscribeFunc);

    } catch (error) {
      console.error("[FloatingAgentChat] new conversation error:", error);
      toast.error('שגיאה ביצירת שיחה חדשה');
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

      const unsubscribeFunc = agents.subscribeToConversation(
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

  // מיקום הכפתור — bottom-right (סטנדרטי לצ'אט floating, מונע התנגשות עם toasts ב-bottom-left)
  // דסקטופ: bottom-6 right-6 | מובייל: bottom-20 right-4 (מעל bottom nav 64px)
  if (!isOpen) {
    return (
      <div
        className="fixed z-[60] lg:bottom-6 lg:right-6 bottom-20 right-4"
        style={{ direction: 'ltr' }}
      >
        <Button
          onClick={toggleOpen}
          className="bg-gradient-to-br from-horizon-primary to-horizon-secondary hover:opacity-90 text-white rounded-full h-14 w-14 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group relative"
          title={`פתח צ'אט עם ${title} (Ctrl+/)`}
          aria-label={`פתח צ'אט עם ${title}`}
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const sizeStyles = getSizeStyles();

  return (
    <div
      className={`fixed z-[60] transition-all duration-300 ${chatSize === 'fullscreen' ? '' : 'lg:bottom-6 lg:right-6 bottom-20 right-4'}`}
      style={{
        ...sizeStyles,
        direction: 'rtl'
      }}
    >
      <Card className={`w-full h-full bg-horizon-dark shadow-2xl border border-horizon flex flex-col ${chatSize === 'fullscreen' ? 'rounded-none' : 'rounded-2xl'}`}>
        {/* Header */}
        <CardHeader className={`pb-2 px-4 py-3 flex-shrink-0 backdrop-blur-md ${chatSize === 'fullscreen' ? 'rounded-none' : 'rounded-t-2xl'} bg-horizon-primary text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">{title}</CardTitle>
                  {isAdmin && <Badge className="bg-white/20 text-white text-xs py-0">אדמין</Badge>}
                </div>
                {selectedCustomer ? (
                  <p className="text-xs text-white/80 truncate max-w-[220px]">
                    {selectedCustomer.business_name || selectedCustomer.email}
                  </p>
                ) : (
                  <p className="text-xs text-white/80">
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
                aria-label={isMinimized ? 'הרחב צ\'אט' : 'מזער צ\'אט'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleOpen}
                className="h-8 w-8 text-white hover:bg-white/10"
                aria-label="סגור צ'אט"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex-1 overflow-hidden flex flex-col p-0 bg-horizon-surface">
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
                            onClick={() => sendMessage(action.prompt)}
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
                <div className="space-y-4 w-full overflow-hidden" role="log" aria-live="polite" aria-label="הודעות צ'אט">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={`${message.created_date || index}-${message.role}`}
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
            <div className="p-4 border-t border-horizon flex-shrink-0 bg-horizon-card backdrop-blur-sm">
              {/* קבצים מצורפים — chips מעל שדה הקלט */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attachedFiles.map((file, idx) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div key={idx} className="flex items-center gap-1.5 bg-horizon-card border border-horizon rounded-lg px-2.5 py-1 text-xs text-horizon-text">
                        <Icon className="w-3.5 h-3.5 text-horizon-primary flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button
                          onClick={() => removeAttachedFile(idx)}
                          className="text-horizon-accent hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                {/* כפתור צירוף קובץ */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="text-horizon-accent hover:text-horizon-primary hover:bg-horizon-card h-11 w-11 flex-shrink-0"
                  title="צרף קובץ (PDF, Excel, CSV, תמונה)"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={attachedFiles.length > 0 ? "הוסף הוראה לקובץ..." : "הקלד שאלה או בקשה..."}
                  disabled={isLoading}
                  className="flex-1 bg-horizon-card border-horizon text-horizon-text placeholder:text-horizon-accent resize-none min-h-[44px] max-h-32"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isLoading}
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