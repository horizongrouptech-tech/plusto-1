import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, CheckCircle2, ClipboardList, FileText, 
  Download, MessageSquare, User
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function MeetingSummaryViewer({ meeting, isOpen, onClose }) {
  if (!meeting) return null;

  const getMeetingTypeLabel = (type) => {
    const labels = {
      first: 'פגישה ראשונה',
      regular: 'פגישה שוטפת',
      followup: 'פגישת מעקב',
      closing: 'פגישת סיכום'
    };
    return labels[type] || 'פגישה';
  };

  const getMeetingTypeColor = (type) => {
    const colors = {
      first: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      regular: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      followup: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      closing: 'bg-green-500/20 text-green-400 border-green-500/50'
    };
    return colors[type] || colors.regular;
  };

  const keyDecisions = Array.isArray(meeting.key_decisions) 
    ? meeting.key_decisions 
    : (meeting.key_decisions || '').split('\n').filter(d => d.trim());

  const actionItems = Array.isArray(meeting.action_items) 
    ? meeting.action_items 
    : (meeting.action_items || '').split('\n').filter(a => a.trim());

  const handleExport = () => {
    const content = `
סיכום פגישה - ${format(new Date(meeting.meeting_date), 'dd/MM/yyyy')}
==========================================

סוג פגישה: ${getMeetingTypeLabel(meeting.meeting_type)}

סיכום:
${meeting.summary}

${keyDecisions.length > 0 ? `
החלטות מפתח:
${keyDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}
` : ''}

${actionItems.length > 0 ? `
משימות לביצוע:
${actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}
` : ''}

${meeting.notes ? `
הערות נוספות:
${meeting.notes}
` : ''}

נוצר על ידי: ${meeting.created_by || 'לא ידוע'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `סיכום_פגישה_${format(new Date(meeting.meeting_date), 'dd-MM-yyyy')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-horizon-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-horizon-primary" />
              סיכום פגישה
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-horizon text-horizon-accent hover:text-horizon-text"
            >
              <Download className="w-4 h-4 ml-2" />
              ייצוא
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* כותרת ותאריך */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={getMeetingTypeColor(meeting.meeting_type)}>
              {getMeetingTypeLabel(meeting.meeting_type)}
            </Badge>
            <span className="text-horizon-accent flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(meeting.meeting_date), 'EEEE, dd MMMM yyyy', { locale: he })}
            </span>
            {meeting.created_by && (
              <span className="text-horizon-accent flex items-center gap-1">
                <User className="w-4 h-4" />
                {meeting.created_by}
              </span>
            )}
          </div>

          {/* סיכום */}
          <Card className="card-horizon">
            <CardContent className="p-4">
              <h3 className="font-semibold text-horizon-text mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-horizon-primary" />
                סיכום הפגישה
              </h3>
              <p className="text-horizon-text whitespace-pre-wrap leading-relaxed">
                {meeting.summary}
              </p>
            </CardContent>
          </Card>

          {/* החלטות מפתח */}
          {keyDecisions.length > 0 && (
            <Card className="card-horizon border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <h3 className="font-semibold text-horizon-text mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  החלטות מפתח ({keyDecisions.length})
                </h3>
                <ul className="space-y-2">
                  {keyDecisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-horizon-text">
                      <span className="text-green-400 font-semibold">{idx + 1}.</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* משימות לביצוע */}
          {actionItems.length > 0 && (
            <Card className="card-horizon border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <h3 className="font-semibold text-horizon-text mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-400" />
                  משימות לביצוע ({actionItems.length})
                </h3>
                <ul className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-horizon-text">
                      <span className="text-blue-400 font-semibold">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* הערות נוספות */}
          {meeting.notes && (
            <Card className="card-horizon bg-horizon-card/50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-horizon-text mb-2">הערות נוספות</h3>
                <p className="text-horizon-accent whitespace-pre-wrap">
                  {meeting.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
