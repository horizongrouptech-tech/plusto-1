import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  AlertCircle, FileX, Download, Eye, RefreshCw, Loader2,
  Calendar, User, FileText, XCircle, CheckCircle, Clock, Database
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { toast } from "sonner";
export default function FailedFileUploadsManager() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // טעינת כל הקבצים שנכשלו
  const { data: failedFiles = [], isLoading, refetch } = useQuery({
    queryKey: ['failedFileUploads'],
    queryFn: async () => {
      const files = await base44.entities.FileUpload.filter({
        status: 'failed'
      }, '-created_date');
      
      return files;
    },
    refetchInterval: 30000, // רענון כל 30 שניות
  });

  // סימון קובץ כטופל
  const handleMarkAsResolved = async (fileId) => {
    if (!confirm('האם לסמן את הקובץ כטופל?')) return;
    
    try {
      await base44.entities.FileUpload.update(fileId, {
        status: 'resolved',
        resolved_at: new Date().toISOString()
      });
      
      queryClient.invalidateQueries(['failedFileUploads']);
    } catch (error) {
      console.error('Error marking file as resolved:', error);
      toast.error('שגיאה בסימון הקובץ כטופל: ' + error.message);
    }
  };

  // מחיקת קובץ
  const handleDeleteFile = async (fileId) => {
    if (!confirm('האם למחוק את הקובץ?')) return;
    
    try {
      await base44.entities.FileUpload.update(fileId, {
        status: 'deleted'
      });
      
      queryClient.invalidateQueries(['failedFileUploads']);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('שגיאה במחיקת הקובץ: ' + error.message);
    }
  };

  const getErrorType = (errorMessage) => {
    if (!errorMessage) return 'לא ידוע';
    
    const msg = errorMessage.toLowerCase();
    if (msg.includes('format') || msg.includes('פורמט')) return 'פורמט לא נתמך';
    if (msg.includes('empty') || msg.includes('ריק')) return 'קובץ ריק';
    if (msg.includes('size') || msg.includes('גודל')) return 'קובץ גדול מדי';
    if (msg.includes('network') || msg.includes('רשת')) return 'שגיאת רשת';
    if (msg.includes('parse') || msg.includes('פענוח')) return 'שגיאת פענוח';
    if (msg.includes('validation') || msg.includes('ולידציה')) return 'שגיאת ולידציה';
    
    return 'שגיאה כללית';
  };

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* כותרת עם סטטיסטיקות */}
      <Card className="card-horizon bg-gradient-to-l from-red-500/10 to-orange-500/5 border-red-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <FileX className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-horizon-text flex items-center gap-2">
                  קבצים שנכשלו בהעלאה
                </CardTitle>
                <p className="text-sm text-horizon-accent mt-1">
                  {failedFiles.length} קבצים דורשים טיפול
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-horizon-primary text-horizon-primary"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              רענון
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* רשימת קבצים */}
      {failedFiles.length === 0 ? (
        <Card className="card-horizon">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400/50" />
            <h3 className="text-lg font-semibold text-horizon-text mb-2">
              אין קבצים שנכשלו! 🎉
            </h3>
            <p className="text-horizon-accent">
              כל הקבצים הועלו בהצלחה
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {failedFiles.map((file) => (
            <Card 
              key={file.id} 
              className="card-horizon border-l-4 border-l-red-500 hover:border-l-red-400 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-horizon-text truncate">
                          {file.filename || file.file_name || 'קובץ ללא שם'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {file.customer_email && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                              <User className="w-3 h-3 ml-1" />
                              {file.customer_email}
                            </Badge>
                          )}
                          {file.data_category && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                              {file.data_category}
                            </Badge>
                          )}
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                            {getErrorType(file.analysis_notes || file.error_message)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* הודעת שגיאה */}
                    {file.analysis_notes && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-400 mb-1">סיבת הכישלון:</p>
                            <p className="text-sm text-horizon-text whitespace-pre-wrap">
                              {file.analysis_notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* פרטים נוספים */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-horizon-accent">
                      {file.created_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(file.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </span>
                          <span className="mr-1">
                            ({formatDistanceToNow(new Date(file.created_date), { addSuffix: true, locale: he })})
                          </span>
                        </div>
                      )}
                      {file.file_type && (
                        <Badge variant="outline" className="text-xs">
                          {file.file_type}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* פעולות */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {file.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(file.file_url, '_blank')}
                        className="text-horizon-accent hover:text-horizon-primary"
                        title="צפייה בקובץ"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {file.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = file.file_url;
                          link.download = file.filename || 'file';
                          link.click();
                        }}
                        className="text-horizon-accent hover:text-horizon-primary"
                        title="הורדת קובץ"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(file);
                        setShowDetailsDialog(true);
                      }}
                      className="text-horizon-accent hover:text-blue-400"
                      title="פרטים נוספים"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkAsResolved(file.id)}
                      className="text-horizon-accent hover:text-green-400"
                      title="סמן כטופל"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-horizon-accent hover:text-red-400"
                      title="מחק"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* דיאלוג פרטים נוספים */}
      {selectedFile && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-horizon-text flex items-center gap-2">
                <FileX className="w-5 h-5 text-red-400" />
                פרטי קובץ שנכשל
              </DialogTitle>
              <DialogDescription className="text-horizon-accent">
                מידע מפורט על הקובץ והשגיאה
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* פרטי קובץ */}
              <div className="bg-horizon-card rounded-lg p-4">
                <h4 className="font-semibold text-horizon-text mb-3">פרטי הקובץ</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">שם הקובץ:</span>
                    <span className="text-horizon-text font-medium">
                      {selectedFile.filename || selectedFile.file_name || 'לא זמין'}
                    </span>
                  </div>
                  {selectedFile.file_type && (
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">סוג קובץ:</span>
                      <span className="text-horizon-text">{selectedFile.file_type}</span>
                    </div>
                  )}
                  {selectedFile.data_category && (
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">קטגוריה:</span>
                      <span className="text-horizon-text">{selectedFile.data_category}</span>
                    </div>
                  )}
                  {selectedFile.customer_email && (
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">לקוח:</span>
                      <span className="text-horizon-text">{selectedFile.customer_email}</span>
                    </div>
                  )}
                  {selectedFile.created_date && (
                    <div className="flex justify-between">
                      <span className="text-horizon-accent">תאריך העלאה:</span>
                      <span className="text-horizon-text">
                        {format(new Date(selectedFile.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* הודעת שגיאה */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  סיבת הכישלון
                </h4>
                <p className="text-sm text-horizon-text whitespace-pre-wrap">
                  {selectedFile.analysis_notes || selectedFile.error_message || 'לא צוינה סיבה'}
                </p>
              </div>

              {/* מטא-דאטה */}
              {selectedFile.parsing_metadata && (
                <div className="bg-horizon-card rounded-lg p-4">
                  <h4 className="font-semibold text-horizon-text mb-3">מטא-דאטה</h4>
                  <pre className="text-xs text-horizon-accent overflow-x-auto">
                    {JSON.stringify(selectedFile.parsing_metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* קישור לקובץ */}
              {selectedFile.file_url && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedFile.file_url, '_blank')}
                    className="flex-1 border-horizon-primary text-horizon-primary"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    צפייה בקובץ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedFile.file_url;
                      link.download = selectedFile.filename || 'file';
                      link.click();
                    }}
                    className="flex-1 border-horizon-primary text-horizon-primary"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    הורדת קובץ
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}