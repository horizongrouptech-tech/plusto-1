import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  X,
  Plus
} from "lucide-react";
import { ManagerConversation } from "@/entities/ManagerConversation";
import { ManagerMessage } from "@/entities/ManagerMessage";
import { User } from "@/entities/User";
import { toast } from "sonner";
import { Notification } from "@/entities/Notification"; // Added import for Notification

export default function ManagerChatSystem({ 
  currentManagerEmail, 
  isFloating = false,
  initialThreadId = null,
  onClose
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [managers, setManagers] = useState([]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const userConversations = await ManagerConversation.filter({
        $or: [
          { participant_1_email: currentManagerEmail },
          { participant_2_email: currentManagerEmail }
        ]
      }, '-last_message_at');
      
      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentManagerEmail]);

  const loadManagers = useCallback(async () => {
    try {
      const allManagers = await User.filter({ user_type: 'financial_manager' });
      setManagers(allManagers.filter(m => m.email !== currentManagerEmail));
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }, [currentManagerEmail]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const conversationMessages = await ManagerMessage.filter(
        { conversation_id: conversationId },
        'created_date'
      );
      setMessages(conversationMessages);
      
      // ✅ גלילה לסוף ההודעות אחרי טעינה
      setTimeout(() => {
        const messagesContainer = document.querySelector('[data-messages-scroll]');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
      
      // סמן הודעות כנקראו
      const unreadMessages = conversationMessages.filter(
        msg => !msg.is_read && msg.sender_email !== currentManagerEmail
      );
      
      await Promise.all(
        unreadMessages.map(msg => 
          ManagerMessage.update(msg.id, { 
            is_read: true, 
            read_at: new Date().toISOString() 
          })
        )
      );
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentManagerEmail]);

  // טען שיחות בהתחלה
  useEffect(() => {
    if (currentManagerEmail) {
      loadConversations();
      loadManagers();
    }
  }, [currentManagerEmail, loadConversations, loadManagers]);

  // טיפול ב-initialThreadId - פתח שיחה ספציפית (תיקון)
  useEffect(() => {
    if (initialThreadId && conversations.length > 0) {
      console.log('Attempting to open conversation for initialThreadId:', initialThreadId);
      console.log('Available conversations:', conversations.map(c => ({ id: c.id, conversation_id: c.conversation_id })));
      
      const targetConversation = conversations.find(
        conv => {
          // נבדוק מספר אפשרויות להתאמה
          const matchById = conv.id === initialThreadId;
          const matchByConversationId = conv.conversation_id === initialThreadId;
          const matchByStringId = String(conv.id) === String(initialThreadId);
          const matchByStringConversationId = String(conv.conversation_id) === String(initialThreadId);
          
          return matchById || matchByConversationId || matchByStringId || matchByStringConversationId;
        }
      );
      
      if (targetConversation) {
        console.log('Found target conversation:', targetConversation);
        setSelectedConversation(targetConversation);
        setIsOpen(true);
        loadMessages(targetConversation.id || targetConversation.conversation_id);
      } else {
        console.log('No matching conversation found for initialThreadId:', initialThreadId);
        // אם לא נמצאה שיחה, עדיין פתח את הצ'אט כדי שהמשתמש יוכל לראות את רשימת השיחות
        setIsOpen(true);
      }
    }
  }, [initialThreadId, conversations, loadMessages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      const newMessage = await ManagerMessage.create({
        conversation_id: selectedConversation.id || selectedConversation.conversation_id,
        sender_email: currentManagerEmail,
        message_content: messageText.trim(),
        message_type: 'text'
      });

      // עדכן את השיחה
      await ManagerConversation.update(selectedConversation.id || selectedConversation.conversation_id, {
        last_message_at: new Date().toISOString(),
        last_message_by: currentManagerEmail
      });

      // ✅ עדכון אופטימיסטי - הוסף הודעה לUI מיד
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      
      // ✅ גלילה אוטומטית לסוף ההודעות
      setTimeout(() => {
        const messagesContainer = document.querySelector('[data-messages-scroll]');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 50);

      // יצירת התראה למנהל השני - ברקע
      setTimeout(async () => {
        try {
          const otherParticipantEmail = getOtherParticipant(selectedConversation);
          if (otherParticipantEmail && otherParticipantEmail !== currentManagerEmail) {
            await Notification.create({
              recipient_email: otherParticipantEmail,
              sender_email: currentManagerEmail,
              type: 'new_message',
              title: 'הודעה חדשה במערכת הצ\'אט',
              message: `קיבלת הודעה חדשה מ-${currentManagerEmail}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`,
              related_entity_id: selectedConversation.id || selectedConversation.conversation_id,
              related_entity_type: 'chat_thread',
              priority: 'medium'
            });
          }
        } catch (notificationError) {
          console.error('Failed to create notification for new message:', notificationError);
        }
      }, 0);
      
      // רענן רשימת שיחות ברקע
      setTimeout(loadConversations, 500);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת ההודעה');
    }
  };

  const startNewConversation = async (targetManagerEmail) => {
    try {
      // בדוק אם כבר קיימת שיחה
      const existingConversation = conversations.find(conv =>
        (conv.participant_1_email === targetManagerEmail && conv.participant_2_email === currentManagerEmail) ||
        (conv.participant_2_email === targetManagerEmail && conv.participant_1_email === currentManagerEmail)
      );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        loadMessages(existingConversation.id || existingConversation.conversation_id);
        return;
      }

      const targetManager = managers.find(m => m.email === targetManagerEmail);
      const newConversation = await ManagerConversation.create({
        participant_1_email: currentManagerEmail,
        participant_2_email: targetManagerEmail,
        conversation_title: `שיחה עם ${targetManager?.full_name || targetManagerEmail}`,
        conversation_type: 'general_discussion'
      });

      setSelectedConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
      setMessages([]);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participant_1_email === currentManagerEmail 
      ? conversation.participant_2_email 
      : conversation.participant_1_email;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.conversation_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getOtherParticipant(conv).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ChatButton = () => (
    <Button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-20 w-14 h-14 rounded-full bg-horizon-secondary hover:bg-horizon-secondary/90 shadow-lg z-50"
    >
      <MessageSquare className="w-6 h-6 text-white" />
      {conversations.some(conv => 
        (conv.participant_1_email === currentManagerEmail ? conv.unread_count_p1 : conv.unread_count_p2) > 0
      ) && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">●</Badge>
      )}
    </Button>
  );

  if (isFloating && !isOpen) {
    return <ChatButton />;
  }

  return (
    <>
      {isFloating && <ChatButton />}
      
      {(isOpen || !isFloating) && (
        <div className={`${isFloating ? 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center' : ''}`}>
          <Card className={`${isFloating ? 'w-full max-w-4xl h-[600px] mx-4' : 'w-full h-[500px]'} bg-horizon-dark border-horizon flex`} dir="rtl">
            {/* רשימת שיחות */}
            <div className="w-1/3 border-l border-horizon">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-horizon-text text-sm">שיחות מנהלים</CardTitle>
                  {isFloating && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        onClose?.();
                      }}
                      className="text-horizon-accent hover:text-horizon-text"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="חפש שיחות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-horizon-card border-horizon text-horizon-text text-sm"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {/* רשימת מנהלים לשיחה חדשה */}
                  {!searchTerm && (
                    <div className="p-3 border-b border-horizon/30">
                      <p className="text-xs text-horizon-accent mb-2">התחל שיחה חדשה:</p>
                      <div className="space-y-1">
                        {managers.slice(0, 3).map(manager => (
                          <Button
                            key={manager.email}
                            variant="ghost"
                            size="sm"
                            onClick={() => startNewConversation(manager.email)}
                            className="w-full justify-start text-xs text-horizon-accent hover:text-horizon-text hover:bg-horizon-card/50"
                          >
                            <Plus className="w-3 h-3 ml-2" />
                            {manager.full_name || manager.email}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* שיחות קיימות */}
                  <div className="space-y-1 p-2">
                    {filteredConversations.map(conversation => {
                      const isSelected = selectedConversation?.id === conversation.id || selectedConversation?.conversation_id === conversation.conversation_id;
                      const unreadCount = conversation.participant_1_email === currentManagerEmail 
                        ? conversation.unread_count_p1 
                        : conversation.unread_count_p2;

                      return (
                        <div
                          key={conversation.id || conversation.conversation_id}
                          onClick={() => {
                            setSelectedConversation(conversation);
                            loadMessages(conversation.id || conversation.conversation_id);
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-horizon-primary/20 border border-horizon-primary/30' 
                              : 'hover:bg-horizon-card/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-horizon-text truncate">
                              {conversation.conversation_title}
                            </h4>
                            {unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-xs ml-2">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-horizon-accent mt-1">
                            {getOtherParticipant(conversation)}
                          </p>
                          {conversation.last_message_at && (
                            <p className="text-xs text-horizon-accent/70 mt-1">
                              {new Date(conversation.last_message_at).toLocaleDateString('he-IL')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </div>

            {/* אזור הודעות */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* כותרת השיחה */}
                  <div className="p-4 border-b border-horizon">
                    <h3 className="text-horizon-text font-medium">
                      {selectedConversation.conversation_title}
                    </h3>
                    <p className="text-xs text-horizon-accent">
                      {getOtherParticipant(selectedConversation)}
                    </p>
                  </div>

                  {/* הודעות */}
                  <ScrollArea className="flex-1 p-4" data-messages-scroll>
                    <div className="space-y-3">
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_email === currentManagerEmail ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender_email === currentManagerEmail
                              ? 'bg-horizon-primary text-white'
                              : 'bg-horizon-card text-horizon-text'
                          }`}>
                            <p className="text-sm">{message.message_content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender_email === currentManagerEmail
                                ? 'text-white/70'
                                : 'text-horizon-accent'
                            }`}>
                              {new Date(message.created_date).toLocaleTimeString('he-IL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* שליחת הודעה */}
                  <div className="p-4 border-t border-horizon">
                    <div className="flex gap-2">
                      <Input
                        placeholder="כתוב הודעה..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="flex-1 bg-horizon-card border-horizon text-horizon-text"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!messageText.trim()}
                        className="bg-horizon-primary hover:bg-horizon-primary/90"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                    <h3 className="text-lg font-medium text-horizon-text mb-2">
                      בחר שיחה
                    </h3>
                    <p className="text-horizon-accent">
                      בחר שיחה קיימת או התחל שיחה חדשה עם מנהל אחר
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}