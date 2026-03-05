import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FileQuestion
} from "lucide-react";






import { toast } from "sonner";
import { parseXlsx, processESNAReport, processPurchaseDocument, processSmartDocument } from '@/api/functions';
import { FileUpload } from '@/api/entities';
import { openRouterAPI, UploadFile } from '@/api/integrations';

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

// JSON Schemas - copied from SpecificFileUploadBox
const bankStatementSchema = {
  type: "object",
  properties: {
    account_summary: {
      type: "object",
      properties: {
        total_available_balance: { type: "string" },
        report_period: { type: "string" },
        account_number: { type: "string" },
        total_deposits: { type: "number" },
        total_withdrawals: { type: "number" },
        net_change: { type: "number" }
      },
      required: ["report_period", "account_number", "total_deposits", "total_withdrawals", "net_change"]
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          credit_amount: { type: "number" },
          debit_amount: { type: "number" },
          balance: { type: "number" }
        },
        required: ["date", "description", "balance"]
      }
    },
    key_insights: {
        type: "array",
        description: "Provide 3-5 key insights from the bank statement in Hebrew.",
        items: { type: "string" }
    },
    risk_flags: {
        type: "array",
        description: "List any potential financial risks or red flags observed, in Hebrew (e.g., large unexpected expenses, low balance).",
        items: { type: "string" }
    },
    top_expenses: {
        type: "array",
        description: "List the top 5 largest expenses (debits) from the statement.",
        items: {
            type: "object",
            properties: {
                description: { type: "string" },
                amount: { type: "number" }
            },
            required: ["description", "amount"]
        }
    }
  },
  required: ["account_summary", "transactions", "key_insights", "risk_flags", "top_expenses"]
};

const creditCardSchema = {
  type: "object",
  properties: {
    card_summary: {
      type: "object",
      properties: {
        card_number: { type: "string" },
        billing_date: { type: "string" },
        total_amount: { type: "number" }
      },
      required: ["card_number", "billing_date", "total_amount"]
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          merchant: { type: "string" },
          category: {type: "string"},
          billed_amount: { type: "number" }
        },
        required: ["date", "merchant", "billed_amount"]
      }
    },
    key_insights: {
        type: "array",
        description: "Provide 3-5 key spending insights from the credit card statement in Hebrew (e.g., spending trends, unusual charges).",
        items: { type: "string" }
    },
    top_spending_categories: {
        type: "array",
        description: "List the top 3-5 spending categories and their total amounts.",
        items: {
            type: "object",
            properties: {
                category: { type: "string" },
                total_amount: { type: "number" }
            },
            required: ["category", "amount"]
        }
    }
  },
  required: ["card_summary", "transactions", "key_insights", "top_spending_categories"]
};

