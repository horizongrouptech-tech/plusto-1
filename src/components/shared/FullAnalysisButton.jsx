
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2 } from "lucide-react";
import { FileUpload } from '@/api/entities';
import { openRouterAPI } from '@/api/integrations';



const bankStatementSchema = {
  type: "object",
  properties: {
    account_summary: {
      type: "object",
      properties: {
        total_available_balance: {"type": "string"},
        report_period: {"type": "string"},
        account_number: {"type": "string"}
      }
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {"type": "string"},
          description: {"type": "string"},
          category: {"type": "string"},
          reference_number: {"type": "string"},
          credit_amount: {"type": "number"},
          debit_amount: {"type": "number"},
          balance: {"type": "number"},
          payment_method: {"type": "string"},
          transaction_type: {"type": "string"}
        }
      }
    }
  }
};

const creditCardSchema = {
  type: "object",
  properties: {
    card_summary: {
      type: "object",
      properties: {
        card_number: {"type": "string"},
        available_credit: {"type": "string"},
        billing_date: {"type": "string"},
        total_amount: {"type": "number"}
      }
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {"type": "string"},
          merchant: {"type": "string"},
          category: {"type": "string"},
          transaction_amount: {"type": "number"},
          billed_amount: {"type": "number"},
          card_type: {"type": "string"},
          installments: {"type": "string"},
          reference_number: {"type": "string"}
        }
      }
    }
  }
};

const schemaMap = {
    'bank_statement': { schema: bankStatementSchema, prompt: 'Analyze the entire bank statement PDF provided and extract all transactions and a full summary according to the provided JSON schema.' },
    'credit_card_report': { schema: creditCardSchema, prompt: 'Analyze the entire credit card statement PDF provided and extract all transactions and a full summary according to the provided JSON schema.' },
};

export default function FullAnalysisButton({ file, onAnalysisComplete }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const isPartialAnalysis = file.parsing_metadata?.analysis_status === 'partial';

    const handleFullAnalysis = async () => {
        if (!file || !isPartialAnalysis) return;

        const analysisConfig = schemaMap[file.data_category];
        if (!analysisConfig) {
            setError("ניתוח מלא אינו נתמך עבור קטגוריית קובץ זו.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const newParsedData = await openRouterAPI({
                prompt: analysisConfig.prompt,
                file_urls: [file.file_url],
                response_json_schema: analysisConfig.schema
            });

            if (!newParsedData) {
                throw new Error("Full analysis returned no data.");
            }

            const newMetadata = {
                ...file.parsing_metadata,
                analysis_status: 'full',
                pages_analyzed: null, // Or try to get a page count if possible
            };

            await FileUpload.update(file.id, {
                parsed_data: newParsedData,
                parsing_metadata: newMetadata,
                status: 'analyzed',
                analysis_notes: 'Full document analysis completed successfully.'
            });

            if (onAnalysisComplete) {
                onAnalysisComplete();
            }
        } catch (err) {
            console.error("Full analysis failed:", err);
            setError(err.message || "אירעה שגיאה במהלך הניתוח המלא.");
            await FileUpload.update(file.id, {
                analysis_notes: `Full analysis failed: ${err.message}`
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!isPartialAnalysis) {
        return null;
    }

    return (
        <div className="my-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>ניתוח חלקי</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <div>
                        <p>הוצג ניתוח של 10 העמודים הראשונים בלבד. לחץ לניתוח מלא של כל המסמך.</p>
                        {error && <p className="text-red-400 mt-2">שגיאה: {error}</p>}
                    </div>
                    <Button onClick={handleFullAnalysis} disabled={isAnalyzing} size="sm" className="btn-horizon-secondary">
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                מנתח...
                            </>
                        ) : (
                            'ניתוח מלא'
                        )}
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
