import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Info } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { uploadManualForecastXlsx } from "@/functions/uploadManualForecastXlsx";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function UploaderArea({ customer, onUploadComplete }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFileUpload(files[0]);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) handleFileUpload(files[0]);
        e.target.value = '';
    };

    const normalizeFileName = (originalName) => {
        let normalized = originalName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').trim();
        if (normalized.length < 3) {
            const timestamp = Date.now();
            const ext = originalName.split('.').pop();
            normalized = `forecast_${timestamp}.${ext}`;
        }
        return normalized;
    };

    const handleFileUpload = async (originalFile) => {
        setError('');
        setUploadProgress(0);
        
        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = originalFile.name.toLowerCase().substring(originalFile.name.lastIndexOf('.'));
        if (!validExtensions.includes(fileExtension)) {
            const errorMsg = `סוג קובץ לא נתמך. יש להעלות Excel (.xlsx, .xls)`;
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        if (originalFile.size > 5 * 1024 * 1024) {
            const errorMsg = `הקובץ גדול מדי (${(originalFile.size / 1024 / 1024).toFixed(1)}MB). גודל מקסימלי: 5MB`;
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        const normalizedName = normalizeFileName(originalFile.name);
        const file = new File([originalFile], normalizedName, { type: originalFile.type });

        setIsUploading(true);
        setUploadStatus('מכין את הקובץ להעלאה...');
        setUploadProgress(5);

        try {
            setUploadStatus('מעלה קובץ לשרת... (עשוי לקחת כמה שניות)');
            setUploadProgress(20);
            
            const { file_url, error: uploadError } = await UploadFile({ file });
            if (uploadError) throw new Error(uploadError.message || 'שגיאה בהעלאת הקובץ');

            setUploadStatus('הקובץ הועלה. יוצר מבנה תחזית חדש...');
            setUploadProgress(60);

            const { data: processResult, error: processError } = await uploadManualForecastXlsx({
                file_url: file_url,
                customer_email: customer.email
            });
            if (processError) throw new Error(processError.message || 'שגיאה ביצירת התחזית');

            setUploadStatus('הושלם בהצלחה!');
            setUploadProgress(100);
            toast.success('תחזית חדשה נוצרה! כעת ניתן להזין נתונים.');
            
            setTimeout(() => {
                if (onUploadComplete) onUploadComplete(processResult);
                setIsUploading(false);
                setUploadStatus('');
                setUploadProgress(0);
            }, 1500);

        } catch (error) {
            const errorMessage = 'שגיאה בתהליך ההעלאה: ' + error.message;
            console.error(errorMessage, error);
            setError(errorMessage);
            toast.error(errorMessage);
            setIsUploading(false);
            setUploadStatus('');
            setUploadProgress(0);
        }
    };

    return (
        <Card className="card-horizon">
            <CardHeader>
                <CardTitle className="text-horizon-text flex items-center gap-2 text-right">
                    <Upload className="w-5 h-5 text-horizon-primary" />
                    העלאת קובץ תחזית חדש
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-200 text-sm text-right">
                        העלאת קובץ Excel חדש תאפס את התחזית הקיימת ותאפשר לך להתחיל מחדש עם הזנה ידנית או מיפוי עתידי.
                    </AlertDescription>
                </Alert>

                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
                        ${isDragging ? 'border-horizon-primary bg-horizon-primary/20' : 'border-horizon'}
                    `}
                    onClick={() => document.getElementById('file-input').click()}
                >
                    <input type="file" id="file-input" className="hidden" onChange={handleFileSelect} accept=".xlsx,.xls"/>
                    <FileSpreadsheet className="mx-auto w-12 h-12 text-horizon-accent" />
                    <p className="mt-4 text-horizon-text">
                        {isDragging ? 'שחרר את הקובץ כאן' : 'גרור קובץ לכאן או לחץ לבחירה'}
                    </p>
                    <p className="text-xs text-horizon-accent mt-1">
                        תומך בקבצי Excel (.xlsx, .xls) עד 5MB
                    </p>
                </div>

                {isUploading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-horizon-accent">{uploadStatus}</span>
                            <span className="text-horizon-text font-bold">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                    </div>
                )}
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}