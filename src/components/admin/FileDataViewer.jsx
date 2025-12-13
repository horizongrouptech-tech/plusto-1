import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- ייבוא נכון של כל רכיבי התצוגה מקבצים ספציפיים ---
import BankStatementViewer from '@/components/shared/BankStatementViewer';
import CreditCardReportViewer from '@/components/shared/CreditCardReportViewer';
import ProfitLossViewer from '@/components/shared/ProfitLossViewer';
import BalanceSheetViewer from '@/components/shared/BalanceSheetViewer';
import InventoryReportViewer from '@/components/shared/InventoryReportViewer';
import SalesReportViewer from '@/components/shared/SalesReportViewer';
import PromotionsReportViewer from '@/components/shared/PromotionsReportViewer';
import GenericReportViewer from '@/components/shared/GenericReportViewer';
import TaxAssessmentViewer from '@/components/shared/TaxAssessmentViewer';
// שינוי כאן
// מפה לניתוב דינמי לרכיב התצוגה המתאים
const viewerMap = {
  tax_assessment: TaxAssessmentViewer,
  bank_statement: BankStatementViewer,
  credit_card_report: CreditCardReportViewer,
  profit_loss: ProfitLossViewer,
  profit_loss_statement: ProfitLossViewer, // הוסף את זה
  balance_sheet: BalanceSheetViewer,
  inventory_report: InventoryReportViewer,
  sales_report: SalesReportViewer,
  promotions_report: PromotionsReportViewer,
};

export default function FileDataViewer({ file, isOpen, onClose, onAnalysisComplete }) {
  if (!isOpen || !file) {
    return null;
  }

  const { data_category, filename, parsed_data, analysis_notes, status } = file;

  // בחירת רכיב התצוגה המתאים, עם fallback לרכיב גנרי
  const ViewerComponent = viewerMap[data_category] || GenericReportViewer;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[90vw] h-[90vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon">
        <DialogHeader className="pr-6 pt-6 pl-14 text-right flex-shrink-0">
          <DialogTitle className="text-2xl text-horizon-text">{filename}</DialogTitle>
          <DialogDescription className="text-horizon-accent">
            תצוגה מפורטת של נתוני הקובץ
          </DialogDescription>
          <button onClick={onClose} className="absolute top-4 left-4 text-horizon-accent hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-hidden px-6 pb-6 mt-4">
          <ScrollArea className="h-full">
            {status === 'failed' && (
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-semibold text-red-400">ניתוח הקובץ נכשל</h3>
                    <p className="text-horizon-accent mt-2">{analysis_notes || 'שגיאה לא ידועה'}</p>
                </div>
            )}

            {status === 'processing' && (
                <div className="text-center p-8">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-horizon-primary" />
                    <h3 className="text-lg font-semibold text-horizon-primary">הקובץ עדיין בתהליך עיבוד...</h3>
                    <p className="text-horizon-accent mt-2">נא לרענן את רשימת הקבצים בעוד מספר רגעים.</p>
                </div>
            )}
            
            {status === 'analyzed' && (parsed_data || file.ai_insights) ? (
              <ViewerComponent 
                file={file} 
                reportData={file.ai_insights || parsed_data} 
                fileData={file.ai_insights || parsed_data} // For GenericReportViewer compatibility
                onAnalysisComplete={onAnalysisComplete} 
              />           
            ) : status === 'analyzed' && !parsed_data && !file.ai_insights ? (
                 <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-yellow-400">לא נמצאו נתונים לניתוח</h3>
                    <p className="text-horizon-accent mt-2">{analysis_notes || 'ייתכן שהקובץ ריק או שהפורמט אינו נתמך.'}</p>
                </div>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}