const detailedBalanceSheetSchema = {
  type: "object",
  properties: {
    report_metadata: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        report_type: { type: "string" },
        generated_date: { type: "string" },
        period: {
          type: "object",
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            period_type: { type: "string" },
            period_description: { type: "string" }
          },
          required: ["start_date", "end_date", "period_type"]
        },
        currency: { type: "string" },
        report_version: { type: "number" }
      },
      required: ["company_name", "report_type", "generated_date", "period", "currency"]
    },
    financial_summary: {
      type: "object",
      properties: {
        total_revenue: {
          type: "object",
          properties: {
            amount: { type: "number" },
            account_code: { type: "string" },
            account_name: { type: "string" },
            category: { type: "string" }
          },
          required: ["amount"]
        },
        total_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            breakdown: {
              type: "object",
              properties: {
                cost_of_goods_sold: { type: "number" },
                operating_expenses: { type: "number" },
                vehicle_expenses: { type: "number" },
                salary_expenses: { type: "number" },
                financing_expenses: { type: "number" }
              }
            }
          },
          required: ["amount"]
        },
        net_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            profit_margin_percentage: { type: "number" }
          },
          required: ["amount"]
        }
      },
      required: ["total_revenue", "total_expenses", "net_profit"]
    },
    revenue_breakdown: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          accounts: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                percentage_of_total: { type: "number" }
              },
              required: ["name", "amount"]
            }
          },
          group_total: { type: "number" }
        },
        required: ["group_name", "accounts", "group_total"]
      }
    },
    expense_breakdown: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          accounts: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                percentage_of_revenue: { type: "number" },
                note: { type: "string" }
              },
              required: ["name", "amount"]
            }
          },
          group_total: { type: "number" },
          percentage_of_revenue: { type: "number" }
        },
        required: ["group_name", "accounts", "group_total"]
      }
    },
    profitability_ratios: {
      type: "object",
      properties: {
        gross_profit_margin: { type: "number" },
        net_profit_margin: { type: "number" },
        operating_profit_margin: { type: "number" }
      }
    },
    key_insights: {
      type: "array",
      items: { type: "string" }
    },
    alerts_and_insights: {
      type: "object",
      properties: {
        positive_trends: { type: "array", items: { type: "string" } },
        areas_for_attention: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["report_metadata", "financial_summary"]
};

const detailedProfitLossSchema = {
  type: "object",
  properties: {
    report_metadata: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        company_id: { type: "string" },
        report_type: { type: "string" },
        generated_date: { type: "string" },
        period: {
          type: "object",
          properties: {
            start_date: { type: "string" },
            end_date: { type: "string" },
            period_type: { type: "string" },
            months_count: { type: "number" },
            period_description: { type: "string" }
          },
          required: ["start_date", "end_date", "period_type"]
        },
        tax_year: { type: "number" },
        currency: { type: "string" },
        report_version: { type: "number" }
      },
      required: ["company_name", "report_type", "generated_date", "period", "currency"]
    },
    financial_summary: {
      type: "object",
      properties: {
        total_revenue: {
          type: "object",
          properties: {
            amount: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        cost_of_goods_sold: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        gross_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        total_salary_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        general_admin_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        financing_expenses: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        operating_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        },
        net_profit: {
          type: "object",
          properties: {
            amount: { type: "number" },
            percentage_of_revenue: { type: "number" },
            monthly_average: { type: "number" },
            annualized_projection: { type: "number" }
          },
          required: ["amount"]
        }
      },
      required: [
        "total_revenue", "cost_of_goods_sold", "gross_profit",
        "total_salary_expenses", "general_admin_expenses",
        "financing_expenses", "operating_profit", "net_profit"
      ]
    },
    revenue_analysis: {
      type: "object",
      properties: {
        revenue_streams: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_total: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        revenue_trends: {
          type: "object",
          properties: {
            monthly_run_rate: { type: "number" },
            projected_annual_revenue: { type: "number" },
            daily_average: { type: "number" }
          }
        }
      },
      required: ["revenue_streams"]
    },
    cost_structure_analysis: {
      type: "object",
      properties: {
        cost_of_goods_sold: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        salary_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" },
              note: { type: "string" }
            },
            required: ["name", "amount"]
          }
        },
        general_admin_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        },
        financing_breakdown: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              percentage_of_revenue: { type: "number" }
            },
            required: ["name", "amount"]
          }
        }
      }
    },
    profitability_ratios: {
      type: "object",
      properties: {
        gross_margin: { type: "number" },
        operating_margin: { type: "number" },
        net_margin: { type: "number" },
        cost_efficiency_ratio: { type: "number" }
      }
    },
    annual_projections: {
      type: "object",
      properties: {
        projected_revenue: { type: "number" },
        projected_cogs: { type: "number" },
        projected_gross_profit: { type: "number" },
        projected_net_profit: { type: "number" }
      }
    },
    expense_efficiency_analysis: {
      type: "object",
      properties: {
        salary_to_revenue_ratio: { type: "number" },
        admin_to_revenue_ratio: { type: "number" },
        financing_cost_ratio: { type: "number" },
        total_opex_ratio: { type: "number" }
      }
    },
    key_performance_indicators: {
      type: "object",
      properties: {
        monthly_burn_rate: { type: "number" },
        break_even_revenue: { type: "number" },
        revenue_per_employee: { type: "number" }
      }
    },
    alerts_and_insights: {
      type: "object",
      properties: {
        cost_alerts: { type: "array", items: { type: "string" } },
        efficiency_insights: { type: "array", items: { type: "string" } },
        growth_opportunities: { type: "array", items: { type: "string" } },
        risk_factors: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["report_metadata", "financial_summary"]
};

const creditReportSchema = {
  "type": "object",
  "properties": {
    "reportMeta": {
      "type": "object",
      "properties": {
        "subjectFullName": { "type": "string" },
        "nationalId": { "type": "string" },
        "customerType": { "type": "string" },
        "dataCollectionStartDate": { "type": "string" },
        "reportIssueDate": { "type": "string" },
        "sourceSystem": { "type": "string", "default": "BankOfIsraelCreditData" }
      },
      "required": ["subjectFullName", "nationalId", "reportIssueDate"]
    },
    "summary": {
      "type": "object",
      "properties": {
        "totalDebtILS": {"type": "number"},
        "totalDebtExMortgageILS": {"type": "number"},
        "totalLoansCount": {"type": "integer"},
        "totalActiveDealsCount": {"type": "integer"},
        "totalGuaranteeDealsCount": {"type": "integer"},
        "totalGuaranteeExposureILS": {"type": "number"},
        "lenders": {"type": "array", "items": {"type": "string"}}
      }
    },
    "currentAccounts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bankName": {"type": "string"},
          "dealId": {"type": "string"},
          "branchNumber": {"type": "string"},
          "accountType": {"type": "string"},
          "isGuarantor": {"type": "boolean"},
          "creditLimit": {"type": "number"},
          "currentBalance": {"type": "number"},
          "notPaidOnTime": {"type": "number"},
          "status": {"type": "string"},
          "currency": {"type": "string"},
          "lastUpdateDate": {"type": "string"},
          "interestRates": {"type": "array", "items": {"type": "object"}},
          "checksReturned": {"type": "object"},
          "directDebitReturned": {"type": "object"}
        }
      }
    },
    "loans": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bankName": {"type": "string"},
          "dealId": {"type": "string"},
          "branchNumber": {"type": "string"},
          "loanType": {"type": "string"},
          "isGuarantor": {"type": "boolean"},
          "guarantorLevel": {"type": "string"},
          "originalPrincipal": {"type": "number"},
          "currentBalance": {"type": "number"},
          "monthlyPayment": {"type": "number"},
          "paymentType": {"type": "string"},
          "status": {"type": "string"},
          "purpose": {"type": "string"},
          "currency": {"type": "string"},
          "startDate": {"type": "string"},
          "plannedEndDate": {"type": "string"},
          "lastPaymentDate": {"type": "string"},
          "lastUpdateDate": {"type": "string"},
          "interestTracks": {"type": "array", "items": {"type": "object"}},
          "collateral": {"type": "array", "items": {"type": "object"}}
        }
      }
    },
    "mortgages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bankName": {"type": "string"},
          "dealId": {"type": "string"},
          "branchNumber": {"type": "string"},
          "originalPrincipal": {"type": "number"},
          "currentBalance": {"type": "number"},
          "monthlyPayment": {"type": "number"},
          "paymentType": {"type": "string"},
          "status": {"type": "string"},
          "purpose": {"type": "string"},
          "startDate": {"type": "string"},
          "plannedEndDate": {"type": "string"},
          "lastUpdateDate": {"type": "string"},
          "interestTracks": {"type": "array", "items": {"type": "object"}},
          "collateral": {"type": "array", "items": {"type": "object"}}
        }
      }
    },
    "guarantees": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bankName": {"type": "string"},
          "dealId": {"type": "string"},
          "guaranteeAmount": {"type": "number"},
          "status": {"type": "string"},
          "startDate": {"type": "string"},
          "endDate": {"type": "string"},
          "relatedCorporation": {"type": "string"}
        }
      }
    },
    "creditInquiries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "inquiryDate": {"type": "string"},
          "inquirer": {"type": "string"},
          "purpose": {"type": "string"}
        }
      }
    },
    "analysis": {
      "type": "object",
      "properties": {
        "riskScore": { "type": "integer", "minimum": 1, "maximum": 10 },
        "creditUtilization": {"type": "number"},
        "totalChecksReturned": {"type": "integer"},
        "totalDirectDebitReturned": {"type": "integer"},
        "guarantorExposure": {"type": "number"},
        "strengths": { "type": "array", "items": { "type": "string" } },
        "weaknesses": { "type": "array", "items": { "type": "string" } },
        "recommendations": { "type": "array", "items": { "type": "string" } },
        "redFlags": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["riskScore", "strengths", "weaknesses", "recommendations"]
    }
  },
  "required": ["reportMeta", "summary", "analysis"]
};

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
        },
        required: ["product_name"]
      }
    },
    summary: {
      type: "object",
      properties: {
        total_inventory_value: { type: "number" },
        total_products_count: { type: "number" },
        unique_categories_count: { type: "number" },
        average_profit_margin: { type: "number" }
      },
      required: ["total_inventory_value", "total_products_count"]
    },
    key_insights: {
      type: "array",
      items: { type: "string" }
    },
    actionable_recommendations: {
      type: "array",
      items: { type: "string" }
    },
    problematic_products: {
      type: "object",
      properties: {
        low_stock: { type: "array", items: { type: "string" } },
        overstock: { type: "array", items: { type: "string" } },
        dead_stock: { type: "array", items: { type: "string" } },
        negative_margin: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["extracted_products", "summary", "key_insights", "actionable_recommendations"]
};

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
        },
        required: ["product_name", "items_sold", "revenue"]
      }
    },
    summary: {
      type: "object",
      properties: {
        total_revenue: { type: "number" },
        total_items_sold: { type: "number" },
        average_profit_margin: { type: "number" },
        unique_products_sold: { type: "number" }
      },
      required: ["total_revenue", "total_items_sold"]
    },
    top_selling_products: { type: "array", items: { type: "object" } },
    top_profitable_products: { type: "array", items: { type: "object" } },
    sales_by_category: { type: "array", items: { type: "object" } },
    key_insights: { type: "array", items: { type: "string" } },
    actionable_recommendations: { type: "array", items: { type: "string" } }
  },
  required: ["products_sales", "summary", "key_insights", "actionable_recommendations"]
};

