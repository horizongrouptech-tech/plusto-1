import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Filter,
  Package
} from "lucide-react";

import SmartFileUploader from "../upload/SmartFileUploader";
import FileDataViewer from "./FileDataViewer";
import { FinancialReportViewer } from "../shared/FinancialReportViewer";
import CreditReportViewer from "../shared/CreditReportViewer";
import InventoryReportViewer from "../shared/InventoryReportViewer";
import SalesReportViewer from "../shared/SalesReportViewer";
import PromotionsReportViewer from "../shared/PromotionsReportViewer";
import ESNAReportViewer from '../shared/ESNAReportViewer';
import TaxAssessmentViewer from '../shared/TaxAssessmentViewer';
import DeeperInsightsModal from "../shared/DeeperInsightsModal";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { toast } from "sonner";
import { FileUpload } from '@/api/entities';
import { parseZReport } from '@/api/functions';
export default function CustomerFileUploadManager({ customer, isAdmin = false }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [selectedFile, setSelectedFile] = useState(null);
  const [showDataViewer, setShowDataViewer] = useState(false);
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
  const [showTaxAssessmentViewer, setShowTaxAssessmentViewer] = useState(false);
  const [taxAssessmentData, setTaxAssessmentData] = useState(null);
  const [selectedFileForViewing, setSelectedFileForViewing] = useState(null);
  const [fileViewerType, setFileViewerType] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [showDeeperInsightsModal, setShowDeeperInsightsModal] = useState(false);
  const [fileToAnalyzeDeeper, setFileToAnalyzeDeeper] = useState(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedFiles = await FileUpload.filter({
        customer_email: customer.email
      }, '-created_date');
      setFiles(fetchedFiles);
    } catch (error) {
      console.error("Error loading uploaded files:", error);
      setError('שגיאה בטעינת קבצים: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (customer?.email) {
      loadFiles();
    }
  }, [customer, loadFiles]);

  const filteredFiles = files.filter(file => {
    return categoryFilter === 'all' || file.data_category === categoryFilter;
  });

  const handleDownloadFile = (file) => {
    if (file.file_url) {
      window.open(file.file_url, '_blank');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) return;
    try {
      await FileUpload.delete(fileId);
      await loadFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error('שגיאה במחיקת הקובץ');
      setError('שגיאה במחיקת הקובץ: ' + error.message);
    }
  };

  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileToView, setFileToView] = useState(null);

  const handleViewFile = (file) => {
    // אם יש viewer מיוחד - השתמש בו
    if (file.ai_insights && (file.data_category === 'profit_loss' || file.data_category === 'profit_loss_statement' || file.data_category === 'balance_sheet')) {
      setFinancialReportData(file.ai_insights);
      setShowFinancialReportViewer(true);
      setShowDataViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'credit_report' && file.ai_insights) {
      setCreditReportData(file.ai_insights);
      setShowCreditReportViewer(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'inventory_report' && file.ai_insights) {
      setInventoryReportData(file.ai_insights);
      setShowInventoryReportViewer(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'sales_report' && file.ai_insights) {
      setSalesReportData(file.ai_insights);
      setShowSalesReportViewer(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'promotions_report' && file.ai_insights) {
      setPromotionsReportData(file.ai_insights);
      setShowPromotionsReportViewer(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowTaxAssessmentViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'tax_assessment' && file.ai_insights) {
      setTaxAssessmentData(file.ai_insights);
      setShowTaxAssessmentViewer(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
    } else if (file.data_category === 'esna_report') {
      setSelectedFileForViewing(file);
      setFileViewerType('esna');
      setFileViewerOpen(true);
      setShowDataViewer(false);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
      setSelectedFile(null);
      return;
    } else if (file.file_url) {
      // פתיחת קובץ במערכת
      setFileToView(file);
      setShowFileViewer(true);
    } else {
      setSelectedFile(file);
      setShowDataViewer(true);
      setFinancialReportData(null);
      setShowFinancialReportViewer(false);
      setShowCreditReportViewer(false);
      setShowInventoryReportViewer(false);
      setShowSalesReportViewer(false);
      setShowPromotionsReportViewer(false);
    }
  };

  const handleShowDeeperInsights = (file) => {
    setFileToAnalyzeDeeper(file);
    setShowDeeperInsightsModal(true);
  };

  const handleDeeperInsightsUpdated = (updatedFile) => {
    setFiles(prevFiles => prevFiles.map(f => f.id === updatedFile.id ? updatedFile : f));
    setFileToAnalyzeDeeper(updatedFile);
  };

  const getCategoryBadge = (category) => {
    const categoryConfig = {
      inventory_report: { text: 'מלאי', color: 'bg-blue-500' },
      sales_report: { text: 'מכירות', color: 'bg-green-500' },
      profit_loss: { text: 'רוו"ה', color: 'bg-purple-500' },
      profit_loss_statement: { text: 'רוו"ה', color: 'bg-purple-500' },
      balance_sheet: { text: 'מאזן', color: 'bg-indigo-500' },
      bank_statement: { text: 'בנק', color: 'bg-gray-600' },
      credit_card_report: { text: 'כא"ש', color: 'bg-red-500' },
      promotions_report: { text: 'מבצעים', color: 'bg-pink-500' },
      credit_report: { text: 'דוח אשראי', color: 'bg-teal-500' },
      mixed_business_data: { text: 'כללי', color: 'bg-gray-500' },
      auto_detect: { text: 'זיהוי אוטומטי', color: 'bg-yellow-600' },
      esna_report: { text: 'מע"מ', color: 'bg-orange-500' },
      purchase_document: { text: 'רכש', color: 'bg-cyan-500' },
      tax_assessment: { text: 'שומה', color: 'bg-purple-600' },
      general_document: { text: 'מסמך כללי', color: 'bg-gray-500' },
      loan_schedule: { text: 'לוח סילוקין', color: 'bg-indigo-600' },
      tender_document: { text: 'מכרז', color: 'bg-amber-600' },
      whatsapp_screenshot: { text: 'צילום מסך', color: 'bg-green-600' }
    };
    const config = categoryConfig[category] || { text: category, color: 'bg-gray-500' };
    return (
      <Badge variant="outline" className={`${config.color} text-white border-0`}>
        {config.text}
      </Badge>
    );
  };

  const availableCategories = [...new Set(files.map(f => f.data_category))].filter(Boolean);

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <Upload className="w-6 h-6 text-horizon-primary" />
            העלאת מסמכים עסקיים - {customer?.business_name || customer?.full_name}
          </CardTitle>
          <p className="text-horizon-accent">
            בחר את סוג המסמך והעלה לניתוח אוטומטי חכם
          </p>
        </CardHeader>
      </Card>

      <SmartFileUploader 
        customerEmail={customer.email} 
        onUploadComplete={loadFiles}
      />

      <Card className="card-horizon">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <FileText className="w-5 h-5" />
              קבצים שהועלו ({filteredFiles.length})
            </CardTitle>
            <div className="flex items-center gap-3">
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
                    {availableCategories.map(cat => {
                      const count = files.filter(f => f.data_category === cat).length;
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
                        mixed_business_data: 'כללי',
                        tax_assessment: 'שומת מס',
                        general_document: 'מסמך כללי',
                        loan_schedule: 'לוח סילוקין',
                        tender_document: 'מכרז',
                        whatsapp_screenshot: 'צילום מסך'
                      };
                      return (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          className="text-horizon-text hover:bg-horizon-primary/20 cursor-pointer"
                        >
                          {config[cat] || cat} ({count})
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

                  {file.products_count && (
                    <div className="text-sm text-horizon-accent mb-3">
                      📦 {file.products_count} מוצרים
                    </div>
                  )}

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
                    
                    {/* כפתור ייבוא Z-report לקטלוג */}
                    {(file.data_category === 'sales_report' || file.filename?.toLowerCase().includes('z') || file.filename?.toLowerCase().includes('z-report')) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await parseZReport({
                              fileUrl: file.file_url,
                              customerEmail: customer.email,
                              importToCatalog: true
                            });
                            if (response.data?.success) {
                              toast.info(`נוספו ${response.data.products?.length || 0} מוצרים לקטלוג`);
                            }
                          } catch (error) {
                            console.error('Error importing Z report to catalog:', error);
                            toast.error('שגיאה בייבוא לקטלוג');
                          }
                        }}
                        className="text-purple-400 hover:bg-purple-500/20"
                        title="ייבא לקטלוג"
                      >
                        <Package className="w-4 h-4 ml-1" />
                        ייבא לקטלוג
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

      {showTaxAssessmentViewer && taxAssessmentData && (
        <TaxAssessmentViewer
          reportData={taxAssessmentData}
          isOpen={showTaxAssessmentViewer}
          onClose={() => {
            setShowTaxAssessmentViewer(false);
            setTaxAssessmentData(null);
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

      {/* מודל צפייה בקובץ */}
      {showFileViewer && fileToView && (
        <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
          <DialogContent className="max-w-6xl max-h-[90vh] bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-horizon-text">{fileToView.filename}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {fileToView.file_url && (
                <div className="w-full h-[70vh]">
                  {fileToView.file_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={fileToView.file_url} 
                      className="w-full h-full border border-horizon rounded"
                      title={fileToView.filename}
                    />
                  ) : fileToView.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img 
                      src={fileToView.file_url} 
                      alt={fileToView.filename}
                      className="max-w-full max-h-full mx-auto"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-horizon-accent">תצוגה מקדימה לא זמינה. לחץ על "הורד" להוריד את הקובץ.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}