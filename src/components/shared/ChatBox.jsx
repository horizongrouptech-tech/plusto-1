import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users, Clock, Loader2 } from "lucide-react";
import { CommunicationThread } from "@/entities/CommunicationThread";
import { ChatMessage } from "@/entities/ChatMessage";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";

export default function ChatBox({ 
  relatedEntityId, 
  relatedEntityType, 
  currentUser, 
  isOpen = false, 
  onToggle,
  title = "דיון צוות"
}) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [financialManagers, setFinancialManagers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadChatData();
      loadFinancialManagers();
    }
  }, [isOpen, relatedEntityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadFinancialManagers = async () => {
    try {
      const managers = await User.filter({ 
        $or: [
          { user_type: 'financial_manager' },
          { role: 'admin' }
        ]
      });
      setFinancialManagers(managers);
    } catch (error) {
      console.error("Error loading financial managers:", error);
    }
  };

  const loadChatData = async () => {
    setIsLoading(true);
    try {
      // חיפוש thread קיים
      const existingThreads = await CommunicationThread.filter({
        related_entity_id: relatedEntityId,
        related_entity_type: relatedEntityType,
        is_active: true
      });

      let currentThread = existingThreads[0];

      if (!currentThread) {
        // יצירת thread חדש
        currentThread = await CommunicationThread.create({
          related_entity_id: relatedEntityId,
          related_entity_type: relatedEntityType,
          initiator_email: currentUser.email,
          participants_emails: [currentUser.email],
          title: title,
          last_message_timestamp: new Date().toISOString()
        });
      }

      setThread(currentThread);

      // טעינת הודעות
      const threadMessages = await ChatMessage.filter(
        { thread_id: currentThread.id },
        'created_date'
      );

      setMessages(threadMessages);

      // סימון הודעות כנקראו
      await markMessagesAsRead(currentThread.id);

    } catch (error) {
      console.error("Error loading chat data:", error);
    }
    setIsLoading(false);
  };

  const markMessagesAsRead = async (threadId) => {
    try {
      const unreadMessages = messages.filter(msg => 
        msg.sender_email !== currentUser.email && 
        !msg.is_read_by.includes(currentUser.email)
      );

      for (const msg of unreadMessages) {
        await ChatMessage.update(msg.id, {
          is_read_by: [...msg.is_read_by, currentUser.email]
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const detectMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const mentionedUser = financialManagers.find(manager => 
        manager.full_name?.toLowerCase().includes(mentionedName) ||
        manager.email.toLowerCase().includes(mentionedName)
      );

      if (mentionedUser) {
        mentions.push(mentionedUser.email);
      }
    }

    return [...new Set(mentions)]; // הסרת כפילויות
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // זיהוי תחילת mention
    const cursorPosition = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
      setShowMentions(true);
      setMentionStart(lastAtIndex);
      setMentionSuggestions(financialManagers);
    } else if (lastAtIndex !== -1 && cursorPosition > lastAtIndex) {
      const searchTerm = beforeCursor.slice(lastAtIndex + 1).toLowerCase();
      if (searchTerm.includes(' ')) {
        setShowMentions(false);
      } else {
        const filtered = financialManagers.filter(manager =>
          manager.full_name?.toLowerCase().includes(searchTerm) ||
          manager.email.toLowerCase().includes(searchTerm)
        );
        setMentionSuggestions(filtered);
        setShowMentions(filtered.length > 0);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (manager) => {
    if (mentionStart === -1) return;

    const beforeMention = newMessage.slice(0, mentionStart);
    const afterMention = newMessage.slice(inputRef.current.selectionStart);
    const mentionText = `@${manager.full_name || manager.email.split('@')[0]}`;
    
    setNewMessage(beforeMention + mentionText + ' ' + afterMention);
    setShowMentions(false);
    inputRef.current.focus();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !thread || isSending) return;

    setIsSending(true);
    try {
      // זיהוי תיוגים
      const mentions = detectMentions(newMessage);

      // שליחת ההודעה
      const message = await ChatMessage.create({
        thread_id: thread.id,
        sender_email: currentUser.email,
        message_text: newMessage.trim(),
        mentions: mentions,
        is_read_by: [currentUser.email]
      });

      // עדכון ה-thread
      const updatedParticipants = [...new Set([...thread.participants_emails, ...mentions])];
      await CommunicationThread.update(thread.id, {
        participants_emails: updatedParticipants,
        last_message_timestamp: new Date().toISOString()
      });

      // שליחת התראות למתויגים
      for (const mentionedEmail of mentions) {
        if (mentionedEmail !== currentUser.email) {
          await Notification.create({
            recipient_email: mentionedEmail,
            sender_email: currentUser.email,
            type: 'mention',
            title: `תויגת בדיון: ${title}`,
            message: `${currentUser.full_name || currentUser.email} תייג אותך בדיון: "${newMessage.slice(0, 100)}..."`,
            link: `#thread-${thread.id}`,
            related_entity_id: relatedEntityId,
            related_entity_type: relatedEntityType
          });
        }
      }

      // עדכון ה-state המקומי
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setShowMentions(false);

    } catch (error) {
      console.error("Error sending message:", error);
      alert('שגיאה בשליחת ההודעה');
    }
    setIsSending(false);
  };

  const formatMessageText = (text) => {
    // המרת תיוגים לקישורים
    const mentionRegex = /@(\w+)/g;
    return text.replace(mentionRegex, (match, name) => {
      const mentionedUser = financialManagers.find(manager => 
        manager.full_name?.toLowerCase().includes(name.toLowerCase()) ||
        manager.email.toLowerCase().includes(name.toLowerCase())
      );
      
      if (mentionedUser) {
        return `<span class="mention-tag">@${mentionedUser.full_name || name}</span>`;
      }
      return match;
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="border-horizon-accent text-horizon-accent hover:bg-horizon-accent/10"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        דיון צוות
      </Button>
    );
  }

  return (
    <Card className="card-horizon w-full max-w-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-horizon-text flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-horizon-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-horizon-accent text-horizon-accent">
              <Users className="w-3 h-3 mr-1" />
              {thread?.participants_emails.length || 0}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-horizon-accent" />
                <span className="text-sm text-horizon-accent mr-2">טוען הודעות...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-4 text-sm text-horizon-accent">
                אין הודעות עדיין. התחל דיון!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_email === currentUser.email ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      message.sender_email === currentUser.email
                        ? 'bg-horizon-primary text-white'
                        : 'bg-horizon-card text-horizon-text'
                    }`}
                  >
                    {message.sender_email !== currentUser.email && (
                      <div className="text-xs text-horizon-accent mb-1">
                        {message.sender_email.split('@')[0]}
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: formatMessageText(message.message_text) 
                      }}
                      className="message-content"
                    />
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      message.sender_email === currentUser.email ? 'text-white/70' : 'text-horizon-accent'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatTime(message.created_date)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* רשימת הצעות תיוג */}
        {showMentions && (
          <div className="border border-horizon rounded-md bg-horizon-card max-h-32 overflow-y-auto">
            {mentionSuggestions.map((manager) => (
              <div
                key={manager.email}
                className="p-2 hover:bg-horizon-primary/20 cursor-pointer text-sm"
                onClick={() => handleMentionSelect(manager)}
              >
                <div className="font-medium text-horizon-text">
                  {manager.full_name || manager.email.split('@')[0]}
                </div>
                <div className="text-xs text-horizon-accent">{manager.email}</div>
              </div>
            ))}
          </div>
        )}

        {/* שדה קלט */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="כתוב הודעה... (השתמש ב-@ לתיוג)"
            className="flex-1 bg-horizon-card border-horizon text-horizon-text"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="btn-horizon-primary"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="text-xs text-horizon-accent">
          השתמש ב-@ כדי לתייג מנהלי כספים אחרים
        </div>
      </CardContent>
    </Card>
  );
}