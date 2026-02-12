import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Mic, MicOff, Play, Pause, Square, Loader2, FileText,
  Clock, Save, Wand2, CheckCircle, AlertCircle, Download,
  Upload, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import { he } from 'date-fns/locale';

export default function MeetingTranscriptionSystem({ customer, currentUser, onSummaryCreated }) {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // טיימר הקלטה
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // התחלת הקלטה
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // chunk every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.warning('לא ניתן להפעיל את המיקרופון. נא לוודא שהענקת הרשאה.');
    }
  };

  // השהיית הקלטה
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  // עצירת הקלטה
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      // עיבוד ההקלטה (בהמשך נוסיף תמלול אמיתי)
      processRecording();
    }
  };

  // עיבוד הקלטה (placeholder - בהמשך יחובר ל-API תמלול)
  const processRecording = async () => {
    setIsProcessing(true);
    
    try {
      // כאן יתווסף בעתיד חיבור ל-API תמלול (Whisper, Google Speech-to-Text וכו')
      // לעת עתה, נציג placeholder
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // סימולציה
      
      setTranscription(`
[תמלול פגישה - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}]

🎙️ הקלטה נקלטה בהצלחה (${formatTime(recordingTime)})

לעת עתה, התמלול האוטומטי אינו זמין.
נא להזין את תמלול הפגישה ידנית או להעלות קובץ טקסט.

---
טיפ: לחץ על "יצירת סיכום" כדי שה-AI יעבד את התמלול ויחלץ ממנו נקודות מפתח.
      `.trim());
      
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('שגיאה בעיבוד ההקלטה');
    } finally {
      setIsProcessing(false);
    }
  };

  // יצירת סיכום מתמלול
  const generateSummary = async () => {
    if (!transcription.trim()) {
      toast.warning('נא להזין תמלול לפני יצירת סיכום');
      return;
    }

    setIsProcessing(true);
    
    try {
      // קריאה ל-AI ליצירת סיכום (יש לחבר ל-invokeClaude או API דומה)
      const response = await base44.functions.invoke('invokeClaude', {
        prompt: `אתה מנהל כספים מקצועי. קראת את התמלול הבא של פגישה עם לקוח. 
צור סיכום תמציתי שכולל:
1. נקודות עיקריות שעלו
2. החלטות שהתקבלו
3. משימות לביצוע

התמלול:
${transcription}

הפלט צריך להיות בעברית, תמציתי ומאורגן.`,
        max_tokens: 2000
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const summaryText = response.data?.content?.[0]?.text || response.data?.text || '';
      
      // ניתוח הסיכום לחלקים
      const sections = parseSummary(summaryText);
      
      setGeneratedSummary({
        full_text: summaryText,
        ...sections,
        transcription_length: transcription.length,
        generated_at: new Date().toISOString()
      });
      
      setShowSummaryModal(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      
      // fallback - סיכום ידני
      setGeneratedSummary({
        full_text: 'שגיאה ביצירת סיכום אוטומטי. נא לסכם ידנית.',
        main_points: [],
        decisions: [],
        action_items: [],
        generated_at: new Date().toISOString()
      });
      setShowSummaryModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // ניתוח הסיכום לחלקים
  const parseSummary = (text) => {
    const result = {
      main_points: [],
      decisions: [],
      action_items: []
    };

    const lines = text.split('\n').filter(l => l.trim());
    let currentSection = 'main_points';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('החלטות') || lowerLine.includes('decision')) {
        currentSection = 'decisions';
        continue;
      }
      if (lowerLine.includes('משימות') || lowerLine.includes('action') || lowerLine.includes('לביצוע')) {
        currentSection = 'action_items';
        continue;
      }
      if (lowerLine.includes('נקודות') || lowerLine.includes('עיקרי')) {
        currentSection = 'main_points';
        continue;
      }

      // הוספת פריטים
      const cleanLine = line.replace(/^[\-\*\d\.\)]+\s*/, '').trim();
      if (cleanLine.length > 5) {
        result[currentSection].push(cleanLine);
      }
    }

    return result;
  };

  // שמירת סיכום
  const saveSummary = async () => {
    if (!generatedSummary) return;

    setIsSaving(true);
    
    try {
      // יצירת רשומת סיכום פגישה
      const meetingData = {
        customer_email: customer.email,
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_type: 'regular',
        summary: generatedSummary.full_text,
        key_decisions: generatedSummary.decisions || [],
        action_items: generatedSummary.action_items || [],
        full_transcription: transcription,
        notes: `תמלול אורך: ${transcription.length} תווים`,
        created_by: currentUser?.email
      };

      if (base44.entities.MeetingSummary) {
        await base44.entities.MeetingSummary.create(meetingData);
      } else {
        // fallback
        await base44.entities.CustomerGoal.create({
          customer_email: customer.email,
          name: `סיכום פגישה - ${format(new Date(), 'dd/MM/yyyy')}`,
          task_type: 'meeting_summary',
          start_date: meetingData.meeting_date,
          end_date: meetingData.meeting_date,
          notes: meetingData.summary,
          success_metrics: JSON.stringify(meetingData.key_decisions),
          description: JSON.stringify(meetingData.action_items),
          assignee_email: currentUser?.email,
          status: 'done',
          is_active: true
        });
      }

      queryClient.invalidateQueries(['customerMeetings', customer.email]);
      
      setShowSummaryModal(false);
      setTranscription('');
      setGeneratedSummary(null);
      
      onSummaryCreated?.();
      toast.success('סיכום הפגישה נשמר בהצלחה!');
    } catch (error) {
      console.error('Error saving summary:', error);
      toast.error('שגיאה בשמירת הסיכום');
    } finally {
      setIsSaving(false);
    }
  };

  // העלאת קובץ תמלול
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setTranscription(e.target?.result?.toString() || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* כרטיס הקלטה */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Mic className="w-5 h-5 text-horizon-primary" />
            הקלטה ותמלול פגישה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* כפתורי הקלטה */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="bg-red-600 hover:bg-red-700 text-white h-16 w-16 rounded-full"
              >
                <Mic className="w-8 h-8" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  className="h-12 w-12 rounded-full border-horizon"
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white h-16 w-16 rounded-full animate-pulse"
                >
                  <Square className="w-8 h-8" />
                </Button>
              </>
            )}
          </div>

          {/* טיימר */}
          {isRecording && (
            <div className="text-center">
              <p className="text-3xl font-mono text-horizon-text">{formatTime(recordingTime)}</p>
              <Badge className={isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>
                {isPaused ? 'מושהה' : 'מקליט...'}
              </Badge>
            </div>
          )}

          {/* עיבוד */}
          {isProcessing && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-horizon-primary mx-auto" />
              <p className="text-horizon-accent mt-2">מעבד את ההקלטה...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* אזור תמלול */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-horizon-primary" />
              תמלול הפגישה
            </CardTitle>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="transcription-upload"
              />
              <label htmlFor="transcription-upload">
                <Button variant="outline" size="sm" className="border-horizon" asChild>
                  <span>
                    <Upload className="w-4 h-4 ml-1" />
                    העלה קובץ
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="הזן כאן את תמלול הפגישה, או הקלט באמצעות הכפתור למעלה..."
            className="bg-horizon-card border-horizon text-horizon-text min-h-[200px]"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-horizon-accent">
              {transcription.length} תווים
            </span>
            <Button
              onClick={generateSummary}
              disabled={!transcription.trim() || isProcessing}
              className="btn-horizon-primary"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מעבד...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 ml-2" />
                  יצירת סיכום AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* מודל סיכום */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              סיכום פגישה
            </DialogTitle>
          </DialogHeader>

          {generatedSummary && (
            <div className="space-y-4">
              <Card className="bg-horizon-card border-horizon">
                <CardContent className="p-4">
                  <p className="text-horizon-text whitespace-pre-wrap">
                    {generatedSummary.full_text}
                  </p>
                </CardContent>
              </Card>

              {generatedSummary.decisions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-horizon-text mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    החלטות ({generatedSummary.decisions.length})
                  </h4>
                  <ul className="space-y-1">
                    {generatedSummary.decisions.map((d, i) => (
                      <li key={i} className="text-sm text-horizon-accent flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedSummary.action_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-horizon-text mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400" />
                    משימות ({generatedSummary.action_items.length})
                  </h4>
                  <ul className="space-y-1">
                    {generatedSummary.action_items.map((a, i) => (
                      <li key={i} className="text-sm text-horizon-accent flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSummaryModal(false)}
              className="border-horizon text-horizon-text"
            >
              ביטול
            </Button>
            <Button
              onClick={saveSummary}
              disabled={isSaving}
              className="btn-horizon-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור סיכום
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
