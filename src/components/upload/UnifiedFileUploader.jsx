import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Package,
  TrendingUp,
  DollarSign,
  CreditCard,
  Banknote,
  BarChart3,
  Gift,
  ReceiptText,
  FileQuestion,
  FileText,
  Eye,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Filter
} from "lucide-react";

import { format } from "date-fns";
import { he } from "date-fns/locale";
import FileDataViewer from "@/components/shared/FileDataViewer";
import CreditReportViewer from "@/components/shared/CreditReportViewer";
import FinancialReportViewer from "@/components/shared/FinancialReportViewer";
import InventoryReportViewer from "@/components/shared/InventoryReportViewer";
import SalesReportViewer from "@/components/shared/SalesReportViewer";
import PromotionsReportViewer from "@/components/shared/PromotionsReportViewer";
import ESNAReportViewer from "@/components/shared/ESNAReportViewer";
import DeeperInsightsModal from "@/components/shared/DeeperInsightsModal";
import { toast } from "sonner";
import { FileUpload } from '@/api/entities';
import { InvokeLLM, UploadFile } from '@/api/integrations';
import { analyzeGenericFile, parseXlsx, processCreditReport, processESNAReport, processPurchaseDocument } from '@/api/functions';

const FILE_CATEGORIES = [
  { value: 'inventory_report', label: 'דוח מלאי', icon: Package },
  { value: 'sales_report', label: 'דוח מכירות', icon: TrendingUp },
  { value: 'profit_loss_statement', label: 'דוח רווח והפסד', icon: DollarSign },
  { value: 'balance_sheet', label: 'מאזן', icon: BarChart3 },
  { value: 'bank_statement', label: 'תדפיס בנק', icon: Banknote },
  { value: 'credit_card_report', label: 'דוח כרטיס אשראי', icon: CreditCard },
  { value: 'promotions_report', label: 'דוח מבצעים', icon: Gift },
  { value: 'credit_report', label: 'דוח ריכוז נתונים', icon: BarChart3 },
  { value: 'esna_report', label: 'דוח מע"מ (ESNA)', icon: ReceiptText },
  { value: 'purchase_document', label: 'מסמכי רכש', icon: ReceiptText },
  { value: 'other', label: 'מסמך אחר (ניתוח חכם)', icon: FileQuestion }
];

