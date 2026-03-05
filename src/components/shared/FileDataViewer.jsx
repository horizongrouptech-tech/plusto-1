import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles } from "lucide-react";
import ESNAReportViewer from './ESNAReportViewer';
import FinancialReportViewer from './FinancialReportViewer';
import SalesReportViewer from './SalesReportViewer';
import InventoryReportViewer from './InventoryReportViewer';
import PromotionsReportViewer from './PromotionsReportViewer';
import BankStatementViewer from './BankStatementViewer';
import CreditCardReportViewer from './CreditCardReportViewer';
import GenericReportViewer from './GenericReportViewer';
import DeeperInsightsModal from "./DeeperInsightsModal";

export default function FileDataViewer({ isOpen, onClose, file }) {
  const [showDeeperInsightsModal, setShowDeeperInsightsModal] = useState(false);
  const [localFile, setLocalFile] = useState(file);

  useEffect(() => {
    setLocalFile(file);
  }, [file]);

  const handleInsightsUpdated = (updatedFile) => {
    setLocalFile(updatedFile);
  };

  const renderContent = () => {
    switch (localFile?.data_category) {
      case 'esna_report':
        return <ESNAReportViewer fileData={localFile} reportData={localFile.esna_report_data} />;
      case 'profit_loss':
      case 'profit_loss_statement':
      case 'balance_sheet':
        return <FinancialReportViewer fileData={localFile} reportData={localFile.parsed_data || localFile.ai_insights} />;
      case 'sales_report':
        return <SalesReportViewer fileData={localFile} />;
      case 'inventory_report':
        return <InventoryReportViewer fileData={localFile} />;
      case 'promotions_report':
        return <PromotionsReportViewer fileData={localFile} />;
      case 'bank_statement':
         return <BankStatementViewer fileData={localFile} reportData={localFile.parsed_data || localFile.ai_insights} />;
      case 'credit_card_report':
         return <CreditCardReportViewer fileData={localFile} reportData={localFile.parsed_data || localFile.ai_insights} />;
      default:
        return (
          <div>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-horizon-text">תצוגה כללית של קובץ</h3>
                {localFile?.status === 'analyzed' && localFile?.ai_insights && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeeperInsightsModal(true)}
                        className="text-horizon-accent border-horizon-primary/50 hover:text-horizon-primary hover:bg-horizon-primary/10"
                    >
                        <Sparkles className="w-4 h-4 ml-2" /> תובנות נוספות
                    </Button>
                )}
            </div>
            <GenericReportViewer fileData={localFile} />
          </div>
        );
    }
  };

  if (!isOpen || !localFile) return null;

  // בדוק אם זה קובץ שצריך להופיע בדיאלוג בלבד (מודאל)
  const isModalOnly = ['pdf', 'image/jpeg', 'image/png'].some(type => 
    localFile?.file_type?.includes(type) || localFile?.file_url?.includes(type)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-horizon-primary" />
            {localFile?.filename}
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            קטגוריה: {localFile?.data_category || "לא זוהה"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          {renderContent()}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="border-horizon text-horizon-accent hover:bg-horizon-card">סגור</Button>
        </DialogFooter>
      </DialogContent>
      {showDeeperInsightsModal && localFile && (
          <DeeperInsightsModal
              isOpen={showDeeperInsightsModal}
              onClose={() => setShowDeeperInsightsModal(false)}
              fileData={localFile}
              onInsightsUpdated={handleInsightsUpdated}
          />
      )}
    </Dialog>
  );
}