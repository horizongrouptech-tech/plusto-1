/**
 * Unified File Upload Hook
 * Ensures all uploads are tracked in FileUpload entity
 */

import { useState, useCallback } from 'react';
import { FileUpload } from '@/api/entities';
import { UploadFile } from '@/api/integrations';


// קטגוריות קבצים
export const FILE_CATEGORIES = {
  inventory_report: 'דוח מלאי',
  sales_report: 'דוח מכירות',
  profit_loss_statement: 'דוח רווח והפסד',
  balance_sheet: 'מאזן',
  bank_statement: 'תדפיס בנק',
  credit_card_report: 'דוח כרטיס אשראי',
  promotions_report: 'דוח מבצעים',
  credit_report: 'דוח ריכוז נתונים',
  esna_report: 'דוח מע"מ',
  purchase_document: 'מסמכי רכש',
  forecast_data: 'נתוני תחזית',
  z_report: 'דוח Z',
  catalog_data: 'נתוני קטלוג',
  cash_flow: 'תזרים מזומנים',
  general_document: 'מסמך כללי',
  auto_detect: 'זיהוי אוטומטי'
};

/**
 * Hook להעלאת קבצים עם מעקב אוטומטי
 */
export function useUnifiedFileUpload(customerEmail) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);

  /**
   * העלאת קובץ ויצירת רשומה ב-FileUpload
   */
  const uploadFile = useCallback(async (file, options = {}) => {
    const {
      category = 'auto_detect',
      customName = null,
      metadata = {},
      skipFileUploadRecord = false,
      source = 'manual_upload'
    } = options;

    if (!file) {
      setError('לא נבחר קובץ');
      return null;
    }

    if (!customerEmail) {
      setError('חסר אימייל לקוח');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus('uploading');
    setError(null);

    let fileRecordId = null;

    try {
      setUploadProgress(30);
      const { file_url } = await UploadFile({ file });

      setUploadProgress(60);

      const fileType = file.name.split('.').pop().toLowerCase();
      const fileName = customName || file.name;

      if (!skipFileUploadRecord) {
        const fileRecord = await FileUpload.create({
          customer_email: customerEmail,
          filename: fileName,
          file_url: file_url,
          file_type: fileType,
          status: 'uploaded',
          data_category: category,
          analysis_notes: `הועלה מ: ${source}`,
          ...metadata
        });
        fileRecordId = fileRecord.id;
      }

      setUploadProgress(100);
      setUploadStatus('success');

      return {
        success: true,
        file_url,
        file_type: fileType,
        file_name: fileName,
        file_record_id: fileRecordId
      };

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'שגיאה בהעלאת הקובץ');
      setUploadStatus('error');

      if (!skipFileUploadRecord) {
        try {
          await FileUpload.create({
            customer_email: customerEmail,
            filename: file?.name || 'קובץ לא מזוהה',
            file_url: '',
            file_type: file?.name?.split('.').pop()?.toLowerCase() || 'unknown',
            status: 'failed',
            data_category: category,
            analysis_notes: `שגיאה: ${err.message}`,
            error_message: err.message
          });
        } catch (recordError) {
          console.error('Error creating failed record:', recordError);
        }
      }

      return {
        success: false,
        error: err.message
      };

    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus(null);
      }, 3000);
    }
  }, [customerEmail]);

  /**
   * עדכון סטטוס קובץ קיים
   */
  const updateFileStatus = useCallback(async (fileId, status, additionalData = {}) => {
    try {
      await FileUpload.update(fileId, {
        status,
        ...additionalData
      });
      return true;
    } catch (err) {
      console.error('Error updating file status:', err);
      return false;
    }
  }, []);

  /**
   * רישום קובץ קיים (שהועלה במקום אחר)
   */
  const registerExistingFile = useCallback(async (fileData) => {
    const {
      file_url,
      filename,
      file_type,
      category = 'auto_detect',
      source = 'system',
      metadata = {}
    } = fileData;

    if (!customerEmail || !file_url) {
      return null;
    }

    try {
      const existing = await FileUpload.filter({
        customer_email: customerEmail,
        file_url: file_url
      });

      if (existing && existing.length > 0) {
        return existing[0];
      }

      const fileRecord = await FileUpload.create({
        customer_email: customerEmail,
        filename: filename || 'קובץ מערכת',
        file_url,
        file_type: file_type || 'unknown',
        status: 'uploaded',
        data_category: category,
        analysis_notes: `מקור: ${source}`,
        ...metadata
      });

      return fileRecord;
    } catch (err) {
      console.error('Error registering existing file:', err);
      return null;
    }
  }, [customerEmail]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus(null);
    setError(null);
  }, []);

  return {
    uploadFile,
    updateFileStatus,
    registerExistingFile,
    reset,
    isUploading,
    uploadProgress,
    uploadStatus,
    error,
    FILE_CATEGORIES
  };
}

export default useUnifiedFileUpload;