const promotionsReportSchema = {
  type: "object",
  properties: {
    promotions: { type: "array", items: { type: "object" } },
    summary: {
      type: "object",
      properties: {
        total_promotions: { type: "number" },
        active_promotions: { type: "number" },
        inactive_promotions: { type: "number" },
        average_stores_per_promotion: { type: "number" },
        most_common_promotion_type: { type: "string" }
      },
      required: ["total_promotions", "active_promotions"]
    },
    promotion_types_breakdown: { type: "array", items: { type: "object" } },
    seasonal_analysis: { type: "object" }
  },
  required: ["promotions", "summary"]
};

export default function SmartFileUploader({ customerEmail, onUploadComplete }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [finalStatus, setFinalStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
    let analysisNotes = '';
    const category = selectedCategory;

    try {
      const { file_url } = await UploadFile({ file: file });
      if (!file_url) {
        throw new Error('Failed to get file URL from upload.');
      }

      setUploadProgress(30);
      setProcessingStatus('יוצר רשומת קובץ...');

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
      setProcessingStatus('מפענח ומנתח את הקובץ...');

      let parseResult;
      let finalMetadata = {};

      // Handle "other" category (Smart Routing)
      if (category === 'other') {
        setProcessingStatus('מנתח את סוג המסמך ומפענח נתונים באמצעות AI...');
        
        // Call the new smart router function
        const { data: smartResult, error: smartError } = await processSmartDocument({
          file_url,
          file_name: customFileName,
          customer_email: customerEmail,
          file_id: fileRecordId
        });

        if (smartError || !smartResult || !smartResult.success) {
             throw new Error(smartError?.message || 'ניתוח חכם נכשל');
        }

        // Update the file record with the smart analysis results
        // We save the result in parsed_data so it can be viewed later
        // Prepare update data
        const updateData = {
            status: 'analyzed',
            data_category: smartResult.category,
            analysis_notes: `Smart analysis detected type: ${smartResult.category}`
        };

        // If it's a tax assessment, we must save to ai_insights for the viewer to work
        if (smartResult.category === 'tax_assessment') {
            updateData.ai_insights = smartResult.data;
            updateData.parsed_data = null; // Clear parsed_data to avoid confusion in generic viewer
        } else {
            updateData.parsed_data = smartResult.data;
        }

        await FileUpload.update(fileRecordId, updateData);

        setUploadProgress(100);
        setProcessingStatus('ניתוח חכם הושלם בהצלחה!');
        setFinalStatus('success');

        if (onUploadComplete) {
          onUploadComplete();
        }

        setTimeout(() => {
          setSelectedCategory('');
          setCustomFileName('');
        }, 2000);
        
        return;
      }

      // Handle ESNA report
      if (category === 'esna_report') {
        setProcessingStatus('מעבד דוח מע"מ (ESNA)...');

        const { data: processResult, error: processError } = await processESNAReport({
          file_url: file_url,
          customer_email: customerEmail,
          file_id: fileRecordId
        });

        if (processError || !processResult || !processResult.success) {
          throw new Error(processError?.message || processResult?.error || 'עיבוד דוח מע"מ נכשל');
        }

        setProcessingStatus('דוח מע"מ עובד בהצלחה!');
        setUploadProgress(100);
        setFinalStatus('success');
        
        if (onUploadComplete) {
          onUploadComplete();
        }

        setTimeout(() => {
          setSelectedCategory('');
          setCustomFileName('');
        }, 2000);
        
        return;
      }

      // Handle purchase document
      if (category === 'purchase_document') {
        setProcessingStatus('מעבד מסמך רכש...');

        await processPurchaseDocument({
          file_url: file_url,
          customer_email: customerEmail,
          file_id: fileRecordId,
          supplier_id: null
        });

        setProcessingStatus('מסמך רכש עובד בהצלחה!');
        setUploadProgress(100);
        setFinalStatus('success');
        
        if (onUploadComplete) {
          onUploadComplete();
        }

        setTimeout(() => {
          setSelectedCategory('');
          setCustomFileName('');
        }, 2000);
        
        return;
      }

      // XLSX/CSV files - exact copy from SpecificFileUploadBox
      if (['xls', 'xlsx', 'csv'].includes(fileType)) {
        if (category === 'inventory_report') {
          setProcessingStatus('מפענח ומנתח דוח מלאי באמצעות AI...');

          const { data: parsedXlsxResponse } = await parseXlsx({ fileUrl: file_url });
          const raw_data = parsedXlsxResponse?.data?.raw_data;

          if (!raw_data || raw_data.length === 0) {
            throw new Error('לא הצלחנו לקרוא נתונים מהקובץ או שהקובץ ריק.');
          }

          const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

          const inventoryPrompt = `
אתה אנליסט עסקי ומומחה פיננסי עם התמחות בקמעונאות. משימתך היא לנתח את נתוני דוח המלאי הגולמיים המצורפים ולחלץ מהם נתונים ותובנות עסקיות.

**הנתונים הגולמיים:**
הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

**משימותיך:**
1.  **זיהוי כותרות:** סרוק את 5-10 השורות הראשונות כדי לזהות את שורת הכותרת האמיתית.
2.  **חילוץ נתונים (extracted_products):** עבור על כל שורת נתונים וחלץ את המידע.
3.  **חישוב סיכום (summary):** חשב את סיכום הנתונים המספרי.
4.  **הפקת תובנות (key_insights):** ספק 3-5 תובנות מפתח עסקיות בעברית.
5.  **המלצות לפעולה (actionable_recommendations):** ספק 3-5 המלצות קונקרטיות בעברית.
6.  **זיהוי מוצרים בעייתיים (problematic_products):** זהה מוצרים עם מלאי נמוך/עודף.

**נתוני האקסל הגולמיים:**
${rawDataForPrompt}
          `;

          parseResult = await openRouterAPI({
            prompt: inventoryPrompt,
            response_json_schema: inventoryAnalysisSchema
          });

          finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
          analysisNotes = "Successfully analyzed inventory report using AI-First parsing.";

        } else if (category === 'sales_report') {
          setProcessingStatus('מפענח ומנתח דוח מכירות באמצעות AI...');

          const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
          const raw_data = parsedResult?.data?.raw_data;

          if (!raw_data || raw_data.length === 0) {
            throw new Error('לא הצלחנו לקרוא נתונים מדוח המכירות.');
          }

          const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

          const salesPrompt = `
אתה אנליסט מכירות ומומחה עסקי. נתח את נתוני דוח המכירות הגולמיים.

**נתוני האקסל:**
${rawDataForPrompt}

חלץ מוצרים, חשב סיכומים, זהה מובילים, ותן תובנות והמלצות בעברית.
          `;

          parseResult = await openRouterAPI({
            prompt: salesPrompt,
            response_json_schema: salesReportSchema
          });

          finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
          analysisNotes = "Successfully analyzed sales report using AI-First parsing.";

        } else if (category === 'promotions_report') {
          setProcessingStatus('מפענח ומנתח דוח מבצעים באמצעות AI...');

          const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
          const raw_data = parsedResult?.data?.raw_data;

          if (!raw_data || raw_data.length === 0) {
            throw new Error('לא הצלחנו לקרוא נתונים מדוח המבצעים.');
          }

          const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

          const promotionsPrompt = `
אתה אנליסט שיווק. נתח דוח מבצעים.

**נתוני האקסל:**
${rawDataForPrompt}

חלץ מבצעים, חשב סיכומים, ותן תובנות בעברית.
          `;

          parseResult = await openRouterAPI({
            prompt: promotionsPrompt,
            response_json_schema: promotionsReportSchema
          });

          finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
          analysisNotes = "Successfully analyzed promotions report using AI-First parsing.";

        } else if (category === 'balance_sheet') {
          setProcessingStatus('מפענח ומנתח מאזן באמצעות AI...');

          const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
          const raw_data = parsedResult?.data?.raw_data;

          if (!raw_data || raw_data.length === 0) {
            throw new Error('לא הצלחנו לקרוא נתונים ממאזן הבוחן.');
          }

          const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

          const balanceSheetPrompt = `
אתה אנליסט פיננסי מומחה. משימתך היא לנתח מאזן בוחן (Trial Balance) ישראלי ולחלץ ממנו נתונים פיננסיים מובנים.

**מבנה מאזן בוחן:**
מאזן בוחן מכיל את כל החשבונות של העסק עם יתרות חובה וזכות:
- **קבוצה 100-199**: נכסים (בנקים, הלוואות, כרטיסי אשראי, קופות, רכוש קבוע)
- **קבוצה 200-299**: לקוחות וחייבים
- **קבוצה 300-399**: ספקים וזכאים
- **קבוצה 400-499**: מוסדות (מע"מ, מס הכנסה, ניכויים)
- **קבוצה 500-599**: עובדים ושכר
- **קבוצה 600-699**: הכנסות (בזכות)
- **קבוצה 700-899**: הוצאות (בחובה)
- **קבוצה 900-999**: הוצאות/הכנסות מימון

**חישובי רווחיות - קריטי:**
לאחר חילוץ ההכנסות וההוצאות, חשב את יחסי הרווחיות כך:
1. **רווח גולמי** = הכנסות - עלות המכר
2. **רווח תפעולי** = רווח גולמי - הוצאות תפעוליות
3. **רווח נקי** = רווח תפעולי - הוצאות מימון + הכנסות מימון

**אחוזי רווחיות - חשוב מאוד:**
- gross_margin = (רווח גולמי / סך הכנסות) × 100
- operating_margin = (רווח תפעולי / סך הכנסות) × 100
- net_margin = (רווח נקי / סך הכנסות) × 100

**חשוב מאוד - פורמט הערכים:**
החזר את כל יחסי הרווחיות כערכים עשרוניים (0.755 = 75.5%), לא כאחוזים (75.5)!
לדוגמה: אם רווח תפעולי = 757,536 ₪ והכנסות = 2,763,963 ₪
אז operating_margin = (757,536 / 2,763,963) = 0.274 (לא 27.4 ולא 274!)

**דוגמה:** אם הכנסות = 2,763,963 ₪ ורווח נקי = 757,536 ₪
אז net_margin = (757,536 / 2,763,963) = 0.274 (27.4% כעשרוני)
**לא 27.4 ולא 2740!**

**נתוני האקסל:**
${rawDataForPrompt}

חלץ נכסים, התחייבויות, הון עצמי, הכנסות והוצאות, חשב את יחסי הרווחיות בדיוק לפי הנוסחאות למעלה, ותן תובנות בעברית.
          `;

          parseResult = await openRouterAPI({
            prompt: balanceSheetPrompt,
            response_json_schema: detailedBalanceSheetSchema
          });

          finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
          analysisNotes = "Successfully analyzed balance sheet XLSX using AI-First parsing.";

        } else if (category === 'profit_loss_statement') {
          setProcessingStatus('מפענח ומנתח דוח רווח והפסד באמצעות AI...');

          const { data: parsedResult } = await parseXlsx({ fileUrl: file_url });
          const raw_data = parsedResult?.data?.raw_data;

          if (!raw_data || raw_data.length === 0) {
            throw new Error('לא הצלחנו לקרוא נתונים מדוח הרווח והפסד.');
          }

          const rawDataForPrompt = JSON.stringify(raw_data.slice(0, 1000), null, 2);

          const profitLossPrompt = `
אתה אנליסט פיננסי מומחה. משימתך היא לנתח את נתוני דוח רווח והפסד (P&L) הגולמיים המצורפים ולחלץ מהם נתונים פיננסיים מובנים ותובנות עסקיות.

**הנתונים הגולמיים:**
הנתונים מגיעים כמערך של מערכים (JSON array of arrays), המייצג את גיליון האקסל. כל מערך פנימי הוא שורה, וכל פריט במערך הוא תא.

**מבנה דוח רווח והפסד:**
דוח רווח והפסד מכיל בדרך כלל קבוצות של חשבונות כגון:
- הכנסות (sales, revenue)
- עלות מכירות (COGS)
- הוצאות תפעוליות (operating expenses: salaries, rent, marketing)
- רווח תפעולי
- הוצאות מימון (financing expenses)
- רווח נקי (net profit)

**משימותיך:**
1.  **זיהוי כותרות:** סרוק את השורות הראשונות כדי לזהות את שורת הכותרת האמיתית.
2.  **חילוץ נתונים פיננסיים:** זהה והפק את הנתונים הפיננסיים העיקריים.
3.  **חישוב נתונים כספיים מרכזיים:** סכם הכנסות, הוצאות, רווח גולמי ורווח נקי.
4.  **מטא-דטה של הדוח:** חפש שם החברה ותקופת הדוח.
5.  **הפקת תובנות:** ספק 4-6 תובנות מפתח עסקיות בעברית.
6.  **התראות והמלצות:** ספק המלצות מפורטות בעברית.

**חשוב מאוד:**
*   כל הטקסט בתגובה (תובנות, המלצות) חייב להיות בעברית.
*   הפלט חייב להיות אובייקט JSON שתואם במדויק לסכימה שסופקה.
*   אם אינך מוצא נתון מספרי ספציפי, השתמש ב-null או 0.

**נתוני האקסל הגולמיים:**
${rawDataForPrompt}
          `;

          parseResult = await openRouterAPI({
            prompt: profitLossPrompt,
            response_json_schema: detailedProfitLossSchema
          });

          finalMetadata = { analysis_status: 'full', enhanced_parsing: true };
          analysisNotes = "Successfully analyzed Profit & Loss XLSX using AI-First parsing.";

        } else {
          const { data } = await parseXlsx({
            fileUrl: file_url,
            category: category,
            filename: file.name
          });
          parseResult = data;
          finalMetadata = { analysis_status: 'full' };
          analysisNotes = "Successfully parsed Excel/CSV file.";
        }

      } else if (fileType === 'pdf' || ['jpg', 'jpeg', 'png'].includes(fileType)) {
        let targetSchema;
        let prompt;

        setProcessingStatus(fileType === 'pdf' ? 'מנתח מסמך PDF באמצעות AI...' : 'מנתח תמונה באמצעות AI...');

        if (category === 'bank_statement') {
          targetSchema = bankStatementSchema;
          prompt = `
Please analyze the provided bank statement PDF (focus on the first 10 pages) and extract the following information into the JSON schema:
1.  **account_summary**: Basic details about the account and its balances.
2.  **transactions**: A list of all transactions.
3.  **key_insights**: Generate 3-5 key financial insights in Hebrew.
4.  **risk_flags**: Identify financial risks in Hebrew.
5.  **top_expenses**: List top 5 largest expenses.

IMPORTANT: All text fields MUST be in Hebrew.
          `;
          finalMetadata = { analysis_status: 'partial', pages_analyzed: 10 };
          analysisNotes = 'Analyzed first 10 pages of bank statement PDF.';

        } else if (category === 'credit_card_report') {
          targetSchema = creditCardSchema;
          prompt = `
Please analyze the credit card statement PDF and extract information.
All text fields MUST be in Hebrew.
          `;
          finalMetadata = { analysis_status: 'partial', pages_analyzed: 10 };
          analysisNotes = 'Analyzed first 10 pages of credit card report PDF.';

        } else if (category === 'credit_report') {
          targetSchema = creditReportSchema;
          prompt = `
אתה מומחה בניתוח דוחות ריכוז נתונים מבנק ישראל. משימתך: חילוץ **מלא ומקיף** של כל הנתונים מהדוח.

📍 **סעיפים לחילוץ:**

**1. מטא-דטה (עמ' 1-2):**
- שם נושא הדוח, ת.ז., תאריך הפקה, תאריך תחילת איסוף

**2. סיכום (עמ' 3-4):**
- סה"כ חוב כולל ללא משכנתא
- מספר עסקאות פעילות (חייב + ערב)
- מספר הלוואות, משכנתאות
- רשימת מלווים

**3. חשבונות עו"ש (עמ' 5-11) - קריטי:**
חלץ **כל** חשבון (גם כחייב וגם כערב):
- פרטי חשבון (בנק, מזהה, סניף, מסגרת, יתרה)
- האם זה כערב? (isGuarantor: true/false)
- מסלולי ריבית מפורטים
- **החזרות שיקים והוראות קבע** - ספור לפי חודש!

**4. הלוואות (עמ' 12-27):**
חלץ **כל** הלוואה - חייב או ערב:
- זהה ערבות לפי: "מספר הלקוחות הערבים בעסקה" > 0
- סכום מקורי, יתרה, תשלום חודשי
- מסלולי ריבית, בטחונות
- פרטי תאגיד קשור (אם יש)

**5. משכנתאות (עמ' 14-16):**
- כל המשכנתאות עם מסלולי ריבית מלאים
- בטחונות מקרקעין

**6. ערבויות (עמ' 22-24):**
- כל הערבויות שניתנו לטובת הלקוח

**7. פניות לשכות אשראי (עמ' 67):**
- כל הפניות ב-3 שנים אחרונות

**8. ניתוח מעמיק:**
- ציון סיכון 1-10 (שקלל: החזרות, ניצול מסגרות, חשיפה כערב)
- ספור סה"כ החזרות הוראות קבע ב-12 חודשים
- חשב אחוז ניצול מסגרות
- חשב חשיפה כערב
- זהה דגלים אדומים

⚠️ **חשוב מאוד:**
- אל תדלג על עסקאות כערב!
- חלץ את כל ההחזרות מהטבלאות
- כל הטקסט בעברית
- נתונים מדויקים בלבד

החזר JSON תקני בלבד!
          `;
          finalMetadata = { analysis_status: 'full', comprehensive: true };
          analysisNotes = 'Successfully analyzed Bank of Israel Credit Report PDF with full extraction.';

        } else if (category === 'balance_sheet') {
          targetSchema = detailedBalanceSheetSchema;
          prompt = `
You are an expert financial analyst. Analyze the provided Balance Sheet (מאזן בוחן) PDF.
Extract ALL data accurately into the provided JSON schema.
IMPORTANT: All text fields including key_insights, positive_trends, areas_for_attention, and recommendations MUST be in Hebrew.
The report language is Hebrew.
          `;
          finalMetadata = { analysis_status: 'full' };
          analysisNotes = 'Successfully analyzed full Balance Sheet PDF.';

        } else if (category === 'profit_loss_statement') {
          targetSchema = detailedProfitLossSchema;
          prompt = `
You are an expert financial analyst. Analyze the provided Profit & Loss (P&L) statement PDF.
Extract ALL data accurately into the provided JSON schema. Ensure all numeric values are parsed correctly without commas.
Calculate all financial ratios and projections as defined in the schema.
Provide concise and actionable alerts and insights based on the data.
IMPORTANT: All text fields including key_insights, positive_trends, areas_for_attention, and recommendations MUST be in Hebrew.
Translate all insights and recommendations to Hebrew.
If a field is not present in the document, return null for that field.
The report language is Hebrew.
          `;
          finalMetadata = { analysis_status: 'full' };
          analysisNotes = 'Successfully analyzed full Profit & Loss Statement PDF.';

        } else {
          throw new Error("Unsupported PDF category for analysis.");
        }

        parseResult = await openRouterAPI({
          prompt: prompt,
          file_urls: [file_url],
          response_json_schema: targetSchema
        });

      } else if (['jpg', 'jpeg', 'png'].includes(fileType)) {
        // Handle image files same as PDF - use openRouterAPI with file_urls
        setProcessingStatus('מנתח תמונה באמצעות AI...');
        
        let targetSchema = {};
        let prompt = '';
        
        if (category === 'bank_statement') {
          targetSchema = bankStatementSchema;
          prompt = 'נתח את התמונה של תדפיס בנק והחזר נתונים מובנים בעברית';
        } else if (category === 'credit_card_report') {
          targetSchema = creditCardSchema;
          prompt = 'נתח את התמונה של דוח כרטיס אשראי והחזר נתונים בעברית';
        } else {
          targetSchema = {
            type: "object",
            properties: {
              extracted_data: { type: "object" },
              key_insights: { type: "array", items: { type: "string" } }
            }
          };
          prompt = 'נתח את התמונה ותחלץ את כל המידע הרלוונטי בעברית';
        }
        
        parseResult = await openRouterAPI({
          prompt: prompt,
          file_urls: [file_url],
          response_json_schema: targetSchema
        });
        
        finalMetadata = { analysis_status: 'full', file_type: 'image' };
        analysisNotes = 'Successfully analyzed image file.';
        
      } else if (['jpg', 'jpeg', 'png'].includes(fileType)) {
        // Handle image files same as PDF - use openRouterAPI with file_urls
        setProcessingStatus('מנתח תמונה באמצעות AI...');
        
        let targetSchema = {};
        let prompt = '';
        
        if (category === 'bank_statement') {
          targetSchema = bankStatementSchema;
          prompt = `
Please analyze the provided bank statement image and extract the following information into the JSON schema:
1.  **account_summary**: Basic details about the account and its balances.
2.  **transactions**: A list of all transactions with their date, description, credit amount, debit amount, and final balance.
3.  **key_insights**: Generate 3-5 key financial insights from the statement in Hebrew.
4.  **risk_flags**: Identify any potential financial risks in Hebrew.
5.  **top_expenses**: List the top 5 largest expenses.

IMPORTANT: All text fields including key_insights, risk_flags, and top_expenses descriptions MUST be in Hebrew.
          `;
        } else if (category === 'credit_card_report') {
          targetSchema = creditCardSchema;
          prompt = `
Please analyze the credit card statement image and extract information.
All text fields MUST be in Hebrew.
          `;
        } else if (category === 'credit_report') {
          targetSchema = creditReportSchema;
          prompt = `
אתה Extractor & Analyst פיננסי מומחה. קבל תמונה בעברית של "דוח ריכוז נתונים" מבנק ישראל ומשימתך היא למצות את כל הנתונים הפיננסיים הרלוונטיים ולהפיק ניתוח ותובנות.
**כל התובנות וטקסט חופשי אחר שתפיק חייבים להיות בעברית בלבד.**
          `;
        } else if (category === 'balance_sheet') {
          targetSchema = detailedBalanceSheetSchema;
          prompt = `
You are an expert financial analyst. Analyze the provided Balance Sheet (מאזן בוחן) image.
IMPORTANT: All text fields including key_insights, positive_trends, areas_for_attention, and recommendations MUST be in Hebrew.
The report language is Hebrew.
          `;
        } else if (category === 'profit_loss_statement') {
          targetSchema = detailedProfitLossSchema;
          prompt = `
You are an expert financial analyst. Analyze the provided Profit & Loss (P&L) statement image.
IMPORTANT: All text fields MUST be in Hebrew.
The report language is Hebrew.
          `;
        } else {
          targetSchema = {
            type: "object",
            properties: {
              extracted_data: { type: "object" },
              key_insights: { type: "array", items: { type: "string" } }
            }
          };
          prompt = 'נתח את התמונה ותחלץ את כל המידע הרלוונטי בעברית';
        }
        
        parseResult = await openRouterAPI({
          prompt: prompt,
          file_urls: [file_url],
          response_json_schema: targetSchema
        });
        
        finalMetadata = { analysis_status: 'full', file_type: 'image' };
        analysisNotes = 'Successfully analyzed image file.';
        
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!parseResult) {
        throw new Error('Parsing returned no result.');
      }

      setUploadProgress(90);
      setProcessingStatus('שומר תוצאות ניתוח...');

      // Data transformation logic - exact copy from SpecificFileUploadBox (with P&L adjustment)
      let dataToSaveInParsedData;
      let dataToSaveInAiInsights = parseResult;

      if (category === 'balance_sheet') {
        dataToSaveInParsedData = {
          summary: "Balance Sheet Analysis",
          rows: [],
          headers: ['קטגוריה', 'סכום', 'אחוז מההכנסות'],
          flags: parseResult.alerts_and_insights?.areas_for_attention || [],
          report_metadata: parseResult.report_metadata,
          financial_summary: parseResult.financial_summary,
          profitability_ratios: parseResult.profitability_ratios,
          alerts_and_insights: parseResult.alerts_and_insights,
          key_insights: parseResult.key_insights || []
        };
        dataToSaveInParsedData.breakdown = {
          revenue: parseResult.revenue_breakdown,
          expenses: parseResult.expense_breakdown
        };

      } else if (category === 'profit_loss_statement') {
        if (parseResult.report_metadata && parseResult.financial_summary) {
          dataToSaveInParsedData = {
            summary: JSON.stringify(parseResult.financial_summary),
            rows: [],
            headers: ['קטגוריה', 'סכום', 'אחוז מההכנסות'],
            flags: parseResult.alerts_and_insights?.areas_for_attention || [],
            report_metadata: parseResult.report_metadata,
            financial_summary: parseResult.financial_summary,
            profitability_ratios: parseResult.profitability_ratios,
            alerts_and_insights: parseResult.alerts_and_insights,
            key_insights: parseResult.alerts_and_insights?.cost_alerts || parseResult.key_insights || []
          };
          dataToSaveInParsedData.breakdown = parseResult.cost_structure_analysis;
        } else {
          dataToSaveInParsedData = parseResult;
        }

      } else if (category === 'inventory_report' && parseResult.extracted_products) {
        dataToSaveInParsedData = {
          rows: parseResult.extracted_products,
          headers: Object.keys(parseResult.extracted_products[0] || {}),
          summary: JSON.stringify(parseResult.summary),
        };

      } else if (category === 'sales_report' && parseResult.products_sales) {
        dataToSaveInParsedData = {
          rows: parseResult.products_sales,
          headers: Object.keys(parseResult.products_sales[0] || {}),
          summary: JSON.stringify(parseResult.summary),
          top_selling_products: parseResult.top_selling_products,
          top_profitable_products: parseResult.top_profitable_products,
          sales_by_category: parseResult.sales_by_category
        };

      } else if (category === 'promotions_report' && parseResult.promotions) {
        dataToSaveInParsedData = {
          rows: parseResult.promotions,
          headers: Object.keys(parseResult.promotions[0] || {}),
          summary: JSON.stringify(parseResult.summary),
          promotion_types_breakdown: parseResult.promotion_types_breakdown,
          seasonal_analysis: parseResult.seasonal_analysis
        };

      } else if (category === 'credit_report') {
        dataToSaveInParsedData = {
          summary: JSON.stringify(parseResult.summary || {}),
          reportMeta: JSON.stringify(parseResult.reportMeta || {}),
          currentAccounts: JSON.stringify(parseResult.currentAccounts || []),
          loans: JSON.stringify(parseResult.loans || []),
          mortgages: JSON.stringify(parseResult.mortgages || [])
        };

      } else if (category === 'credit_card_report' && parseResult.card_summary) {
        dataToSaveInParsedData = {
          card_summary: parseResult.card_summary,
          transactions: parseResult.transactions,
          summary: JSON.stringify(parseResult.card_summary),
          rows: parseResult.transactions,
          headers: Object.keys(parseResult.transactions[0] || {}),
          flags: parseResult.risk_flags || [],
          key_insights: parseResult.key_insights || [],
          top_spending_categories: parseResult.top_spending_categories || [],
          breakdown: null
        };

      } else if (category === 'bank_statement' && parseResult?.account_summary) {
        dataToSaveInParsedData = {
          account_summary: parseResult.account_summary,
          transactions: parseResult.transactions,
          summary: JSON.stringify(parseResult.account_summary),
          rows: parseResult.transactions,
          headers: Object.keys(parseResult.transactions[0] || {}),
          flags: parseResult.risk_flags || [],
          key_insights: parseResult.key_insights || [],
          top_expenses: parseResult.top_expenses || [],
          breakdown: null
        };

      } else {
        dataToSaveInParsedData = parseResult;
      }

      if (!dataToSaveInParsedData) {
        dataToSaveInParsedData = parseResult;
      }

      await FileUpload.update(fileRecordId, {
        status: 'analyzed',
        parsed_data: dataToSaveInParsedData,
        ai_insights: dataToSaveInAiInsights,
        parsing_metadata: finalMetadata,
        analysis_notes: analysisNotes
      });

      setUploadProgress(100);
      setProcessingStatus('ההעלאה והניתוח הושלמו!');
      setFinalStatus('success');

      if (onUploadComplete) {
        onUploadComplete();
      }

      setTimeout(() => {
        setSelectedCategory('');
        setCustomFileName('');
      }, 2000);

    } catch (err) {
      console.error('❌ File upload process failed:', err);
      console.error('Error stack:', err.stack);
      const displayMessage = analysisNotes || err.message || 'אירעה שגיאה לא ידועה';
      
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
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const mockEvent = { target: { files: [files[0]] } };
      await handleFileUpload(mockEvent);
    }
  };

  const selectedCategoryObj = FILE_CATEGORIES.find(c => c.value === selectedCategory);
  const SelectedIcon = selectedCategoryObj?.icon || Upload;

  return (
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-horizon-text">סוג המסמך</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text text-right" dir="rtl">
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
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading && selectedCategory && !(selectedCategory === 'other' && !customFileName.trim())) {
              triggerFileSelect();
            }
          }}
          className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
            ${isDragging ? 'border-horizon-primary bg-horizon-primary/10' : 'border-horizon hover:border-horizon-primary/50'}
            ${(isUploading || !selectedCategory || (selectedCategory === 'other' && !customFileName.trim())) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading && !finalStatus ? (
            <>
              <RefreshCw className="mx-auto w-10 h-10 text-horizon-primary mb-2 animate-spin" />
              <p className="text-horizon-text text-sm">מעלה...</p>
            </>
          ) : (
            <>
              <Upload className="mx-auto w-10 h-10 text-horizon-accent mb-2" />
              <p className="text-horizon-text text-sm">
                {isDragging ? 'שחרר את הקובץ כאן' : 'גרור קובץ לכאן או לחץ לבחירה'}
              </p>
              <p className="text-xs text-horizon-accent mt-1">
                תומך בקבצי Excel, CSV, PDF, ותמונות
              </p>
            </>
          )}
        </div>

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
  );
}