import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, CheckCircle, X, Sparkles, Target, MessageSquare } from "lucide-react";

import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { Recommendation } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
export default function AIChatAssistant({ customer, currentUser, onRecommendationApproved }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [approvedRecommendations, setApprovedRecommendations] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingRecommendation, setPendingRecommendation] = useState(null);
  const scrollAreaRef = useRef(null);
  const queryClient = useQueryClient();

  // הודעת ברוכים הבאים
  useEffect(() => {
    if (customer && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `שלום! אני העוזר AI שלך עבור ${customer.business_name || customer.email}.\n\nאני יכול לעזור לך עם:\n• שאלות על הלקוח והעסק\n• יצירת המלצות מותאמות אישית\n• ניתוח נתונים עסקיים\n• ייעוץ אסטרטגי\n\nאיך אוכל לעזור לך היום?`,
        timestamp: new Date()
      }]);
    }
  }, [customer, messages.length]);

  // גלילה אוטומטית להודעה האחרונה
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // בניית פרומפט עם הקשר של הלקוח
      const customerContext = `
        לקוח: ${customer.business_name || customer.email}
        סוג עסק: ${customer.business_type || 'לא צוין'}
        ${customer.monthly_revenue ? `מחזור חודשי: ₪${customer.monthly_revenue}` : ''}
      `;

      const prompt = `
        אתה עוזר AI מותאם אישית עבור לקוח זה:
        ${customerContext}
        
        שאלת המשתמש: ${userMessage.content}
        
        ענה על השאלה בצורה מקצועית וממוקדת. אם השאלה קשורה להמלצות עסקיות, צור המלצה מפורטת עם:
        - כותרת
        - תיאור
        - צעדי ביצוע
        - רווח צפוי (אם רלוונטי)
      `;

      // קריאה ל-AI
      const response = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string", description: "תשובה טקסטואלית לשאלה" },
            is_recommendation: { type: "boolean", description: "האם התשובה כוללת המלצה" },
            recommendation: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                steps: { type: "array", items: { type: "string" } },
                expected_profit: { type: "number" }
              }
            }
          }
        }
      });

      // בניית הודעת עוזר
      let assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message || 'מצטער, לא הצלחתי לעבד את השאלה שלך.',
        timestamp: new Date()
      };

      // אם יש המלצה מובנית, נשמור אותה
      if (response.is_recommendation && response.recommendation) {
        assistantMessage.recommendation = response.recommendation;
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה. נסה שוב מאוחר יותר.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRecommendation = (recommendation) => {
    setPendingRecommendation(recommendation);
    setShowApprovalModal(true);
  };

  const handleSaveApprovedRecommendation = async () => {
    if (!pendingRecommendation) return;

    try {
      // שמירת המלצה מאושרת
      const approvedRec = {
        ...pendingRecommendation,
        approved_at: new Date().toISOString(),
        approved_by: currentUser?.email,
        customer_email: customer.email,
        status: 'approved',
        source: 'ai_chat'
      };

      // שמירה ב-Recommendation entity או ב-Recommendations Bank
      await Recommendation.create(approvedRec);

      setApprovedRecommendations(prev => [...prev, approvedRec]);
      setShowApprovalModal(false);
      setPendingRecommendation(null);

      if (onRecommendationApproved) {
        onRecommendationApproved(approvedRec);
      }

      queryClient.invalidateQueries({ queryKey: ['customerRecommendations', customer.email] });
    } catch (error) {
      console.error('Error saving approved recommendation:', error);
      toast.error('שגיאה בשמירת ההמלצה');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Recommendations Bank */}
      {approvedRecommendations.length > 0 && (
        <Card className="card-horizon border-2 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              בנק המלצות מאושרות ({approvedRecommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {approvedRecommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-horizon-card rounded-lg border border-green-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-horizon-text">{rec.title || rec.name}</h4>
                      <p className="text-sm text-horizon-accent mt-1">{rec.description || rec.content}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-400 hover:bg-green-500/20"
                      onClick={() => {
                        // TODO: הפוך ליעד
                        toast.info('פונקציונליות להפיכה ליעד תתווסף בקרוב');
                      }}
                    >
                      <Target className="w-4 h-4 ml-1" />
                      הפוך ליעד
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-horizon-primary" />
            עוזר AI מותאם אישית
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-horizon-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-horizon-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-horizon-primary text-white'
                        : message.isError
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-horizon-card text-horizon-text border border-horizon'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.recommendation && (
                      <div className="mt-4 pt-4 border-t border-horizon-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-horizon-primary/20 text-horizon-primary">
                            <Sparkles className="w-3 h-3 ml-1" />
                            המלצה
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRecommendation(message.recommendation)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            אשר המלצה
                          </Button>
                        </div>
                        <div className="text-sm text-horizon-accent">
                          {message.recommendation.description || message.recommendation.content}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-horizon-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-horizon-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-horizon-primary" />
                  </div>
                  <div className="bg-horizon-card rounded-lg p-4 border border-horizon">
                    <Loader2 className="w-5 h-5 animate-spin text-horizon-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-horizon p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="שאל שאלה או בקש המלצה..."
                className="flex-1 bg-horizon-card border-horizon text-horizon-text"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="btn-horizon-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">אשר המלצה</DialogTitle>
          </DialogHeader>
          {pendingRecommendation && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-horizon-text">כותרת</Label>
                <Input
                  value={pendingRecommendation.title || ''}
                  onChange={(e) => setPendingRecommendation({ ...pendingRecommendation, title: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              <div>
                <Label className="text-horizon-text">תיאור</Label>
                <Textarea
                  value={pendingRecommendation.description || pendingRecommendation.content || ''}
                  onChange={(e) => setPendingRecommendation({ ...pendingRecommendation, description: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSaveApprovedRecommendation}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle className="w-4 h-4 ml-2" />
              אשר ושמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