export default function UnifiedFileUploader({ customerEmail, onUploadComplete }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [finalStatus, setFinalStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Files list state
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Viewer states
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFinancialReportViewer, setShowFinancialReportViewer] = useState(false);
  const [financialReportData, setFinancialReportData] = useState(null);
  const [showCreditReportViewer, setShowCreditReportViewer] = useState(false);
  const [creditReportData, setCreditReportData] = useState(null);
  const [showInventoryReportViewer, setShowInventoryReportViewer] = useState(false);
  const [inventoryReportData, setInventoryReportData] = useState(null);
  const [showSalesReportViewer, setShowSalesReportViewer] = useState(false);
  const [salesReportData, setSalesReportData] = useState(null);
  const [showPromotionsReportViewer, setShowPromotionsReportViewer] = useState(false);
  const [promotionsReportData, setPromotionsReportData] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFileForViewing, setSelectedFileForViewing] = useState(null);
  const [fileViewerType, setFileViewerType] = useState('');
  const [showDeeperInsightsModal, setShowDeeperInsightsModal] = useState(false);
  const [fileToAnalyzeDeeper, setFileToAnalyzeDeeper] = useState(null);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [customerEmail]);

  const loadFiles = async () => {
    setIsLoading(true);
    const uploadedFiles = await FileUpload.filter(
      { customer_email: customerEmail },
      '-created_date',
      100
    );
    setFiles(uploadedFiles);
    setIsLoading(false);
  };

  const getCategoryBadge = (category) => {
    const config = {
      inventory_report: { label: 'מלאי', color: 'bg-purple-100 text-purple-800' },
      sales_report: { label: 'מכירות', color: 'bg-blue-100 text-blue-800' },
      profit_loss_statement: { label: 'רווח והפסד', color: 'bg-green-100 text-green-800' },
      balance_sheet: { label: 'מאזן', color: 'bg-indigo-100 text-indigo-800' },
      bank_statement: { label: 'בנק', color: 'bg-teal-100 text-teal-800' },
      credit_card_report: { label: 'כרטיס אשראי', color: 'bg-pink-100 text-pink-800' },
      promotions_report: { label: 'מבצעים', color: 'bg-yellow-100 text-yellow-800' },
      credit_report: { label: 'דוח אשראי', color: 'bg-red-100 text-red-800' },
      esna_report: { label: 'מע"מ', color: 'bg-orange-100 text-orange-800' },
      purchase_document: { label: 'רכש', color: 'bg-cyan-100 text-cyan-800' },
      auto_detect: { label: 'אוטומטי', color: 'bg-gray-100 text-gray-800' },
      mixed_business_data: { label: 'כללי', color: 'bg-slate-100 text-slate-800' }
    };
    const cat = config[category] || { label: category, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={cat.color}>{cat.label}</Badge>;
  };

  const handleViewFile = (file) => {
    if (file.data_category === 'credit_report' && file.ai_insights) {
      setCreditReportData(file.ai_insights);
      setShowCreditReportViewer(true);
    } else if ((file.data_category === 'balance_sheet' || file.data_category === 'profit_loss_statement') && file.parsed_data) {
      setFinancialReportData(file.parsed_data);
      setShowFinancialReportViewer(true);
    } else if (file.data_category === 'inventory_report' && file.ai_insights) {
      setInventoryReportData(file.ai_insights);
      setShowInventoryReportViewer(true);
    } else if (file.data_category === 'sales_report' && file.ai_insights) {
      setSalesReportData(file.ai_insights);
      setShowSalesReportViewer(true);
    } else if (file.data_category === 'promotions_report' && file.ai_insights) {
      setPromotionsReportData(file.ai_insights);
      setShowPromotionsReportViewer(true);
    } else if (file.data_category === 'esna_report') {
      setSelectedFileForViewing(file);
      setFileViewerType('esna');
      setFileViewerOpen(true);
    } else {
      setSelectedFile(file);
      setShowDataViewer(true);
    }
  };

  const handleDownloadFile = (file) => {
    window.open(file.file_url, '_blank');
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) return;
    await FileUpload.delete(fileId);
    await loadFiles();
  };

  const handleShowDeeperInsights = (file) => {
    setFileToAnalyzeDeeper(file);
    setShowDeeperInsightsModal(true);
  };

  const handleDeeperInsightsUpdated = () => {
    loadFiles();
  };

  const filteredFiles = categoryFilter === 'all' 
    ? files 
    : files.filter(f => f.data_category === categoryFilter);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedCategory) {
      toast.warning('אנא בחר סוג מסמך לפני העלאה');
      return;
    }

    if (selectedCategory === 'other' && !customFileName.trim()) {
      toast.warning('אנא הכנס שם/תיאור למסמך');
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsUploading(true);
    setUploadProgress(10);
    setProcessingStatus('מתחיל העלאה...');
    setFinalStatus(null);

    let fileRecordId = null;
    const category = selectedCategory;

    try {
      // Upload file
      setProcessingStatus('מעלה קובץ...');
      const { file_url } = await UploadFile({ file });

      setUploadProgress(30);
      setProcessingStatus('יוצר רשומת קובץ...');

      // Create file record
      const fileType = file.name.split('.').pop().toLowerCase();
      const initialRecord = await FileUpload.create({
        customer_email: customerEmail,
        filename: file.name,
        file_url: file_url,
        file_type: fileType,
        status: 'processing',
        data_category: category === 'other' ? 'auto_detect' : category,
      });
      fileRecordId = initialRecord.id;

      setUploadProgress(50);

      if (category === 'other') {
        // Generic file analysis with internet search
        setProcessingStatus('מנתח מסמך באמצעות בינה מלאכותית וחיפוש באינטרנט...');
        
        await analyzeGenericFile({
          file_url,
          file_name: customFileName,
          customer_email: customerEmail,
          file_id: fileRecordId
        });

        setUploadProgress(100);
        setProcessingStatus('ניתוח הושלם בהצלחה!');
        setFinalStatus('success');

      } else {
        // Use existing backend processing from SpecificFileUploadBox logic
        setProcessingStatus(`מעבד ${FILE_CATEGORIES.find(c => c.value === category)?.label}...`);
        
        let parseResult;

        if (['xls', 'xlsx', 'csv'].includes(fileType)) {
          if (category === 'inventory_report') {
            const { data: parsedXlsxResponse } = await parseXlsx({ fileUrl: file_url });
            const raw_data = parsedXlsxResponse?.data?.raw_data;

            if (!raw_data || raw_data.length === 0) {
              throw new Error('לא הצלחנו לקרוא נתונים מהקובץ או שהקובץ ריק.');
            }

            const inventoryAnalysisSchema = {
              type: "object",
              properties: {
                extracted_products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      barcode: { type: "string" },
                      product_name: { type: "string" },
                      supplier: { type: "string" },
                      category: { type: "string" },
                      cost_price: { type: "number" },
                      selling_price: { type: "number" },
                      inventory: { type: "number" },
                      inventory_value: { type: "number" },
                    }
                  }
                },
                summary: {
                  type: "object",
                  properties: {
                    total_inventory_value: { type: "number" },
                    total_products_count: { type: "number" },
                    unique_categories_count: { type: "number" },
                    average_profit_margin: { type: "number" }
                  }
                },
                key_insights: { type: "array", items: { type: "string" } },
                actionable_recommendations: { type: "array", items: { type: "string" } },
                problematic_products: {
                  type: "object",
                  properties: {
                    low_stock: { type: "array", items: { type: "string" } },
                    overstock: { type: "array", items: { type: "string" } },
                    dead_stock: { type: "array", items: { type: "string" } },
                    negative_margin: { type: "array", items: { type: "string" } }
                  }
                }
              }
            };

            const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);
            const inventoryPrompt = `
אתה אנליסט עסקי ומומחה פיננסי עם התמחות בקמעונאות. משימתך היא לנתח את נתוני דוח המלאי הגולמיים המצורפים ולחלץ מהם נתונים ותובנות עסקיות.

**הנתונים הגולמיים:**
${rawDataForPrompt}

חלץ את כל המוצרים, חשב סיכומים, והפק תובנות בעברית.
            `;

            parseResult = await InvokeLLM({
              prompt: inventoryPrompt,
              response_json_schema: inventoryAnalysisSchema
            });

            const dataToSave = {
              rows: parseResult.extracted_products,
              headers: Object.keys(parseResult.extracted_products[0] || {}),
              summary: parseResult.summary,
            };

            await FileUpload.update(fileRecordId, {
              status: 'analyzed',
              parsed_data: dataToSave,
              ai_insights: parseResult,
              parsing_metadata: { analysis_status: 'full', enhanced_parsing: true },
              analysis_notes: "Successfully analyzed inventory report using AI-First parsing."
            });

          } else if (category === 'sales_report') {
            const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
            const raw_data = parsedResult?.data?.raw_data;

            if (!raw_data || raw_data.length === 0) {
              throw new Error('לא הצלחנו לקרוא נתונים מדוח המכירות.');
            }

            const salesReportSchema = {
              type: "object",
              properties: {
                products_sales: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_code: { type: "string" },
                      product_name: { type: "string" },
                      supplier: { type: "string" },
                      category: { type: "string" },
                      cost_price: { type: "number" },
                      selling_price: { type: "number" },
                      items_sold: { type: "number" },
                      revenue: { type: "number" },
                      gross_profit_percentage: { type: "number" }
                    }
                  }
                },
                summary: {
                  type: "object",
                  properties: {
                    total_revenue: { type: "number" },
                    total_items_sold: { type: "number" },
                    average_profit_margin: { type: "number" },
                    unique_products_sold: { type: "number" }
                  }
                },
                top_selling_products: { type: "array", items: { type: "object" } },
                top_profitable_products: { type: "array", items: { type: "object" } },
                sales_by_category: { type: "array", items: { type: "object" } },
                key_insights: { type: "array", items: { type: "string" } },
                actionable_recommendations: { type: "array", items: { type: "string" } }
              }
            };

            const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);
            parseResult = await InvokeLLM({
              prompt: `נתח דוח מכירות: ${rawDataForPrompt}`,
              response_json_schema: salesReportSchema
            });

            const dataToSave = {
              rows: parseResult.products_sales,
              headers: Object.keys(parseResult.products_sales[0] || {}),
              summary: parseResult.summary,
              top_selling_products: parseResult.top_selling_products,
              top_profitable_products: parseResult.top_profitable_products,
              sales_by_category: parseResult.sales_by_category
            };

            await FileUpload.update(fileRecordId, {
              status: 'analyzed',
              parsed_data: dataToSave,
              ai_insights: parseResult,
              parsing_metadata: { analysis_status: 'full', enhanced_parsing: true },
              analysis_notes: "Successfully analyzed sales report using AI-First parsing."
            });

          } else if (category === 'promotions_report') {
            const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
            const raw_data = parsedResult?.data?.raw_data;

            if (!raw_data || raw_data.length === 0) {
              throw new Error('לא הצלחנו לקרוא נתונים מדוח המבצעים.');
            }

            const promotionsReportSchema = {
              type: "object",
              properties: {
                promotions: { type: "array", items: { type: "object" } },
                summary: { type: "object" },
                promotion_types_breakdown: { type: "array" },
                seasonal_analysis: { type: "object" }
              }
            };

            const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);
            parseResult = await InvokeLLM({
              prompt: `נתח דוח מבצעים: ${rawDataForPrompt}`,
              response_json_schema: promotionsReportSchema
            });

            const dataToSave = {
              rows: parseResult.promotions,
              headers: Object.keys(parseResult.promotions[0] || {}),
              summary: parseResult.summary,
              promotion_types_breakdown: parseResult.promotion_types_breakdown,
              seasonal_analysis: parseResult.seasonal_analysis
            };

            await FileUpload.update(fileRecordId, {
              status: 'analyzed',
              parsed_data: dataToSave,
              ai_insights: parseResult,
              parsing_metadata: { analysis_status: 'full', enhanced_parsing: true },
              analysis_notes: "Successfully analyzed promotions report using AI-First parsing."
            });

          } else if (category === 'esna_report') {
            setProcessingStatus('מעבד דוח מע"מ (ESNA)...');
            
            await processESNAReport({
              file_url: file_url,
              customer_email: customerEmail,
              file_id: fileRecordId
            });

          } else if (category === 'purchase_document') {
            setProcessingStatus('מעבד מסמך רכש...');
            
            await processPurchaseDocument({
              file_url: file_url,
              customer_email: customerEmail,
              file_id: fileRecordId,
              supplier_id: null
            });

          } else {
            // For other categories, use parseXlsx
            const { data } = await parseXlsx({
              fileUrl: file_url,
              category: category,
              filename: file.name
            });

            await FileUpload.update(fileRecordId, {
              status: 'analyzed',
              parsed_data: data,
              parsing_metadata: { analysis_status: 'full' },
              analysis_notes: "Successfully parsed file."
            });
          }
        } else if (fileType === 'pdf' || ['jpg', 'jpeg', 'png'].includes(fileType)) {
          // PDF and Image processing
          setProcessingStatus(fileType === 'pdf' ? 'מנתח מסמך PDF באמצעות AI...' : 'מנתח תמונה באמצעות AI...');
          
          if (category === 'esna_report') {
            await processESNAReport({
              file_url: file_url,
              customer_email: customerEmail,
              file_id: fileRecordId
            });
          } else if (category === 'purchase_document') {
            await processPurchaseDocument({
              file_url: file_url,
              customer_email: customerEmail,
              file_id: fileRecordId,
              supplier_id: null
            });
          } else if (category === 'credit_report') {
            // Credit Report - use dedicated function
            setProcessingStatus('מנתח דוח ריכוז נתונים...');
            
            await processCreditReport({
              file_url: file_url,
              customer_email: customerEmail,
              file_id: fileRecordId
            });

            setUploadProgress(100);
            setProcessingStatus('דוח ריכוז נתונים נותח בהצלחה!');
            setFinalStatus('success');
            
            if (onUploadComplete) {
              onUploadComplete();
            }

            await loadFiles();

            setTimeout(() => {
              setSelectedCategory('');
              setCustomFileName('');
            }, 2000);

            return; // Exit early
            
          } else {
            // Use InvokeLLM for PDF analysis based on category
            let targetSchema = {};
            let prompt = '';

            if (category === 'bank_statement') {
              targetSchema = {
                type: "object",
                properties: {
                  account_summary: { type: "object" },
                  transactions: { type: "array" },
                  key_insights: { type: "array" },
                  risk_flags: { type: "array" },
                  top_expenses: { type: "array" }
                }
              };
              prompt = 'נתח תדפיס בנק PDF והחזר נתונים מובנים';
            } else if (category === 'credit_card_report') {
              targetSchema = {
                type: "object",
                properties: {
                  card_summary: { type: "object" },
                  transactions: { type: "array" },
                  key_insights: { type: "array" },
                  top_spending_categories: { type: "array" }
                }
              };
              prompt = 'נתח דוח כרטיס אשראי PDF';
            } else if (category === 'balance_sheet' || category === 'profit_loss_statement') {
              targetSchema = {
                type: "object",
                properties: {
                  report_metadata: { type: "object" },
                  financial_summary: { type: "object" },
                  key_insights: { type: "array" },
                  alerts_and_insights: { type: "object" }
                }
              };
              prompt = `נתח ${category === 'balance_sheet' ? 'מאזן' : 'דוח רווח והפסד'} PDF`;
            }

            parseResult = await InvokeLLM({
              prompt: prompt,
              file_urls: [file_url],
              response_json_schema: targetSchema
            });

            await FileUpload.update(fileRecordId, {
              status: 'analyzed',
              parsed_data: parseResult,
              ai_insights: parseResult,
              parsing_metadata: { analysis_status: 'full' },
              analysis_notes: 'Successfully analyzed PDF file.'
            });
          }
        }

        setUploadProgress(100);
        setProcessingStatus('הקובץ הועלה ונותח בהצלחה!');
        setFinalStatus('success');
      }

      if (onUploadComplete) {
        onUploadComplete();
      }

      await loadFiles();

      // Reset form
      setTimeout(() => {
        setSelectedCategory('');
        setCustomFileName('');
      }, 2000);

    } catch (err) {
      console.error('File upload failed:', err);
      const displayMessage = err.message || 'אירעה שגיאה לא ידועה';
      
      // עדכון רשומת הקובץ עם פרטי השגיאה
      if (fileRecordId) {
        try {
          await FileUpload.update(fileRecordId, { 
            status: 'failed', 
            analysis_notes: displayMessage,
            error_message: err.message || displayMessage
          });
        } catch (updateError) {
          console.error('Error updating file record:', updateError);
        }
      } else {
        // אם אין fileRecordId, ניצור רשומה חדשה
        try {
          await FileUpload.create({
            filename: file?.name || 'קובץ לא מזוהה',
            file_url: file_url || '',
            file_type: file?.name?.split('.').pop()?.toLowerCase() || 'unknown',
            status: 'failed',
            data_category: selectedCategory || 'unknown',
            analysis_notes: displayMessage,
            error_message: err.message || displayMessage
          });
        } catch (createError) {
          console.error('Error creating failed file record:', createError);
        }
      }
      
      // הודעה ידידותית למשתמש
      toast.error('⚠️ הקובץ לא הועלה בהצלחה\n\nהקובץ הועבר לטיפול מנהל המערכת ונבדק בהקדם.\nתוכל לראות את הסטטוס בעדכונים שיישלחו אליך.');
      setProcessingStatus('הקובץ הועבר לטיפול מנהל המערכת');
      setFinalStatus('error');
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStatus('');
        setFinalStatus(null);
      }, 3000);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInputRef.current.files = files;
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };

  const selectedCategoryObj = FILE_CATEGORIES.find(c => c.value === selectedCategory);
  const SelectedIcon = selectedCategoryObj?.icon || Upload;

  return (
    <div className="space-y-6">
      <Card className="card-horizon border-2 border-horizon-primary/30 bg-gradient-to-br from-horizon-primary/5 to-horizon-secondary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-horizon-text flex items-center gap-3">
            <div className="p-2 bg-horizon-primary/20 rounded-lg">
              <SelectedIcon className="w-6 h-6 text-horizon-primary" />
            </div>
            העלאת מסמך חכמה
          </CardTitle>
          <p className="text-horizon-accent">
            בחר סוג מסמך והעלה - המערכת תנתח אוטומטית
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-horizon-text">סוג המסמך</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר סוג מסמך..." />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
                {FILE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                      className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Name Input (for "other" category) */}
          {selectedCategory === 'other' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-horizon-text">שם/תיאור המסמך</label>
              <Input
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder='לדוגמה: "דוח רכש מספק XYZ" או "תדפיס חשבון בנק"'
                className="bg-horizon-card border-horizon text-horizon-text"
              />
              <p className="text-xs text-horizon-accent">
                המערכת תחפש באינטרנט מידע על המסמך ותנתח אותו בהתאם
              </p>
            </div>
          )}

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xls,.xlsx,.csv,.pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={isUploading || !selectedCategory}
          />
          
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 transition-all ${
              isUploading ? 'border-gray-500 bg-gray-500/5' : 'border-horizon-primary/50 hover:border-horizon-primary hover:bg-horizon-primary/5'
            }`}
          >
            <Button
              onClick={triggerFileSelect}
              disabled={isUploading || !selectedCategory || (selectedCategory === 'other' && !customFileName.trim())}
              className="btn-horizon-primary w-full h-12"
            >
            {isUploading && !finalStatus ? (
              <>
                <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 ml-2" />
                העלה קובץ
              </>
            )}
            </Button>
            <p className="text-xs text-horizon-accent text-center mt-2">או גרור קובץ לכאן</p>
          </div>

          {/* Progress Bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-horizon-card rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    finalStatus === 'error' ? 'bg-red-500' :
                    finalStatus === 'success' ? 'bg-green-500' : 'bg-horizon-primary'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-horizon-accent text-center">{processingStatus}</p>
            </div>
          )}

          {/* Status Messages */}
          {finalStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-400 text-sm justify-center">
              <CheckCircle className="w-4 h-4" />
              {processingStatus}
            </div>
          )}
          
          {finalStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center">
              <XCircle className="w-4 h-4" />
              {processingStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List Section */}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <FileText className="w-5 h-5" />
              קבצים שהועלו ({filteredFiles.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-horizon-accent" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
                    <SelectItem value="all" className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer">
                      כל הסוגים ({files.length})
                    </SelectItem>
                    {[...new Set(files.map(f => f.data_category))].filter(Boolean).map(cat => {
                      const config = {
                        inventory_report: 'דוח מלאי',
                        sales_report: 'דוח מכירות',
                        profit_loss_statement: 'רווח והפסד',
                        balance_sheet: 'מאזן',
                        bank_statement: 'תדפיס בנק',
                        credit_card_report: 'כרטיס אשראי',
                        promotions_report: 'מבצעים',
                        credit_report: 'דוח אשראי',
                        esna_report: 'מע"מ',
                        purchase_document: 'רכש',
                        auto_detect: 'זיהוי אוטומטי',
                        mixed_business_data: 'כללי'
                      };
                      return (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer"
                        >
                          {config[cat] || cat} ({files.filter(f => f.data_category === cat).length})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={loadFiles}
                variant="outline"
                size="sm"
                className="border-horizon text-horizon-text hover:bg-horizon-card"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                רענן
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading && files.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-horizon-card rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-lg bg-horizon-primary/20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-horizon-primary/20" />
                    <Skeleton className="h-3 w-1/2 bg-horizon-primary/20" />
                  </div>
                  <Skeleton className="h-6 w-20 bg-horizon-primary/20" />
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-horizon-accent">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2 text-horizon-text">
                {files.length === 0 ? 'לא הועלו קבצים עדיין' : 'לא נמצאו קבצים מסוננים'}
              </h3>
              <p>{files.length === 0 ? 'העלה קבצים כדי להתחיל לנתח את הנתונים העסקיים שלך' : 'נסה לשנות את הסינון'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="group relative bg-horizon-card rounded-xl border-2 border-horizon hover:border-horizon-primary/50 transition-all p-4 hover:shadow-lg"
                >
                  {/* File Icon & Status */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-horizon-primary/10 rounded-lg">
                      {file.status === 'analyzed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : file.status === 'processing' ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : file.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-horizon-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-horizon-text truncate mb-1">
                        {file.filename}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(file.data_category)}
                        <span className="text-xs text-horizon-accent">
                          {format(new Date(file.created_date), "dd/MM/yyyy HH:mm", { locale: he })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* File Details */}
                  {file.products_count && (
                    <div className="text-sm text-horizon-accent mb-3">
                      📦 {file.products_count} מוצרים
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      className="text-horizon-primary hover:bg-horizon-primary/20 flex-1"
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      צפה
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadFile(file)}
                      className="text-green-400 hover:bg-green-500/20 flex-1"
                      title="הורד קובץ"
                    >
                      <Download className="w-4 h-4 ml-1" />
                      הורד
                    </Button>
                    
                    {file.status === 'analyzed' && file.ai_insights && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowDeeperInsights(file)}
                        className="text-yellow-400 hover:bg-yellow-500/20"
                        title="תובנות נוספות"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-400 hover:bg-red-500/20"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Viewers */}
      {showDataViewer && selectedFile && (
        <FileDataViewer
          file={selectedFile}
          isOpen={showDataViewer}
          onClose={() => {
            setShowDataViewer(false);
            setSelectedFile(null);
          }}
          onAnalysisComplete={loadFiles}
        />
      )}

      {showFinancialReportViewer && financialReportData && (
        <FinancialReportViewer
          reportData={financialReportData}
          isOpen={showFinancialReportViewer}
          onClose={() => {
            setShowFinancialReportViewer(false);
            setFinancialReportData(null);
          }}
        />
      )}

      {showCreditReportViewer && creditReportData && (
        <CreditReportViewer
          reportData={creditReportData}
          isOpen={showCreditReportViewer}
          onClose={() => {
            setShowCreditReportViewer(false);
            setCreditReportData(null);
          }}
        />
      )}

      {showInventoryReportViewer && inventoryReportData && (
        <InventoryReportViewer
          reportData={inventoryReportData}
          isOpen={showInventoryReportViewer}
          onClose={() => {
            setShowInventoryReportViewer(false);
            setInventoryReportData(null);
          }}
        />
      )}

      {showSalesReportViewer && salesReportData && (
        <SalesReportViewer
          reportData={salesReportData}
          isOpen={showSalesReportViewer}
          onClose={() => {
            setShowSalesReportViewer(false);
            setSalesReportData(null);
          }}
        />
      )}

      {showPromotionsReportViewer && promotionsReportData && (
        <PromotionsReportViewer
          reportData={promotionsReportData}
          isOpen={showPromotionsReportViewer}
          onClose={() => {
            setShowPromotionsReportViewer(false);
            setPromotionsReportData(null);
          }}
        />
      )}

      {fileViewerOpen && selectedFileForViewing && (
        <Dialog open={fileViewerOpen} onOpenChange={setFileViewerOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-horizon-text">
                {fileViewerType === 'esna' ? 'דוח מע"מ (ESNA)' : 'צפייה בקובץ'}
              </DialogTitle>
              <DialogDescription className="text-horizon-accent">
                {selectedFileForViewing.filename}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {fileViewerType === 'esna' && (
                <ESNAReportViewer fileData={selectedFileForViewing} />
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setFileViewerOpen(false)} className="btn-horizon-primary">
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showDeeperInsightsModal && fileToAnalyzeDeeper && (
        <DeeperInsightsModal
          isOpen={showDeeperInsightsModal}
          onClose={() => setShowDeeperInsightsModal(false)}
          fileData={fileToAnalyzeDeeper}
          onInsightsUpdated={handleDeeperInsightsUpdated}
        />
      )}
    </div>
  );
}